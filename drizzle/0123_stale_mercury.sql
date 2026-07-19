CREATE TABLE `creator_payment_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`providerId` varchar(32) NOT NULL,
	`enabled` tinyint NOT NULL DEFAULT 0,
	`config` text NOT NULL DEFAULT ('{}'),
	`verified` tinyint NOT NULL DEFAULT 0,
	`verifiedAt` timestamp,
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creator_payment_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` varchar(32) NOT NULL,
	`providerPaymentId` varchar(256) NOT NULL,
	`intentType` varchar(64) NOT NULL,
	`status` enum('pending','confirmed','failed','expired','refunded') NOT NULL DEFAULT 'pending',
	`amountSmallestUnit` int NOT NULL,
	`currency` varchar(16) NOT NULL,
	`amountUsdCents` int,
	`payerUserId` int,
	`creatorUserId` int,
	`metadata` text,
	`txHash` varchar(128),
	`confirmations` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`raw` text,
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `cps_creator_idx` ON `creator_payment_settings` (`creatorUserId`);--> statement-breakpoint
CREATE INDEX `cps_unique_idx` ON `creator_payment_settings` (`creatorUserId`,`providerId`);--> statement-breakpoint
CREATE INDEX `pt_provider_idx` ON `payment_transactions` (`providerId`,`providerPaymentId`);--> statement-breakpoint
CREATE INDEX `pt_payer_idx` ON `payment_transactions` (`payerUserId`);--> statement-breakpoint
CREATE INDEX `pt_creator_idx` ON `payment_transactions` (`creatorUserId`);--> statement-breakpoint
CREATE INDEX `pt_status_idx` ON `payment_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `pt_intent_idx` ON `payment_transactions` (`intentType`);