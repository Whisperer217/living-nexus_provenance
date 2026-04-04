ALTER TABLE `users` MODIFY COLUMN `role` enum('user','founder','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `songs` ADD `autoVideoUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `autoVideoKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `slotLimit` int;