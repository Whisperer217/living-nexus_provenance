/**
 * @domain   The Doctrine → Design Language → Platform Components
 * @impl     React Component Library — Specialized platform components: WIDBadge, ProvenancePill, KeeperChip, CreatorCard
 */
/**
 * Living Nexus Design System — Platform Components
 * ════════════════════════════════════════════════════════════════════
 * Specialized components unique to the Living Nexus platform.
 * These encode the visual language of sovereignty, provenance,
 * and sacred authorship.
 *
 * Components:
 *   WIDBadge         — Witness Identity Document stamp
 *   ProvenancePill   — Chain of Record lineage indicator
 *   HarmonicBar      — Audio waveform / harmonic signature
 *   KeeperChip       — Keeper archetype identity chip
 *   SanctuarySlot    — Sanctuary slot availability indicator
 *   CreatorCard      — Creator identity card with WID + stats
 *   TrackRow         — Compact track list row
 *   NexusPointBadge  — ◈ currency display
 *   WitnessCount     — Witness count with icon
 *   OriginStamp      — Provenance origin stamp
 *   MediumPill       — Creative medium pill
 * ════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { cn } from "@/lib/utils";

// ── WIDBadge ──────────────────────────────────────────────────────────────────

interface WIDBadgeProps {
  /** The WID handle — e.g. "@handle" */
  handle: string;
  /** Show the animated pulse glow (for origin/featured works) */
  pulse?: boolean;
  /** Compact mode — smaller, inline */
  compact?: boolean;
  /** Verified — green ring */
  verified?: boolean;
  /** Click handler */
  onClick?: () => void;
  className?: string;
}

export function WIDBadge({ handle, pulse, compact, verified, onClick, className }: WIDBadgeProps) {
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5",
        compact ? "px-2 py-0.5 rounded-md text-[11px]" : "px-2.5 py-1 rounded-lg text-[12px]",
        "font-bold tracking-[0.08em] uppercase",
        "border transition-all duration-200",
        pulse && "wid-origin-glow",
        onClick && "cursor-pointer hover:border-[rgba(196,154,40,0.70)]",
        className
      )}
      style={{
        fontFamily: "'Space Mono', monospace",
        background: "rgba(196,154,40,0.10)",
        color: "#C49A28",
        borderColor: verified
          ? "rgba(74,222,128,0.55)"
          : "rgba(196,154,40,0.40)",
        boxShadow: verified
          ? "0 0 12px rgba(74,222,128,0.15)"
          : undefined,
      }}
    >
      {/* WID diamond glyph */}
      <span
        className="flex-shrink-0"
        style={{
          width: compact ? 6 : 8,
          height: compact ? 6 : 8,
          background: verified ? "#4ADE80" : "#C49A28",
          transform: "rotate(45deg)",
          display: "inline-block",
          boxShadow: `0 0 ${compact ? 4 : 6}px ${verified ? "rgba(74,222,128,0.6)" : "rgba(196,154,40,0.6)"}`,
        }}
      />
      {handle}
      {verified && (
        <svg
          width={compact ? 10 : 12}
          height={compact ? 10 : 12}
          viewBox="0 0 12 12"
          fill="none"
          aria-label="Verified"
        >
          <circle cx="6" cy="6" r="5.5" fill="rgba(74,222,128,0.20)" stroke="rgba(74,222,128,0.60)" strokeWidth="0.8" />
          <path d="M3.5 6l2 2 3-3" stroke="#4ADE80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Tag>
  );
}

// ── ProvenancePill ────────────────────────────────────────────────────────────

type ProvenanceType = "original" | "fork" | "transformation" | "collaboration";

interface ProvenancePillProps {
  type: ProvenanceType;
  /** Generation number — 0 = original, 1 = first fork, etc. */
  generation?: number;
  /** Compact mode */
  compact?: boolean;
  className?: string;
}

const PROVENANCE_CONFIG: Record<ProvenanceType, { label: string; color: string; bg: string; border: string }> = {
  original:       { label: "Original",       color: "#C49A28", bg: "rgba(196,154,40,0.10)", border: "rgba(196,154,40,0.40)" },
  fork:           { label: "Fork",           color: "#A78BFA", bg: "rgba(124,58,237,0.10)", border: "rgba(167,139,250,0.35)" },
  transformation: { label: "Transformation", color: "#4ADE80", bg: "rgba(22,163,74,0.10)",  border: "rgba(74,222,128,0.35)"  },
  collaboration:  { label: "Collab",         color: "#FDA4AF", bg: "rgba(244,63,94,0.10)",  border: "rgba(253,164,175,0.35)" },
};

