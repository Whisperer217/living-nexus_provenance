/**
 * ResonanceField — Phase 145
 *
 * Unified resonance surface for all work detail pages.
 * Replaces scattered reaction rows, like counts, and tip sections with a
 * single observatory-style component.
 *
 * Design principle: observational, not dopamine-driven.
 * No confetti. No exploding counters. Ambient signal.
 *
 * Creator Acknowledgement: when the logged-in user is the creator of this work,
 * witness name chips become interactive — clicking one sends a personal
 * acknowledgement toast and logs the event via trpc.resonance.acknowledge.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

// ── Glyph definitions ──────────────────────────────────────────────────────────
const RESONANCE_GLYPHS: { slug: string; emoji: string; label: string }[] = [
  { slug: "fire",     emoji: "🔥", label: "Fire"      },
  { slug: "grateful", emoji: "🙏", label: "Grateful"  },
  { slug: "magic",    emoji: "✨", label: "Moved"     },
  { slug: "gem",      emoji: "💎", label: "Gem"       },
  { slug: "vibe",     emoji: "🎵", label: "Resonates" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCents(cents: number): string {
  if (cents === 0) return "$0";
  if (cents < 100) return `$${(cents / 100).toFixed(2)}`;
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface ResonanceFieldProps {
  songId: number;
  /** The userId of the creator who owns this work — enables acknowledgement mode */
  creatorId?: number;
  /** Show the Pay It Forward (tip) CTA */
  showPayItForward?: boolean;
  /** Called when user clicks Pay It Forward */
  onPayItForward?: () => void;
  /** Whether the creator has Stripe enabled */
  tipsEnabled?: boolean;
  /** Compact mode — used in card overlays */
  compact?: boolean;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function ResonanceField({
  songId,
  creatorId,
  showPayItForward = true,
  onPayItForward,
  tipsEnabled = false,
  compact = false,
  className = "",
}: ResonanceFieldProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.resonance.getField.useQuery({ songId });

  const toggleMutation = trpc.songs.toggleReaction.useMutation({
    onMutate: async ({ type }) => {
      await utils.resonance.getField.cancel({ songId });
      const prev = utils.resonance.getField.getData({ songId });
      utils.resonance.getField.setData({ songId }, (old) => {
        if (!old) return old;
        const mine = old.mine.includes(type)
          ? old.mine.filter((t) => t !== type)
          : [...old.mine, type];
        const delta = old.mine.includes(type) ? -1 : 1;
        const reactions = { ...old.reactions, [type]: Math.max(0, (old.reactions[type] ?? 0) + delta) };
        const totalResonance = Object.values(reactions).reduce((a, b) => a + b, 0) + old.likeCount;
        return { ...old, reactions, mine, totalResonance };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.resonance.getField.setData({ songId }, ctx.prev);
    },
    onSettled: () => {
      utils.resonance.getField.invalidate({ songId });
    },
  });

  const acknowledgeMutation = trpc.resonance.acknowledge.useMutation({
    onSuccess: (result) => {
      toast.success(result.message, {
        description: "Acknowledgement logged to the resonance record.",
        duration: 4000,
      });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [showAllWitnesses, setShowAllWitnesses] = useState(false);
  const [acknowledgedNames, setAcknowledgedNames] = useState<Set<string>>(new Set());

  // Creator mode: logged-in user is the creator of this work
  const isCreator = !!user && !!creatorId && user.id === creatorId;

  const handleAcknowledge = (witnessName: string) => {
    if (acknowledgedNames.has(witnessName)) {
      toast.info(`You've already acknowledged ${witnessName}.`);
      return;
    }
    acknowledgeMutation.mutate({ songId, witnessName });
    setAcknowledgedNames((prev) => new Set(prev).add(witnessName));
  };

  if (isLoading || !data) {
    return (
      <div className={`animate-pulse rounded-lg h-24 ${className}`}
        style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.08)" }} />
    );
  }

  const {
    reactions,
    mine,
    likeCount,
    playCount,
    totalFundingCents,
    witnessNames,
    totalResonance,
  } = data;

  // Signal intensity: 0–100 based on total resonance (capped at 500 for visual)
  const signalIntensity = Math.min(100, Math.round((totalResonance / 500) * 100));

  const handleGlyph = (slug: string) => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    toggleMutation.mutate({ songId, type: slug });
  };

  const visibleWitnesses = showAllWitnesses ? witnessNames : witnessNames.slice(0, 4);

  if (compact) {
    // ── Compact mode: card overlay row ─────────────────────────────────────
    return (
      <div className={`flex items-center gap-3 text-xs ${className}`}>
        <span style={{ color: "var(--ln-smoke)" }}>
          🔥 {formatCount(reactions["fire"] ?? 0)}
        </span>
        <span style={{ color: "var(--ln-smoke)" }}>
          ❤️ {formatCount(likeCount)}
        </span>
        {totalFundingCents > 0 && (
          <span style={{ color: "var(--ln-gold)" }}>
            +{formatCents(totalFundingCents)}
          </span>
        )}
      </div>
    );
  }

  // ── Full mode: SongDetailPage resonance section ─────────────────────────
  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        background: "rgba(18,14,10,0.85)",
        border: "1px solid rgba(196,154,40,0.15)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}
      >
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
        >
          Resonance Field
        </span>
        {/* Signal intensity bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
            Signal
          </span>
          <div
            className="w-24 h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(196,154,40,0.1)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${signalIntensity}%`,
                background: signalIntensity > 60
                  ? "rgba(196,154,40,0.9)"
                  : signalIntensity > 30
                  ? "rgba(196,154,40,0.6)"
                  : "rgba(196,154,40,0.3)",
              }}
            />
          </div>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--ln-smoke)" }}>
            {totalResonance}
          </span>
        </div>
      </div>

      {/* ── Glyph resonance row ── */}
      <div className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {RESONANCE_GLYPHS.map(({ slug, emoji, label }) => {
            const count = reactions[slug] ?? 0;
            const active = mine.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() => handleGlyph(slug)}
                title={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105 active:scale-95"
                style={{
                  background: active
                    ? "rgba(196,154,40,0.12)"
                    : "rgba(196,154,40,0.03)",
                  border: `1px solid ${active ? "rgba(196,154,40,0.4)" : "rgba(196,154,40,0.12)"}`,
                  color: active ? "var(--ln-gold)" : "var(--ln-smoke)",
                }}
              >
                <span>{emoji}</span>
                {count > 0 && (
                  <span className="text-xs tabular-nums">{formatCount(count)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div
        className="px-5 py-3 flex flex-wrap items-center gap-4 text-xs"
        style={{ borderTop: "1px solid rgba(196,154,40,0.06)" }}
      >
        <span style={{ color: "var(--ln-smoke)" }}>
          <span className="opacity-50 mr-1">▶</span>
          {formatCount(playCount)} plays
        </span>
        <span style={{ color: "var(--ln-smoke)" }}>
          ❤️ {formatCount(likeCount)} resonance
        </span>
        {totalFundingCents > 0 && (
          <span style={{ color: "var(--ln-gold)" }}>
            {formatCents(totalFundingCents)} contributed
          </span>
        )}
        {/* Reach statement */}
        {totalResonance > 0 && (
          <span className="ml-auto italic text-[11px]" style={{ color: "rgba(196,154,40,0.5)" }}>
            This testimony reached {totalResonance} {totalResonance === 1 ? "person" : "people"}
          </span>
        )}
      </div>

      {/* ── Witnesses Resonating ── */}
      {witnessNames.length > 0 && (
        <div
          className="px-5 py-3"
          style={{ borderTop: "1px solid rgba(196,154,40,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(196,154,40,0.4)" }}>
              Witnesses Resonating
            </p>
            {isCreator && (
              <span className="text-[9px] italic" style={{ color: "rgba(196,154,40,0.3)" }}>
                · tap a name to acknowledge
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleWitnesses.map((name) => {
              const acknowledged = acknowledgedNames.has(name);
              if (isCreator) {
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleAcknowledge(name)}
                    title={acknowledged ? `${name} acknowledged` : `Acknowledge ${name}`}
                    className="text-xs px-2 py-0.5 rounded-full transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: acknowledged
                        ? "rgba(196,154,40,0.14)"
                        : "rgba(196,154,40,0.06)",
                      border: `1px solid ${acknowledged ? "rgba(196,154,40,0.35)" : "rgba(196,154,40,0.12)"}`,
                      color: acknowledged ? "var(--ln-gold)" : "var(--ln-smoke)",
                      cursor: "pointer",
                    }}
                  >
                    {acknowledged ? "✓ " : ""}{name}
                  </button>
                );
              }
              return (
                <span
                  key={name}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(196,154,40,0.06)",
                    border: "1px solid rgba(196,154,40,0.12)",
                    color: "var(--ln-smoke)",
                  }}
                >
                  {name}
                </span>
              );
            })}
            {witnessNames.length > 4 && !showAllWitnesses && (
              <button
                type="button"
                onClick={() => setShowAllWitnesses(true)}
                className="text-xs px-2 py-0.5 rounded-full transition-colors"
                style={{
                  background: "rgba(196,154,40,0.04)",
                  border: "1px solid rgba(196,154,40,0.1)",
                  color: "rgba(196,154,40,0.5)",
                }}
              >
                +{witnessNames.length - 4} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Pay It Forward CTA ── */}
      {showPayItForward && tipsEnabled && onPayItForward && (
        <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}
        >
          <button
            type="button"
            onClick={onPayItForward}
            className="w-full py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(196,154,40,0.15) 0%, rgba(196,154,40,0.08) 100%)",
              border: "1px solid rgba(196,154,40,0.3)",
              color: "var(--ln-gold)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            Pay It Forward
          </button>
          <p className="text-center text-[10px] mt-1.5" style={{ color: "rgba(196,154,40,0.35)" }}>
            Your contribution supports this creator's testimony
          </p>
        </div>
      )}
    </div>
  );
}

export default ResonanceField;
