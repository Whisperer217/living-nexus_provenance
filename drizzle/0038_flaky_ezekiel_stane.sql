CREATE TABLE `promptDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`promptMode` enum('identity_regen','style_prompt') NOT NULL DEFAULT 'style_prompt',
	`promptType` varchar(32) NOT NULL,
	`targetPlatform` varchar(32),
	`expressionId` varchar(32),
	`prompt` text NOT NULL,
	`styleTags` text,
	`composerNote` text,
	`userInputBlocks` text,
	`shareToken` varchar(64),
	`shareUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promptDrafts_id` PRIMARY KEY(`id`)
);
