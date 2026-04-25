CREATE TABLE `platformSupporters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalGifted` float NOT NULL DEFAULT 0,
	`tier` enum('supporter','patron','covenant') NOT NULL DEFAULT 'supporter',
	`firstGiftAt` timestamp NOT NULL DEFAULT (now()),
	`lastGiftAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`stripePaymentIntentId` varchar(64),
	CONSTRAINT `platformSupporters_id` PRIMARY KEY(`id`),
	CONSTRAINT `platformSupporters_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `supporterTier` enum('supporter','patron','covenant');