/**
 * Document theme application — single source of truth for data-theme / scheme / dark class.
 * Used by ThemeProvider and the pre-paint bootstrap in index.html (inline mirror).
 */

export type LNTheme = "cathedral-dark" | "crimson" | "illuminated-gold" | "parchment-cream";

export const THEME_STORAGE_KEY = "ln-theme";
export const LIGHTS_STORAGE_KEY = "lnx_theme";
export const DEFAULT_THEME: LNTheme = "cathedral-dark";

export const THEME_META: Record<
  LNTheme,
  { label: string; description: string; accent: string; scheme: "dark" | "light" }
> = {
  "cathedral-dark": {
    label: "Cathedral Dark",
    description: "True black void with quartzite gold — the original",
    accent: "#C49A28",
    scheme: "dark",
  },
  crimson: {
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

export function normalizeTheme(raw: string | null | undefined): LNTheme {
  if (!raw) return DEFAULT_THEME;
  if (raw === "dark" || raw === "cathedral-dark") return "cathedral-dark";
  if (raw === "crimson") return "crimson";
  if (raw === "illuminated-gold") return "illuminated-gold";
  if (raw === "parchment-cream" || raw === "warm" || raw === "light" || raw === "cream") {
    return "parchment-cream";
  }
  return DEFAULT_THEME;
}

/** Prefer ln-theme; fall back to lights preference (on → cream). */
export function readStoredTheme(): LNTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return normalizeTheme(stored);
    const lights = localStorage.getItem(LIGHTS_STORAGE_KEY);
    if (lights === "on") return "parchment-cream";
  } catch {
    /* private browsing, etc. */
  }
  return DEFAULT_THEME;
}

/** Whether a named theme has been explicitly selected and must outrank legacy Lights Mode sync. */
export function hasExplicitStoredTheme(): boolean {
  try {
    return Boolean(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return false;
  }
}

/** Apply theme to <html> and persist. Idempotent. */
export function applyDocumentTheme(theme: LNTheme): void {
  const root = document.documentElement;
  const meta = THEME_META[theme];

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-scheme", meta.scheme);

  if (meta.scheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(LIGHTS_STORAGE_KEY, meta.scheme === "light" ? "on" : "dim");
  } catch {
    /* ignore */
  }

  // Keep theme-color meta in sync for mobile chrome / overscroll
  const bg = meta.scheme === "light" ? "#F7F1E6" : "#000000";
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
    el.setAttribute("content", bg);
  });
}

export const THEME_CHANGE_EVENT = "ln-theme-change";

export function dispatchThemeChange(theme: LNTheme): void {
  try {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
  } catch {
    /* ignore */
  }
}
