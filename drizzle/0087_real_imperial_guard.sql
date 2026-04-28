ALTER TABLE `songs` ADD `headlineCaption` varchar(280);--> statement-breakpoint
ALTER TABLE `songs` ADD `description` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `galleryImagesJson` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `playerAssetType` enum('cover','video') DEFAULT 'cover' NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `aiToolSuno` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `aiToolUdio` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `aiToolSonato` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `aiToolOther` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `aiToolOtherName` varchar(128);