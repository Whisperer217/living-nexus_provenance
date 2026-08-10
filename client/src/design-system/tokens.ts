/**
 * @domain   The Doctrine → Design Language → Token Layer
 * @impl     Design Token — Single source of truth for all visual decisions on the platform
 */
/**
 * Living Nexus Design System — Tokens
 * ════════════════════════════════════════════════════════════════════
 * Single source of truth for every design decision on the platform.
 * Philosophy: Sacred Technology × Sovereign Witness
 * Aesthetic:  True-Black Museum Void · Quartzite Gold Veining · Reverent Feel
 *
 * RULE: Never hardcode hex values in components. Always reference these tokens.
 * CSS variables are the runtime layer; this file is the authoring layer.
 * ════════════════════════════════════════════════════════════════════
 */

// ── Color Palette ─────────────────────────────────────────────────────────────

/** Surface / void steps — true-black museum palette */
export const COLOR_SURFACE = {
  /** True Black — page background */
  void:    "#000000",
  /** Near-Black — sidebar, nav, secondary surfaces */
  void2:   "#080808",
  /** Lifted Void — cards, raised surfaces */
  void3:   "#111111",
  /** Elevated Void — modals, popovers */
  void4:   "#1A1A1A",
  /** Surface Void — hover states, inputs */
  void5:   "#222222",
} as const;

/** Quartzite stone text tones — pearl text on true-black */
export const COLOR_TEXT = {
  /** Pale Quartzite — primary body text */
  primary:   "#EDE5D0",
  /** Warm Quartzite — secondary text, descriptions */
  secondary: "#D8C9A8",
  /** Shadow Stone — muted text, labels, placeholders */
  muted:     "#6B6555",
  /** Deep muted — disabled states */
  disabled:  "#3D3A30",
} as const;

/** Gold accent — quartzite veining on black void */
export const COLOR_GOLD = {
  /** Quartzite Gold — primary accent, CTA, badges, active states */
  base:    "#C49A28",
  /** Bright Vein — hover on gold elements */
  bright:  "#D4A84B",
  /** Flame — strongest hover, hero text accent */
  flame:   "#E8B840",
  /** Pearl — highest contrast gold highlight */
  pearl:   "#F5CC5A",
  /** Shadow Stone — subdued accents, footnotes */
  dim:     "#8B6914",
  /** Muted — very low-emphasis gold */
  ghost:   "#6B6555",
} as const;

/** Gold border/fill alpha values — use as rgba(212,175,55, X) */
export const COLOR_GOLD_ALPHA = {
  /** Standard gold border — drawers, cards, provenance */
  border:   "rgba(212,175,55,0.28)",
  /** Subtle gold fill / inset */
  fill:     "rgba(212,175,55,0.15)",
  /** Barely-there tint */
  tint:     "rgba(212,175,55,0.08)",
  /** Active/hover gold border */
  active:   "rgba(212,175,55,0.60)",
  /** Strong glow border */
  glow:     "rgba(196,154,40,0.22)",
} as const;

/** Semantic status colors */
export const COLOR_STATUS = {
  /** Verified / Published / Alive */
  green:     "#4ADE80",
  greenSoft: "#86EFAC",
  /** Draft / In Progress / Transition */
  orange:    "#D4A84B",
  orangeSoft:"#EDE5D0",
  /** Destructive / Warning / Irreversible */
  red:       "#F87171",
  redSoft:   "#FCA5A5",
  /** Terra Cotta — warm destructive action */
  terra:     "#E2725B",
} as const;

/** Medium accent colors — Loop is music-only; gold is the provenance signal */
export const COLOR_MEDIUM = {
  audio:      { primary: "#C49A28", glow: "rgba(196,154,40,0.35)", bg: "rgba(196,154,40,0.10)",  border: "rgba(196,154,40,0.40)" },
  lyrics:     { primary: "#F5C451", glow: "rgba(245,196,81,0.35)",  bg: "rgba(208,161,95,0.12)",  border: "rgba(245,196,81,0.40)"  },
  manuscript: { primary: "#4ADE80", glow: "rgba(74,222,128,0.30)",  bg: "rgba(22,163,74,0.12)",   border: "rgba(74,222,128,0.40)"  },
  comic:      { primary: "#F87171", glow: "rgba(248,113,113,0.30)", bg: "rgba(220,38,38,0.12)",   border: "rgba(248,113,113,0.40)" },
  game:       { primary: "#34D399", glow: "rgba(52,211,153,0.30)",  bg: "rgba(16,185,129,0.12)",  border: "rgba(52,211,153,0.40)"  },
  visual:     { primary: "#FDA4AF", glow: "rgba(253,164,175,0.30)", bg: "rgba(244,63,94,0.10)",   border: "rgba(253,164,175,0.40)" },
} as const;

