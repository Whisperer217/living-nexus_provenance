/**
 * LightsModeContext
 *
 * Owner profile "Lights On / Dim" preference — a thin adapter over ThemeProvider.
 * Does NOT write data-theme itself (ThemeProvider is the sole DOM owner).
 *   - "on"  → parchment-cream
 *   - "dim" → cathedral-dark only when leaving a light theme (preserves crimson / illuminated-gold)
 */
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { THEME_META, type LNTheme } from "@/lib/theme-dom";
import { useTheme } from "@/contexts/ThemeContext";

export type LightsMode = "dim" | "on";

interface LightsModeContextValue {
  mode: LightsMode;
  setMode: (mode: LightsMode) => void;
}

const LightsModeContext = createContext<LightsModeContextValue>({
  mode: "dim",
  setMode: () => {},
});

function modeFromTheme(theme: LNTheme): LightsMode {
  return THEME_META[theme].scheme === "light" ? "on" : "dim";
}

export function LightsModeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const mode = modeFromTheme(theme);
  const appliedServerSync = useRef(false);

  const { data } = trpc.profile.getLightsMode.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // One-shot server sync: only nudge base cathedral ↔ cream; never clobber specialty themes.
  useEffect(() => {
    if (appliedServerSync.current) return;
    if (!data?.lightsMode || (data.lightsMode !== "on" && data.lightsMode !== "dim")) return;
    appliedServerSync.current = true;

    const serverMode = data.lightsMode as LightsMode;
    const isSpecialty = theme === "crimson" || theme === "illuminated-gold";
    if (isSpecialty) return;

    if (serverMode === "on" && theme !== "parchment-cream") {
      setTheme("parchment-cream");
    } else if (serverMode === "dim" && theme === "parchment-cream") {
      setTheme("cathedral-dark");
    }
  }, [data?.lightsMode, theme, setTheme]);

  const setMode = (m: LightsMode) => {
    if (m === "on") {
      setTheme("parchment-cream");
      return;
    }
    // dim: leave specialty dark themes alone; only flip cream → cathedral
    if (THEME_META[theme].scheme === "light") {
      setTheme("cathedral-dark");
    }
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
