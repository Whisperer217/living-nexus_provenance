# Living Nexus — Global Player & Creator Domain Consolidation
## Impact Report and Staged Implementation Plan

> **Living Nexus proprietary architecture planning artifact**
> Copyright © 2026 BDDT Publishing LLC. Internal planning record; no rights, ownership, WIDs, provenance events, or stored assets are changed by this document.

- **Status:** Planning complete — implementation not started
- **Date:** 2026-10-18
- **Directive:** Implement and validate the Global Player cinematic creator-gallery experience before any AI-product retirement or Quiver/Creator Domain consolidation.
- **Scope:** Two bounded phases only. No platform rewrite and no replacement AI product.

## Executive Decision

Living Nexus already has the architectural anchors required for this work:

1. The reachable Global Player owns the existing cinematic portal and reads from one root `PlayerProvider`.
2. `PlayerContext` owns the module-level audio singleton and the immutable playback-session queue.
3. Quiver already owns creator-scoped visual asset records and permission checks.
4. The platform already pauses new AI operations globally while preserving historical disclosures, Works, assets, and private records.

Therefore:

- **Phase 1** will extend the reachable `GlobalPlayer` cinematic portal as a presentation over existing playback authority. It will not revive or create a second player, audio element, queue, or provider.
- **Phase 2** will turn Quiver into a Creator Domain asset-library surface by reusing existing asset rows. It will retire creation-oriented AI/Avatar/Image interfaces without deleting historical evidence, stored outputs, WIDs, HAAI disclosures, or creator associations.

## Architectural Principles

```text
Global Player     = where a Creator’s Works are experienced
Creator Domain    = where a Creator manages Works and Assets
Registry          = where identity, WIDs, and provenance remain authoritative
```

The plan strengthens the following Living Nexus layers without weakening the others:

| Layer | Effect |
| --- | --- |
| Identity | Cinematic playback foregrounds creator attribution; asset management remains creator-owned. |
| Manifestation | Works gain a focused, accessible cinematic catalog view without duplicating media behavior. |
| Relationship | A listener can move through a creator’s Works and reach Support Creator without leaving playback. |
| Registry | WID identity, provenance, Work status, and HAAI history remain unchanged and authoritative. |
| Stewardship | Quiver assets remain private by default and are exposed only through explicit creator permission. |
| Legacy | Historic AI-assisted records, stored outputs, private threads, and asset references are retained. |

---

# Phase 1 — Cinematic Global Player

## Current State

### Existing playback authority

`client/src/contexts/PlayerContext.tsx` is the canonical playback authority.

- It creates and retains one module-level `HTMLAudioElement` (`_globalAudio`).
- `playQueueAt()` and `addAndPlay()` create immutable, session-persisted queue snapshots with a rotating `queueId`.
- Pages are views; they must not mutate the active queue as a side effect of rendering or browsing.
- Existing controls, Media Session behavior, fades, recovery, persistence, and progress state are all owned here.

`client/src/components/player/GlobalPlayer.tsx` is the currently reachable player surface. Its existing cinematic portal is the correct host for the requested experience.

Other historical player implementations exist but are not the Phase 1 target:

| Surface | Current state | Decision |
| --- | --- | --- |
| `GlobalPlayer` cinematic portal | Reachable from the live Global Player | **Extend for Phase 1** |
| `PlayerQueuePanel` | Current-queue presentation; horizontal strip represents the frozen playback queue | Retain as queue UI, not creator catalog authority |
| `TheaterPlayer` | Mounted but its known opener is an unreachable legacy `PlayerBar` path | Do not extend in Phase 1 |
| `CinematicModeEngine` | Full-screen visual system associated with legacy `PlayerBar` | Do not revive or fork in Phase 1 |
| `MobilePlayerPanel` | Not mounted by the current public player composition | Do not make it a second cinematic implementation |

### Existing creator catalog flow

`client/src/pages/loop/LoopCreatorPage.tsx` currently:

