-- Registry API R1a: additive service-client and version-2 credential foundation.
-- Legacy apiKeys retain their Work-registration role and receive no Registry scope.

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
CREATE INDEX `registryApiClients_ownerUserId_idx` ON `registryApiClients` (`ownerUserId`);
CREATE INDEX `registryApiClients_status_idx` ON `registryApiClients` (`status`);

CREATE TABLE `registryApiClientScopes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `clientId` int NOT NULL,
  `scope` varchar(96) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `registryApiClientScopes_id` PRIMARY KEY(`id`)
);
CREATE UNIQUE INDEX `registryApiClientScopes_client_scope_uq` ON `registryApiClientScopes` (`clientId`,`scope`);
CREATE INDEX `registryApiClientScopes_clientId_idx` ON `registryApiClientScopes` (`clientId`);

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
CREATE INDEX `registryApiCredentials_clientId_idx` ON `registryApiCredentials` (`clientId`);
CREATE INDEX `registryApiCredentials_status_idx` ON `registryApiCredentials` (`status`);
CREATE INDEX `registryApiCredentials_expiresAt_idx` ON `registryApiCredentials` (`expiresAt`);

CREATE TABLE `registryApiCredentialScopes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `credentialId` int NOT NULL,
  `scope` varchar(96) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `registryApiCredentialScopes_id` PRIMARY KEY(`id`)
);
CREATE UNIQUE INDEX `registryApiCredentialScopes_credential_scope_uq` ON `registryApiCredentialScopes` (`credentialId`,`scope`);
CREATE INDEX `registryApiCredentialScopes_credentialId_idx` ON `registryApiCredentialScopes` (`credentialId`);

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
CREATE INDEX `registryApiAuditEvents_occurredAt_idx` ON `registryApiAuditEvents` (`occurredAt`);
CREATE INDEX `registryApiAuditEvents_credentialId_idx` ON `registryApiAuditEvents` (`credentialId`);
CREATE INDEX `registryApiAuditEvents_clientId_idx` ON `registryApiAuditEvents` (`clientId`);
CREATE INDEX `registryApiAuditEvents_routeId_idx` ON `registryApiAuditEvents` (`routeId`);
