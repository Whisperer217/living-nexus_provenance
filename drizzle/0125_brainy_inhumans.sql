ALTER TABLE `songs` MODIFY COLUMN `contentType` enum('audio','lyrics','manuscript','comic','game','image','gcode','3dmodel') NOT NULL DEFAULT 'audio';--> statement-breakpoint
ALTER TABLE `songs` ADD `gcodeUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `gcodeKey` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `printStatsJson` text;