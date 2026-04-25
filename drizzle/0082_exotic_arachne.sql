CREATE TABLE `keeper_skins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skinId` varchar(64) NOT NULL,
	`skinName` varchar(128) NOT NULL,
	`portraitUrl` text NOT NULL,
	`capabilities` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`isCustom` boolean NOT NULL DEFAULT false,
	`unlockedAt` bigint NOT NULL,
	CONSTRAINT `keeper_skins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `ownershipStatus` enum('full','partial') DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE `keeper_skins` ADD CONSTRAINT `keeper_skins_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;