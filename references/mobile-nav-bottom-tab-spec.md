# Technical Specification — Mobile Bottom Tab Bar Navigation
## Living Nexus Audio Provenance Platform
**Version:** 1.0 | **Date:** June 22, 2026 | **Status:** Pending Approval

---

## 1. Executive Summary

This specification defines the complete reconstruction of the mobile navigation system for Living Nexus, replacing the hamburger menu drawer and its associated overlay infrastructure with a persistent bottom tab bar. The reconstruction eliminates the `position:fixed` scroll lock, `overlayController`, `MobileNavDrawer`, and all associated touch-event interference that has caused repeated mobile freeze regressions. The result is a zero-overlay, GPU-accelerated, mobile-native navigation pattern consistent with industry-standard audio platforms.

---

## 2. Problem Statement

The current hamburger menu architecture relies on three interlocking systems — `overlayController`, `MobileNavDrawer`, and body scroll lock — that must coordinate correctly under all concurrent states (player playing, dialogs open, route transitions in progress). Any desynchronization between these systems leaves `position:fixed` or `touch-action:none` permanently applied to the body, rendering the entire screen unresponsive. Multiple fix attempts have confirmed that the architecture is inherently fragile under the concurrent conditions present in a live audio platform.

---

## 3. Architectural Decision

**Remove:** `MobileNavDrawer.tsx`, `overlayController.ts` scroll-lock calls, hamburger button in `MainLayout`, all `overlay-active` and `overlay-active-full` CSS rules, `body[data-scroll-locked]` override.

**Replace with:** A stateless, always-visible bottom tab bar (`BottomTabBar.tsx`) that requires no overlay, no scroll lock, and no body mutation of any kind.

**Preserve:** Desktop sidebar navigation (`MainLayout` sidebar) is unchanged. The bottom tab bar is mobile-only (`md:hidden`).

---

## 4. Component Architecture

### 4.1 New Component: `BottomTabBar.tsx`

**Location:** `client/src/components/layout/BottomTabBar.tsx`

**Responsibility:** Render the 5-tab persistent navigation bar on mobile. No state beyond active route detection. No side effects on the body or DOM.

**Props:** None. Reads current route from `useLocation()` (wouter).

**Z-index:** `z-90` — sits below the GlobalPlayer mini bar (`z-91`) and all modal/dialog layers. The player bar renders above the tab bar when a track is playing.

**Height:** `56px` base + `env(safe-area-inset-bottom, 0px)` padding for notched devices. Total rendered height: `56px` on standard devices, up to `90px` on iPhone with home indicator.

**Stacking order (bottom of screen, low to high):**
```
z-90  BottomTabBar          ← always visible
z-91  MiniPlayerBar         ← slides up above tab bar when playing
z-300 Mobile header (logo)  ← top of screen
z-450 Dialogs / modals
z-500 ExpandedPlayerSheet
```

---

### 4.2 Tab Configuration

Five tabs, fixed. Order is intentional — most-used actions are center and right-of-center.

| Position | Label | Icon | Route | Auth Required |
|---|---|---|---|---|
| 1 (far left) | Home | `Home` (Lucide) | `/` | No |
| 2 | Explore | `Compass` (Lucide) | `/explore` | No |
| 3 (center) | Upload | `Upload` (Lucide) | `/upload` | Yes — redirect to sign-in |
| 4 | Archive | `Library` (Lucide) | `/archive` | Yes — redirect to sign-in |
| 5 (far right) | Profile | `User` (Lucide) | `/profile` | Yes — redirect to sign-in |

**Active state:** Tab whose route prefix matches `location`. Home is active only on exact `/` match to prevent false positives.

**Upload tab special behavior:** Center position, slightly larger icon (`20px` vs `18px`), gold accent color when active. Acts as the primary creation CTA.

---

### 4.3 Visual Design

```
┌─────────────────────────────────────────────┐
│  [Home]  [Explore]  [⬆Upload]  [Archive]  [Profile]  │
│   icon    icon      GOLD icon    icon       icon      │
│   label   label     label        label      label     │
└─────────────────────────────────────────────┘
         ↑ safe-area-inset-bottom padding
```

**Background:** `rgba(10, 8, 18, 0.96)` with `backdrop-filter: blur(12px)` — matches the GlobalPlayer bar aesthetic.

**Top border:** `1px solid rgba(196, 154, 40, 0.12)` — subtle gold separator.

**Active tab:** Icon color `#C49A28` (LN gold), label color `#C49A28`, small 2px gold underline dot centered below icon.

**Inactive tab:** Icon color `rgba(255,255,255,0.35)`, label color `rgba(255,255,255,0.35)`.

**Tap feedback:** `active:scale-95` transform on the tab button, `transition: transform 80ms`. No ripple, no overlay.

**Font:** 10px, `font-weight: 500`, `letter-spacing: 0.02em`.

**No badge system in v1.** Notification badges deferred to a future iteration.

---

### 4.4 Layout Integration in `MainLayout.tsx`

**Content area bottom padding:** When `BottomTabBar` is visible (mobile), the main scrollable content area must have `padding-bottom` equal to the tab bar height plus the player bar height plus safe area inset:

```
padding-bottom: calc(56px + 64px + env(safe-area-inset-bottom, 0px))
```