export function ProvenancePill({ type, generation, compact, className }: ProvenancePillProps) {
  const cfg = PROVENANCE_CONFIG[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        "font-semibold tracking-[0.05em] uppercase rounded-full border",
        className
      )}
      style={{
        fontFamily: "'DM Sans', sans-serif",
        color: cfg.color,
        background: cfg.bg,
        borderColor: cfg.border,
      }}
    >
      {type === "original" && (
        <span
          className="w-1.5 h-1.5 flex-shrink-0 rotate-45"
          style={{ background: cfg.color, display: "inline-block" }}
        />
      )}
      {cfg.label}
      {generation !== undefined && generation > 0 && (
        <span style={{ opacity: 0.7 }}>Gen {generation}</span>
      )}
    </span>
  );
}

// ── HarmonicBar ───────────────────────────────────────────────────────────────

interface HarmonicBarProps {
  /** 0–1 playback progress */
  progress?: number;
  /** Whether audio is currently playing */
  playing?: boolean;
  /** Bar height */
  height?: number;
  /** Show time labels */
  showTime?: boolean;
  /** Current time in seconds */
  currentTime?: number;
  /** Total duration in seconds */
  duration?: number;
  /** Seek handler */
  onSeek?: (progress: number) => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function HarmonicBar({
  progress = 0,
  playing,
  height = 4,
  showTime,
  currentTime = 0,
  duration = 0,
  onSeek,
  className,
}: HarmonicBarProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(p);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Progress track */}
      <div
        className={cn("relative w-full rounded-full overflow-hidden", onSeek && "cursor-pointer")}
        style={{ height, background: "rgba(44,52,56,0.80)" }}
        onClick={handleClick}
        role={onSeek ? "slider" : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Playback progress"
      >
        {/* Filled portion */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-100"
          style={{
            width: `${progress * 100}%`,
            background: "linear-gradient(to right, #B8820A, #C49A28, #E8B840)",
          }}
        />
        {/* Playhead dot */}
        {onSeek && (
          <div
            className={cn("absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full", playing && "progress-playhead")}
            style={{
              left: `${progress * 100}%`,
              width: height + 8,
              height: height + 8,
              background: "radial-gradient(circle at 40% 35%, #E8DFC8, #C49A28 55%, #6B6555)",
              border: "2px solid rgba(230,205,174,0.95)",
            }}
          />
        )}
      </div>

      {/* Time labels */}
      {showTime && (
        <div className="flex items-center justify-between">
          <span
            className="text-[11px]"
            style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}
          >
            {formatTime(currentTime)}
          </span>
          <span
            className="text-[11px]"
            style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}
          >
            {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── KeeperChip ────────────────────────────────────────────────────────────────

type KeeperArchetype = "Guide" | "Conductor" | "Witness" | "Custodian" | "Archivist" | "Cipher";

interface KeeperChipProps {
  archetype: KeeperArchetype;
  /** Show the archetype label */
  showLabel?: boolean;
  /** Compact — icon only */
  compact?: boolean;
  className?: string;
}

const KEEPER_CONFIG: Record<KeeperArchetype, { color: string; bg: string; border: string; glyph: string }> = {
  Guide:     { color: "#F5C451", bg: "rgba(245,196,81,0.10)",  border: "rgba(245,196,81,0.35)",  glyph: "◈" },
  Conductor: { color: "#A78BFA", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.35)", glyph: "♪" },
  Witness:   { color: "#4ADE80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.35)",  glyph: "◉" },
  Custodian: { color: "#FDA4AF", bg: "rgba(253,164,175,0.10)", border: "rgba(253,164,175,0.35)", glyph: "⬡" },
  Archivist: { color: "#34D399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.35)",  glyph: "⊕" },
  Cipher:    { color: "#C49A28", bg: "rgba(196,154,40,0.10)",  border: "rgba(196,154,40,0.35)",  glyph: "⊗" },
};

export function KeeperChip({ archetype, showLabel = true, compact, className }: KeeperChipProps) {
  const cfg = KEEPER_CONFIG[archetype];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-[12px]",
        "font-semibold tracking-[0.05em] rounded-full border",
        className
      )}
      style={{
        fontFamily: "'Cinzel', serif",
        color: cfg.color,
        background: cfg.bg,
        borderColor: cfg.border,
      }}
    >
      <span style={{ fontSize: compact ? 10 : 12 }}>{cfg.glyph}</span>
      {showLabel && archetype}
    </span>
  );
}

// ── SanctuarySlot ─────────────────────────────────────────────────────────────

type SlotStatus = "open" | "live" | "upcoming" | "closed";

interface SanctuarySlotProps {
  status: SlotStatus;
  /** Slot title */
  title?: string;
  /** Host name */
  host?: string;
  /** Listener count (live only) */
  listeners?: number;
  /** Compact mode */
  compact?: boolean;
  className?: string;
}

const SLOT_STATUS_CONFIG: Record<SlotStatus, { label: string; color: string; bg: string; border: string }> = {
  open:     { label: "Open",     color: "#4ADE80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.35)"  },
  live:     { label: "Live",     color: "#C49A28", bg: "rgba(196,154,40,0.12)",  border: "rgba(196,154,40,0.45)"  },
  upcoming: { label: "Upcoming", color: "#A78BFA", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.30)" },
  closed:   { label: "Closed",   color: "#6B6555", bg: "rgba(107,101,85,0.10)",  border: "rgba(107,101,85,0.25)"  },
};

export function SanctuarySlot({ status, title, host, listeners, compact, className }: SanctuarySlotProps) {
  const cfg = SLOT_STATUS_CONFIG[status];

  if (compact) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border", className)}
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border, fontFamily: "'DM Sans', sans-serif" }}
      >
        {status === "live" && (
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
        )}
        {cfg.label}
        {listeners !== undefined && <span>· {listeners}</span>}
      </span>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border", className)}
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      {/* Status indicator */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: cfg.color,
          boxShadow: status === "live" ? `0 0 8px ${cfg.color}` : undefined,
          animation: status === "live" ? "pulseDot 1.5s ease-in-out infinite" : undefined,
        }}
      />

      <div className="flex-1 min-w-0">
        {title && (
          <p
            className="text-[13px] font-medium truncate"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#EDE5D0" }}
          >
            {title}
          </p>
        )}
        {host && (
          <p
            className="text-[11px] truncate"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
          >
            {host}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className="text-[11px] font-semibold tracking-[0.04em] uppercase px-1.5 py-0.5 rounded"
          style={{ fontFamily: "'Cinzel', serif", color: cfg.color, background: "rgba(0,0,0,0.30)" }}
        >
          {cfg.label}
        </span>
        {listeners !== undefined && (
          <span
            className="text-[11px]"
            style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}
          >
            {listeners}
          </span>
        )}
      </div>
    </div>
  );
}

