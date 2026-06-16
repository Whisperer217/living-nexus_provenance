CREATE TABLE `creatorPublicationFeed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`manifestationId` int NOT NULL,
	`contentType` enum('audio','lyrics','manuscript','comic','video','guide','project') NOT NULL,
	`wid` varchar(64),
	`title` varchar(512) NOT NULL,
	`coverArtUrl` text,
	`slug` varchar(256),
	`visibility` enum('public','unlisted') NOT NULL DEFAULT 'public',
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creatorPublicationFeed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `witnessReservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`witnessId` int NOT NULL,
	`publicationFeedId` int NOT NULL,
	`creatorId` int NOT NULL,
	`manifestationId` int NOT NULL,
	`contentType` varchar(32) NOT NULL,
	`title` varchar(512) NOT NULL,
	`coverArtUrl` text,
	`wid` varchar(64),
	`slug` varchar(256),
	`reservedAt` timestamp NOT NULL DEFAULT (now()),
	`downloadedAt` timestamp,
	CONSTRAINT `witnessReservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `witnessSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`witnessId` int NOT NULL,
	`creatorId` int NOT NULL,
	`tier` enum('witness','reserve','steward') NOT NULL DEFAULT 'witness',
	`notifyOnPublish` boolean NOT NULL DEFAULT true,
	`autoReserveMusic` boolean NOT NULL DEFAULT true,
	`autoReserveManuscripts` boolean NOT NULL DEFAULT false,
	`autoReserveComics` boolean NOT NULL DEFAULT false,
	`autoReserveVideos` boolean NOT NULL DEFAULT false,
	`autoReserveGuides` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `witnessSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `fileType` enum('full_mix','vocal_stem','instrumental_stem','bass_stem','drum_stem','other_stem') DEFAULT 'full_mix';