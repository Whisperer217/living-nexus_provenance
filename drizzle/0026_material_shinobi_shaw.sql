CREATE TABLE `adminLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`adminName` varchar(128),
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64),
	`targetId` varchar(128),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemConfig` (
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`description` varchar(512),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedByUserId` int,
	CONSTRAINT `systemConfig_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `isFlagged` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `flagReason` varchar(512);--> statement-breakpoint
ALTER TABLE `songs` ADD `moderationStatus` enum('clear','flagged','removed') DEFAULT 'clear' NOT NULL;