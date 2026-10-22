# Mobile Shell Stabilization — Implementation Record

**Date:** 2026-10-22
**Base checkpoint:** `e27fabb9`
**Scope:** Bounded shared mobile navigation and Global Player containment repair.
**Deployment/publication:** Not authorized and not performed.
**Checkpoint:** To be assigned after final integrity review.

## Decision

Living Nexus now treats narrow-screen navigation and the existing Global Player as coordinated application-shell surfaces rather than unrelated page overlays. The repair preserves one LeftRail navigation authority and one `PlayerContext` / Global Player audio authority. It does not change Registry data, WIDs, media, manifest access, Creator Studio authorization, backend procedures, database state, or any playback queue.

## Verified finding

The prior mobile shell rendered the LeftRail as a 72px off-canvas icon strip and left it operationally independent from the player. It did not establish one mobile dismissal lifecycle for Escape, Android Back, page-scroll isolation, or focus return. The Global Player independently used fixed mobile geometry, leaving browser-chrome and virtual-keyboard resize behavior exposed to stale viewport measurements.

The correction is shared-shell work, not a route-specific treatment:

- `MainLayout` owns mobile menu presentation lifecycle only: it closes existing contextual/player overlays before opening navigation; adds a same-URL history sentinel; restores the trigger focus; and handles Escape and browser Back before navigation changes route.
- `LeftRail` remains the only navigation component. On mobile it becomes a readable, independently scrollable drawer with real navigation rows, a backdrop capped above the persistent player dock, and focus moved to the first primary destination when opened.
- `viewportLayers.ts` now gives the Global Player, player backdrop, menu backdrop, and mobile drawer explicit non-colliding layer values. The navigation drawer intentionally sits above the player only while it is open; the cinematic portal remains highest.
- `GlobalPlayer` remains the only audio playback surface. It listens to `visualViewport` resize in addition to window resize and bounds its existing expanded sheet to the currently visible viewport on narrow screens. No audio object, `PlayerContext` method, queue operation, or media URL behavior changed.

## Files changed

| File | Change |
|---|---|
| `client/src/components/layout/MainLayout.tsx` | Added coordinated mobile menu state, history/Back/Escape dismissal, focus return, page-scroll isolation, and player/right-drawer collapse signals. |
| `client/src/components/layout/LeftRail.tsx` | Reused the existing navigation authority as a readable focus-managed mobile drawer; improved row layout and capped overlay geometry to the shared header/bottom stack. |
| `client/src/components/player/GlobalPlayer.tsx` | Made existing mobile expanded-sheet sizing react to the browser visual viewport; retained the single player and its internal scrolling. |
| `client/src/lib/viewportLayers.ts` | Centralized shared player and mobile-navigation stacking order. |
| `server/tests/mobileCrossPageLayout.contract.test.ts` | Updated cross-page mobile expectations for the shared layer registry and readable drawer. |
| `server/tests/mobileShellStabilization.contract.test.ts` | Added coverage for single navigation authority, player coordination, viewport sizing, focus/Back/Escape lifecycle, and no second audio owner. |
| `refinement/lessons/lessons-log.json` | Adds `LESSON-081` documenting the reusable shell and native-app boundary. |

## Validation

| Check | Result |
|---|---|
| Focused shared mobile-shell, cross-page layout, mobile guard, and playback-continuity contracts | **8 files, 17 passed** |
| TypeScript | `pnpm check` passed with zero errors |
| Full regression | **395 files passed; 922 tests passed; 1 intentionally skipped** |
| Production build | `pnpm build` passed in 25.35 seconds |
| Diff integrity | `git diff --check` passed |
| Refinement | Existing **70/100** baseline retained; no score decrease claimed |
| Narrow-route smoke coverage | Local Witness Registry/mobile capture run at a 360px target; route remained renderable. The managed screenshot renderer continued to emit a desktop-width image, so this is not claimed as a fully visual 360px acceptance result. |
| Browser lifecycle evidence | Local DOM inspection confirmed the mobile drawer carries the shared header/bottom bounds and menu z-index. Desktop browser automation cannot activate a CSS-hidden mobile trigger as a reliable real-phone interaction proxy; code contracts cover the mobile-only lifecycle. |

