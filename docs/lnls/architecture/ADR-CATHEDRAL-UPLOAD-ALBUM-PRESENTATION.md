# ADR — Creative Cathedral, Music Register, and Album Presentation Refinement

**Status:** Approved for implementation and publication  
**Date:** 2026-09-03  
**Scope:** Manifestation and Relationship layers; Registry authority unchanged

## Context

The Creative Cathedral currently opens as a narrow inline desktop panel with compact typography and a translucent background. The Music Register allows long selected filenames and extracted titles to exceed their intended visual hierarchy, while its artwork control does not clearly distinguish embedded, uploaded, generated, or remixed imagery. Existing Living Nexus album infrastructure already links songs to collections and exposes public album data through creator-domain routes, but the creator-domain gateway presents Albums as one module card rather than a prominent catalog relationship.

## Decision

Creative Cathedral will retain its compact closed launcher but gain an explicit **Expand workspace** control on desktop that opens a larger, opaque, scroll-bounded stewarding surface. Mobile will retain the existing full-height Sheet pattern. Typography and contrast will move to the established Cathedral type scale without changing consent, model invocation, selection, local-form application, or private persistence authority.

Music Register filenames and preview titles will use bounded wrapping and overflow-safe containers. Artwork will display a human-readable source badge and a dedicated **Replace artwork** control. These are presentation-state changes only; the existing embedded/uploaded/generated/remixed `visualSource` values and registration payload remain unchanged.

Album presentation will reuse the current collection linkage and creatorHub data. The Albums module will become a visually prominent creator-domain gateway with larger artwork previews and explicit album/track relationship language. No schema, album WID, track ordering, visibility, or provenance behavior changes are authorized.

## Alternatives Rejected

| Alternative | Reason rejected |
|---|---|
| Make Cathedral permanently large | Increases page density and removes creator control over workspace attention. |
| Add a new album schema or song linkage | Existing `collectionId`, collection WID, routes, and creator APIs already provide the required relationship. |
| Store a new artwork-source field | The registration model already carries `visualSource`; this request is clarity at the preparation surface, not new authority. |
| Truncate all filenames to one line | Hides creator evidence. The chosen pattern preserves the full value through bounded wrapping/title text while protecting layout. |

## Affected Surfaces

| Surface | Primary files |
|---|---|
| Creative Cathedral | `CreativeCathedralWorkspace.tsx`, `CathedralSuggestionCard.tsx`, `CathedralContextGate.tsx`, `CathedralRecordPanel.tsx` |
| Music Register | `MusicEnvironment.tsx` |
| Creator Domain | `CreatorDomainHub.tsx` |
| Contracts | `creativeCathedral.contract.test.ts` and focused presentation contracts |

## Authority and Risk Controls

The Creative Cathedral remains creator-private and non-binding. It cannot register, issue a WID, publish, or write provenance. Register and Save remain the only Work mutation authorities. Album visibility continues to use existing public collection projections. UI changes must preserve keyboard access, mobile sheet bounds, filename accessibility, and the distinction between local preparation state and authoritative Work state.

## Validation and Rollback

Validation requires focused contracts, `pnpm check`, production build, full Vitest accounting, refinement baseline comparison, and desktop/mobile screenshots. Rollback is a normal managed checkpoint rollback of this combined release; no database rollback is required because this refinement adds no schema or data migration.
