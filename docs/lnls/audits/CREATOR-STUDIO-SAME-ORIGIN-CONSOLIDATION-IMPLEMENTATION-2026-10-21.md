# Creator Studio — Same-Origin Consolidation Implementation Record

**Date:** 2026-10-21
**Governing decision:** [`CREATOR-STUDIO-EXTRACTION-ASSESSMENT-2026-10-21.md`](../adr/CREATOR-STUDIO-EXTRACTION-ASSESSMENT-2026-10-21.md), checkpoint `e849de3b`
**Status:** Implemented and validated as a development-only checkpoint candidate. **Not deployed or published.**

## Delivered boundary

`/studio` is now the canonical, lazy-loaded **Creator Studio** home within the existing `www.livingnexus.org` application origin. It is a frontend composition surface, not a new product backend.

It preserves one authoritative Living Nexus server, database, registry, WID model, Work editor, session mechanism, storage boundary, and Global Player. No server route, tRPC procedure, schema, migration, credential, cookie, CORS rule, media permission rule, PlayerContext behavior, or database record was added or changed in this scope.

The legacy `CreatorStudioPage` source remains preserved for later review, but its unreachable lazy import was removed from `App.tsx`. The production build now emits the new `CreatorStudioHome` lazy chunk (16.37 kB, 4.21 kB gzip) and no separate legacy `CreatorStudioPage` chunk.

## Creator-facing workflow

A signed-in creator can enter the new hub at `/studio` from either:

- the owner action group on their canonical `/creator/:id` Creator Domain; or
- the existing `/manage` page.

The hub provides clear destinations rather than recreating their behavior:

1. **Register a Work** opens the canonical registration flow at `/manifest`.
2. **Collections** opens `/creator/collections`, the one existing owner workspace for private Draft Releases, preserved legacy WID-ALB albums, and named playlists.
3. **Identity & Domain** opens the canonical Profile identity surface.
4. **Archive Export** opens the existing owner data-export path.
5. **Creator Payouts** opens the canonical `/settings/payouts` Stripe Connect path.
6. **Archive** opens the existing historic collection/recovery surface.
7. **Recent Works** uses the authenticated `songs.mySongs` read model and opens the existing `CreativeDrawer` through `WorkEditorContext`; it does not introduce a second metadata mutation path.
8. **Provenance Player** remains an external experimental companion link. It opens in a new tab and explicitly states that it does not synchronize accounts, verify WIDs, or replace the Living Nexus queue.

## What is functional without WID-ALB2

The following existing systems remain usable from this Studio without issuing a new album edition identity:

- creating and editing private Draft Releases from already registered, published audio Works;
- preserving and viewing legacy WID-ALB records, including the existing safe recovery path for a legacy membership/seal mismatch;
- managing existing named playlists, including intentional duplicate Work occurrences;
- exporting approved individual-Work, named-playlist, and public canonical-album `living-nexus-player/1` manifests through the existing owner-authorized, revocable media gateway;
- canonical Work registration, owner metadata editing, archive export, Creator Domain identity editing, and creator payout setup.

The `WID-ALB2` creator signing-key lifecycle, sealing, edition publication, public edition projection, and edition manifest export remain deliberately disabled. This scope did not alter that security hold.

## Visual and responsive evidence

The new hub uses the existing Cathedral Dark palette and typography, rounded relationship cards, visible keyboard focus styles, responsive grid collapse, `min-w-0` containment, and reduced-motion-safe CSS transitions.

- A 375×812 local mobile capture showed the Creator Studio heading and cards contained in a single readable column without horizontal overflow.
- The initial desktop full-page capture was obscured by the pre-existing "What’s New" modal, not by Studio content. A subsequent isolated-browser route inspection verified that `/studio` resolves correctly to the explicit signed-out boundary after `auth.me` completes, with no lingering `Loading Creator Studio` element.
- An authenticated local creator-session canary was not performed in this environment. Server-derived owner queries and the direct edit path are covered by focused contracts; execute that canary after any future publication before treating authenticated Studio interaction as production-accepted.

## Validation

| Check | Result |
|---|---|
| TypeScript | `pnpm check` passed |
| Focused Studio / Creator Domain / Collections contracts | 3 files / 16 tests passed |
| Full regression | 146 files / 903 tests passed; 1 intentionally skipped |
| Production build | `pnpm build` passed |
| Bundle boundary | `CreatorStudioHome` emitted; unreachable legacy CreatorStudioPage chunk absent |
| Diff integrity | `git diff --check` passed |
| Local guest browser | `/studio` resolved to a clear sign-in boundary; no private owner data was rendered |
| Mobile local visual check | 375×812 Studio hierarchy rendered in one contained column |
| Refinement | `pnpm refine` measured 70/100 (C), the existing broad baseline; it reported pre-existing typography/doctrine debt outside this bounded consolidation |

## Concept reference received

The submitted Creator Studio concept art is retained as the next visual refinement reference. It calls for a more familiar identity card, compact primary action tiles, and a Collections-first overview. This consolidation deliberately establishes the functional same-origin boundary and route composition first; it does **not** claim to have reproduced the concept art pixel-for-pixel or altered the approved Collections semantics.

## Remaining risks and next permitted work

1. Perform an authenticated owner browser canary after a separately approved publication: `/studio` entry, recent-Work edit, Draft Release/playlist links, export, identity, payouts, and return paths.
2. Keep WID-ALB2 signing and publication held until a separate threat-model, recovery, and long-term verification decision authorizes the new key lifecycle.
3. If the illustrated Studio visual language is approved, refine the same `/studio` frontend module incrementally while preserving the existing destinations and queries.
4. A separately deployed `studio.livingnexus.org` remains unimplemented and must follow the governing decision’s Studio BFF, exact audience, Creator Gateway, and cross-origin security gates.

No deployment, publication, registry rewrite, WID change, media migration, separate database, second backend, account synchronization, or Global Player modification occurred.
