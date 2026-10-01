-- Option B scheduler control plane. This migration stores only global
-- operational metadata. It does not create or enable a platform schedule and
-- does not alter Works, WIDs, provenance, PNA, avatar, marketplace, or assets.

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
  CONSTRAINT `coreIngestionSchedulerConfigs_configKey` PRIMARY KEY(`configKey`)
);

CREATE UNIQUE INDEX `coreIngestionSchedulerConfigs_taskUid_uq` ON `coreIngestionSchedulerConfigs` (`scheduleCronTaskUid`);
CREATE INDEX `coreIngestionSchedulerConfigs_enabled_idx` ON `coreIngestionSchedulerConfigs` (`enabled`);
