CREATE TABLE `platformSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platformSettings_id` PRIMARY KEY(`id`)
);