- resolves a Creator by ID or stable handle;
- reads creator and Work data via `profile.getCreator`;
- builds a local creator playback queue;
- invokes the canonical `playQueueAt()` action.

This demonstrates the correct explicit play action, but it is **not** the scalable Global Player gallery source:

- `profile.getCreator` calls `getSongsByUser`, which loads up to 1,000 raw rows before in-memory public/status filtering.
- The existing creator queue is an eager page-local snapshot.
- The current public discovery procedure `songs.discoverInfinite` already provides the safer SQL-level predicate, projection, limit-plus-one cursor pattern, and creator filter.

### Existing tests

Relevant continuity coverage exists in:

- `server/tests/playerProviderComposition.test.ts`
- `server/tests/playbackContinuityDiagnostics.contract.test.ts`
- `server/tests/queue.collection.test.ts`
- `server/tests/globalPlayerAccessRoutes.contract.test.ts`
- `server/tests/creatorRouteContinuity.contract.test.ts`
- `server/tests/songs.discoverInfinite.test.ts`
- `server/tests/mobile-guards.test.ts`

Current coverage is largely contract-oriented; Phase 1 requires behavioral tests around the new cinematic panel and gallery interactions.

## Target State

The existing Global Player cinematic portal becomes a creator-centered gallery:

```text
┌──────────────────────────────────────────────────────────────┐
│ CINEMATIC VIEW                                                │
│                                                              │
│  [ Current Work artwork / visual atmosphere ]                │
│  Work title · Creator attribution · WID when present         │
│  [ persistent canonical transport controls ]                 │
│                                                              │
│  [ collapsed Creator identity ] [ expand details ]           │
│  └ expanded: portrait · testimony · bio · work count         │
│               Creator Domain · Support Creator               │
│                                                              │
│  Creator Works                                                │
│  ◀ [ Work ] [ Work ] [ Active Work ] [ Work ] [ Work ] ▶    │
│       horizontal, swipeable, keyboard-operable gallery       │
└──────────────────────────────────────────────────────────────┘
```

### Creator Work gallery behavior

- Query eligible public audio Works through `songs.discoverInfinite` using the selected Creator’s canonical `creatorId`, `contentType: "audio"`, and a bounded page size of 12–24.
- Use the existing SQL public predicate: `isPublic = true` and `status = "Published"`.
- Display a public Work without `fileUrl` as an inspectable record, but do not allow it to enter the playback queue.
- Keep every eligible Work reachable using explicit continuation (`Load more` or accessible intersection continuation); do not fetch a creator’s entire catalog merely to render the player.
- Use the existing Cathedral horizontal card grammar (`.museum-pan-row`, `.museum-card`, active-card styling) and lazy artwork loading.
- Use explicit Play controls. Browsing, scrolling, opening Cinematic View, and expanding creator details must not modify playback.

### Explicit playback behavior

A gallery Play action may intentionally create one new creator playback session by calling:

```ts
playQueueAt(playableTracks, selectedIndex, "CREATOR_PAGE", `creator:${creatorId}`)
```

It must:

- map stable Work IDs to playable tracks, never rely on assumed raw-array indexes;
- construct no `Audio` instances;
- mount no nested `PlayerProvider`;
- avoid a new media session or local transport state;
- leave the current queue untouched until the listener explicitly selects Play;
- preserve existing audio engine, recovery, fade, volume, and session-storage logic.

### Expandable creator panel

- Starts collapsed to keep the current Work visually primary.
- Uses stable Creator ID or handle—not display-name-derived paths.
- Expands in place to show portrait, creator name/handle, short biography or testimony, Work count, canonical Creator Domain link, and Support Creator action.
- Does not cover essential transport controls.
- Uses `aria-expanded`, a labelled region, keyboard-operable controls, focus restoration on cinematic close, and a predictable Escape path.

## Phase 1 Dependencies and Risks

