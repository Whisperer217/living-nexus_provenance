-- Creator Guide stewardship: slots (default 3), growth level, signal personality, growth events, slot purchases
ALTER TABLE `users`
  ADD COLUMN `guideSlotsUsed` int NOT NULL DEFAULT 0,
  ADD COLUMN `guideSlotsTotal` int NOT NULL DEFAULT 3;

ALTER TABLE `guides`
  ADD COLUMN `growthLevel` int NOT NULL DEFAULT 1,
  ADD COLUMN `signalPersonalityJson` json;

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

CREATE INDEX `guideGrowthEvents_guideId_idx` ON `guideGrowthEvents` (`guideId`);
CREATE INDEX `guideGrowthEvents_eventType_idx` ON `guideGrowthEvents` (`eventType`);
CREATE INDEX `guideGrowthEvents_actorUserId_idx` ON `guideGrowthEvents` (`actorUserId`);

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

CREATE INDEX `guideSlotPurchases_userId_idx` ON `guideSlotPurchases` (`userId`);

-- Backfill used count from existing guide rows (non-destructive)
UPDATE `users` u
SET `guideSlotsUsed` = (
  SELECT COUNT(*) FROM `guides` g WHERE g.`creatorId` = u.`id`
),
`guideSlotsTotal` = GREATEST(3, (
  SELECT COUNT(*) FROM `guides` g WHERE g.`creatorId` = u.`id`
));
