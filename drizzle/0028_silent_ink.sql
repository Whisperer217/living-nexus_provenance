CREATE TABLE `witnessTestimonies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wid` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`content` text NOT NULL,
	`linkedWorks` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `witnessTestimonies_id` PRIMARY KEY(`id`),
	CONSTRAINT `witnessTestimonies_wid_unique` UNIQUE(`wid`)
);
