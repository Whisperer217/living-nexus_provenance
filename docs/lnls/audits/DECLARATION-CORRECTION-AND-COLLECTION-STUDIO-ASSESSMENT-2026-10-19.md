# Living Nexus Corrective Maintenance Assessment

**Date:** 2026-10-19  
**Status:** Implemented, locally validated, and saved in a development checkpoint; not published or deployed
**Scope:** Published Work participation-declaration correction and first Archive → Collection Studio navigation reliability

## Decision summary

Two narrow repairs are justified. Neither requires re-registering a Work, replacing a WID, removing historical evidence, rebuilding Collection Studio, adding an audio engine, or changing global cache policy.

1. A creator can presently see the effective Music, Lyrics, and Voice participation values on a published Work, but cannot correct those values through the existing owner edit contract. The correction must be a distinct, owner-authorized, append-only declaration amendment—not a silent metadata overwrite.
2. Collection Studio has a confirmed first-navigation state-order defect: it renders its signed-out gate whenever `user` is temporarily `null`, before `useAuth()` has reported whether authentication is still hydrating. It also has an inadequate primary-query failure surface: no Retry action, no diagnostic reference, and Back loses the selected collection context. These defects plausibly explain a misleading or apparently stuck first arrival, but the exact reported owner-browser “freeze” has **not** been reproduced and must not be attributed to caching, an infinite loop, or a backend fault without further evidence.

## Evidence ledger

| Area | Inspected evidence | Finding | Confidence |
|---|---|---|---|
| Current participation persistence | `drizzle/schema.ts` (`songs.participationMusic`, `participationLyrics`, `participationVoice`) | Effective values already persist as `Human`, `AI`, `Both`, or `None`; no schema column is missing. | High |
| Public Work presentation | `client/src/pages/loop/LoopWorkPage.tsx:612-614` | The active public Work surface renders the three current effective participation axes. | High |
| Owner edit contract | `client/src/components/CreativeDrawer.tsx:44-92` and eight `openEditor(...)` callers | The drawer’s song type and snapshot omit participation axes, so no owner correction UI can hydrate or submit them. Affected callers: Archive, Creator Domain, Creator Profile, Dashboard, Profile, Song Detail, Loop Manage, and Loop Work. | High |
| Existing update route | `server/routers/songs.ts` (`updateMetadata`) and `server/db/songs.ts` (`updateSongMetadata`) | Current owner metadata updates do not accept or persist participation-axis changes. | High |
| WID binding | `shared/preparedWorkRegistration.ts:126-140` | The original WID signature payload includes `participation`; changing a published declaration must therefore not overwrite or reissue the original signed evidence. | High |
| Existing append-only mechanism | `drizzle/schema.ts:2605-2623`; `server/db/songs.ts:1652-1674`; `server/routers/songs.ts:1271-1284` | `workEvents` is already the suitable append-only chronology store. The historical-date correction flow establishes a relevant before/after event precedent. | High |
| Current public history projection | `server/routers/songs.ts:346-360`; `WorkProvenanceHistory.tsx` | Public history deliberately exposes only historical-date events today. A declaration-correction event needs an explicit, read-only projection and presentation. | High |
| Studio server authority | `server/routers/collectionStudio.ts:33-60` | `requireOwnedCollection()` checks ownership server-side before reading a collection and tracks. No client-only authorization workaround is appropriate. | High |
| Studio auth/query ordering | `CollectionStudioPage.tsx:461-472, 692-718`; `useAuth.ts` | The Studio query is gated on `!!user`, but the page checks `!user` before auth-loading state. A returning owner can transiently receive a signed-out screen while `auth.me` is hydrating. | High |
| Studio primary-query recovery | `CollectionStudioPage.tsx:469-472, 700-718` | The primary query has `retry: false`; its generic failure view gives only Back. It lacks Retry, a visible diagnostic reference, and selected-collection-preserving Back navigation. | High |
| Studio version history | `CollectionStudioPage.tsx:362-367` plus the page’s success-only render branch | Version history polls every 10 seconds once mounted, but it is not mounted until the primary collection query has successfully produced `data`. The inherited concern that it starts before primary confirmation is not supported by current source. No redundant deferral change is proposed. | High |
| Player continuity | `CollectionStudioPage.tsx` uses existing `usePlayer().playQueueAt` only for explicit Play actions. | Collection Studio does not instantiate a second playback engine. The repair must not change PlayerContext, active queue, audio element, or playback reset behavior. | High |
| Guest browser control | Sandbox browser, 2026-10-19 | A direct local Studio route displayed the signed-out message and emitted no current browser-console error. This verifies the guest control only, not owner behavior. | Medium |
| Authenticated owner reproduction | Enabled My Browser connector, 2026-10-19 | Browser automation had no active user tab after switching, so an authenticated Archive → Studio interaction, network trace, and console trace could not be completed. | High as a blocker; no conclusion about the reported freeze |

