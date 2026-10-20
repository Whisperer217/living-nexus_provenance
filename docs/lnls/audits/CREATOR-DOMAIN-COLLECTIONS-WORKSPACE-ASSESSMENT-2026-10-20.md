# Creator Domain Collections Workspace — Current State and Plan

**Date:** 2026-10-20  
**Status:** Audit complete. No application source, schema, data, WID, HAAI declaration, media asset, or playback state changed.  
**Scope:** One creator-facing workspace for organizing existing published Living Nexus Works into albums and playlists without re-uploading, re-registering, or duplicating media.

> **Historical status update — 2026-10-20:** The P0 issues recorded in this pre-implementation audit were remediated and checkpointed as Stage 0 (`7355ac02`): private/unlisted WID-ALB public containment, named-playlist cross-container mutation integrity, and WID-ALB origin-membership sealing. See `docs/lnls/adr/COLLECTION-SEAL-COMPATIBILITY-STAGE-0-2026-10-20.md`. The remaining Stage 1 lifecycle/design material is superseded by the review-gated `docs/lnls/adr/CREATOR-DOMAIN-COLLECTIONS-STAGE-1-DESIGN-2026-10-20.md`; no Stage 1 implementation is authorized by this note.

## Executive finding

Living Nexus already contains most of the requested building blocks, but they are split across incompatible relationship models and owner surfaces:

- **WID-ALB albums** use `collections` plus `songs.collectionId` and `songs.trackOrder`; their owner workspace is `/studio/collection/:id`.
- **Named playlists** use `playlists` plus `playlistTracks`; their management surface is `/playlists` and is duplicated in Archive.
- **Personal saved collections** use `userCollections`; they are private archival folders, not creator releases.
- **Manifested Collections** use WID-COL and `collectionTracks`; they are a separate forkable curation product and must not be silently treated as albums.

The requested workspace should unite the *management entry point*, not erase these distinct meanings. An album is a creator release relationship; a playlist is a mutable listening relationship. In both cases, member Works remain canonical, retain their WIDs, HAAI disclosures, creator attribution, permissions, cover art, and media records.

## Audit threads

| Thread | Status | Confirmed result |
|---|---|---|
| WID-ALB Collection Studio | Audited | Existing owner-only Studio already supports metadata, cover art, visibility, add/remove/replace existing Works, staged drag reorder, playback through PlayerContext, and version-history display. |
| Named playlists | Audited | Existing named playlists already support creation, existing-Work search/add/remove, play, sharing, collaboration records, and owner-only Provenance Player manifest export. |
| Creator Domain routing | Audited | Owner navigation is fragmented among `/manage`, `/studio/collection/:id`, `/playlists`, and Archive. The Loop Creator Domain does not offer one collection-workspace entry. |
| Relationship/schema authority | Audited | Albums and playlists are already relationships to existing Works; no Work duplication is necessary. However, WID-ALB membership and mutable identity need an explicit edition/publish rule. |
| Provenance Player parity | Audited | Named playlists and public owner WID-ALB albums already copy/download manifests and use the rechecked Living Nexus media gateway. WID-COL parity is a separate future decision. |
| Responsive/accessibility | Audited | Collection Studio has dnd-kit keyboard support but insufficient instruction; playlist management uses broken or pointer-only reorder in Archive, hover-only actions, and weaker recovery states. |

## Confirmed capabilities to preserve

### Albums — existing WID-ALB Collection Studio

`CollectionStudioPage` with `collectionStudio` procedures already provides:

- Server-enforced owner access through `requireOwnedCollection`.
- Read/edit of name, description, visibility, and cover artwork.
- Selection of existing creator Works; no new upload, media copy, or Work registration is involved.
- Add, remove, replace, and staged drag-and-drop ordering.
- Existing `PlayerContext` queue playback only through explicit actions.
- Current collection history display, authenticated recovery, Retry, and selected-collection Back behavior.
- Current WID-ALB display without a Work-WID or HAAI mutation.

The existing assignment contract intentionally excludes `collectionId` from Work-WID serialization. Album placement therefore must remain editorial organization, not a re-authorship event.

### Named playlists — existing relationship model

`playlists` and `playlistTracks` already provide:

