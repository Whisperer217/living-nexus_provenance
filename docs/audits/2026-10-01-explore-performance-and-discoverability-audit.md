# Explore Performance, Discoverability & Cache Audit

**Date:** 2026-10-01  
**Scope:** `/explore`, the current refinement report, creator-facing query surfaces, and playlist-management query paths.  
**Status:** Audit only — **no source code, database, checkpoint, deployment, or publication change was made.**

> **Primary finding:** The list-mode Explore page is constrained by **over-fetching and over-rendering**, not by its route chunk. A production-build browser run received a 13.6 MB Explore API response, built 67,415 DOM nodes, and created 2,141 image elements on one visit. That cost materially delays the last observed largest-contentful-paint candidate to 9.656 seconds.

## Executive decision

Do **not** start with a cosmetic typography pass or a server cache alone. The first repair must change the discovery data contract and rendering boundary:

1. Keep the registry complete and discoverable.
2. Stop sending and mounting the entire registry repeatedly in every curated section.
3. Make the full Works index a paginated/virtualized registry surface, while curated sections remain deliberately bounded selections.
4. Cache the bounded section payloads on the server with explicit invalidation when public registry data changes.

That preserves the platform's principle that every work can be found. It does **not** turn the registry into an opaque feed or hide works behind an arbitrary slider.

---

## Method and evidence limits

### What was measured

- Ran the project refinement scanner: `pnpm refine`.
- Read the current Explore client and router implementation.
- Started an **isolated local production-build audit server** against the existing environment, then inspected the page through the browser Performance API.
- Compared `/explore` list mode against `/explore?view=creators`.
- Inspected the query enablement, stale-time, and mutation-invalidation paths in creator and playlist surfaces.
- Examined the current production output under `dist/public/assets`.

### Important limits

- This is one cold browser run in the current sandbox, not field RUM from consumer devices or the deployed CDN edge.
- The creator-domain and playlist-management cache findings are source-backed; authenticated browser behavior was **not** exercised because the audit browser had no creator session.
- Cross-origin CloudFront images reported `0` transfer size to the Performance API. That is a timing-visibility limitation, **not** evidence that the images cost no bytes.
- Browser load-event timing ends before later asynchronous data/render work. For this page, LCP and long tasks are more informative than `loadEventEnd` alone.

---

## Measured production-build baseline

| Metric | List-mode Explore | Creator directory mode | Meaning |
|---|---:|---:|---|
| DOM content loaded | 1.839 s | 0.958 s | Creator mode reaches initial DOM substantially sooner. |
| Load event | 2.055 s | 1.184 s | Does not include all post-load query/render work. |
| Explore page API body | **13,600,748 B encoded** | No `songs.exploreIndex` request | The page-specific response dominates payload cost. |
| Explore API duration | 1.771 s | n/a | Before the full render and image work settle. |
| DOM nodes | **67,415** | 611 | List mode mounts roughly 110× as many nodes. |
| Image elements | **2,141** | 20 | `loading="lazy"` reduces image fetches, but not image DOM creation. |
| Work links | 1,440 | n/a | Evidence of repeated work-card rendering. |
| Buttons | 4,270 | n/a | Interaction controls scale with the whole pre-rendered registry. |
| Cumulative layout shift | **0.202** | Not captured separately | Above the 0.10 “good” threshold; two large post-data shifts were observed. |
| Last LCP candidate | **9.656 s** | Not captured separately | A late CloudFront artwork image became the final observed candidate. |

### Long main-thread tasks observed in list mode

The browser reported several long tasks after data arrival, including **2,248 ms**, **1,455 ms**, **633 ms**, **554 ms**, and **505 ms** tasks. This confirms that the issue is not only database/network time; React/DOM work is also blocking the browser.

### Browser delivery footprint

| Delivery category | Observed browser transfer | Static build reference | Assessment |
|---|---:|---:|---|
| JavaScript requested for Explore | 348,109 B | Main `index` bundle: 1,169,263 B raw / 326,843 B gzip; Explore route chunk: 47,158 B raw / 11,454 B gzip | The route is lazy-loaded and its own chunk is modest. |
| CSS | 55,719 B | Main CSS: 383,570 B raw / 57,001 B gzip | Not the dominant current bottleneck. |
| Explore API payload | **13,600,748 B encoded** | n/a | About 39× the observed JavaScript transfer. This is the priority. |
| CloudFront images | Not measurable through this performance context | n/a | Late image LCP indicates that image sizing/priority still needs a follow-up. |

The code split is working: `ExplorePage` is lazy-loaded in `client/src/App.tsx`. The large cost comes after the route becomes available.

