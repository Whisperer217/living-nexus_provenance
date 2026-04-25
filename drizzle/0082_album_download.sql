-- Migration: Album-level download permissions
-- Adds albumDownloadPermission and albumDownloadPriceCents to projects table

ALTER TABLE `projects`
  ADD COLUMN `albumDownloadPermission` ENUM('none','free','tipped') NOT NULL DEFAULT 'none'
    COMMENT 'none=disabled, free=anyone, tipped=gift-gated',
  ADD COLUMN `albumDownloadPriceCents` INT NOT NULL DEFAULT 499
    COMMENT 'Minimum gift in cents to unlock album download (default $4.99)';
