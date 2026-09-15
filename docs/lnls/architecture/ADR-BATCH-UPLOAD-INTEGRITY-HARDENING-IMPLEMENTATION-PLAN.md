# ADR — Batch Upload Integrity-Hardening Implementation Plan

**Status:** Approved for design only; implementation requires a separate authorization.  
**Date:** 2026-09-15  
**Decision owner:** Doc / Keeper  
**Scope:** Music Batch Upload current-source restoration only.

## Decision summary

Living Nexus should restore Batch Upload through a **current-source integrity-hardened workflow**, not by applying the supplied historical patch directly. The workflow will create a durable private batch operation before asset submission; verify and record both the creator source bytes and the canonical stored bytes; use owner-plus-full-source-hash reconciliation for every retry; preserve WID ambiguity rather than selecting by a shortened WID; and synthesize a collection only after the independently registered Works have all reached a truthful recoverable state.

> A batch is a coordinated set of independent creator Works. It is never one combined Work, never an implicit overwrite operation, and never authority to infer a WID, creator declaration, testimony, or collection relationship.

This plan strengthens the **Registry**, **Stewardship**, and **Legacy** layers by making the evidence model explicit and retryable. It preserves the existing creator-controlled registration, WID, publication, and Work-event authorities rather than creating a parallel registrar. [1] [2]

## Current-state finding

The current Batch page hashes the locally selected audio bytes and derives `WID-MUS-*` before upload. It then uploads audio through `/api/upload-file`, which removes audio metadata before persisting the transformed buffer and returns only a URL/key. `songs.batchUpload` trusts the client-provided WID/hash, creates Works sequentially, and uses WID-only fallback lookup while linking a collection. [3] [4] [5]

The current path therefore has four integrity gaps: the WID’s source-byte claim is not distinguished from the transformed durable object; a retry can select by a non-unique WID; an interrupted batch can leave independently saved Works without a recoverable collection-finalization record; and the batch metadata model lags current single-Work creator chronology. [3] [4] [5] [6]

| Area | Current behavior | Required future behavior |
|---|---|---|
| Source byte evidence | Browser calculates a SHA-256 and derives a WID from original selected audio bytes. | Preserve it as explicit **creator source evidence**. |
| Durable storage evidence | Audio metadata is stripped before S3 persistence; no persisted-byte digest returns to the client. | Server hashes the exact stored canonical bytes and records the transform/version. |
| Retry/idempotency | Existing query paths can fall back to a WID-only lookup; WID is not globally unique. | Reconcile by creator + full source SHA-256 + batch operation/item receipt; WID is display/provenance only. |
| Collection assembly | Sequential Work creation, then collection creation/linking; an interruption leaves no durable recovery state. | Persist a private batch operation and item receipts; finalize/retry collection synthesis only when every required item is known. |
| Metadata | Batch carries legacy `releaseDate` but not current creator-declared date parity. | Reuse one current music metadata draft contract, including separate Creation Date and Original Release Date. |
| Asset custody | Mutation receives URL/key references with prefix-style assumptions. | Consume server-issued, creator-owned batch asset receipts rather than arbitrary URLs/keys. |

## Architecture decision

### 1. Preserve two byte-evidence statements

The platform must not claim that a WID derived from a creator’s original file is the digest of a normalized/stored object. The initial hardened workflow will therefore retain **two non-interchangeable facts**.

| Evidence field | Source | Meaning | May it derive the existing WID format? |
|---|---|---|---|
| `sourceSha256` | Server computes it from incoming bytes before any audio transformation; client may compare its local digest. | Creator-supplied source-object evidence. | **Yes.** It preserves existing Living Nexus source-witness semantics. |
| `storedArtifactSha256` | Server computes it after metadata stripping, immediately before storage. | Digest of the exact canonical bytes placed in durable storage. | **No.** It is distinct evidence, not a replacement WID. |
| `storageTransformVersion` | Server-controlled fixed identifier, for example `audio-metadata-strip-v1`. | Names the canonicalization applied between source and stored object. | **No.** It explains the relationship without asserting byte identity. |