---

## Root cause: a full registry is requested and repeated in several page sections

### Current request shape

`client/src/pages/ExplorePage.tsx` asks `songs.exploreIndex` for a maximum of **700** works at lines 55–62. The server then runs six parallel branches in `server/routers/songs.ts` at lines 286–292:

| Explore bucket | Current maximum returned |
|---|---:|
| Featured | 8 |
| New This Week | 20 |
| Music / full Works index | 700 |
| Recently Witnessed | 700 |
| Hidden Gems | 700 |
| Trending | 20 |
| **Possible rows in one response** | **2,148** |

The full, canonical `FeedRow` records are returned for each branch. The same work can therefore be sent multiple times in one response, then become separate card instances in the UI.

### Current render shape

- `SupplementalRow` renders **every** returned row in each section (`ExplorePage.tsx`, lines 326–374).
- `AllWorksListView` separately renders the full music collection again (`ExplorePage.tsx`, lines 415–467).
- Every supplemental card derives its queue position with `audioTracks.findIndex(...)` inside a map (`ExplorePage.tsx`, lines 348–372). At 700 rows this is a secondary O(n²) CPU cost per large section.
- Card images use `loading="lazy"`, which is good, but the browser still constructs the elements and controls for every card.

### Result

The page is technically presenting “everything,” but it does so by duplicating the same work inventory across three high-volume discovery rows and the complete index. That conflicts with intentional discovery: the user sees repeated objects, while the browser pays the cost of rendering each repetition.

---

## Required performance architecture

### P0 — Replace monolithic Explore index delivery

**Keep discovery complete, but distribute it by purpose.**

| Surface | Recommended contract | Initial display | Continuation |
|---|---|---:|---|
| Curated sections: New, Trending, Recently Witnessed, Hidden Gems | Purpose-built `DiscoveryCard` projection with only card/playback fields | 8–24 works per section | A named, routeable registry view—not an unbounded row mounted in place |
| Full Works index | Reuse existing `songs.discoverInfinite` capability (`server/routers/songs.ts`, lines 219–240) | 24–60 rows | Natural vertical scroll/load-more with row virtualization |
| Creator-filtered full index | Same cursor contract plus creator filter | 24–60 rows | Preserve creator search/sort in query state |
| Search / natural-language discovery | Existing `/search` boundary | Result set only | Maintain its explicit explanation and retry behavior |

**No-slider principle:** curated rows may show a finite editorial selection, but the full registry must have a clear “all works” route and natural continuation. This is not hiding the archive; it is preventing the archive from being rendered four times in one document.

### P0 — Narrow the discovery projection

The card/list discovery endpoints should return only what Explore renders or needs to play:

- work ID, title, content type, genre, duration, registration date
- WID
- cover-art thumbnail URL
- playable media URL only where playback needs it
- creator ID, stable handle/display name, creator image
- low-cost counters/status that are actually displayed

Keep long description, lyrics, gallery JSON, provenance detail, and other rich work fields for work-detail / verification requests. The canonical record remains intact; the Explore projection becomes intentionally narrow.

### P0 — Server cache the public section payloads

Client caching already exists: Explore uses a two-minute `staleTime` and disables refetch-on-focus (`ExplorePage.tsx`, lines 60–63). That protects a single browser session but does **not** protect the database across visitors.

Implement a small server-side cache keyed by:

- section name
- creator filter, when present
- sort/rotation bucket
- public-registry version or invalidation generation

Use a short TTL (for example, 60–300 seconds) and invalidate or bump the generation when a public work is published, edited in a discovery-visible field, or deleted. Do **not** cache user-specific like state with the public payload.

**Important:** randomization currently begins with a new client seed. A server cache needs a stable, time-bucketed rotation seed rather than caching each visitor’s unique random request.

### P0 — Virtualize the full Works list

Even after cursor pagination, use a virtualized list for the high-volume registry view. This keeps keyboard navigation, direct links, global-player actions, and a naturally scrollable catalog while holding the DOM near the visible window instead of tens of thousands of nodes.

### P1 — Image delivery

Card artwork is displayed around 160–192 px wide. After verifying available CDN image-transform capabilities, add:

- responsive thumbnail derivatives / `srcset`
- explicit image dimensions or aspect ratio reservation
- priority only for the true first visible artwork
- lazy loading for the remainder

This should reduce late image LCP and CLS. It must be tested with real CloudFront headers before claiming byte savings.

---

## Discoverability and typography debt

### What the fresh refinement scan found

The current refinement report scores `ExplorePage` **74/100** doctrine compliance and **70/100** page score. It passes trust, attribution, stewardship, and permanence signals, but fails:

