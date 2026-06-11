CREATE TABLE `quiverImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` text NOT NULL,
	`prompt` text NOT NULL,
	`enrichedPrompt` text,
	`widId` varchar(64),
	`guideId` int,
	`referenceImageUrl` text,
	`isRemix` boolean NOT NULL DEFAULT false,
	`tags` text,
	`title` varchar(255),
	`registeredAsWid` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiverImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `qi_userId_idx` ON `quiverImages` (`userId`);--> statement-breakpoint
CREATE INDEX `qi_widId_idx` ON `quiverImages` (`widId`);--> statement-breakpoint
CREATE INDEX `qi_guideId_idx` ON `quiverImages` (`guideId`);--> statement-breakpoint
CREATE INDEX `qi_createdAt_idx` ON `quiverImages` (`createdAt`);