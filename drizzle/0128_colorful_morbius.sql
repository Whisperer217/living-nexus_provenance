CREATE TABLE `mission_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`prompt` text NOT NULL,
	`status` enum('locked','ready','dispatched','running','complete','error') NOT NULL DEFAULT 'locked',
	`lockedReason` text,
	`manusTaskId` varchar(128),
	`manusProjectId` varchar(128),
	`lastStatusMsg` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`dispatchedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `mission_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `platform_guides` MODIFY COLUMN `body` text;--> statement-breakpoint
CREATE INDEX `mp_status_idx` ON `mission_phases` (`status`);--> statement-breakpoint
CREATE INDEX `mp_order_idx` ON `mission_phases` (`sortOrder`);