The server, not the browser, is the attesting party for both recorded values. Before a Work is created, the batch client must compare the returned `sourceSha256` with the locally calculated source hash. Any mismatch stops the item in `evidence_mismatch`; it must not silently retry, issue a new WID, or register a Work.

The existing `songs.fileHash` remains a **legacy-compatible source hash**. The hardening migration adds nullable `storedArtifactHash` and `storageTransformVersion` to `songs` for newly verified Work records only. Existing Works remain explicitly `storage_evidence_unknown`; no historical backfill, file re-download, inferred hash, WID rewrite, or provenance rewrite is authorized. An append-only `storage_artifact_bound` Work event records the two hashes, transform version, receipt ID, and server version for a newly registered Batch Work. [3] [4]

### 2. Use owner-plus-full-hash reconciliation; never WID-only recovery

A WID is a shortened presentation/provenance identifier, and current public data already proves that duplicate WID groups exist. The retry path must not use `getSongByWitnessId`, `.limit(1)`, or a truncated WID to decide whether a creator’s Work exists. [7]

Each Batch item receives an operation-scoped idempotency key and is reconciled in this order.

| Step | Required lookup / decision | Result |
|---|---|---|
| 1 | Find the private item receipt by `operationId + clientCardId` or `operationId + sourceSha256`. | Return its known state; do not repeat completed registration. |
| 2 | Query existing Works by `creatorId + full sourceSha256`. | Zero rows proceeds; one fully matching owned row may recover; more than one row is `SOURCE_HASH_AMBIGUOUS`. |
| 3 | Compare receipt source hash, stored artifact hash, transform version, and intended metadata digest. | Exact match returns the existing owned receipt; any difference is `EVIDENCE_CONFLICT` requiring a new explicit creator decision outside Batch v1. |
| 4 | Query any same WID only to identify and report a public collision. | Return `WID_AMBIGUOUS`/review-needed; never select, update, or link an arbitrary row. |

The existing owner-aware full-file-hash preflight helper is the starting pattern, but the batch implementation must add deterministic multi-row handling and operation-item receipts. It cannot assume the current legacy `songs.fileHash` population is globally unique. [6] [7]

### 3. Add a private, durable batch-operation ledger

Batch Upload needs a private recovery object because a browser/network failure after a Work save is not evidence that the Work failed. The design adds three **additive operational tables**, all creator-scoped and not publicly enumerable.

| Table | Purpose | Immutable / mutable boundary |
|---|---|---|
| `batchUploadOperations` | One creator-owned intent to prepare/register a bounded set of Works and later synthesize a collection. Stores state, metadata snapshot hash, and policy version. | Mutable workflow state; never authoritative creator testimony or WID history. |
| `batchUploadAssets` | Server-issued custody receipt for an uploaded audio/cover object: owner, kind, key, source hash, stored hash, transform version, content type, size, and state. | Asset receipt becomes immutable after verified upload; no arbitrary client URL is accepted. |
| `batchUploadItems` | One card/item receipt with source hash, asset receipt IDs, intended metadata digest, registration state, resulting song ID/WID where created, and failure reason. | State changes are audit-stamped; evidence fields are immutable after verification. |

The operational state machine is intentionally small:

```text
preparing → assets_verified → registering → collection_pending → completed
                     └→ needs_creator_review / failed / cancelled
```

An item may independently progress from `asset_pending` to `asset_verified`, `registered`, `recovered_existing`, `evidence_mismatch`, `ambiguous`, or `failed`. A cancelled operation never deletes a Work or asset. A completed item’s receipt is sufficient to make browser retry and lost-response recovery deterministic.

### 4. Treat collection synthesis as a later, explicit operation phase

The planned collection remains a grouping record, not a substitute for individual Work integrity. The system will create the collection only when every selected item is `registered` or `recovered_existing` and all associated evidence receipts validate. The collection WID is computed from the final ordered item WIDs only at that point.

If a collection write or link fails after Works have already been registered, the operation remains `collection_pending`. The creator sees an honest **Finish album grouping** action that calls a protected finalization procedure. It performs no new Work registration, WID reissue, metadata rewrite, or deletion. Collection finalization is idempotent through the operation receipt; a conflicting existing collection records `collection_conflict` for creator/Keeper review rather than silently re-linking Works.

