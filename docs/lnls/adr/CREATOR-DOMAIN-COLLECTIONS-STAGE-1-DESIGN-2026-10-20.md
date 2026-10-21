# ADR — Creator Domain Collections: Draft Releases, Sealed Editions, and Named Playlists (Stage 1 Design)

**Date:** 2026-10-20  
**Status:** Design direction and technical validation approved; implementation, migration, deployment, and publication remain blocked pending a separate approval
**Precondition:** Stage 0 collection security and registry-integrity checkpoint `7355ac02` remains the preserved baseline.  
**Scope:** Map one creator-facing Collections workflow using existing published Works. No application code, schema, migration, data, deployment, or publication is authorized by this record.

## Decision in one sentence

Give the creator **one Collections entry point** with clearly separate **Releases** and **Playlists** areas; use a new, owner-private **Draft Release** relationship model for mutable album composition; publish it atomically as a new, immutable **Sealed Edition**; and keep legacy WID-ALB collections, named playlists, personal folders, and manifested collections semantically distinct.

This is a unification of the creator journey—not a new playback engine, not a duplicate Work registry, and not an expansion of per-track administration.

---

## 1. Current truth to preserve

### Canonical Works remain the source of every release and playlist

`songs` remains the canonical Work record. A creator never uploads, re-registers, copies media, creates another Work WID, or rewrites HAAI declarations merely to group already-published Works. Existing media, hashes, creator attribution, permissions, audio versions, and Work history remain on the Work.

### Stage 0 legacy WID-ALB rules are non-negotiable

A legacy `collections` record carrying `collectionWid` and `collectiveHash` is an immutable **origin membership seal**. Its historical algorithm is SHA-256 of the sorted member Work WIDs joined by `|`. That proves its member multiset, not display order or presentation metadata.

Stage 0 now prevents add/remove/replace and Work reassignment into or out of those records. It permits only presentation edits and the ordering of the same member set. Public reads, verification, certificate generation, album ZIP export, and Provenance Player album manifests fail closed if the current membership no longer matches the stored origin seal.

Stage 1 must never reinterpret a private legacy WID-ALB collection as an editable draft, recompute its hash, reissue its WID, delete its certificate, unlink its Works, or overwrite historical evidence.

### Current relationship models have different meanings

| Existing model | What it means | Stage 1 treatment |
|---|---|---|
| Legacy `collections` + `songs.collectionId` | Legacy WID-ALB origin record / album surface | Preserve verbatim; show as **Legacy Sealed Album**. No new mutable membership writes. |
| `playlists` + `playlistTracks` | Mutable named listening path; membership-row identity; duplicate Works permitted | Preserve as **Named Playlist**. Use existing editor and export bridge. |
| `userCollections` + `userCollectionTracks` | Private personal archival folders | Keep in Archive; do not show as creator releases or named playlists. |
| `manifestedCollections` + `collectionTracks` | Public/forkable curation object with WID-COL | Keep separate from creator album/release language. |

---

## 2. Simplest creator-facing workflow

### One entry, two clear paths

The least disruptive first entry is the existing authenticated Collections tab:

```text
Creator Domain (owner view)
        │
        └── Manage Collections
                 │
                 ▼
      /archive?tab=collections
                 │
          ┌──────┴──────┐
          ▼             ▼
  Albums & Releases   Named Playlists
```

The same **Manage Collections** shortcut appears in `/manage`, but it points to the same destination. This avoids a third dashboard or a new competing catalog.

The workspace is a navigation/read-model unification. It links to specialized editors rather than duplicating their logic:

- **Releases** use a shared Studio presentation based on the existing Collection Studio grammar.
- **Named Playlists** use `PlaylistsPage` as the only full playlist editor.
- Archive stops embedding a second full playlist editor (`MyListsTab`) once a routed management action is in place.

### Creator-facing states and language

