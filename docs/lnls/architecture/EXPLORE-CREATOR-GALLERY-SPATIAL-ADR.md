# ADR — Explore Creator Gallery and Spatial Discovery

**Status:** Proposed — awaiting implementation approval  
**Date:** 2026-11-06  
**Scope:** `/explore` only  
**Decision owner:** Living Nexus stewardship

## Context

The current Explore page is functionally sound but presents discovery as a mostly linear surface. The supplied design references establish a more distinctive spatial model:

```text
[Primary Navigation] [Creator Gallery] [Explore / Selected Creator Works]
```

The Creator Gallery is a secondary visual world. It presents existing Creator Domains as large artwork-led destinations while the right-hand Explore surface remains the working discovery area. The Global Player remains persistent and authoritative below this composition.

The redesign must preserve the current Registry, Creator, Work, WID, media, and playback authorities.

## Decision

Transform only the Explore page into a three-zone responsive composition:

1. **Primary navigation zone** — retain `LeftRail` as the sole navigation authority.
2. **Creator Gallery zone** — add an Explore-owned, collapsible secondary rail using the existing `profile.allCreators` projection and original creator artwork.
3. **Explore zone** — retain existing Work discovery, search, sorting, pagination, creator filtering, and queue actions.

Selecting a creator changes the Explore context and selected visual state. It does not create a new Creator Domain, mutate a Work, change a WID, or reset playback.

## Product ontology

- A **Creator Domain** is a visual destination, not a social-feed card.
- A **Work** remains a registered manifestation with its canonical Work ID and Witness ID.
- The **Gallery** is a navigation index of Creator Domains.
- **Explore** is the public discovery/work surface.
- **Global Player** remains the persistent listening authority.
- Artwork is identity-bearing presentation, not a replacement for provenance metadata.

## Existing authorities to reuse

| Concern | Existing authority | Treatment |
|---|---|---|
| Creator directory | `trpc.profile.allCreators` | Reuse; no new endpoint initially |
| Creator identity | `CreatorCard` patterns and canonical creator IDs | Reuse identity primitives; align visual grammar |
| Work discovery | `trpc.songs.discoverInfinite` and `exploreIndex` | Reuse unchanged |
| Creator filtering | `selectedCreatorId` in `ExplorePage` | Bind gallery selection to existing state |
| Work playback | `PlayerContext.playQueueAt` / existing row actions | No new audio or queue |
| WIDs | Existing `row.song.witnessId` and Verify routes | Keep visible/read-only on Work surfaces |
| Main navigation | `LeftRail` and `MainLayout` | Do not replace |
| Mobile drawer | Existing unified LeftRail mobile behavior | Do not create a second mobile nav |
| Bottom stack | Existing Global Player and viewport-layer tokens | Gallery must reserve content space |

## Visual contract

### Desktop

- Primary rail remains narrow and fixed.
- Creator Gallery appears as a secondary, vertically scrollable panel beside the primary rail.
- Explore occupies the main content area and remains independently scrollable.
- Gallery width is bounded with `min()`/responsive grid logic rather than fixed pixel image heights.
- Creator artwork uses a stable portrait/gallery ratio and `object-fit: cover`.
- Creator name, handle/domain cue, and Work count appear below the artwork.
- Selected creator receives a gold rim, restrained halo, and accessible selected state.
- No biography or long creator statement is placed over artwork.

### Mobile

- The secondary gallery becomes a horizontally scrollable snap rail or an explicit drawer, depending on measured width.
- The primary hamburger/LeftRail remains the only navigation drawer.
- Creator cards maintain minimum touch targets and do not compete with the Global Player.
- The selected creator summary stays above the Work list; long text is clamped.
- Bottom content reserves the existing player/navigation stack.
- No translucent overlay may make artwork, title, or WID unreadable.

### Typography and materials

