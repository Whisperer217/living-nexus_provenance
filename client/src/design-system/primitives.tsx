/**
 * Living Nexus Design System — Core Primitives
 * ════════════════════════════════════════════════════════════════════
 * Reusable atomic components. Every primitive is built from tokens.
 * No page-specific logic. No tRPC calls. Pure UI.
 *
 * Components:
 *   LnButton       — 5-variant button hierarchy
 *   LnBadge        — semantic status + custom badges
 *   LnDivider      — sacred geometry section separators
 *   LnAvatar       — creator avatar with fallback
 *   LnTag          — genre/category pill tags
 *   LnOverline     — Cinzel caps section label
 *   LnText         — typed text with correct font/size/weight
 *   LnIcon         — icon wrapper with consistent sizing
 *   LnSpinner      — loading state indicator
 *   LnLiveWave     — audio playing animation
 *   LnPulseDot     — live indicator dot
 * ════════════════════════════════════════════════════════════════════
 */

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ── LnButton ──────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize    = "xs" | "sm" | "md" | "lg" | "icon";

interface LnButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant — defines the button's role in the hierarchy */
  variant?: ButtonVariant;
  /** Size — controls padding and font size */
  size?: ButtonSize;
  /** Show a loading spinner and disable interaction */
  loading?: boolean;
  /** Stretch to full container width */
  fullWidth?: boolean;
  /** Left-side icon */
  leftIcon?: React.ReactNode;
  /** Right-side icon */
  rightIcon?: React.ReactNode;
}

const BUTTON_BASE = [
  "inline-flex items-center justify-center gap-2",
  "font-medium transition-all duration-200",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(196,154,40,0.80)]",
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
  "select-none",
].join(" ");

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  /** Gold fill — primary CTA, most important action on screen */
  primary: [
    "bg-[#C49A28] text-black",
    "hover:bg-[#D4A84B] hover:shadow-[0_0_20px_5px_rgba(196,154,40,0.35),0_4px_18px_rgba(196,154,40,0.22)]",
    "active:bg-[#B8820A] active:scale-[0.98]",
    "border border-[rgba(196,154,40,0.60)]",
  ].join(" "),

  /** Subtle gold outline — secondary action */
  secondary: [
    "bg-[rgba(196,154,40,0.08)] text-[#C49A28]",
    "border border-[rgba(196,154,40,0.28)]",
    "hover:bg-[rgba(196,154,40,0.14)] hover:border-[rgba(196,154,40,0.50)]",
    "active:scale-[0.98]",
  ].join(" "),

  /** Transparent — tertiary, low-emphasis */
  ghost: [
    "bg-transparent text-[#D8C9A8]",
    "hover:bg-[rgba(255,255,255,0.06)] hover:text-[#EDE5D0]",
    "active:scale-[0.98]",
  ].join(" "),

  /** Bordered — medium emphasis, no fill */
  outline: [
    "bg-transparent text-[#EDE5D0]",
    "border border-[rgba(255,255,255,0.12)]",
    "hover:border-[rgba(196,154,40,0.40)] hover:text-[#C49A28]",
    "active:scale-[0.98]",
  ].join(" "),

  /** Red/terra — destructive actions */
  destructive: [
    "bg-[rgba(248,113,113,0.12)] text-[#FCA5A5]",
    "border border-[rgba(248,113,113,0.35)]",
    "hover:bg-[rgba(248,113,113,0.20)] hover:border-[rgba(248,113,113,0.60)]",
    "active:scale-[0.98]",
  ].join(" "),
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs:   "h-7 px-2.5 text-[11px] tracking-[0.05em] rounded-md",
  sm:   "h-8 px-3 text-[13px] tracking-[0.02em] rounded-md",
  md:   "h-10 px-4 text-[14px] tracking-[0.02em] rounded-lg",
  lg:   "h-12 px-6 text-[15px] tracking-[0.03em] rounded-lg",
  icon: "h-10 w-10 p-0 rounded-lg",
};

