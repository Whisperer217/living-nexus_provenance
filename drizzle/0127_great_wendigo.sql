CREATE TABLE `platform_guides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`title` varchar(256) NOT NULL,
	`summary` text,
	`body` text NOT NULL DEFAULT (''),
	`cover_image_url` text,
	`category` enum('getting-started','registration','keeper-avatar','store','provenance','3d-print','music','general') NOT NULL DEFAULT 'general',
	`published` boolean NOT NULL DEFAULT false,
	`featured` boolean NOT NULL DEFAULT false,
	`author_id` int NOT NULL,
	`reading_time_minutes` int DEFAULT 3,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_guides_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_guides_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `platform_guides` ADD CONSTRAINT `platform_guides_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;