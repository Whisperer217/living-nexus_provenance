# Living Nexus — P0 Deployment Recovery: Stage 1 Execution

**Executed:** 2026-10-21
**Authorization applied:** Two-row Drizzle migration-ledger reconciliation only
**Final Stage 1 status:** **RECONCILED AND VERIFIED**
**Overall launch status:** **NO-GO remains in force.** This authorization did not include deployment, publication, additional migrations, or Stage 2 workflow work.

## Authorized scope and preflight result

The production target was reconfirmed as managed TiDB database `7kHkqvMBX9Ci3pQfWTqqQr`, TiDB Serverless `8.0.11-TiDB-v8.5.3-serverless` (MySQL 8.0 compatible).

Immediately before the write, a read-only transaction confirmed all documented preflight guards:

| Guard | Result |
| --- | --- |
| Correct database target | Passed — `7kHkqvMBX9Ci3pQfWTqqQr` |
| `0140_outgoing_ink` source hash absent from ledger | Passed |
| `0141_shiny_betty_brant` source hash absent from ledger | Passed |
| Migration chronology | Passed — prior ledger maximum was `1792080384684`, before both Stage 1 timestamps |
| Stage 1 schema comparison | Passed — all 10 tables and every expected column, type, nullability, default, auto-increment setting, update expression, index, and unique constraint match `0140` and `0141` |
| Stage 1 integrity checks | Passed — seven Draft/edition/binding orphan checks all returned zero |
| Protected counts | Passed — families/drafts/draft tracks/draft revisions: `5 / 5 / 98 / 16`; editions/publications/publication events/bindings: `0 / 0 / 0 / 0` |
| Backup and restore evidence | Passed — verified snapshot checksum, private Drive copy checksum, full isolated restore, count parity, and orphan checks |

The verified backup remains intact. Its SHA-256 is `1f09fb8f1b5a57e84585acaaedafe6dd550dc97042c2f96c93c2085040e7320a`. Its prior isolated restoration completed successfully with all 157 tables and 352,798 logical rows at the snapshot time.

## Transaction result

The first invocation began a transaction but failed on TiDB syntax before either ledger query completed because the local guard script used reserved alias `rows`. Its error handler rolled back. The recorded result contains `insertResults: []`, `committed: false`, and no count or ledger change. This was a guard-script error, not a production schema or data mismatch.

The corrected invocation ran from a new transaction and committed successfully. Its only writes were the two explicitly authorized inserts into `__drizzle_migrations`.

| Migration | Source hash | `created_at` | Inserted ledger ID | Insert result |
| --- | --- | ---: | ---: | --- |
| `0140_outgoing_ink` | `3e3463fbf4ceff7d24809b499b6283548c6e45a99c6e2a27dc18b89192512905` | `1792544602036` | `2309861` | 1 row |
| `0141_shiny_betty_brant` | `3a62b32e6125b6ee3cd1d69e1c5269a46c3ea5b4b2f09fd04d904533c89717cc` | `1792545148622` | `2309862` | 1 row |

### Before / after proof

| Check | Before commit | After commit | Result |
| --- | ---: | ---: | --- |
| Drizzle ledger rows | 131 | 133 | Exactly two added |
| Latest ledger timestamp | `1792080384684` | `1792545148622` | Correctly advances through `0141` |
| Matching Stage 1 records | 0 | 2, in timestamp order | Verified |
| Release families | 5 | 5 | Unchanged |
| Draft Releases | 5 | 5 | Unchanged |
| Draft membership rows | 98 | 98 | Unchanged |
| Draft revision rows | 16 | 16 | Unchanged |
| Future editions / publications / events / bindings | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | Unchanged |

No `CREATE`, `ALTER`, `DROP`, `UPDATE`, or `DELETE` statement was run. No application table other than `__drizzle_migrations` received a write. Works, WIDs, media, creator records, Draft IDs, Draft membership, HAAI declarations, provenance, permissions, legacy WID-ALB records, and stored artifacts were not modified.

## Independent postflight

A separate managed-database read after commit confirmed:

- configured database: `7kHkqvMBX9Ci3pQfWTqqQr`;
- 133 ledger entries;
- 10 Stage 1 tables present;
- both expected migration hashes and timestamps resolve at IDs `2309861` and `2309862` in order;
- all protected counts remain `5 / 5 / 98 / 16 / 0 / 0 / 0 / 0`.

The actual Drizzle command then ran against production:

```text
pnpm exec drizzle-kit migrate --config drizzle.config.ts
```

It exited `0` with `migrations applied successfully`. Ledger count, the two reconciled records, and all protected counts were identical immediately before and after the command. Therefore, **Drizzle detected and performed zero pending migration operations** for the current source migration set.

The command emitted the pre-existing pnpm configuration warning about legacy `pnpm.patchedDependencies` and `pnpm.overrides`. It was not a migration, schema, TypeScript, or application failure.

## Final decision and remaining boundary

The P0 schema/ledger mismatch is resolved. The release/startup hazard caused by Stage 1 schema existing without its corresponding Drizzle ledger records is no longer present for checkpoint `57f0d199082e18aef90642e873fdd41528bf86c0`.

This is **not** a deployment or launch approval. The following remain outside this authorization and must remain frozen:

1. Deployment, publication, and checkpoint creation.
2. Stage 2: Archive → Continue Draft repair, PWA activation-failure diagnosis, and authenticated creator write canaries.
3. Stage 3: full launch-gate validation, including independent production startup rehearsal.
4. WID-ALB2 keys, sealing, public editions, and all other deferred work.

The next authorized work, if requested, is a bounded Stage 2 diagnostic and workflow-validation plan. It must not begin automatically.

## Evidence register

- Original P0 recovery plan and rehearsal: `docs/lnls/audits/P0-DEPLOYMENT-RECOVERY-STAGE-1-2026-10-21.md`.
- Migration sources: `drizzle/0140_outgoing_ink.sql:1-104`; `drizzle/0141_shiny_betty_brant.sql:1-73`; `drizzle/meta/_journal.json` entries 140–141.
- Private preflight record: `/home/ubuntu/.ln-p0-recovery/authorized-preflight-20261021T1726Z/preflight-result.json`.
- Private transaction records: `/home/ubuntu/.ln-p0-recovery/authorized-execution-20261021T1726Z/transaction-result.json` (pre-write guard abort) and `transaction-result-retry.json` (committed reconciliation).
- Private Drizzle no-op postflight: `/home/ubuntu/.ln-p0-recovery/authorized-execution-20261021T1726Z/drizzle-noop-postflight.json`.
- Backup/restore proof: `/home/ubuntu/.ln-p0-recovery/backup-20261021T1716Z/` and `/home/ubuntu/.ln-p0-recovery/restore-rehearsal-20261021T1718Z/restore-validation.json`.