// ── NexusPointBadge ───────────────────────────────────────────────────────────

interface NexusPointBadgeProps {
  /** ◈ amount */
  amount: number | string;
  /** Show the ◈ symbol */
  showSymbol?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Animated shimmer */
  shimmer?: boolean;
  className?: string;
}

export function NexusPointBadge({ amount, showSymbol = true, size = "md", shimmer, className }: NexusPointBadgeProps) {
  const sizeClass = {
    sm: "text-[12px] px-2 py-0.5",
    md: "text-[14px] px-2.5 py-1",
    lg: "text-[18px] px-3 py-1.5",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border font-bold",
        sizeClass,
        shimmer && "gold-shimmer",
        className
      )}
      style={{
        fontFamily: "'Space Mono', monospace",
        color: shimmer ? undefined : "#C49A28",
        background: "rgba(196,154,40,0.10)",
        borderColor: "rgba(196,154,40,0.35)",
      }}
    >
      {showSymbol && <span>◈</span>}
      {typeof amount === "number" ? amount.toLocaleString() : amount}
    </span>
  );
}

// ── WitnessCount ──────────────────────────────────────────────────────────────

interface WitnessCountProps {
  count: number;
  /** Compact — no label */
  compact?: boolean;
  /** Animated — pulse on new witness */
  animated?: boolean;
  className?: string;
}

