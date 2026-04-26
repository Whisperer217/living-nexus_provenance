CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`styleFingerprint` json DEFAULT ('{"tone":[],"structure_patterns":[],"common_transforms":[]}'),
	`frozenTraits` json DEFAULT ('{"voice_constraints":[]}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `wids` (
	`wid` varchar(64) NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`signature` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wids_wid` PRIMARY KEY(`wid`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `publicKey` text;--> statement-breakpoint
ALTER TABLE `keeper_notes` ADD CONSTRAINT `keeper_notes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;