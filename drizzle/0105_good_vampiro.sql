CREATE TABLE `collectionFollowers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collectionFollowers_id` PRIMARY KEY(`id`),
	CONSTRAINT `cf_unique_follow` UNIQUE(`collectionId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `collectionTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`songId` int NOT NULL,
	`addedByUserId` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collectionTracks_id` PRIMARY KEY(`id`),
	CONSTRAINT `ct_unique_track` UNIQUE(`collectionId`,`songId`)
);
--> statement-breakpoint
CREATE TABLE `manifestedCollections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`wid` varchar(64) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`purpose` text,
	`coverArtUrl` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`forkedFromId` int,
	`forkedFromWid` varchar(64),
	`forkedFromOwnerName` varchar(128),
	`trackCount` int NOT NULL DEFAULT 0,
	`followerCount` int NOT NULL DEFAULT 0,
	`forkCount` int NOT NULL DEFAULT 0,
	`playCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manifestedCollections_id` PRIMARY KEY(`id`),
	CONSTRAINT `manifestedCollections_wid_unique` UNIQUE(`wid`),
	CONSTRAINT `manifestedCollections_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `cf_collectionId_idx` ON `collectionFollowers` (`collectionId`);--> statement-breakpoint
CREATE INDEX `cf_userId_idx` ON `collectionFollowers` (`userId`);--> statement-breakpoint
CREATE INDEX `ct_collectionId_idx` ON `collectionTracks` (`collectionId`);--> statement-breakpoint
CREATE INDEX `ct_songId_idx` ON `collectionTracks` (`songId`);--> statement-breakpoint
CREATE INDEX `mc_ownerId_idx` ON `manifestedCollections` (`ownerId`);--> statement-breakpoint
CREATE INDEX `mc_slug_idx` ON `manifestedCollections` (`slug`);--> statement-breakpoint
CREATE INDEX `mc_wid_idx` ON `manifestedCollections` (`wid`);--> statement-breakpoint
CREATE INDEX `mc_isPublic_idx` ON `manifestedCollections` (`isPublic`);