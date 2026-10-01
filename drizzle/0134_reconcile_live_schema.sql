CREATE TABLE `agentCapabilityAuthorities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`agentId` int NOT NULL,
	`capability` enum('music_draft') NOT NULL DEFAULT 'music_draft',
	`enabled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentCapabilityAuthorities_id` PRIMARY KEY(`id`),
	CONSTRAINT `agentCapabilityAuthorities_creator_agent_capability_uq` UNIQUE(`creatorId`,`agentId`,`capability`)
);
--> statement-breakpoint
CREATE TABLE `agentCommissions` (
	`commissionId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`agentId` int NOT NULL,
	`songId` int NOT NULL,
	`capability` enum('music_draft') NOT NULL DEFAULT 'music_draft',
	`direction` text NOT NULL,
	`status` enum('active','revoked','completed') NOT NULL DEFAULT 'active',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `agentCommissions_commissionId` PRIMARY KEY(`commissionId`)
);
--> statement-breakpoint
CREATE TABLE `agentLedgerEntries` (
	`entryId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`agentId` int NOT NULL,
	`agentIdentifier` varchar(96) NOT NULL,
	`commissionId` varchar(64),
	`songId` int,
	`capability` enum('music_draft') NOT NULL DEFAULT 'music_draft',
	`action` enum('capability_enabled','capability_disabled','commission_issued') NOT NULL,
	`payloadCanonical` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentLedgerEntries_entryId` PRIMARY KEY(`entryId`)
);
--> statement-breakpoint
CREATE TABLE `batchUploadAssets` (
	`assetReceiptId` varchar(64) NOT NULL,
	`operationId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`assetKind` enum('audio','cover') NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` text NOT NULL,
	`sourceSha256` varchar(64) NOT NULL,
	`storedArtifactSha256` varchar(64) NOT NULL,
	`storageTransformVersion` varchar(64) NOT NULL,
	`sourceBytes` bigint NOT NULL,
	`storedBytes` bigint NOT NULL,
	`contentType` varchar(191) NOT NULL,
	`status` enum('verified','consumed','revoked') NOT NULL DEFAULT 'verified',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`consumedAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `batchUploadAssets_assetReceiptId` PRIMARY KEY(`assetReceiptId`),
	CONSTRAINT `batchUploadAssets_operation_source_uq` UNIQUE(`operationId`,`sourceSha256`,`assetKind`)
);
--> statement-breakpoint
CREATE TABLE `batchUploadItems` (
	`itemReceiptId` varchar(64) NOT NULL,
	`operationId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`clientCardId` varchar(128) NOT NULL,
	`audioAssetReceiptId` varchar(64),
	`coverAssetReceiptId` varchar(64),
	`sourceSha256` varchar(64),
	`intendedMetadataHash` varchar(64),
	`status` enum('asset_pending','asset_verified','registered','recovered_existing','evidence_mismatch','ambiguous','failed','cancelled') NOT NULL DEFAULT 'asset_pending',
	`songId` int,
	`witnessId` varchar(64),
	`failureCode` varchar(96),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batchUploadItems_itemReceiptId` PRIMARY KEY(`itemReceiptId`),
	CONSTRAINT `batchUploadItems_operation_card_uq` UNIQUE(`operationId`,`clientCardId`),
	CONSTRAINT `batchUploadItems_operation_source_uq` UNIQUE(`operationId`,`sourceSha256`)
);
--> statement-breakpoint
CREATE TABLE `batchUploadOperations` (
	`operationId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`status` enum('preparing','assets_verified','registering','collection_pending','completed','needs_creator_review','failed','cancelled') NOT NULL DEFAULT 'preparing',
	`policyVersion` varchar(64) NOT NULL DEFAULT 'batch-upload-integrity-v1',
	`intendedMetadataHash` varchar(64),
	`collectionName` varchar(255),
	`failureCode` varchar(96),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batchUploadOperations_operationId` PRIMARY KEY(`operationId`)
);
--> statement-breakpoint
CREATE TABLE `coreIngestionCommissions` (
	`commissionId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`requestedOutcome` enum('private_draft','registration_review') NOT NULL DEFAULT 'private_draft',
	`status` enum('awaiting_asset','asset_received','queued','inspecting','inspection_ready','failed','cancelled') NOT NULL DEFAULT 'awaiting_asset',
	`assetStorageKey` varchar(512),
	`assetContentType` varchar(191),
	`assetSizeBytes` int,
	`assetSha256` varchar(64),
	`idempotencyKey` varchar(128) NOT NULL,
	`inspectionReceiptId` varchar(64),
	`failureCode` varchar(96),
	`failureMessage` varchar(512),
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coreIngestionCommissions_commissionId` PRIMARY KEY(`commissionId`),
	CONSTRAINT `coreIngestionCommissions_creator_idempotency_uq` UNIQUE(`creatorId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `coreIngestionDraftConfirmations` (
	`confirmationId` varchar(64) NOT NULL,
	`proposalId` varchar(64) NOT NULL,
	`commissionId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('issued','consumed','expired','revoked') NOT NULL DEFAULT 'issued',
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coreIngestionDraftConfirmations_confirmationId` PRIMARY KEY(`confirmationId`),
	CONSTRAINT `coreIngestionDraftConfirmations_tokenHash_uq` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `coreIngestionDraftProposals` (
	`proposalId` varchar(64) NOT NULL,
	`commissionId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`receiptId` varchar(64) NOT NULL,
	`rootAssetHash` varchar(64) NOT NULL,
	`receiptHash` varchar(64) NOT NULL,
	`proposalVersion` varchar(64) NOT NULL DEFAULT 'core.ingestion.review.v1',
	`status` enum('offered','confirmed','expired','dismissed','superseded') NOT NULL DEFAULT 'offered',
	`technicalSnapshot` json NOT NULL,
	`proposalHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`confirmedAt` timestamp,
	`dismissedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coreIngestionDraftProposals_proposalId` PRIMARY KEY(`proposalId`),
	CONSTRAINT `coreIngestionDraftProposals_commission_receipt_uq` UNIQUE(`commissionId`,`receiptId`)
);
--> statement-breakpoint
CREATE TABLE `coreIngestionInspectionReceipts` (
	`receiptId` varchar(64) NOT NULL,
	`commissionId` varchar(64) NOT NULL,
	`jobId` varchar(64) NOT NULL,
	`rootAssetHash` varchar(64) NOT NULL,
	`inspectionVersion` varchar(64) NOT NULL DEFAULT 'core.ingestion.v1',
	`resultStatus` enum('succeeded','partial','failed') NOT NULL,
	`measuredFacts` json NOT NULL,
	`derivedAssetRefs` json NOT NULL,
	`warningCodes` json NOT NULL,
	`receiptHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coreIngestionInspectionReceipts_receiptId` PRIMARY KEY(`receiptId`),
	CONSTRAINT `coreIngestionInspectionReceipts_jobId_uq` UNIQUE(`jobId`)
);
--> statement-breakpoint
CREATE TABLE `coreIngestionJobs` (
	`jobId` varchar(64) NOT NULL,
	`commissionId` varchar(64) NOT NULL,
	`stage` enum('verify_asset','inspect_asset','assemble_receipt') NOT NULL,
	`status` enum('queued','processing','complete','failed','cancelled') NOT NULL DEFAULT 'queued',
	`rootAssetHash` varchar(64),
	`idempotencyKey` varchar(128) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`leaseExpiresAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`errorCode` varchar(96),
	`errorMessage` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coreIngestionJobs_jobId` PRIMARY KEY(`jobId`),
	CONSTRAINT `coreIngestionJobs_commission_stage_idempotency_uq` UNIQUE(`commissionId`,`stage`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `coreIngestionPrivateDrafts` (
	`privateDraftId` varchar(64) NOT NULL,
	`commissionId` varchar(64) NOT NULL,
	`proposalId` varchar(64) NOT NULL,
	`confirmationId` varchar(64) NOT NULL,
	`creatorId` int NOT NULL,
	`rootAssetHash` varchar(64) NOT NULL,
	`receiptHash` varchar(64) NOT NULL,
	`draftState` enum('private_review') NOT NULL DEFAULT 'private_review',
	`technicalSnapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coreIngestionPrivateDrafts_privateDraftId` PRIMARY KEY(`privateDraftId`),
	CONSTRAINT `coreIngestionPrivateDrafts_commissionId_uq` UNIQUE(`commissionId`),
	CONSTRAINT `coreIngestionPrivateDrafts_proposalId_uq` UNIQUE(`proposalId`),
	CONSTRAINT `coreIngestionPrivateDrafts_confirmationId_uq` UNIQUE(`confirmationId`)
);
--> statement-breakpoint
CREATE TABLE `coreIngestionSchedulerConfigs` (
	`configKey` varchar(64) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`cadence` varchar(64) NOT NULL DEFAULT '0 */5 * * * *',
	`callbackPath` varchar(128) NOT NULL DEFAULT '/api/scheduled/core-ingestion',
	`enabled` boolean NOT NULL DEFAULT false,
	`boundByUserId` int,
	`boundAt` timestamp,
	`lastStartedAt` timestamp,
	`lastFinishedAt` timestamp,
	`lastResult` json,
	`lastErrorCode` varchar(96),
	`lastErrorMessage` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coreIngestionSchedulerConfigs_configKey` PRIMARY KEY(`configKey`),
	CONSTRAINT `coreIngestionSchedulerConfigs_taskUid_uq` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE TABLE `creative_cathedral_decisions` (
	`id` varchar(64) NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`suggestion_id` varchar(64),
	`creator_id` int NOT NULL,
	`decision` enum('consent_context','apply_to_form','edit_first','dismiss') NOT NULL,
	`target_fields_json` json,
	`context_manifest_hash` varchar(64),
	`occurred_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creative_cathedral_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creative_cathedral_sessions` (
	`id` varchar(64) NOT NULL,
	`creator_id` int NOT NULL,
	`song_id` int,
	`stage` enum('prepare','review','registered','published') NOT NULL DEFAULT 'prepare',
	`draft_snapshot_json` json,
	`ui_state_json` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creative_cathedral_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creative_cathedral_suggestions` (
	`id` varchar(64) NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`creator_id` int NOT NULL,
	`song_id` int,
	`kind` enum('media_facts') NOT NULL DEFAULT 'media_facts',
	`proposal_json` json NOT NULL,
	`evidence_json` json,
	`source_manifest_json` json NOT NULL,
	`model_ref` varchar(128),
	`status` enum('proposed','applied_to_form','dismissed','expired') NOT NULL DEFAULT 'proposed',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `creative_cathedral_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creatorPlatforms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platformType` varchar(64) NOT NULL,
	`handle` varchar(256),
	`url` text NOT NULL,
	`displayName` varchar(128),
	`description` text,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`isVerified` boolean NOT NULL DEFAULT false,
	`cachedPreviewJson` text,
	`cacheUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creatorPlatforms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guideGrowthEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guideId` int NOT NULL,
	`eventType` enum('track_linked','contact','witness_ack') NOT NULL,
	`actorUserId` int NOT NULL,
	`refWid` varchar(128),
	`refSongId` int,
	`note` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guideGrowthEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guideSlotPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`slotsPurchased` int NOT NULL,
	`amountCents` int NOT NULL,
	`packageId` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guideSlotPurchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pna_thread_messages` (
	`id` varchar(64) NOT NULL,
	`thread_id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`position` int NOT NULL,
	`role` enum('user','pna') NOT NULL,
	`content` text NOT NULL,
	`mode` varchar(32) NOT NULL DEFAULT 'guide',
	`visual_proposal_json` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pna_thread_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pna_threads` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`active_mode` varchar(32) NOT NULL DEFAULT 'guide',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pna_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registryApiAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('ISSUED','ROTATED','REVOKED','ACCESS_ALLOWED','ACCESS_DENIED') NOT NULL,
	`requestId` varchar(96),
	`credentialId` int,
	`clientId` int,
	`ownerUserId` int,
	`actorUserId` int,
	`routeId` varchar(128),
	`requiredScope` varchar(96),
	`decision` enum('ALLOW','DENY') NOT NULL,
	`reasonCode` varchar(96) NOT NULL,
	`httpStatus` int NOT NULL,
	`latencyMs` int,
	`rateLimitBucket` varchar(96),
	`queryHash` varchar(64),
	`ipHash` varchar(64),
	`userAgentHash` varchar(64),
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registryApiAuditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registryApiClientScopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`scope` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registryApiClientScopes_id` PRIMARY KEY(`id`),
	CONSTRAINT `registryApiClientScopes_client_scope_uq` UNIQUE(`clientId`,`scope`)
);
--> statement-breakpoint
CREATE TABLE `registryApiClients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`clientType` enum('FIRST_PARTY','PARTNER','PERSONAL') NOT NULL,
	`environment` enum('TEST','LIVE') NOT NULL,
	`status` enum('ACTIVE','SUSPENDED','REVOKED') NOT NULL DEFAULT 'ACTIVE',
	`dailyLimit` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registryApiClients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registryApiCredentialScopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`credentialId` int NOT NULL,
	`scope` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registryApiCredentialScopes_id` PRIMARY KEY(`id`),
	CONSTRAINT `registryApiCredentialScopes_credential_scope_uq` UNIQUE(`credentialId`,`scope`)
);
--> statement-breakpoint
CREATE TABLE `registryApiCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyId` varchar(64) NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`credentialVersion` int NOT NULL DEFAULT 2,
	`keyPrefix` varchar(32) NOT NULL,
	`secretHash` varchar(128) NOT NULL,
	`status` enum('PENDING_APPROVAL','ACTIVE','ROTATING','EXPIRED','REVOKED','SUSPENDED') NOT NULL DEFAULT 'PENDING_APPROVAL',
	`dailyLimit` int NOT NULL,
	`usageToday` int NOT NULL DEFAULT 0,
	`usageTotal` bigint NOT NULL DEFAULT 0,
	`resetAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`lastUsedAt` timestamp,
	`rotationGraceExpiresAt` timestamp,
	`rotatedFromId` int,
	`revokedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registryApiCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `registryApiCredentials_keyId_uq` UNIQUE(`keyId`),
	CONSTRAINT `registryApiCredentials_secretHash_uq` UNIQUE(`secretHash`)
);
--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` RENAME COLUMN `user_id` TO `userId`;--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` RENAME COLUMN `created_at` TO `createdAt`;--> statement-breakpoint
ALTER TABLE `guides` ADD `growthLevel` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `guides` ADD `signalPersonalityJson` json;--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `personaId` varchar(64);--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `songId` int;--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `songWid` varchar(128);--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `songTitle` varchar(256);--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `messageCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `contentHash` varchar(64);--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `diaryWid` varchar(128);--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `sealedAt` timestamp;--> statement-breakpoint
ALTER TABLE `keeper_chat_archives` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `songs` ADD `creatorReleaseDate` varchar(32);--> statement-breakpoint
ALTER TABLE `songs` ADD `externalDisplayEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `externalDisplayAuthorizedAt` timestamp;--> statement-breakpoint
ALTER TABLE `songs` ADD `externalDisplayRevokedAt` timestamp;--> statement-breakpoint
ALTER TABLE `songs` ADD `externalDisplayAuthVersion` varchar(32);--> statement-breakpoint
ALTER TABLE `songs` ADD `externalDisplayContext` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `externalDisplayRightsConfirmed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `storedArtifactHash` varchar(64);--> statement-breakpoint
ALTER TABLE `songs` ADD `storageTransformVersion` varchar(64);--> statement-breakpoint
ALTER TABLE `songs` ADD `participationMusic` enum('Human','AI','Both') DEFAULT 'Human';--> statement-breakpoint
ALTER TABLE `songs` ADD `participationLyrics` enum('Human','AI','Both') DEFAULT 'Human';--> statement-breakpoint
ALTER TABLE `songs` ADD `participationVoice` enum('Human','AI','Both') DEFAULT 'Human';--> statement-breakpoint
ALTER TABLE `songs` ADD `toneProfileJson` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `waveformUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `waveformKey` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `visualSource` enum('embedded','uploaded','generated','remixed','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `songs` ADD `visualPrompt` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `visualLineageJson` text;--> statement-breakpoint
ALTER TABLE `users` ADD `guideSlotsUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `guideSlotsTotal` int DEFAULT 3 NOT NULL;--> statement-breakpoint
CREATE INDEX `agentCapabilityAuthorities_creatorId_idx` ON `agentCapabilityAuthorities` (`creatorId`);--> statement-breakpoint
CREATE INDEX `agentCommissions_creatorId_idx` ON `agentCommissions` (`creatorId`);--> statement-breakpoint
CREATE INDEX `agentCommissions_songId_idx` ON `agentCommissions` (`songId`);--> statement-breakpoint
CREATE INDEX `agentCommissions_agentId_idx` ON `agentCommissions` (`agentId`);--> statement-breakpoint
CREATE INDEX `agentCommissions_status_idx` ON `agentCommissions` (`status`);--> statement-breakpoint
CREATE INDEX `agentLedgerEntries_creatorId_idx` ON `agentLedgerEntries` (`creatorId`);--> statement-breakpoint
CREATE INDEX `agentLedgerEntries_commissionId_idx` ON `agentLedgerEntries` (`commissionId`);--> statement-breakpoint
CREATE INDEX `agentLedgerEntries_songId_idx` ON `agentLedgerEntries` (`songId`);--> statement-breakpoint
CREATE INDEX `agentLedgerEntries_createdAt_idx` ON `agentLedgerEntries` (`createdAt`);--> statement-breakpoint
CREATE INDEX `batchUploadAssets_operation_creator_idx` ON `batchUploadAssets` (`operationId`,`creatorId`);--> statement-breakpoint
CREATE INDEX `batchUploadAssets_creator_stored_hash_idx` ON `batchUploadAssets` (`creatorId`,`storedArtifactSha256`);--> statement-breakpoint
CREATE INDEX `batchUploadItems_creator_status_idx` ON `batchUploadItems` (`creatorId`,`status`);--> statement-breakpoint
CREATE INDEX `batchUploadOperations_creator_status_idx` ON `batchUploadOperations` (`creatorId`,`status`);--> statement-breakpoint
CREATE INDEX `coreIngestionCommissions_creatorId_idx` ON `coreIngestionCommissions` (`creatorId`);--> statement-breakpoint
CREATE INDEX `coreIngestionCommissions_status_idx` ON `coreIngestionCommissions` (`status`);--> statement-breakpoint
CREATE INDEX `coreIngestionCommissions_assetSha256_idx` ON `coreIngestionCommissions` (`assetSha256`);--> statement-breakpoint
CREATE INDEX `coreIngestionDraftConfirmations_proposalId_idx` ON `coreIngestionDraftConfirmations` (`proposalId`);--> statement-breakpoint
CREATE INDEX `coreIngestionDraftConfirmations_creatorId_idx` ON `coreIngestionDraftConfirmations` (`creatorId`);--> statement-breakpoint
CREATE INDEX `coreIngestionDraftConfirmations_status_expiresAt_idx` ON `coreIngestionDraftConfirmations` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `coreIngestionDraftProposals_commissionId_idx` ON `coreIngestionDraftProposals` (`commissionId`);--> statement-breakpoint
CREATE INDEX `coreIngestionDraftProposals_creatorId_idx` ON `coreIngestionDraftProposals` (`creatorId`);--> statement-breakpoint
CREATE INDEX `coreIngestionDraftProposals_receiptId_idx` ON `coreIngestionDraftProposals` (`receiptId`);--> statement-breakpoint
CREATE INDEX `coreIngestionDraftProposals_status_expiresAt_idx` ON `coreIngestionDraftProposals` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `coreIngestionInspectionReceipts_commissionId_idx` ON `coreIngestionInspectionReceipts` (`commissionId`);--> statement-breakpoint
CREATE INDEX `coreIngestionInspectionReceipts_rootAssetHash_idx` ON `coreIngestionInspectionReceipts` (`rootAssetHash`);--> statement-breakpoint
CREATE INDEX `coreIngestionJobs_commissionId_idx` ON `coreIngestionJobs` (`commissionId`);--> statement-breakpoint
CREATE INDEX `coreIngestionJobs_status_idx` ON `coreIngestionJobs` (`status`);--> statement-breakpoint
CREATE INDEX `coreIngestionJobs_claim_idx` ON `coreIngestionJobs` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `coreIngestionPrivateDrafts_creatorId_idx` ON `coreIngestionPrivateDrafts` (`creatorId`);--> statement-breakpoint
CREATE INDEX `coreIngestionSchedulerConfigs_enabled_idx` ON `coreIngestionSchedulerConfigs` (`enabled`);--> statement-breakpoint
CREATE INDEX `cc_decisions_session_occurred_idx` ON `creative_cathedral_decisions` (`session_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `cc_decisions_suggestion_idx` ON `creative_cathedral_decisions` (`suggestion_id`);--> statement-breakpoint
CREATE INDEX `cc_decisions_creator_occurred_idx` ON `creative_cathedral_decisions` (`creator_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `cc_sessions_creator_updated_idx` ON `creative_cathedral_sessions` (`creator_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `cc_sessions_song_idx` ON `creative_cathedral_sessions` (`song_id`);--> statement-breakpoint
CREATE INDEX `cc_suggestions_session_created_idx` ON `creative_cathedral_suggestions` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `cc_suggestions_creator_status_idx` ON `creative_cathedral_suggestions` (`creator_id`,`status`);--> statement-breakpoint
CREATE INDEX `cc_suggestions_song_idx` ON `creative_cathedral_suggestions` (`song_id`);--> statement-breakpoint
CREATE INDEX `idx_creatorPlatforms_userId` ON `creatorPlatforms` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_creatorPlatforms_type` ON `creatorPlatforms` (`platformType`);--> statement-breakpoint
CREATE INDEX `guideGrowthEvents_guideId_idx` ON `guideGrowthEvents` (`guideId`);--> statement-breakpoint
CREATE INDEX `guideGrowthEvents_eventType_idx` ON `guideGrowthEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `guideGrowthEvents_actorUserId_idx` ON `guideGrowthEvents` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `guideSlotPurchases_userId_idx` ON `guideSlotPurchases` (`userId`);--> statement-breakpoint
CREATE INDEX `pna_thread_messages_thread_position_idx` ON `pna_thread_messages` (`thread_id`,`position`);--> statement-breakpoint
CREATE INDEX `pna_thread_messages_user_idx` ON `pna_thread_messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `pna_threads_user_updated_idx` ON `pna_threads` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `registryApiAuditEvents_occurredAt_idx` ON `registryApiAuditEvents` (`occurredAt`);--> statement-breakpoint
CREATE INDEX `registryApiAuditEvents_credentialId_idx` ON `registryApiAuditEvents` (`credentialId`);--> statement-breakpoint
CREATE INDEX `registryApiAuditEvents_clientId_idx` ON `registryApiAuditEvents` (`clientId`);--> statement-breakpoint
CREATE INDEX `registryApiAuditEvents_routeId_idx` ON `registryApiAuditEvents` (`routeId`);--> statement-breakpoint
CREATE INDEX `registryApiClientScopes_clientId_idx` ON `registryApiClientScopes` (`clientId`);--> statement-breakpoint
CREATE INDEX `registryApiClients_ownerUserId_idx` ON `registryApiClients` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `registryApiClients_status_idx` ON `registryApiClients` (`status`);--> statement-breakpoint
CREATE INDEX `registryApiCredentialScopes_credentialId_idx` ON `registryApiCredentialScopes` (`credentialId`);--> statement-breakpoint
CREATE INDEX `registryApiCredentials_clientId_idx` ON `registryApiCredentials` (`clientId`);--> statement-breakpoint
CREATE INDEX `registryApiCredentials_status_idx` ON `registryApiCredentials` (`status`);--> statement-breakpoint
CREATE INDEX `registryApiCredentials_expiresAt_idx` ON `registryApiCredentials` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `keeper_chat_archives_user_id_idx` ON `keeper_chat_archives` (`userId`);--> statement-breakpoint
CREATE INDEX `keeper_chat_archives_diary_wid_idx` ON `keeper_chat_archives` (`diaryWid`);