CREATE TABLE `visualQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`status` enum('pending','processing','complete','failed') NOT NULL DEFAULT 'pending',
	`priority` int NOT NULL DEFAULT 0,
	`attempts` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`enqueuedAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `visualQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `visualReady` boolean DEFAULT false NOT NULL;