This prevents content from being hidden behind the stacked tab bar and player bar.

**Desktop:** `BottomTabBar` renders with `className="md:hidden"` — invisible on tablet and desktop. Desktop sidebar navigation is unchanged.

**Hamburger button:** Removed from `MainLayout` header on mobile. The header retains the Living Nexus logo/wordmark and the notification bell (if present). No hamburger icon.

---

### 4.5 GlobalPlayer Bar Interaction

The `MobilePlayerLayer` mini bar sits at `z-91`, one layer above `BottomTabBar` at `z-90`. When a track is playing:

- The mini bar renders at the bottom of the screen, visually sitting directly above the tab bar.
- The tab bar remains fully visible and tappable beneath the mini bar.
- Content area padding accounts for both heights simultaneously.

**No overlap, no occlusion, no touch interference.** The two components are independent fixed elements at different z-levels with no shared state.

---

## 5. Files to Create

| File | Action | Purpose |
|---|---|---|
| `client/src/components/layout/BottomTabBar.tsx` | **Create** | New bottom tab bar component |

---

## 6. Files to Modify

| File | Change | Scope |
|---|---|---|
| `client/src/components/layout/MainLayout.tsx` | Remove hamburger button + `openMobileMenu`/`closeMobileMenu` functions. Add `<BottomTabBar />` render. Update content padding. | ~30 lines changed |
| `client/src/index.css` | Remove `body.overlay-active`, `body.overlay-active-full`, `body[data-scroll-locked]` override rules. | ~20 lines removed |
| `client/src/App.tsx` | Remove `OverlayRouteGuard` `overlayCloseAll` call on route change (no longer needed). Keep `StripToBone` diagnostic route. | ~5 lines changed |

---

## 7. Files to Delete

| File | Reason |
|---|---|
| `client/src/components/layout/MobileNavDrawer.tsx` | Replaced entirely by BottomTabBar |
| `client/src/lib/navDiag.ts` | Diagnostic instrumentation — no longer needed in production |

---

## 8. Files to Preserve Unchanged

| File | Reason |
|---|---|
| `client/src/lib/overlayController.ts` | Still needed for Dialogs, modals, and ExpandedPlayerSheet |
| `client/src/components/player/MobilePlayerLayer.tsx` | Unchanged — z-index already corrected |
| `client/src/lib/viewportLayers.ts` | Layer registry remains accurate |
| `client/src/pages/StripToBone.tsx` | Diagnostic tool — keep for future use |
| All desktop sidebar navigation | Unchanged |

---

## 9. Overlay System Scope Reduction

The `overlayController` is retained but its scope is narrowed. After this reconstruction, it is responsible for exactly two things:

1. **ExpandedPlayerSheet** — full-screen player expansion on mobile.
2. **Radix Dialogs and modals** — any component that needs body scroll lock while open.

It is **no longer responsible for navigation**. This is the correct separation of concerns. Navigation should never require a scroll lock.

---

## 10. Accessibility

- Each tab button has `aria-label` matching its destination name.
- Active tab has `aria-current="page"`.
- Tab bar has `role="navigation"` and `aria-label="Mobile navigation"`.
- Minimum tap target: `44px × 44px` per WCAG 2.5.5.
- Focus ring visible on keyboard navigation (desktop fallback).

---

## 11. Animation Policy

**None.** The tab bar is stateless and always visible. There are no mount/unmount animations, no slide transitions, no opacity fades. The active indicator (gold dot) transitions with `transition: color 120ms ease` only — no layout-affecting animations.

This is intentional. The freeze history of this platform is directly traceable to animation systems interacting with scroll lock. The bottom tab bar has no animations that could interact with any other system.

---

## 12. Testing Requirements

### Unit Tests (Vitest)
- `BottomTabBar` renders all 5 tabs.
- Active tab matches current route.
- Upload tab redirects unauthenticated users to sign-in.
- No body class mutations occur on any tab interaction.

### Manual Mobile Tests (Android Chrome)
- Play a song → tap each tab → confirm no freeze.
- Expand player → tap each tab → confirm no freeze.
- Navigate through all 5 tabs in sequence → confirm correct route changes.
- Rotate device → confirm tab bar remains correctly positioned.
- Notched device (if available) → confirm safe area inset respected.

---

## 13. Implementation Sequence

1. Create `BottomTabBar.tsx`.
2. Integrate into `MainLayout.tsx` — remove hamburger, add tab bar, update padding.
3. Remove `MobileNavDrawer.tsx`.
4. Clean `index.css` overlay rules.
5. Clean `App.tsx` route guard.
6. Run `pnpm test` — confirm all tests pass.
7. Manual mobile test on Android Chrome.
8. Save checkpoint and publish.

**Estimated implementation time:** 1–2 hours.
**Risk level:** Low. The tab bar is a net simplification — fewer files, fewer systems, fewer interactions.

---

## 14. Future Considerations (Out of Scope for v1)

- Notification badge on Profile tab (unread count).
- Long-press on Upload tab to show quick-action sheet (Upload Audio / Upload Artwork).
- Haptic feedback on tab tap (Web Vibration API, Android only).
- Tab bar hide-on-scroll behavior (advanced — deferred).

---

*Specification prepared for Doc's review — June 22, 2026*
*Awaiting approval before implementation begins.*
