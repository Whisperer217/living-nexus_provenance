/**
 * Living Nexus Design System — Surfaces & Forms
 * ════════════════════════════════════════════════════════════════════
 * Card variants, form controls, and layout surfaces.
 * All components are built from design tokens.
 *
 * Components:
 *   LnCard          — 4 card variants (museum, flat, ghost, hero)
 *   LnFormField     — label + input + error wrapper
 *   LnInput         — text input
 *   LnTextarea      — multi-line text input
 *   LnSelect        — native select with gold styling
 *   LnCheckbox      — custom gold checkbox
 *   LnRadio         — custom gold radio button
 *   LnSurface       — generic surface container
 *   LnHeroFrame     — full-bleed hero with cover art
 * ════════════════════════════════════════════════════════════════════
 */

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ── LnCard ────────────────────────────────────────────────────────────────────

type CardVariant = "museum" | "flat" | "ghost" | "panel" | "inset";

interface LnCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: CardVariant;
  /** Active state — gold border glow */
  active?: boolean;
  /** Hot state — gold banner treatment */
  hot?: boolean;
  /** Disable hover lift animation */
  noHover?: boolean;
  /** Add parchment grain texture overlay */
  grain?: boolean;
}

const CARD_VARIANTS: Record<CardVariant, React.CSSProperties> = {
  /** Full museum exhibit frame — gunmetal body, gold border, 3D lift on hover */
  museum: {
    background: "#111111",
    border: "1px solid rgba(196,154,40,0.22)",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.60), 0 1px 3px rgba(0,0,0,0.40)",
  },
  /** Flat surface — slightly raised, minimal border */
  flat: {
    background: "#111111",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    overflow: "hidden",
  },
  /** Ghost — no background, just border */
  ghost: {
    background: "transparent",
    border: "1px solid rgba(196,154,40,0.14)",
    borderRadius: "12px",
    overflow: "hidden",
  },
  /** Panel — for drawers, sidebars, info panels */
  panel: {
    background: "rgba(8,6,16,0.99)",
    border: "1px solid rgba(212,175,55,0.28)",
    borderRadius: "16px",
    overflow: "hidden",
  },
  /** Inset — sunken surface, for code blocks, origin stories */
  inset: {
    background: "rgba(0,0,0,0.40)",
    border: "1px solid rgba(196,154,40,0.12)",
    borderRadius: "8px",
    overflow: "hidden",
  },
};

