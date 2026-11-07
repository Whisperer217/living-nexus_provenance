# Living Nexus — Mobile Explore Density and Creator Gallery Correction

**Maturity:** locally verified, unpublished, undeployed

## Scope and authority

This is a presentation-only correction within `/explore`. The repository implementation and the supplied mobile study were used as visual and behavioral evidence; canonical source code remains authoritative for creator identity, routing, Work/WID relationships, filtering, and playback.

The change is limited to:

- `client/src/pages/ExplorePage.tsx`
- `client/src/index.css`
- `server/tests/exploreCreatorDirectory.contract.test.ts`

No database schema, migration, media manifest, registered artwork, Work/WID record, route, Global Player, PlayerContext, queue, or external integration was changed.

## Implemented correction

On narrow viewports, the header now presents the identity and Explore heading, one full-width search field, and a single Settings disclosure. Creator scope is available inside that same Settings surface rather than appearing as a second standalone control beside search. Random order, sort order, view mode, refresh, and creator filtering continue to use their existing state and handlers.

At 768–1199px, the same Settings surface prevents the desktop control row from clipping. Wide desktop retains the compact toolbar and the dedicated left Creator Gallery rail. The mobile Creator Domains rail remains horizontally scrollable and snap-aligned; its outer framing and nonessential subtitle are tightened so artwork appears earlier. Existing creator cards, canonical IDs, routes, and selection behavior are unchanged.

## Responsive evidence

The clean captures were taken against the local development preview with an isolated Chromium profile. The browser-local What's New key was set only to suppress unrelated preview chrome; no application data was modified.

| Viewport | Before header | After header | After gallery top | Horizontal overflow |
|---:|---:|---:|---:|---|
| 360×800 | 188.0px | 154.0px | 210.0px | none (`scrollWidth === 360`) |
| 375×812 | 188.0px | 154.0px | 210.0px | none (`scrollWidth === 375`) |
| 390×844 | 188.0px | 154.0px | 210.0px | none (`scrollWidth === 390`) |
| 768×900 | 146.2px | 95.4px | 151.4px | none (`scrollWidth === 768`) |
| 1024×800 | 86.6px | 86.6px | 142.6px | none (`scrollWidth === 1024`) |

The 375px side-by-side comparison is [before-after-375.png](./before-after-375.png). Individual captures are available as `before-*.png` and `after-*.png` for all five widths.

The clean final captures show Creator Domains artwork substantially earlier on mobile, a single search field before the gallery, and the persistent `Nothing Playing` player bar remaining visible without horizontal page overflow. The existing `.ln-explore-registry` bottom margin continues to use `var(--bottom-stack)`; Global Player code and z-index authority were not modified.

## Validation

- Focused Explore, creator presence, surface, layout, and activity contracts: **30/30 passed**.
- Full regression suite: **950 passed, 1 skipped** across **156 passed test files and 1 skipped file**.
- `pnpm check`: passed with zero TypeScript errors.
- `pnpm build`: passed. Existing large-chunk warnings remain unchanged and are not introduced by this slice.
- `git diff --check`: passed.
- `pnpm refine`: **71/100, Grade C**, unchanged from the prior platform baseline.

## Rollback

Revert the three application/test files listed above. The change is reversible without a migration, data rewrite, media mutation, or deployment rollback. Evidence files may be retained independently for review.

## Release status

This checkpoint is for review only. No production deployment, publication, route retirement, database write, or Global Player modification was performed.
