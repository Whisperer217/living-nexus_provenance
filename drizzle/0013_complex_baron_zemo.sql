CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`collectionWid` varchar(64) NOT NULL,
	`collectiveHash` varchar(64) NOT NULL,
	`pdfUrl` text,
	`pdfKey` text,
	`coverArtUrl` text,
	`trackCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_collectionWid_unique` UNIQUE(`collectionWid`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `collectionId` int;