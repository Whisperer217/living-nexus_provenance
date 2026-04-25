CREATE TABLE `field_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`body` text NOT NULL,
	`category` enum('doctrine','journal','update','concept') NOT NULL DEFAULT 'journal',
	`isPublic` boolean NOT NULL DEFAULT false,
	`videoUrl` varchar(1024),
	`coverImageUrl` varchar(1024),
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_notes_id` PRIMARY KEY(`id`)
);
