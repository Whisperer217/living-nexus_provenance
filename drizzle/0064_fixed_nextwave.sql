CREATE TABLE `projectSongs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`songId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectSongs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `narrationUrl` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `narrationKey` varchar(512);