## Root-cause assessment

### Confirmed declaration gap

The platform has the correct raw storage and public display fields but lacks the correction pathway and attestation semantics required for creator trust. Extending ordinary `updateMetadata` to silently overwrite these fields would be incorrect because the initial participation values were included in the WID signing payload. It would make the visible record differ from the historical signed declaration without a public explanation.

The safe model is therefore **current effective declaration + append-only correction event**. The Work keeps its existing WID, file/media references, creator relationships, ownership, and registry record. Its public participation display reflects the current creator-corrected disclosure, while a separate chronological record states that a correction occurred and presents the immediately previous declaration.

### Confirmed Studio reliability defects

Collection Studio has a UI race at first authenticated navigation. `useAuth()` initially has no resolved user; the page renders “Please log in” before it knows whether that means guest or loading. The collection query is also not enabled until the user exists. This creates an avoidable, misleading intermediate state for a returning owner.

A failed collection request is currently a dead-end-like state: the user has no in-place retry, no stable diagnostic identifier to share, and the Back action drops the selected collection from the Archive context. These are real recovery defects independently of the specific reported freeze.

### Not established

The available evidence does **not** establish any of the following:

- Service-worker cache corruption as the cause of the Studio issue.
- An infinite render/query loop.
- Failure inside `requireOwnedCollection()` or the collection database lookup.
- A playback conflict or second audio engine.
- A live-production reproduction of the owner navigation failure.

The current local browser control did not freeze. The owner-browser test is blocked until an active signed-in browser tab is available. The repair will be validated against that path after implementation; it will not be represented as a confirmed root-cause fix before then.

## ADR — Current effective participation corrections with immutable evidence

### Context

Participation disclosure describes who participated in Music, Lyrics, and Voice. It is not a claim that alters creator ownership, authorship, WID identity, files, media, relationships, or the canonical original declaration.

### Decision

Add a dedicated protected mutation, provisionally named `songs.correctParticipationDeclaration`, rather than extending generic `updateMetadata`.

**Input:**

- `songId`: positive integer.
- `participationMusic`, `participationLyrics`, `participationVoice`: each one of `Human | AI | Both | None`.
- `correctionExplanation`: optional, trimmed, bounded creator statement.

**Server responsibilities:**

1. Resolve the Work and prove ownership on the server using the established owner-check pattern.
2. Read the persisted effective declaration before changing anything.
3. Reject invalid values and true no-op corrections.
4. Atomically write the three new effective values and append exactly one `creator_participation_declaration_corrected` Work event.
5. Include the prior and corrected axes, optional explanation, actor identity, and original `witnessId` in the event. The event is a correction record; it is never relabeled as an original declaration.
6. Do not edit `witnessId`, hash, signature, original media, media URLs/keys, Work–collection links, creator relationship, ownership, or WID registration timestamp.

No migration is proposed. The effective axes already exist in `songs`; `workEvents` already holds typed events and JSON event data.

### Alternatives rejected

| Alternative | Reason rejected |
|---|---|
| Silently add axes to `updateMetadata` | Would allow the public declaration to change with no historical correction event despite WID-bound original participation evidence. |
| Re-register the Work or issue a new WID | Breaks creator expectation and unnecessarily changes canonical identity for a disclosure correction. |
| Introduce a new correction table | Duplicates the established append-only Work-event chronology without a demonstrated query or integrity need. |
| Modify or regenerate the original WID signature | Would overwrite historical evidence rather than preserve it. |
| Put correction controls on the public Work | Does not enforce owner authority and confuses current disclosure with public observation. |

### UI and public-history shape

Within the existing Creative Drawer, add an explicit **Edit Declaration** section with three accessible participation selectors, short dimension-specific guidance for `None`, optional explanation, a before/after review, and an explicit confirmation. The confirmation states that the visible current disclosure will change, the correction will be appended to the Work history, and the WID/media/relationships will remain intact.

All eight active Creative Drawer handoffs must forward the current axis values. This is prop parity, not a partial Loop-only solution.

