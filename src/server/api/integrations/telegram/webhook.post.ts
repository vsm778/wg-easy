import type { TelegramReplyMarkup } from '../../../utils/telegram';
import {
  isAllowedPhoneNumber,
  normalizePhoneNumber,
  telegramSessionStates,
} from '../../../utils/telegram';
import { createClientAndGenerateQr } from '../../../services/clientProvisioning';

type TelegramChat = {
  id: number;
  type: string;
};

type TelegramUser = {
  id: number;
  is_bot: boolean;
  username?: string;
};

type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  contact?: {
    phone_number: string;
    user_id?: number;
  };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

function isVpnCommand(text: string) {
  return /^\/vpn(?:@[\w_]+)?$/.test(text);
}

function buildTelegramClientName(
  telegramUserId: number,
  phoneNumber?: string | null
) {
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
  const phoneSuffix = phoneNumber
    ? normalizePhoneNumber(phoneNumber).replace(/\D/g, '').slice(-6)
    : null;

  return `telegram-${phoneSuffix || telegramUserId}-${timestamp}`;
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup
) {
  if (!TELEGRAM_ENV.BOT_TOKEN) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Telegram bot token is not configured',
    });
  }

  await $fetch(
    `https://api.telegram.org/bot${TELEGRAM_ENV.BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      body: {
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      },
    }
  );
}

async function sendTelegramQrDocument(
  chatId: number,
  clientName: string,
  qrSvg: string
) {
  if (!TELEGRAM_ENV.BOT_TOKEN) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Telegram bot token is not configured',
    });
  }

  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('caption', `QR for ${clientName}`);
  formData.append(
    'document',
    new Blob([qrSvg], { type: 'image/svg+xml' }),
    `${clientName}.svg`
  );

  await $fetch(
    `https://api.telegram.org/bot${TELEGRAM_ENV.BOT_TOKEN}/sendDocument`,
    {
      method: 'POST',
      body: formData,
    }
  );
}

async function provisionTelegramClientQr(
  telegramUserId: number,
  phoneNumber: string,
  chatId: number
) {
  const clientName = buildTelegramClientName(telegramUserId, phoneNumber);
  const { clientId, qrSvg } = await createClientAndGenerateQr({
    name: clientName,
    expiresAt: null,
  });

  await sendTelegramQrDocument(chatId, clientName, qrSvg);

  return { clientId, clientName };
}

function getContactRequestKeyboard(): TelegramReplyMarkup {
  return {
    keyboard: [[{ text: 'Share phone number', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function getRemoveKeyboard(): TelegramReplyMarkup {
  return {
    remove_keyboard: true,
  };
}

export default defineEventHandler(async (event) => {
  if (!TELEGRAM_ENV.BOT_TOKEN || !TELEGRAM_ENV.WEBHOOK_SECRET) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Telegram integration is disabled',
    });
  }

  const secret = getHeader(event, 'x-telegram-bot-api-secret-token');
  if (secret !== TELEGRAM_ENV.WEBHOOK_SECRET) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid Telegram webhook secret',
    });
  }

  const update = await readBody<TelegramUpdate>(event);
  const message = update.message;

  if (!message) {
    return { ok: true, skipped: 'unsupported_update' };
  }

  if (message.chat.type !== 'private') {
    return { ok: true, skipped: 'non_private_chat' };
  }

  const telegramUserId = message.from?.id;
  if (!telegramUserId) {
    return { ok: true, skipped: 'missing_sender' };
  }

  const session = await Database.telegramSessions.getActive(telegramUserId);
  const text = message.text?.trim();

  if (message.contact) {
    if (!session || session.state !== telegramSessionStates.AWAITING_CONTACT) {
      await sendTelegramMessage(
        message.chat.id,
        'Start with /vpn before sharing your phone number.',
        getRemoveKeyboard()
      );

      return { ok: true, handled: 'unexpected_contact' };
    }

    if (message.contact.user_id !== telegramUserId) {
      await sendTelegramMessage(
        message.chat.id,
        'Share your own phone number using the Telegram contact button.',
        getContactRequestKeyboard()
      );

      return { ok: true, handled: 'invalid_contact_owner' };
    }

    if (
      !isAllowedPhoneNumber(
        message.contact.phone_number,
        TELEGRAM_ENV.ALLOWED_PHONE_NUMBERS
      )
    ) {
      await Database.telegramSessions.block(
        telegramUserId,
        message.chat.id,
        message.contact.phone_number,
        session.state
      );

      await sendTelegramMessage(
        message.chat.id,
        'Your phone number is not allowed.',
        getRemoveKeyboard()
      );

      return { ok: true, handled: 'phone_not_allowed' };
    }

    await Database.telegramSessions.authorize(
      telegramUserId,
      message.chat.id,
      message.contact.phone_number,
      session.state
    );

    const { clientId, clientName } = await provisionTelegramClientQr(
      telegramUserId,
      message.contact.phone_number,
      message.chat.id
    );

    await sendTelegramMessage(message.chat.id, 'QR sent.', getRemoveKeyboard());

    SERVER_DEBUG(
      `Telegram webhook provisioned client ${clientId} (${clientName}) for ${telegramUserId}`
    );

    return { ok: true, handled: 'phone_allowed_qr_sent' };
  }

  if (!text) {
    return { ok: true, skipped: 'non_text_message' };
  }

  if (isVpnCommand(text)) {
    if (TELEGRAM_ENV.ALLOWED_PHONE_NUMBERS.length === 0) {
      await sendTelegramMessage(
        message.chat.id,
        'Allowed phone numbers are not configured for this bot.'
      );

      return { ok: true, handled: 'phone_allowlist_missing' };
    }

    if (session?.state === telegramSessionStates.AUTHORIZED) {
      const { clientId, clientName } = await provisionTelegramClientQr(
        telegramUserId,
        session.phoneNumber ?? String(telegramUserId),
        message.chat.id
      );

      await sendTelegramMessage(message.chat.id, 'QR sent.');

      SERVER_DEBUG(
        `Telegram webhook provisioned authorized client ${clientId} (${clientName}) for ${telegramUserId}`
      );

      return { ok: true, handled: 'authorized_qr_sent' };
    }

    if (session?.state === telegramSessionStates.AWAITING_CONTACT) {
      await Database.telegramSessions.refreshAwaitingContact(session);
    } else {
      await Database.telegramSessions.beginContactAuth(
        telegramUserId,
        message.chat.id
      );
    }

    await sendTelegramMessage(
      message.chat.id,
      'Share your phone number to continue.',
      getContactRequestKeyboard()
    );

    SERVER_DEBUG(`Telegram webhook accepted /vpn from ${telegramUserId}`);

    return { ok: true, handled: 'awaiting_contact' };
  }

  await sendTelegramMessage(message.chat.id, 'Supported command: /vpn');

  return { ok: true, handled: 'fallback_help' };
});
