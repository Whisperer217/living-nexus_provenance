CREATE TABLE `paymentReconciliationLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripeSessionId` varchar(256) NOT NULL,
	`paymentType` varchar(64) NOT NULL,
	`amountCents` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'usd',
	`status` enum('ok','reconciled','skipped','failed') NOT NULL,
	`notes` text,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`reconciledAt` timestamp,
	CONSTRAINT `paymentReconciliationLog_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentReconciliationLog_stripeSessionId_unique` UNIQUE(`stripeSessionId`)
);
