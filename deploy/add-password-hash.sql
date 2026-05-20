-- Living Nexus — Simple Auth Migration
-- Run this ONCE against your MySQL database before deploying simple auth.
-- Safe to run multiple times (uses IF NOT EXISTS).
--
-- Usage:
--   mysql -u root -p living_nexus < deploy/add-password-hash.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL AFTER email;

-- Optional: seed the first admin account
-- Replace values below, then uncomment and run separately.
-- The hash below is bcrypt of "changeme" — CHANGE IT before running.
--
-- INSERT INTO users (openId, name, email, loginMethod, password_hash, lastSignedIn)
-- VALUES (
--   'local_admin',
--   'Doc Seraph Mercer',
--   'your@email.com',
--   'email',
--   '$2a$12$placeholder_replace_with_real_bcrypt_hash',
--   NOW()
-- )
-- ON DUPLICATE KEY UPDATE
--   name = VALUES(name),
--   email = VALUES(email);