export const LnButton = forwardRef<HTMLButtonElement, LnButtonProps>(({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  style,
  ...props
}, ref) => {
  const fontFamily = variant === "primary"
    ? "'Cinzel', serif"
    : "'DM Sans', sans-serif";

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && "w-full",
        className
      )}
      style={{ fontFamily, ...style }}
      {...props}
    >
      {loading ? (
        <LnSpinner size={size === "xs" || size === "sm" ? 12 : 16} />
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
LnButton.displayName = "LnButton";

// ── LnBadge ───────────────────────────────────────────────────────────────────

type BadgeVariant =
  | "gold"        // WID, provenance, featured
  | "published"   // green — live/verified
  | "draft"       // amber — in progress
  | "error"       // red — failed/deleted
  | "wid"         // gold monospace — Witness ID
  | "medium"      // medium-specific color
  | "genre"       // warm amber pill
  | "core"        // gold solid — foundational/core concept
  | "custom";     // pass style directly

interface LnBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** For medium variant — which medium type */
  medium?: "audio" | "lyrics" | "manuscript" | "comic" | "game" | "visual";
  /** For custom variant */
  customStyle?: React.CSSProperties;
  /** Show a dot indicator before the label */
  dot?: boolean;
  /** Make it a pill (default: true) */
  pill?: boolean;
}

const BADGE_VARIANTS: Record<Exclude<BadgeVariant, "medium" | "custom">, string> = {
  gold: [
    "bg-[rgba(196,154,40,0.12)] text-[#C49A28]",
    "border border-[rgba(196,154,40,0.35)]",
  ].join(" "),
  published: [
    "bg-[rgba(74,222,128,0.12)] text-[#86EFAC]",
    "border border-[rgba(74,222,128,0.35)]",
  ].join(" "),
  draft: [
    "bg-[rgba(212,168,75,0.12)] text-[#EDE5D0]",
    "border border-[rgba(212,168,75,0.35)]",
  ].join(" "),
  error: [
    "bg-[rgba(248,113,113,0.12)] text-[#FCA5A5]",
    "border border-[rgba(248,113,113,0.35)]",
  ].join(" "),
  wid: [
    "bg-[rgba(196,154,40,0.10)] text-[#C49A28]",
    "border border-[rgba(196,154,40,0.40)]",
    "font-mono tracking-[0.08em]",
  ].join(" "),
  genre: [
    "bg-[rgba(196,154,40,0.08)] text-[#DACAAA]",
    "border border-[rgba(196,154,40,0.28)]",
    "hover:border-[rgba(196,154,40,0.60)] hover:text-[#C49A28] hover:bg-[rgba(196,154,40,0.14)]",
    "transition-colors duration-200 cursor-pointer",
  ].join(" "),
  core: [
    "bg-[#C49A28] text-black",
    "border border-[rgba(196,154,40,0.60)]",
  ].join(" "),
};

const MEDIUM_COLORS_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  audio:      { bg: "rgba(124,58,237,0.12)",  text: "#A78BFA", border: "rgba(167,139,250,0.35)" },
  lyrics:     { bg: "rgba(208,161,95,0.12)",  text: "#F5C451", border: "rgba(245,196,81,0.40)"  },
  manuscript: { bg: "rgba(22,163,74,0.12)",   text: "#4ADE80", border: "rgba(74,222,128,0.40)"  },
  comic:      { bg: "rgba(220,38,38,0.12)",   text: "#F87171", border: "rgba(248,113,113,0.40)" },
  game:       { bg: "rgba(16,185,129,0.12)",  text: "#34D399", border: "rgba(52,211,153,0.40)"  },
  visual:     { bg: "rgba(244,63,94,0.10)",   text: "#FDA4AF", border: "rgba(253,164,175,0.40)" },
};

export function LnBadge({
  variant = "gold",
  medium,
  customStyle,
  dot,
  pill = true,
  children,
  className,
  style,
  ...props
}: LnBadgeProps) {
  const baseClass = cn(
    "inline-flex items-center gap-1",
    "text-[11px] font-semibold tracking-[0.05em] uppercase",
    "px-2 py-0.5",
    pill ? "rounded-full" : "rounded",
    variant !== "medium" && variant !== "custom" && BADGE_VARIANTS[variant],
    className
  );

  let inlineStyle: React.CSSProperties = {
    fontFamily: variant === "wid" ? "'Space Mono', monospace" : "'DM Sans', sans-serif",
    ...style,
  };

  if (variant === "medium" && medium) {
    const mc = MEDIUM_COLORS_BADGE[medium];
    inlineStyle = {
      ...inlineStyle,
      background: mc.bg,
      color: mc.text,
      border: `1px solid ${mc.border}`,
    };
  } else if (variant === "custom" && customStyle) {
    inlineStyle = { ...inlineStyle, ...customStyle };
  }

  return (
    <span className={baseClass} style={inlineStyle} {...props}>
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}

// ── LnDivider ─────────────────────────────────────────────────────────────────

type DividerVariant = "simple" | "wide" | "section" | "horizontal";

interface LnDividerProps {
  /** Visual style */
  variant?: DividerVariant;
  /** Label for section divider */
  label?: string;
  /** Icon for section divider */
  icon?: React.ReactNode;
  className?: string;
}

export function LnDivider({ variant = "simple", label, icon, className }: LnDividerProps) {
  if (variant === "horizontal") {
    return (
      <div
        className={cn("h-px w-full", className)}
        style={{ background: "linear-gradient(90deg, transparent, rgba(196,154,40,0.45), transparent)" }}
      />
    );
  }

  if (variant === "section") {
    return (
      <div className={cn("flex items-center gap-2 mb-4", className)}>
        {icon && (
          <span style={{ color: "rgba(212,175,55,0.55)" }}>{icon}</span>
        )}
        <span
          className="text-[11px] tracking-[0.20em] uppercase"
          style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.55)" }}
        >
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.12)" }} />
      </div>
    );
  }

  if (variant === "wide") {
    return (
      <div className={cn("relative h-6 my-8 flex items-center justify-center", className)}>
        <div
          className="absolute inset-x-0 top-1/2 h-px"
          style={{
            background: "linear-gradient(to right, transparent 0%, rgba(196,154,40,0.15) 10%, rgba(196,154,40,0.55) 50%, rgba(196,154,40,0.15) 90%, transparent 100%)",
          }}
        />
        <div
          className="relative z-10 flex items-center gap-2 px-3"
          style={{ background: "#000000" }}
        >
          <span className="w-1 h-1 bg-[rgba(196,154,40,0.65)] rotate-45 flex-shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#C49A28] shadow-[0_0_8px_rgba(196,154,40,0.6)] flex-shrink-0" />
          <span className="w-1 h-1 bg-[rgba(196,154,40,0.65)] rotate-45 flex-shrink-0" />
        </div>
      </div>
    );
  }

  // simple — ─────── ◆ ───────
  return (
    <div className={cn("flex items-center gap-3 my-6 opacity-60", className)}>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(196,154,40,0.55), transparent)" }} />
      <div className="w-1.5 h-1.5 bg-[#C49A28] rotate-45 flex-shrink-0 shadow-[0_0_6px_rgba(196,154,40,0.5)]" />
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(196,154,40,0.55), transparent)" }} />
    </div>
  );
}

