CREATE TABLE `keeper_character_sheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`preset_id` varchar(64) NOT NULL,
	`name` varchar(100),
	`persona` varchar(64),
	`medium_context` text,
	`attributes` text,
	`is_active` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keeper_character_sheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `keeper_chat_archives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(200),
	`messages` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `keeper_chat_archives_id` PRIMARY KEY(`id`)
);
