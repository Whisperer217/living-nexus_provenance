/**
 * LightsModeContext
 *
 * Owner profile "Lights On / Dim" preference.
 * Maps onto the shared ThemeProvider palette:
 *   - "dim" → cathedral-dark
 *   - "on"  → parchment-cream (real cream/white surfaces)
 *
 * ThemeProvider remains the source of truth for data-theme after mount;
 * this context keeps the owner toggle and ThemeSwitcher aligned via localStorage.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type LightsMode = "dim" | "on";

const LS_KEY = "lnx_theme";
const THEME_LS_KEY = "ln-theme";

/** Read the stored mode synchronously — safe to call during render */
function readStoredMode(): LightsMode {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === "on" || stored === "dim") return stored;
    const theme = localStorage.getItem(THEME_LS_KEY);
    if (theme === "parchment-cream" || theme === "warm") return "on";
  } catch {
    /* localStorage blocked (private browsing, etc.) — fall through */
  }
  return "dim";
}

/** Apply theme keys so ThemeProvider + CSS stay aligned */
function applyTheme(mode: LightsMode) {
  const themeName = mode === "on" ? "parchment-cream" : "cathedral-dark";
  document.documentElement.setAttribute("data-theme", themeName);
  document.documentElement.setAttribute("data-scheme", mode === "on" ? "light" : "dark");
  if (mode === "on") {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }
  try {
    localStorage.setItem(LS_KEY, mode);
    localStorage.setItem(THEME_LS_KEY, themeName);
  } catch { /* ignore */ }
}

// Hydrate the theme synchronously before React renders anything.
// This runs at module-evaluation time, before the first paint.
applyTheme(readStoredMode());

interface LightsModeContextValue {
  mode: LightsMode;
  setMode: (mode: LightsMode) => void;
}

const LightsModeContext = createContext<LightsModeContextValue>({
  mode: readStoredMode(),
  setMode: () => {},
});

export function LightsModeProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage so the first render matches the already-applied theme
  const [mode, setModeState] = useState<LightsMode>(readStoredMode);

  const { data } = trpc.profile.getLightsMode.useQuery(undefined, {
    staleTime: 60_000,           // re-fetch at most once per minute
    refetchOnWindowFocus: false,
  });

  // Sync from server once the query resolves — also persists to localStorage
  useEffect(() => {
    if (data?.lightsMode && (data.lightsMode === "on" || data.lightsMode === "dim")) {
      const serverMode = data.lightsMode as LightsMode;
      setModeState(serverMode);
      applyTheme(serverMode);
    }
  }, [data?.lightsMode]);

  const setMode = (m: LightsMode) => {
    setModeState(m);
    applyTheme(m);
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
