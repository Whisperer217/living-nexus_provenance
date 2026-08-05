import React, { createContext, useContext, useEffect, useState } from "react";

// ── Living Nexus Theme System ──────────────────────────────────────
// Three themes, each expressed as a data-theme attribute on <html>.
// CSS variable blocks in index.css respond to [data-theme="..."].
// The "dark" class is also toggled for Tailwind dark: variants.
// ──────────────────────────────────────────────────────────────────
export type LNTheme = "cathedral-dark" | "crimson" | "illuminated-gold";

export const THEME_META: Record<LNTheme, { label: string; description: string; accent: string }> = {
  "cathedral-dark": {
    label: "Cathedral Dark",
    description: "True black void with quartzite gold — the original",
    accent: "#C49A28",
  },
  "crimson": {
    label: "Crimson",
    description: "Blood-red depths with crimson fire and gold",
    accent: "#C41E3A",
  },
  "illuminated-gold": {
    label: "Illuminated Gold",
    description: "Warm amber light on deep charcoal — radiant",
    accent: "#F5C842",
  },
};

const STORAGE_KEY = "ln-theme";
const DEFAULT_THEME: LNTheme = "cathedral-dark";

interface ThemeContextType {
  theme: LNTheme;
  setTheme: (t: LNTheme) => void;
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

function normalizeTheme(raw: string | null | undefined): LNTheme {
  if (!raw) return DEFAULT_THEME;
  if (raw === "dark" || raw === "cathedral-dark") return "cathedral-dark";
  if (raw === "crimson") return "crimson";
  if (raw === "illuminated-gold") return "illuminated-gold";
  return DEFAULT_THEME;
}

export function ThemeProvider({
  children,
  defaultTheme = "cathedral-dark",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<LNTheme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return normalizeTheme(stored) ?? normalizeTheme(defaultTheme as string);
  });

  useEffect(() => {
    const root = document.documentElement;

    // Set data-theme attribute — activates CSS variable blocks
    root.setAttribute("data-theme", theme);

    // Keep Tailwind dark: variants working — all LN themes are dark-base
    root.classList.add("dark");

    // Persist
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: LNTheme) => setThemeState(t);

  // Legacy compat for any code that calls toggleTheme()
  const toggleTheme = () => {
    setThemeState(prev =>
      prev === "cathedral-dark" ? "illuminated-gold" : "cathedral-dark"
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, switchable: true, toggleTheme }}>
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
