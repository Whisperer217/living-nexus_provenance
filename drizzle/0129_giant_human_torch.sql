CREATE TABLE `guideAccessRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guideId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`requestNote` text,
	`reviewNote` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guideAccessRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `guideAccessReq_unique_idx` UNIQUE(`guideId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `guideAccessReq_guideId_idx` ON `guideAccessRequests` (`guideId`);--> statement-breakpoint
CREATE INDEX `guideAccessReq_userId_idx` ON `guideAccessRequests` (`userId`);--> statement-breakpoint
CREATE INDEX `guideAccessReq_status_idx` ON `guideAccessRequests` (`status`);