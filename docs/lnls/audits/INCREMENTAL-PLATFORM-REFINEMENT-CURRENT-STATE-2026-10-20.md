# Living Nexus — Incremental Platform Refinement: Current State and Bounded Plan

**Date:** 2026-10-20  
**Status:** Pass 1 implemented and locally validated; Passes 2–6 remain unimplemented or diagnostic-only  
**Authority:** Creator-feedback brief, October 2026  
**Scope:** Biography visibility, genre taxonomy, MP3 Queue clarity, Collection Studio reliability, creator-owned avatars, and evidence-led consistency review  
**Publication:** None requested or performed

## Method

This assessment followed the required sequence through **Inspect → Reproduce/Audit → Align → Plan**. It did not implement application changes. The repository began at development checkpoint `ef55be46`; source inspection and focused existing tests were used only where they could establish facts. `pnpm refine` measured **70/100 (C)**, a broad pre-existing typography/doctrine baseline outside this corrective scope.

The six reports were evaluated against the Living Nexus layers:

| Pass | Primary layer strengthened by a future correction | Current decision |
|---|---|---|
| 1 — Creator biography | Identity, Manifestation, Legacy | Confirmed visibility gap; bounded UI slice is ready for approval. |
| 2 — Genres | Discovery, Relationship | Confirmed additive taxonomy gap; compatibility decision required before implementation. |
| 3 — MP3 Queue | Stewardship, Manifestation | Confirmed misleading presentation; copy-only correction is ready for approval. |
| 4 — Collection Studio | Stewardship, Relationship | Earlier recovery repair is present; active-playback freeze cause remains unproven. Diagnostics only. |
| 5 — Avatars | Identity, Stewardship, Registry | Ordinary profile upload works; Registry/onboarding path and selection authority need a staged security decision. |
| 6 — Consistency | All layers | Apply only demonstrated shared fixes after each bounded correction; no speculative platform-wide sweep. |

## Pass 1 — Creator Biography Visibility

### Reported issue

A visitor cannot reliably read a creator’s complete biography on the public Creator Domain.

### Confirmed root cause

The canonical public route is `/creator/:id` → `client/src/pages/loop/LoopCreatorPage.tsx`, not the legacy-named profile page. That page intentionally shows a 180-character hero **synopsis** selected from Origin Statement, Creative Mission, or biography. The synopsis is not itself accidental clipping.

The actual defect is that the canonical Loop Creator Domain does not provide any separate full `creator.bio` rendering path. `DomainRenderer` has a `BioBlock`, but Loop’s allowed/default arrangement excludes it. Creator cards intentionally clamp their excerpts, and the expanded cinematic creator panel can show supplied biography text but currently collapses authored line breaks. The profile data and public query already carry `bio` (up to 1,000 characters); no schema or endpoint is missing.

### Smallest safe correction

1. Keep the 180-character hero synopsis and its existing hierarchy.
2. Add one plainly labeled full Biography section to the canonical `LoopCreatorPage` only when `creator.bio` exists.
3. Preserve plain-text paragraphs and authored line breaks with `white-space: pre-wrap`, local word-breaking, responsive containment, and accessible document structure.
4. Do **not** remove intentional card clamps or modify saved Creator Domain arrangements in this slice.

### Files and tests

- Primary implementation: `client/src/pages/loop/LoopCreatorPage.tsx`
- Style support only if needed: `client/src/index.css`
- Focused test to add: active creator-route biography rendering contract
- Regression guard: `server/tests/exploreCreatorPresence.contract.test.ts`
- Related evidence: `client/src/components/domain/DomainRenderer.tsx`, `client/src/components/player/CinematicCreatorGallery.tsx`, `server/routers/profile.ts`

### Risks and remaining limits

This corrects canonical public-domain access, not every intentionally compact card. Global Player newline preservation and its optional biography projection are separate follow-up candidates, not a reason to broaden Pass 1.

### Implementation record — 2026-10-20

The approved correction is complete in `client/src/pages/loop/LoopCreatorPage.tsx`.

