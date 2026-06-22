/**
 * STRIP TO BONE — Reintroduction Test Suite
 *
 * Each step adds exactly ONE system back on top of the bare baseline.
 * Navigate via ?step=N (1–8). Test after each step.
 * The step whose addition reproduces the freeze is the primary suspect.
 *
 * Step 0 (baseline) — Raw React state + plain <div>. No systems.
 * Step 1 — + Body scroll lock (overflow:hidden + position:fixed)
 * Step 2 — + overlayController open/close
 * Step 3 — + CSS transition animation on the menu panel
 * Step 4 — + createPortal (menu rendered into document.body)
 * Step 5 — + Radix ScrollArea inside the menu
 * Step 6 — + PlayerProvider context wrapping this page
 * Step 7 — + MobilePlayerLayer rendered simultaneously
 * Step 8 — + Full MainLayout wrapper
 */

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { overlayOpen, overlayClose } from "@/lib/overlayController";
import { useLocation } from "wouter";

// ─── Tiny logger ────────────────────────────────────────────────────────────
interface LogEntry { ts: number; rel: number; event: string; detail: string }
let _t0 = 0;
function stamp(event: string, detail = ""): LogEntry {
  const ts = performance.now();
  if (!_t0) _t0 = ts;
  return { ts, rel: Math.round(ts - _t0), event, detail };
}

// ─── Minimal PlayerContext stub (Step 6) ────────────────────────────────────
const StubPlayerCtx = createContext<{ playing: boolean }>({ playing: false });
function StubPlayerProvider({ children }: { children: React.ReactNode }) {
  const [playing] = useState(false);
  return <StubPlayerCtx.Provider value={{ playing }}>{children}</StubPlayerCtx.Provider>;
}

// ─── Minimal MobilePlayerLayer stub (Step 7) ────────────────────────────────
function StubMobilePlayerLayer() {
  // Mirrors the real layer: fixed bottom bar at z-91, touch handlers
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "#120f1e",
        borderTop: "1px solid rgba(196,154,40,0.15)",
        zIndex: 91,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        fontSize: 12,
        color: "rgba(196,154,40,0.6)",
      }}
      onTouchStart={() => {}}
      onTouchMove={() => {}}
      onTouchEnd={() => {}}
    >
      ▶ STUB PLAYER BAR (z-91) — touch handlers active
    </div>
  );
}

// ─── Step config ─────────────────────────────────────────────────────────────
const STEPS = [
  { n: 0, label: "Baseline", added: "Nothing — raw React state + plain <div>" },
  { n: 1, label: "+ Body Scroll Lock", added: "overflow:hidden + position:fixed on body when menu opens" },
  { n: 2, label: "+ overlayController", added: "overlayOpen('menu') / overlayClose('menu') calls" },
  { n: 3, label: "+ CSS Transition", added: "transform + transition: 0.3s ease on menu panel" },
  { n: 4, label: "+ createPortal", added: "Menu rendered via createPortal into document.body" },
  { n: 5, label: "+ Radix ScrollArea", added: "Radix ScrollArea.Root wrapping menu items" },
  { n: 6, label: "+ PlayerProvider", added: "StubPlayerProvider context wrapping this page" },
  { n: 7, label: "+ MobilePlayerLayer", added: "Stub player bar at z-91 with touch handlers in DOM" },
  { n: 8, label: "+ MainLayout", added: "Full MainLayout wrapper (requires navigation to main app)" },
];