The Work page will retain its current effective participation display. `WorkProvenanceHistory` will add a separate read-only **Participation declaration corrections** treatment sourced from the narrow public history query. It will show correction date, prior declaration, corrected declaration, and an explanation only when the creator supplied one. It must not call a correction the original declaration.

## ADR — Auth-resolved Collection Studio entry and bounded recovery

### Decision

Preserve the existing Collection Studio route, owner-authorized server procedure, and global PlayerContext. Repair page state ordering and failure recovery only.

1. Read `isLoading`/resolved-auth state from `useAuth()`.
2. While authentication is unresolved, show an accessible Studio preparation state rather than a signed-out denial.
3. Enable the primary collection query only after authentication has resolved to a real user and `collectionId` is valid.
4. Render the signed-out gate only after auth resolution confirms there is no user.
5. On primary-query failure, show a readable recovery card containing:
   - the selected collection reference,
   - a deterministic diagnostic reference safe to share,
   - an in-place **Retry** action using the same route/collection ID,
   - Back to `/archive?tab=collections&collection=<id>`.
6. Retain the existing success-only version-history mount. Its polling must not start during the auth or primary-query states.
7. Keep all current `usePlayer()` behavior untouched. Neither arrival, Retry, nor Back may reset or replace active playback.

A request-timeout implementation, if one proves necessary during testing, must use a verified cancellable tRPC/TanStack path. A cosmetic delay or a timer that merely masks a hanging request is explicitly rejected.

### Risks and rollback

The declaration mutation is a public-record change but is bounded and append-only. Its main risk is a partially written correction; use one transactional persistence helper so the effective declaration and correction event commit together or not at all. Rollback is a new, visible correction event restoring the prior effective values—not deletion of historical events.

The Studio repair is client-state only. Its risk is changing access timing. It keeps the server ownership check as authority and can be reverted as a focused frontend change if unexpected. It does not touch audio state.

## Affected scope after approval

**Declaration correction:**

- `server/routers/songs.ts`
- `server/db/songs.ts`
- `client/src/components/CreativeDrawer.tsx`
- Eight existing `openEditor(...)` call sites
- `client/src/components/WorkProvenanceHistory.tsx`
- Public history query and focused Work metadata continuity tests

**Collection Studio reliability:**

- `client/src/pages/CollectionStudioPage.tsx`
- Focused collection/Studio source and behavioral tests
- No `PlayerContext`, router-server ownership, service-worker, schema, or migration change is planned unless new evidence compels it.

## Approval-gated validation plan

The repair is not complete until all of the following are evidenced:

1. TypeScript: `pnpm check`.
2. Focused tests covering owner success, unauthorized rejection, invalid/no-op rejection, `AI → Both`, optional explanation, previous/current event data, current public display, historical correction presentation, WID/hash/media/relationship continuity, and no event deletion.
3. Studio tests for unresolved auth, authenticated loading, failed primary query with Retry, selected-context Back, and version-history non-mount before primary success.
4. `pnpm build`, `git diff --check`, and complete `pnpm test`.
5. Browser testing at desktop and mobile for guest, returning owner, cold/warm Archive → Studio, active/no audio, slow/failing primary request, Retry, and selected collection return. Verify audio continues throughout route arrival and recovery.
6. Run `pnpm refine`; report its measured result without representing baseline debt as repaired.
7. Add a structured refinement lesson and an ADR update only after successful validation. Create no checkpoint or publication unless separately authorized.

## Additional Studio diagnostic finding

The independent Studio audit confirmed one additional source-level condition that belongs in the reproduction checklist, not in the root-cause claim: `OverlayRouteGuard` clears controller-managed overlays and the Work Editor on location changes, but it does not clear Global Player-local visual state. The player can retain its comments portal, cinematic portal, context menu, volume surface, or mobile backdrop across a route transition. Some of those surfaces use full-viewport fixed backdrops above ordinary route content.

This does **not** establish that a player overlay caused the reported first Studio failure. Ordinary compact-player audio must remain active across navigation and does not imply a blocking overlay. During the authenticated browser journey, record the player’s visual state and inspect for a viewport-covering player portal/backdrop before treating this as a repair target.

If—and only if—the condition is reproduced, the least-invasive correction is to close only player-owned transient blocking visuals on route change while retaining the singleton audio element, queue, current track, mini-player, and PlayerContext authority. It does not authorize collapsing the player as a blanket behavior, recreating the provider, pausing audio, or resetting the queue.

## Addendum — Creator reference request and playback correlation

### Creator references in origin testimony

