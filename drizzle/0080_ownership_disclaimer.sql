-- Migration 0080: ownership_disclaimer
-- Adds ownershipStatus to songs table.
-- Values:
--   "full"         = creator owns full commercial rights (original composition or fully licensed remix)
--   "partial"      = AI-generated without commercial license, or remix without full clearance
--                    → upload allowed, publish and monetization blocked until upgraded
-- Default "full" preserves all existing rows as unaffected.
ALTER TABLE `songs` ADD `ownershipStatus` enum('full','partial') NOT NULL DEFAULT 'full';