- The original 180-character Hero synopsis remains unchanged and continues to use `why`, not the full Biography.
- An optional native `section` now appears after Creator Domain metrics and before Testimonies only when `creator.bio` contains non-whitespace text.
- The section has an accessible named heading, Cathedral overline/headline hierarchy, existing page-width containment, a bounded reading measure, and `white-space: pre-wrap` plus local word breaking. The creator's stored plain text is rendered in full; no duplicate field, query, mutation, schema change, migration, or card modification was introduced.
- Empty or whitespace-only biographies render no empty section.

Validation completed:

- `pnpm check` passed.
- Focused Creator Domain + Explore creator-card contracts: **16/16 passed**.
- Full regression suite: **134 files passed, 832 tests passed; 1 browser-only test intentionally skipped**.
- Production build and `git diff --check` passed.
- Browser evidence on the existing public Creator Domain for `/creator/1` confirmed the full biography is present as a named Biography section; computed styles reported `white-space: pre-wrap`, `overflow-wrap: anywhere`, and no desktop horizontal overflow. A controlled isolated 375px DevTools capture waited for the actual Biography heading, showed the full section immediately before Testimonies, and measured `scrollWidth === innerWidth === 375` with no horizontal overflow. The existing compact Global Player remained below the readable biography surface.

No publication or deployment has been requested or performed. Pass 2 has not begun.

## Pass 2 — Genre Taxonomy Refinement

### Reported issue

`Progressive Rock` and `Metalcore` are unavailable to creators.

### Confirmed root cause

`shared/contentTypes.ts` is the active taxonomy source. Neither label exists in the granular owner-edit list (`EDIT_GENRES`) or the separate, intentionally coarser modern Register list (`UPLOAD_GENRES`). Existing Work and profile genre fields are comma-separated `TEXT`, not database enums; adding labels requires no migration and does not change WID serialization.

Existing values are preserved as creator-entered editorial metadata. Free-text Explore search uses `LIKE` and will find a new term. Exact genre filtering is currently incompatible with multi-label values such as `Heavy Metal, Metalcore`, so this pass must not imply a new facet/filter system without a later data/query design.

### Smallest safe correction

1. Add `Progressive Rock` and `Metalcore` additively, title-cased, to the Rock & Metal area of `EDIT_GENRES`.
2. Add the same two labels to `UPLOAD_GENRES` so modern Register and owner editing do not diverge for these requested terms.
3. Preserve every existing option and all existing stored genre strings; in particular, do not rewrite prior labels or conflate `Symphonic Metal` with `Symphonic Power Metal`.
4. Do not change schema, migrate metadata, rewrite historical records, alter the WID payload, or introduce aliases/exact structured filtering.

### Files and tests

- Primary implementation: `shared/contentTypes.ts`
- Registration/owner-editor validation: `MusicEnvironment.tsx`, `CreativeDrawer.tsx`, `EditChapel.tsx`
- Existing regression coverage: `server/tests/workMetadataContinuity.test.ts`, `server/tests/preparedWorkRegistration.test.ts`, `server/tests/songs.discoverInfinite.test.ts`, `server/tests/musicRegisterPresentation.contract.test.ts`
- New focused assertions: both labels occur exactly once in each approved option list; existing labels and multi-value preservation remain intact.

### Decision still needed

The source establishes that Register deliberately uses a coarse taxonomy. Adding the two requested terms to both lists is the minimal compatibility choice. Replacing Register’s list wholesale with the granular owner list is not justified in this refinement slice.

## Pass 3 — MP3 Queue Usability

### Reported issue

Creators are confused because MP3 Queue appears to overlap with Batch Upload.

### Confirmed root cause

The two routes are materially different:

- **MP3 Queue** is the canonical multi-MP3 path. It supports MP3 validation, ordering, preview, review, then sequential canonical Work registration.
- **Batch Upload** prepares a protected private batch-draft/evidence operation. It does not create Works, issue WIDs, create a collection, or create/link a Collection WID.

Several current entry points incorrectly promise **Batch Register**, **Register multiple tracks/works**, or a collective Collection WID. Those claims conflict with the protected-service boundary and explain the reported expectation mismatch.

### Smallest safe correction

