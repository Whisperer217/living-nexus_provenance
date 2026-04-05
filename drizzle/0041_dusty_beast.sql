CREATE TABLE `songVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`creatorId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`versionLabel` varchar(128),
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512),
	`witnessId` varchar(64),
	`changeNote` text,
	`aiDisclosure` enum('original','ai_assisted','ai_generated') DEFAULT 'original',
	`durationSeconds` float,
	`fileSizeBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `songVersions_id` PRIMARY KEY(`id`)
);
