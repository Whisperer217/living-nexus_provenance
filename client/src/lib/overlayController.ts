/**
 * LIVING NEXUS — Global Overlay Controller
 *
 * Single source of truth for:
 *   - Body scroll lock (prevents background scroll when any panel is open)
 *   - Backdrop visibility (one shared backdrop, not per-component)
 *   - Active panel tracking (only one panel open at a time)
 *
 * Usage:
 *   import { overlayOpen, overlayClose, overlayActive } from "@/lib/overlayController";
 *
 *   overlayOpen("menu");       // locks scroll, shows backdrop, sets active panel
 *   overlayClose("menu");      // unlocks scroll, hides backdrop (if no other panel open)
 *   overlayActive()            // returns current active panel name or null
 *   overlayIsOpen("menu")      // returns true if this panel is the active one
 *
 * Panel names (extend as needed):
 *   "menu" | "quickplay" | "player-expanded" | "player-cinematic" | "gift" | "edit-track"
 *
 * Lock modes:
 *   "full"  — full-screen takeover (expanded player, modals): sets overflow:hidden + position:fixed
 *             NOTE: touchAction is intentionally NOT set on body — it kills Android Chrome touch
 *             events for the entire page, making all buttons/menus unresponsive. Individual
 *             overlay components (player, drawer) manage their own touchAction on their own elements.
 *   "light" — transient drag gesture: sets overflow:hidden only.
 *             Use for mini-bar drag-to-expand so the scroll div behind it stays responsive.
 */

type PanelName =
  | "menu"
  | "quickplay"
  | "quick-access"
  | "player-expanded"
  | "player-cinematic"
  | "player-drag"
  | "gift"
  | "edit-track"
  | string;

type LockMode = "full" | "light";

// ── Internal state ──────────────────────────────────────────────────────────
let _activePanel: PanelName | null = null;
let _lockMode: LockMode = "full";
let _savedScrollY = 0; // saved before position:fixed to restore on unlock
const _listeners: Set<() => void> = new Set();

function _notify() {
  _listeners.forEach(fn => fn());
}

// ── Scroll lock helpers ─────────────────────────────────────────────────────
// "full" mode: iOS Safari requires position:fixed to prevent rubber-band scroll.
// We save/restore scrollY to prevent page jump on unlock.
//
// CRITICAL: Do NOT set touchAction:none on document.body.
// On Android Chrome, body.style.touchAction = "none" kills ALL touch events
// for the entire page — buttons, menus, drawers all become unresponsive.
// Individual overlay elements (GlobalPlayer, MobileNavDrawer) manage their
// own touchAction on their own container elements instead.
//
// "light" mode: used for transient drag gestures (mini-bar swipe-up).
// Only sets overflow:hidden — no position:fixed.
function _lockScroll(mode: LockMode) {
  _lockMode = mode;
  if (mode === "full") {
    _savedScrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    // ── DO NOT set touchAction on body — it kills Android Chrome touch events ──
    // Only apply position:fixed if no Radix Dialog is currently open.
    // When body is position:fixed it becomes the containing block for ALL
    // position:fixed children (including Radix Dialog portals), causing
    // modals to anchor to body top-left instead of the viewport center.
    const hasOpenDialog = !!document.querySelector(
      '[data-slot="dialog-content"], [data-radix-dialog-content]'
    );
    if (!hasOpenDialog) {
      document.body.style.top = `-${_savedScrollY}px`;
      // overlay-active-full adds position:fixed (iOS Safari rubber-band prevention)
      document.body.classList.add("overlay-active", "overlay-active-full");
    } else {
      // Dialog is open — skip position:fixed to avoid breaking modal centering
      document.body.classList.add("overlay-active");
    }
  } else {
    // light: overflow only — no position:fixed
    document.body.style.overflow = "hidden";
    document.body.classList.add("overlay-active");
  }
}

function _unlockScroll() {
  document.body.style.overflow = "";
  // ── DO NOT clear touchAction here — we never set it ──
  document.body.style.top = "";
  document.body.classList.remove("overlay-active", "overlay-active-full");
  if (_lockMode === "full") {
    // Restore scroll position — position:fixed resets it to 0
    window.scrollTo(0, _savedScrollY);
  }
  _lockMode = "full"; // reset to default
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Open a panel. Closes any previously open panel first.
 * Locks body scroll and marks the backdrop as visible.
 *
 * @param panel  Panel name
 * @param mode   "full" (default) for full-screen overlays; "light" for transient drags
 */
export function overlayOpen(panel: PanelName, mode: LockMode = "full") {
  if (_activePanel && _activePanel !== panel) {
    // Close the previous panel silently (no unlock — we're about to re-lock)
    _activePanel = null;
  }
  _activePanel = panel;
  _lockScroll(mode);
  _notify();
}

/**
 * Close a specific panel. If it was the active one, unlocks scroll.
 * Calling close on a panel that isn't active is a no-op.
 */
export function overlayClose(panel: PanelName) {
  if (_activePanel !== panel) return;
  _activePanel = null;
  _unlockScroll();
  _notify();
}

/**
 * Force-close all panels and unlock scroll.
 * Use when navigating away or on unmount cleanup.
 */
export function overlayCloseAll() {
  _activePanel = null;
  _unlockScroll();
  _notify();
}

/** Returns the name of the currently active panel, or null. */
export function overlayActive(): PanelName | null {
  return _activePanel;
}

/** Returns true if the given panel is currently the active one. */
export function overlayIsOpen(panel: PanelName): boolean {
  return _activePanel === panel;
}

/**
 * Subscribe to overlay state changes.
 * Returns an unsubscribe function.
 */
export function overlaySubscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * React hook — returns the current active panel name.
 * Re-renders the component whenever the overlay state changes.
 */
import { useState, useEffect } from "react";

export function useOverlayActive(): PanelName | null {
  const [active, setActive] = useState<PanelName | null>(_activePanel);
  useEffect(() => {
    return overlaySubscribe(() => setActive(_activePanel));
  }, []);
  return active;
}
