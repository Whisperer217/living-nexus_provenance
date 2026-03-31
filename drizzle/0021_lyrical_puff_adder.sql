CREATE TABLE `songReactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`songId` int NOT NULL,
	`type` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `songReactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `songReactions_user_song_type_idx` UNIQUE(`userId`,`songId`,`type`)
);
