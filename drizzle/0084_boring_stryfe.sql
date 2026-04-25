CREATE TABLE `marketplace_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('album','skin','physical','creator_good') NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`artwork_url` text,
	`price_cents` int NOT NULL DEFAULT 0,
	`creator_id` int NOT NULL,
	`royalty_pct` int NOT NULL DEFAULT 70,
	`wid` varchar(128),
	`project_id` int,
	`song_id` int,
	`stock` int,
	`active` boolean NOT NULL DEFAULT true,
	`featured` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`buyer_user_id` int,
	`amount_cents` int NOT NULL,
	`creator_payout_cents` int NOT NULL,
	`platform_fee_cents` int NOT NULL,
	`stripe_session_id` varchar(256),
	`stripe_payment_intent_id` varchar(256),
	`status` enum('pending','paid','fulfilled','refunded','failed') NOT NULL DEFAULT 'pending',
	`provenance_wid` varchar(128),
	`fulfilled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplace_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD CONSTRAINT `marketplace_items_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_purchases` ADD CONSTRAINT `marketplace_purchases_item_id_marketplace_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `marketplace_items`(`id`) ON DELETE restrict ON UPDATE no action;