export function WitnessCount({ count, compact, animated, className }: WitnessCountProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        animated && "transition-all duration-300",
        className
      )}
      style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
    >
      {/* Eye glyph */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        style={{ color: "#C49A28", opacity: 0.70 }}
      >
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span className="text-[12px] font-medium" style={{ color: "#D8C9A8" }}>
        {count.toLocaleString()}
      </span>
      {!compact && (
        <span className="text-[11px]" style={{ color: "#6B6555" }}>
          {count === 1 ? "witness" : "witnesses"}
        </span>
      )}
    </span>
  );
}

// ── OriginStamp ───────────────────────────────────────────────────────────────

interface OriginStampProps {
  /** Timestamp — ISO string or Date */
  timestamp: string | Date;
  /** Show "Witnessed" label */
  label?: string;
  /** Compact mode */
  compact?: boolean;
  className?: string;
}

export function OriginStamp({ timestamp, label = "Witnessed", compact, className }: OriginStampProps) {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const formatted = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: compact ? "short" : "long",
    day: "numeric",
  });

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={date.toISOString()}
    >
      {!compact && (
        <span
          className="text-[10px] tracking-[0.12em] uppercase"
          style={{ fontFamily: "'Cinzel', serif", color: "rgba(196,154,40,0.50)" }}
        >
          {label}
        </span>
      )}
      <span
        className={cn("font-medium", compact ? "text-[11px]" : "text-[12px]")}
        style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}
      >
        {formatted}
      </span>
    </span>
  );
}

// ── MediumPill ────────────────────────────────────────────────────────────────

type MediumType = "audio" | "lyrics" | "manuscript" | "comic" | "game" | "visual";

interface MediumPillProps {
  medium: MediumType;
  /** Compact — icon only */
  compact?: boolean;
  className?: string;
}

const MEDIUM_LABELS: Record<MediumType, string> = {
  audio:      "Music",
  lyrics:     "Lyrics",
  manuscript: "Manuscript",
  comic:      "Comic",
  game:       "Game",
  visual:     "Visual",
};

const MEDIUM_COLORS: Record<MediumType, { color: string; bg: string; border: string }> = {
  audio:      { color: "#A78BFA", bg: "rgba(124,58,237,0.12)",  border: "rgba(167,139,250,0.35)" },
  lyrics:     { color: "#F5C451", bg: "rgba(208,161,95,0.12)",  border: "rgba(245,196,81,0.40)"  },
  manuscript: { color: "#4ADE80", bg: "rgba(22,163,74,0.12)",   border: "rgba(74,222,128,0.40)"  },
  comic:      { color: "#F87171", bg: "rgba(220,38,38,0.12)",   border: "rgba(248,113,113,0.40)" },
  game:       { color: "#34D399", bg: "rgba(16,185,129,0.12)",  border: "rgba(52,211,153,0.40)"  },
  visual:     { color: "#FDA4AF", bg: "rgba(244,63,94,0.10)",   border: "rgba(253,164,175,0.40)" },
};

export function MediumPill({ medium, compact, className }: MediumPillProps) {
  const cfg = MEDIUM_COLORS[medium];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        "font-semibold tracking-[0.04em] uppercase rounded-full border",
        className
      )}
      style={{
        fontFamily: "'DM Sans', sans-serif",
        color: cfg.color,
        background: cfg.bg,
        borderColor: cfg.border,
      }}
    >
      {MEDIUM_LABELS[medium]}
    </span>
  );
}

// ── CreatorCard ───────────────────────────────────────────────────────────────

interface CreatorCardProps {
  /** Creator name */
  name: string;
  /** WID handle */
  widHandle?: string;
  /** Avatar URL */
  avatarUrl?: string | null;
  /** Keeper archetype */
  archetype?: KeeperArchetype;
  /** Work count */
  workCount?: number;
  /** Witness count */
  witnessCount?: number;
  /** Verified */
  verified?: boolean;
  /** Click handler */
  onClick?: () => void;
  className?: string;
}

