CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`userId` int,
	`authorName` varchar(128),
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`userId` int,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`amountCents` int NOT NULL DEFAULT 8998,
	`slotsGranted` int NOT NULL DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `licenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `slotPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`slotsPurchased` int NOT NULL,
	`amountCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `slotPurchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`genre` varchar(64),
	`bpm` int,
	`keySignature` varchar(16),
	`moodTags` json DEFAULT ('[]'),
	`lyricsHash` varchar(64),
	`coWriters` json DEFAULT ('[]'),
	`albumName` varchar(255),
	`releaseDate` varchar(32),
	`isrc` varchar(32),
	`aiConsent` enum('prohibited','permitted_attribution','permitted') NOT NULL DEFAULT 'prohibited',
	`fileUrl` text,
	`fileKey` text,
	`coverArtUrl` text,
	`fileHash` varchar(64),
	`durationSeconds` float,
	`sampleRate` int,
	`bitDepth` int,
	`witnessId` varchar(64),
	`harmonicSignature` json DEFAULT ('[]'),
	`ecdsaPublicKey` text,
	`ecdsaSignature` text,
	`certificateUrl` text,
	`certificateKey` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`playCount` int NOT NULL DEFAULT 0,
	`tipCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `songs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`tipperUserId` int,
	`amountCents` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `artistHandle` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `profilePhotoUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bmiMemberNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `website` text;--> statement-breakpoint
ALTER TABLE `users` ADD `twitterHandle` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `instagramHandle` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `youtubeHandle` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `bannerUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `licenseStatus` enum('free','licensed') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `songSlotsUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `songSlotsTotal` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(64);