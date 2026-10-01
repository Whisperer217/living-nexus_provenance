ALTER TABLE `songs`
  ADD `externalDisplayEnabled` boolean DEFAULT false NOT NULL,
  ADD `externalDisplayAuthorizedAt` timestamp NULL,
  ADD `externalDisplayRevokedAt` timestamp NULL,
  ADD `externalDisplayAuthVersion` varchar(32),
  ADD `externalDisplayContext` text,
  ADD `externalDisplayRightsConfirmed` boolean DEFAULT false NOT NULL;
