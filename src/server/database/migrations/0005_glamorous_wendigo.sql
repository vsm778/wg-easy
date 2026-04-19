CREATE TABLE `telegram_sessions_table` (
	`telegram_user_id` integer PRIMARY KEY NOT NULL,
	`chat_id` integer NOT NULL,
	`state` text NOT NULL,
	`phone_number` text,
	`expires_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