### 5. Reuse the current music metadata contract

The Batch UI must use a shared `MusicWorkMetadataDraft` input/validation model drawn from the current Music Environment and Edit Work contract rather than copying a smaller manual schema. The initial Batch implementation must carry and validate, per applicable Work: title, selected genres including `Other`, creator-controlled Creation Date, Original Release Date, AI consent/disclosure, origin/testimony, description/caption, lyrics, participation/credits, and the current technical metadata fields supported by the shared contract. System registration time, WID assignment time, and publication time remain read-only system facts and are excluded from creator inputs. [4] [8]

If a field is not supported in the first Batch UI, the page must say so before submission and preserve the Work as Draft; it must never silently omit a creator declaration. The recommended implementation is to extract the shared draft/validation model first, then mount it in a compact per-card detail panel.

### 6. Verify every referenced asset through a receipt

The future `batchUpload.commit` procedure accepts only `batchUploadAssetId` values belonging to the requesting creator and operation. It does not accept a raw `fileUrl`, arbitrary `coverArtUrl`, or manually constructed storage key as proof of custody. The receipt validation checks kind, owner, operation, source/stored hash, expected storage prefix/key, and non-consumed/reusable policy. Album cover and per-Work cover assets follow the same receipt contract; image processing transformations receive their own stored-artifact hash and transform version.

## Implementation stages and authorization boundaries

| Stage | Deliverable | Data effect | Separate approval required? |
|---|---|---|---|
| **H0** | Final schema/migration review against real existing duplicates and storage behavior. | Read-only. | No additional approval beyond this plan. |
| **H1** | Additive schema migration for operation, asset, item receipts and nullable storage-evidence fields; source-only upload endpoint contract plus tests. | Adds empty tables/columns only. No backfill. | **Yes.** |
| **H2** | Protected operation start/upload-receipt/commit/finalize procedures; owner+full-hash reconciliation; shared metadata contract. | Creates records only when a creator deliberately begins a new Batch. | **Yes.** |
| **H3** | Current-source Batch UI port, TypeGateway entry, private recovery cards, and accessibility/mobile validation. | No Work created until creator submits. | **Yes.** |
| **H4** | Controlled authenticated Draft smoke in an authorized environment using creator-owned test files. | Creates durable Draft Work/operation/asset records. | **Yes, explicitly.** |
| **H5** | Checkpoint and separately authorized promotion, followed by deployed route verification. | Public delivery only after validation. | **Yes.** |

No existing historical Work, WID, provenance record, collection, source hash, storage object, or creator declaration may be repaired or backfilled in H1–H3. The batch pathway applies only prospectively to deliberate new Batch operations.

## Proposed migration decision

An **additive migration is required** before Batch Upload is publishable. It must be generated and reviewed through the managed schema workflow, then applied once through the controlled migration tool—not `drizzle-kit push --force` and not a hand-written production rewrite.

| Change | Reason | Legacy posture |
|---|---|---|
| `songs.storedArtifactHash` nullable `varchar(64)` | Retains the server-computed digest of the actual stored object. | Null means unknown; never infer. |
| `songs.storageTransformVersion` nullable `varchar(64)` | Names the canonicalization used before storage. | Null means unknown; never infer. |
| `batchUploadOperations` | Durable creator-scoped recovery/finalization state. | New records only. |
| `batchUploadAssets` | Server-attested storage custody/evidence receipts. | New records only. |
| `batchUploadItems` | Per-card idempotency and truthful partial-result receipts. | New records only. |
| Indexes | Owner/state and operation/item uniqueness; source-hash lookup support. | Do **not** add a global WID uniqueness constraint or backfill legacy data. |

Before H1, a migration preflight must measure duplicate `(userId, fileHash)` values. If present, the new unique constraint belongs only on the operation item/asset receipt model; it must not be forced onto existing `songs` data. The one-owner, one-source-hash policy applies prospectively to new Batch operation items.

## Validation and release matrix

