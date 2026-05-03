CREATE TABLE `activationContributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`userId` int,
	`stageId` varchar(64) NOT NULL,
	`amountCents` int NOT NULL,
	`contributorName` varchar(128),
	`message` text,
	`anonymous` boolean NOT NULL DEFAULT false,
	`stripeSessionId` varchar(256),
	`stripePaymentIntentId` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activationContributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `activationEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `totalFundingCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `activationStagesJson` text;--> statement-breakpoint
ALTER TABLE `activationContributions` ADD CONSTRAINT `activationContributions_songId_songs_id_fk` FOREIGN KEY (`songId`) REFERENCES `songs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activationContributions_songId_idx` ON `activationContributions` (`songId`);