// ── Typography ────────────────────────────────────────────────────────────────

/** Font family tokens — reference CSS variables at runtime */
export const FONT_FAMILY = {
  /** Cinzel — wordmark, section headings, overlines, badges */
  display:   "'Cinzel', serif",
  /** Cormorant Garamond — editorial headings, card titles, pull quotes */
  editorial: "'Cormorant Garamond', serif",
  /** DM Sans — body copy, UI text, labels, nav */
  body:      "'DM Sans', sans-serif",
  /** Space Mono — WID stamps, terminal text, provenance codes */
  mono:      "'Space Mono', monospace",
} as const;

/** Type scale — maps to CSS --text-* variables */
export const FONT_SIZE = {
  /** 11–12px — badges, WID labels, overlines */
  xs:   "var(--text-xs)",
  /** 13–15px — captions, timestamps, meta */
  sm:   "var(--text-sm)",
  /** 15–17px — body copy */
  base: "var(--text-base)",
  /** 18–22px — card titles (Cormorant) */
  h4:   "var(--text-h4)",
  /** 22–28px — panel headings (Cormorant) */
  h3:   "var(--text-h3)",
  /** 26–36px — section headings (Cinzel) */
  h2:   "var(--text-h2)",
  /** 32–56px — hero, page titles (Cinzel) */
  h1:   "var(--text-h1)",
} as const;

/** Font weight tokens */
export const FONT_WEIGHT = {
  body:      400,
  ui:        500,
  h4:        500,
  h3:        600,
  h2:        600,
  h1:        700,
  overline:  600,
} as const;

/** Letter spacing tokens */
export const LETTER_SPACING = {
  body:      "0em",
  ui:        "0.015em",
  h4:        "0.025em",
  h3:        "0.035em",
  h2:        "0.06em",
  h1:        "0.08em",
  overline:  "0.20em",
} as const;

