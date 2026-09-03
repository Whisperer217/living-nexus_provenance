-- Creator-declared historical Work chronology. This metadata is distinct from
-- immutable WID registration and system publication timestamps.
ALTER TABLE `songs` ADD COLUMN `creatorReleaseDate` varchar(32) NULL AFTER `releaseDate`;
