CREATE TABLE `expressionLineage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eid` varchar(32) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`prompt` text NOT NULL,
	`styleTags` text,
	`composerNote` text,
	`toneFrequencyNote` varchar(128),
	`dominantKey` varchar(32),
	`tempoRange` varchar(64),
	`energyProfile` varchar(128),
	`lyricsSnapshot` text,
	`songCount` int NOT NULL DEFAULT 0,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expressionLineage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `toneFrequencyNote` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `dominantKey` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `tempoRange` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `energyProfile` varchar(128);