The submitted screenshot identifies an adjacent, valid creator-experience request: a person mentioned in the Music registration Origin / process field should be able to appear as a clickable `@handle` that opens that person’s Creator Domain. The exact current field is free text (`MusicEnvironment.tsx:1232-1238`). The example, `Talking with HMNW and DOC S. Mercer`, has no selected user identity or link data today.

**Answer:** yes, but only after the Work owner deliberately chooses a registered Creator from a suggestion list. Ordinary text, a pasted `@word`, or a display-name match must remain plain text. Auto-linking those forms would permit false attribution, collisions, and silent redirection after a handle change.

This must be a separate, approval-gated follow-on slice rather than part of the two corrective ADRs. It is a creator-reference relationship—not a participation correction, credit, authorship assignment, ownership claim, consent request, witness attestation, or WID event.

The proposed small architecture is:

1. In Origin / process, typing `@` opens bounded registered-Creator suggestions following the existing Work Voices mention pattern.
2. Selecting a suggestion inserts its current `@handle` and records that the specific Creator was selected. Merely typing `@HMNW` or writing a person’s name creates no relation.
3. Persist a new `songOriginMentions` relation: `songId`, durable `mentionedUserId`, `handleAtSelection`, timestamp, and unique `(songId, mentionedUserId)`.
4. The server verifies Work ownership, requires every selected handle to occur as a valid token in the submitted testimony, resolves and deduplicates identities server-side, and updates text/references atomically.
5. Public Work renderers link only server-returned resolved references to the canonical Creator Domain (`/@currentHandle`). If no usable current handle exists, the historic prose stays readable but non-clickable.

No existing Work should be backfilled from prose. Existing `creditsJson` and `coWriters` are plain-text models, and `workWitnesses` is an invitation/testimony model; none should be repurposed. The follow-on needs a schema migration and an explicit unique-normalized handle policy first. `mentionedUserId`, not a mutable handle, is the durable identity. The `handleAtSelection` is historical context only.

One provenance clarification also emerged: `preparedWorkRegistration.ts` classifies `originStory` as WID-bound, but the actual current signature serialization contains only `fileHash`, `title`, participation, tone label, and timestamp. Until that mismatch is separately resolved, neither origin prose nor an origin reference may be described as cryptographically sealed by the original WID.

### Playback correlation: priority raised, cause not established

The screenshot also adds the user observation that the Studio problem happens more often while a track is playing. This increases the priority of an active-playback comparison, but does not prove a player bug.

Source confirms one credible performance path: `CollectionStudioPage` calls `usePlayer()` only to obtain `playQueueAt`, yet `PlayerContext` publishes changing playback state—including audio `currentTime` updates on `timeupdate`—to every subscriber. While silent, those updates stop; while playing, the Studio page, form state, and drag-and-drop tree can be reconciled repeatedly. The cost and user-visible effect must be measured, not assumed.

Standard compact playback remains explicitly distinct from a blocking player surface. It does not create a full-screen backdrop. The conditional pointer-blocking candidates are the expanded mobile player, comments portal, cinematic portal, or theater view; Global Player local state can survive navigation because the route guard does not own it.

The first diagnosis pass must use existing development diagnostics before new code: enable `localStorage.LN_DIAG_PLAYBACK = '1'`, reproduce silent versus active compact playback on the same collection/device, capture `window.__LN_PLAYBACK_LOG`, inspect `document.elementFromPoint(...)`, and record body scroll-lock state before refreshing. Compare React commits and long tasks for silent and playing runs. Test compact, expanded, cinematic, and comment states separately rather than treating “playing” as one condition.

If profiling confirms playback-clock re-render pressure, the preferred repair is a stable Player command context (or equivalent command-only hook) so Collection Studio uses `playQueueAt` without subscribing to volatile clock state. If an overlay is reproduced, close only that transient presentation state on route change. Neither option authorizes pausing audio, resetting the queue, remounting `PlayerProvider`, adding a second audio engine, globally throttling the playback clock, or disabling drag-and-drop.

## Implementation record and remaining risk

### What was corrected

