# Living Nexus — Release Stabilization: Archive Draft Continuation and PWA Diagnosis

**Date:** 2026-10-21
**Base checkpoint:** `57f0d199082e18aef90642e873fdd41528bf86c0`
**Scope:** Authorized stabilization only: Archive → Continue Draft repair and read-only PWA activation diagnosis.
**Deployment/publication:** **Not performed.**
**Recommendation:** **NO-GO remains in force.**

## Executive outcome

The former P0 Drizzle migration-ledger mismatch remains resolved and independently verified; it is no longer an active release blocker. The Archive → Continue Draft route mismatch was confirmed, repaired locally, and validated without changing a Draft, Work, WID, media record, collection, schema, or authorization rule.

The PWA update issue remains **open**. Current production service-worker state was healthy at the time of inspection, but that does not reproduce or resolve the reported update activation failure. No speculative PWA code change was made.

The resulting local stabilization slice is suitable for checkpointing, **not deployment**. The authenticated creator write journeys and managed-production startup rehearsal remain required release gates.

## Scope and immutable boundaries

This slice did not:

- alter application tables, production data, Draft IDs, Works, WIDs, provenance, HAAI declarations, media, collections, or stored artifacts;
- add a new editor, persistence path, database authority, player, or authentication mechanism;
- issue `SKIP_WAITING`, invoke `registration.update()`, trigger a PWA update, clear caches, post a comment, create a Draft, or perform any creator write;
- deploy, publish, migrate, or modify the production frontend.

The repair reuses the existing `UploadPage` editor, its protected `songs.getMyDraft` query, and the existing OAuth return-path mechanism.

## Slice 1 — Archive → Continue Draft

### Confirmed defect

`ArchivePage` creates the continuation URL:

```text
/upload?editId=<Draft ID>&type=<Draft type>
```

Before this slice, `App.tsx` redirected every `/upload` request to `/manifest`. That discarded the `editId` and type, so the existing owner-authorized Draft hydrator never ran. The prior readiness audit recorded this as a directly observed broken creator path.

The first local repair exposed two adjacent continuation losses during validation:

1. the retired Upload entry initially resolved its query from router state in a way that did not preserve direct browser Draft context reliably; and
2. both `UploadPage` and `ManifestationStudio` removed their query strings while a visitor was still unauthenticated, so an OAuth return could lead to a bare registration page rather than the intended Draft or prefilled registration state.

Each was corrected inside the existing route and page boundaries rather than hidden by a looser test.

### Implemented repair

| File | Change |
| --- | --- |
| `client/src/App.tsx` | Replaced the unconditional `/upload → /manifest` redirect with `UploadEntryRoute`. A valid positive numeric `editId` renders the existing lazy `UploadPage`; all other Upload requests go to canonical Manifestation Studio. |
| `client/src/lib/uploadEntryRoute.ts` | Added a pure resolver. It recognizes only a positive safe-integer `editId`; all other queries remain ordinary registration handoffs and retain their complete query string. |
| `client/src/pages/UploadPage.tsx` | Preserves the exact current `/upload?...` path in the existing sign-in return URL. It postpones query cleanup until the authenticated session exists, allowing the protected owner-only Draft read to receive the original `editId`. |
| `client/src/pages/manifestation-studio/ManifestationStudio.tsx` | Preserves ordinary registration prefill parameters through sign-in and cleans the address bar only after authentication restores the local prefill. |
| `server/tests/archiveDraftResumeRoute.contract.test.ts` | Added six focused regression assertions for Draft identity routing, invalid/ordinary Upload handoff, prefill consumption, guest OAuth return preservation, existing protected hydration, and authenticated-only cleanup. |

No Draft persistence, form-submit, WID, media, or collection code was added or modified.

### Exact authorization and continuity evidence

**Direct guest route, using an actual current Draft:** local preview navigation to:

```text
/upload?editId=4410001&type=audio
```

remained at that exact URL and rendered the existing UploadPage sign-in gate. Its existing OAuth link encoded the exact return path:

```text
/upload?editId=4410001&type=audio
```

This verifies that a guest cannot see or alter the Draft and that sign-in returns to the intended continuation rather than bare `/upload` or `/manifest`.

**Protected owner retrieval, configured database, read-only:** the existing `songs.getMyDraft` tRPC procedure was called directly with two authenticated contexts against the configured database.

