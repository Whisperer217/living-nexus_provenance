CREATE TABLE `keeper_skins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skinId` varchar(64) NOT NULL,
	`customImageUrl` text,
	`isActive` int NOT NULL DEFAULT 0,
	`creditsPaid` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `keeper_skins_id` PRIMARY KEY(`id`)
);
