CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('TIP','COMMENT','LIKE','FOLLOW','WITNESS_REGISTERED','WITNESS_VERIFIED','WORK_REFERENCED','SYSTEM_UPDATE','PRESERVATION_MODE') NOT NULL,
	`workId` int NOT NULL,
	`actorId` int,
	`actorName` varchar(128),
	`payload` json,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `hasSeenWelcome` boolean DEFAULT false NOT NULL;