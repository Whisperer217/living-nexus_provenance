-- ADR-028 Slice A: mutable, creator-private PNA workspace continuity.
-- Deliberately separate from immutable/sealable keeper_chat_archives.
CREATE TABLE `pna_threads` (
  `id` varchar(64) NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `active_mode` varchar(32) NOT NULL DEFAULT 'guide',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pna_threads_user_updated_idx` (`user_id`, `updated_at`)
);

CREATE TABLE `pna_thread_messages` (
  `id` varchar(64) NOT NULL,
  `thread_id` varchar(64) NOT NULL,
  `user_id` int NOT NULL,
  `position` int NOT NULL,
  `role` enum('user','pna') NOT NULL,
  `content` text NOT NULL,
  `mode` varchar(32) NOT NULL DEFAULT 'guide',
  `visual_proposal_json` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pna_thread_messages_thread_position_idx` (`thread_id`, `position`),
  KEY `pna_thread_messages_user_idx` (`user_id`)
);
