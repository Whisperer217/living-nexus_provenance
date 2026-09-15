# Batch Upload Restoration Handoff Review

**Review status:** Read-only assessment complete; implementation and publication are not authorized.  
**Archive:** `living-nexus-batch-upload-restoration-handoff.zip`  
**Archive SHA-256:** `17d111249e4ffc61c1787dcb018596f430e950f276603437c5de9d730b983f33`  
**Declared base:** `58049283dddad5c12d0fd3a71c8ce1e1418e9f69`  
**Current reviewed source:** `d67a0cc1f195e7aab45038ac5bed754d789f5e34`

## Scope and integrity finding

The archive is a bounded source handoff, not a deployment artifact. Its ZIP integrity test completed without error, all eight manifest-declared SHA-256 values match the extracted source, and its three patch preimage blobs match the declared base commit. The raw patch is CRLF-encoded, which causes a literal `git apply --check` failure in this environment; a disposable LF-normalized copy applies cleanly to the stated base. This is a **transport-line-ending issue**, not evidence of an altered patch.

Although the current source is twenty-three commits newer than the declared base, none of the three overlapping patch targets changed between that base and the reviewed source. A clean current-source port is therefore mechanically plausible after normalizing the patch, but it must still be integrated as a reviewed feature—not blindly applied—because Batch Upload writes Works, WIDs, storage references, and collection relationships.

| Handoff surface | Archive change | Current state | Review result |
|---|---|---|---|
| `BatchUploadPage` | 10-Work admission, no partial ready-card submission, file-replacement race guard, per-Work receipts, pending queue reconciliation, failure visibility, per-Work ownership declaration, and collection warning. | Present Batch UI lacks the shared policy, receipt lifecycle, owner declaration, and all-selected-ready gate. | Requires current-source integration. |
| `TypeGateway` | Adds a Music Register link to the existing `/batch-upload` route. | `/batch-upload` is already mounted and appears elsewhere in creator navigation; the primary music gateway has no Batch entry. | Small bounded UI restoration. |
| `songs.batchUpload` | Lowers cap from 50 to 10, validates per-Work witnesses, checks audio-key ownership, adds publish readiness, returns partial receipts/failures, and adds owner-only receipt recovery. | Existing route writes sequentially, accepts up to 50, trusts supplied WIDs/hashes, lacks receipt recovery, and has no partial-failure response model. | Requires substantive server integration and new behavioral tests. |
| Shared policy/lifecycle | Adds `batchUploadPolicy` and `batchQueueLifecycle`, plus two focused tests. | Neither helper nor their focused tests exists. | Add only after the collision and stored-byte guards below are redesigned. |
| Schema, migration, credentials, static assets | None declared. | None required by the archive as supplied. | No migration, secret, or asset blocker from the handoff itself. |

## What the handoff improves

The restoration correctly treats a batch as a **group of independent Works**, not as one combined Work. It preserves a per-Work card, metadata, owner, status, file witness, and WID; uses a collection only as a grouping record; blocks submission while any selected card remains unprepared; and leaves a card pending until a positive, owner-bound saved Work receipt is returned. Those are compatible with Living Nexus’s creator-first and chain-of-record posture.

The server proposal also moves important enforcement from the browser to the protected mutation: maximum count, per-Work witness agreement, audio-key ownership, publication readiness, ownership declaration, and partial-result reporting. It improves over the current all-or-fail sequential loop, which can lose operational clarity once an earlier Work has persisted and a later step fails.

## Publishability blockers

The handoff cannot be published as-is. Two **blocking integrity corrections** are required before its retry and WID logic may be trusted, followed by an explicit decision about durable collection recovery.

