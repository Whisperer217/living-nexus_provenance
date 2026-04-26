CREATE TABLE `keeper_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`persona_id` varchar(64) NOT NULL DEFAULT 'guide',
	`title` varchar(256) NOT NULL DEFAULT 'Untitled Note',
	`content` text NOT NULL,
	`image_url` text,
	`tag` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keeper_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `keeper_notes` ADD CONSTRAINT `keeper_notes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;