| Principal | Requested Draft | Result |
| --- | ---: | --- |
| Owner `userId=1` | `4410001` | Returned canonical Draft `4410001`, title **Jacob Ross Voice test**, status `Draft` |
| Different creator `userId=780095` | `4410001` | Returned `null` |

The procedure’s existing SQL condition is `songs.id = input.id AND songs.userId = ctx.user.id` (`server/routers/songs.ts:588-599`). The direct validation was query-only and produced no database write. It proves the server’s actual owner boundary for the exact resumed Draft.

**Hydration boundary:** after an authenticated owner context exists, `UploadPage` enables `songs.getMyDraft` for the parsed `editId` and retains the established one-time hydration path. It restores the Draft’s title, genre, BPM, key, album/release information, lyrics, disclosure and consent fields, presentation settings, captions/descriptions, content type, HAAI declaration, and credits from the canonical Draft response (`client/src/pages/UploadPage.tsx:235-340`). The repair does not duplicate any of that logic.

**Ordinary Upload handoff:** a guest navigation to:

```text
/upload?type=lyrics&title=Living%20Testimony
```

reached:

```text
/manifest?type=lyrics&title=Living%20Testimony
```

Both visible sign-in controls carried that same exact manifest return path. Manifestation Studio consumes the type and title into its existing entry/prefill state and cleans the address bar only after authentication (`client/src/pages/manifestation-studio/ManifestationStudio.tsx:308-336`).

### Validation

| Validation | Result |
| --- | --- |
| Focused Archive continuation contract | **6/6 passed** |
| Focused routing/Draft policy/PWA contract set | **19/19 passed** |
| TypeScript | `pnpm check` passed |
| Full regression suite | **147 test files passed; 909 tests passed; 1 intentional skip** |
| Production build | `pnpm build` passed |
| Whitespace/integrity | `git diff --check` passed |
| Direct guest browser route | Exact Draft ID/type URL retained; existing sign-in gate and exact return path observed |
| Real protected query | Owner returns Draft; different creator returns `null`; read-only only |

The production build retained pre-existing bundle-size warnings for chunks larger than 500 kB and the existing `file-type` `eval` warning. Neither is a new failure from this slice.

### Acceptance boundary and residual risk

This proves the route, OAuth continuity, and database-enforced owner read boundary locally. It does **not** perform a live creator write or authenticate an owner through the patched local browser UI, because that would require a real user session and must not create or alter production records without a controlled acceptance authorization.

Required later canary, after the checkpoint is safely available in staging or a controlled environment:

1. owner opens Archive → Continue Draft;
2. owner confirms the correct title/media/form fields load;
3. owner makes **no production write** unless an explicit test-data plan authorizes it;
4. a different creator reaches the same URL and sees no private Draft data; and
5. normal `/upload` with prefill confirms the intended Manifestation Studio state after OAuth.

## Slice 2 — PWA activation diagnosis

### Prior confirmed behavior

The reported update failure is still tied to the page’s eight-second `activation_timeout` path: a waiting worker receives `SKIP_WAITING`, but the page does not see the expected `controllerchange` before the timer. The worker-side cause remained unproven before this slice. The earlier controlled Chromium experiment ruled out the specific theory that a slow activation `waitUntil()` alone necessarily delays controller change.

See `docs/lnls/audits/PWA-UPDATE-TIMEOUT-FOLLOWUP-2026-10-20.md:8-31`.

### Read-only runtime observations in this slice

The production service worker was inspected only passively. No update was requested or activated.

| Observation | Result |
| --- | --- |
| `navigator.serviceWorker.controller` | Present; state `activated`; script `https://www.livingnexus.org/sw.js` |
| Registration state | Active worker `activated`; `waiting = null`; `installing = null`; scope `https://www.livingnexus.org/` |
| Current caches | `ln-1792599719123-static`, `ln-1792599719123-dynamic`, `ln-1792599719123-audio` |
| Passive `controllerchange` observation | No event during the one-second observation window, as expected with no pending update |
| Worker version protocol | Existing `GET_VERSION` client-message protocol replied `SW_VERSION: ln-1792599719123` in approximately 2 ms |
| Worker errors during observation | No worker-console/cache-operation error was exposed by the available inspection path |

An initial MessageChannel probe timed out because this worker’s implementation replies to the page client (`event.source.postMessage`) rather than the supplied message port. Retrying through the actual client message event returned the expected version immediately. This was a diagnostic-protocol observation, **not** an update activation failure.

### Conclusion