| Priority | Evidence | Required correction before publication | Why it matters |
|---|---|---|---|
| **P0 — WID collision-safe idempotency** | The Registry diagnostic established five real public duplicate-WID groups. `songs.witnessId` has a non-unique index; `getSongByWitnessId` uses `.limit(1)`. The handoff’s retry, receipt, and new-Work logic uses that WID-only helper. | Replace WID-only retry lookup with exact **owner + full file hash** reconciliation. Treat a same-WID/different-hash or multi-row result as explicit ambiguity/error; never select an arbitrary Work, overwrite a row, or infer ownership. Keep WID as a displayed/provenance identifier, not as the sole retry key. | A retry can otherwise resolve the wrong historical Work or incorrectly reject/accept a registration when the truncated WID collides. |
| **P0 — Stored-byte witness truth** | Browser WIDs derive from the unmodified file hash. The current `/api/upload-file` route strips audio metadata before persistent storage, returns only URL/key, and does not return a persisted-byte hash. The archive itself states it cannot certify the reported hash after that transformation. | Choose and implement one explicit witness model: **(A)** preserve/upload the exact bytes whose hash receives the WID, or **(B)** compute and return a server-side hash of the stored canonical bytes before deriving/confirming the WID. If original-file hashing is retained, label it as creator-supplied source evidence rather than proof of the transformed storage object. | A cryptographic WID must not silently claim to bind bytes different from the durable stored Work. |
| **P1 — Collection recovery policy** | Work registration and collection creation/linking remain sequential and non-atomic. The handoff reports a collection error, but once saved cards leave the pending queue a retry of only remaining cards cannot rebuild the original group. | Decide between a durable batch-operation/recovery record that can finish or explicitly abandon collection linking, or a clearly accepted partial-capability policy with a deliberate owner recovery action. Do not represent a collection as verified when linking did not complete. | Individual Works may be safely saved while the intended collection is incomplete. The state must be truthful and recoverable. |
| **P1 — Current metadata parity** | Single-Work registration has later creator-controlled fields, including separate Creation Date and Original Release Date. The supplied batch input carries only the legacy `releaseDate` field and lacks current-field parity. | Map current approved single-Work metadata deliberately into batch cards/payloads, including the separate creator-declared historical dates where appropriate, or visibly scope batch registration as a smaller feature before release. Never substitute system timestamps. | Batch must not silently discard creator testimony or reintroduce the historic date-semantics drift. |
| **P1 — Asset custody validation** | The handoff verifies the pre-uploaded **audio** key prefix but accepts cover URLs without equivalent key/ownership validation. | Apply the established creator-owned storage validation to every pre-uploaded asset reference accepted by the mutation, or remove arbitrary externally supplied URL acceptance from the batch path. | Prevents one creator from binding an unverified asset reference to another creator’s Work. |
| **P2 — Capacity and operator clarity** | The proposed initial limit is 10 Works × 200 MB each; uploads are sequential and can still be interrupted. | Establish an operational budget (browser memory, total batch size, request/session duration, and expected mobile behavior), then present truthful progress and retry instructions. | The numerical cap is not a substitute for a survivable interrupted-upload experience. |

## Required validation after an approved current-source integration

The archive’s stated `18 passed` result is useful historical evidence only. It did not include an authenticated database, storage, or deployed-path check. The following gates are required on the current source after the P0/P1 corrections are implemented.

| Gate | Required proof | Safe boundary |
|---|---|---|
| Source contract | `pnpm check`, the supplied policy/queue tests adapted to the final contract, and existing collection/core-ingestion tests. | No creator data required. |
| Mutation behavior | Tests for 10-versus-11 admission, exact owner+hash retry recovery, WID-collision ambiguity, cross-owner audio/cover reference denial, missing/mismatched witness denial, unpublished Draft admission, and Published ownership/visual/readiness denial. | Use controlled test doubles or an explicitly authorized non-production store. |
| Partial-result behavior | Tests for first-Work saved/later-Work failure, lost-response recovery, collection-create/link failure, and truthful `results`/`failures`/collection state. | No deletion, reissue, or silent cleanup. |
| WID/storage integrity | Test the selected stored-byte model end-to-end and assert that the recorded witness matches the declared byte source. | No client-only claim substituted for server evidence. |
| UI and accessibility | Desktop and mobile inspection of gateway entry, ten-card cap, full-batch readiness gate, pending/error/retry cards, result receipts, focus order, and reduced-motion-safe state feedback. | Do not invoke real creator registration during visual-only checks. |
| Authenticated end-to-end smoke | One deliberately authorized, real Draft batch using creator-owned test Works **or** an isolated non-production environment. Verify saved Work receipts, ownership, WIDs, collection state, refresh/retry behavior, and public invisibility of Drafts. | This creates durable records; it requires separate approval and must not use fabricated testimony or delete/reissue records afterward. |
| Release verification | After a separately authorized checkpoint/promotion, verify the deployed route and the protected flow without exposing credentials or protected Work data. | A checkpoint alone is not proof of a live deployment. |

## Recommended implementation sequence

The recommended course is a **current-source restoration with integrity hardening**, not an archive patch apply. First, decide and implement the stored-byte witness model and replace WID-only idempotency with owner-plus-full-hash reconciliation. Second, add the durable batch-operation or explicit collection-recovery policy. Third, port the shared 10-Work policy, queue lifecycle, server partial-result contract, and gateway link while maintaining current metadata parity. Then complete the listed tests and obtain specific approval for an authenticated Draft smoke before any production promotion.

## Explicitly out of scope

This review did not apply the archive, merge source, run archive code, mutate the database, upload media, issue/reissue a WID, change a Registry/provenance record, contact Stripe, alter credentials, or publish. Registry C/B/D holds remain separate. Any real test batch creates durable creator records and therefore requires its own instruction.