1. On `BatchUploadPage`, state clearly before the first action that this path prepares a **private batch draft and verified source receipts**; it does not yet publish/register Works or create a collection/WID.
2. Replace inaccurate live navigation copy such as **Batch Register** with accurate **Prepare Batch Draft** language in `ContextDrawer`, PNA, Creator Domain, and Dashboard entry points.
3. Add concise orientation at the MP3 Queue entry: use MP3 Queue to review and register several MP3 Works now; use Batch Draft to preserve a private prepared batch.
4. Do not modify file uploads, queue caps, reordering, verification, storage, receipts, routes, database models, or private-draft services.

### Files and tests

- Primary presentation paths: `client/src/pages/BatchUploadPage.tsx`, `client/src/components/layout/ContextDrawer.tsx`, `client/src/pages/PNAShellPage.tsx`, `client/src/pages/CreatorDomainShell.tsx`, `client/src/pages/DashboardPage.tsx`, `client/src/pages/manifestation-studio/TypeGateway.tsx`
- Existing regression coverage: `server/tests/loopMp3Queue.contract.test.ts`, `server/tests/batchUploadPrivateUi.contract.test.ts`, `server/tests/batchUploadServices.contract.test.ts`, `server/tests/batchUploadEvidence.contract.test.ts`, `server/tests/coreIngestionIntegrity.test.ts`
- Audit result: the focused suite passed **25/25** with no behavior modification.

## Pass 4 — Collection Studio Reliability

### Reported issue

Collection Studio can appear to freeze, more often with active playback.

### Current confirmed state

The earlier corrective release is present and tested:

- Auth hydration now resolves before a signed-out gate is rendered.
- The primary query waits for known authenticated state and valid collection ID.
- Failure provides Retry, a non-identifying diagnostic reference, and selected-collection-preserving Back to Archive.
- Version History remains success-only.
- The existing server-side `requireOwnedCollection()` ownership check remains authoritative.
- Collection Studio still uses the singleton PlayerContext command path; it does not create another player or reset the queue.

### What is not established

Active playback alone did not reproduce the failure in two authenticated owner entries. Source inspection identifies two credible but unproven paths:

1. `CollectionStudioPage` subscribes to the full volatile PlayerContext merely to call `playQueueAt`; audio `timeupdate` state may cause avoidable reconciliation while playing.
2. Global Player-local cinematic/comments/mobile player portals may survive route changes because the app’s route guard does not own their local visual state.

Neither path has a causal performance trace, completed-route overlay hit-test, or authenticated reproduction. No player, queue, service-worker, cache, timing, or overlay code should change on this evidence.

### Required diagnostic next step

Use an authenticated owner, a known owned multi-track collection, one browser/device/build, and controlled trials for silent/paused, compact playback, expanded player, comments, cinematic, context menu, and volume popup. Capture existing opt-in `LN_DIAG_PLAYBACK` records, route/query timing, Chrome performance traces, React commits, long tasks, `elementsFromPoint()` at blocked targets, body scroll-lock state, and portal visibility. A repair is approval-gated only after a named cause is reproduced.

### Existing tests

- `server/tests/collectionStudioRecovery.contract.test.ts`: **5/5 passed** in audit.
- Declaration/Studio focused suites: **22/22 passed**.
- Studio recovery, playback diagnostics, and singleton provider contracts: **11/11 passed**.

## Pass 5 — Creator-Owned Avatar Functionality (AI Paused)

### Reported issue

A creator cannot use a desired custom avatar while AI generation is retired.

### Current confirmed state

The ordinary creator-owned profile upload path is functional and uses no model operations: `ProfilePage` calls protected `profile.uploadAvatar`, server-side Sharp processing crops/optimizes a WebP, storage writes an owner-scoped avatar asset, and only the current user’s `profilePhotoUrl` updates. `shared/aiAvailability.ts` remains globally disabled, and no avatar procedure was found to invoke an LLM or image generator.

The promoted Avatar Registry and onboarding image upload paths are not ready to be treated as an equivalent ordinary-avatar option. Their code posts to `/api/upload`, while the committed server exposes `/api/upload-file` and `/api/upload-gallery-image`. Registry selection also lacks server-side entitlement enforcement, does not preserve a distinct personal photo for reliable unequip/restore, and does not prove supplied registry image ownership or immutable AVT lineage.

