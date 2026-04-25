CREATE TABLE `externalPlaylists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`sourceType` enum('youtube','suno','other') NOT NULL DEFAULT 'other',
	`sourceUrl` text NOT NULL,
	`tracksJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `externalPlaylists_id` PRIMARY KEY(`id`)
);
