ALTER TABLE `marketplace_items` ADD `avatar_wid` varchar(128);--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `license_type` enum('free','paid','subscription','private','org_only','invite_only','platform_exclusive','public_domain') DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `image_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `version_number` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `parent_item_id` int;--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `download_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `rating_sum` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `rating_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `tags` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `marketplace_items` ADD `stewardship_mode` varchar(64);