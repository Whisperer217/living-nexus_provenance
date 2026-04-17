CREATE TABLE `book_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`song_id` int NOT NULL,
	`buyer_user_id` int NOT NULL,
	`amount_cents` int NOT NULL DEFAULT 0,
	`stripe_session_id` varchar(256),
	`stripe_payment_intent_id` varchar(256),
	`purchased_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `book_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `readAccess` enum('open','preview','locked') DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `purchasePriceCents` int;--> statement-breakpoint
ALTER TABLE `songs` ADD `previewPageCount` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `consentSettingsJson` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `externalLinksJson` text;