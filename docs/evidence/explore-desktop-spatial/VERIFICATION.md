# Living Nexus — Explore Desktop Spatial Correction

**Maturity:** locally verified, unpublished, undeployed

## Authority and scope

The supplied desktop study established visual intent only. The repository remains authoritative for the fixed LeftRail, RightRail activity surface, Creator Gallery state machine, creator records, Work/WID relationships, filtering, pagination, and Global Player.

This correction is limited to `/explore` and touches:

- `client/src/pages/ExplorePage.tsx`
- `client/src/index.css`
- `server/tests/exploreCreatorDirectory.contract.test.ts`

No global MainLayout, LeftRail, RightRail, database, registry, WID, artwork, media, route, queue, or player authority was changed.

## Confirmed cause

The desktop audit found that MainLayout correctly begins content after the fixed 72px LeftRail. When the RightRail is open, it intentionally reserves 300px on the right. Explore then added a generic 24px desktop gutter and a fixed 17rem expanded gallery column. At 1440px, the measured content area was 1068px wide, with a 272px gallery and 732px Works surface. At 1024px, it was 652px wide, with a 272px gallery and only 316px for Works.

The wasted left-side gap was therefore an Explore-owned gutter issue, not a navigation-shell defect. The RightRail reservation remains intact and visible; it was not bypassed.

## Implemented correction

Explore now has route-owned `ln-explore-page` and `ln-explore-content` hooks. At desktop/tablet widths of 900px and above, those hooks use a 16px gutter so the gallery begins 16px beside the fixed LeftRail and the toolbar aligns with the gallery/Works shell.

The expanded gallery uses `clamp(17rem, 22vw, 19rem)`, producing a 272–304px gallery column in the validated widths. The Works surface receives the remaining width. Compact remains an 88px presentation rail and hidden remains a 48px state. Below 900px, the existing single-column mobile/tablet composition is unchanged.

## Measured geometry

| Viewport/state | Before shell x / columns | After shell x / columns | Result |
|---|---|---|---|
| 1440 expanded | x=96; 272px + 732px | x=88; 304px + 716px | 16px LeftRail gap; artwork column +32px |
| 1440 compact | x=96; 88px + 916px | x=88; 88px + 932px | alternate mode preserved; Works +16px |
| 1440 hidden | x=96; 48px + 956px | x=88; 48px + 972px | hidden mode preserved; Works +16px |
| 1024 expanded | x=96; 272px + 316px | x=88; 272px + 332px | 16px LeftRail gap; Works +16px |
| 1024 compact | x=96; 88px + 500px | x=88; 88px + 516px | alternate mode preserved; Works +16px |
| 1024 hidden | x=96; 48px + 540px | x=88; 48px + 556px | hidden mode preserved; Works +16px |
| 768 expanded | x=24; single 720px column | x=24; single 720px column | mobile/tablet composition unchanged |

All captured states reported `scrollWidth === viewport width`; no horizontal document overflow was introduced. The gallery and Works surfaces remain contained within the existing player-scroll-area and bottom-stack system.

## Evidence

- [1440px before/after comparison](./before-after-1440.webp)
- [1024px before/after comparison](./before-after-1024.png)
- [Expanded 1440px final](./after-expanded-1440.png)
- [Compact 1440px final](./after-compact-1440.png)
- [Hidden 1440px final](./after-hidden-1440.png)
- [Expanded 1024px final](./after-expanded-1024.png)
- [All final state captures and geometry JSON](./README.md)

## Validation

- Focused Explore, creator presence, surface, layout, and activity contracts: **31/31 passed**.
- Full regression suite: **951 passed, 1 skipped** across **156 passed test files and 1 skipped file**.
- `pnpm check`: passed with zero TypeScript errors.
- `pnpm build`: passed. Existing large-chunk warnings remain unchanged.
- `git diff --check`: passed.
- `pnpm refine`: **71/100, Grade C**, unchanged from the prior platform baseline.

## Rollback and release status

Rollback is limited to the three scoped source/test files. No migration, data rewrite, media mutation, or global-layout rollback is required. This remains an unpublished review checkpoint; no explicit production deployment or publication was requested or initiated by this task.
