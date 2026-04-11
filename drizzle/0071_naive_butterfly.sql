ALTER TABLE `songs` ADD `sovereignStampId` varchar(64);--> statement-breakpoint
ALTER TABLE `songs` ADD `sovereignStampedAt` timestamp;--> statement-breakpoint
ALTER TABLE `songs` ADD `stampedFileUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `stampedFileKey` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `stampedFileHash` varchar(64);