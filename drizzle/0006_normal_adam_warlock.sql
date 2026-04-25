CREATE TABLE `creative_references` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int,
	`toSongId` int,
	`context` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creative_references_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `witnesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`witnesserId` int NOT NULL,
	`witnessedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `witnesses_id` PRIMARY KEY(`id`)
);
