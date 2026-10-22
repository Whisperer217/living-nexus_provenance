# Living Nexus — Mobile Layout Alignment Correction

**Date:** 2026-10-22
**Scope:** Approved corrective pass for mobile navigation, Creator Domain containment, and the existing Global Player presentation
**Base checkpoint:** `2c6df751` — Mobile shell stabilization
**Status:** Validated locally; checkpoint pending; **not deployed or published**

## Decision summary

This corrective pass retains one mobile navigation authority (`LeftRail`) and one playback authority (`PlayerContext` / `GlobalPlayer`). It does not introduce a second menu, player, queue, media service, background worker, schema change, migration, Registry alteration, WID alteration, or production data write.

The local implementation corrects the observed mobile drawer legibility failure, strengthens Creator Domain containment, and reduces the compact Global Player footprint from 74px to 64px while retaining safe-area space beneath scrollable pages. The release remains **NO-GO**: neither this correction nor the immediately preceding mobile-shell checkpoint is deployed, and established PWA and staging acceptance gates remain unresolved.

## Deployment and source alignment

| Evidence | Result |
|---|---|
| Local base checkpoint | `2c6df751` on `review/global-player-cinematic-phase1` |
| Validated local build entry | `/assets/index-C1iFI3U3.js` |
| Public production entry at inspection | `/assets/index-BMz12ZSe.js` |
| Entry names / SHA-256 values match | **No** |
| Production publication performed in this slice | **No** |
| Production database, media, Works, WIDs, Registry evidence, or migrations changed | **No** |

The entry-bundle mismatch proves that the current local correction is not the byte-identical JavaScript being served by `https://www.livingnexus.org/`. It does not assert which historical checkpoint production represents beyond that limitation.

## Confirmed findings and treatment

### A. Mobile navigation drawer

**Finding:** The mobile drawer was functionally present after the preceding stabilization, but its surface used `var(--ln-surface-rail)`, a translucent rail treatment. At a real 360 × 780 mobile emulation, Creator Domain artwork and text could be seen through navigation rows. The menu also presented its existing destinations as one undifferentiated rail.

**Treatment:** `LeftRail` remains the one route and interaction authority. The mobile-only presentation now:

- uses the existing solid `var(--ln-void)` vessel while retaining the capped backdrop for spatial context;
- groups existing destinations into **Discover**, **Create & manage**, and **Community & tools**;
- makes companion destinations full-width, 52px horizontal rows on mobile;
- preserves the established off-canvas transform, scrollable drawer, capped bottom stack, focus-management, backdrop dismissal, Escape dismissal, and supported Android/browser Back dismissal.

**Relevant source:**

- [`client/src/components/layout/LeftRail.tsx:221-344`](/home/ubuntu/living-nexus/client/src/components/layout/LeftRail.tsx)
- [`client/src/components/layout/LeftRail.tsx:405-458`](/home/ubuntu/living-nexus/client/src/components/layout/LeftRail.tsx)
- [`client/src/components/layout/MainLayout.tsx`](/home/ubuntu/living-nexus/client/src/components/layout/MainLayout.tsx) — existing single-shell dismissal lifecycle retained
- [`client/src/lib/viewportLayers.ts`](/home/ubuntu/living-nexus/client/src/lib/viewportLayers.ts) — existing shared drawer/player layer ordering retained

### B. Creator Domain mobile presentation

**Finding:** The supplied affected Creator Domain displayed literal **“Type some”** text. This was an unfinished authoring prompt flowing from candidate narrative fields, not a reason to rewrite creator testimony. The existing one-line Who / What / When / Why summary was also overly dense at 360px.

**Treatment:** The canonical Creator Domain now skips only four exact, case-insensitive incomplete authoring prompts: `type some`, `type something`, `tell us about yourself`, and `add your story`. It still renders the first valid existing biography, origin statement, creative mission, or tagline; it does not write, normalize, or replace stored creator data. The page also uses a smaller narrow-screen heading, discrete accessible summary facts, word-breaking, and wrapped actions.

**Relevant source:**

- [`client/src/pages/loop/LoopCreatorPage.tsx:37-51`](/home/ubuntu/living-nexus/client/src/pages/loop/LoopCreatorPage.tsx)
- [`client/src/pages/loop/LoopCreatorPage.tsx:166-175`](/home/ubuntu/living-nexus/client/src/pages/loop/LoopCreatorPage.tsx)
- [`client/src/pages/loop/LoopCreatorPage.tsx:322-381`](/home/ubuntu/living-nexus/client/src/pages/loop/LoopCreatorPage.tsx)

### C. Existing Global Player on mobile

**Finding:** The existing mini-player reservation was 74px: 20px drag handle + 2px progress bar + 52px control row. This left less page space than needed at narrow viewport heights.

**Treatment:** The same `GlobalPlayer` now uses a 64px mini presentation on mobile: 14px drag handle + 2px progress + 48px control row. CSS safe-area reservation is synchronized to that exact composition. The existing `visualViewport` bounded expanded sheet, PlayerContext, audio reference, queue, playback controls, and explicit layer ordering are unchanged.

**Relevant source:**

