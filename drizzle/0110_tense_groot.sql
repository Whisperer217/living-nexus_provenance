ALTER TABLE `songs` ADD `fadeInSeconds` float;--> statement-breakpoint
ALTER TABLE `songs` ADD `fadeOutSeconds` float;--> statement-breakpoint
ALTER TABLE `users` ADD `playbackSettings` json;