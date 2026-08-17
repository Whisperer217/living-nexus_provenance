# Core Ingestion and Registry Integrity Report

**Date:** 17 August 2026  
**Scope:** Living Nexus music registration, batch registration, Registry navigation, metadata/artwork/lyrics/tone/waveform/WID persistence, and the LN visual worker.  
**Boundary:** This is an implementation and runtime report, not legal advice. It makes no ownership or legal-validity conclusion about any creator declaration or WID.

> **Mission result:** The Core contracts are materially stronger after the repair set, but the public frontend delivery and scheduled-worker activation remain blocked outside the application logic. No existing song, WID, creator record, asset, payment, or legacy route was deleted or modified during this audit.

## 1. What Was Completed

| Completed correction | Evidence and result |
|---|---|
| Batch-route crash repair | The signed-out `/batch-upload` gate was moved below all hooks, eliminating the React hook-order condition that produced error #300. The development preview now renders the intended sign-in gate. [1] |
| Registry-entry convergence | The desktop Left Rail **Register** and Top Bar **Register Work** controls now both resolve to canonical `/manifest`; signed-out users receive an OAuth return path to `/manifest`. [2] [3] |
| Single-track lyrics provenance parity | `songs.upload` now issues and persists an owner-bound **WID-LYR**, lyrics hash, file name, and timestamp whenever lyrics are supplied—matching the batch contract. Existing works were not backfilled or changed. [4] |
| Durable worker code path | The prior in-process visual worker interval was removed. Queue recovery remains startup-only; `/api/scheduled/visual-queue` is scheduler-authenticated and atomically claims jobs before processing. [5] [6] |
| Managed worker registration | The project now has enabled job `ln-visual-queue` (one-minute cadence) targeting `/api/scheduled/visual-queue`. Its execution history is still empty; activation is unresolved. [7] |
| Regression and build validation | Focused Core contract: 4/4 passed. Full regression: 64 test files passed, 1 skipped; 469 tests passed, 1 skipped. TypeScript and production build passed. [8] |

## 2. Current Canonical Music Paths

| Creator action | Canonical route and procedure | Current behavior | Status |
|---|---|---|---|
| Register one track | `/manifest` → `MusicEnvironment` → `/api/upload-file` → `songs.upload` | Extracts embedded track metadata, cover art, and lyrics; creates a client-side music WID/signature, tone profile, harmonic signature, and waveform; persists the song. Draft bypasses public-profile/cover readiness. Publish requires a bound visual and witness-ready creator profile. [9] [4] | **Working in source and preview** |
| Register a batch/album | `/batch-upload` → `songs.batchUpload` | Accepts up to 50 pre-uploaded tracks; defaults all tracks to **Draft**; creates WID-LYR where lyrics are supplied; links a collection WID-ALB; enqueues visual work. [10] | **Working in source; preview guest gate verified** |
| Publish a Draft | `songs.updateStatus` | Ownership-scoped status transition; Published path enqueues visual processing and creates a witness-feed event. [4] | **Working in source** |
| Verify work | `/song/:id`, `songs.verifyWid` | The work page is the canonical public work surface; legacy `/track/:id` is retained as redirect compatibility. [11] | **Working** |
| Register from Left Rail | Left Rail **Register** → `/manifest` | No longer opens an alternative drawer-only intake. [2] | **Repaired** |
| Register from Top Bar | Top Bar **Register Work** → `/manifest` | No longer uses a transient competing upload route. [3] | **Repaired** |

## 3. Metadata and Persistence Status

The active Core path does pull and carry embedded metadata, cover art, and lyrics into the registration workflow. Metadata extraction takes place before the canonical Music Environment receives the selected file; S3 pre-upload is the preferred asset handoff. The server receives metadata, creator attestation, WID/signature facts, participation axes, tone, waveform, visual lineage, and the asset URLs before making the song record. [9] [4]

Read-only aggregate database inspection confirms **792** song records: **636 Published**, **2 Draft**, **6 Unlisted**, and **148 Deleted**. Of those records, **778** have audio, **784** a cover, **790** a music WID, **357** lyrics, and **8** each a waveform and tone profile. The low waveform/tone count is a **historical data-completeness finding**, not proof that the repaired current registration contract omits those fields. No retroactive enrichment was run. [12]

## 4. Working, Broken, and Incomplete

