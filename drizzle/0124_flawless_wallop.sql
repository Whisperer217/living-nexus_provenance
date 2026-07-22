ALTER TABLE `users` ADD `identitySnapshot` text;--> statement-breakpoint
ALTER TABLE `users` ADD `identitySnapshotAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `corpusFingerprint` varchar(256);