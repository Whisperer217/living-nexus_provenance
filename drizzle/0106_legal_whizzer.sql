ALTER TABLE `songs` MODIFY COLUMN `contentType` enum('audio','lyrics','manuscript','comic','game') NOT NULL DEFAULT 'audio';--> statement-breakpoint
ALTER TABLE `songs` ADD `gameEngine` varchar(32);--> statement-breakpoint
ALTER TABLE `songs` ADD `gameUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `gameDownloadUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `gameDownloadSize` varchar(32);--> statement-breakpoint
ALTER TABLE `songs` ADD `creatorNotes` text;