- Creator-owned named playlists with name, description, artwork, public/private state, sharing, and optional collaboration.
- Search and select existing Works; add/remove without changing the Work row.
- Existing `copyProvenancePlayerManifest` for the owner, with Copy Manifest and Download JSON actions.
- Current member order and version-snapshot concepts.

### Provenance Player — existing safe bridge

The Provenance Player handoff is already deliberately manual and separate-tab:

1. The owner copies/downloads a `living-nexus-player/1` manifest.
2. The owner pastes it into **Provenance Player → Add → LN manifest**.
3. Living Nexus playback, queue, and singleton PlayerContext remain unchanged.

Manifest audio uses the rechecked Living Nexus gateway rather than raw stored media URLs. Under the community-approved companion-product policy, every manifest item still needs to be current public, published, audio, unflagged, WID-bearing, creator-attributed, clean-media, and not individually withdrawn from the companion surface.

## Confirmed safety and product gaps

### P0 — correct before widening collection management

1. **Private WID-ALB disclosure.** `songs.getPublicAlbum` resolves a collection by WID without verifying `visibility === "public"`; its member projection excludes only Deleted Works, not Draft/Unlisted/private Works. A guessed or leaked private collection WID can reveal collection/member information.
2. **Named playlist cross-list mutation.** `playlists.removeTrack` proves membership in a caller-supplied playlist, but the database delete is keyed only by `playlistTrackId`. `playlists.reorder` does not safely scope and validate a complete unique membership set. These are authorization/integrity defects, not UI shortcomings.
3. **WID-ALB identity ambiguity.** Current album add/remove/replace/reorder can change `songs.collectionId` and `trackOrder` without regenerating or versioning `collectionWid`/`collectiveHash`. A certificate can therefore describe the original membership while the current screen shows another membership.

These must be corrected before presenting a more capable public creator workspace. The user request strengthens creator control only if the public and registry boundaries remain honest.

### P1 — creator-experience gaps

- Collection Studio has no creator-facing create, archive/delete, restore, or explicit publish-confirmation flow.
- Visibility (`private | unlisted | public`) is the only current lifecycle control; there is no truthful collection `draft → published` state.
- Archive duplicates named-playlist management, while `/playlists` is the separate canonical manager. `MyListsTab` currently expects a track shape that does not match the server result, so reorder/remove behavior there is unreliable.
- Public creator playlist cards can route to `/playlist?id=...`, which is the visitor's personal saved list rather than the selected named playlist.
- Named playlists lack a direct routed owner detail view, robust metadata edit UI, keyboard-accessible reorder, and clear owner/member error recovery.
- Collection Studio actions need clearer keyboard reordering instruction, accessible cover-upload semantics, inline validation, and broad cache invalidation after mutation.

## Required architecture decision — drafts and album identity

The current `collections` record contains a non-null WID-ALB and `collectiveHash`. Treating an existing private collection as an editable draft while freely adding/removing Works would make that WID/hash ambiguous. The platform must not call that an immutable release identity.

### Recommended model: Draft release → sealed WID-ALB edition

1. A **Draft Release** is mutable and contains relationships to existing published Works. It has no WID-ALB claim.
2. The creator may name it, choose artwork, select/remove/reorder Works, and review publication readiness.
3. **Publish** validates that every member Work is public/published/eligible, calculates the ordered membership snapshot/hash, then issues a new WID-ALB for the release without changing any member Work WID, HAAI, media, or authorship.
4. Any later membership change is either a clear **unpublish back to draft** action before external release, or a new edition/release operation with a new collection identity. It is never a silent overwrite of a sealed collection WID/hash.

This requires a deliberate lifecycle migration or a purpose-built draft relationship model. It is not safe to fake with the existing `visibility` field alone. Existing legacy WID-ALB collections can remain readable and editable only under an explicit future **editorial collection vs. sealed release** policy; their historical identity cannot be silently reinterpreted.

### Rejected shortcut

Do **not** label a mutable private `collections` row as a draft if it already carries a WID-ALB/collective hash. It would look simple in the UI but weaken Registry truth.

## Approval-ready implementation plan

### Stage 0 — contain existing relationship and publication risks

No new product surface until these safeguards land:

