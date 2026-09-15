# Batch Upload H1 Foundation — Implementation Record

**Status:** Implemented and verified; no user Batch operation has been created.  
**Date:** 2026-09-15  
**Authorization:** Doc-approved “H1 Batch Upload foundation.”  
**Scope:** Additive evidence/custody foundation only.

## Delivered foundation

H1 establishes only the prospective storage-evidence and private recovery substrate described in the approved Batch Upload integrity-hardening plan. It does not enable a new creator-facing Batch workflow, create an operation, upload a file, register a Work, issue or revise a WID, create or link a collection, or publish anything. [1]

| Delivered item | Implementation | Custody consequence |
|---|---|---|
| Dual byte evidence | `createStorageEvidence()` produces separate server-side SHA-256 values for received source bytes and persisted transformed bytes, together with byte counts and a versioned transform identifier. | Existing WID/source semantics are retained; stored-object identity is no longer silently conflated with source evidence. |
| Upload response contract | The authenticated `/api/upload-file` route now returns the evidence object for audio/video, cover, and G-code branches. Audio records `audio-metadata-strip-v1`; covers record `cover-micronize-v1`; untransformed artifacts record `identity-v1`. | The browser may compare facts but cannot attest to or rewrite server-calculated evidence. |
| Prospective Work fields | `songs.storedArtifactHash` and `songs.storageTransformVersion` are nullable. | Existing Works remain unknown; no backfill or WID/provenance rewrite occurred. |
| Private recovery schema | `batchUploadOperations`, `batchUploadAssets`, and `batchUploadItems` were added empty with owner/operation/status indexes and scoped uniqueness. | These are preparation receipts, not canonical WID/provenance records or public resources. |
| Reusable access contract | `mayUseBatchAssetReceipt()` requires a verified receipt for the same creator, operation, and asset kind. | H2 can bind its protected procedures to an explicit owner/operation check instead of accepting a raw URL/key. |

## Migration and database verification

`drizzle-kit generate` could not safely infer this change because its current historical snapshot requests a decision about unrelated legacy `keeper_chat_archives` column names. Rather than answer that unrelated destructive/rename question, the work used the supported `--custom` generator to create `drizzle/0134_batch_upload_integrity_foundation.sql`, then reviewed and applied only its explicitly additive SQL through the managed database workflow. [2]

The SQL has no `DROP`, `DELETE`, `TRUNCATE`, `RENAME`, `MODIFY`, or data-update statement. It added the two nullable Song columns, created the three private receipt tables, and created only their operation/owner/status/evidence indexes. Post-apply verification confirmed all three receipt tables existed with zero rows and both new Song fields were nullable `varchar(64)` values. No existing Work row was touched. [2]

## Validation

| Check | Result |
|---|---|
| Focused H1 byte-evidence/custody/schema contracts | Passed, 4/4. |
| TypeScript | `pnpm check` passed. |
| Production build | `pnpm build` passed; only pre-existing chunk-size guidance was emitted. |
| Full suite | 659 passed, 1 skipped, 1 known unrelated CinematicSplash CSS-marker failure. |
| Refinement | Existing 70/100 baseline retained. |
| Database evidence | New tables empty; new fields present; no source records altered. |
| Diff hygiene | Pending final checkpoint check. |

## Retained gates

H1 is deliberately insufficient for a user to submit a hardened Batch. The following remain separately authorized work:

| Gate | Not implemented in H1 |
|---|---|
| **H2** | Protected operation create, upload-receipt binding, owner-plus-full-hash reconciliation, and collection-finalization services. |
| **H3** | Current-source Batch UI port, registration-gateway entry, and private recovery presentation. |
| **H4** | Explicitly authorized authenticated Draft-only smoke using creator-owned test files. |
| **H5** | Managed promotion and deployed verification. |

## References

[1]: ./ADR-BATCH-UPLOAD-INTEGRITY-HARDENING-IMPLEMENTATION-PLAN.md "Approved Batch Upload integrity-hardening implementation plan"
[2]: ../../../drizzle/0134_batch_upload_integrity_foundation.sql "Reviewed H1 custom additive migration"
