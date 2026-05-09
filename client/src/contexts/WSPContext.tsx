/* ================================================================
   LIVING NEXUS — WSPContext
   Witness Surface Player — mode state and event bridge

   WSPMode:
     "surface"  — top-anchored strip, always visible (default)
     "expanded" — expands downward from surface bar (cinematic)
     "floating" — detached, draggable, edge-snapping

   Events (window custom events):
     wsp:expand   — surface → expanded
     wsp:collapse — expanded → surface
     wsp:float    — any → floating
     wsp:dock     — floating → surface
     wsp:track-change — fired when currentTrack changes
================================================================ */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

export type WSPMode = "surface" | "expanded" | "floating";

export interface FloatingPosition {
  x: number;
  y: number;
}

interface WSPContextValue {
  mode: WSPMode;
  floatingPosition: FloatingPosition;
  expand: () => void;
  collapse: () => void;
  float: () => void;
  dock: () => void;
  setFloatingPosition: (pos: FloatingPosition) => void;
  /** Whether the surface bar should be rendered (true when a track is loaded) */
  hasSurface: boolean;
  setHasSurface: (v: boolean) => void;
}

const DEFAULT_FLOAT_POS: FloatingPosition = { x: 16, y: 120 };
const FLOAT_POS_KEY = "ln_wsp_float_pos";

function loadFloatPos(): FloatingPosition {
  try {
    const raw = localStorage.getItem(FLOAT_POS_KEY);
    if (raw) return JSON.parse(raw) as FloatingPosition;
  } catch {}
  return DEFAULT_FLOAT_POS;
}

function saveFloatPos(pos: FloatingPosition) {
  try {
    localStorage.setItem(FLOAT_POS_KEY, JSON.stringify(pos));
  } catch {}
}

const WSPContext = createContext<WSPContextValue | null>(null);

export function WSPProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<WSPMode>("surface");
  const [floatingPosition, setFloatingPositionState] = useState<FloatingPosition>(loadFloatPos);
  const [hasSurface, setHasSurface] = useState(false);
  const prevModeRef = useRef<WSPMode>("surface");

  const expand = useCallback(() => {
    prevModeRef.current = mode;
    setMode("expanded");
    window.dispatchEvent(new CustomEvent("wsp:expand"));
    // Bridge to GlobalPlayer (desktop) — GlobalPlayer listens on ln:player-expand
    window.dispatchEvent(new CustomEvent("ln:player-expand"));
  }, [mode]);

  const collapse = useCallback(() => {
    setMode("surface");
    window.dispatchEvent(new CustomEvent("wsp:collapse"));
    // Bridge to GlobalPlayer (desktop) — GlobalPlayer listens on ln:player-collapse
    window.dispatchEvent(new CustomEvent("ln:player-collapse"));
  }, []);

  const float = useCallback(() => {
    prevModeRef.current = mode;
    setMode("floating");
    window.dispatchEvent(new CustomEvent("wsp:float"));
  }, [mode]);

  const dock = useCallback(() => {
    setMode("surface");
    window.dispatchEvent(new CustomEvent("wsp:dock"));
  }, []);

  const setFloatingPosition = useCallback((pos: FloatingPosition) => {
    setFloatingPositionState(pos);
    saveFloatPos(pos);
  }, []);

  /* ── Listen for external wsp:* events (e.g. from KeeperComposePage) ── */
  useEffect(() => {
    const onExpand = () => { prevModeRef.current = mode; setMode("expanded"); };
    const onCollapse = () => setMode("surface");
    const onFloat = () => { prevModeRef.current = mode; setMode("floating"); };
    const onDock = () => setMode("surface");

    window.addEventListener("wsp:expand", onExpand);
    window.addEventListener("wsp:collapse", onCollapse);
    window.addEventListener("wsp:float", onFloat);
    window.addEventListener("wsp:dock", onDock);
    return () => {
      window.removeEventListener("wsp:expand", onExpand);
      window.removeEventListener("wsp:collapse", onCollapse);
      window.removeEventListener("wsp:float", onFloat);
      window.removeEventListener("wsp:dock", onDock);
    };
  }, [mode]);

  return (
    <WSPContext.Provider
      value={{
        mode,
        floatingPosition,
        expand,
        collapse,
        float,
        dock,
        setFloatingPosition,
        hasSurface,
        setHasSurface,
      }}
    >
      {children}
    </WSPContext.Provider>
  );
}

export function useWSP(): WSPContextValue {
  const ctx = useContext(WSPContext);
  if (!ctx) throw new Error("useWSP must be used inside WSPProvider");
  return ctx;
}
