CREATE TABLE `collection_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`actorId` int NOT NULL,
	`eventType` enum('created','meta_updated','cover_updated','track_added','track_removed','track_replaced','tracks_reordered') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `collections` ADD `description` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `visibility` enum('public','unlisted','private') DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `collections` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `cv_collection_idx` ON `collection_versions` (`collectionId`);--> statement-breakpoint
CREATE INDEX `cv_actor_idx` ON `collection_versions` (`actorId`);