// ── LnAvatar ──────────────────────────────────────────────────────────────────

interface LnAvatarProps {
  /** Image URL */
  src?: string | null;
  /** Display name for fallback initials */
  name?: string;
  /** Size in pixels */
  size?: number;
  /** Show gold ring for verified/featured creators */
  ring?: boolean;
  /** Show live indicator dot */
  live?: boolean;
  className?: string;
  onClick?: () => void;
}

export function LnAvatar({ src, name, size = 40, ring, live, className, onClick }: LnAvatarProps) {
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div
      className={cn("relative flex-shrink-0", onClick && "cursor-pointer", className)}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        style={{
          background: src ? undefined : "rgba(196,154,40,0.12)",
          border: ring
            ? "2px solid rgba(196,154,40,0.70)"
            : "1px solid rgba(196,154,40,0.28)",
          boxShadow: ring ? "0 0 12px rgba(196,154,40,0.30)" : undefined,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name ?? "Avatar"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="font-semibold text-[#C49A28]"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: Math.max(10, size * 0.35),
            }}
          >
            {initials}
          </span>
        )}
      </div>
      {live && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#C49A28] border-2 border-black"
          style={{ boxShadow: "0 0 6px rgba(196,154,40,0.8)" }}
        />
      )}
    </div>
  );
}

// ── LnTag ─────────────────────────────────────────────────────────────────────

interface LnTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Active/selected state */
  active?: boolean;
  /** Removable — shows × button */
  onRemove?: () => void;
}

export function LnTag({ active, onRemove, children, className, ...props }: LnTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        "px-2.5 py-0.5 rounded-full",
        "text-[11px] font-medium tracking-[0.03em]",
        "transition-colors duration-200",
        "border",
        active
          ? "bg-[rgba(196,154,40,0.14)] text-[#C49A28] border-[rgba(196,154,40,0.60)]"
          : "bg-[rgba(196,154,40,0.06)] text-[#DACAAA] border-[rgba(196,154,40,0.22)] hover:border-[rgba(196,154,40,0.45)] hover:text-[#C49A28]",
        className
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}

// ── LnOverline ────────────────────────────────────────────────────────────────

interface LnOverlineProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Show flanking lines */
  ruled?: boolean;
}

export function LnOverline({ ruled, children, className, ...props }: LnOverlineProps) {
  if (ruled) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(196,154,40,0.30))" }} />
        <span
          className="text-[11px] tracking-[0.20em] uppercase flex-shrink-0"
          style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.55)" }}
          {...props}
        >
          {children}
        </span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(196,154,40,0.30))" }} />
      </div>
    );
  }

  return (
    <span
      className={cn("text-[11px] tracking-[0.20em] uppercase", className)}
      style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.55)" }}
      {...props}
    >
      {children}
    </span>
  );
}

// ── LnText ────────────────────────────────────────────────────────────────────

type TextVariant = "h1" | "h2" | "h3" | "h4" | "body" | "caption" | "overline" | "ui";
type TextAs = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div" | "label";

