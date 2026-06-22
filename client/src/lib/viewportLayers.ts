/**
 * LIVING NEXUS — Global Viewport Layer Registry
 *
 * Single source of truth for all z-index values across the app.
 * Every fixed/absolute overlay MUST pull its z-index from this file.
 * Never hardcode z-index values in component files.
 *
 * Layer hierarchy (lowest → highest):
 *
 *  0   BASE_CONTENT       — page content, scrollable areas
 *  10  RIGHT_RAIL         — RightRail (fixed, right side)
 *  20  LEFT_RAIL          — LeftRail (fixed, left side)
 *  30  TOP_BAR            — TopBar / mobile header
 *  40  SURFACE_PLAYER     — WitnessSurfacePlayer SurfaceBar (mobile)
 *  50  EDIT_PANEL         — EditTrackPanel, sheet overlays
 *  60  THEATER_PLAYER     — TheaterPlayer cinematic mode
 *  80  GLOBAL_PLAYER      — GlobalPlayer floating card + expanded modal
 *  90  BOTTOM_NAV_BAR     — MobilePlayerLayer BottomNavBar
 *  91  MINI_PLAYER_BAR    — MobilePlayerLayer MiniBar (above BottomNavBar)
 *  100 CONTEXT_DRAWER     — ContextDrawer (desktop left panel)
 *  200 MOBILE_NAV         — MobileNavDrawer (full-screen) — MUST be above player layers
 *  300 MOBILE_HEADER      — Mobile top header bar — MUST be above MobileNavDrawer
 *  400 EXPANDED_PLAYER    — WitnessSurfacePlayer ExpandedPanel (full-viewport)
 *  500 EXPANDED_SHEET     — MobilePlayerLayer ExpandedSheet (full-screen, below drawers)
 *  500 PLAYLIST_DRAWER    — PlaylistDrawer
 *  600 MARKETPLACE_DRAWER — MarketplaceDrawer
 *  700 MODAL              — Generic modals, dialogs
 *  800 TOAST              — Toast notifications (Sonner)
 *  900 TOOLTIP            — Tooltips, popovers
 * 9000 CINEMATIC_PORTAL   — GlobalPlayer cinematic portal (must be above all)
 * 9999 DEBUG_OVERLAY      — Debug overlays (dev only)
 */

export const Z = {
  BASE_CONTENT: 0,
  RIGHT_RAIL: 10,
  LEFT_RAIL: 20,
  TOP_BAR: 30,
  SURFACE_PLAYER: 40,
  EDIT_PANEL: 50,
  THEATER_PLAYER: 60,
  GLOBAL_PLAYER: 80,
  BOTTOM_NAV_BAR: 90,
  MINI_PLAYER_BAR: 91,
  CONTEXT_DRAWER: 100,
  MOBILE_NAV: 200,
  MOBILE_HEADER: 300,
  EXPANDED_PLAYER: 400,
  PLAYLIST_DRAWER: 500,
  MARKETPLACE_DRAWER: 600,
  MODAL: 700,
  TOAST: 800,
  TOOLTIP: 900,
  CINEMATIC_PORTAL: 9000,
  DEBUG_OVERLAY: 9999,
} as const;

export type ZLayer = keyof typeof Z;
export type ZValue = (typeof Z)[ZLayer];

/**
 * Returns the z-index value for a given layer name.
 * Use this in inline styles: `style={{ zIndex: zIndex("MODAL") }}`
 */
export function zIndex(layer: ZLayer): number {
  return Z[layer];
}