| Dependency / risk | Required control |
| --- | --- |
| Duplicate audio or queue ownership | Global Player must use only PlayerContext actions and state. No new `Audio`, provider, or autonomous queue. |
| Catalog browse accidentally resets playback | Gallery query/state is read-only. Only explicit Play may call `playQueueAt`. |
| 1,000-row creator-query ceiling | Use `songs.discoverInfinite` instead of `profile.getCreator` as the cinematic gallery source. |
| Public-policy drift | Gallery predicate is public + Published + audio; playback additionally requires `fileUrl`. |
| Offset pagination reordering | Use deterministic server ordering with tie-breakers; document offset movement risk and evaluate keyset cursor as follow-on. |
| Motion/performance pressure | Do not eagerly load all art/video; respect reduced motion; do not add new animation loops. |
| Mobile overlays and bottom player collision | Preserve current Global Player portal, safe-area, bottom-stack, scroll-lock, and z-index responsibilities. |
| Unreachable legacy player paths | Do not implement gallery behavior in `TheaterPlayer`, `CinematicModeEngine`, or legacy `PlayerBar`. |

## Phase 1 Implementation Order

1. **Map and test the active cinematic host.** Add regression coverage proving `GlobalPlayer` remains the only Phase 1 host and PlayerContext remains the only audio/session authority.
2. **Create a typed public Creator Work mapper.** Map the public FeedRow projection to `Track` fields, including Creator ID and stable handle fallback.
3. **Add bounded Creator catalog reading.** Reuse `songs.discoverInfinite`; add or validate public audio-count semantics if the gallery needs an accurate total.
4. **Extract the cinematic content view if necessary.** Keep it presentation-only and feed it existing PlayerContext state/actions.
5. **Add the Creator panel and horizontal gallery.** Add focus, keyboard, touch, mouse, trackpad, reduced-motion, and responsive behavior.
6. **Add explicit gallery Play / Play loaded Works actions.** Start a creator-scoped immutable queue only after listener intent.
7. **Validate across desktop, tablet, and mobile.** Confirm no session interruption, audio duplication, or overlay/bottom-stack collision.

## Phase 1 Validation

- Opening/closing Cinematic View, expanding/collapsing creator details, loading a catalog page, and horizontally browsing must leave `queueId`, active track, audio source, current time, duration, and play state unchanged.
- A gallery Play action must call the existing `playQueueAt` path once and result in one creator-scoped queue session.
- `PlayerContext` remains the only source of `<audio>` ownership.
- Gallery covers public/Published/audio eligibility, file-less Work display, deterministic ordering, cursor exhaustion, no duplicate IDs, and explicit continuation.
- Keyboard, focus restoration, semantic labels, reduced-motion, contrast, mobile safe-area, and close/Escape behavior are tested.
- TypeScript, focused player/catalog tests, full regression, production build, `git diff --check`, visual smoke, and doctrine refinement must complete before a Phase 1 checkpoint.

---

# Phase 2 — Retire Generation Experiences and Consolidate Quiver

> **Execution gate:** Phase 2 is not authorized to begin until Phase 1 is implemented and validated, followed by explicit review of the Phase 2 plan.

## Current State

### Current operations posture

`shared/aiAvailability.ts` defines `AI_OPERATIONS_ENABLED = false`. The shared LLM, image-generation, and transcription adapters reject before external provider work. The current PNA service visibly communicates a work-in-progress pause.

This is an **operations pause**, not a deletion or provenance rewrite. The following stay preserved:

- registered Works, WIDs, hashes, certificates, registry/provenance events, and publication history;
- HAAI declarations and historic tool/disclosure fields;
- creator-uploaded images, artwork, avatars, visual Works, and existing media references;
- stored generated outputs, existing music-video fields, PNA threads, Context Envelopes, artifacts, receipts, and notes;
- Creator Domains, registration, upload, archive, support, correspondence, Signals, and non-AI registry functionality.

### Quiver current asset model

