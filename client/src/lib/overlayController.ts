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
 */

type PanelName =
  | "menu"
  | "quickplay"
  | "player-expanded"
  | "player-cinematic"
  | "gift"
  | "edit-track"
  | string;

// ── Internal state ──────────────────────────────────────────────────────────
let _activePanel: PanelName | null = null;
const _listeners: Set<() => void> = new Set();

function _notify() {
  _listeners.forEach(fn => fn());
}

// ── Scroll lock helpers ─────────────────────────────────────────────────────
function _lockScroll() {
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
  document.body.classList.add("overlay-active");
}

function _unlockScroll() {
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
  document.body.classList.remove("overlay-active");
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Open a panel. Closes any previously open panel first.
 * Locks body scroll and marks the backdrop as visible.
 */
export function overlayOpen(panel: PanelName) {
  if (_activePanel && _activePanel !== panel) {
    // Close the previous panel silently (no unlock — we're about to re-lock)
    _activePanel = null;
  }
  _activePanel = panel;
  _lockScroll();
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
