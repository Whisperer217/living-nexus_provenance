CREATE TABLE `albumEditionPublication` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editionId` int NOT NULL,
	`status` enum('sealed','published','withdrawn') NOT NULL DEFAULT 'sealed',
	`visibility` enum('public','unlisted','private') NOT NULL,
	`projectionRevision` int NOT NULL DEFAULT 1,
	`publishedAt` timestamp,
	`withdrawnAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `albumEditionPublication_id` PRIMARY KEY(`id`),
	CONSTRAINT `albumEditionPublication_edition_uq` UNIQUE(`editionId`)
);
--> statement-breakpoint
CREATE TABLE `albumEditionPublicationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editionId` int NOT NULL,
	`sequence` int NOT NULL,
	`actorUserId` int NOT NULL,
	`eventType` enum('sealed','published','withdrawn') NOT NULL,
	`canonicalPayload` text NOT NULL,
	`payloadHash` varchar(64) NOT NULL,
	`previousHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `albumEditionPublicationEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `albumEditionPublicationEvents_edition_sequence_uq` UNIQUE(`editionId`,`sequence`),
	CONSTRAINT `albumEditionPublicationEvents_edition_payload_uq` UNIQUE(`editionId`,`payloadHash`)
);
--> statement-breakpoint
CREATE TABLE `albumReleaseDraftRevisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`draftId` int NOT NULL,
	`revision` int NOT NULL,
	`actorUserId` int NOT NULL,
	`operation` enum('created','metadata_updated','membership_replaced','membership_reordered','archived','published') NOT NULL,
	`canonicalSnapshot` text NOT NULL,
	`snapshotHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `albumReleaseDraftRevisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `albumReleaseDraftRevisions_draft_revision_uq` UNIQUE(`draftId`,`revision`),
	CONSTRAINT `albumReleaseDraftRevisions_draft_snapshot_uq` UNIQUE(`draftId`,`snapshotHash`)
);
--> statement-breakpoint
CREATE TABLE `widResourceBindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wid` varchar(96) NOT NULL,
	`resourceType` enum('album_edition') NOT NULL,
	`resourceId` int NOT NULL,
	`canonicalHash` varchar(64) NOT NULL,
	`eventId` varchar(96) NOT NULL,
	`immutable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `widResourceBindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `widResourceBindings_wid_uq` UNIQUE(`wid`),
	CONSTRAINT `widResourceBindings_resource_uq` UNIQUE(`resourceType`,`resourceId`),
	CONSTRAINT `widResourceBindings_event_uq` UNIQUE(`eventId`)
);
--> statement-breakpoint
ALTER TABLE `albumEditions` ADD `sourceDraftRevision` int NOT NULL;--> statement-breakpoint
ALTER TABLE `albumEditions` ADD `creatorKeyId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `albumEditions` ADD `sealRequestId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `albumReleaseDraftTracks` ADD `addedByUserId` int;--> statement-breakpoint
ALTER TABLE `albumReleaseDrafts` ADD `releaseDate` timestamp;--> statement-breakpoint
ALTER TABLE `albumReleaseDrafts` ADD `archivedByUserId` int;--> statement-breakpoint
ALTER TABLE `albumReleaseDrafts` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `albumReleaseFamilies` ADD `sourceKind` enum('new_release','legacy_collection') DEFAULT 'new_release' NOT NULL;--> statement-breakpoint
ALTER TABLE `albumReleaseFamilies` ADD `legacyCollectionWidSnapshot` varchar(64);--> statement-breakpoint
ALTER TABLE `albumEditions` ADD CONSTRAINT `albumEditions_manifest_hash_uq` UNIQUE(`manifestHash`);--> statement-breakpoint
ALTER TABLE `albumEditions` ADD CONSTRAINT `albumEditions_creator_seal_request_uq` UNIQUE(`creatorId`,`sealRequestId`);--> statement-breakpoint
ALTER TABLE `albumEditions` ADD CONSTRAINT `albumEditions_draft_revision_uq` UNIQUE(`sourceDraftId`,`sourceDraftRevision`);--> statement-breakpoint
CREATE INDEX `albumEditionPublication_status_visibility_idx` ON `albumEditionPublication` (`status`,`visibility`);--> statement-breakpoint
CREATE INDEX `albumEditionPublicationEvents_edition_created_idx` ON `albumEditionPublicationEvents` (`editionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `albumReleaseDraftRevisions_draft_created_idx` ON `albumReleaseDraftRevisions` (`draftId`,`createdAt`);