`quiverImages` is already an additive creator-owned asset table:

| Field / behavior | Current authority |
| --- | --- |
| Ownership | `quiverImages.userId`; protected procedures derive identity from the authenticated creator |
| Asset location | Existing `url` field; must be retained verbatim with the storage object it references |
| Working metadata | title, prompt/enriched prompt, tags, remix/reference fields, timestamps, nullable WID/Guide references |
| PNA relationship | `pna_artifacts.quiverImageId` connects a reviewed/preserved private artifact to its Quiver row |
| Private actions | owner-scoped list, get, rename, delete, publication toggle, and authenticated download |
| Public presentation | separate gallery projection, currently gated by `registeredAsWid` and title |

Quiver is currently rendered through PNA/Keeper-oriented interfaces. The active Loop Creator Domain does not yet mount a Quiver library or an explicit public placement view.

## Target State

```text
CREATOR DOMAIN
  ├─ Creator Identity
  ├─ Registered Works
  ├─ Collections
  ├─ Creator Asset Library (Quiver)
  │   ├─ Private assets — owner only
  │   ├─ Explicitly placed public assets — viewer-safe projection only
  │   └─ Existing relationships — preserved, never inferred
  ├─ Provenance Records
  ├─ Licensing / Permissions
  └─ Support Creator
```

### Quiver target behavior

- Creator Domain becomes a coherent management home for a creator’s asset library.
- Existing Quiver rows remain authoritative; no bulk row-copying, URL rewriting, asset relocation, or destructive migration.
- Start with an **owner-only Asset Library** inside Creator Domain.
- Add public placement only through an explicit creator act with narrow viewer-safe projection.
- Private prompts, enriched prompts, reference URLs, raw metadata, owner IDs, and working iterations remain private unless a future separate disclosure decision says otherwise.
- Existing work-gallery uploads remain separate media objects. A future opt-in attachment relationship must be explicit and lineage-preserving—not an asset move.

### Retirement boundary

Retire new-generation product interactions, not truthful history.

Candidates to hide/deprecate after Phase 1:

- PNA chat/composer and Vision actions that create new model output;
- legacy PNA drawer generation affordances;
- Keeper/Floating Avatar model chat, transcription, image analysis, portrait generation, and artwork-generation controls;
- prompt-generation product paths;
- Guide image and playlist-cover generation controls;
- AI music-video generation follow-on only—not existing media rendering or non-AI visual queue duties;
- obsolete Prompt Generator navigation entries.

Retained record-safe surfaces include:

- non-AI upload/registration, WID verification, HAAI displays, provenance, works, Creator Domains, archive, collections, and support;
- existing PNA threads, notes, sealed WID-CNV diary records, Context Envelope receipts/sources, artifact history, and saved Quiver assets;
- Avatar Registry records and AVT-WID / creator-credit / license / hash / disclosure presentation;
- visual Work registrations and historical stored media;
- existing music-video URLs/scripts and playback/display behavior;
- the global AI operations pause guard itself.

## Phase 2 Preservation and Permission Requirements

| Non-negotiable | Required implementation control |
| --- | --- |
| Do not delete or rewrite asset rows | Reuse `quiverImages`; never bulk-migrate/rewrite URLs as part of UI consolidation. |
| Do not orphan storage | Retain exact URL/file references and verify storage compatibility before any future hardening. |
| Private assets remain private | Domain owner shelf is authenticated and owner-scoped; no public query reuse. |
| Public assets need explicit creator intent | Use a narrow public DTO and explicit placement/visibility action. Do not infer public status from title alone. |
| No false WID claims | `registeredAsWid` is not WID proof. Verify owner-matched registry identity before presenting a WID relationship. |
| Preserve PNA links/history | Retain PNA artifact, receipt, source, and `quiverImageId` relationships. |
| Keep Creator ownership unchanged | All operations derive authority from authenticated owner; no ownership transfer happens in this migration. |
| Preserve HAAI/provenance history | Do not remove disclosure fields, record displays, evidence, or historical generated outputs. |

