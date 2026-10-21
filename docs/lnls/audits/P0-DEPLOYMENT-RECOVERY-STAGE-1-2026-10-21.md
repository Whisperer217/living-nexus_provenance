# Living Nexus — P0 Deployment Recovery: Stage 1

**Date:** 2026-10-21
**Scope:** Migration ledger reconciliation preparation only
**Decision:** **The recovery preconditions are now proven, but production remains unreconciled and the platform remains NO-GO for deployment.**

## Current result

The configured database is the Living Nexus managed TiDB database (`7kHkqvMBX9Ci3pQfWTqqQr`), running TiDB Serverless v8.5.3 in MySQL 8.0-compatible mode. The local release source is checkpoint `57f0d199082e18aef90642e873fdd41528bf86c0` on `review/global-player-cinematic-phase1`.

A schema/ledger split was verified:

- The database contains every object declared by Stage 1 migrations `0140_outgoing_ink` and `0141_shiny_betty_brant`.
- All ten expected Stage 1 tables are present. The comparison found no missing or extra columns, type, nullability, default, auto-increment, update-expression, index, or unique-constraint differences. TiDB's `BOOLEAN DEFAULT true` is correctly represented as `TINYINT DEFAULT 1`.
- The Drizzle ledger has 131 records. It contains neither of the two source migration hashes below, even though their resulting schema is already present.
- The exact causal history of how the schema was created without these ledger rows is **not established**. This investigation did not infer or alter history.

| Migration | Journal timestamp | SHA-256 recorded by Drizzle | Schema state |
| --- | ---: | --- | --- |
| `0140_outgoing_ink` | `1792544602036` | `3e3463fbf4ceff7d24809b499b6283548c6e45a99c6e2a27dc18b89192512905` | Present and semantically matched |
| `0141_shiny_betty_brant` | `1792545148622` | `3a62b32e6125b6ee3cd1d69e1c5269a46c3ea5b4b2f09fd04d904533c89717cc` | Present and semantically matched |

The live Stage 1 data is internally consistent: five release families, five Draft Releases, 98 Draft membership rows, and 16 Draft revision rows. The future sealed-edition tables remain empty, as intended while WID-ALB2 signing is deferred. The following orphan checks all returned zero: Draft without family, Draft membership without Draft, Draft membership without Work, Draft revision without Draft, publication without edition, publication event without edition, and WID resource binding without edition.

## Verified preservation backup and restoration rehearsal

A consistent logical backup was made through one read transaction against TiDB. The standard `mysqldump` client was first rejected by TiDB because it issues an unsupported `ROLLBACK TO SAVEPOINT sp`; that incomplete output was removed and is not treated as a backup. The successful controlled exporter used the accepted TiDB transaction API, made no production writes, and captured source DDL plus all rows.

| Item | Result |
| --- | --- |
| Snapshot time | `2026-10-21T17:18:23.032Z` |
| TiDB snapshot timestamp | `469920147841220627` |
| Tables / views / triggers | 157 / 0 / 0 |
| Logical rows | 352,798 |
| Compressed backup size | 6,170,467 bytes |
| SHA-256 | `1f09fb8f1b5a57e84585acaaedafe6dd550dc97042c2f96c93c2085040e7320a` |
| Local validation | `gzip -t` and SHA-256 verification passed |
| Off-sandbox validation | Downloaded the uploaded backup once from private Drive; its SHA-256 exactly matched the local checksum |

The backup, checksum file, and manifest are held in the dedicated private Google Drive folder **Living Nexus — P0 Recovery Backup — 2026-10-21**. No sharing action was performed. The local recovery vault is owner-readable only (`0700` directories and `0600` backup artifacts).

The backup was restored into an isolated, localhost-only MariaDB instance, never connected to production. The restore completed with zero restore-error output. It contained all 157 source tables, no missing or unexpected tables, and no row-count mismatch across any table. Its Stage 1 relationships also passed the seven orphan checks above.

## Reconciliation rehearsal

A second, isolated clone of that restored database was used to rehearse only the proposed ledger repair.

1. Its baseline ledger count was 131.
2. The two exact source hash/timestamp records were inserted into `__drizzle_migrations`, and nothing else was changed.
3. Its ledger count became 133. Draft-family, Draft, membership, and revision counts remained `5 / 5 / 98 / 16`.
4. `pnpm exec drizzle-kit migrate --config drizzle.config.ts` completed successfully against the isolated clone after the two ledger records existed. No new ledger row was added.

This proves the proposed ledger-only repair is compatible with the current local migration set and does not require replaying non-idempotent Stage 1 DDL. It does **not** authorize or perform that write in production.

## Proposed production action — requires new explicit authorization

The proposed repair is a metadata-only reconciliation in `__drizzle_migrations`; it is still a production database write and must be separately approved. Do not run `drizzle-kit migrate` against production as the first action.

### Preconditions immediately before a maintenance-window write

1. Keep feature deployment and schema changes frozen.
2. Reconfirm the database identity and that both expected migration hashes are absent.
3. Re-run the semantic Stage 1 schema comparison and zero-orphan checks. Stop if any object, count, or integrity condition differs materially from this report.
4. Confirm the verified backup checksum and Drive copy remain available.
5. Use one transaction. An operator must inspect each guard result before committing. If any guard fails, issue `ROLLBACK` and stop.