| Type and status | Meaning shown to the creator | Primary actions |
|---|---|---|
| **Draft Release** | `DRAFT RELEASE · PRIVATE` — “An editable sequence of your published Works. It is not yet a public edition and has no release Witness ID.” | Open draft, add published Works, remove, reorder, edit presentation, review & seal, discard. |
| **Sealed Edition** | `SEALED EDITION · WID-ALB2-…` — “This edition preserves its member Works and release order. To change membership or sequence, create a new edition.” | View edition, copy manifest if eligible, open companion player, create new edition, manage availability/presentation only where allowed. |
| **Legacy Sealed Album** | `LEGACY SEALED ALBUM · WID-ALB-…` — “This original membership record is preserved. Its presentation may be maintained; its members cannot be altered.” | Open legacy Studio, manage allowed presentation, view/verify, copy manifest if current public eligibility is satisfied, create a new modern draft from it. |
| **Named Playlist** | `PLAYLIST · LISTENING PATH` — “A flexible, editable sequence. It is not a release and does not issue a WID-ALB edition.” | Manage playlist, add/remove/reorder, play, share where public, copy/download manifest where eligible. |

The creator should never be asked to administer a permission for each selected track. A Draft Release selector searches their already-published Works and validates the whole selection server-side at save/seal time. An individual Work can be eligible, unavailable, or withdrawn; the workspace gives an actionable summary without turning each row into a rights form.

### Draft Release journey

```text
Collections → Albums & Releases → New Draft Release
     │
     ├─ Name, cover, description, intended visibility
     ├─ Search existing creator-owned Published Works
     ├─ Add several Works / remove / reorder with explicit Save Order
     ├─ Review readiness (nonempty, eligible members, WID and media requirements)
     └─ Seal & Publish
             │
             ├─ creator confirmation with immutable-snapshot explanation
             ├─ atomic edition + registry-event creation
             └─ a new Sealed Edition card with its own Edition WID
```

A creator who needs to alter an edition later chooses **Create new edition**. The platform clones its presentation and member selection into a new private Draft Release. The creator may then revise membership or sequence and seal a distinct edition. The earlier edition remains viewable and verifiable as historical evidence.

### Named Playlist journey

```text
Collections → Named Playlists → Manage playlists
     │
     ├─ Create / rename / describe / choose sharing and collaboration settings
     ├─ Search and add existing Works
     ├─ Remove and reorder membership rows
     ├─ Save an optional playlist version
     ├─ Play via existing PlayerContext
     └─ Copy Manifest / Download JSON when eligible
```

A playlist stays mutable and may contain the same Work more than once because each appearance has a distinct playlist-membership row. It never becomes an album merely because it is public or exported.

---

## 3. UI and routing design

### Owner routes

| Purpose | Recommended route | Reason |
|---|---|---|
| Collection hub | `/archive?tab=collections` initially | Existing authenticated, deep-link-capable surface; smallest reversible entry change. |
| Draft Release Studio | `/studio/release/:draftId` | Separates a mutable draft from legacy `/studio/collection/:id`; reuse Studio components, not legacy collection mutation contracts. |
| Legacy Sealed Album Studio | `/studio/collection/:id` | Remains owner-only and preserves Stage 0 membership guard. |
| Named Playlist editor | `/playlists` plus existing owner detail state | One canonical editor; remove/archive duplicated full editor rather than creating another. |
| Public legacy album | `/album/:collectionWid` | Existing canonical WID-ALB route; Stage 0 public and seal checks remain. |
| Public modern edition | `/album-edition/:editionWid` | A distinct public identity/read path for the immutable edition model; no ambiguity with legacy WID-ALB verification. |
| Public playlist | `/p/:shareSlug` | Existing playlist-specific share route. |

`/collection/:slug` remains the public forkable WID-COL curation route and must not appear under creator **Albums & Releases**. Personal `userCollections` remain Archive-only.

### Reuse without conflation

Refactor the existing Collection Studio presentation into reusable building blocks:

- collection metadata header and cover editor;
- existing-Work picker;
- sortable ordered Work list;
- PlayerContext play action;
- version/history presentation;
- loading, retry, diagnostic, and Archive-return frames.

Then give each adapter its own authority:

- **Legacy collection adapter:** only Stage 0-permitted presentation/order operations.
- **Draft Release adapter:** mutable draft membership and draft revision operations.
- **Sealed Edition adapter:** read-only membership snapshot with availability/presentation appendices only.

The UI should not hide an unauthorized edit control and wait for the server to reject it. Owner/editor/read-only state is visible before interaction; server enforcement remains authoritative.

