CREATE TABLE `projectBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('text','image','video','divider','quote') NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`content` text,
	`imageUrl` text,
	`imageKey` varchar(512),
	`imageCaption` varchar(512),
	`videoUrl` text,
	`videoType` enum('youtube','vimeo','s3','none') DEFAULT 'none',
	`videoCaption` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectBlocks_id` PRIMARY KEY(`id`)
);