- [`client/src/components/player/GlobalPlayer.tsx:73-75`](/home/ubuntu/living-nexus/client/src/components/player/GlobalPlayer.tsx)
- [`client/src/components/player/GlobalPlayer.tsx:144-166`](/home/ubuntu/living-nexus/client/src/components/player/GlobalPlayer.tsx)
- [`client/src/components/player/GlobalPlayer.tsx:640-650`](/home/ubuntu/living-nexus/client/src/components/player/GlobalPlayer.tsx)
- [`client/src/components/player/GlobalPlayer.tsx:1074-1136`](/home/ubuntu/living-nexus/client/src/components/player/GlobalPlayer.tsx)
- [`client/src/index.css:819-829`](/home/ubuntu/living-nexus/client/src/index.css)

No playback was started during browser validation. Structural continuity coverage confirms this component still uses the existing player hook and does not construct a new audio element.

## Visual validation — identical 360 × 780 Android-like viewport

The pre-correction capture was taken from a clean detached `2c6df751` worktree. The corrected capture was taken from the active local development build after the final source change. Both use `/creator/6330001`, the identical 360 × 780 viewport, the existing hamburger trigger, and the same Escape dismissal step.

| State | Before (`2c6df751`) | Corrected local source |
|---|---|---|
| Creator Domain closed | [Before capture](/home/ubuntu/mobile-alignment-before-2026-10-22/creator-domain-360x780.png) — literal “Type some”; dense inline facts | [Corrected capture](/home/ubuntu/mobile-alignment-validation-2026-10-22/creator-domain-360x780.png) — valid existing narrative; individual Who / What / When / Why facts |
| Mobile drawer open | [Before capture](/home/ubuntu/mobile-alignment-before-2026-10-22/mobile-drawer-360x780.png) — page artwork/text visually competes beneath rows; routes ungrouped | [Corrected capture](/home/ubuntu/mobile-alignment-validation-2026-10-22/mobile-drawer-360x780.png) — solid drawer, grouped routes, persistent player reservation |

The measurement records confirm both before and after had a 360px document width with **no horizontal overflow**. In the corrected result, the drawer measured 320 × 652px; it had `role="dialog"` and `aria-modal="true"`; focus was on the existing **Loop home** action when open; and after Escape, `aria-hidden="true"`, its right edge was `0`, focus returned to the menu trigger, and horizontal overflow remained absent. See the full corrected measurement record: [`measurements.json`](/home/ubuntu/mobile-alignment-validation-2026-10-22/measurements.json).

The corrected screenshots include a sandbox preview-sharing notice at the very bottom. That notice is environment chrome, not part of Living Nexus.

## Changed files

Application and test changes are limited to the following files:

1. `client/src/components/layout/LeftRail.tsx`
2. `client/src/components/player/GlobalPlayer.tsx`
3. `client/src/index.css`
4. `client/src/pages/loop/LoopCreatorPage.tsx`
5. `server/tests/creatorRouteContinuity.contract.test.ts`
6. `server/tests/mobileCrossPageLayout.contract.test.ts`
7. `server/tests/mobileShellStabilization.contract.test.ts`
8. `server/tests/mobileCreatorDomainAlignment.contract.test.ts` (new)
9. `refinement/lessons/lessons-log.json` — `LESSON-082`

This record is the only additional documentation file. No server route, tRPC procedure, schema, migration, data repository, media gateway, manifest, Registry, or PlayerContext source was changed.

## Validation

| Check | Result |
|---|---|
| Focused mobile shell, cross-page containment, Creator Domain, playback continuity, and comment-continuity contracts | **5 files / 18 tests passed** |
| TypeScript (`pnpm check`) | **Passed** |
| Full regression suite (`pnpm test`) | **151 files / 924 tests passed; 1 file / 1 test intentionally skipped** |
| Production build (`pnpm build`) | **Passed** in 26.54s |
| Diff integrity (`git diff --check`) | **Passed** |
| Isolated 360 × 780 browser validation | **Passed** for containment, opaque drawer readability, grouped navigation, focus return, Escape dismissal, and page/player coexistence |
| Refinement (`pnpm refine` in isolated copy) | **70/100, Grade C — unchanged baseline** |

The build continues to emit Vite chunk-size warnings, including a 1,259.37kB entry chunk before gzip (349.08kB gzip). This is pre-existing performance debt and was not altered by this slice.

The refinement tooling continues to report broader typography, doctrine, language, animation, and design-drift debt. It identifies 10 open debt items and remains at the prior 70/100 baseline; this correction does not claim to resolve those platform-wide findings.

## Regression boundaries preserved

- One navigation authority: `LeftRail` remains the only route list and mobile drawer surface.
- One playback authority: `GlobalPlayer` / `PlayerContext` remains the sole active audio and queue owner.
- Current route destinations, browser Back / Escape behavior, focus restoration, safe-area reservation, and reduced-motion-compatible transitions are retained.
- Creator biography/testimony data is preserved exactly; only recognized incomplete prompts are excluded from public fallback selection.
- No WID, Work, Creator, media, provenance, manifest, Registry, archive, or database record is changed.

## Remaining release blockers

This correction does **not** change the established release position.

1. **PWA activation failure:** the visible timeout is confirmed, but the underlying worker activation failure still lacks a reproduced root cause and evidence-supported correction.
2. **Authenticated creator acceptance:** approved staging-safe journeys still need end-to-end validation for Studio, Collections/Draft Releases, HAAI correction, and manifest actions.
3. **Production startup rehearsal:** requires separately approved operational scope, safeguards, rollback plan, and evidence.
4. **Publication:** the public frontend is not this local build. Deployment/publishing was not authorized and was not performed.

## Checkpoint conclusion

The approved mobile alignment correction is locally validated and ready to be preserved in a **non-deployment checkpoint**. Production remains **NO-GO** pending the release gates above.
