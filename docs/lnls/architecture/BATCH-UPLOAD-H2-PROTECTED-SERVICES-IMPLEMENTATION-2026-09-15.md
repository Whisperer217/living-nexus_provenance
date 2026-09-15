# Batch Upload H2 — Protected Service Foundation

**Status:** Implemented under Doc authorization; H3 UI integration, H4 Draft smoke, and H5 promotion remain separate gates.  
**Scope:** Creator-private Batch preparation and recovery services only.  
**Checkpoint:** Pending

## What H2 Establishes

H2 makes the H1 receipt foundation actionable only through authenticated, creator-scoped server procedures. It adds a `batchUpload` tRPC namespace for private operation creation, inspection, cancellation, source-hash reconciliation, and collection-finalization readiness. It does not use or replace the legacy `songs.batchUpload` registration mutation.

| Capability | H2 behavior | Explicit non-behavior |
|---|---|---|
| Batch operation | Creates a creator-private preparation record with an optional intended metadata digest. | Does not create a Work, WID, collection, or publication. |
| Asset receipt | The authenticated multipart route binds a receipt from the server-produced upload evidence only. | Never accepts a browser-provided storage URL/key as authority. |
| Retry reconciliation | Checks same-creator canonical Work rows by complete source SHA-256 before private receipt history. | Never selects by WID or resolves multiple candidates by query order. |
| Collision response | Returns an explicit `AMBIGUOUS` result with internal candidate receipts/IDs. | Does not select, hide, delete, reissue, or change any collision. |
| Collection support | Returns a private `readyForExplicitFinalization` projection. | Does not create a collection, compute a collection WID, or link a Work. |

## Protected Boundaries

Every H2 procedure uses `protectedProcedure`, and the database lookup includes the authenticated creator ID. The multipart receipt bridge requires all of `batchOperationId`, `batchClientCardId`, and a matching `batchAssetKind`; the receipt is assembled from `result.evidence` produced by the server after storage processing. A missing, closed, or malformed receipt request is returned as a typed non-content response.

> **A completed upload receipt is preparation evidence, not a Work registration, WID issuance, publication, or collection membership decision.**

## Reconciliation Order

1. Normalize and validate a full 64-character SHA-256 source digest.
2. Find canonical candidate Works constrained by the same creator and exact `songs.fileHash`.
3. Return `AMBIGUOUS` if more than one canonical candidate exists; do not choose one.
4. Return a canonical recovery reference if exactly one candidate exists, updating only a same-operation private item receipt when present.
5. Consult verified creator-private audio receipts only when no canonical Work candidate exists.

This order prevents the legacy first-row WID behavior identified in the Registry integrity diagnostic from becoming a Batch retry mechanism.

## Validation and Data-Custody Result

The H1 and H2 focused contract suites passed **10/10**, and TypeScript passed. A bounded post-implementation database check confirmed `0` batch operations, `0` batch assets, and `0` batch items; no Batch action was invoked for validation. H2 did not create or alter a Work, WID, collection, provenance record, creator record, uploaded artifact, or public projection.

## Remaining Gates

| Gate | Required before it starts |
|---|---|
| H3 — private Batch UI | Separate approval for receipt-aware queue, metadata parity, and creator-visible recovery UI. |
| H4 — authenticated Draft smoke | Separate approval to create an intentional test Draft and upload actual selected test media. |
| H5 — managed promotion | Separate approval after H3/H4 acceptance evidence and release review. |

## Rollback

Revert only the H2 source/router/route/test/knowledge-record changes to the prior H1 checkpoint. The H1 receipt schema remains additive and empty; it does not require destructive data rollback. Any later non-empty H2 receipt records must be retained as private operational evidence, not deleted to make a rollback appear clean.
