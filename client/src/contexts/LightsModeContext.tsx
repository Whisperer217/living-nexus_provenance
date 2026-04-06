/**
 * LightsModeContext
 *
 * Fetches the platform owner's `lightsMode` setting and applies the
 * `.lights-on` CSS class to <html> when the mode is "on".
 *
 * Flash prevention strategy:
 *   1. On first render, read `lnx_lights_mode` from localStorage and apply
 *      the class synchronously — this runs before the first paint so there
 *      is no visible flash.
 *   2. Once the tRPC query resolves, sync state from the server and persist
 *      the latest value back to localStorage for the next visit.
 *
 * The context also exposes `setMode` so the owner's ProfilePage can
 * optimistically toggle the mode without a full page reload.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type LightsMode = "dim" | "on";

const LS_KEY = "lnx_lights_mode";

/** Read the stored mode synchronously — safe to call during render */
function readStoredMode(): LightsMode {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === "on" || stored === "dim") return stored;
  } catch {
    /* localStorage blocked (private browsing, etc.) — fall through */
  }
  return "dim";
}

/** Apply or remove .lights-on on <html> immediately (no React state cycle) */
function applyClass(mode: LightsMode) {
  if (mode === "on") {
    document.documentElement.classList.add("lights-on");
  } else {
    document.documentElement.classList.remove("lights-on");
  }
}

// Hydrate the class synchronously before React renders anything
// This runs at module-evaluation time, before the first paint.
applyClass(readStoredMode());

interface LightsModeContextValue {
  mode: LightsMode;
  setMode: (mode: LightsMode) => void;
}

const LightsModeContext = createContext<LightsModeContextValue>({
  mode: readStoredMode(),
  setMode: () => {},
});

export function LightsModeProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage so the first render matches the already-applied class
  const [mode, setModeState] = useState<LightsMode>(readStoredMode);

  const { data } = trpc.profile.getLightsMode.useQuery(undefined, {
    staleTime: 60_000,          // re-fetch at most once per minute
    refetchOnWindowFocus: false,
  });

  // Sync from server once the query resolves — also persists to localStorage
  useEffect(() => {
    if (data?.lightsMode && (data.lightsMode === "on" || data.lightsMode === "dim")) {
      const serverMode = data.lightsMode as LightsMode;
      setModeState(serverMode);
      applyClass(serverMode);
      try { localStorage.setItem(LS_KEY, serverMode); } catch { /* ignore */ }
    }
  }, [data?.lightsMode]);

  const setMode = (m: LightsMode) => {
    setModeState(m);
    applyClass(m);
    try { localStorage.setItem(LS_KEY, m); } catch { /* ignore */ }
  };

  return (
    <LightsModeContext.Provider value={{ mode, setMode }}>
      {children}
    </LightsModeContext.Provider>
  );
}

export function useLightsMode() {
  return useContext(LightsModeContext);
}
