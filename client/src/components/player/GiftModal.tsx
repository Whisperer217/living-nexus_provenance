/**
 * GiftModal
 * Two-mode gift sheet:
 *   1. Appreciation mode — emoji reactions when creator hasn't enabled tips
 *   2. Tip mode — Stripe checkout when creator has a connected account
 *
 * Always shown when the Gift button is tapped (never hidden).
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { overlayOpen, overlayClose } from "@/lib/overlayController";
import { X, DollarSign, Loader2, Sparkles, Heart, Flame, Music, Star, Gem } from "lucide-react";

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2500]; // cents

const REACTIONS = [
  { emoji: "🔥", label: "Fire", icon: Flame, type: "fire" },
  { emoji: "❤️", label: "Love", icon: Heart, type: "love" },
  { emoji: "🙏", label: "Grateful", icon: Sparkles, type: "grateful" },
  { emoji: "✨", label: "Magic", icon: Star, type: "magic" },
  { emoji: "💎", label: "Gem", icon: Gem, type: "gem" },
  { emoji: "🎵", label: "Vibe", icon: Music, type: "vibe" },
];

interface GiftModalProps {
  songId: number;
  artistName: string;
  stripeAccountId?: string | null;
  onClose: () => void;
}

export default function GiftModal({
  songId,
  artistName,
  stripeAccountId,
  onClose,
}: GiftModalProps) {
  const { user } = useAuth();
  const tipsEnabled = !!stripeAccountId;

  // Wire into global overlay controller for scroll lock
  useEffect(() => {
    overlayOpen("gift");
    return () => overlayClose("gift");
  }, []);

  // Tab: "appreciate" or "tip"
  const [tab, setTab] = useState<"appreciate" | "tip">(tipsEnabled ? "tip" : "appreciate");

  // Appreciation state
  const [sentReaction, setSentReaction] = useState<string | null>(null);
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);

  // Tip state
  const [selectedCents, setSelectedCents] = useState<number>(500);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  // Fetch existing reactions to show which ones the user has already sent
  const { data: reactionsData, refetch: refetchReactions } = trpc.songs.getReactions.useQuery(
    { songId },
    { enabled: !!songId }
  );

  const toggleReactionMutation = trpc.songs.toggleReaction.useMutation({
    onSuccess: () => refetchReactions(),
  });

  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.success(`Gifting ${artistName}`, { description: "Redirecting to checkout…" });
        window.open(data.url, "_blank");
        onClose();
      }
    },
    onError: (err) => {
      toast.error("Gift failed", { description: err.message });
    },
  });

  const handleReaction = (type: string, emoji: string) => {
    if (!user) {
      toast.error("Sign in to send appreciation");
      return;
    }
    setSentReaction(type);
    setBurstEmoji(emoji);
    toggleReactionMutation.mutate({ songId, type });
    setTimeout(() => setBurstEmoji(null), 1200);
    toast.success(`Sent ${emoji} to ${artistName}`, {
      description: "Your appreciation was delivered.",
      duration: 2500,
    });
  };

  const amountCents = useCustom
    ? Math.round(parseFloat(customInput || "0") * 100)
    : selectedCents;

  const handleTip = () => {
    if (!stripeAccountId) return;
    if (amountCents < 100) {
      toast.error("Minimum gift is $1.00");
      return;
    }
    tipMutation.mutate({ songId, amountCents, origin: window.location.origin });
  };

  // Build a map of reaction counts from the API
  // getSongReactions returns { counts: Record<string, number>, mine: string[] }
  const reactionCounts: Record<string, { count: number; userReacted: boolean }> = {};
  if (reactionsData) {
    const rd = reactionsData as { counts: Record<string, number>; mine: string[] };
    for (const [type, count] of Object.entries(rd.counts)) {
      reactionCounts[type] = { count, userReacted: rd.mine.includes(type) };
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center"
      style={{ background: "oklch(0 0 0 / 0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Burst animation overlay */}
      {burstEmoji && (
        <div
          className="fixed inset-0 pointer-events-none flex items-center justify-center z-[10001]"
          style={{ animation: "giftBurst 1.2s ease-out forwards" }}
        >
          <span style={{ fontSize: "80px", filter: "drop-shadow(0 0 24px oklch(0.84 0.155 85 / 0.8))" }}>
            {burstEmoji}
          </span>
        </div>
      )}

      <div
        className="w-full max-w-sm mx-4 mb-6 rounded-3xl overflow-hidden"
        style={{
          background: "oklch(0.10 0.025 275)",
          border: "1px solid oklch(0.84 0.155 85 / 0.20)",
          boxShadow: "0 0 60px oklch(0.84 0.155 85 / 0.10), 0 24px 64px oklch(0 0 0 / 0.8)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4"
          style={{
            background: "linear-gradient(180deg, oklch(0.14 0.04 275) 0%, transparent 100%)",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div
                className="text-[11px] font-bold tracking-[0.2em] uppercase mb-1"
                style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}
              >
                Send a Gift
              </div>
              <div className="text-[15px] font-heading text-white/90">{artistName}</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-all active:scale-90"
              style={{ color: "oklch(0.40 0.03 280)" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab switcher — only show if tips are enabled */}
          {tipsEnabled && (
            <div
              className="flex mt-4 rounded-xl p-1 gap-1"
              style={{ background: "oklch(0.14 0.02 275)" }}
            >
              <button
                onClick={() => setTab("appreciate")}
                className="flex-1 py-2 rounded-lg text-[12px] font-heading tracking-wide transition-all"
                style={{
                  background: tab === "appreciate" ? "oklch(0.84 0.155 85 / 0.15)" : "transparent",
                  color: tab === "appreciate" ? "oklch(0.84 0.155 85)" : "oklch(0.45 0.03 280)",
                  border: tab === "appreciate" ? "1px solid oklch(0.84 0.155 85 / 0.25)" : "1px solid transparent",
                }}
              >
                ✨ Appreciate
              </button>
              <button
                onClick={() => setTab("tip")}
                className="flex-1 py-2 rounded-lg text-[12px] font-heading tracking-wide transition-all"
                style={{
                  background: tab === "tip" ? "oklch(0.84 0.155 85 / 0.15)" : "transparent",
                  color: tab === "tip" ? "oklch(0.84 0.155 85)" : "oklch(0.45 0.03 280)",
                  border: tab === "tip" ? "1px solid oklch(0.84 0.155 85 / 0.25)" : "1px solid transparent",
                }}
              >
                💸 Tip
              </button>
            </div>
          )}
        </div>

        {/* ── APPRECIATION TAB ── */}
        {tab === "appreciate" && (
          <div className="px-5 pb-6">
            <p className="text-[12px] text-white/40 mb-5 leading-relaxed">
              {tipsEnabled
                ? "Send a free signal of appreciation — no payment required."
                : "This creator hasn't enabled tips yet. Send them a signal of appreciation instead."}
            </p>

            {/* Reaction grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {REACTIONS.map(({ emoji, label, type }) => {
                const reactionInfo = reactionCounts[type];
                const isActive = reactionInfo?.userReacted || sentReaction === type;
                const count = reactionInfo?.count ?? 0;
                return (
                  <button
                    key={type}
                    onClick={() => handleReaction(type, emoji)}
                    className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: isActive
                        ? "oklch(0.84 0.155 85 / 0.12)"
                        : "oklch(0.14 0.025 275)",
                      border: isActive
                        ? "1px solid oklch(0.84 0.155 85 / 0.35)"
                        : "1px solid oklch(0.20 0.02 275)",
                      boxShadow: isActive
                        ? "0 0 16px oklch(0.84 0.155 85 / 0.10)"
                        : "none",
                    }}
                  >
                    <span style={{ fontSize: "28px", lineHeight: 1 }}>{emoji}</span>
                    <span
                      className="text-[10px] font-heading tracking-wide"
                      style={{ color: isActive ? "oklch(0.84 0.155 85)" : "oklch(0.40 0.03 280)" }}
                    >
                      {label}
                    </span>
                    {count > 0 && (
                      <span
                        className="text-[9px] font-mono"
                        style={{ color: "oklch(0.55 0.04 280)" }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {!user && (
              <p className="text-[11px] text-center" style={{ color: "oklch(0.40 0.03 280)" }}>
                Sign in to send appreciation
              </p>
            )}
          </div>
        )}

        {/* ── TIP TAB ── */}
        {tab === "tip" && (
          <div className="px-5 pb-6 space-y-4">
            {/* Preset amounts */}
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((cents) => (
                <button
                  key={cents}
                  onClick={() => { setSelectedCents(cents); setUseCustom(false); }}
                  className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                  style={{
                    background: !useCustom && selectedCents === cents
                      ? "oklch(0.84 0.155 85)"
                      : "oklch(0.13 0.035 285)",
                    color: !useCustom && selectedCents === cents
                      ? "#2D1B2E"
                      : "oklch(0.65 0.04 280)",
                    border: `1px solid ${!useCustom && selectedCents === cents ? "oklch(0.84 0.155 85)" : "oklch(0.24 0.02 275)"}`,
                  }}
                >
                  ${(cents / 100).toFixed(0)}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                style={{
                  background: useCustom ? "oklch(0.84 0.155 85)" : "oklch(0.13 0.035 285)",
                  color: useCustom ? "#2D1B2E" : "oklch(0.65 0.04 280)",
                  border: `1px solid ${useCustom ? "oklch(0.84 0.155 85)" : "oklch(0.24 0.02 275)"}`,
                }}
              >
                Custom
              </button>
            </div>

            {useCustom && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "oklch(0.14 0.02 275)", border: "1px solid oklch(0.84 0.155 85 / 0.2)" }}
              >
                <span className="text-white/50 text-sm font-mono">$</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="0.01"
                  placeholder="0.00"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 bg-transparent text-white text-[15px] outline-none font-mono"
                  autoFocus
                />
              </div>
            )}

            {/* Gift button */}
            <button
              onClick={handleTip}
              disabled={tipMutation.isPending || amountCents < 100}
              className="w-full py-4 rounded-2xl text-[14px] font-bold tracking-wide transition-all
                disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
              style={{
                background: amountCents >= 100
                  ? "linear-gradient(135deg, oklch(0.84 0.155 85), oklch(0.72 0.18 75))"
                  : "oklch(0.20 0.02 275)",
                color: amountCents >= 100 ? "#2D1B2E" : "oklch(0.40 0.03 280)",
                fontFamily: "'Cinzel', serif",
                boxShadow: amountCents >= 100 ? "0 4px 20px oklch(0.84 0.155 85 / 0.30)" : "none",
              }}
            >
              {tipMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Processing…</>
              ) : (
                <>
                  <DollarSign size={16} />
                  Gift {artistName} {amountCents >= 100 ? `$${(amountCents / 100).toFixed(0)}` : ""}
                </>
              )}
            </button>

            <p className="text-[10px] text-center" style={{ color: "oklch(0.35 0.02 280)" }}>
              Goes directly to the creator. Living Nexus takes a small platform fee.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes giftBurst {
          0%   { transform: scale(0.5); opacity: 0; }
          30%  { transform: scale(1.3); opacity: 1; }
          70%  { transform: scale(1.0); opacity: 1; }
          100% { transform: scale(1.5) translateY(-60px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
