# Lesson — Batch Retries Need Creator-Scoped Evidence, Not WID Lookup

**Date:** 2026-09-15  
**Category:** Registry stewardship and creator custody  
**Checkpoint:** Pending

## Problem

The legacy Batch Upload flow can receive a pre-uploaded URL, client hash, and WID-shaped metadata, but it does not preserve a durable creator-private preparation record. A retry that selects an existing Work solely through a WID or first matching row could convert known duplicate-WID history into an incorrect ownership decision.

## Solution

Use server-attested source/stored byte evidence and a creator-scoped Batch operation as the preparation boundary. Reconcile first against exact owner-plus-full-source-hash canonical Work candidates; treat multiple candidates as explicit ambiguity; consult verified private receipts only as secondary recovery evidence. Return collection readiness separately from collection creation.

## Files

| File | Purpose |
|---|---|
| `server/domains/batchUpload/service.ts` | Creator-scoped operation, receipt, reconciliation, and readiness services. |
| `server/routers/batchUpload.ts` | Protected H2 tRPC surface. |
| `server/routes/uploadRoute.ts` | Authenticated server-evidence receipt binder. |
| `server/routers/index.ts` | Dedicated root namespace registration. |
| `server/tests/batchUploadServices.contract.test.ts` | Reconciliation and no-registration boundary coverage. |

## Rule

> **A retry may recover a creator’s exact evidence. It may never infer WID ownership or register a Work by convenience.**

## Score Delta

The refinement baseline remains **70/100**. H2 strengthens the Registry and Stewardship layers by separating recoverable preparation evidence from immutable Work, WID, collection, and provenance authority.

## Tags

`batch-upload`, `storage-evidence`, `idempotency`, `creator-custody`, `wid-ambiguity`, `collection-readiness`, `private-receipts`