### Interaction and accessibility requirements

1. Reorder starts only from a labelled drag handle—not the whole row. Reuse Collection Studio’s pointer and keyboard DnD foundation.
2. Keyboard reordering supports pick-up/drop, move, cancel, focus retention, and a polite live announcement for pickup, move, drop, save, and failure.
3. Reordering is local and marked dirty until **Save order**. A workspace switch with dirty work asks for an explicit keep/discard decision. A conflict preserves local order and offers Reload, Review, or Retry.
4. Every expandable list is a native button with `aria-expanded` and `aria-controls`; clickable non-button rows from `MyListsTab` must not set the new workspace pattern.
5. Loading, empty, unavailable, unauthorized, read-only, and error are distinct. A failed playlist query must never render as “No playlists yet.”
6. All dialogs return focus to their invoker. Use `role="status"` for ordinary progress and `role="alert"` only for actionable failures.
7. Respect reduced motion for sheet, reorder, auto-scroll, and list transitions. Do not replace visibility or focus feedback with animation.
8. Avoid hard-coded per-page bottom padding. The workspace uses the shared shell/player-safe-area geometry; no collection action may be hidden by the compact or expanded Global Player.

---

## 4. Proposed data relationships

### Why an additive model is necessary

The existing `collections` model is one-to-many through `songs.collectionId`. A Work can be in at most one legacy collection, and a legacy collection carries non-null WID/hash identity fields. It cannot truthfully represent a mutable modern Draft Release, nor can it preserve more than one sealed edition of the same conceptual release.

The minimum additive model is six tables. This is the smallest structure that separates mutable working state from immutable published evidence while preserving release lineage and historical artifacts.

```text
Creator
  ├── canonical Works (songs; existing WIDs/media/HAAI)
  ├── albumReleaseFamilies                     [new, lineage]
  │       ├── albumReleaseDrafts               [new, mutable]
  │       │       └── albumReleaseDraftTracks  [new, mutable ordered relations]
  │       └── albumEditions                    [new, immutable]
  │               ├── albumEditionTracks       [new, immutable snapshots]
  │               └── albumEditionArtifacts    [new, append-only artifacts]
  ├── legacy collections                       [unchanged WID-ALB v1]
  └── playlists → playlistTracks               [existing mutable listening paths]
```

### Proposed tables and invariants

| Table | Purpose | Required rules |
|---|---|---|
| `albumReleaseFamilies` | Stable conceptual lineage across editions | Creator-owned. Optionally links one legacy collection for observation only. Never replaces legacy identity. |
| `albumReleaseDrafts` | Owner-private mutable release workspace | Has `draft`, `publishing`, `published`, or `abandoned` state; title, cover, description, visibility intent, revision, and idempotency key. One active draft per family is enforced transactionally. |
| `albumReleaseDraftTracks` | Ordered relationship from a draft to existing Works | Contains membership-row ID, `draftId`, `songId`, position, and optional creator note. Unique `(draftId, position)` and `(draftId, songId)`: the approved v1 edition policy requires each Work once per Draft/Edition. |
| `albumEditions` | Immutable sealed release identity | Stores `releaseFamilyId`, source-draft ID, edition number, `editionWid`, algorithm/version, membership hash, full manifest hash, registry event ID, visibility/availability state, and timestamps. No mutation of core identity fields after seal. |
| `albumEditionTracks` | Ordered Work-at-seal snapshots | Stores edition ID, position, source Work ID if retained, Work WID snapshot, content/media hashes, creator/title/credit snapshot, and HAAI declaration snapshot. Live `songs` remains a convenience projection, never the historical edition truth. |
| `albumEditionArtifacts` | Certificates, canonical manifests, cover renditions, and related derived artifacts | Appends artifact URL/key, SHA-256, media type, generator/version, and manifest hash. It never overwrites a historical certificate pointer. |

A future `albumEditionAppendices` chain is deferred. It can carry availability changes, corrected display metadata, or later certificate renditions without mutating an edition’s core membership/manifest hash/WID.

### New-edition WID semantics

**Approved direction:** distinguish the legacy WID-ALB v1 algorithm from a modern edition seal.

