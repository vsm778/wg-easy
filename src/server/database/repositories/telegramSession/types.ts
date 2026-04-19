import type { InferSelectModel } from 'drizzle-orm';
import type { telegramSession } from './schema';

export type TelegramSessionType = InferSelectModel<typeof telegramSession>;
