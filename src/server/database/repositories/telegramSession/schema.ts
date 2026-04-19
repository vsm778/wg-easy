import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { TelegramSessionState } from '../../../utils/telegram';

export const telegramSession = sqliteTable('telegram_sessions_table', {
  telegramUserId: integer('telegram_user_id').primaryKey(),
  chatId: integer('chat_id').notNull(),
  state: text().$type<TelegramSessionState>().notNull(),
  phoneNumber: text('phone_number'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
