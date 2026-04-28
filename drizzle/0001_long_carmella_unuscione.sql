CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`styleFingerprint` json DEFAULT ('{"tone":[],"structure_patterns":[],"common_transforms":[]}'),
	`frozenTraits` json DEFAULT ('{"voice_constraints":[]}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`eventId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`agentId` int,
	`actionType` enum('draft','checkpoint','anchor','fork') NOT NULL,
	`inputRef` varchar(64),
	`outputRef` varchar(64),
	`parentEventId` varchar(64),
	`origin` json DEFAULT ('{"origin_type":"original","source_refs":[],"transformation_type":null}'),
	`payloadCanonical` text NOT NULL,
	`signature` text,
	`sessionLabel` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_eventId` PRIMARY KEY(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `wids` (
	`wid` varchar(64) NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`signature` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wids_wid` PRIMARY KEY(`wid`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `publicKey` text;