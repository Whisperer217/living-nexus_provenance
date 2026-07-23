ALTER TABLE `songs` ADD `objectLicenseType` enum('open','paid','commission','witnessed') DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `songs` ADD `objectPriceCents` int;--> statement-breakpoint
ALTER TABLE `songs` ADD `objectPhysicalSpecJson` text;