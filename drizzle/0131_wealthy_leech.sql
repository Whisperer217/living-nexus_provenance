CREATE TABLE `manifestationSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionWid` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`intent` text NOT NULL,
	`medium` enum('music','book','research','film','visual_art','software','other') NOT NULL,
	`collaborators` text,
	`declaration` text,
	`guideWid` varchar(64),
	`workWid` varchar(64),
	`humanContributions` json,
	`aiContributions` json,
	`transformationSummary` text,
	`parentSessionId` int,
	`status` enum('active','paused','completed','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manifestationSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `manifestationSessions_sessionWid_unique` UNIQUE(`sessionWid`)
);
--> statement-breakpoint
CREATE TABLE `sessionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`actorType` enum('creator','ai','system') NOT NULL DEFAULT 'creator',
	`actorId` varchar(64),
	`payload` json,
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessionEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `playlists` ADD `shareSlug` varchar(64);--> statement-breakpoint
ALTER TABLE `playlists` ADD `moodTags` json;--> statement-breakpoint
ALTER TABLE `playlists` ADD `playCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `ms_user_idx` ON `manifestationSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `ms_status_idx` ON `manifestationSessions` (`status`);--> statement-breakpoint
CREATE INDEX `ms_medium_idx` ON `manifestationSessions` (`medium`);--> statement-breakpoint
CREATE INDEX `se_session_idx` ON `sessionEvents` (`sessionId`);--> statement-breakpoint
CREATE INDEX `se_type_idx` ON `sessionEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `se_actor_idx` ON `sessionEvents` (`actorType`);