interface LnTextProps extends React.HTMLAttributes<HTMLElement> {
  /** Semantic variant — controls font, size, weight, tracking */
  variant?: TextVariant;
  /** HTML element to render as */
  as?: TextAs;
  /** Gold gradient text */
  gold?: boolean;
  /** Muted text color */
  muted?: boolean;
}

const TEXT_STYLES: Record<TextVariant, React.CSSProperties> = {
  h1: {
    fontFamily: "'Cinzel', serif",
    fontSize: "var(--text-h1)",
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: "0.08em",
    color: "#EDE5D0",
    WebkitFontSmoothing: "antialiased",
  },
  h2: {
    fontFamily: "'Cinzel', serif",
    fontSize: "var(--text-h2)",
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: "0.06em",
    color: "#EDE5D0",
    WebkitFontSmoothing: "antialiased",
  },
  h3: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "var(--text-h3)",
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "0.035em",
    color: "#D8C9A8",
  },
  h4: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "var(--text-h4)",
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: "0.025em",
    color: "#D8C9A8",
  },
  body: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "var(--text-base)",
    fontWeight: 400,
    lineHeight: 1.75,
    letterSpacing: "0em",
    color: "#EDE5D0",
  },
  caption: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "var(--text-sm)",
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: "0em",
    color: "#D8C9A8",
  },
  overline: {
    fontFamily: "'Cinzel', serif",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: "0.20em",
    textTransform: "uppercase" as const,
    color: "rgba(212,175,55,0.55)",
  },
  ui: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "var(--text-base)",
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: "0.015em",
    color: "#EDE5D0",
  },
};

const DEFAULT_ELEMENT: Record<TextVariant, TextAs> = {
  h1: "h1", h2: "h2", h3: "h3", h4: "h4",
  body: "p", caption: "span", overline: "span", ui: "span",
};

export function LnText({
  variant = "body",
  as,
  gold,
  muted,
  children,
  className,
  style,
  ...props
}: LnTextProps) {
  const Tag = (as ?? DEFAULT_ELEMENT[variant]) as React.ElementType;
  const baseStyle = TEXT_STYLES[variant];

  const computedStyle: React.CSSProperties = {
    ...baseStyle,
    ...(muted ? { color: "#6B6555" } : {}),
    ...(gold ? {
      background: "linear-gradient(135deg, #B8820A, #E8A830, #F5C451, #E8A830, #B8820A)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    } : {}),
    ...style,
  };

  return (
    <Tag className={className} style={computedStyle} {...props}>
      {children}
    </Tag>
  );
}

// ── LnIcon ────────────────────────────────────────────────────────────────────

interface LnIconProps {
  /** Icon component (Lucide or custom) */
  icon: React.ReactNode;
  /** Size in pixels — defaults to 20 */
  size?: number;
  /** Color — defaults to current text color */
  color?: string;
  /** Gold color */
  gold?: boolean;
  /** Muted color */
  muted?: boolean;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
}

export function LnIcon({ icon, size = 20, color, gold, muted, className, onClick, "aria-label": ariaLabel }: LnIconProps) {
  const resolvedColor = gold ? "#C49A28" : muted ? "#6B6555" : color;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center flex-shrink-0",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        width: size,
        height: size,
        color: resolvedColor,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
    >
      {icon}
    </span>
  );
}

// ── LnSpinner ─────────────────────────────────────────────────────────────────

interface LnSpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export function LnSpinner({ size = 20, color = "#C49A28", className }: LnSpinnerProps) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle
        cx="12" cy="12" r="10"
        stroke={color}
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── LnLiveWave ────────────────────────────────────────────────────────────────

interface LnLiveWaveProps {
  /** Pause the animation (track paused) */
  paused?: boolean;
  /** Color — defaults to gold */
  color?: string;
  className?: string;
}

export function LnLiveWave({ paused, color = "#C49A28", className }: LnLiveWaveProps) {
  return (
    <div
      className={cn("live-wave", paused && "paused", className)}
      aria-label={paused ? "Paused" : "Playing"}
    >
      {[4, 10, 14, 7, 11].map((h, i) => (
        <span
          key={i}
          style={{
            background: color,
            animationDelay: `${[0, 0.07, 0.14, 0.10, 0.03][i]}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── LnPulseDot ────────────────────────────────────────────────────────────────

interface LnPulseDotProps {
  /** Color — defaults to gold */
  color?: string;
  /** Size in pixels */
  size?: number;
  className?: string;
}

export function LnPulseDot({ color = "#C49A28", size = 8, className }: LnPulseDotProps) {
  return (
    <span
      className={cn("pulse-dot flex-shrink-0", className)}
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: `0 0 ${size + 2}px ${color}`,
      }}
      aria-label="Live"
    />
  );
}
