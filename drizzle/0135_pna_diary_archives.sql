-- PNA provenance diary: extend keeper_chat_archives for thread seal + music binding
ALTER TABLE `keeper_chat_archives`
  ADD COLUMN `persona_id` varchar(64),
  ADD COLUMN `song_id` int,
  ADD COLUMN `song_wid` varchar(128),
  ADD COLUMN `song_title` varchar(256),
  ADD COLUMN `message_count` int NOT NULL DEFAULT 0,
  ADD COLUMN `content_hash` varchar(64),
  ADD COLUMN `diary_wid` varchar(128),
  ADD COLUMN `sealed_at` timestamp NULL,
  ADD COLUMN `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX `keeper_chat_archives_user_id_idx` ON `keeper_chat_archives` (`user_id`);
CREATE INDEX `keeper_chat_archives_diary_wid_idx` ON `keeper_chat_archives` (`diary_wid`);