| Finding | Evidence | Design implication |
|---|---|---|
| Discoverability | Creator bio, origin story, and artist statement are not immediately available | The work row establishes identity, but not enough of the creator’s testimony. |
| Support | No visible Support Creator equivalent was detected on the Explore surface | Discovery does not provide one obvious way to sustain a creator. |
| Typography | The debt ledger records 42 hard-coded text sizes; the fresh drift scan specifically surfaced micro-size usages at 9–11 px | The highest-traffic discovery page is still using implementation-level size choices rather than reusable hierarchy tokens. |

### Important count clarification

The debt ledger’s existing `DEBT-003` records **42** hard-coded Explore text sizes. The latest drift extractor specifically enumerated eight current `text-[9px]`, `text-[10px]`, or `text-[11px]` instances. These are different detector views, so this audit does **not** claim that either count is the complete total. The verified conclusion is that the page remains token-inconsistent and uses microtype in repeated card/chrome surfaces.

### Recommended refined interaction

1. **Creator presence without clutter**
   - Keep title, handle, WID, and media action in a compact work row.
   - When a creator filter is active, show a persistent creator focus strip: avatar, stable handle, one-line bio/origin excerpt, and one obvious Support Creator action.
   - In directory mode, give each creator card a visible, low-friction support/follow action; do not make users open a second page just to find how to sustain the person whose work they are viewing.

2. **Preserve provenance clarity**
   - Keep the WID as a compact, scannable identity marker.
   - Add one direct evidence affordance (“View record” / “View provenance”) rather than expanding every card with implementation detail.

3. **Replace ad hoc microtype systematically**
   - Establish semantic tokens for micro-label, metadata, body, card title, section title, and page title.
   - Apply them first to the visible Explore control bar, WID/type badges, creator cards, and work rows.
   - Use the established Cathedral type roles: Cinzel for display, Cormorant for editorial text, EB Garamond for body, Oswald for labels, and JetBrains Mono for WID/code-like identifiers.
   - Do this as a contained token migration after P0; typography work should not obscure the query/DOM repair.

---

## Cache audit beyond Explore

### Healthy or already improved

| Surface | Finding | Evidence |
|---|---|---|
| Explore creator directory | **Pass**: list-feed request is gated by `viewMode === "list"` | Creator-mode browser run made no `songs.exploreIndex` request; it had 611 DOM nodes and 20 images. `profile.allCreators` is cached for five minutes without focus refetch. |
| Creator Domain Page (`/domain`-style management page) | Mostly properly section-gated | `myAnalytics` only loads for overview/analytics; `mySongs` only for overview/works; their stale times are 60s and 30s. See `client/src/pages/CreatorDomainPage.tsx`, lines 95–108. |
| Add-to-named-playlist popover | Query work is gated by opening the popover/tab | The playlist, membership, and collection queries all have explicit `enabled` predicates and 10s stale windows in `client/src/components/AddToNamedPlaylistPopover.tsx`. |

### Remaining cache/query bottlenecks

| Priority | Surface | Evidence-backed issue | Recommended repair |
|---|---|---|---|
| High | **Explore list** | Client cache is present, but every cold request still reaches six database-backed discovery branches and returns a 13.6 MB response. | Perform the P0 contract, pagination, virtualization, and server-cache work above. |
| Medium | **Creator Domain Shell** | Once ownership resolves, `profile.me`, `songs.mySongs`, and `profile.myAnalytics` all start immediately and have no per-query stale/focus policy. See `client/src/pages/CreatorDomainShell.tsx`, lines 159–175. | Only request data required by the active section; set explicit stale policy and disable focus refetch for stable owner summaries. |
| Medium | **Creator Profile Page** | The page declares 15 queries; several public enrichment requests are enabled as soon as a creator ID exists, even when their corresponding panels are not opened. | Partition below-the-fold/panel-specific data behind section-open `enabled` predicates. Retain the existing 30–300s stale policies where already defined. |
| Medium | **Playlist inline search** | `search.global` begins on every keystroke after two characters, has only 5s stale time, and has no debounce. See `client/src/pages/PlaylistsPage.tsx`, lines 105–124. | Debounce 250–350 ms, trim/deduplicate the input, limit result projection, and cancel superseded requests. |
| Medium | **Playlist detail/card consistency** | Adding/removing a track invalidates `playlists.getById`, but not `playlists.mine`; the list’s `trackCount` can remain stale after returning from a detail. | Invalidate or optimistically update `playlists.mine` after add/remove. Maintain the detailed playlist invalidation. |
| Low | **Playlist detail invite lookup** | `profile.allCreators` loads for every opened playlist, though it is only needed when an owner opens the collaborative invite input. | Gate the creator directory query on `showInvite && isOwner && playlist.isCollaborative`, with a longer stale time. |
| Low | **Playlist drawer Build panel** | The Build panel currently loads both user collections and legacy playlists when the panel opens; no explicit stale times are set. | Keep the panel mount gate, add explicit 30–60s stale policies, and cache-sync list counts after mutations. |

