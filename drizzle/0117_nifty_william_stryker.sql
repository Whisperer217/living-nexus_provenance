CREATE TABLE `trackDownloadGrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`grantedByUserId` int NOT NULL,
	`grantedToUserId` int NOT NULL,
	`note` varchar(512),
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trackDownloadGrants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `tdg_song_grantee_idx` ON `trackDownloadGrants` (`songId`,`grantedToUserId`);--> statement-breakpoint
CREATE INDEX `tdg_grantee_idx` ON `trackDownloadGrants` (`grantedToUserId`);--> statement-breakpoint
CREATE INDEX `tdg_granter_idx` ON `trackDownloadGrants` (`grantedByUserId`);