## Phase 2 Dependency Risks

| Risk | Why it matters | Control |
| --- | --- | --- |
| Public Quiver projection over-shares fields | Current public data can include raw prompt/reference/owner fields | Build a narrow explicit public DTO, never `select *`. |
| Quiver links lack foreign-key enforcement | WID/Guide scalar links can be dangling or cross-owner | Validate link ownership at any new attach/display mutation; do not backfill invented associations. |
| Current asset URLs lack canonical key/hash metadata | Storage lifecycle can break visibility or integrity | Audit storage policy first; additive hardening only after compatibility plan. |
| PNA preservation lifecycle duplicate writes | Preserve action may lack transaction/uniqueness guard | Add idempotency/transaction protections without changing existing source history. |
| Historical PNA deep links are stranded | Removing routes bluntly can break creator records | Retire model creation affordances but retain record-safe redirects/readers. |
| AI visual worker has mixed responsibilities | Disabling whole worker can harm non-AI existing-media readiness | Retire only provider-driven follow-on; keep deterministic media/recovery work. |
| Avatar Registry is conflated with generation | It contains registered AVT-WID records and creator-owned uploads | Preserve it as a registry/marketplace record surface; remove only live generation affordances. |

## Phase 2 Implementation Order

1. **Preservation audit and test baseline.** Snapshot route/API/data dependencies and add owner-isolation/public-field tests before interface movement.
2. **Create Domain asset-library read model.** Reuse existing Quiver records, owner checks, and URL fields. No schema migration for the first owner-only shelf.
3. **Add owner-only Creator Domain Asset Library.** Give creators browse/search/manage/download access through existing permission boundaries.
4. **Add explicit public placement only if required.** Use an additive placement record and narrow public DTO; never auto-publish private assets.
5. **Move record-safe Quiver entry points.** Link existing Quiver history into Creator Domain without deleting PNA records.
6. **Retire new-generation UI and procedure entry points.** Replace creation actions with clearly worded retired/read-only states and record-safe destinations.
7. **Deprecate behind compatibility routes.** Do not delete data, storage, schema, historic APIs, or deep links until a later audited retention decision.
8. **Document retained, migrated, removed, and deprecated behavior.** Record actual changes in an ADR and a removal inventory.

## Phase 2 Validation

- Cross-tenant Quiver list/get/update/delete/publish/download requests are denied.
- Public asset projection includes only explicitly eligible rows and never leaks private prompts, references, owner identifiers, or working metadata.
- Existing Quiver URLs, PNA artifact links, receipts, stored assets, WIDs, HAAI disclosures, Creator Domains, and Work records remain unchanged and readable.
- A visibility change does not create, imply, or alter a WID.
- Existing generated video/artifact fields remain displayable while new provider generation remains blocked.
- No creation-oriented AI, avatar, image, portrait, prompt, transcript, playlist-cover, Guide-image, or music-video generation CTA remains discoverable after retirement.
- Retired deep links fail safely or route to an honest read-only/record-safe destination; they never create new provider work.
- Full registry, Work, Creator Domain, PNA-history, asset, and pause-guard regression suites pass.

---

# Cross-Phase File and Data Boundaries

## Phase 1 likely change set

- `client/src/components/player/GlobalPlayer.tsx`
- one focused cinematic child component, if extraction reduces GlobalPlayer complexity
- `client/src/components/player/PlayerQueuePanel.tsx` only if visual reuse is appropriate, not as catalog authority
- `client/src/contexts/PlayerContext.tsx` only for typed context/API additions that preserve its single-owner contract
- `client/src/pages/loop/LoopCreatorPage.tsx` and/or a reusable creator-track mapper
- `server/routers/songs.ts`, `server/utils/db.ts` only if a missing public audio pagination/count projection is proven necessary
- player/catalog/mobile/accessibility tests and `client/src/index.css`

