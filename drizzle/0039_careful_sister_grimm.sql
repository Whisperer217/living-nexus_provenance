ALTER TABLE `expressionLineage` MODIFY COLUMN `promptMode` enum('identity_regen','style_prompt','import_anchor') NOT NULL DEFAULT 'identity_regen';--> statement-breakpoint
ALTER TABLE `promptDrafts` MODIFY COLUMN `promptMode` enum('identity_regen','style_prompt','import_anchor') NOT NULL DEFAULT 'style_prompt';--> statement-breakpoint
ALTER TABLE `expressionLineage` ADD `sourcePlatform` varchar(64);--> statement-breakpoint
ALTER TABLE `expressionLineage` ADD `rawExternalPrompt` text;--> statement-breakpoint
ALTER TABLE `promptDrafts` ADD `sourcePlatform` varchar(64);--> statement-breakpoint
ALTER TABLE `promptDrafts` ADD `rawExternalPrompt` text;