// ─── Core test component ─────────────────────────────────────────────────────
function TestCore({ step }: { step: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [frozen, setFrozen] = useState<boolean | null>(null);
  const bodyScrollRef = useRef(0);

  const addLog = useCallback((e: LogEntry) => {
    setLog(prev => [e, ...prev].slice(0, 60));
  }, []);

  // Step 1: body scroll lock
  const applyScrollLock = useCallback(() => {
    if (step < 1) return;
    bodyScrollRef.current = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${bodyScrollRef.current}px`;
    document.body.style.width = "100%";
    addLog(stamp("SCROLL_LOCK_APPLIED", `scrollY=${bodyScrollRef.current}`));
  }, [step, addLog]);

  const removeScrollLock = useCallback(() => {
    if (step < 1) return;
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, bodyScrollRef.current);
    addLog(stamp("SCROLL_LOCK_REMOVED", ""));
  }, [step, addLog]);

  const handleOpen = useCallback(() => {
    const bodyClass = document.body.className;
    const scrollLocked = document.body.getAttribute("data-scroll-locked");
    addLog(stamp("BUTTON_CLICK", `body="${bodyClass}" | data-scroll-locked="${scrollLocked}"`));
    setMenuOpen(true);
    addLog(stamp("STATE_CHANGE", "menuOpen → true"));
    applyScrollLock();
    if (step >= 2) {
      overlayOpen("menu", "full");
      addLog(stamp("OVERLAY_OPEN_CALLED", "overlayController"));
    }
  }, [step, addLog, applyScrollLock]);

  const handleClose = useCallback(() => {
    addLog(stamp("BUTTON_CLICK", "close"));
    setMenuOpen(false);
    addLog(stamp("STATE_CHANGE", "menuOpen → false"));
    removeScrollLock();
    if (step >= 2) {
      overlayClose("menu");
      addLog(stamp("OVERLAY_CLOSE_CALLED", "overlayController"));
    }
  }, [step, addLog, removeScrollLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, []);

  // Menu panel style — Step 3 adds CSS transition
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    top: 56,
    left: 0,
    bottom: 0,
    width: "80vw",
    maxWidth: 320,
    background: "#0a0812",
    borderRight: "1px solid rgba(196,154,40,0.14)",
    zIndex: 99,
    padding: "24px 16px",
    overflowY: "auto",
    ...(step >= 3 ? {
      transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.3s ease",
    } : {}),
  };

  // For step 3, always render the panel (controlled by transform)
  const showPanel = step >= 3 ? true : menuOpen;

  const menuItems = ["Home", "Explore", "Archive", "Upload", "Profile", "Settings"];

  const menuContent = (
    <div ref={node => { if (node) addLog(stamp("MENU_MOUNT", `step=${step}`)); }} style={menuStyle}>
      <p style={{ color: "rgba(196,154,40,0.8)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 16 }}>
        STEP {step} MENU — {STEPS[step]?.label}
      </p>
      {step >= 5 ? (
        <ScrollArea.Root style={{ height: "calc(100% - 60px)" }}>
          <ScrollArea.Viewport style={{ height: "100%" }}>
            {menuItems.map(item => (
              <div key={item} onClick={() => addLog(stamp("MENU_ITEM_CLICK", item))}
                style={{ padding: "12px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 15 }}>
                {item}
              </div>
            ))}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ) : (
        menuItems.map(item => (
          <div key={item} onClick={() => addLog(stamp("MENU_ITEM_CLICK", item))}
            style={{ padding: "12px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 15 }}>
            {item}
          </div>
        ))
      )}
      <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
        <div>body.className: <code style={{ color: "#C49A28" }}>{document.body.className || "(empty)"}</code></div>
        <div>data-scroll-locked: <code style={{ color: "#C49A28" }}>{document.body.getAttribute("data-scroll-locked") ?? "null"}</code></div>
        <div>body.overflow: <code style={{ color: "#C49A28" }}>{document.body.style.overflow || "(default)"}</code></div>
        <div>body.position: <code style={{ color: "#C49A28" }}>{document.body.style.position || "(default)"}</code></div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0812", color: "#e8e0d0", fontFamily: "system-ui, sans-serif", paddingBottom: step >= 7 ? 80 : 0 }}>

      {/* Header */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#120f1e", borderBottom: "1px solid rgba(196,154,40,0.2)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 100 }}>
        <button
          onTouchStart={() => addLog(stamp("TOUCH_START", `menuOpen=${menuOpen}`))}
          onClick={menuOpen ? handleClose : handleOpen}
          style={{ background: "none", border: "1px solid rgba(196,154,40,0.4)", borderRadius: 6, color: "#C49A28", padding: "6px 10px", fontSize: 18, cursor: "pointer", lineHeight: 1, WebkitTapHighlightColor: "transparent" }}
          aria-label={menuOpen ? "Close" : "Open"}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        <span style={{ fontSize: 11, color: "rgba(196,154,40,0.7)", fontWeight: 700, letterSpacing: "0.06em" }}>
          STEP {step}: {STEPS[step]?.label}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: menuOpen ? "#4ade80" : "rgba(255,255,255,0.3)", fontWeight: 700 }}>
          {menuOpen ? "OPEN" : "CLOSED"}
        </span>
      </div>

      {/* Menu panel */}
      {step >= 4
        ? showPanel && createPortal(menuContent, document.body)
        : showPanel && menuContent
      }

      {/* Step 7: stub player layer */}
      {step >= 7 && <StubMobilePlayerLayer />}

      {/* Content */}
      <div style={{ paddingTop: 72, padding: "72px 16px 24px" }}>

        {/* Step navigator */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(196,154,40,0.6)", letterSpacing: "0.1em", marginBottom: 8 }}>STEP NAVIGATOR</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STEPS.map(s => (
              <a key={s.n} href={`/diag/strip-to-bone${s.n > 0 ? `?step=${s.n}` : ""}`}
                style={{ padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, textDecoration: "none", background: s.n === step ? "#C49A28" : "rgba(255,255,255,0.06)", color: s.n === step ? "#0a0812" : "rgba(255,255,255,0.5)", border: s.n === step ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
                {s.n}
              </a>
            ))}
          </div>
        </div>

        {/* Current step info */}
        <div style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#C49A28", marginBottom: 4 }}>STEP {step} — {STEPS[step]?.label}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            Added: <span style={{ color: "rgba(255,255,255,0.8)" }}>{STEPS[step]?.added}</span>
          </p>
        </div>

        {/* Freeze report buttons */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(196,154,40,0.6)", letterSpacing: "0.1em", marginBottom: 8 }}>REPORT OUTCOME</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setFrozen(false); addLog(stamp("OUTCOME_REPORTED", `step=${step} FREEZE=NO`)); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", background: frozen === false ? "#4ade80" : "rgba(74,222,128,0.12)", color: frozen === false ? "#0a0812" : "#4ade80", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ✓ NO FREEZE
            </button>
            <button onClick={() => { setFrozen(true); addLog(stamp("OUTCOME_REPORTED", `step=${step} FREEZE=YES ← PRIMARY SUSPECT`)); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", background: frozen === true ? "#f87171" : "rgba(248,113,113,0.12)", color: frozen === true ? "#0a0812" : "#f87171", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ✗ FREEZE
            </button>
          </div>
          {frozen === true && (
            <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, fontSize: 12, color: "#f87171", fontWeight: 700 }}>
              ⚠ PRIMARY SUSPECT: {STEPS[step]?.label} — "{STEPS[step]?.added}"
            </div>
          )}
          {frozen === false && step < 8 && (
            <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6, fontSize: 12, color: "#4ade80" }}>
              Step {step} cleared. Proceed to{" "}
              <a href={`/diag/strip-to-bone?step=${step + 1}`} style={{ color: "#C49A28", fontWeight: 700 }}>Step {step + 1}</a>.
            </div>
          )}
        </div>

        {/* Body state monitor */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(196,154,40,0.6)", letterSpacing: "0.1em", marginBottom: 8 }}>BODY STATE (live)</p>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "10px 12px", fontSize: 11, fontFamily: "monospace" }}>
            <div>overflow: <span style={{ color: "#4ade80" }}>{document.body.style.overflow || "(default)"}</span></div>
            <div>position: <span style={{ color: "#4ade80" }}>{document.body.style.position || "(default)"}</span></div>
            <div>touch-action: <span style={{ color: "#4ade80" }}>{document.body.style.touchAction || "(default)"}</span></div>
            <div>data-scroll-locked: <span style={{ color: document.body.getAttribute("data-scroll-locked") ? "#f87171" : "#4ade80" }}>
              {document.body.getAttribute("data-scroll-locked") ?? "null"}
            </span></div>
            <div>classes: <span style={{ color: "#4ade80" }}>{document.body.className || "(empty)"}</span></div>
          </div>
        </div>

        {/* Event log */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(196,154,40,0.6)", letterSpacing: "0.1em", marginBottom: 8 }}>
          EVENT LOG ({log.length})
        </p>
        {log.length === 0
          ? <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No events yet. Tap the hamburger.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {log.map((e, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 4, padding: "5px 10px", fontSize: 11, fontFamily: "monospace", borderLeft: `3px solid ${e.event.includes("SUSPECT") ? "#f87171" : e.event.includes("CLICK") ? "#C49A28" : e.event.includes("STATE") ? "#4ade80" : "rgba(255,255,255,0.12)"}` }}>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>+{e.rel}ms</span>{" "}
                  <span style={{ color: "#e8e0d0", fontWeight: 600 }}>{e.event}</span>{" "}
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>{e.detail}</span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ─── Root: reads ?step= and wraps with providers as needed ───────────────────
export default function StripToBone() {
  const [location] = useLocation();
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const step = Math.min(8, Math.max(0, parseInt(params.get("step") ?? "0", 10) || 0));

  // Step 8: redirect to main app with a note (can't wrap MainLayout from outside)
  if (step === 8) {
    return (
      <div style={{ minHeight: "100dvh", background: "#0a0812", color: "#e8e0d0", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#C49A28", fontWeight: 700, marginBottom: 12 }}>STEP 8 — Full MainLayout</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 24 }}>
          Step 8 requires testing the actual app with MainLayout.<br />
          Navigate to the main site and test the hamburger there.<br />
          If steps 1–7 all passed, the defect lives inside MainLayout or its children.
        </p>
        <a href="/" style={{ padding: "10px 24px", background: "#C49A28", color: "#0a0812", borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
          Go to Main App (Step 8)
        </a>
        <a href="/diag/strip-to-bone?step=7" style={{ marginTop: 12, fontSize: 12, color: "rgba(196,154,40,0.6)" }}>← Back to Step 7</a>
      </div>
    );
  }

  // Step 6+: wrap with stub PlayerProvider
  const core = <TestCore step={step} />;
  return step >= 6 ? <StubPlayerProvider>{core}</StubPlayerProvider> : core;
}
