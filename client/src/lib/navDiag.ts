/**
 * LIVING NEXUS — Mobile Nav Diagnostic Logger
 * ─────────────────────────────────────────────
 * Timestamped lifecycle tracing for the hamburger menu / MobileNavDrawer.
 * Every event is logged to console with a relative timestamp (ms since
 * the first event in the current open/close cycle) and an absolute wall
 * clock time so we can correlate with browser DevTools timeline.
 *
 * DIAGNOSTIC MODE FLAGS (set via localStorage or window globals):
 *   localStorage.setItem("LN_DIAG_NAV", "1")   → enable logging
 *   localStorage.setItem("LN_DIAG_NOANIM", "1") → disable all CSS transitions
 *   localStorage.setItem("LN_DIAG_NOOVERLAY", "1") → skip overlayOpen/Close calls
 *
 * To enable from Chrome DevTools console on Android (via Remote Debugging):
 *   localStorage.setItem("LN_DIAG_NAV","1"); localStorage.setItem("LN_DIAG_NOANIM","1"); location.reload();
 *
 * To read the log after a freeze:
 *   copy(JSON.stringify(window.__LN_NAV_LOG, null, 2))
 */

export type NavEvent =
  | "HAMBURGER_CLICK"
  | "STATE_CHANGE_START"       // setMobileMenuOpen called
  | "STATE_CHANGE_COMMIT"      // React re-render with new mobileMenuOpen value
  | "OVERLAY_OPEN_CALLED"      // overlayOpen("menu") called
  | "OVERLAY_BODY_LOCKED"      // body.overlay-active class applied
  | "DRAWER_MOUNT"             // MobileNavDrawer useEffect ran (open=true)
  | "DRAWER_ANIM_START"        // CSS transition started (transitionstart event)
  | "DRAWER_ANIM_END"          // CSS transition ended (transitionend event)
  | "DRAWER_UNMOUNT"           // MobileNavDrawer cleanup (open=false)
  | "OVERLAY_CLOSE_CALLED"     // overlayCloseAll() called
  | "OVERLAY_BODY_UNLOCKED"    // body.overlay-active class removed
  | "PLAYER_OVERLAY_OPEN"      // overlayOpen("player-*") called
  | "PLAYER_OVERLAY_CLOSE"     // overlayClose("player-*") called
  | "BODY_CLASS_SNAPSHOT"      // snapshot of body.className at a point in time
  | "TOUCH_START"              // touchstart on hamburger button
  | "TOUCH_END"                // touchend on hamburger button
  | "ERROR";                   // any caught error during the lifecycle

export interface NavLogEntry {
  event: NavEvent;
  ts: number;           // performance.now() — absolute
  rel: number;          // ms since cycle start
  data?: Record<string, unknown>;
}

// ── Internal state ──────────────────────────────────────────────────────────
let _cycleStart = 0;
const _log: NavLogEntry[] = [];

// Expose on window so DevTools can read it after a freeze
if (typeof window !== "undefined") {
  (window as any).__LN_NAV_LOG = _log;
  // Apply CSS no-animation attribute immediately if flag is set
  try {
    if (localStorage.getItem("LN_DIAG_NOANIM") === "1") {
      document.documentElement.setAttribute("data-ln-noanim", "1");
      console.log("%c[LN-DIAG] Animation/transition mode: DISABLED (data-ln-noanim=1)", "color:#C49A28;font-weight:bold");
    }
  } catch {}
}

function _enabled(): boolean {
  try { return localStorage.getItem("LN_DIAG_NAV") === "1"; } catch { return false; }
}

export function diagNoAnim(): boolean {
  try { return localStorage.getItem("LN_DIAG_NOANIM") === "1"; } catch { return false; }
}

export function diagNoOverlay(): boolean {
  try { return localStorage.getItem("LN_DIAG_NOOVERLAY") === "1"; } catch { return false; }
}

export function navLog(event: NavEvent, data?: Record<string, unknown>) {
  if (!_enabled()) return;

  const ts = performance.now();
  if (event === "HAMBURGER_CLICK" || event === "TOUCH_START") {
    // Start a new cycle
    _cycleStart = ts;
    _log.length = 0; // clear previous cycle
  }
  const rel = _cycleStart > 0 ? Math.round(ts - _cycleStart) : 0;

  const entry: NavLogEntry = { event, ts: Math.round(ts), rel, data };
  _log.push(entry);

  // Always print to console — visible in Chrome Remote Debugging
  const wall = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const prefix = `[LN-NAV +${rel}ms @ ${wall}]`;
  const bodyClasses = document.body.className || "(none)";

  console.log(
    `%c${prefix} %c${event}`,
    "color:#C49A28;font-weight:bold",
    "color:#fff",
    data ? data : "",
    `| body: ${bodyClasses}`
  );

  // Snapshot body classes on every event for post-mortem analysis
  if (event !== "BODY_CLASS_SNAPSHOT") {
    _log.push({
      event: "BODY_CLASS_SNAPSHOT",
      ts: Math.round(ts),
      rel,
      data: { classes: bodyClasses, overflow: document.body.style.overflow, top: document.body.style.top },
    });
  }
}

/**
 * Install a MutationObserver that logs every time body.className changes.
 * Call once on app mount when diagnostic mode is active.
 */
export function installBodyClassObserver() {
  if (!_enabled()) return;
  if (typeof MutationObserver === "undefined") return;

  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === "attributes" && m.attributeName === "class") {
        navLog("BODY_CLASS_SNAPSHOT", {
          classes: document.body.className,
          overflow: document.body.style.overflow,
          position: document.body.style.position,
          top: document.body.style.top,
        });
      }
    }
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
  console.log("%c[LN-NAV] Body class observer installed", "color:#C49A28;font-weight:bold");
}
