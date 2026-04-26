CREATE TABLE `keeperCharacterSheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`presetId` varchar(64) NOT NULL DEFAULT 'the-witness',
	`name` varchar(128) NOT NULL DEFAULT 'The Witness',
	`persona` text NOT NULL,
	`attributes` json NOT NULL,
	`mediumContext` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keeperCharacterSheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `keeperChatArchives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`messages` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keeperChatArchives_id` PRIMARY KEY(`id`)
);