**Status: still BROKEN / root cause unknown.** A healthy no-update snapshot proves only that the active worker can respond to a read-only version message. It does not reproduce, diagnose, or fix the listener-reported waiting-worker activation failure.

No PWA code was changed. The smallest evidence-supported next action is **not a corrective patch**: at the next real recurrence, capture the registration’s `waiting`, `installing`, and `active` worker states immediately before and after the user’s update action; record `controllerchange`; and collect worker-console/cache-operation errors in a browser that exposes worker inspection. Only evidence that distinguishes non-activation, redundant-worker transition, or activation failure can justify a minimal behavior or diagnostic change.

## Reconciled migration status

The former P0 migration-ledger blocker remains **resolved** and is removed from the active deployment blocker list. The two authorized records for `0140_outgoing_ink` and `0141_shiny_betty_brant` are present in correct order; schema parity, backup/restore evidence, protected counts, and a Drizzle no-op postflight were previously verified. See `docs/lnls/audits/P0-DEPLOYMENT-RECOVERY-STAGE-1-EXECUTION-2026-10-21.md:8-75`.

This stabilization work did not modify that ledger, schema, or backup.

## Release-gate reassessment

| Gate | Current status | Evidence / required action |
| --- | --- | --- |
| Stage 1 schema/Drizzle ledger | **Resolved** | Reconciled and independently verified in the authorized prior recovery execution. |
| Archive → Continue Draft route | **Locally fixed and validated; not deployed** | Route, guest OAuth continuity, protected owner read, focused/full contracts, TypeScript, and build pass. Must be checkpointed and later staged/accepted. |
| PWA activation failure | **Open P1 blocker** | Healthy passive snapshot does not reproduce or explain the real failure. Obtain worker lifecycle evidence before any code change. |
| Authenticated creator write journeys | **Untested release gate** | No production create/edit/reorder/archive/HAAI/manifest write was authorized. Run controlled staging canaries. |
| Global Player comment A → B → submit | **Untested release gate** | Existing contracts pass; controlled authenticated test requires a separate test-data/moderation plan. |
| Provenance Player owner handoff and withdrawal | **Untested release gate** | Adapter/gateway contracts pass; live copy/import/withdrawal behavior still needs controlled acceptance. |
| Creator archive binary export | **Untested release gate** | Page and server route exist; an actual export was not started. |
| Managed-production startup rehearsal | **Not authorized / untested** | Requires separately approved operating scope, safeguards, and rollback plan. |

## Final recommendation

**NO-GO for deployment and public-launch readiness.**

The migration blocker is resolved and the Archive continuation defect is now locally repaired with stronger evidence than a route-only redirect check. The correct next authorization is:

1. create a checkpoint for this bounded stabilization slice;
2. keep deployment suspended;
3. conduct an evidence-only PWA recurrence capture when the failure naturally occurs or in an approved controlled worker test; and
4. authorize a bounded staging acceptance plan for authenticated creator journeys and startup rehearsal.

No deployment, publication, migration, WID issuance, AI activation, or new feature work is authorized by this report.

## Evidence register

- Route implementation: `client/src/App.tsx:34-59, 345-350`; `client/src/lib/uploadEntryRoute.ts:1-28`.
- Existing Draft owner boundary: `server/routers/songs.ts:588-599`.
- Existing Draft parsing/hydration and OAuth preservation: `client/src/pages/UploadPage.tsx:235-340, 881-897`.
- Manifest prefill and OAuth preservation: `client/src/pages/manifestation-studio/ManifestationStudio.tsx:308-336, 387-410`.
- Archive source URL: `client/src/pages/ArchivePage.tsx:1228-1265`.
- New regression coverage: `server/tests/archiveDraftResumeRoute.contract.test.ts:1-72`.
- PWA implementation: `client/src/main.tsx:154-257`; `client/public/sw.js`; `server/tests/pwaUpdateHandshake.contract.test.ts`.
- PWA prior diagnosis: `docs/lnls/audits/PWA-UPDATE-TIMEOUT-FOLLOWUP-2026-10-20.md:8-31`.
- Migration reconciliation execution: `docs/lnls/audits/P0-DEPLOYMENT-RECOVERY-STAGE-1-EXECUTION-2026-10-21.md:8-75`.
- Final validation in this slice: `pnpm check`; focused 19/19; `pnpm test` 147 files / 909 passed, 1 skipped; `pnpm build`; `git diff --check`.
