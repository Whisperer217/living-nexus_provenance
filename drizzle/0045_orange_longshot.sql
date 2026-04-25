ALTER TABLE `notifications` MODIFY COLUMN `type` enum('witness','comment','like','tip','reaction','playlist_invite','new_track','system') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `tosAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `tosVersion` varchar(16);