# ADR — Paginated Registry Discovery & Deferred Domain Loading

**Status:** Accepted for local implementation  
**Date:** 2026-10-01  
**Scope:** Explore Works index, playlist work search, and `CreatorDomainShell` owner data loading.

## Context

The Explore performance audit measured a 13.6 MB `songs.exploreIndex` response, 67,415 DOM nodes, and 2,141 image elements in list mode. The source requested 700 works then reused the complete records across multiple presentation sections. `CreatorDomainShell` also began full owner-work and analytics requests before a creator selected those sections. The playlist add-work input queried the public registry for every qualifying keystroke.

## Decision

1. **The full Works index uses the existing cursor-based `songs.discoverInfinite` registry procedure.**
   - It loads a bounded first page and explicit additional pages.
   - It supports creator, search, order, randomization, and seed constraints at the database boundary.
   - The full registry remains route-accessible and progressively reachable; curated discovery rows are not a replacement for the index.

2. **`songs.exploreIndex` is retained only for small curated discovery rows.**
   - Each curated section is bounded.
   - It no longer transports the full Works index.

3. **Playlist work search uses a debounced, query-versioned request boundary.**
   - Input waits 300 ms before querying.
   - The UI accepts results only when the raw input and debounced snapshot agree, so an older response cannot replace a newer intent.
   - Mutating a playlist invalidates both its detailed view and the owner playlist list.

4. **`CreatorDomainShell` loads full owner works only for Works/Drafts and analytics only for Analytics.**
   - The Home section uses a count-level public summary rather than eagerly reading the owner’s complete work library or analytics record.
   - Public creator works are loaded only when the visitor opens Works.

## Architectural alignment

| Layer | Effect |
|---|---|
| Identity | Creator filtering and handle-aware sort remain explicit in the Registry request. |
| Manifestation | Smaller discovery payloads allow each visible work to render with intentional space and responsiveness. |
| Relationship | Playlist search continues to use canonical Registry results; no parallel index is introduced. |
| Registry | Cursor pagination keeps every published work discoverable without replicating the canonical record in several payload buckets. |
| Stewardship | Deferred owner data avoids spending creator/device resources on panels not being viewed. |
| Legacy | The complete registry is preserved as a reachable index rather than curtailed by an editorial cap. |

## Alternatives rejected

| Alternative | Reason rejected |
|---|---|
| Hide excess works behind a fixed horizontal slider | Conceals the registry rather than making it progressively accessible. |
| Client-side virtualization over a 700-work response | Reduces DOM nodes but leaves the 13.6 MB network/database problem intact. |
| A new search index for playlist lookup | Duplicates the canonical Registry search boundary and custody logic. |
| Keep Domain Home metrics by eagerly fetching full owner Works/analytics | Retains the avoidable eager-load behavior. |

## Affected files

- `server/db/songs.ts`
- `server/routers/songs.ts`
- `client/src/pages/ExplorePage.tsx`
- `client/src/pages/PlaylistsPage.tsx`
- `client/src/pages/CreatorDomainShell.tsx`
- targeted contract/unit tests under `server/tests/`

## Data and rollback

No schema migration or production data mutation is required. Rollback is a source-only revert of the input-contract extension and three client query-gating changes.

## Verification

- Cursor contract tests verify bounded page probing and server-side filters/order arguments.
- Surface contracts verify Explore no longer asks for 700 rows or binds the full index to `exploreIndex`.
- Playlist and domain-shell contracts verify debounce/version gates and section-specific queries.
- TypeScript, focused tests, production build, browser network inspection, and refinement run before completion.

## Release boundary

This ADR authorizes local implementation and validation only. It does **not** lift the project-wide checkpoint, deployment, or publishing hold.