| Classification | Item | Evidence-based status | Required next action |
|---|---|---|---|
| **Working** | Single music Draft save and Publish contract | Current source sends the full music payload and enforces publisher readiness only for Published status. [4] [9] | User-owned authenticated smoke: create or resume a real Draft, then explicitly Publish only when ready. |
| **Working** | Batch Draft-default and WID-ALB/WID-LYR persistence contract | The server sets Draft by default, links the collection, and creates lyrics WIDs. [10] | User-owned authenticated batch smoke with a real album only if desired. |
| **Working** | Canonical Registry entry contract | Both primary visible Register controls now route to `/manifest`; legacy intake is not a second primary architecture. [2] [3] | Verify on public frontend after delivery mismatch is resolved. |
| **Working** | Historical visual queue completion | The queue table reports **4,884 complete** jobs. [12] | Retain as evidence that queue processing has worked historically. |
| **Broken — delivery** | Public Batch Upload still crashes | After checkpoint `5a2b6308`, development preview is repaired, but all public hosts return the old HTML entry bundle `index-XaSH9KYH.js`, which loads old `BatchUploadPage-D0niIpcy.js` and reproduces React #300. The new chunk `BatchUploadPage-CKKZfV7d.js` is present but not selected by the public entry manifest. [13] | Reconcile managed static-entry deployment/CDN manifest. Do **not** alter the batch component again; source and preview are already correct. |
| **Incomplete — worker activation** | Managed LN queue job has no recorded run | Job exists and is enabled, yet zero executions were recorded over two full one-minute observation windows. The published API callback itself rejects an anonymous probe with HTTP 403, confirming its protected route is reachable. [7] [14] | Resolve scheduler dispatch/platform activation before claiming persistent worker operation. |
| **Incomplete — historical enrichment** | Older works lack tone/waveform/lyrics completeness | Existing database records predate the current registration contract and are not uniformly enriched. [12] | Plan a separate, creator-safe backfill commission; do not infer or fabricate lyrics/tone. |
| **Incomplete — authenticated e2e** | Live registered-song mutation tests | The agent did not create a creator-owned song, batch, Draft, or publication during audit. | Keeper-owned smoke only. |

## 5. Competing and Legacy Architecture Classification

| Path or mechanism | Classification | Reason | Safe disposition |
|---|---|---|---|
| `/manifest` + `songs.upload` | **Retain: canonical** | Music-first registration contract and full provenance surface. | Keep as the sole primary Register destination. |
| `/batch-upload` + `songs.batchUpload` | **Retain: subordinate** | Album-scale capability with Draft-first custody and collection provenance. | Keep; expose only as an intentional batch route, not a competing primary Register button. |
| `/upload`, `/new-manifestation` | **Migrate: existing redirects** | Historical entry points already converge to `/manifest`. [11] | Retain redirects until usage/dependency evidence supports retirement. |
| `/track/:id`, `/songs/:id` | **Migrate: existing work compatibility** | Legacy work URLs converge on `/song/:id`. [11] | Retain redirects; do not delete without traffic/dependency evidence. |
| `/dashboard` | **Migrate: existing management compatibility** | Converges on `/manage`. [11] | Retain redirect. |
| S3 pre-upload handoff | **Retain: preferred** | Keeps binary transfer out of tRPC payloads and aligns with production storage. [4] | Preserve. |
| Base64 upload fallback | **Replace: staged** | It is compatibility support, not the desired persistent Core path; direct S3 flow is already preferred. [4] | Measure callers, deprecate visibly, then remove only with a rollback path. |
| In-process visual queue interval | **Replace: completed in source** | Managed processes can restart/hibernate and cannot be the durable worker authority. [5] | Use the scheduler callback after dispatch activation is proven. |
| Audio replacement/version archive | **Retain: custody safety** | Existing replacement path preserves archival context rather than silently overwriting source. [4] | Keep. |

## 6. LN Worker Recommendation

The correct durable pattern is now **event-driven queue + managed scheduler**, not a permanently running Express timer. Registration enqueues only a database job after persistence. The scheduler invokes the protected queue endpoint once per minute; a handler atomically claims a pending job and processes no more than the configured batch. Restart recovery returns abandoned `processing` jobs to a retryable state.

The worker should eventually own only deterministic, consent-safe post-ingestion work: derivative visual processing, waveform generation where the original audio is available, metadata normalization from explicit embedded fields, and source-derived lyrics extraction only when the file/creator provides them. It must never invent creator facts, lyrics, authorship, WIDs, or public status. Publishing remains creator-confirmed.

## 7. Immediate Decision and Verification Queue

The **application-code repair is complete and published**, but the site cannot be called fully repaired until the static-entry delivery mismatch and scheduler dispatch are fixed. The next operational action is to reconcile the public frontend deployment manifest so it selects `index-qva8hhRA.js` (or its next deployment hash), then confirm the `ln-visual-queue` job has at least one authenticated run. After that, the remaining creator-owned smoke is a real single Draft/Publish and optional batch registration.

## References

[1]: ../client/src/pages/BatchUploadPage.tsx "Batch Upload route"
[2]: ../client/src/components/layout/LeftRail.tsx "Left Rail canonical Register action"
[3]: ../client/src/components/layout/TopBar.tsx "Top Bar canonical Register action"
[4]: ../server/routers/songs.ts "Songs upload, batch, publishing, lyrics, and queue contracts"
[5]: ../server/workers/visualQueue.ts "Durable queue processor"
[6]: ../server/routes/visualQueueScheduleRoute.ts "Scheduler-authenticated queue callback"
[7]: ../../todo-yto2wiwz.md "Session ledger: managed LN worker activation"
[8]: ../server/tests/coreIngestionIntegrity.test.ts "Core regression contract"
[9]: ../client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx "Single-track registration surface"
[10]: ../client/src/pages/BatchUploadPage.tsx "Batch registration surface"
[11]: ../client/src/App.tsx "Route declarations and legacy convergence"
[12]: ../../core_ingestion_navigation_audit.json "Read-only schema and aggregate queue/completeness evidence"
[13]: Public runtime observation, `www.livingnexus.org/batch-upload`, 17 August 2026
[14]: Managed scheduler job and protected-callback probe, 17 August 2026
