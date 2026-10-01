-- ADR-016: Creator-scoped Music Draft capability authority, Commission, and
-- append-only Agent Ledger. No existing work, WID, provenance, or user data is altered.

CREATE TABLE `agentCapabilityAuthorities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `creatorId` int NOT NULL,
  `agentId` int NOT NULL,
  `capability` enum('music_draft') NOT NULL DEFAULT 'music_draft',
  `enabled` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agentCapabilityAuthorities_id` PRIMARY KEY(`id`)
);

CREATE UNIQUE INDEX `agentCapabilityAuthorities_creator_agent_capability_uq`
  ON `agentCapabilityAuthorities` (`creatorId`, `agentId`, `capability`);
CREATE INDEX `agentCapabilityAuthorities_creatorId_idx`
  ON `agentCapabilityAuthorities` (`creatorId`);

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

CREATE INDEX `agentCommissions_creatorId_idx` ON `agentCommissions` (`creatorId`);
CREATE INDEX `agentCommissions_songId_idx` ON `agentCommissions` (`songId`);
CREATE INDEX `agentCommissions_agentId_idx` ON `agentCommissions` (`agentId`);
CREATE INDEX `agentCommissions_status_idx` ON `agentCommissions` (`status`);

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

CREATE INDEX `agentLedgerEntries_creatorId_idx` ON `agentLedgerEntries` (`creatorId`);
CREATE INDEX `agentLedgerEntries_commissionId_idx` ON `agentLedgerEntries` (`commissionId`);
CREATE INDEX `agentLedgerEntries_songId_idx` ON `agentLedgerEntries` (`songId`);
CREATE INDEX `agentLedgerEntries_createdAt_idx` ON `agentLedgerEntries` (`createdAt`);
