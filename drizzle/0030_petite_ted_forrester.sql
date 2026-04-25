ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `livingArchivePlan` enum('none','quarterly','annual','founder_free') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `livingArchiveExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `livingArchiveActive` boolean DEFAULT false NOT NULL;