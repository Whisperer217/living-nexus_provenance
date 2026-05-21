CREATE TABLE `distributionInterests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(256),
	`userEmail` varchar(320),
	`mediaTypes` json NOT NULL,
	`formats` json NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distributionInterests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `distInterest_userId_idx` ON `distributionInterests` (`userId`);--> statement-breakpoint
CREATE INDEX `distInterest_createdAt_idx` ON `distributionInterests` (`createdAt`);