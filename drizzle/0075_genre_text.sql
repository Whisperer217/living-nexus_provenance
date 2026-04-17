-- Migration: widen genre fields from varchar(64) to text
-- songs.genre and users.primaryGenre — allows multi-genre comma-separated values

ALTER TABLE `songs` MODIFY COLUMN `genre` TEXT;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `primaryGenre` TEXT;
