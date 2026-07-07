CREATE TABLE `visualItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`creatorId` int NOT NULL,
	`witnessId` varchar(64),
	`imageUrl` text NOT NULL,
	`imageKey` varchar(512),
	`thumbnailUrl` text,
	`title` varchar(512),
	`description` text,
	`mediumType` varchar(64),
	`style` varchar(256),
	`subject` varchar(256),
	`dimensions` varchar(64),
	`resolution` varchar(32),
	`aspectRatio` varchar(16),
	`colorProfile` varchar(32),
	`cameraInfo` varchar(256),
	`haaiDisclosure` varchar(32) DEFAULT 'none',
	`creationDate` varchar(32),
	`license` varchar(128),
	`copyright` varchar(256),
	`keywords` text,
	`versionLabel` varchar(64),
	`displayOrder` int DEFAULT 0,
	`contentHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visualItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `visualItems_witnessId_unique` UNIQUE(`witnessId`)
);
--> statement-breakpoint
CREATE TABLE `visualWorks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`collectionWid` varchar(64),
	`title` varchar(512) NOT NULL,
	`description` text,
	`mediumType` varchar(64),
	`style` varchar(256),
	`subject` varchar(256),
	`keywords` text,
	`license` varchar(128),
	`copyright` varchar(256),
	`coverUrl` text,
	`haaiDisclosure` varchar(32) DEFAULT 'none',
	`originStory` text,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visualWorks_id` PRIMARY KEY(`id`),
	CONSTRAINT `visualWorks_collectionWid_unique` UNIQUE(`collectionWid`)
);
--> statement-breakpoint
CREATE INDEX `vi_collection_idx` ON `visualItems` (`collectionId`);--> statement-breakpoint
CREATE INDEX `vi_creator_idx` ON `visualItems` (`creatorId`);--> statement-breakpoint
CREATE INDEX `vi_wid_idx` ON `visualItems` (`witnessId`);--> statement-breakpoint
CREATE INDEX `vi_order_idx` ON `visualItems` (`collectionId`,`displayOrder`);--> statement-breakpoint
CREATE INDEX `vw_creator_idx` ON `visualWorks` (`creatorId`);--> statement-breakpoint
CREATE INDEX `vw_status_idx` ON `visualWorks` (`status`);--> statement-breakpoint
CREATE INDEX `vw_wid_idx` ON `visualWorks` (`collectionWid`);