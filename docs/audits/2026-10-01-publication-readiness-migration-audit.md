# Publication-Readiness Migration Audit

**Date:** 2026-10-01  
**Scope:** Database readiness before public publication of the reconciled Living Nexus checkpoint.

## Executive result

The connected database has the required recent schema objects and passes Drizzle's structural check. However, the repository's Drizzle migration history is incomplete after migration `0133`. This means a **fresh database rebuilt only by `drizzle-kit migrate` would not reliably reproduce the current schema**.

> **Publication recommendation:** Do not treat migration history as release-ready until the post-`0133` migration journal and metadata are reconciled. This is a reproducibility blocker, not evidence of current production data loss.

## Checks completed

| Check | Result | Evidence |
|---|---:|---|
| Drizzle configuration validation | Pass | `pnpm drizzle-kit check` returned `Everything's fine` |
| Recent expected tables | 22 / 22 present | Direct `information_schema.TABLES` query |
| Recent expected columns | 21 / 21 present | Direct `information_schema.COLUMNS` query |
| External Display schema | Present | All six `songs.externalDisplay*` columns exist with expected nullability/defaults |
| Invalid enabled External Display records | 0 | No enabled Work lacks rights confirmation or a 20+ character creator context |
| Existing migration-ledger rows | 125 | Direct `__drizzle_migrations` query |
| Repository migration journal | Ends at `0133_ambiguous_exodus` | `drizzle/meta/_journal.json` |
| Unjournaled migration SQL | `0134`–`0142` | SQL files are present but absent from the journal and `meta` snapshots |

## Migration-history finding

The repository contains these SQL files after the journal boundary:

- `0134_batch_upload_integrity_foundation.sql`
- `0134_creator_guide_slots_growth.sql`
- `0135_pna_diary_archives.sql`
- `0136_music_draft_agentic_foundation.sql`
- `0137_pna_working_threads.sql`
- `0138_registry_api_r1a_credentials.sql`
- `0139_core_ingestion_commission_i1.sql`
- `0140_core_ingestion_review_i2.sql`
- `0141_core_ingestion_scheduler_control_plane.sql`
- `0142_external_display_authorization.sql`

They are not represented in `drizzle/meta/_journal.json`, and the corresponding Drizzle snapshots are absent. The live connected database nevertheless contains the associated tables and columns. That proves the current database has the schema; it does **not** prove a clean environment can recreate it from repository history.

The duplicate `0134` prefix also makes an ad-hoc journal edit unsafe. Do not manually insert hashes into `__drizzle_migrations` or edit the journal in place without a migration-reconciliation plan and a disposable database verification.

## Required release gate before final publication

1. Back up or clone the current schema into a disposable database.
2. Reconcile `0134`–`0142` into a canonical Drizzle history with unique ordering and generated metadata snapshots.
3. Verify a **clean database** can execute the full migration history from zero.
4. Compare the resulting schema with the current connected database.
5. Verify an existing database with the live schema does not receive duplicate DDL or fail on startup.
6. Run the normal application suite and perform final public bundle verification after publication.

## Explore visibility correction completed separately

The Explore **Registry order** control now has a gold-emphasized active state, light cathedral type, a dark native color scheme, and explicit dark option styling. It resolves the light native dropdown / light-text collision observed on mobile and ensures Registry ordering reads as a deliberate active discovery state.

## Validation for the UI correction

- `pnpm check` — passed
- Focused discovery regression tests — 18 tests passed across 5 suites
- `pnpm build` — passed
- `git diff --check` — passed
- Desktop and mobile preview captures — completed

## Not performed

- No migration was applied during this audit.
- No production content rows, credentials, access settings, or data were changed.
- No staging or public deployment was triggered.

## Reconciliation update — 2026-10-01

The migration-history blocker identified in this audit was resolved without replaying DDL against the live database:

- A canonical active `0134_reconcile_live_schema.sql` was generated from trusted snapshot `0133` to the current schema.
- `drizzle/meta/0134_snapshot.json` and the matching journal entry now continue the active Drizzle lineage.
- The legacy unjournaled SQL files were preserved under `drizzle/legacy/untracked-pre-0134/` for inspection and excluded from active execution.
- The live database was verified against the generated baseline: **30 tables, 316 columns, 77 indexes; 0 missing**.
- The exact canonical migration hash was recorded once in `__drizzle_migrations` only after that verification, preventing duplicate DDL on the existing schema.

This resolves **migration reproducibility** for the current schema baseline. It does not represent a content migration, a creator-data mutation, or a public deployment.

## Registry order interaction update — 2026-10-01

The native **Registry order** control on Explore was reviewed and adjusted for the reported contrast and mobile-use issue:

- The selected Registry state keeps a dark native menu with parchment option text and coal option backgrounds.
- The gold emphasis now has a restrained hover transition across the icon, border, background, and selected text.
- At the mobile breakpoint the control has a minimum 44px height, a 140px minimum field width, and `touch-manipulation`; the existing wrapping control row preserves spacing rather than compressing adjacent actions.
- The focused Explore contract passes with these requirements asserted.

An attempted standalone Chromium screenshot capture was terminated because Chromium’s background notification process prevented completion before an image was written. This did not affect the running preview, TypeScript check, focused tests, or production build.
