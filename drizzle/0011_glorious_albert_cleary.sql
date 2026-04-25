CREATE TABLE `promoCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` varchar(256),
	`slotsGranted` int NOT NULL DEFAULT 100,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`createdByUserId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promoCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `promoCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `promoRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`promoCodeId` int NOT NULL,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promoRedemptions_id` PRIMARY KEY(`id`)
);
