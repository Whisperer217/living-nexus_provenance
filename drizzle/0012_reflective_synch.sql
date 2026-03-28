CREATE TABLE `nameHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`oldName` varchar(128),
	`newName` varchar(128) NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nameHistory_id` PRIMARY KEY(`id`)
);