| Layer | Required proof | Passing condition |
|---|---|---|
| Evidence | Local source hash equals server pre-transform source hash; server stored hash equals persisted bytes. | Any mismatch blocks registration and produces no Work. |
| Registry | Existing same owner/full hash recovers only on exact receipt evidence; duplicate WID/same WID-different hash is explicit ambiguity. | No WID-only selection, reissue, or arbitrary update. |
| Custody | Cross-owner, wrong-operation, raw URL/key, expired receipt, and wrong-kind asset references are denied. | Only creator-owned server-issued receipts may be committed. |
| Metadata | Batch preserves current date semantics, `Other`, consent, origin, and supported credits/technical fields. | No silent field loss; no system timestamp becomes creator declaration. |
| Recovery | Simulate lost browser response, item failure after earlier item success, collection-link failure, retry, cancellation, and explicit finalization. | Item/operation status remains truthful; no duplicate Work or implicit deletion. |
| Security | Protected procedures, owner scoping, body/size limits, storage key validation, safe errors, non-content audit. | No raw secret, protected Work, or private testimony leaks. |
| UX | Desktop/mobile ten-card cap, pending cards, receipt/error language, focus order, reduced motion, and clear Draft/Published intent. | Batch progress is legible and every action remains creator-initiated. |
| End-to-end | Authorized Draft-only smoke with creator-owned test assets, then post-restart recovery. | Saved receipt, exact Draft status, controlled retry, and collection finalization work without public publication. |

## Rollback and containment

H1 uses additive tables/nullable columns, so application rollback is to stop rendering/accepting the new batch operation path and retain the receipts for audit. It must not delete persisted operation, asset, item, Work, or collection records. A partially completed operation stays recoverable or is visibly cancelled; a data repair requires a separately governed creator/Keeper process.

If a stored-byte verification defect occurs, the server must stop Batch commit, mark the item `evidence_mismatch`, retain only the private operational error receipt, and preserve the creator’s local card state. It may not issue a substitute WID, change a source hash, overwrite storage, or derive testimony from media.

## Alternatives rejected

| Alternative | Why rejected |
|---|---|
| Apply the archive patch verbatim | It uses WID-only retry selection, does not establish stored-byte evidence, and lacks durable collection recovery. |
| Make WID globally unique now | Current public duplicate WIDs make this destructive and historically false. |
| Hash only browser bytes and call them stored-object proof | Audio normalization strips metadata before storage; the claim would be misleading. |
| Hash only stored bytes and replace existing WID semantics | It would redefine legacy source evidence and risks retroactive inconsistency. |
| Keep all recovery only in browser memory | A refresh, crash, or lost response would erase the operational truth needed for safe reconciliation. |
| Automatically delete partial Works | Deletes creator records to hide operational failure and violates preservation-first custody. |

## Implementation authorization request

This ADR is the requested implementation plan; it authorizes **no code or database change** by itself. The smallest safe next authorization is:

> **Approve H1 — additive Batch Upload evidence and recovery foundation only.** Add the reviewed empty tables/nullable fields, server upload evidence receipt contract, migration, and focused tests. Do not port the full Batch UI, start a Batch operation for any creator, register a Work, issue/reissue a WID, create/link a collection, or publish.

## References

[1]: ./BATCH-UPLOAD-RESTORATION-HANDOFF-REVIEW-2026-09-14.md "Batch Upload restoration handoff review"
[2]: ./REGISTRY-INTEGRITY-DIAGNOSTIC-2026-09-14.md "Registry integrity diagnostic"
[3]: ../../../server/routes/uploadRoute.ts "Current multipart asset relay"
[4]: ../../../client/src/pages/BatchUploadPage.tsx "Current Batch Upload client workflow"
[5]: ../../../server/routers/songs.ts "Current protected Batch Upload mutation"
[6]: ../../../server/domains/registry/lookupExistingWorkByFileHash.ts "Owner-aware existing-Work lookup"
[7]: ./ADR-REGISTRY-DUPLICATE-WID-ADJUDICATION-DESIGN.md "Duplicate-WID adjudication design"
[8]: ../../../client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx "Current music registration metadata workflow"
