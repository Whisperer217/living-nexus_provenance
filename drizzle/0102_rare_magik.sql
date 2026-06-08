CREATE TABLE `domainBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`blockType` varchar(64) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`visible` boolean NOT NULL DEFAULT true,
	`size` enum('small','medium','large','full') NOT NULL DEFAULT 'full',
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `domainBlocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domainVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`layoutSnapshot` json NOT NULL,
	`changeNote` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domainVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `domainBlocks_userId_idx` ON `domainBlocks` (`userId`);--> statement-breakpoint
CREATE INDEX `domainBlocks_position_idx` ON `domainBlocks` (`userId`,`position`);--> statement-breakpoint
CREATE INDEX `domainVersions_userId_idx` ON `domainVersions` (`userId`);--> statement-breakpoint
CREATE INDEX `domainVersions_version_idx` ON `domainVersions` (`userId`,`versionNumber`);