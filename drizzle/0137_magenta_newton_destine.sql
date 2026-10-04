CREATE TABLE `pna_context_use_entries` (
	`id` varchar(64) NOT NULL,
	`receipt_id` varchar(64) NOT NULL,
	`context_entry_id` varchar(64) NOT NULL,
	`source_kind` varchar(32) NOT NULL,
	`source_ref_snapshot` varchar(255) NOT NULL,
	`title_snapshot` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pna_context_use_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `pna_context_use_entries_receipt_entry_unique` UNIQUE(`receipt_id`,`context_entry_id`)
);
--> statement-breakpoint
CREATE INDEX `pna_context_use_entries_receipt_idx` ON `pna_context_use_entries` (`receipt_id`,`created_at`);