ALTER TABLE `expressionLineage` ADD `promptMode` enum('identity_regen','style_prompt') DEFAULT 'identity_regen' NOT NULL;--> statement-breakpoint
ALTER TABLE `expressionLineage` ADD `promptType` varchar(32);--> statement-breakpoint
ALTER TABLE `expressionLineage` ADD `userInputBlocks` text;