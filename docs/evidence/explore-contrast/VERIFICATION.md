# Explore gallery subtitle contrast and layout verification

**State:** locally verified, unpublished, undeployed

## Accessibility correction

The Explore gallery subtitle **“Choose a world to explore”** previously resolved to `rgb(46, 43, 34)` (`#2e2b22`), which produced approximately **1.2:1** contrast against the dark gallery surface and failed WCAG AA for normal text.

The subtitle now uses the route-scoped cathedral token `--ln-bone` (`#C9C0A8`) with an authoritative Explore selector. The live browser renders `rgb(201, 192, 168)`. This provides approximately **9.33:1** contrast against the documented dark card surface `#211C15` and **10.14:1** against the deeper `#17140F` surface, exceeding the WCAG AA normal-text threshold of 4.5:1.

The correction is limited to the subtitle. It does not change global tokens, creator content, artwork, WIDs, navigation, Works, player state, or gallery behavior.

## Expanded layout measurements

| Viewport | Shell | Expanded gallery | Works panel | First card | Document overflow | Subtitle color |
|---|---|---|---|---|---|---|
| 1440×900 | x=88, w=1036 | x=88, w=304 | x=408, w=716 | x=91, w=298 | none (`1440/1440`) | rgb(201, 192, 168) |
| 1024×800 | x=88, w=620 | x=88, w=272 | x=376, w=332 | x=91, w=266 | none (`1024/1024`) | rgb(201, 192, 168) |
| 768×900 | x=24, w=720 | x=24, w=720, horizontal snap | x=24, w=720 | x=24.6, w=240 | none (`768/768`) | rgb(201, 192, 168) |

The desktop expanded gallery remains immediately beside the 72px LeftRail with its established 16px outer shell gutter and 19px visible artwork boundary. At 768px the composition correctly becomes the existing single-column mobile/tablet flow; the gallery remains horizontal-snap aligned and Works follows beneath it.

## Evidence files

- [1440px capture](./1440.png) · [geometry](./1440.json)
- [1024px capture](./1024.png) · [geometry](./1024.json)
- [768px capture](./768.png) · [geometry](./768.json)

## Validation

- Focused Explore/activity contracts: 31/31 passed.
- Full regression suite: **156 files passed, 1 skipped; 951 tests passed, 1 skipped**.
- TypeScript: **`pnpm check` passed**.
- Production build: **`pnpm build` passed**; existing chunk-size warnings only.
- Architecture refinement: **71/100 C**, unchanged from the prior Explore checkpoint; no new debt was introduced by this correction. The generated steward report is transient and excluded from the deliverable.
- No database, registry, WID, artwork, media, navigation, player, or deployment changes.
