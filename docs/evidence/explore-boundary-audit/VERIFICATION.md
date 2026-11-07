# Living Nexus — Explore Desktop Final Spatial Boundary Audit

**Maturity:** locally verified, unpublished, undeployed

## Scope and authority

This correction is limited to the Explore route. The supplied layout study establishes visual intent only; the repository and rendered browser measurements remain authoritative. MainLayout, LeftRail, RightRail, Creator records, artwork, Work/WID relationships, filtering, pagination, PlayerContext, and Global Player behavior were preserved.

## Confirmed cause

The outer workspace was not constrained by a centered max-width wrapper at the audited desktop/tablet widths. The fixed LeftRail ends at `x=72`, the Explore route root begins at `x=72`, and the route-owned content padding places the spatial shell at `x=88`—exactly 16px after the navigation boundary.

The remaining visible gap came from the gallery’s internal scroller padding: `13.6px` on each side, plus the gallery border. The outer gallery frame began at `x=88`, but the first visible artwork card began at `x=102.6`, creating a 30.6px visual gap from the LeftRail. The correction reduces only the desktop/tablet scroller’s horizontal inset to `0.125rem` while preserving the mobile snap rail padding and all outer gallery widths.

## Viewport measurement table

Coordinates are viewport-relative. `Rail end` is the right edge of the fixed primary LeftRail. `Shell x` is the outer Explore gallery/Works grid start. `Gallery x` is the outer gallery frame. `First card x` is the first visible artwork card. `Works x..right` is the Work results panel boundary.

| Viewport | Rail end | Route root | Content width / max-width | Header bounds | Shell x..right | Gallery x..right | First card before → after | Works x..right | Overflow |
|---|---:|---|---|---|---|---|---:|---|---|
| 1440×900 | 72 | 72..1140 | 1068 / 1480 inactive | 72..1140, h=86.6 | 88..1124 | 88..392, 304px | 102.6 → 91.0 | 408..1124, 716px | none |
| 1280×900 | 72 | 72..980 | 908 / 1480 inactive | 72..980, h=86.6 | 88..964 | 88..369.6, 281.6px | 102.6 → 91.0 | 385.6..964, 578.4px | none |
| 1024×800 | 72 | 72..724 | 652 / 1480 inactive | 72..724, h=86.6 | 88..708 | 88..360, 272px | 102.6 → 91.0 | 376..708, 332px | none |
| 768×900 | hidden | 0..768 | 768 / 1480 inactive | 0..768, h=95.4 | 24..744 | single-column gallery | unchanged mobile/tablet composition | 24..744, 720px | none |

The post-correction visible artwork begins 19px after the LeftRail at all audited desktop/tablet widths, within the requested 12–20px boundary. The outer shell remains 16px after the rail. The Works panel coordinates, gallery column widths, grid gap, and RightRail reservation remain unchanged.

## Parent layout chain

At 1440px the relevant chain is: fixed LeftRail `0..72`; Explore route root `72..1140`; `.ln-explore-content` `72..1140` with `padding-inline:16px` and inactive `max-width:1480px`; `.ln-explore-spatial-shell` `88..1124`; expanded gallery `88..392`; Works panel `408..1124`. No centered margin or max-width wrapper contributes to the left gap. The RightRail remains the intentional right-side reservation, ending the Explore route at `x=1140`.

## Implementation

Only the Explore-owned desktop rule was added:

```css
.ln-explore-page .ln-explore-gallery__scroller {
  padding-left: 0.125rem;
  padding-right: 0.125rem;
}
```

The rule is scoped to the Explore page and desktop spatial media query. Mobile horizontal snap behavior, gallery state widths, creator identity, Work/WID links, playback, queue state, and global navigation remain unchanged. A contract assertion protects the rule.

## Evidence

- [1440px before/after](./before-after-1440.jpg)
- [1280px before/after](./before-after-1280.jpg)
- [1024px before/after](./before-after-1024.jpg)
- [768px before/after](./before-after-768.jpg)
- [Raw 1440px geometry](./before-1440.json) and [after geometry](./after-1440.json)
- [All captures and geometry JSON](./README.md)

## Validation

- Focused Explore/activity contracts: **31/31 passed**.
- Full regression suite: **951 passed, 1 skipped** across **156 passed test files and 1 skipped file**.
- `pnpm check`: passed with zero TypeScript errors.
- `pnpm build`: passed; existing large-chunk warnings remain unchanged.
- `pnpm refine`: **71/100, Grade C**, unchanged from the prior baseline.
- `git diff --check`: passed.
- Browser geometry: no horizontal document overflow at 1440, 1280, 1024, or 768px.

## Rollback and release status

Rollback is limited to the Explore stylesheet rule and its single contract assertion. No database, registry, WID, artwork, media, navigation, player, or global shell changes were made. This is an unpublished review checkpoint; no deployment or publication was initiated.
