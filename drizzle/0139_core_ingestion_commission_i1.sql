-- I1: Isolated deterministic Core Ingestion Commission foundation.
-- No existing Work, WID, provenance, PNA, Quiver, Keeper, Guide, avatar,
-- marketplace, entitlement, or upload record is altered by this migration.

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
  CONSTRAINT `coreIngestionCommissions_commissionId` PRIMARY KEY(`commissionId`)
);

CREATE INDEX `coreIngestionCommissions_creatorId_idx` ON `coreIngestionCommissions` (`creatorId`);
CREATE INDEX `coreIngestionCommissions_status_idx` ON `coreIngestionCommissions` (`status`);
CREATE UNIQUE INDEX `coreIngestionCommissions_creator_idempotency_uq` ON `coreIngestionCommissions` (`creatorId`,`idempotencyKey`);
CREATE INDEX `coreIngestionCommissions_assetSha256_idx` ON `coreIngestionCommissions` (`assetSha256`);

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
  CONSTRAINT `coreIngestionJobs_jobId` PRIMARY KEY(`jobId`)
);

CREATE INDEX `coreIngestionJobs_commissionId_idx` ON `coreIngestionJobs` (`commissionId`);
CREATE INDEX `coreIngestionJobs_status_idx` ON `coreIngestionJobs` (`status`);
CREATE INDEX `coreIngestionJobs_claim_idx` ON `coreIngestionJobs` (`status`,`createdAt`);
CREATE UNIQUE INDEX `coreIngestionJobs_commission_stage_idempotency_uq` ON `coreIngestionJobs` (`commissionId`,`stage`,`idempotencyKey`);

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
  CONSTRAINT `coreIngestionInspectionReceipts_receiptId` PRIMARY KEY(`receiptId`)
);

CREATE INDEX `coreIngestionInspectionReceipts_commissionId_idx` ON `coreIngestionInspectionReceipts` (`commissionId`);
CREATE UNIQUE INDEX `coreIngestionInspectionReceipts_jobId_uq` ON `coreIngestionInspectionReceipts` (`jobId`);
CREATE INDEX `coreIngestionInspectionReceipts_rootAssetHash_idx` ON `coreIngestionInspectionReceipts` (`rootAssetHash`);
