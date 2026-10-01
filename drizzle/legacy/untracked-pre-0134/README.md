# Preserved Pre-Baseline Migration Provenance

These SQL files were present in the repository but were never recorded in Drizzle’s active journal or accompanied by matching snapshots. They must **not** be executed directly.

On 2026-10-01, the active migration lineage was reconciled by generating `../../0134_reconcile_live_schema.sql` from the trusted `0133` snapshot to the current Drizzle schema. The generated migration and `meta/0134_snapshot.json` are the canonical reproducible continuation. The live database was verified to already contain every table, column, and index represented by that canonical migration before its ledger record was added.

## Why these files are archived

- There are two incompatible files beginning with `0134`.
- Some schema changes had been applied through paths outside the Drizzle journal.
- Reintroducing any of these files into the active journal would risk duplicate DDL on an already-migrated database.

## Provenance manifest

| File | SHA-256 |
|---|---|
| `0134_add_creator_release_date.sql` | recorded in repository history |
| `0134_batch_upload_integrity_foundation.sql` | `8dc771424b462b4d1bd667155566a7a6fc4e521659a86658f3759256321db75a` |
| `0134_creator_guide_slots_growth.sql` | `ea0ff432f72e03bf029db08d8a0cb3db6779254756ae7f83b93d8f3cc166d13b` |
| `0135_add_creative_cathedral_workspace.sql` | recorded in repository history |
| `0135_pna_diary_archives.sql` | `c853f2d81f054453e33fd4d221641c259d880cfa8e49529cf07e95b1b8ff3e7b` |
| `0136_music_draft_agentic_foundation.sql` | `81dfafbfb861ebf8bc2586d5cf4e6971392e6971d76c768df04b5ef93009a181` |
| `0137_pna_working_threads.sql` | `dedfa8498d193b71a83d8f115a4a91538913dd1f743a1b18642230bfe7f2628e` |
| `0138_registry_api_r1a_credentials.sql` | `864df27791f944dab48b474cc7a916f17706dee9c3c280c4d38f0e3e55dfd9df` |
| `0139_core_ingestion_commission_i1.sql` | `f3b775a3728dda4c439a3402d8135590e2962bd52fffbb7c3211a62f5bbe6a92` |
| `0140_core_ingestion_review_i2.sql` | `9bcc9a295f8c2ee524f8290f1d4c34e0bdacc13c8eb2b3369682566decb596b5` |
| `0141_core_ingestion_scheduler_control_plane.sql` | `ceca9d3700e0e6b0de0bfb0f4d323346a8a1e4eed3cfa40985b67b198e4577e7` |
| `0142_external_display_authorization.sql` | `84a6df8473c4cba1b9b70bd35b92caddff79e07fab42ce92d3e773a77d2cad56` |

The original files remain available for historical inspection. The canonical baseline, rather than these drafts, governs all future Drizzle migrations.
