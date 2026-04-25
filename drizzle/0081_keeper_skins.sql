-- Living Nexus — Keeper Skin System
-- Phase 2a: Floating avatar widget with purchasable skins and capability unlocks

CREATE TABLE IF NOT EXISTS `keeper_skins` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `skinId` varchar(64) NOT NULL,
  `skinName` varchar(128) NOT NULL,
  `portraitUrl` text NOT NULL,
  `capabilities` json NOT NULL,
  `isActive` boolean NOT NULL DEFAULT false,
  `isCustom` boolean NOT NULL DEFAULT false,
  `unlockedAt` bigint NOT NULL,
  CONSTRAINT `keeper_skins_id` PRIMARY KEY(`id`)
);

ALTER TABLE `keeper_skins` ADD CONSTRAINT `keeper_skins_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE INDEX `keeper_skins_userId_idx` ON `keeper_skins` (`userId`);
