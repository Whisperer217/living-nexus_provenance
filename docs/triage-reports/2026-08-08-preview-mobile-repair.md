# Preview and Mobile Viewport Repair Decision

## Current State

The managed preview returned only the server-injected SEO fallback despite successfully downloading the React module graph. The production Open Graph middleware was registered ahead of Vite and also intercepted development requests, returning its raw HTML template rather than the Vite-transformed document. A browser import diagnostic additionally identified the resulting blocking client error: **`@vitejs/plugin-react can't detect preamble`**. The custom Vite middleware needs a React refresh preamble safeguard when it is the active renderer.

The mobile entry splash uses a fixed, vertically centered, `overflow: hidden` surface. Its content stack is taller than some mobile browser visual viewports and lacks explicit top and bottom safe-area spacing. This clips the title region beneath browser chrome and can place the entry control too close to device navigation chrome.

## Decision

Bypass production Open Graph/static-body middleware in development so every preview route reaches Vite. Add a development-only React refresh preamble safeguard in the custom Vite HTML response. It will run only when the plugin has not inserted its own preamble, preserving normal Vite behavior while allowing the preview to mount the React application.

Refactor the splash surface into a named layout surface with dynamic viewport sizing, safe-area padding, responsive compact spacing, and a vertical scroll path on short mobile viewports. Preserve the existing typography, process sequence, control semantics, and cathedral colors.

## Blast Radius

| Thread | Classification | Files | Reason |
|---|---|---|---|
| T1 — Preview bootstrap | Blocking | `server/_core/vite.ts`, a small unit test | Restores the client mount in managed preview without affecting production static serving |
| T2 — Mobile cinematic surface | Parallel | `client/src/components/CinematicSplash.tsx`, `client/src/index.css`, `client/index.html` | Protects the first mobile surface with dynamic viewport and safe-area rules |
| T3 — Validation | Sequential | Preview capture, mobile capture, Vitest, TypeScript | Confirms runtime mount and real viewport accessibility |

No database schema, tRPC procedure, registry record, creator content, or WID behavior changes. The repair strengthens **Manifestation** by restoring the intended visual presentation and **Stewardship** by keeping mobile controls reachable.

## Risk and Rollback

The Vite safeguard is restricted to development middleware and checks for an existing preamble before inserting one. The splash changes scope scrolling to the overlay rather than the document body, avoiding interference with main-app overlays. Both changes are independently reversible in their respective files; no migration is needed.

## Validation Plan

The repair will receive focused unit coverage for preamble insertion behavior. The complete TypeScript and Vitest suites will run. Desktop and mobile preview captures will verify that the React application mounts, no static fallback remains, the splash content begins below browser chrome, and its entry control remains reachable above the mobile safe area.

## Verification Evidence

The managed preview now renders the intended cinematic Living Nexus entry rather than the white SEO fallback. At a 375 × 812 viewport, the title, process card, navigation hint, entry control, and attribution all remain within the visible application viewport. Selecting **Enter the Archive** removes the splash and mounts the full application shell. Focused bootstrap coverage, TypeScript validation, and the full test suite passed after the repair.
