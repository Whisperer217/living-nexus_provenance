CREATE TABLE `provenanceEvents` (
	`eventId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`agentId` int,
	`actionType` enum('draft','checkpoint','anchor','fork') NOT NULL,
	`parentEventId` varchar(64),
	`origin` json,
	`payloadCanonical` text NOT NULL,
	`signature` text,
	`sessionLabel` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provenanceEvents_eventId` PRIMARY KEY(`eventId`)
);
--> statement-breakpoint
DROP TABLE `aiTransforms`;