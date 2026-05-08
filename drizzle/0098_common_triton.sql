CREATE TABLE `guides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`canonicalName` varchar(256) NOT NULL,
	`tagline` varchar(512),
	`archetypeType` varchar(128),
	`role` varchar(256),
	`alignment` varchar(512),
	`domain` varchar(512),
	`testimony` text,
	`loreDescription` text,
	`firstManifested` varchar(128),
	`provenanceSheetUrl` text,
	`artworkUrl` text,
	`extractedImagesJson` json,
	`symbolsJson` json,
	`widCode` varchar(64),
	`canonicalStatus` enum('draft','review','published') NOT NULL DEFAULT 'draft',
	`rightsJson` json,
	`revenueCreatorPct` float NOT NULL DEFAULT 90,
	`derivativePermissionsJson` json,
	`stripeConnectId` varchar(128),
	`stripePayoutCurrency` varchar(8) DEFAULT 'USD',
	`stripePayoutSchedule` varchar(64) DEFAULT 'Automatic (Monthly)',
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guides_id` PRIMARY KEY(`id`),
	CONSTRAINT `guides_widCode_unique` UNIQUE(`widCode`)
);
--> statement-breakpoint
CREATE INDEX `guides_creatorId_idx` ON `guides` (`creatorId`);--> statement-breakpoint
CREATE INDEX `guides_widCode_idx` ON `guides` (`widCode`);--> statement-breakpoint
CREATE INDEX `guides_canonicalStatus_idx` ON `guides` (`canonicalStatus`);