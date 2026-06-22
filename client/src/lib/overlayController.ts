/**
 * LIVING NEXUS — Global Overlay Controller v2
 *
 * Single source of truth for:
 *   - Body scroll lock (prevents background scroll when any panel is open)
 *   - Active panel tracking (reference-counted stack — multiple panels can
 *     independently lock/unlock without stepping on each other)
 *
 * ── Why reference counting? ──────────────────────────────────────────────────
 * v1 tracked only ONE active panel. If panel A opened, then panel B opened,
 * closing panel B would call overlayClose("B") — but if the controller had
 * already replaced B with A as the active panel (or vice-versa), the guard
 * `if (_activePanel !== panel) return` made the close a silent no-op.
 * Result: body.overlay-active-full + position:fixed stayed on the body
 * permanently → every touch event absorbed → screen frozen, nothing tappable.
 *
 * v2 maintains a Set of open panels. The body is locked while ANY panel is
 * open and unlocked only when ALL panels have been closed. Each panel
 * independently calls overlayOpen/overlayClose without interfering with others.
 *
 * Usage:
 *   import { overlayOpen, overlayClose, overlayCloseAll, overlayActive } from "@/lib/overlayController";
 *
 *   overlayOpen("menu");          // locks scroll, adds "menu" to open set
 *   overlayClose("menu");         // removes "menu"; unlocks only if set is now empty
 *   overlayCloseAll();            // clears all panels, always unlocks
 *   overlayActive()               // returns first open panel name or null (legacy compat)
 *   overlayIsOpen("menu")         // returns true if "menu" is in the open set
 *
 * Panel names (extend as needed):
 *   "menu" | "quickplay" | "player-expanded" | "player-cinematic" | "gift" | "edit-track"
 *
 * Lock modes:
 *   "full"  — full-screen takeover (expanded player, modals, menus):
 *             sets overflow:hidden + position:fixed (iOS Safari rubber-band prevention).
 *             NOTE: touchAction is intentionally NOT set on body — it kills Android Chrome
 *             touch events for the entire page. Individual overlay components manage their
 *             own touchAction on their own container elements.
 *   "light" — transient drag gesture: sets overflow:hidden only.
 *             Use for mini-bar drag-to-expand so the scroll div behind it stays responsive.
 */

import { useState, useEffect } from "react";
import { navLog, diagNoOverlay } from "@/lib/navDiag";

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
// Reference-counted set: body stays locked while _openPanels.size > 0
const _openPanels: Map<PanelName, LockMode> = new Map();
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
function _applyLock() {
  // Determine the strongest lock mode currently needed
  const hasFullMode = Array.from(_openPanels.values()).some(m => m === "full");
  const mode: LockMode = hasFullMode ? "full" : "light";

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
      document.body.classList.add("overlay-active", "overlay-active-full");
      navLog("OVERLAY_BODY_LOCKED", { mode: "full", classes: document.body.className, scrollY: _savedScrollY });
    } else {
      // Dialog is open — skip position:fixed to avoid breaking modal centering
      document.body.classList.add("overlay-active");
      navLog("OVERLAY_BODY_LOCKED", { mode: "full-dialog-exception", classes: document.body.className });
    }
  } else {
    // light: overflow only — no position:fixed
    document.body.style.overflow = "hidden";
    document.body.classList.add("overlay-active");
    navLog("OVERLAY_BODY_LOCKED", { mode: "light", classes: document.body.className });
  }
}

function _removeLock() {
  document.body.style.overflow = "";
  // ── DO NOT clear touchAction here — we never set it ──
  document.body.style.top = "";
  document.body.classList.remove("overlay-active", "overlay-active-full");
  // Restore scroll position — position:fixed resets it to 0
  window.scrollTo(0, _savedScrollY);
  navLog("OVERLAY_BODY_UNLOCKED", { classes: document.body.className, dataScrollLocked: document.body.getAttribute("data-scroll-locked") });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Open a panel. Adds it to the open set and locks body scroll.
 * Safe to call multiple times for the same panel (idempotent).
 *
 * @param panel  Panel name
 * @param mode   "full" (default) for full-screen overlays; "light" for transient drags
 */
export function overlayOpen(panel: PanelName, mode: LockMode = "full") {
  if (diagNoOverlay()) { navLog("OVERLAY_OPEN_CALLED", { panel, mode, skipped: true }); return; }
  navLog("OVERLAY_OPEN_CALLED", { panel, mode, openPanelsBefore: Array.from(_openPanels.keys()) });
  _openPanels.set(panel, mode);
  _applyLock();
  _notify();
}

/**
 * Close a specific panel. Removes it from the open set.
 * Body scroll is unlocked only when ALL panels have been closed.
 * Calling close on a panel that was never opened is a safe no-op.
 */
export function overlayClose(panel: PanelName) {
  if (!_openPanels.has(panel)) { navLog("OVERLAY_CLOSE_CALLED", { panel, noop: true, openPanels: Array.from(_openPanels.keys()) }); return; }
  navLog("OVERLAY_CLOSE_CALLED", { panel, openPanelsBefore: Array.from(_openPanels.keys()) });
  _openPanels.delete(panel);
  if (_openPanels.size === 0) {
    _removeLock();
  } else {
    // Re-apply lock in case the strongest mode changed
    _applyLock();
  }
  _notify();
}

/**
 * Force-close ALL panels and unconditionally unlock scroll.
 * Use when navigating away, on unmount cleanup, or as a safety valve
 * when the exact open panel name is unknown (e.g., closeMobileMenu).
 */
export function overlayCloseAll() {
  navLog("OVERLAY_CLOSE_CALLED", { panel: "ALL", openPanelsBefore: Array.from(_openPanels.keys()) });
  _openPanels.clear();
  _removeLock();
  _notify();
}

/**
 * Returns the name of the first open panel (insertion order), or null.
 * Kept for backwards compatibility with components that read overlayActive().
 */
export function overlayActive(): PanelName | null {
  const first = _openPanels.keys().next();
  return first.done ? null : first.value;
}

/** Returns true if the given panel is currently open. */
export function overlayIsOpen(panel: PanelName): boolean {
  return _openPanels.has(panel);
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
 * React hook — returns the current active panel name (first open panel).
 * Re-renders the component whenever the overlay state changes.
 */
export function useOverlayActive(): PanelName | null {
  const [active, setActive] = useState<PanelName | null>(overlayActive());
  useEffect(() => {
    return overlaySubscribe(() => setActive(overlayActive()));
  }, []);
  return active;
}