export function LnCard({
  variant = "museum",
  active,
  hot,
  noHover,
  grain,
  children,
  className,
  style,
  ...props
}: LnCardProps) {
  const baseStyle = CARD_VARIANTS[variant];

  const activeStyle: React.CSSProperties = active ? {
    borderColor: "rgba(203,177,131,0.70)",
    boxShadow: "0 0 0 1px rgba(203,177,131,0.35), 0 8px 28px rgba(0,0,0,0.45), 0 0 20px rgba(208,161,95,0.18)",
  } : {};

  const hotStyle: React.CSSProperties = hot ? {
    borderColor: "rgba(208,161,95,0.65)",
  } : {};

  return (
    <div
      className={cn(
        !noHover && variant === "museum" && [
          "transition-[transform,box-shadow,border-color] duration-250 ease",
          "hover:-translate-y-1",
          "hover:border-[rgba(203,177,131,0.65)]",
          "hover:shadow-[0_12px_32px_rgba(0,0,0,0.50),0_4px_12px_rgba(0,0,0,0.35),0_0_0_1px_rgba(203,177,131,0.20),inset_0_1px_0_rgba(230,205,174,0.08)]",
        ],
        !noHover && variant === "flat" && "transition-[box-shadow] duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.40)]",
        grain && "parchment-grain",
        className
      )}
      style={{ ...baseStyle, ...activeStyle, ...hotStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

/** Standard card info panel — pearl stone face below cover art */
export function LnCardInfo({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-3", className)}
      style={{
        background: "linear-gradient(to bottom, #111111 0%, #141414 60%, #0A0A0A 100%)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// ── LnSurface ─────────────────────────────────────────────────────────────────

type SurfaceLevel = "base" | "raised" | "elevated" | "modal";

interface LnSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
}

const SURFACE_BACKGROUNDS: Record<SurfaceLevel, string> = {
  base:     "#000000",
  raised:   "#080808",
  elevated: "#111111",
  modal:    "rgba(26,26,26,0.98)",
};

export function LnSurface({ level = "base", children, className, style, ...props }: LnSurfaceProps) {
  return (
    <div
      className={className}
      style={{ background: SURFACE_BACKGROUNDS[level], ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

// ── LnFormField ───────────────────────────────────────────────────────────────

interface LnFormFieldProps {
  /** Field label */
  label?: string;
  /** Helper text below the input */
  hint?: string;
  /** Error message — replaces hint when present */
  error?: string;
  /** Mark as required */
  required?: boolean;
  /** Field ID for label association */
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export function LnFormField({ label, hint, error, required, id, children, className }: LnFormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-[12px] font-medium tracking-[0.04em] uppercase"
          style={{
            fontFamily: "'Cinzel', serif",
            color: error ? "#FCA5A5" : "rgba(212,175,55,0.70)",
          }}
        >
          {label}
          {required && <span className="ml-1 text-[#F87171]">*</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <p
          className="text-[12px] leading-relaxed"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            color: error ? "#FCA5A5" : "#6B6555",
          }}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

// ── LnInput ───────────────────────────────────────────────────────────────────

interface LnInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error state */
  error?: boolean;
  /** Left icon/adornment */
  leftAdornment?: React.ReactNode;
  /** Right icon/adornment */
  rightAdornment?: React.ReactNode;
  /** Gold inset glow when filled (for Origin Story / testimony fields) */
  testimony?: boolean;
}

const INPUT_BASE: React.CSSProperties = {
  background: "rgba(196,154,40,0.06)",
  border: "1px solid rgba(196,154,40,0.18)",
  borderRadius: "8px",
  color: "#EDE5D0",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "var(--text-base)",
  lineHeight: 1.5,
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  width: "100%",
};

export const LnInput = forwardRef<HTMLInputElement, LnInputProps>(({
  error,
  leftAdornment,
  rightAdornment,
  testimony,
  className,
  style,
  value,
  ...props
}, ref) => {
  const hasValue = testimony && value && String(value).length > 0;

  if (leftAdornment || rightAdornment) {
    return (
      <div className="relative flex items-center">
        {leftAdornment && (
          <span className="absolute left-3 flex items-center" style={{ color: "#6B6555" }}>
            {leftAdornment}
          </span>
        )}
        <input
          ref={ref}
          value={value}
          className={cn(
            "h-10 w-full px-3",
            leftAdornment && "pl-9",
            rightAdornment && "pr-9",
            className
          )}
          style={{
            ...INPUT_BASE,
            borderColor: error ? "rgba(248,113,113,0.50)" : undefined,
            boxShadow: hasValue ? "inset 0 0 0 1px rgba(212,175,55,0.35)" : undefined,
            ...style,
          }}
          {...props}
        />
        {rightAdornment && (
          <span className="absolute right-3 flex items-center" style={{ color: "#6B6555" }}>
            {rightAdornment}
          </span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      value={value}
      className={cn("h-10 px-3", className)}
      style={{
        ...INPUT_BASE,
        borderColor: error ? "rgba(248,113,113,0.50)" : undefined,
        boxShadow: hasValue ? "inset 0 0 0 1px rgba(212,175,55,0.35)" : undefined,
        ...style,
      }}
      {...props}
    />
  );
});
LnInput.displayName = "LnInput";

// ── LnTextarea ────────────────────────────────────────────────────────────────

interface LnTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error state */
  error?: boolean;
  /** Gold inset glow when filled — for testimony/origin story fields */
  testimony?: boolean;
  /** Minimum visible rows */
  rows?: number;
}

export const LnTextarea = forwardRef<HTMLTextAreaElement, LnTextareaProps>(({
  error,
  testimony,
  rows = 4,
  className,
  style,
  value,
  ...props
}, ref) => {
  const hasValue = testimony && value && String(value).length > 0;

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      className={cn("px-3 py-2.5 resize-y min-h-[80px]", className)}
      style={{
        ...INPUT_BASE,
        borderColor: error ? "rgba(248,113,113,0.50)" : undefined,
        boxShadow: hasValue ? "inset 0 0 0 1px rgba(212,175,55,0.35)" : undefined,
        ...style,
      }}
      {...props}
    />
  );
});
LnTextarea.displayName = "LnTextarea";

// ── LnSelect ──────────────────────────────────────────────────────────────────

interface LnSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Error state */
  error?: boolean;
  /** Placeholder option */
  placeholder?: string;
}

export const LnSelect = forwardRef<HTMLSelectElement, LnSelectProps>(({
  error,
  placeholder,
  children,
  className,
  style,
  ...props
}, ref) => {
  return (
    <select
      ref={ref}
      className={cn("h-10 px-3 pr-8 appearance-none cursor-pointer", className)}
      style={{
        ...INPUT_BASE,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C49A28' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        borderColor: error ? "rgba(248,113,113,0.50)" : undefined,
        ...style,
      }}
      {...props}
    >
      {placeholder && (
        <option value="" disabled style={{ background: "#111111", color: "#6B6555" }}>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
});
LnSelect.displayName = "LnSelect";

// ── LnCheckbox ────────────────────────────────────────────────────────────────

interface LnCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Label text */
  label?: React.ReactNode;
  /** Error state */
  error?: boolean;
}

export function LnCheckbox({ label, error, id, className, ...props }: LnCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn("inline-flex items-center gap-2.5 cursor-pointer group", className)}
    >
      <span className="relative flex-shrink-0 w-4 h-4">
        <input
          id={id}
          type="checkbox"
          className="sr-only peer"
          {...props}
        />
        {/* Custom checkbox box */}
        <span
          className={cn(
            "absolute inset-0 rounded flex items-center justify-center",
            "border transition-all duration-150",
            "peer-checked:bg-[#C49A28] peer-checked:border-[#C49A28]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[rgba(196,154,40,0.80)]",
            error
              ? "border-[rgba(248,113,113,0.50)]"
              : "border-[rgba(196,154,40,0.35)] group-hover:border-[rgba(196,154,40,0.60)]"
          )}
          style={{ background: "rgba(196,154,40,0.06)" }}
        >
          {/* Checkmark SVG — shown when checked via peer */}
          <svg
            className="w-2.5 h-2.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      {label && (
        <span
          className="text-[14px] leading-snug"
          style={{ fontFamily: "'DM Sans', sans-serif", color: "#D8C9A8" }}
        >
          {label}
        </span>
      )}
    </label>
  );
}

// ── LnRadio ───────────────────────────────────────────────────────────────────

interface LnRadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Label text */
  label?: React.ReactNode;
  /** Error state */
  error?: boolean;
}

export function LnRadio({ label, error, id, className, ...props }: LnRadioProps) {
  return (
    <label
      htmlFor={id}
      className={cn("inline-flex items-center gap-2.5 cursor-pointer group", className)}
    >
      <span className="relative flex-shrink-0 w-4 h-4">
        <input
          id={id}
          type="radio"
          className="sr-only peer"
          {...props}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full flex items-center justify-center",
            "border transition-all duration-150",
            "peer-checked:border-[#C49A28]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[rgba(196,154,40,0.80)]",
            error
              ? "border-[rgba(248,113,113,0.50)]"
              : "border-[rgba(196,154,40,0.35)] group-hover:border-[rgba(196,154,40,0.60)]"
          )}
          style={{ background: "rgba(196,154,40,0.06)" }}
        >
          <span
            className="w-2 h-2 rounded-full bg-[#C49A28] opacity-0 peer-checked:opacity-100 transition-opacity scale-0 peer-checked:scale-100"
            style={{ transition: "opacity 0.15s, transform 0.15s" }}
          />
        </span>
      </span>
      {label && (
        <span
          className="text-[14px] leading-snug"
          style={{ fontFamily: "'DM Sans', sans-serif", color: "#D8C9A8" }}
        >
          {label}
        </span>
      )}
    </label>
  );
}

// ── LnHeroFrame ───────────────────────────────────────────────────────────────

interface LnHeroFrameProps {
  /** Cover art URL */
  coverArt?: string | null;
  /** Hero height — defaults to golden ratio */
  height?: string;
  /** Corner bracket overlay */
  brackets?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function LnHeroFrame({ coverArt, height, brackets = true, children, className }: LnHeroFrameProps) {
  return (
    <div
      className={cn("relative overflow-hidden", brackets && "sg-hero-frame", className)}
      style={{ height: height ?? "clamp(420px, 61.8vh, 680px)" }}
    >
      {/* Cover art */}
      {coverArt && (
        <img
          src={coverArt}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}

      {/* Radial overlay — warm lantern center, charred oak edges */}
      <div
        className="absolute inset-0 hero-radial"
        aria-hidden="true"
      />

      {/* Additional dark scrim at bottom for text legibility */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.60) 50%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Content — anchored to lower 38.2% (golden ratio) */}
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
        {children}
      </div>
    </div>
  );
}
