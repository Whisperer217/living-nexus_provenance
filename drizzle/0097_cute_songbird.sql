CREATE TABLE `derivatives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentSongId` int NOT NULL,
	`childSongId` int,
	`creatorUserId` int NOT NULL,
	`derivativeType` enum('remix','reinterpretation','alternate_edition','cover','interpolation','sample','adaptation','translation','other') NOT NULL DEFAULT 'remix',
	`permissionStatus` enum('self','licensed','fair_use','pending','unknown') NOT NULL DEFAULT 'unknown',
	`licenseNotes` text,
	`externalTitle` varchar(512),
	`externalUrl` text,
	`testimony` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `derivatives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `derivatives_parentSongId_idx` ON `derivatives` (`parentSongId`);--> statement-breakpoint
CREATE INDEX `derivatives_childSongId_idx` ON `derivatives` (`childSongId`);--> statement-breakpoint
CREATE INDEX `derivatives_creatorUserId_idx` ON `derivatives` (`creatorUserId`);