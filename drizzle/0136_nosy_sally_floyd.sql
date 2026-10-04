CREATE TABLE `pna_action_receipts` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`thread_id` varchar(64),
	`artifact_id` varchar(64),
	`envelope_id` varchar(64),
	`action` enum('attach_context','detach_context','review_artifact','preserve_artifact','discard_artifact') NOT NULL,
	`effect_summary` varchar(500) NOT NULL,
	`non_effect_summary` varchar(500) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pna_action_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pna_artifact_sources` (
	`id` varchar(64) NOT NULL,
	`artifact_id` varchar(64) NOT NULL,
	`context_entry_id` varchar(64),
	`source_kind` varchar(32) NOT NULL,
	`title_snapshot` varchar(255) NOT NULL,
	`locator_snapshot` varchar(500),
	`relation` enum('source','inference_basis','creator_input','reference_image') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pna_artifact_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pna_artifacts` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`thread_id` varchar(64) NOT NULL,
	`origin_message_id` varchar(64),
	`context_envelope_id` varchar(64),
	`context_revision` int,
	`profile_id` varchar(32) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` varchar(500),
	`state` enum('draft','reviewed','preserved_private','discarded') NOT NULL DEFAULT 'draft',
	`payload_json` json NOT NULL,
	`quiver_image_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pna_artifacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `pna_artifacts_origin_message_unique` UNIQUE(`origin_message_id`)
);
--> statement-breakpoint
CREATE TABLE `pna_context_entries` (
	`id` varchar(64) NOT NULL,
	`envelope_id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`source_kind` enum('work','wid','keeper_note','diary','quiver_image') NOT NULL,
	`source_ref` varchar(255) NOT NULL,
	`title_snapshot` varchar(255) NOT NULL,
	`wid_snapshot` varchar(128),
	`visibility` enum('creator_private','creator_approved','public') NOT NULL DEFAULT 'creator_private',
	`state` enum('attached','detached') NOT NULL DEFAULT 'attached',
	`attached_at` timestamp NOT NULL DEFAULT (now()),
	`detached_at` timestamp,
	CONSTRAINT `pna_context_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `pna_context_entries_envelope_source_unique` UNIQUE(`envelope_id`,`source_kind`,`source_ref`)
);
--> statement-breakpoint
CREATE TABLE `pna_context_envelopes` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`thread_id` varchar(64) NOT NULL,
	`revision` int NOT NULL DEFAULT 1,
	`state` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pna_context_envelopes_id` PRIMARY KEY(`id`),
	CONSTRAINT `pna_context_envelopes_user_thread_unique` UNIQUE(`user_id`,`thread_id`)
);
--> statement-breakpoint
CREATE TABLE `pna_context_use_receipts` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`thread_id` varchar(64) NOT NULL,
	`envelope_id` varchar(64) NOT NULL,
	`envelope_revision` int NOT NULL,
	`profile_id` varchar(32) NOT NULL,
	`route` enum('remote') NOT NULL DEFAULT 'remote',
	`disclosure_snapshot` varchar(500) NOT NULL,
	`outcome` enum('prepared','sent','blocked','failed') NOT NULL DEFAULT 'prepared',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `pna_context_use_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pna_profile_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`profile_id` varchar(32) NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`allow_remote_context` boolean NOT NULL DEFAULT false,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pna_profile_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `pna_profile_settings_user_profile_unique` UNIQUE(`user_id`,`profile_id`)
);
--> statement-breakpoint
CREATE INDEX `pna_action_receipts_user_thread_created_idx` ON `pna_action_receipts` (`user_id`,`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pna_action_receipts_artifact_created_idx` ON `pna_action_receipts` (`artifact_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pna_artifact_sources_artifact_created_idx` ON `pna_artifact_sources` (`artifact_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pna_artifacts_user_thread_updated_idx` ON `pna_artifacts` (`user_id`,`thread_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `pna_artifacts_user_state_updated_idx` ON `pna_artifacts` (`user_id`,`state`,`updated_at`);--> statement-breakpoint
CREATE INDEX `pna_context_entries_envelope_state_idx` ON `pna_context_entries` (`envelope_id`,`state`);--> statement-breakpoint
CREATE INDEX `pna_context_entries_user_source_idx` ON `pna_context_entries` (`user_id`,`source_kind`,`source_ref`);--> statement-breakpoint
CREATE INDEX `pna_context_envelopes_user_thread_state_idx` ON `pna_context_envelopes` (`user_id`,`thread_id`,`state`);--> statement-breakpoint
CREATE INDEX `pna_context_use_receipts_user_thread_created_idx` ON `pna_context_use_receipts` (`user_id`,`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pna_context_use_receipts_envelope_revision_idx` ON `pna_context_use_receipts` (`envelope_id`,`envelope_revision`);--> statement-breakpoint
CREATE INDEX `pna_profile_settings_user_updated_idx` ON `pna_profile_settings` (`user_id`,`updated_at`);