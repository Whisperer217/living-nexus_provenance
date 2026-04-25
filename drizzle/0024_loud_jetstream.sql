CREATE TABLE `audioVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`witnessId` varchar(64) NOT NULL,
	`audioUrl` text NOT NULL,
	`fileKey` varchar(512),
	`fileHash` varchar(128),
	`versionNote` varchar(255),
	`replacedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audioVersions_id` PRIMARY KEY(`id`)
);