- **Legacy WID-ALB v1:** existing SHA-256 of sorted Work WIDs. It proves membership multiset, not order, HAAI, title, cover, or media version.
- **Modern edition:** canonical, versioned full-manifest hash. It captures ordered membership occurrences, Work-WID snapshots, selected Work-content/media hashes, HAAI snapshots, release presentation, schema version, and edition number.
- **Identifier:** use the distinct prefix `WID-ALB2-…`, displayed in the product as an **Edition Witness ID**. This prevents legacy verification code from incorrectly treating a modern full-manifest seal as a v1 sorted-membership hash.

The `WID-ALB-…` legacy prefix is not reused for new editions. Canonical serialization, hashing, signature/event linkage, and verification are specified in `WID-ALB2-STAGE-1-TECHNICAL-VALIDATION-2026-10-20.md`.

---

## 5. API authority boundaries

### New protected owner APIs

These are proposed contracts, not implemented procedures.

| Domain | Procedure | Responsibility |
|---|---|---|
| Workspace | `collectionWorkspace.mine` | Typed, shallow card list for Draft Releases, modern Sealed Editions, legacy sealed albums, and named playlists. No raw media URLs or player state. |
| Drafts | `releaseDrafts.listMine`, `get`, `create`, `updateMeta`, `replaceMembership`, `reorderMembership`, `discard` | Owner-only mutable draft operations. Membership writes use membership-row IDs, exact-set validation, a revision precondition, and transactions. |
| Editions | `releaseDrafts.publish({ draftId, expectedRevision, idempotencyKey })` | The only Draft → Edition transition. Returns an immutable edition identity/readiness receipt. It never silently publishes member Works or mutates their WIDs/HAAI/media. |
| Editions | `releaseEditions.getOwner`, `getPublicByWid`, `createDraftFromEdition` | Owner/private and public/read-only edition projections. The clone creates a new draft; it never reopens a sealed edition. |
| Playlists | Existing `playlists.*` | Remain the named-playlist authority. Stage 1 should compose their list into the workspace, not fork their data model. |
| Manifests | `releaseEditions.copyProvenancePlayerManifest` | Owner-only manual export for a public eligible sealed edition. Reuse the current pure manifest builder, duplicate-WID safeguard, and revocable media gateway. |

### Publish transaction

`releaseDrafts.publish` is one transaction plus an after-commit/outbox side-effect boundary:

1. Lock the draft and its current membership. Confirm creator ownership and expected revision.
2. Revalidate every Work at commit time: creator-owned, eligible, canonical, non-deleted, unflagged, WID-bearing, and published/public where the edition policy requires it. Require audio and viable media separately for an audio release/manifest.
3. Canonicalize the versioned full manifest. Preserve order and repeated occurrences if allowed.
4. Insert edition, immutable track snapshots, a registry provenance event, and an **insert-only** edition WID record. A duplicate WID is idempotent only when every canonical value matches; it must never retarget a registry event.
5. Mark the source draft published/superseded in the same transaction.
6. Generate certificates, notifications, and feed work only through retryable after-commit/outbox processing. A derivative failure must not make the edition half-sealed.

### Authority and privacy rules

- The server proves creator ownership for every draft/edition mutation; client ownership flags and cached IDs are never authority.
- Every mutation scopes membership by both container ID and membership-row ID. No bare membership ID mutation.
- A sealed edition rejects add, remove, replace, and reorder. Revision means a new draft/new edition.
- Drafts are owner-only and have no public read, manifest, or certificate path.
- Public reads return opaque unavailable/not-found results for private, unlisted, foreign, incomplete, withdrawn, flagged, or malformed resources.
- Public playlist projection needs a purpose-built published/public/unflagged Work reader before Creator Domain starts promoting public named playlists. Existing playlist public reads do not yet share the hardened WID-ALB projection.
- Existing playlist collaboration roles require a separately explicit policy decision before Stage 1 promotes non-owner editing: the audit found accepted `viewer` and `editor` membership roles are not presently differentiated by current mutation checks. The first Stage 1 release should keep creator-owner administration primary rather than silently change collaborator rights.

### Cache and playback boundaries

