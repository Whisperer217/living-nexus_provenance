CREATE TABLE `qrScans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareId` int NOT NULL,
	`refHandle` varchar(64),
	`campaign` varchar(128),
	`ipHash` varchar(64),
	`userAgent` text,
	`scannedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qrScans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qrShares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('creator','project','song') NOT NULL,
	`entityId` int NOT NULL,
	`entitySlug` varchar(128),
	`sharerId` int,
	`sharerHandle` varchar(64),
	`campaign` varchar(128),
	`tag` varchar(64),
	`scanCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qrShares_id` PRIMARY KEY(`id`)
);
