ALTER TABLE `songs` ADD `lyricsWid` varchar(64);--> statement-breakpoint
ALTER TABLE `songs` ADD `lyricsFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `songs` ADD `lyricsFileHash` varchar(64);--> statement-breakpoint
ALTER TABLE `songs` ADD `lyricsAddedAt` timestamp;