CREATE TABLE `jukeboxOfferings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomCode` varchar(32) NOT NULL,
	`gifterId` int NOT NULL,
	`amountCents` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jukeboxOfferings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jukeboxPlayEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomCode` varchar(32) NOT NULL,
	`songId` int NOT NULL,
	`creatorId` int NOT NULL,
	`playedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jukeboxPlayEvents_id` PRIMARY KEY(`id`)
);
