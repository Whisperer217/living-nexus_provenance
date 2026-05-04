CREATE TABLE `workEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`addedByUserId` int NOT NULL,
	`type` enum('file','link','note') NOT NULL DEFAULT 'file',
	`title` varchar(256) NOT NULL,
	`url` text,
	`noteBody` text,
	`hash` varchar(64),
	`metadataJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `workEvidence_songId_idx` ON `workEvidence` (`songId`);--> statement-breakpoint
CREATE INDEX `workEvidence_userId_idx` ON `workEvidence` (`addedByUserId`);