# Provenance Assurance Audit — 2026-10-03

**Scope:** Living Nexus canonical Work registration, provenance, editorial mutation, storage evidence, and associated private PNA Context controls.

**Method:** Source-boundary inspection plus the focused Vitest suite listed below. This audit does **not** claim a production deployment, an external legal conclusion, or universal certification of every platform route.

## Result summary

| Requested control | Result | Evidence and scope |
|---|---|---|
| Creator attribution preserved | **PASS** | A canonical Work is owned by `songs.userId`; public projections join creator identity through `users`. Creator export and physical-export tests retain creator identity alongside WID and Work data. |
| Original hash unchanged | **PASS — historical evidence preserved** | Registration records `songs.fileHash`; batch ingestion records distinct source and stored-byte SHA-256 facts. An audio replacement archives the prior `fileHash` in `audioVersions` before the active Work points at the new file and new WID. The active `songs.fileHash` is intentionally replaceable only through the versioning path; the original is preserved as historical evidence, not frozen in the active row. |
| Derived Work labeled | **PASS — labeling present** | `workLineage` persists parent/child Work relationships with bounded types: `version`, `remix`, `remaster`, `sample`, `derivative`, and `translation`. Public lineage reads project parent/child titles and creator handles. |
| AI disclosure recorded | **PASS — creator-declared participation record** | `songs.aiDisclosure` is bounded to the Living Nexus participation categories. Prepared registration maps participation to disclosure and carries structured HAAI declaration fields. It is a creator declaration, not an automated legal conclusion or a permanent, append-only attestation. |
| Permissions enforced | **PASS — audited Work mutation scope** | Owner-scoped database writes remain in place. This audit added explicit route-level `FORBIDDEN` checks before status, metadata, lyric, and cover-art mutations, preventing false-success responses and avoiding an unauthorized cover upload before storage processing. PNA Context use remains protected by owner, profile, source, and revision checks. |
| Unauthorized modification test | **PASS** | Added a caller-level test that a non-owner receives `FORBIDDEN` for both `songs.updateMetadata` and `songs.updateStatus`, and that neither write helper is called. Existing status test fixtures now provide an owned Work explicitly. |
| Regression tests | **PASS for affected assurance coverage; full-suite caveat below** | TypeScript passed. 13 focused files / 96 tests passed. The final full suite has 746 passing tests, 1 skipped test, and 4 historic migration-path contract failures unrelated to this repair. |

## Applied repair

Before this audit, several database helpers already wrote with an owner condition, which prevented a cross-creator row update. However, ordinary calls to `songs.updateMetadata`, `songs.updateStatus`, and `songs.updateLyrics` could still return a success result after a filtered no-op. `uploadCoverArt` could also process and store an asset before discovering the row was not owned by the caller.

The repair adds an explicit canonical Work ownership read before each of these operations:

- `songs.updateStatus`
- `songs.updateMetadata`
- `songs.updateLyrics`
- `songs.uploadCoverArt`

A missing Work or owner mismatch returns `TRPCError({ code: "FORBIDDEN" })` before the write and, for cover artwork, before media processing or storage upload. The existing database-level owner conditions remain as defense in depth.

## Evidence paths

| Control | Relevant implementation | Relevant validation |
|---|---|---|
| Canonical identity, hashes, AI declaration | `drizzle/schema.ts` (`songs`, `audioVersions`, `workEvents`, `workLineage`) | `batchUploadEvidence.contract.test.ts`, `preparedWorkRegistration.test.ts`, `workMetadataContinuity.test.ts` |
| Duplicate and source-hash recognition | `server/domains/registry/lookupExistingWorkByFileHash.ts`, `server/routers/songs.ts` | `workDuplicateLookup.test.ts` |
| Version history and replacement evidence | `server/routers/songs.ts`, `server/utils/db.ts` (`archiveAudioVersion`, `replaceAudioFile`) | `songs.publicationStateIntegrity.test.ts`, `preparedWorkRegistration.test.ts` |
| Lineage label and creator projection | `server/routers/provenance.ts`, `server/utils/db.ts` (`addLineageRelationship`, `getWorkLineage`) | `provenance.test.ts` |
| Work-owner mutation enforcement | `server/routers/songs.ts` | `songs.publicationStateIntegrity.test.ts`, `songs.updateStatus.test.ts` |
| Creator-private context authorization | `server/routers/pnaGovernance.ts`, `server/utils/pnaGovernance.ts`, `server/routers/keeper.ts` | `pnaGovernance.contract.test.ts` |
| Public registry read boundaries | `server/routes/registryApiRoute.ts`, `server/utils/db.ts` | `registryApiR1b.contract.test.ts`, `registryPublicProjection.contract.test.ts` |
| Export identity and access routes | `server/routes/creatorExportRoute.ts`, `server/services/physicalExport.ts` | `creatorExportRoute.test.ts`, `physicalExport.test.ts`, `bulkDownload.test.ts` |

## Important limits and next hardening item

`provenance.addLineage` verifies that the caller owns the **child** Work. It does not currently require a parent-owner acceptance when the claimed parent belongs to another creator. This does not alter the parent Work, but cross-creator lineage is still a high-trust attribution assertion.

> Recommended follow-up: introduce a `proposed → accepted/declined` state for cross-creator lineage edges, show unaccepted relations as a creator assertion rather than canonical shared lineage, and require the parent creator’s acceptance before the relation is presented as jointly confirmed.

This follow-up is not implemented in the audit repair because it changes relationship semantics and requires a dedicated authorization/data-model decision.

## Validation record

```text
pnpm check
PASS

Focused assurance suite
13 files / 96 tests passed

pnpm test
746 passed / 1 skipped / 4 failed
```

The four full-suite failures are all missing historic migration-file paths, each outside the changed mutation paths:

1. `drizzle/0139_core_ingestion_commission_i1.sql`
2. `drizzle/0140_core_ingestion_review_i2.sql`
3. `drizzle/migrations/0135_add_creative_cathedral_workspace.sql`
4. `drizzle/0138_registry_api_r1a_credentials.sql`

No database migration, database write, deployment, publication, WID rewrite, provenance rewrite, or production-state claim was made by this audit.