Mutation success invalidates the narrow workspace, draft/edition, eligible-work selector, owner collection/list, and affected public read-model queries. It does not touch PlayerContext.

Entering Collections, filtering, selecting Works, saving/retrying a draft, sealing an edition, copying/downloading a manifest, or opening a companion tab must not create an audio element, reset a queue, pause playback, or replace the current track. Only explicit **Play** actions may call the existing singleton `usePlayer().playQueueAt` path.

---

## 6. Provenance Player interoperability

The approved companion bridge remains manual and reversible:

1. Eligible owner chooses **Copy Manifest** or **Download JSON** on a legacy public album, a modern eligible sealed edition, or a named playlist.
2. Living Nexus produces a `living-nexus-player/1` manifest in canonical order.
3. The manifest contains revocable Living Nexus gateway audio URLs, never raw storage URLs, signed URLs, session tokens, or download credentials.
4. The creator pastes it into Provenance Player’s existing LN manifest import.

The gateway rechecks current manifest eligibility at every fetch. Community-approved companion availability remains the baseline; individual withdrawal remains respected. A manifest is not an account connection, shared playback session, automatic player import, registry verification by the external app, or a download grant.

**Eligibility summary:** Draft Releases never export. Modern editions and legacy WID-ALB albums export only when their edition/album is currently public and composition-valid and every manifest item meets the established all-or-nothing manifest policy. Existing named playlist export continues to use that same all-or-nothing policy.

---

## 7. Compatibility and migration plan

### Legacy compatibility

1. Do not alter the legacy `collections`, `songs.collectionId`, `trackOrder`, `collectionWid`, `collectiveHash`, Work WIDs, media, HAAI declarations, certificate URLs, or historic PDFs.
2. Preserve existing `/album/:collectionWid`, legacy verification, public reads, certificate behavior, manifest export, and Stage 0 seal checks.
3. Modern release code never writes new membership through `songs.collectionId`; new drafts use `albumReleaseDraftTracks` and editions use `albumEditionTracks`.
4. Existing legacy collections can be visually linked to a release family as an observation, but only after a read-only reconciliation. A legacy mismatch remains `unverifiable`/fail-closed—not repaired or replaced.
5. Do not fabricate a generic registry event/WID for a legacy album that lacks a matching historical registry record.

### Additive migration sequence — proposed only

1. Create the six new tables, restrictive foreign keys where supported, non-cascading sealed-edition relationships, ordered-position indexes, edition uniqueness constraints, and migration journal entry.
2. Ship behind a feature flag with all existing legacy paths untouched.
3. Run a read-only reconciliation that classifies legacy collections as valid, unverified, or mismatched; it must not write corrections or reissue anything.
4. Route newly created releases only to Draft Release tables. Keep legacy album public routes separate until public Edition verification and rendering have equivalent tests.
5. At acceptance, present a unified creator read model that labels **Legacy Sealed Album** versus **Sealed Edition** honestly.

### Rollback

Rollback disables the Stage 1 feature flag and read routing; it does not delete drafts/editions, rewrite WIDs/hashes, or mutate legacy membership. A sealed edition stays preserved even if its UI route is temporarily hidden. A physical down migration is avoided once any real edition exists.

---

## 8. Implementation stages after approval

| Slice | Scope | Explicit exclusions |
|---|---|---|
| **1A — Workspace entry and vocabulary** | Creator Domain/Manage links to one Collections hub; Releases vs Playlists sections; typed status cards; eliminate duplicated playlist-management path; repair listed public route semantics. | No new schema; no new release lifecycle; no Work/WID changes. |
| **1B — Draft Release model** | Additive tables, private draft Studio adapter, existing published-Work selector, exact membership/reorder/revision APIs. | No edition publication, no legacy data conversion, no new audio engine. |
| **1C — Publish a Sealed Edition** | Atomic edition snapshot, immutable event/WID, public edition read/verifier, certificate artifact records, clone-to-new-draft. | No legacy WID mutation or auto-repair; no external automatic handoff. |
| **1D — Hardened presentation and parity** | Public Edition surfaces, Creator Domain release shelf, clear playlist routing, eligible manifest controls, keyboard/reduced-motion/recovery polish. | No manifesto/fork collection conflation; no playlist-to-album conversion. |

