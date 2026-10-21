CREATE TABLE `albumEditionArtifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editionId` int NOT NULL,
	`artifactType` enum('certificate','manifest','cover_rendition','verification_receipt') NOT NULL,
	`artifactUrl` text NOT NULL,
	`artifactKey` text,
	`sha256` varchar(64) NOT NULL,
	`mediaType` varchar(128) NOT NULL,
	`generatorVersion` varchar(64) NOT NULL,
	`manifestHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `albumEditionArtifacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `albumEditionTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editionId` int NOT NULL,
	`position` int NOT NULL,
	`sourceSongId` int NOT NULL,
	`workWidSnapshot` varchar(64) NOT NULL,
	`titleSnapshot` varchar(255) NOT NULL,
	`creatorSnapshot` varchar(255) NOT NULL,
	`contentHashSnapshot` varchar(64),
	`mediaHashSnapshot` varchar(64),
	`participationMusicSnapshot` enum('Human','AI','Both','None'),
	`participationLyricsSnapshot` enum('Human','AI','Both','None'),
	`participationVoiceSnapshot` enum('Human','AI','Both','None'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `albumEditionTracks_id` PRIMARY KEY(`id`),
	CONSTRAINT `albumEditionTracks_edition_position_uq` UNIQUE(`editionId`,`position`),
	CONSTRAINT `albumEditionTracks_edition_song_uq` UNIQUE(`editionId`,`sourceSongId`)
);
--> statement-breakpoint
CREATE TABLE `albumEditions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`releaseFamilyId` int NOT NULL,
	`sourceDraftId` int NOT NULL,
	`creatorId` int NOT NULL,
	`editionNumber` int NOT NULL,
	`editionWid` varchar(96) NOT NULL,
	`manifestSchema` varchar(64) NOT NULL,
	`canonicalManifest` text NOT NULL,
	`manifestHash` varchar(64) NOT NULL,
	`membershipHash` varchar(64) NOT NULL,
	`registryEventId` varchar(96) NOT NULL,
	`creatorPublicKey` text NOT NULL,
	`creatorSignature` text NOT NULL,
	`visibility` enum('public','unlisted','private') NOT NULL,
	`availability` enum('available','withdrawn','flagged') NOT NULL DEFAULT 'available',
	`sealedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `albumEditions_id` PRIMARY KEY(`id`),
	CONSTRAINT `albumEditions_wid_uq` UNIQUE(`editionWid`),
	CONSTRAINT `albumEditions_family_edition_uq` UNIQUE(`releaseFamilyId`,`editionNumber`),
	CONSTRAINT `albumEditions_registry_event_uq` UNIQUE(`registryEventId`)
);
--> statement-breakpoint
CREATE TABLE `albumReleaseDraftTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`draftId` int NOT NULL,
	`songId` int NOT NULL,
	`position` int NOT NULL,
	`creatorNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `albumReleaseDraftTracks_id` PRIMARY KEY(`id`),
	CONSTRAINT `albumReleaseDraftTracks_draft_song_uq` UNIQUE(`draftId`,`songId`),
	CONSTRAINT `albumReleaseDraftTracks_draft_position_uq` UNIQUE(`draftId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `albumReleaseDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`releaseFamilyId` int NOT NULL,
	`creatorId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`coverArtUrl` text,
	`visibilityIntent` enum('public','unlisted','private') NOT NULL DEFAULT 'public',
	`status` enum('draft','publishing','published','abandoned') NOT NULL DEFAULT 'draft',
	`revision` int NOT NULL DEFAULT 1,
	`createRequestId` varchar(64) NOT NULL,
	`publishedEditionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `albumReleaseDrafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `albumReleaseDrafts_creator_create_request_uq` UNIQUE(`creatorId`,`createRequestId`)
);
--> statement-breakpoint
CREATE TABLE `albumReleaseFamilies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`legacyCollectionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `albumReleaseFamilies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `albumEditionArtifacts_edition_created_idx` ON `albumEditionArtifacts` (`editionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `albumEditionTracks_source_song_idx` ON `albumEditionTracks` (`sourceSongId`);--> statement-breakpoint
CREATE INDEX `albumEditions_creator_sealed_idx` ON `albumEditions` (`creatorId`,`sealedAt`);--> statement-breakpoint
CREATE INDEX `albumReleaseDraftTracks_song_idx` ON `albumReleaseDraftTracks` (`songId`);--> statement-breakpoint
CREATE INDEX `albumReleaseDrafts_creator_status_updated_idx` ON `albumReleaseDrafts` (`creatorId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `albumReleaseDrafts_family_status_idx` ON `albumReleaseDrafts` (`releaseFamilyId`,`status`);--> statement-breakpoint
CREATE INDEX `albumReleaseFamilies_creator_created_idx` ON `albumReleaseFamilies` (`creatorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `albumReleaseFamilies_legacy_collection_idx` ON `albumReleaseFamilies` (`legacyCollectionId`);