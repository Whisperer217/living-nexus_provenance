-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0074: Backfill isPublic for songs toggled to Draft before the
-- visibility fix (commit 1a51bb6) was deployed.
--
-- Root cause: updateSongStatus previously only set `status` and never touched
-- `isPublic`. Songs set to Draft/Unlisted/Deleted before the fix may still
-- have isPublic = true, causing them to appear in public feeds.
--
-- This migration is safe to run multiple times (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Unpublish all non-Published songs that still have isPublic = true
UPDATE songs
SET is_public = false
WHERE status != 'Published'
  AND is_public = true;

-- Step 2: Ensure all Published songs have isPublic = true (forward consistency)
UPDATE songs
SET is_public = true
WHERE status = 'Published'
  AND is_public = false;
