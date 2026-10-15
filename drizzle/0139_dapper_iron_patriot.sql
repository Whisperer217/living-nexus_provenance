CREATE TABLE `legacyMemorialStatements` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`stewardshipGrantId` bigint NOT NULL,
	`stewardId` int NOT NULL,
	`body` text NOT NULL,
	`bodyHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legacyMemorialStatements_id` PRIMARY KEY(`id`),
	CONSTRAINT `legacyMemorialStatements_body_hash_uq` UNIQUE(`bodyHash`)
);
--> statement-breakpoint
CREATE TABLE `legacyStewardshipEvents` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`grantId` bigint NOT NULL,
	`creatorId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`eventType` enum('granted','revoked','reconciliation_recorded','memorial_published') NOT NULL,
	`targetId` bigint,
	`detailsJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legacyStewardshipEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legacyStewardshipGrants` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`stewardId` int NOT NULL,
	`activeKey` varchar(64),
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`scopeJson` json NOT NULL,
	`reason` text NOT NULL,
	`authorityReference` varchar(256) NOT NULL,
	`grantedByUserId` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedByUserId` int,
	`revokedAt` timestamp,
	`revocationReason` text,
	CONSTRAINT `legacyStewardshipGrants_id` PRIMARY KEY(`id`),
	CONSTRAINT `legacyStewardshipGrants_active_pair_uq` UNIQUE(`activeKey`)
);
--> statement-breakpoint
CREATE INDEX `legacyMemorialStatements_creator_created_idx` ON `legacyMemorialStatements` (`creatorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `legacyMemorialStatements_grant_idx` ON `legacyMemorialStatements` (`stewardshipGrantId`);--> statement-breakpoint
CREATE INDEX `legacyStewardshipEvents_grant_created_idx` ON `legacyStewardshipEvents` (`grantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `legacyStewardshipEvents_creator_created_idx` ON `legacyStewardshipEvents` (`creatorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `legacyStewardshipGrants_creator_status_idx` ON `legacyStewardshipGrants` (`creatorId`,`status`);--> statement-breakpoint
CREATE INDEX `legacyStewardshipGrants_steward_status_idx` ON `legacyStewardshipGrants` (`stewardId`,`status`);