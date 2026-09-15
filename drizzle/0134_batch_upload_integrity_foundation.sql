ALTER TABLE `songs`
  ADD COLUMN `storedArtifactHash` varchar(64),
  ADD COLUMN `storageTransformVersion` varchar(64);
--> statement-breakpoint
CREATE TABLE `batchUploadOperations` (
  `operationId` varchar(64) NOT NULL,
  `creatorId` int NOT NULL,
  `status` enum('preparing','assets_verified','registering','collection_pending','completed','needs_creator_review','failed','cancelled') NOT NULL DEFAULT 'preparing',
  `policyVersion` varchar(64) NOT NULL DEFAULT 'batch-upload-integrity-v1',
  `intendedMetadataHash` varchar(64),
  `collectionName` varchar(255),
  `failureCode` varchar(96),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `batchUploadOperations_operationId_pk` PRIMARY KEY (`operationId`)
);
--> statement-breakpoint
CREATE INDEX `batchUploadOperations_creator_status_idx` ON `batchUploadOperations` (`creatorId`,`status`);
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
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consumedAt` timestamp,
  `revokedAt` timestamp,
  CONSTRAINT `batchUploadAssets_assetReceiptId_pk` PRIMARY KEY (`assetReceiptId`),
  CONSTRAINT `batchUploadAssets_operation_source_uq` UNIQUE (`operationId`,`sourceSha256`,`assetKind`)
);
--> statement-breakpoint
CREATE INDEX `batchUploadAssets_operation_creator_idx` ON `batchUploadAssets` (`operationId`,`creatorId`);
--> statement-breakpoint
CREATE INDEX `batchUploadAssets_creator_stored_hash_idx` ON `batchUploadAssets` (`creatorId`,`storedArtifactSha256`);
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
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `batchUploadItems_itemReceiptId_pk` PRIMARY KEY (`itemReceiptId`),
  CONSTRAINT `batchUploadItems_operation_card_uq` UNIQUE (`operationId`,`clientCardId`),
  CONSTRAINT `batchUploadItems_operation_source_uq` UNIQUE (`operationId`,`sourceSha256`)
);
--> statement-breakpoint
CREATE INDEX `batchUploadItems_creator_status_idx` ON `batchUploadItems` (`creatorId`,`status`);
