CREATE TABLE `adminNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`body` text NOT NULL,
	`ctaLabel` varchar(64),
	`ctaUrl` varchar(512),
	`iconType` enum('announcement','feature','alert','milestone','provenance','community','maintenance','reward') NOT NULL DEFAULT 'announcement',
	`targetSegment` enum('all','creators','witnesses','specific') NOT NULL DEFAULT 'all',
	`targetUserId` int,
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`sentCount` int NOT NULL DEFAULT 0,
	`authorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `adminNotif_authorId_idx` ON `adminNotifications` (`authorId`);--> statement-breakpoint
CREATE INDEX `adminNotif_sentAt_idx` ON `adminNotifications` (`sentAt`);