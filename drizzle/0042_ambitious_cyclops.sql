CREATE TABLE `discordWebhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`event` varchar(64) NOT NULL,
	`webhookUrl` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastFiredAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discordWebhooks_id` PRIMARY KEY(`id`)
);
