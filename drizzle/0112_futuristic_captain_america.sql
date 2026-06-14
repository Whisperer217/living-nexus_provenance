CREATE TABLE `workEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`eventLabel` varchar(256),
	`eventData` json,
	`actorId` int,
	`actorName` varchar(256),
	`platformName` varchar(128),
	`platformUrl` text,
	`isSystemEvent` boolean NOT NULL DEFAULT false,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workLineage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentSongId` int NOT NULL,
	`childSongId` int NOT NULL,
	`relationshipType` varchar(64) NOT NULL DEFAULT 'version',
	`versionLabel` varchar(128),
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workLineage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workWitnesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`invitedByUserId` int NOT NULL,
	`witnessUserId` int,
	`role` varchar(64) NOT NULL DEFAULT 'witness',
	`customRole` varchar(128),
	`contributionPercent` int,
	`status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`inviteToken` varchar(128),
	`inviteEmail` varchar(256),
	`inviteeName` varchar(256),
	`testimony` text,
	`witnessedAt` timestamp,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `workWitnesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `workWitnesses_inviteToken_unique` UNIQUE(`inviteToken`)
);
--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `ai_prompt` text;--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `artist_credit` varchar(256);--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `art_style` varchar(128);--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `model3d_status` enum('none','pending','processing','ready','failed') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `model3d_job_id` varchar(256);--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `model3d_url` text;--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `model3d_format` varchar(16);--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `model3d_generated_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `equippedAvatarItemId` int;