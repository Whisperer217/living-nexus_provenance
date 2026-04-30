CREATE TABLE `userCollectionTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`songId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userCollectionTracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userCollections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`coverUrl` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userCollections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userCollectionTracks_collectionId_idx` ON `userCollectionTracks` (`collectionId`);--> statement-breakpoint
CREATE INDEX `userCollectionTracks_songId_idx` ON `userCollectionTracks` (`songId`);--> statement-breakpoint
CREATE INDEX `userCollections_userId_idx` ON `userCollections` (`userId`);