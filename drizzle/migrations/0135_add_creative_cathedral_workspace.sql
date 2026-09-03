CREATE TABLE IF NOT EXISTS `creative_cathedral_sessions` (
  `id` varchar(64) NOT NULL,
  `creator_id` int NOT NULL,
  `song_id` int NULL,
  `stage` enum('prepare','review','registered','published') NOT NULL DEFAULT 'prepare',
  `draft_snapshot_json` json NULL,
  `ui_state_json` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cc_sessions_creator_updated_idx` (`creator_id`, `updated_at`),
  KEY `cc_sessions_song_idx` (`song_id`)
);

CREATE TABLE IF NOT EXISTS `creative_cathedral_suggestions` (
  `id` varchar(64) NOT NULL,
  `session_id` varchar(64) NOT NULL,
  `creator_id` int NOT NULL,
  `song_id` int NULL,
  `kind` enum('media_facts') NOT NULL DEFAULT 'media_facts',
  `proposal_json` json NOT NULL,
  `evidence_json` json NULL,
  `source_manifest_json` json NOT NULL,
  `model_ref` varchar(128) NULL,
  `status` enum('proposed','applied_to_form','dismissed','expired') NOT NULL DEFAULT 'proposed',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `cc_suggestions_session_created_idx` (`session_id`, `created_at`),
  KEY `cc_suggestions_creator_status_idx` (`creator_id`, `status`),
  KEY `cc_suggestions_song_idx` (`song_id`)
);

CREATE TABLE IF NOT EXISTS `creative_cathedral_decisions` (
  `id` varchar(64) NOT NULL,
  `session_id` varchar(64) NOT NULL,
  `suggestion_id` varchar(64) NULL,
  `creator_id` int NOT NULL,
  `decision` enum('consent_context','apply_to_form','edit_first','dismiss') NOT NULL,
  `target_fields_json` json NULL,
  `context_manifest_hash` varchar(64) NULL,
  `occurred_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cc_decisions_session_occurred_idx` (`session_id`, `occurred_at`),
  KEY `cc_decisions_suggestion_idx` (`suggestion_id`),
  KEY `cc_decisions_creator_occurred_idx` (`creator_id`, `occurred_at`)
);

