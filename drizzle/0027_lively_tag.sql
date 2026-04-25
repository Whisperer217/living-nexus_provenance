CREATE TABLE `playEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`witnessId` varchar(64),
	`sessionId` varchar(64) NOT NULL,
	`userId` int,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`ipHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playEvents_id` PRIMARY KEY(`id`)
);
