# ADR — Drizzle Migration Reconciliation Baseline

**Status:** Accepted  
**Date:** 2026-10-01  
**Decision scope:** Registry, stewardship, and legacy reproducibility

## Context

The live Living Nexus database contains schema additions represented in `drizzle/schema.ts`, but the Drizzle journal stopped at `0133_ambiguous_exodus`. SQL files numbered `0134` through `0142` remained outside the journal, including two competing `0134` files. A clean environment running only the journal could not reconstruct the current schema; adding the orphaned files one by one to the journal would instead replay already-applied DDL against the live database.

This weakens the **Registry**, **Stewardship**, and **Legacy** layers: the database’s actual custody record differs from the repository’s migration record.

## Decision

Create one canonical, generated migration directly from the last trusted Drizzle snapshot (`0133`) to the current schema:

- `0134_reconcile_live_schema.sql`
- `drizzle/meta/0134_snapshot.json`
- a matching `0134_reconcile_live_schema` journal entry

The generated baseline is the only post-`0133` journaled migration. It contains the complete schema delta required to reconstruct the present schema from a clean database.

The unjournaled `0134`–`0142` SQL files are preserved as historical provenance under `drizzle/legacy/untracked-pre-0134/`; they are explicitly excluded from execution and documented as superseded implementation drafts.

For the existing live database, the canonical migration is recorded in `__drizzle_migrations` **only after** its full table, column, and index expectations are verified as already present. This prevents Drizzle from replaying duplicate DDL while making future migration runs monotonic.

## Alternatives rejected

| Alternative | Reason rejected |
|---|---|
| Add each orphaned SQL file to the journal | Duplicate `0134` ordering and unknown partial application would make live replay unsafe. |
| Manually edit the journal around the existing files | Does not produce valid snapshots or a clean, deterministic schema baseline. |
| Leave the files as-is | Preserves a non-reproducible database state and blocks safe publication. |
| Rebuild the live database | Disproportionate and risks creator records; no schema defect warrants destructive intervention. |

## Reconciliation procedure

1. Generate the baseline in an isolated copy of the repository, using deliberate rename choices only where the live schema proves the target column exists.
2. Verify every generated table, column, and index exists in the live database.
3. Archive the legacy orphaned SQL without deleting it.
4. Copy the generated migration, journal entry, and snapshot into the project.
5. Record the generated migration’s SHA-256 and journal timestamp in the existing database ledger, after verification.
6. Verify that `drizzle-kit migrate` is a no-op against the existing database and that all journaled files and snapshots are coherent.
7. Preserve the verification report and add a regression contract that prevents a future unjournaled post-baseline SQL migration.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Generated baseline omits an applied structure | Full live table/column/index comparison before ledger insertion. |
| Existing database replays duplicate DDL | Insert a validated ledger marker first; then confirm migrate is no-op. |
| Historical intent is lost | Archive every orphaned SQL file with hashes and a provenance README. |
| Future migration history splits again | Contract test requires every active journal entry to have its SQL file; the canonical baseline requires a matching snapshot and ledger marker. |

## Historical snapshot caveat

Four early journal entries (`0075`, `0077`, `0078`, and `0081`) lack their original same-number snapshot files. Their immediately subsequent snapshots already contain their resulting structures (`0076`, `0079`, and `0082` respectively). Fabricating replacement snapshots today would misstate their original generation history, so this decision intentionally leaves those historical gaps visible rather than writing false provenance. They do not block current migration generation or application: the canonical `0134` snapshot is complete and verified against the live database.

## Rollback

No creator, Work, WID, or artifact data is changed by this decision. If migration metadata proves invalid before publication, restore the repository’s prior journal and metadata from the immediately preceding checkpoint, and remove only the reconciled ledger marker. Do not alter the live schema.