The public `@handle` Creator Domain also receives an insufficient profile projection: its route expects public avatar/banner/bio fields that `getByHandle` does not return.

### Decision

Do not reactivate or add AI generation. Do not market Avatar Registry selection as a complete alternative to the working profile upload until asset transport, access control, personal-photo restoration, and public projection behavior are resolved.

### Staged safe plan

- **Phase A — ordinary avatar clarity:** make `/profile` the explicit creator-owned custom-avatar path; verify browser upload/replacement/rendering using the existing Sharp/storage route. No AI, no AVT mutation.
- **Phase B — registry integrity design:** before code, define personal avatar versus equipped registry asset, allowed license/entitlement rules, creator-owned asset receipts, server-calculated hashes, version-successor lineage, and safe restoration for already-equipped users.
- **Phase C — implementation after Phase B approval:** converge registry/onboarding upload transport on an actual authorized endpoint; enforce selection server-side; expose explicit Use Registry Avatar / Return to My Uploaded Photo controls; fix public `@handle` projection parity; retire duplicate legacy marketplace submission paths.

### Existing test evidence

`server/tests/imageProcessing.test.ts` passed **15/15** in the audit. No focused router, entitlement, upload-route, selection-restoration, registry-lineage, or no-AI avatar procedure contract currently exists; those must be added before Phase C.

## Pass 6 — Platform-Wide Consistency Protocol

This pass is not an independent global redesign. It is a propagation rule applied after each approved correction:

| Demonstrated correction | Shared propagation boundary | Explicit non-propagation rule |
|---|---|---|
| Full biography | Canonical full-domain view and other full-detail biography renderers | Do not remove intentional card excerpts/clamps. |
| New genre labels | Shared option lists and already-supported text discovery | Do not rewrite existing metadata, aliases, or exact-filter architecture. |
| MP3 Queue clarification | Current live entry points that promise Batch behavior | Do not change protected Batch Upload behavior or storage services. |
| Studio recovery | Existing Studio state/recovery contracts | Do not change PlayerContext/overlays until trace evidence exists. |
| Avatars | Only after explicit asset/entitlement model is approved | Do not reactivate AI or mutate historical AVT provenance. |

A separate read-only finding concerns Theater Player comments still binding a draft to moving playback, despite the Global Player correction. It is outside this creator-feedback refinement sequence and is retained as a separate follow-up; it must not be bundled into these passes without explicit approval.

## Recommended sequence and approval gates

1. **Pass 1 first — Biography visibility.** Small, local, no schema/data risk; repairs a direct public identity/access defect.
2. **Pass 2 second — Two additive genre labels.** Small shared taxonomy change; preserve existing metadata and do not alter filters.
3. **Pass 3 third — MP3 Queue / Batch Draft language.** Presentation-only, but must be consistency-reviewed across listed live entry points.
4. **Pass 4 parallel diagnostic only.** Do not alter Studio/player code unless a controlled authenticated trace demonstrates a cause.
5. **Pass 5 Phase A only after confirming the desired experience is an ordinary profile photo.** Registry work is a separate security/provenance design decision.
6. **Pass 6 after each implementation.** Run only targeted parity checks, not a generic cosmetic sweep.

## Standard validation for any approved implementation

For each bounded pass, record: reported issue, confirmed root cause, exact files changed, correction, regression tests, creator impact, and remaining limitations. Then run the applicable focused tests plus `pnpm check`, `pnpm build`, `git diff --check`, complete `pnpm test`, and `pnpm refine`; browser-check desktop/mobile affected workflows. Preserve WIDs, declarations, provenance, permissions, existing assets, creator-selected data, and the AI operations pause. Create a checkpoint only after the relevant bounded correction is fully validated. No publication or deployment is authorized by this plan.

## Approval requested

Approve **Pass 1 — canonical public Creator Domain biography visibility only** to begin implementation. It will not modify cards, genres, uploads, Studio/player code, avatar records, WIDs, database schema, or any AI setting.
