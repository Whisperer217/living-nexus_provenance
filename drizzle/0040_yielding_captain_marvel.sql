CREATE TABLE `contentFlags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`workType` enum('audio','lyrics','manuscript','comic','post') NOT NULL,
	`workTitle` varchar(256),
	`reporterId` int NOT NULL,
	`reporterName` varchar(128),
	`reason` enum('dehumanization','csam','facilitates_harm','harassment','spam','other') NOT NULL,
	`details` text,
	`status` enum('pending','reviewed_ok','removed_violation','escalated') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`resolvedById` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contentFlags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `declarationSignatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`declarationVersion` varchar(16) NOT NULL DEFAULT '1.0',
	`signatureName` varchar(128) NOT NULL,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`ipHash` varchar(64),
	CONSTRAINT `declarationSignatures_id` PRIMARY KEY(`id`)
);
