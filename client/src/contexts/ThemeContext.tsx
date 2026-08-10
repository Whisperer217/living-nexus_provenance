import React, { createContext, useContext, useEffect, useState } from "react";

// ── Living Nexus Theme System ──────────────────────────────────────
// Three themes, each expressed as a data-theme attribute on <html>.
// CSS variable blocks in index.css respond to [data-theme="..."].
// The "dark" class is also toggled for Tailwind dark: variants.
// ──────────────────────────────────────────────────────────────────
export type LNTheme = "cathedral-dark" | "crimson" | "illuminated-gold" | "parchment-cream";

export const THEME_META: Record<LNTheme, { label: string; description: string; accent: string; scheme: "dark" | "light" }> = {
  "cathedral-dark": {
    label: "Cathedral Dark",
    description: "True black void with quartzite gold — the original",
    accent: "#C49A28",
    scheme: "dark",
  },
  "crimson": {
    label: "Crimson",
    description: "Blood-red depths with crimson fire",
    accent: "#E8294F",
    scheme: "dark",
  },
  "illuminated-gold": {
    label: "Illuminated Gold",
    description: "Warm amber light on deep charcoal — radiant",
    accent: "#F5C842",
    scheme: "dark",
  },
  "parchment-cream": {
    label: "Parchment Cream",
    description: "Museum daylight — cream paper, espresso ink, gold vein",
    accent: "#9A7518",
    scheme: "light",
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
  if (raw === "parchment-cream" || raw === "warm" || raw === "light" || raw === "cream") return "parchment-cream";
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
    const meta = THEME_META[theme];

    // Set data-theme attribute — activates CSS variable blocks
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-scheme", meta.scheme);

    // Tailwind dark: variants only for dark-scheme themes
    if (meta.scheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Persist + keep Lights Mode preference aligned
    localStorage.setItem(STORAGE_KEY, theme);
    try {
      localStorage.setItem("lnx_theme", meta.scheme === "light" ? "on" : "dim");
    } catch { /* ignore */ }
  }, [theme]);

  const setTheme = (t: LNTheme) => setThemeState(t);

  // Legacy compat for any code that calls toggleTheme()
  const toggleTheme = () => {
    setThemeState(prev =>
      prev === "cathedral-dark" ? "parchment-cream" : "cathedral-dark"
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
