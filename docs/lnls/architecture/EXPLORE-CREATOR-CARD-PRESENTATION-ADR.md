# ADR — Explore Creator Card Presentation

**Status:** Accepted  
**Date:** 2026-10-02

## Decision

Refine only `/explore?view=creators` so each public Creator card uses its existing creator-associated `bannerUrl` as an optional background layer. The card keeps `profilePhotoUrl` exclusively as the profile portrait and never substitutes Work artwork (`songs.coverArtUrl`) for a Creator image.

The presentation uses a fixed card aspect ratio, a temporary readability scrim, clamped public Creator statements, and an action row anchored at the card bottom. When `bannerUrl` is absent or fails to load, the existing Living Nexus coal card surface remains the fallback.

## Evidence

- `server/db/users.ts#getAllCreators()` already returns `users.bannerUrl` together with `profilePhotoUrl`, biography, public count, and support eligibility context.
- `client/src/pages/ExplorePage.tsx` previously discarded `bannerUrl` while rendering only `profilePhotoUrl`.
- Support continues to fetch a single published Work only after a visitor requests Support.

## Boundaries

- No database, schema, tRPC procedure, cache, WID, provenance, identity, or Support-flow change.
- No new or generated imagery.
- No Work cover art used as a Creator background.
- No global Explore redesign.

## Accessibility and responsive behavior

- Background imagery is decorative; creator identity remains textual.
- The scrim improves contrast without modifying stored images.
- Creator statement remains visible and clamped to three lines across breakpoints.
- Support remains visible; the grid retains one, two, and three column breakpoints.

## Validation

- TypeScript and focused creator-card contract tests.
- Production build and diff integrity.
- Public `/explore?view=creators` browser rendering, including a card with a banner and a fallback card where available.
