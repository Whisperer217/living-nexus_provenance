CREATE TABLE `playerCurationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playerCurationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerEditions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`targetTracks` int NOT NULL DEFAULT 50,
	`capacityBytes` bigint,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playerEditions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editionId` int NOT NULL,
	`songId` int NOT NULL,
	`creatorId` int NOT NULL,
	`kind` enum('music','audiobook') NOT NULL,
	`audienceNotes` varchar(1000) NOT NULL,
	`publicConsent` boolean NOT NULL DEFAULT false,
	`displayTermsVersion` varchar(64) NOT NULL,
	`status` enum('submitted','shortlisted','selected','withdrawn') NOT NULL DEFAULT 'submitted',
	`position` int NOT NULL DEFAULT 0,
	`productTerms` text,
	`acceptedTerms` text,
	`acceptedAt` timestamp,
	`sourceHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playerSubmissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `playerSubmissions_edition_song_uq` UNIQUE(`editionId`,`songId`)
);
