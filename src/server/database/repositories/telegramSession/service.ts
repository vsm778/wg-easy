import { eq, sql } from 'drizzle-orm';
import { telegramSession } from './schema';
import type { TelegramSessionType } from './types';
import type { DBType } from '#db/sqlite';
import {
  normalizePhoneNumber,
  telegramSessionStates,
  transitionTelegramSessionState,
} from '../../../utils/telegram';

const AWAITING_CONTACT_TTL_MS = 10 * 60 * 1000;
const BLOCKED_TTL_MS = 10 * 60 * 1000;

function createPreparedStatement(db: DBType) {
  return {
    findByTelegramUserId: db.query.telegramSession
      .findFirst({
        where: eq(
          telegramSession.telegramUserId,
          sql.placeholder('telegramUserId')
        ),
      })
      .prepare(),
    delete: db
      .delete(telegramSession)
      .where(
        eq(telegramSession.telegramUserId, sql.placeholder('telegramUserId'))
      )
      .prepare(),
    upsert: db
      .insert(telegramSession)
      .values({
        telegramUserId: sql.placeholder('telegramUserId'),
        chatId: sql.placeholder('chatId'),
        state: sql.placeholder('state'),
        phoneNumber: sql.placeholder('phoneNumber'),
        expiresAt: sql.placeholder('expiresAt'),
      })
      .onConflictDoUpdate({
        target: telegramSession.telegramUserId,
        set: {
          chatId: sql.placeholder('chatId') as never as number,
          state: sql.placeholder(
            'state'
          ) as never as TelegramSessionType['state'],
          phoneNumber: sql.placeholder('phoneNumber') as never as string | null,
          expiresAt: sql.placeholder('expiresAt') as never as string | null,
        },
      })
      .prepare(),
  };
}

export class TelegramSessionService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  async getActive(telegramUserId: number) {
    const session = await this.#statements.findByTelegramUserId.execute({
      telegramUserId,
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      await this.delete(telegramUserId);
      return null;
    }

    return session;
  }

  delete(telegramUserId: number) {
    return this.#statements.delete.execute({ telegramUserId });
  }

  beginContactAuth(telegramUserId: number, chatId: number) {
    return this.#statements.upsert.execute({
      telegramUserId,
      chatId,
      state: transitionTelegramSessionState('idle', 'start_vpn'),
      phoneNumber: null,
      expiresAt: new Date(Date.now() + AWAITING_CONTACT_TTL_MS).toISOString(),
    });
  }

  refreshAwaitingContact(session: TelegramSessionType) {
    return this.#statements.upsert.execute({
      telegramUserId: session.telegramUserId,
      chatId: session.chatId,
      state: transitionTelegramSessionState(session.state, 'start_vpn'),
      phoneNumber: session.phoneNumber,
      expiresAt: new Date(Date.now() + AWAITING_CONTACT_TTL_MS).toISOString(),
    });
  }

  authorize(
    telegramUserId: number,
    chatId: number,
    phoneNumber: string,
    currentState: TelegramSessionType['state'] = telegramSessionStates.AWAITING_CONTACT
  ) {
    return this.#statements.upsert.execute({
      telegramUserId,
      chatId,
      state: transitionTelegramSessionState(
        currentState,
        'share_contact_allowed'
      ),
      phoneNumber: normalizePhoneNumber(phoneNumber),
      expiresAt: null,
    });
  }

  block(
    telegramUserId: number,
    chatId: number,
    phoneNumber: string,
    currentState: TelegramSessionType['state'] = telegramSessionStates.AWAITING_CONTACT
  ) {
    return this.#statements.upsert.execute({
      telegramUserId,
      chatId,
      state: transitionTelegramSessionState(
        currentState,
        'share_contact_denied'
      ),
      phoneNumber: normalizePhoneNumber(phoneNumber),
      expiresAt: new Date(Date.now() + BLOCKED_TTL_MS).toISOString(),
    });
  }
}
