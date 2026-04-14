-- Migration: Add pagesJson to songs table for horizontal comic book reader
-- pagesJson stores an ordered array of { pageNumber, imageUrl, caption? }
-- Only populated for contentType = "comic" | "manuscript" when the creator
-- uses the Storyboard Builder during upload.
ALTER TABLE `songs` ADD COLUMN `pagesJson` text;