### Ambient shell observation

Both Explore modes also caused an unrelated global-chrome tRPC batch (`songs.discover`, `auth.me`, activity, registry, lights mode). Its observed encoded body varied between roughly **71 KB** and **399 KB** across runs. It is not the primary 13.6 MB Explore problem, but it should be mapped separately before treating a creator-directory page as a pure one-query screen.

---

## Prioritized remediation sequence

| Order | Change | Why it comes here | Success evidence |
|---:|---|---|---|
| 1 | Introduce bounded Explore section contracts and cursor-driven full index | Removes the largest network and DOM multiplication | Cold Explore API is under a defined payload budget; no section returns 700 rows by default. |
| 2 | Virtualize the full Works list and cap curated section render counts | Removes long main-thread tasks and image/control explosion | DOM node count remains near the visible window; long tasks no longer include multi-second render blocks. |
| 3 | Add server-side public-discovery cache with invalidation | Reduces database work across visitors without making registry data stale indefinitely | Cache-hit/miss and invalidation tests prove public edits appear after invalidation. |
| 4 | Add image derivatives / layout reservation | Addresses late image LCP and CLS | Real-device and browser traces show lower final LCP and CLS under 0.10. |
| 5 | Add Creator Presence and Support Creator affordances | Resolves the specific doctrine failures without turning rows into dashboards | Refinement report passes Explore discoverability and support checks; manual design review confirms one obvious support action. |
| 6 | Migrate Explore typography to semantic tokens | Raises hierarchy consistency after the page can render efficiently | `DEBT-003` reduced with targeted snapshot/accessibility review. |
| 7 | Repair creator-shell and playlist query gates/invalidation | Prevents secondary cache churn and stale playlist counts | Query-level tests cover closed panels, search debounce, and add/remove list-count refresh. |

---

## Validation gates for implementation

Before any merge or release, verify all of the following:

1. **Contract tests**
   - Explore sections enforce their bounded limits.
   - Full index uses the existing cursor contract and returns deterministic `nextCursor` behavior.
   - Discovery projection excludes detail-only large fields.

2. **Cache tests**
   - Cached discovery data invalidates after publish, discovery-visible edit, and deletion.
   - Randomized rotation changes only on the intended rotation boundary.
   - Playlist add/remove refreshes both detail and list count.

3. **Browser performance tests**
   - Cold and warm runs on desktop and mobile-width targets.
   - Network response body, DOM node count, image count, long tasks, LCP, and CLS recorded before/after.
   - All regression conclusions distinguish local production preview from live public CDN measurements.

4. **Doctrine and accessibility review**
   - A creator-selected discovery state makes handle, short testimony, support action, and provenance path immediately reachable.
   - Keyboard interactions remain correct after virtualization.
   - Reduced-motion behavior is preserved for the constellation control and loading states.

---

## Evidence index

| Evidence | Location |
|---|---|
| Fresh platform refinement output | `refinement/reports/2026-10-01-steward-report.json` |
| Explore data loading, rendering, and client cache | `client/src/pages/ExplorePage.tsx` |
| Explore six-branch aggregation and cursor endpoint | `server/routers/songs.ts` |
| Global React Query defaults | `client/src/main.tsx` |
| Creator Domain Page gates | `client/src/pages/CreatorDomainPage.tsx` |
| Creator Domain Shell eager owner queries | `client/src/pages/CreatorDomainShell.tsx` |
| Creator Profile query inventory | `client/src/pages/CreatorProfilePage.tsx` |
| Playlist search/detail/list invalidation paths | `client/src/pages/PlaylistsPage.tsx` |
| Playlist drawer collection queries | `client/src/components/player/PlaylistDrawer.tsx` |
| Production browser trace: list mode | `/home/ubuntu/console_outputs/exec_result_2026-10-01_15-54-00_878.txt` and `/home/ubuntu/console_outputs/exec_result_2026-10-01_15-54-33_613.txt` |
| Production browser trace: creator mode | `/home/ubuntu/console_outputs/exec_result_2026-10-01_15-55-16_531.txt` |

> **Deployment hold honored:** this audit intentionally made no checkpoint, deployment, publish action, production-database mutation, or release action.
