import { useState, useRef, useEffect } from "react";
import { useTheme, THEME_META, type LNTheme } from "@/contexts/ThemeContext";
import { Palette } from "lucide-react";

// ── Theme accent preview colors ──────────────────────────────────
const THEME_SWATCHES: Record<LNTheme, { bg: string; accent: string; secondary: string }> = {
  "cathedral-dark": {
    bg: "#000000",
    accent: "#C49A28",
    secondary: "#1A1A1A",
  },
  "crimson": {
    bg: "#140008",
    accent: "#E8294F",
    secondary: "#2A0010",
  },
  "illuminated-gold": {
    bg: "#120E00",
    accent: "#F5C842",
    secondary: "#2A2200",
  },
  "parchment-cream": {
    bg: "#F7F1E6",
    accent: "#9A7518",
    secondary: "#EFE6D8",
  },
};

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentAccent = THEME_SWATCHES[theme].accent;

  return (
    <div ref={ref} className="relative" style={{ WebkitTapHighlightColor: "transparent" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center justify-center rounded-lg transition-all"
        style={{
          minWidth: compact ? 36 : 40,
          minHeight: compact ? 36 : 40,
          padding: "0 8px",
          color: open ? currentAccent : "var(--ln-smoke)",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = currentAccent; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.color = "var(--ln-smoke)"; }}
        aria-label="Change theme"
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Change theme"
      >
        {/* Palette icon with a tiny color dot showing current theme */}
        <span className="relative">
          <Palette size={compact ? 16 : 17} />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black/60"
            style={{ background: currentAccent }}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          role="listbox"
          aria-label="Select theme"
          className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden"
          style={{
            zIndex: 9999,
            background: "var(--ln-panel)",
            border: "1px solid var(--ln-panel-border)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            minWidth: 220,
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-2.5 border-b"
            style={{
              borderColor: "var(--ln-panel-border)",
              fontFamily: "'Cinzel', serif",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--ln-gold-dim)",
            }}
          >
            APPEARANCE
          </div>

          {/* Theme options */}
          {(Object.keys(THEME_META) as LNTheme[]).map(t => {
            const swatch = THEME_SWATCHES[t];
            const meta = THEME_META[t];
            const isActive = theme === t;

            return (
              <button
                key={t}
                role="option"
                aria-selected={isActive}
                onClick={() => { setTheme(t); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                style={{
                  background: isActive ? "rgba(196,154,40,0.08)" : "transparent",
                  borderLeft: isActive ? `2px solid ${swatch.accent}` : "2px solid transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--ln-parchment) 6%, transparent)";
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {/* Color swatch preview */}
                <div
                  className="w-8 h-8 rounded-md shrink-0 overflow-hidden"
                  style={{ border: `1px solid ${swatch.accent}40` }}
                  aria-hidden="true"
                >
                  {/* Mini preview: bg + accent stripe */}
                  <div className="w-full h-full relative" style={{ background: swatch.bg }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2"
                      style={{ background: swatch.accent, opacity: 0.85 }}
                    />
                    <div
                      className="absolute top-1 left-1 right-1 h-1.5 rounded-sm"
                      style={{ background: swatch.secondary }}
                    />
                  </div>
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium leading-tight"
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      color: isActive ? swatch.accent : "var(--ln-parchment)",
                    }}
                  >
                    {meta.label}
                  </div>
                  <div
                    className="text-xs leading-tight mt-0.5 truncate"
                    style={{
                      fontSize: 10,
                      color: "var(--ln-smoke)",
                    }}
                  >
                    {meta.description}
                  </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: swatch.accent }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {/* Footer hint */}
          <div
            className="px-4 py-2 border-t"
            style={{
              borderColor: "rgba(196,154,40,0.08)",
              fontSize: 9,
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.2)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Saved to your profile
          </div>
        </div>
      )}
    </div>
  );
}