1. **Creator declaration correction.** `songs.correctDeclaration` is a dedicated protected mutation, not an extension of generic metadata editing. It validates the three permitted participation values, resolves the Work, enforces creator ownership, rejects no-ops, and delegates the write to one database transaction. That transaction updates only the three current effective axes and appends `creator_participation_declaration_corrected` with previous/current values, original WID reference, optional explanation, and internal actor evidence.
2. **Public historical truth.** The narrow public history projection now allows this correction event alongside the existing creator-date records, while omitting actor identity. `WorkProvenanceHistory` labels the former value as **Original declaration** and the visible value as **Corrected effective declaration**. It does not present a correction as an original declaration.
3. **Owner editor continuity.** Every active `openEditor(...)` caller now forwards Music, Lyrics, and Voice participation values into Creative Drawer. The drawer contains a separate review-first correction control; its ordinary Save path refuses to silently apply unsaved participation changes.
4. **First-entry and request recovery.** Collection Studio waits for `useAuth()` to resolve before signed-out UI or the primary request is considered. The primary request begins only for a valid collection ID and confirmed user. Failure provides an in-place Retry, an intentionally non-identifying diagnostic reference, and Back to the selected Archive collection. Version History remains success-only. PlayerContext, its queue, and all audio controls remain untouched.

### Confirmed root causes and affected paths

| Issue | Confirmed cause | Corrected paths |
|---|---|---|
| Participation disclosure | Effective axes existed, but neither the owner contract nor append-only correction pathway existed. Silent generic metadata editing would have contradicted the WID-bound original declaration without evidence. | `server/routers/songs.ts`, `server/domains/work/participationCorrection.ts`, `server/utils/db.ts`, `shared/participationDeclaration.ts`, `CreativeDrawer`, all active editor handoffs, public history renderer/query. |
| Studio first arrival/recovery | Auth hydration was checked after `!user`, producing a misleading transient guest state. Primary failure had no Retry, diagnostic reference, or selected-collection return path. | `client/src/pages/CollectionStudioPage.tsx`, `server/tests/collectionStudioRecovery.contract.test.ts`. |

### Validation evidence

- `pnpm check` passed after the final transactional change.
- Focused declaration and Studio suites: **22 tests passed** (`participationCorrection`, `workMetadataContinuity`, `collectionStudioRecovery`).
- Final full regression suite: **129 files passed, 808 tests passed; 1 browser-only test intentionally skipped**.
- Final production build passed. `git diff --check` passed.
- Local guest Studio route was browser-checked: it resolved to the signed-out state rather than a stalled loader. A public Work route was browser-checked: the read-only provenance history rendered normally with its revised copy and no correction event.
- Authenticated owner recovery was browser-checked against a deliberately nonexistent collection ID: the primary-request failure showed the stable `CS-GET-COLLECTION-NOT_FOUND` reference and both recovery actions; Retry remained in the same safe state, and Back returned to Archive while retaining the collection query parameter. No collection data, Work data, queue, or player state was changed.
- `pnpm refine` measured **70/100 (C)**. This is the existing cross-platform typography/doctrine/design-drift baseline; no claim is made that this narrow reliability and provenance repair improved it.

### What remains unproven

The reported active-playback Studio freeze was **not reproduced with a causal performance trace**. A real authenticated owner-session comparison was completed against the same owned four-track collection: with the Global Player active, elapsed time advanced from 0:08 on Archive to 0:16 during Studio entry and 0:47 after the Studio was fully interactive; the Work, queue, and compact player remained continuous. The matching paused control entered the same Studio at 0:27 and also rendered normally. This establishes that active playback alone is not sufficient to reproduce the failure in this route/session.

The expanded Global Player could be opened and collapsed normally during the session. Its overlay is intentionally interaction-dominant, and the connected-browser automation could not reliably dispatch a header-route click beneath that layer; therefore this test does **not** establish that an overlay survives a completed route navigation or is the reported block. Console execution and browser performance tracing were unavailable in the connected browser, so neither JavaScript exceptions nor render-frequency measurements were collected from that pass.

Code inspection continues to identify a credible but unproven possibility: `CollectionStudioPage` subscribes to volatile PlayerContext state merely to access `playQueueAt`, so playback-clock updates may cause avoidable Studio reconciliation. Likewise, player-local full-viewport portals merit direct route-cleanup testing, but neither has been proven as the reported interaction block.

Accordingly, this release deliberately does **not** alter PlayerContext, reset audio, close player overlays speculatively, introduce delays, disable caches, or rebuild Studio. An authenticated owner-session test matrix still needs cold/warm Archive → Studio navigation with silence and active compact playback, plus expanded/cinematic/comments overlays and a simulated failed request. If evidence proves either path, apply only the bounded correction described in the playback addendum above.

### Separate registry-integrity review

The `originStory`/prepared-WID signature classification mismatch remains separately recorded for registry review. It was not changed as part of this corrective release. Clickable creator mentions remain explicitly deferred.

**No publication or deployment has been requested or performed.**
