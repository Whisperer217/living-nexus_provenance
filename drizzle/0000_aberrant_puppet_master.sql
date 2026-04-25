ALTER TABLE `users` ADD `stripeAccountId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeAccountStatus` enum('pending','restricted','enabled','disabled') DEFAULT 'pending';