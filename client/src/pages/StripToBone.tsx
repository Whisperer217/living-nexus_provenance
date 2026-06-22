/**
 * STRIP TO BONE — Mobile Navigation Casualty Assessment
 *
 * This page is intentionally stripped of ALL navigation infrastructure:
 *   ✗ No Radix components
 *   ✗ No Drawer / Dialog components
 *   ✗ No overlayController
 *   ✗ No scroll lock systems
 *   ✗ No animation systems
 *   ✗ No route transitions
 *   ✗ No global state providers
 *   ✗ No navigation context
 *   ✗ No analytics / telemetry hooks
 *   ✗ No touch management systems
 *
 * Contains ONLY:
 *   ✓ React.useState (local state only)
 *   ✓ A single button
 *   ✓ A static menu container (plain <div>)
 *   ✓ Inline styles only (no Tailwind class dependencies)
 *   ✓ A timestamped event log rendered in the page
 *
 * TEST OBJECTIVE:
 *   Does the freeze still occur on this page?
 *
 *   Outcome A — Freeze occurs → root cause is NOT in the navigation stack.
 *                               Investigate rendering, hydration, lifecycle, platform.
 *   Outcome B — Freeze absent → root cause IS in the navigation stack.
 *                               Reintroduce systems one at a time per the protocol.
 */

import { useState, useCallback } from "react";

interface LogEntry {
  ts: number;
  rel: number;
  event: string;
  detail: string;
}

let _cycleStart = 0;

function stamp(event: string, detail: string = ""): LogEntry {
  const ts = performance.now();
  if (_cycleStart === 0) _cycleStart = ts;
  return { ts, rel: Math.round(ts - _cycleStart), event, detail };
}

export default function StripToBone() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const addLog = useCallback((entry: LogEntry) => {
    setLog(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const handleButtonTouch = useCallback(() => {
    addLog(stamp("TOUCH_START", `menuOpen=${menuOpen}`));
  }, [menuOpen, addLog]);

  const handleButtonClick = useCallback(() => {
    const bodyClass = document.body.className;
    const scrollLocked = document.body.getAttribute("data-scroll-locked");
    addLog(stamp("BUTTON_CLICK", `menuOpen=${menuOpen} | body="${bodyClass}" | data-scroll-locked="${scrollLocked}"`));
    const next = !menuOpen;
    setMenuOpen(next);
    addLog(stamp("STATE_CHANGE", `menuOpen → ${next}`));
  }, [menuOpen, addLog]);

  const handleMenuMount = useCallback((node: HTMLDivElement | null) => {
    if (node) addLog(stamp("MENU_MOUNT", `menuOpen=${menuOpen}`));
  }, [menuOpen, addLog]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0a0812",
        color: "#e8e0d0",
        fontFamily: "system-ui, sans-serif",
        padding: "0",
        margin: "0",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: "#120f1e",
          borderBottom: "1px solid rgba(196,154,40,0.2)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 16,
          zIndex: 100,
        }}
      >
        {/* Hamburger button — raw HTML, no Radix, no overlay */}
        <button
          onTouchStart={handleButtonTouch}
          onClick={handleButtonClick}
          style={{
            background: "none",
            border: "1px solid rgba(196,154,40,0.4)",
            borderRadius: 6,
            color: "#C49A28",
            padding: "6px 10px",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <span style={{ fontSize: 13, color: "rgba(196,154,40,0.7)", fontWeight: 600, letterSpacing: "0.08em" }}>
          STRIP TO BONE — Diagnostic
        </span>

        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: menuOpen ? "#4ade80" : "rgba(255,255,255,0.3)",
            fontWeight: 600,
          }}
        >
          {menuOpen ? "MENU OPEN" : "MENU CLOSED"}
        </span>
      </div>

      {/* ── STATIC MENU CONTAINER — no portal, no Radix, no animation ── */}
      {menuOpen && (
        <div
          ref={handleMenuMount}
          style={{
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
          }}
        >
          <p style={{ color: "rgba(196,154,40,0.8)", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 16 }}>
            STATIC MENU — NO OVERLAY SYSTEM
          </p>
          {["Home", "Explore", "Archive", "Upload", "Profile", "Settings"].map(item => (
            <div
              key={item}
              onClick={() => addLog(stamp("MENU_ITEM_CLICK", `item=${item}`))}
              style={{
                padding: "12px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                cursor: "pointer",
                color: "rgba(255,255,255,0.7)",
                fontSize: 15,
              }}
            >
              {item}
            </div>
          ))}
          <div style={{ marginTop: 24 }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
              body.className: <code style={{ color: "#C49A28" }}>{document.body.className || "(empty)"}</code>
            </p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>
              data-scroll-locked: <code style={{ color: "#C49A28" }}>{document.body.getAttribute("data-scroll-locked") ?? "null"}</code>
            </p>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ paddingTop: 72, padding: "72px 16px 24px" }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: "#C49A28", marginBottom: 4 }}>
          Strip to Bone — Casualty Assessment
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 24, lineHeight: 1.6 }}>
          Tap the hamburger button. Observe whether the page freezes.<br />
          All navigation infrastructure has been removed from this page.<br />
          This is raw React state + a plain div. Nothing else.
        </p>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(196,154,40,0.6)", letterSpacing: "0.1em", marginBottom: 8 }}>
            BODY STATE (live)
          </p>
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
          EVENT LOG ({log.length} events)
        </p>
        {log.length === 0 ? (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No events yet. Tap the hamburger button.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {log.map((entry, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 4,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  borderLeft: `3px solid ${entry.event.includes("CLICK") ? "#C49A28" : entry.event.includes("STATE") ? "#4ade80" : "rgba(255,255,255,0.15)"}`,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.3)" }}>+{entry.rel}ms</span>{" "}
                <span style={{ color: "#e8e0d0", fontWeight: 600 }}>{entry.event}</span>{" "}
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{entry.detail}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32, padding: "12px 16px", background: "rgba(196,154,40,0.06)", borderRadius: 8, border: "1px solid rgba(196,154,40,0.15)" }}>
          <p style={{ fontSize: 12, color: "rgba(196,154,40,0.8)", fontWeight: 700, marginBottom: 6 }}>EVIDENCE STANDARD</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            If freeze occurs here → root cause is NOT in the navigation stack.<br />
            If freeze is absent here → root cause IS in the navigation stack.<br />
            Report: what was removed, what was tested, whether freeze occurred.
          </p>
        </div>
      </div>
    </div>
  );
}