- `Cinzel`/display role for overlines and identity labels.
- `Cormorant Garamond`/editorial role for gallery titles and section headings.
- Existing `ln-*`, `museum-card`, `museum-pan-row`, `track-card-glow`, and WID utilities before creating new utilities.
- Gold is reserved for selection, active state, provenance, and meaningful action—not every border.
- Existing creator imagery is used as supplied by the canonical projection; concept imagery is not imported as production content.

## Proposed affected files

### Primary

- `client/src/pages/ExplorePage.tsx`
- `client/src/index.css`
- `server/tests/exploreCreatorDirectory.contract.test.ts`
- `server/tests/exploreCreatorPresence.contract.test.ts`

### Conditional, only if composition cannot remain local

- `client/src/components/explore/CreatorGalleryRail.tsx` — extracted only if it reduces duplication and remains Explore-owned
- `client/src/components/layout/MainLayout.tsx` — only for a route-scoped layout hook; not for a second navigation authority

### Documentation

- this ADR
- a lessons-log entry after validation

## Explicit non-goals

- no database schema or migration
- no creator, Work, WID, manifest, media, or artwork-record mutation
- no new creator relationship model
- no second playback engine or audio element
- no Global Player implementation in this first Explore slice
- no route retirement
- no production deployment or publication
- no replacement of `LeftRail`
- no creator-specific catalog fetch per gallery card
- no download action in gallery cards

## Thread map

| Thread | Status | Scope |
|---|---|---|
| T1 — Existing authority audit | Complete | Explore, Creator, Work, WID, PlayerContext, LeftRail mapped |
| T2 — Creator Gallery composition | Proposed | Additive Explore-owned rail |
| T3 — Explore context binding | Proposed | Reuse `selectedCreatorId` and current Work query |
| T4 — Mobile spatial behavior | Proposed | Horizontal/drawer presentation; preserve LeftRail and bottom stack |
| T5 — Global Player redesign | Deferred | Separate later slice |
| T6 — Registry/database changes | Not required | Must remain untouched |

## Implementation sequence after approval

1. Add shared Explore spatial shell and semantic classes.
2. Add creator gallery rail using existing `creators` memo and stable creator projection.
3. Bind card selection to `selectedCreatorId`; retain explicit “View Domain” navigation.
4. Move or adapt the existing search/sort controls so they remain visually associated with the Explore zone.
5. Preserve existing list/creator modes; do not remove them until the spatial composition is validated.
6. Add loading, empty, error, keyboard, and reduced-motion states.
7. Run focused contracts, TypeScript, full tests, production build, refinement, and true narrow viewport checks.
8. Save an unpublished checkpoint only after all gates pass.

## Validation gates

### Functional

- creator cards render existing artwork and canonical IDs
- creator selection filters the existing Work index
- creator profile navigation remains canonical
- Work playback starts only through existing PlayerContext actions
- selecting a creator does not alter current audio, queue, or comments target
- WID links remain available on Work rows/cards
- search, sort, refresh, pagination, and error retry still work

### Accessibility

- gallery is keyboard navigable
- selected creator exposes `aria-current` or equivalent selected state
- all artwork has meaningful alt text or intentional decorative treatment
- focus-visible state is clear against dark surfaces
- reduced-motion disables scale/ambient transitions
- touch targets are at least 44px

### Responsive

- 1440px desktop
- 1024px tablet
- 768px intermediate
- 390px mobile
- 375px mobile
- 360px narrow mobile

Check no horizontal overflow, no artwork bleed, no hidden final Work row behind the Global Player, and no conflict with the existing hamburger drawer.

### Quality

```bash
pnpm check
pnpm test
pnpm build
pnpm refine
git diff --check
```

The refinement score must not decrease from the current 71/100 baseline.

## Rollback

Revert the Explore-only implementation commit or checkpoint. No database rollback is required because this slice has no schema or data writes. Existing `/explore` list/creator modes, `LeftRail`, Creator Domain routes, Global Player, and Work/WID records remain intact.

## Approval request

Approve the **Explore-only Creator Gallery spatial slice** described above. Approval does not authorize the separate Global Player Mini/Expanded/Cinematic redesign, route retirement, migrations, production writes, deployment, or publication.