- Route anonymous album reads through one visibility-aware public projection; public albums must be `visibility === "public"` and return only public/published/non-flagged member Works.
- Scope named playlist removal to both `playlistId` and membership row ID; validate reorder as the exact unique current membership set within a transaction.
- Enforce owner/editor/viewer collaboration roles consistently and block invitation/mutation contradictions when collaboration is disabled.
- Make current album membership mutations transactional; reconcile membership/order/count changes and only write history after success.
- Fix Album Studio cache invalidation for its list, picker, Archive, owner Work, and public projections.
- Add behavioral tests for owner/foreign access, private-read denial, exact reorder, no-op removal, cross-album move, count reconciliation, public Work filtering, and cache contract boundaries.

### Stage 1 — one owner Collections workspace

Create a single authenticated **Manage Collections** entry in the Creator Domain/`/manage` journey with two clear tabs:

- **Albums / Releases** — WID-ALB release records and draft releases. Existing albums open the existing Collection Studio; no second audio engine or second Album editor.
- **Playlists** — named listening paths. Existing `/playlists` management is routed or composed here rather than duplicated in Archive.

The workspace must show artwork, current track count, visibility/publication status, and clear type labels. It may link to—not duplicate—the existing specialized editors. Public visitor surfaces remain type-specific: album cards go to `/album/:collectionWid`; public playlist cards go only to `/p/:shareSlug`.

Archive remains a keeper/listener archive for personal saved lists, private `userCollections`, external imports, and witnessed records. It should not remain a competing named-playlist manager.

### Stage 2 — truthful album lifecycle

After the draft/edition model is approved:

- Add only the lifecycle state/data model required for a mutable Draft Release and sealed WID-ALB publish snapshot.
- Reuse existing Work selector, cover, visibility, Studio list, and publication validators.
- Generate no duplicate Work/media record and alter no member Work WID/HAAI declaration.
- Add publish confirmation and clear release-readiness feedback.

### Stage 3 — presentation and Provenance Player parity

- Reuse current owner manifest Copy/Download actions for eligible albums and playlists.
- Keep **Open in Provenance Player** as the existing experimental companion link, separately labeled; do not claim automatic import, account sync, WID verification by the external player, or shared playback.
- Add keyboard/drag instructions, live reorder status, visible-on-focus/touch actions, retry/error frames, focus-safe cover upload, and mobile bottom-player containment.

## Affected systems

| Layer | Existing authority to reuse | Planned change type |
|---|---|---|
| Works | `songs`, Work WIDs, HAAI fields, creator ownership | Preserve; never duplicate or re-register for grouping. |
| Albums | `collections`, `songs.collectionId`, `trackOrder`, Collection Studio | Contain current public/mutation risk; add truthful lifecycle only after decision. |
| Playlists | `playlists`, `playlistTracks`, `/playlists` | Repair integrity/authorization; centralize entry and UI rather than make a new playlist model. |
| Personal folders | `userCollections` | Preserve as private Archive-only curation; do not conflate with releases. |
| Provenance Player | existing manifest builder/gateway and UI helpers | Reuse for eligible owner album/playlist export; no automatic handoff. |
| Playback | `PlayerContext` | Preserve singleton player and queue; workspace actions never reset or replace them. |

## Validation plan

- Type safety: `pnpm check`.
- Focused router/helper tests for all Stage 0 ownership, visibility, membership, ordering, count, and public-projection rules.
- Focused Creator Domain/workspace contracts for the single entry point and type-correct public links.
- Browser checks as owner: create draft, select existing Works, reorder with pointer and keyboard, remove, recover on network failure, publish confirmation, manifest copy, and companion-link launch without interrupting audio.
- Visitor checks: private/unlisted album and named playlist denial; public album/playlist correct track filtering and canonical route.
- Desktop and narrow mobile checks for player-stack containment, focus rings, screen-reader labels, reduced motion, and no horizontal overflow.
- `pnpm build`, `git diff --check`, `pnpm test`, and measured `pnpm refine` after implementation.

## Baseline

`pnpm refine` measured **70/100 (C)**. Its typography, doctrine, accessibility, and animation findings are established platform-wide debt and are not attributed to this audit. The generated report is transient and will not enter the collection-workspace change set.

## Decision needed before code

Approve the recommended **Draft Release → sealed WID-ALB edition** model and the staged order above, or direct a different explicit collection-identity policy. This is the one decision needed to protect WID/registry truth while meeting the requested draft-and-publish experience.