### Exact intended payload

```sql
START TRANSACTION;

-- Guard: both hashes must be absent before any insert.
SELECT hash, created_at
FROM __drizzle_migrations
WHERE hash IN (
  '3e3463fbf4ceff7d24809b499b6283548c6e45a99c6e2a27dc18b89192512905',
  '3a62b32e6125b6ee3cd1d69e1c5269a46c3ea5b4b2f09fd04d904533c89717cc'
);

-- Execute only if the preceding result is empty and the semantic schema check still matches.
INSERT INTO __drizzle_migrations (hash, created_at) VALUES
  ('3e3463fbf4ceff7d24809b499b6283548c6e45a99c6e2a27dc18b89192512905', 1792544602036),
  ('3a62b32e6125b6ee3cd1d69e1c5269a46c3ea5b4b2f09fd04d904533c89717cc', 1792545148622);

-- Guard: exactly the two intended records must now resolve.
SELECT hash, created_at
FROM __drizzle_migrations
WHERE hash IN (
  '3e3463fbf4ceff7d24809b499b6283548c6e45a99c6e2a27dc18b89192512905',
  '3a62b32e6125b6ee3cd1d69e1c5269a46c3ea5b4b2f09fd04d904533c89717cc'
)
ORDER BY created_at;

COMMIT;
```

This payload has no `CREATE`, `ALTER`, `DROP`, `UPDATE`, or application-data statement. It does not change Works, WIDs, media, creator permissions, HAAI declarations, legacy WID-ALB records, Draft IDs, Draft membership, revision snapshots, edition status, or application source.

### Required postflight before any deployment

- Re-run the migration ledger and semantic Stage 1 schema comparison.
- Re-run the zero-orphan checks and record the preserved Stage 1 counts.
- Run `pnpm exec drizzle-kit migrate --config drizzle.config.ts` only as the postflight no-op check, in the approved deployment environment.
- Run the full regression suite, type check, and build against the reconciled staging/production-equivalent environment.
- Perform the separate production-startup rehearsal. The actual managed deployment start command remains to be evidenced; `package.json` defines a migration-running `start` script while the repository Dockerfile invokes Node directly. Do not claim either is the active production path without managed-runtime evidence.

## Rollback and recovery

Before `COMMIT`, `ROLLBACK` returns the transaction to the unreconciled ledger state without touching schema or application data.

After `COMMIT`, removal of exactly these two ledger rows is technically possible but is **not** a repair because it recreates the known schema/ledger split. It may be considered only under a separately approved incident procedure after confirming the rows were wrong. It must never be paired with reapplication of `0140` or `0141` against existing production tables.

If postflight detects data or startup failure, stop deployment. Preserve evidence, keep the production schema unchanged, and restore into a fresh isolated recovery environment from the verified backup to diagnose. A production restore is not authorized by this Stage 1 work.

## Launch and workflow status

| Area | Status after Stage 1 |
| --- | --- |
| Stage 1 schema/data preservation | **VERIFIED** through a full snapshot, isolated restore, count parity, and relationship checks |
| Stage 1 ledger reconciliation rehearsal | **VERIFIED** on an isolated clone only |
| Production ledger reconciliation | **NOT PERFORMED** — explicit production-write authorization is required |
| Deployment / publication / launch readiness | **BLOCKED** until reconciliation postflight and later launch gates pass |
| Archive → Continue Draft repair | **NOT STARTED** — retained as Stage 2 work |
| PWA activation failure reproduction/root cause | **NOT STARTED** — retained as Stage 2 work |
| Authenticated creator write canaries | **NOT STARTED** — retained as Stage 2 work after database safety is established |
| WID-ALB2 keys, sealing, public editions | **DEFERRED** — not part of recovery |

## Exact next authorized action

Authorize a guarded production transaction containing **only the two `__drizzle_migrations` inserts above**, after repeating the stated preconditions in a scheduled maintenance window. The approval must cover this production metadata write specifically. It must not authorize DDL, a new migration, code changes, deployment, publication, or launch.

## Evidence

- Prior launch assessment and original NO-GO: `docs/lnls/audits/FULL-PLATFORM-READINESS-EVALUATION-2026-10-21.md:22-51, 120-169`.
- Local migration source and journal: `drizzle/0140_outgoing_ink.sql:1-104`; `drizzle/0141_shiny_betty_brant.sql:1-73`; `drizzle/meta/_journal.json` entries `140` and `141`.
- Canonical Stage 1 schema declarations: `drizzle/schema.ts:1200-1410`.
- Draft persistence/integrity behavior: `server/db/albumReleases.ts:53-453`.
- Private recovery evidence vault: `/home/ubuntu/.ln-p0-recovery/backup-20261021T1716Z/`; `/home/ubuntu/.ln-p0-recovery/restore-rehearsal-20261021T1718Z/restore-validation.json`; `/home/ubuntu/.ln-p0-recovery/schema-reconciliation-20261021T1718Z/stage1-semantic-comparison.json`; `/home/ubuntu/.ln-p0-recovery/ledger-rehearsal-20261021T1720Z/`.
- Governance: `/home/ubuntu/upload/pasted_content_4.txt:27-33, 53-79`.
