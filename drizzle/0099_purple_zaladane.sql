CREATE TABLE `workerJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobType` enum('comic-processing','guide-extraction','notification-digest') NOT NULL,
	`status` enum('pending','claimed','completed','failed') NOT NULL DEFAULT 'pending',
	`payloadJson` json NOT NULL,
	`resultJson` json,
	`errorMessage` text,
	`claimedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workerJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `workerJobs_status_idx` ON `workerJobs` (`status`);--> statement-breakpoint
CREATE INDEX `workerJobs_jobType_idx` ON `workerJobs` (`jobType`);--> statement-breakpoint
CREATE INDEX `workerJobs_createdAt_idx` ON `workerJobs` (`createdAt`);