-- I2: Creator-reviewed, one-time-confirmed private Commission Draft records.
-- No existing Work, WID, provenance, PNA, Quiver, Keeper, Guide, marketplace,
-- avatar, entitlement, or upload record is altered by this migration.

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
  CONSTRAINT `coreIngestionDraftProposals_proposalId` PRIMARY KEY(`proposalId`)
);

CREATE INDEX `coreIngestionDraftProposals_commissionId_idx` ON `coreIngestionDraftProposals` (`commissionId`);
CREATE INDEX `coreIngestionDraftProposals_creatorId_idx` ON `coreIngestionDraftProposals` (`creatorId`);
CREATE INDEX `coreIngestionDraftProposals_receiptId_idx` ON `coreIngestionDraftProposals` (`receiptId`);
CREATE INDEX `coreIngestionDraftProposals_status_expiresAt_idx` ON `coreIngestionDraftProposals` (`status`,`expiresAt`);
CREATE UNIQUE INDEX `coreIngestionDraftProposals_commission_receipt_uq` ON `coreIngestionDraftProposals` (`commissionId`,`receiptId`);

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
  CONSTRAINT `coreIngestionDraftConfirmations_confirmationId` PRIMARY KEY(`confirmationId`)
);

CREATE INDEX `coreIngestionDraftConfirmations_proposalId_idx` ON `coreIngestionDraftConfirmations` (`proposalId`);
CREATE INDEX `coreIngestionDraftConfirmations_creatorId_idx` ON `coreIngestionDraftConfirmations` (`creatorId`);
CREATE UNIQUE INDEX `coreIngestionDraftConfirmations_tokenHash_uq` ON `coreIngestionDraftConfirmations` (`tokenHash`);
CREATE INDEX `coreIngestionDraftConfirmations_status_expiresAt_idx` ON `coreIngestionDraftConfirmations` (`status`,`expiresAt`);

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
  CONSTRAINT `coreIngestionPrivateDrafts_privateDraftId` PRIMARY KEY(`privateDraftId`)
);

CREATE INDEX `coreIngestionPrivateDrafts_creatorId_idx` ON `coreIngestionPrivateDrafts` (`creatorId`);
CREATE UNIQUE INDEX `coreIngestionPrivateDrafts_commissionId_uq` ON `coreIngestionPrivateDrafts` (`commissionId`);
CREATE UNIQUE INDEX `coreIngestionPrivateDrafts_proposalId_uq` ON `coreIngestionPrivateDrafts` (`proposalId`);
CREATE UNIQUE INDEX `coreIngestionPrivateDrafts_confirmationId_uq` ON `coreIngestionPrivateDrafts` (`confirmationId`);