export function CreatorCard({
  name,
  widHandle,
  avatarUrl,
  archetype,
  workCount,
  witnessCount,
  verified,
  onClick,
  className,
}: CreatorCardProps) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:border-[rgba(196,154,40,0.50)]",
        className
      )}
      style={{
        background: "#111111",
        borderColor: "rgba(196,154,40,0.18)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.40)",
      }}
      onClick={onClick}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{
          background: avatarUrl ? undefined : "rgba(196,154,40,0.12)",
          border: verified ? "2px solid rgba(74,222,128,0.55)" : "1px solid rgba(196,154,40,0.28)",
          boxShadow: verified ? "0 0 10px rgba(74,222,128,0.20)" : undefined,
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span
            className="text-[14px] font-semibold"
            style={{ fontFamily: "'Cinzel', serif", color: "#C49A28" }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[14px] font-semibold truncate"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#EDE5D0" }}
          >
            {name}
          </span>
          {archetype && <KeeperChip archetype={archetype} compact showLabel={false} />}
        </div>
        {widHandle && (
          <WIDBadge handle={widHandle} compact verified={verified} />
        )}
      </div>

      {/* Stats */}
      {(workCount !== undefined || witnessCount !== undefined) && (
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          {workCount !== undefined && (
            <span
              className="text-[11px] font-medium"
              style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}
            >
              {workCount} works
            </span>
          )}
          {witnessCount !== undefined && (
            <WitnessCount count={witnessCount} compact />
          )}
        </div>
      )}
    </div>
  );
}

// ── TrackRow ──────────────────────────────────────────────────────────────────

interface TrackRowProps {
  /** Track number */
  index?: number;
  /** Track title */
  title: string;
  /** Artist name */
  artist?: string;
  /** Cover art URL */
  coverArt?: string | null;
  /** Duration in seconds */
  duration?: number;
  /** Currently playing */
  playing?: boolean;
  /** Witness count */
  witnesses?: number;
  /** Click handler */
  onClick?: () => void;
  /** Actions slot (right side) */
  actions?: React.ReactNode;
  className?: string;
}

export function TrackRow({
  index,
  title,
  artist,
  coverArt,
  duration,
  playing,
  witnesses,
  onClick,
  actions,
  className,
}: TrackRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "transition-all duration-150",
        onClick && "cursor-pointer",
        playing
          ? "bg-[rgba(196,154,40,0.08)] border border-[rgba(196,154,40,0.25)] track-active-glow"
          : "border border-transparent hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(196,154,40,0.12)]",
        className
      )}
      onClick={onClick}
    >
      {/* Index / Playing indicator */}
      <div
        className="w-5 flex-shrink-0 flex items-center justify-center"
        style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6B6555" }}
      >
        {playing ? (
          <div className="live-wave" aria-label="Playing">
            {[4, 10, 14, 7, 11].map((h, i) => (
              <span
                key={i}
                style={{
                  width: 2,
                  borderRadius: 2,
                  background: "#C49A28",
                  animation: `waveBar 0.7s ease-in-out infinite alternate`,
                  animationDelay: `${[0, 0.07, 0.14, 0.10, 0.03][i]}s`,
                  height: h,
                }}
              />
            ))}
          </div>
        ) : (
          index ?? ""
        )}
      </div>

      {/* Cover art */}
      {coverArt !== undefined && (
        <div
          className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden"
          style={{ border: "1px solid rgba(196,154,40,0.18)" }}
        >
          {coverArt ? (
            <img src={coverArt} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "rgba(196,154,40,0.08)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18V5l12-2v13" stroke="rgba(196,154,40,0.50)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6" cy="18" r="3" stroke="rgba(196,154,40,0.50)" strokeWidth="1.5" />
                <circle cx="18" cy="16" r="3" stroke="rgba(196,154,40,0.50)" strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Title + Artist */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-medium truncate"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            color: playing ? "#C49A28" : "#EDE5D0",
          }}
        >
          {title}
        </p>
        {artist && (
          <p
            className="text-[12px] truncate"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
          >
            {artist}
          </p>
        )}
      </div>

      {/* Witnesses */}
      {witnesses !== undefined && (
        <WitnessCount count={witnesses} compact className="flex-shrink-0" />
      )}

      {/* Duration */}
      {duration !== undefined && (
        <span
          className="text-[11px] flex-shrink-0"
          style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}
        >
          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
        </span>
      )}

      {/* Actions */}
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
