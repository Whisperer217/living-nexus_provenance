import React, { createContext, useContext, useEffect, useState } from "react";
import {
  applyDocumentTheme,
  normalizeTheme,
  readStoredTheme,
  THEME_CHANGE_EVENT,
  THEME_META,
  type LNTheme,
} from "@/lib/theme-dom";

export type { LNTheme };
export { THEME_META };

interface ThemeContextType {
  theme: LNTheme;
  setTheme: (t: LNTheme) => void;
  scheme: "dark" | "light";
  // Legacy compat
  switchable: boolean;
  toggleTheme?: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: LNTheme | "dark" | "light";
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "cathedral-dark",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<LNTheme>(() => {
    const stored = readStoredTheme();
    if (stored) return stored;
    return normalizeTheme(defaultTheme as string);
  });

  // Apply on every theme change (and initial mount — FOUC script already set attrs)
  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  // Cross-tab + LightsMode / external writers
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ln-theme" && e.newValue) {
        setThemeState(normalizeTheme(e.newValue));
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ theme?: string }>).detail;
      if (detail?.theme) setThemeState(normalizeTheme(detail.theme));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, onCustom);
    };
  }, []);

  const setTheme = (t: LNTheme) => setThemeState(t);

  const toggleTheme = () => {
    setThemeState((prev) =>
      THEME_META[prev].scheme === "light" ? "cathedral-dark" : "parchment-cream"
    );
  };

  const scheme = THEME_META[theme].scheme;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, scheme, switchable: true, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