The order is intentional: do not make a draft look sealed, and do not make a new sealed edition public until its snapshot, registry, verification, and rollback story are complete.

---

## 9. Review gates and acceptance matrix

### Before implementation approval

- **Confirmed:** new editions use `WID-ALB2` full-manifest identity; legacy WID-ALB remains untouched.
- **Confirmed:** Draft Releases are private-only until explicit publication; a Draft has no public route, WID, certificate, or manifest.
- **Confirmed:** a v1 Draft/Edition requires unique Work membership. Named Playlists retain duplicate Work occurrences through their existing membership-row identity. Future edition track-slot support is separately deferred.
- **Confirmed:** creator-owner administration only for v1 Drafts/Editions. Existing creator attribution and Work relationships remain unchanged; collaborator editing is deferred.

### Required validation after implementation

| Area | Acceptance evidence |
|---|---|
| Work preservation | Build drafts/editions from existing published Works; prove no new Work row, WID, HAAI declaration, media asset, or creator relationship changed. |
| Stage 0 compatibility | Legacy private/unlisted containment, membership mutation hold, seal mismatch fail-closed, certificate/ZIP/manifest checks all remain green. |
| Draft integrity | Owner/guest/foreign denial; exact membership rows; duplicate/stale revision behavior; transactional rollback; no public draft route. |
| Publication | Idempotent concurrent publish; all eligibility failures atomic; immutable edition snapshot and registry binding; duplicate WID collision rejection. |
| Editions | Membership/order mutation denial; create-new-draft lineage; public/private/unlisted behavior; no historic certificate overwrite. |
| Playlists | Existing cross-container remove/reorder tests remain green; owner terminology/routing is clear; public track projection is filtered before public Creator Domain promotion. |
| Player continuity | Active audio, time, queue, and queue identity survive workspace navigation, save/retry, publish, manifest copy/download, and external companion launch. |
| Accessibility/mobile | Keyboard DnD and live status, focus restoration, 320–430px safe-area/player containment, reduced motion, zoom, failure/retry states, and no horizontal overflow. |
| Full platform | `pnpm check`, focused behavioral/API/UI tests, browser owner and visitor flows, `pnpm build`, `git diff --check`, complete `pnpm test`, and measured `pnpm refine`. |

---

## Alternatives rejected

- **Treat legacy private WID-ALB rows as Draft Releases:** weakens registry truth because they already carry historical identity fields.
- **Add membership to `songs.collectionId` for new drafts:** permits only one legacy-style album placement and cannot represent multiple editions or immutable snapshots.
- **Reuse named playlists as albums:** confuses mutable listening paths with sealed release identity.
- **Generate a new WID automatically on every membership edit:** creates a new identity without creator review, release readiness, or explicit publication.
- **Overwrite a legacy collective hash/WID on edit:** silently destroys historical evidence.
- **Expose a public manifest URL or raw media URL:** turns an owner-controlled manual export into an uncontrolled distribution surface.
- **Add a second player or external playback bridge:** violates canonical PlayerContext authority and does not solve collection organization.

## Affected design sources

- `client/src/pages/loop/LoopCreatorPage.tsx`
- `client/src/pages/loop/LoopManagePage.tsx`
- `client/src/pages/ArchivePage.tsx`
- `client/src/pages/CollectionStudioPage.tsx`
- `client/src/pages/PlaylistsPage.tsx`
- `client/src/components/MyListsTab.tsx`
- `client/src/components/domain/DomainRenderer.tsx`
- `client/src/contexts/PlayerContext.tsx`
- `server/routers/collectionStudio.ts`
- `server/routers/playlists.ts`
- `server/routers/songs.ts`
- `server/db/songs.ts`
- `server/utils/db.ts`
- `server/domains/collections/collectionCompositionSeal.ts`
- `server/domains/provenancePlayer/manifest.ts`
- `server/routes/provenancePlayerMediaRoute.ts`
- `drizzle/schema.ts`
- `docs/lnls/adr/COLLECTION-SEAL-COMPATIBILITY-STAGE-0-2026-10-20.md`

**No implementation, migration, deployment, or publication occurred while producing this design.**
