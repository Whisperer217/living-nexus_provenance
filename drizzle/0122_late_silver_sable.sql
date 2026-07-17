ALTER TABLE `songs` ADD `musicVideoStatus` enum('pending','generating','complete','failed');--> statement-breakpoint
ALTER TABLE `songs` ADD `musicVideoScript` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `musicVideoUrl` text;