The production build retains pre-existing large-chunk warnings, including a 1.26 MB minified index chunk. Those warnings were not created by this limited repair and are not silently treated as resolved.

## Accessibility and interaction behavior

- The mobile navigation trigger exposes `aria-expanded` and `aria-controls`.
- Opening the drawer sends focus to its first primary navigation item.
- Escape and Android/browser Back dismiss the menu before changing route history.
- Closing restores focus to the mobile menu trigger.
- The page interaction surface becomes inert and non-scrollable only while the mobile drawer is open; the body and document root are not mutated.
- The player dock remains outside the menu’s vertical capture area and its queue/audio ownership remains unchanged.

## Future Android/iOS application compatibility

This work reduces future mobile-app effort at the architecture level, while honestly separating reusable application behavior from browser-only mechanics.

### Reusable now

- **Navigation module:** `LeftRail` retains destination definitions and one navigation authority; a future client can render those same destinations through a native drawer/sheet.
- **Shell contract:** `MainLayout` expresses a transferable rule: one transient navigation panel at a time, collapse visual overlays before a menu, return focus/accessibility context after dismissal, and protect the primary interaction surface while the menu is active.
- **Playback module:** `GlobalPlayer` remains separate from navigation and backed by the existing canonical PlayerContext. Its presentation can be replaced by a native mini-player/sheet without duplicating playback policy or Work identity.
- **Stack contract:** `viewportLayers.ts` is a single explicit ordering policy. A native client would map the same semantic order to native navigation, sheet, modal, toast, and cinematic layers.
- **Data authority:** Registry, manifest eligibility, Creator Studio routes, and backend authorization have not been moved into browser-only code.

### Browser-specific implementations to replace in a native client

| Current web primitive | Native equivalent required later |
|---|---|
| `window.history.pushState` / `popstate` sentinel | React Navigation stack or native BackHandler interception |
| DOM focus query and `inert` | Native accessibility focus management and modal accessibility semantics |
| `window.visualViewport` | Safe-area insets, keyboard/insets events, and native window-dimension APIs |
| CSS `env(safe-area-inset-bottom)` / fixed positioning | Native safe-area container and bottom-sheet layout |
| DOM custom events used for visual overlay coordination | Typed shared UI state or navigation events; still not playback ownership |

No Android/iOS package, native bridge, mobile SDK, or new application was created in this slice.

## Regression risks and retained boundaries

1. **Real-device acceptance remains necessary.** Local contract coverage and a managed narrow render do not substitute for an Android Chrome and iOS Safari touch/keyboard/Back test.
2. **PWA activation remains unresolved.** This change contains no service-worker change and does not alter the previously confirmed update activation uncertainty.
3. **Existing player continuity diagnostic risk remains separate.** The menu now emits a collapse signal before it opens, but it does not claim to prove or fix the earlier active-playback rendering diagnosis.
4. **Pre-existing bundle-size warnings remain.** No code-splitting scope was added under this stabilization directive.
5. **Cinematic precedence is deliberately retained.** The cinematic portal remains above the mobile drawer; this preserves the existing full-viewport player authority and must be verified explicitly in later release acceptance.

## Release-gate impact

| Previous release gate | Status after this slice |
|---|---|
| Migration-ledger reconciliation | Resolved previously; unchanged here |
| Archive → Continue Draft | Resolved and checkpointed previously; unchanged here |
| Mobile navigation drawer / player overlap | **Source-level stabilization complete; real-device staging acceptance still required** |
| PWA update activation root cause | **Blocked / unresolved** |
| Authenticated creator write journeys | **Untested for release acceptance** |
| Managed production startup rehearsal | **Untested; requires separately approved operational plan** |

## Explicit non-changes

No database operation, migration, production write, deployment, publication, WID issuance/change, Work change, HAAI change, media/storage change, Creator permission change, Registry change, manifest policy change, AI activation, PWA worker change, Global Player audio-engine change, queue change, or mobile-app build occurred.

**Conclusion:** This shared-shell correction is ready to preserve as a non-deployment checkpoint. Living Nexus remains **NO-GO for production deployment** until the unresolved PWA activation issue and the agreed authenticated/staging/startup release gates have evidence-based acceptance.
