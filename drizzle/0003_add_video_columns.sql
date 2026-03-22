CREATE TABLE `aiTransforms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalSongId` int NOT NULL,
	`userId` int NOT NULL,
	`prompt` text NOT NULL,
	`style` varchar(128),
	`tags` json,
	`sonautoTaskId` varchar(128),
	`status` enum('pending','processing','success','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`outputUrl` text,
	`outputKey` text,
	`originalWitnessId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiTransforms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jukeboxQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomCode` varchar(16) NOT NULL,
	`songId` int NOT NULL,
	`tipperId` int NOT NULL,
	`tipperName` varchar(128),
	`tipAmountCents` int NOT NULL,
	`stripeSessionId` varchar(128),
	`position` int NOT NULL DEFAULT 0,
	`playedAt` timestamp,
	`skippedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jukeboxQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`songId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playlistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`songId` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playlistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `lyricsText` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `caption` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `collectionTag` varchar(128);--> statement-breakpoint
ALTER TABLE `songs` ADD `videoUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `videoKey` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `videoWitnessId` varchar(64);--> statement-breakpoint
ALTER TABLE `songs` ADD `downloadPermission` enum('none','free','tipped') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `downloadTipThresholdCents` int DEFAULT 179 NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `status` enum('Draft','Published','Unlisted','Deleted') DEFAULT 'Published' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `location` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `aiDisclosure` enum('original','ai_assisted','ai_generated') DEFAULT 'original';--> statement-breakpoint
ALTER TABLE `users` ADD `primaryGenre` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeAccountId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeAccountStatus` enum('pending','restricted','enabled','disabled') DEFAULT 'pending';