**No Phase 1 schema migration is expected.**

## Phase 2 likely change set

- `client/src/pages/loop/LoopCreatorPage.tsx` and Creator Domain asset-library components
- `client/src/components/PNAQuiverWorkspace.tsx` and PNA/Keeper entry surfaces, preserving historic readers
- `server/routers/quiver.ts`, `server/routers/imageGallery.ts`, and focused DB helpers for narrow read models / DTOs
- App/navigation entries and model-facing components listed in the retirement inventory
- `server/workers/visualQueue.ts` and generation routes only for retirement gating, not historical data removal
- Quiver, PNA-history, AI pause, Creator Domain, registry, and asset integrity tests

**No destructive Phase 2 migration is authorized.** A future additive placement/metadata migration requires a separate reviewed ADR, live-schema check, journaled migration, preservation test suite, and explicit approval.

---

# Approval Gates

1. **Approve Phase 1 implementation** as the next work item: GlobalPlayer cinematic creator gallery only.
2. After Phase 1 validation and review, approve a separate **Phase 2 retirement/consolidation implementation plan**.
3. Any destructive route removal, database deletion, storage deletion, ownership change, WID rewrite, provenance rewrite, public asset exposure, or AI reactivation is outside this directive and requires separate explicit approval.

## Report Evidence

This report was derived from a read-only source audit of:

- PlayerContext, GlobalPlayer, legacy/theater player components, queue loading, and player tests;
- Loop Creator Domain, profile and song discovery routes, public query helpers, and catalog tests;
- Quiver schema/migration/router/helpers, PNA preservation records, public gallery route, storage/download paths, and Creator Domain composition;
- AI operations pause controls, PNA/Keeper/Avatar/Image/Prompt/Guide/Playlist/Music Video entry points, and registry/preservation tests.

No application code, schema, storage object, database row, WID, provenance event, HAAI declaration, permission, or route behavior was changed while preparing this report.

---

## Phase 1 Implementation Evidence — 2026-10-18

**Status: implemented for review; not published.**

The approved Phase 1 slice is now limited to the existing `GlobalPlayer` cinematic portal:

- A bounded `songs.discoverInfinite` read loads public audio Works for the active Creator only, 12 at a time, only while cinematic mode is open.
- The Creator panel is compact by default and expands only for the existing public Creator Domain and support action.
- The horizontal elevated gallery uses the canonical public Work projection. Each card has separate **View** and **Play** actions.
- Choosing a card updates only local cinematic presentation state (artwork, title, WID detail, and featured marker); it does not call `PlayerContext` or interrupt playback.
- The explicit **Play** action alone uses the existing `playQueueAt` path to enter the selected Creator Work in a canonical Creator-context queue.
- The original `PlayerContext` remains the single audio owner. No new `<audio>` element, player provider, database write, registry change, schema migration, Quiver change, or AI-interface retirement was introduced.

### Validation completed

- TypeScript: `pnpm check` passed.
- Focused contracts: `globalPlayerCinematicCreatorGallery`, `playbackContinuityDiagnostics`, and `globalPlayerAccessRoutes` passed — 12 tests.
- Production build: `pnpm build` passed. The pre-existing large-chunk warning remains; no build failure occurred.
- Full regression: 124 test files / 780 tests passed; 1 existing test remained skipped.
- Diff integrity: `git diff --check` passed.
- Browser smoke on `/song/360001` confirmed a 12-Work gallery, compact Creator panel, `Featured selection — audio continues` after a card selection, and the active queue changed only after that card’s explicit **Play** action.
- Desktop before/after evidence was captured from the exact `db288633` baseline and the review branch. A project mobile capture at 375×812 completed without TypeScript or runtime errors; the existing update modal covered part of that static capture.

### Boundaries honored

Phase 2 did not begin. Historical records, Quiver storage, AI interfaces, registry attribution, WIDs, Work records, and Creator Domain routes were not removed or modified.