/** Line height tokens */
export const LINE_HEIGHT = {
  body: 1.75,
  h4:   1.5,
  h3:   1.4,
  h2:   1.2,
  h1:   1.05,
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────

/** Fluid spacing scale — maps to CSS --space-* variables */
export const SPACE = {
  /** 4–6px */
  1:  "var(--space-1)",
  /** 6–10px */
  2:  "var(--space-2)",
  /** 8–14px */
  3:  "var(--space-3)",
  /** 12–20px */
  4:  "var(--space-4)",
  /** 16–28px */
  5:  "var(--space-5)",
  /** 20–36px */
  6:  "var(--space-6)",
  /** 24–48px */
  8:  "var(--space-8)",
  /** 32–64px */
  10: "var(--space-10)",
} as const;

/** Golden ratio spacing — φ = 1.618 */
export const PHI_SPACE = {
  /** 10px */
  phi1: "var(--phi-1)",
  /** 16px */
  phi2: "var(--phi-2)",
  /** 26px */
  phi3: "var(--phi-3)",
  /** 42px */
  phi4: "var(--phi-4)",
  /** 69px */
  phi5: "var(--phi-5)",
  /** 111px */
  phi6: "var(--phi-6)",
} as const;

// ── Border Radius ─────────────────────────────────────────────────────────────

/** Corner radii — from sharp to pill */
export const RADIUS = {
  /** 0px — no rounding, sharp architectural edges */
  none:  "0px",
  /** 2px — subtle rounding for small chips */
  xs:    "2px",
  /** 4px — small elements: badges, tags */
  sm:    "4px",
  /** 8px — medium elements: inputs, buttons */
  md:    "8px",
  /** 12px — cards, panels */
  lg:    "12px",
  /** 16px — large cards, drawers */
  xl:    "16px",
  /** 24px — modals, sheets */
  "2xl": "24px",
  /** 9999px — pills, full-round badges */
  pill:  "9999px",
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────

/** Elevation shadows — depth on true-black */
export const SHADOW = {
  /** Subtle — 1dp lift for interactive elements */
  sm:   "0 1px 4px rgba(0,0,0,0.40)",
  /** Medium — 2dp for cards */
  md:   "0 2px 8px rgba(0,0,0,0.60), 0 1px 3px rgba(0,0,0,0.40)",
  /** Large — 4dp for drawers, modals */
  lg:   "0 8px 24px rgba(0,0,0,0.60), 0 2px 8px rgba(0,0,0,0.40)",
  /** XL — 8dp for floating panels */
  xl:   "0 16px 48px rgba(0,0,0,0.70), 0 4px 16px rgba(0,0,0,0.50)",
  /** Card hover — 3D lift with gold edge */
  cardHover: "0 12px 32px rgba(0,0,0,0.50), 0 4px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(203,177,131,0.20), inset 0 1px 0 rgba(230,205,174,0.08)",
} as const;

// ── Glow Treatments ───────────────────────────────────────────────────────────

/** Glow box-shadow values — candlelight halo system */
export const GLOW = {
  /** Standard gold halo — cards, buttons */
  gold:     "0 0 22px 4px rgba(196,154,40,0.20), 0 0 8px 1px rgba(196,154,40,0.28)",
  /** WID badge amber halo — provenance stamps */
  wid:      "0 0 16px 4px rgba(196,154,40,0.50), 0 0 6px 1px rgba(196,154,40,0.35), 0 0 32px 8px rgba(196,154,40,0.20)",
  /** Player bar uplight — warm amber lantern from below */
  player:   "0 -4px 32px rgba(196,154,40,0.16), 0 -1px 8px rgba(196,154,40,0.22), 0 -8px 48px rgba(196,154,40,0.08)",
  /** Track card hover lift */
  trackCard:"0 4px 28px rgba(196,154,40,0.18), 0 2px 10px rgba(196,154,40,0.16)",
  /** CTA button hover glow */
  btn:      "0 0 20px 5px rgba(196,154,40,0.35), 0 4px 18px rgba(196,154,40,0.22)",
  /** Active track edge glow */
  active:   "0 0 0 1px rgba(196,154,40,0.30), 0 4px 20px rgba(196,154,40,0.12)",
  /** Green verified glow */
  green:    "0 0 18px 2px rgba(74,222,128,0.18), 0 0 6px 0px rgba(74,222,128,0.25)",
} as const;

// ── Border Treatments ─────────────────────────────────────────────────────────

/** Standard border definitions */
export const BORDER = {
  /** Default gold border — cards, panels */
  gold:       `1px solid rgba(196,154,40,0.22)`,
  /** Subtle gold border — secondary elements */
  goldSubtle: `1px solid rgba(196,154,40,0.14)`,
  /** Active/hover gold border */
  goldActive: `1px solid rgba(196,154,40,0.60)`,
  /** Strong gold border — WID, provenance */
  goldStrong: `1px solid rgba(196,154,40,0.45)`,
  /** Muted border — dividers, separators */
  muted:      `1px solid rgba(255,255,255,0.06)`,
  /** Input border */
  input:      `1px solid rgba(196,154,40,0.12)`,
  /** Destructive border */
  destructive:`1px solid rgba(248,113,113,0.40)`,
} as const;

// ── Motion / Animation ────────────────────────────────────────────────────────

/** Transition durations */
export const DURATION = {
  /** Instant — state changes that should feel immediate */
  instant:  "0ms",
  /** Fast — micro-interactions, icon swaps */
  fast:     "120ms",
  /** Normal — most hover/focus transitions */
  normal:   "200ms",
  /** Slow — card lifts, glow fades */
  slow:     "300ms",
  /** Deliberate — drawer slides, page transitions */
  deliberate:"400ms",
  /** Reverent — breathing animations, WID pulses */
  reverent: "3000ms",
} as const;

/** Easing functions */
export const EASING = {
  /** Standard ease — most transitions */
  standard: "ease",
  /** Ease out — elements entering the screen */
  enter:    "cubic-bezier(0.0, 0.0, 0.2, 1)",
  /** Ease in — elements leaving the screen */
  exit:     "cubic-bezier(0.4, 0.0, 1, 1)",
  /** Spring — bouncy interactive feedback */
  spring:   "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** Gentle — reverent, unhurried */
  gentle:   "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
} as const;

/** Named animation keyframe references — use as CSS animation names */
export const ANIMATION = {
  /** Page section entrance — fade up 12px */
  fadeUp:       "fadeUp 0.35s ease both",
  /** Gold shimmer text — candlelight flicker */
  goldShimmer:  "goldShimmer 4s linear infinite",
  /** WID badge pulse — slow reverent breath */
  widPulse:     "widPulse 3s ease-in-out infinite",
  /** Live wave bars — audio playing indicator */
  waveBar:      "waveBar 0.7s ease-in-out infinite alternate",
  /** Pulse dot — live indicator */
  pulseDot:     "pulseDot 1.5s ease-in-out infinite",
  /** Witness breathe — card hover organic pulse */
  breathe:      "witness-breathe 4s ease-in-out infinite",
  /** Progress glow — playhead candlelight pulse */
  progressGlow: "progressGlow 1.8s ease-in-out infinite",
  /** Flame pulse — volume slider thumb */
  flamePulse:   "flamePulse 2.4s ease-in-out infinite",
} as const;

// ── Z-Index Hierarchy ─────────────────────────────────────────────────────────

/** Z-index layers — strict hierarchy, never deviate */
export const Z_INDEX = {
  /** Base content */
  base:            0,
  /** Raised content — sticky headers, floating labels */
  raised:          10,
  /** Marketplace drawer */
  marketplaceDrawer: 55,
  /** Dashboard sidebar */
  sidebar:         50,
  /** Radix portals default */
  radixPortal:     50,
  /** Contextual modal */
  modal:           999,
  /** Creative Drawer / Edit Chapel */
  creativeDrawer:  9000,
  /** Toast / Pull-to-Refresh */
  toast:           9999,
  /** PWA Banner / Global Player */
  globalPlayer:    99990,
  /** Player Bar / QR Identity Card */
  playerBar:       99999,
} as const;

// ── Layout Chrome ─────────────────────────────────────────────────────────────

/** Fixed layout dimensions — single source of truth */
export const LAYOUT = {
  /** Desktop TopBar height */
  topbarH:    "52px",
  /** Desktop LeftRail width */
  leftrailW:  "72px",
  /** ContextDrawer width */
  drawerW:    "300px",
  /** RightRail width */
  rightrailW: "300px",
  /** Player bar height */
  playerBarH: "82px",
  /** Hero height — golden ratio 61.8vh */
  heroH:      "clamp(420px, 61.8vh, 680px)",
} as const;

// ── Grid System ───────────────────────────────────────────────────────────────

/** Breakpoints — mobile-first */
export const BREAKPOINT = {
  sm:  "640px",
  md:  "768px",
  lg:  "1024px",
  xl:  "1280px",
  "2xl": "1536px",
} as const;

/** Standard grid column counts per breakpoint */
export const GRID_COLS = {
  /** Single column — mobile default */
  mobile:  1,
  /** Two columns — tablet */
  tablet:  2,
  /** Three columns — desktop standard (museum grid) */
  desktop: 3,
  /** Four columns — wide desktop */
  wide:    4,
} as const;

// ── Accessibility ─────────────────────────────────────────────────────────────

/** Minimum touch target size — WCAG 2.5.5 */
export const MIN_TOUCH_TARGET = "44px";

/** Minimum contrast ratios */
export const CONTRAST = {
  /** WCAG AA normal text — 4.5:1 */
  aa:   4.5,
  /** WCAG AA large text — 3:1 */
  aaLarge: 3,
  /** WCAG AAA — 7:1 */
  aaa:  7,
} as const;

/** Focus ring — visible keyboard focus indicator */
export const FOCUS_RING = {
  /** Standard focus ring — gold outline */
  standard: "0 0 0 2px rgba(196,154,40,0.80)",
  /** Offset focus ring — for elements on gold backgrounds */
  offset:   "0 0 0 2px #000000, 0 0 0 4px rgba(196,154,40,0.80)",
} as const;

// ── Iconography ───────────────────────────────────────────────────────────────

/** Standard icon sizes */
export const ICON_SIZE = {
  /** 12px — inline, micro badges */
  xs:  12,
  /** 16px — small UI icons */
  sm:  16,
  /** 20px — standard UI icons */
  md:  20,
  /** 24px — nav icons, action icons */
  lg:  24,
  /** 32px — feature icons */
  xl:  32,
  /** 48px — hero icons, medium selector */
  "2xl": 48,
} as const;

// ── Surface Constants ─────────────────────────────────────────────────────────
// Use inside drawers and modals — not as CSS variables

/** Drawer/modal surface constants */
export const SURFACE = {
  /** Primary drawer background */
  primary:   "rgba(8,6,16,0.99)",
  /** Secondary drawer surface */
  secondary: "rgba(16,12,28,0.97)",
  /** Muted text inside drawers */
  textMuted: "rgba(255,255,255,0.42)",
  /** Gold border inside drawers */
  goldBorder:"rgba(212,175,55,0.28)",
} as const;

// ── Type Helpers ──────────────────────────────────────────────────────────────

export type ColorSurface   = keyof typeof COLOR_SURFACE;
export type ColorText      = keyof typeof COLOR_TEXT;
export type ColorGold      = keyof typeof COLOR_GOLD;
export type ColorStatus    = keyof typeof COLOR_STATUS;
export type MediumType     = keyof typeof COLOR_MEDIUM;
export type FontFamily     = keyof typeof FONT_FAMILY;
export type FontSize       = keyof typeof FONT_SIZE;
export type RadiusKey      = keyof typeof RADIUS;
export type ShadowKey      = keyof typeof SHADOW;
export type GlowKey        = keyof typeof GLOW;
export type DurationKey    = keyof typeof DURATION;
export type EasingKey      = keyof typeof EASING;
export type ZIndexKey      = keyof typeof Z_INDEX;
export type BreakpointKey  = keyof typeof BREAKPOINT;
