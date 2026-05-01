/**
 * PlayerTipModal — Nebula Mode
 * ─────────────────────────────────────────────────────────────────
 * State machine: IDLE → NEBULA → CONFIRM → COMPLETE
 *
 * Z-layer architecture:
 *   Portal Layer  z-[10000]  ← this modal (above everything)
 *   Player Layer  z-[9000]   ← GlobalPlayer
 *   Experience    z-[1-100]  ← page UI
 *
 * Immediate fixes applied:
 *   • z-[10000] — above GlobalPlayer
 *   • 100dvh full-screen takeover in NEBULA mode
 *   • Scrollable content area, sticky CTA
 *   • Bottom padding = player height (80px) in compact mode
 *   • Player suspension signal via data attribute on body
 *
 * Nebula Mode:
 *   • Full-screen state transition (not a "modal")
 *   • Blurred artwork background fills viewport
 *   • Amount buttons orbit / pulse
 *   • Swipe-down or X to collapse back
 *   • Audio-reactive glow (CSS animation tied to isPlaying)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, DollarSign, Loader2, Tag, ChevronDown, Sparkles } from "lucide-react";

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2500]; // cents

type NebulaState = "compact" | "nebula" | "confirm" | "complete";

interface PlayerTipModalProps {
  songId: number;
  songTitle?: string;
  artistName: string;
  genre?: string | null;
  artUrl?: string | null;
  artType?: string | null;
  coverPositionX?: number;
  coverPositionY?: number;
  witnessId?: string | null;
  isPlaying?: boolean;
  /** If undefined or null, tips are not enabled for this creator */
  stripeAccountId?: string | null;
  onClose: () => void;
}

function parseGenreTags(genre: string | undefined | null): string[] {
  if (!genre) return [];
  return genre.split(",").map(t => t.trim()).filter(Boolean);
}

function GenrePillRow({ genre }: { genre: string | undefined | null }) {
  const tags = parseGenreTags(genre);
  if (tags.length === 0) return null;
  const visible = tags.slice(0, 5);
  const overflow = tags.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {visible.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-body leading-none"
          style={{
            background: "rgba(44,52,56,0.8)",
            color: "var(--ln-parchment)",
            border: "1px solid rgba(44,52,56,0.6)",
          }}
        >
          <Tag size={7} />
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-body leading-none"
          style={{
            background: "rgba(44,52,56,0.6)",
            color: "var(--ln-iron)",
            border: "1px solid rgba(44,52,56,0.4)",
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

export default function PlayerTipModal({
  songId,
  songTitle,
  artistName,
  genre,
  artUrl,
  artType,
  coverPositionX = 50,
  coverPositionY = 50,
  isPlaying = false,
  stripeAccountId,
  onClose,
}: PlayerTipModalProps) {
  const [nebulaState, setNebulaState] = useState<NebulaState>("compact");
  const [selectedCents, setSelectedCents] = useState<number>(500);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const tipsEnabled = !!stripeAccountId;
  const amountCents = useCustom
    ? Math.round(parseFloat(customInput || "0") * 100)
    : selectedCents;

  // ── Player suspension signal ────────────────────────────────────
  // Sets a data attribute on <body> that GlobalPlayer reads to fade/dock
  useEffect(() => {
    document.body.setAttribute("data-tip-modal-open", "true");
    return () => {
      document.body.removeAttribute("data-tip-modal-open");
    };
  }, []);

  // ── Nebula entry / exit ─────────────────────────────────────────
  const enterNebula = useCallback(() => {
    setNebulaState("nebula");
    document.body.style.overflow = "hidden";
  }, []);

  const exitNebula = useCallback(() => {
    setNebulaState("compact");
    document.body.style.overflow = "";
  }, []);

  const handleClose = useCallback(() => {
    document.body.style.overflow = "";
    onClose();
  }, [onClose]);

  // ── Swipe-down to exit nebula ───────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStartY(e.touches[0].clientY);
    setSwipeDelta(0);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStartY === null) return;
    const delta = e.touches[0].clientY - swipeStartY;
    if (delta > 0) setSwipeDelta(delta);
  };
  const handleTouchEnd = () => {
    if (swipeDelta > 80) exitNebula();
    setSwipeDelta(0);
    setSwipeStartY(null);
  };

  // ── Tip mutation ────────────────────────────────────────────────
  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        setNebulaState("complete");
        toast.success(`Gifting ${artistName}`, { description: "Redirecting to checkout…" });
        setTimeout(() => {
          window.open(data.url ?? undefined, "_blank");
          handleClose();
        }, 800);
      }
    },
    onError: (err) => {
      toast.error("Gift failed", { description: err.message });
    },
  });

  const handleTip = () => {
    if (!stripeAccountId) return;
    if (amountCents < 100) {
      toast.error("Minimum gift is $1.00");
      return;
    }
    setNebulaState("confirm");
    tipMutation.mutate({ songId, amountCents, origin: window.location.origin });
  };

  // ── Compact mode (immediate patch) ─────────────────────────────
  const CompactModal = (
    <div
      className="fixed inset-0 flex items-end justify-center md:items-center"
      style={{ zIndex: 10000 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      />

      {/* Card — full height on mobile, constrained on desktop */}
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "var(--ln-coal)",
          border: "1px solid rgba(196,154,40,0.2)",
          boxShadow: "0 0 40px rgba(196,154,40,0.08), 0 8px 48px rgba(0,0,0,0.70)",
          maxHeight: "calc(100dvh - 100px)", // leave room for player
          marginBottom: "88px", // player height + breathing room
        }}
      >
        {/* Scrollable content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
            >
              Send a Gift
            </p>
            <div className="flex items-center gap-2">
              {/* Enter Nebula button */}
              <button
                onClick={enterNebula}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                style={{
                  background: "rgba(196,154,40,0.12)",
                  color: "var(--ln-gold)",
                  border: "1px solid rgba(196,154,40,0.25)",
                  fontFamily: "'Cinzel', serif",
                }}
                title="Enter Nebula Mode"
              >
                <Sparkles size={10} />
                Nebula
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Track info */}
          <div
            className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
            >
              {artUrl && artType !== "video"
                ? <img
                    src={artUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                    style={{ objectPosition: `${coverPositionX}% ${coverPositionY}%` }}
                  />
                : <span className="text-xl">🎵</span>
              }
            </div>
            <div className="min-w-0 flex-1">
              {songTitle && (
                <div className="text-[13px] font-semibold font-body truncate" style={{ color: "var(--ln-parchment)" }}>
                  {songTitle}
                </div>
              )}
              <div className={`font-body truncate ${songTitle ? "text-[11px] mt-0.5" : "text-[13px]"}`} style={{ color: "var(--ln-smoke)" }}>
                {artistName}
              </div>
              <GenrePillRow genre={genre} />
            </div>
          </div>

          {!tipsEnabled ? (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <DollarSign size={24} className="mx-auto mb-2 opacity-30 text-white" />
              <p className="text-sm text-white/40">Gifts not enabled yet</p>
              <p className="text-xs text-white/25 mt-1">
                {artistName} hasn't connected their payment account.
              </p>
            </div>
          ) : (
            <>
              {/* Preset amounts */}
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((cents) => (
                  <button
                    key={cents}
                    onClick={() => { setSelectedCents(cents); setUseCustom(false); }}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                    style={{
                      background: !useCustom && selectedCents === cents ? "var(--ln-gold)" : "var(--ln-coal)",
                      color: !useCustom && selectedCents === cents ? "var(--ln-coal)" : "var(--ln-smoke)",
                      border: `1px solid ${!useCustom && selectedCents === cents ? "var(--ln-gold)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    ${(cents / 100).toFixed(0)}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: useCustom ? "var(--ln-gold)" : "var(--ln-coal)",
                    color: useCustom ? "var(--ln-coal)" : "var(--ln-smoke)",
                    border: `1px solid ${useCustom ? "var(--ln-gold)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  Other
                </button>
              </div>

              {useCustom && (
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-sm">$</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="0.01"
                    placeholder="Enter amount"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="flex-1 bg-transparent border-b text-white text-sm py-1 outline-none"
                    style={{ borderColor: "rgba(196,154,40,0.3)" }}
                    autoFocus
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky CTA — always visible at bottom */}
        {tipsEnabled && (
          <div
            className="flex-shrink-0 p-4 pt-3"
            style={{
              background: "var(--ln-coal)",
              borderTop: "1px solid rgba(196,154,40,0.1)",
            }}
          >
            <button
              onClick={handleTip}
              disabled={tipMutation.isPending || amountCents < 100}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "var(--ln-gold)",
                color: "var(--ln-coal)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              {tipMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Processing…</>
              ) : nebulaState === "confirm" ? (
                <><Sparkles size={14} /> Sending…</>
              ) : (
                <>
                  <DollarSign size={14} />
                  Give {amountCents >= 100 ? `$${(amountCents / 100).toFixed(0)}` : ""} and Unlock the Signal
                </>
              )}
            </button>
            <p className="text-center text-[10px] mt-2" style={{ color: "var(--ln-iron)" }}>
              100% of your gift supports the creator and the mission.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Nebula Mode (full system state shift) ───────────────────────
  const NebulaModal = (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 10000 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Blurred artwork background */}
      <div
        className="absolute inset-0"
        style={{
          background: artUrl && artType !== "video"
            ? `url(${artUrl}) center/cover no-repeat`
            : "radial-gradient(ellipse at center, #1a0a2e 0%, #050208 100%)",
          filter: "blur(32px) brightness(0.35)",
          transform: "scale(1.1)",
        }}
      />

      {/* Nebula particle overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 60%, rgba(196,154,40,0.12) 0%, transparent 70%), radial-gradient(ellipse at 20% 80%, rgba(120,60,200,0.10) 0%, transparent 60%)",
          animation: isPlaying ? "nebulaPulse 3s ease-in-out infinite" : "none",
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-safe pt-6 pb-4">
          <button
            onClick={exitNebula}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
          >
            <ChevronDown size={20} />
            <span className="text-xs font-body">Collapse</span>
          </button>
          <p
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            Enter the Nebula of Gift
          </p>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Swipe indicator */}
        <div
          className="mx-auto w-10 h-1 rounded-full mb-2 transition-opacity"
          style={{
            background: "rgba(255,255,255,0.2)",
            transform: `translateY(${Math.min(swipeDelta * 0.3, 8)}px)`,
          }}
        />

        {/* Center artwork */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: "min(260px, 60vw)",
              height: "min(260px, 60vw)",
              boxShadow: `0 0 60px rgba(196,154,40,${isPlaying ? "0.35" : "0.15"}), 0 20px 60px rgba(0,0,0,0.6)`,
              animation: isPlaying ? "nebulaFloat 4s ease-in-out infinite" : "none",
            }}
          >
            {artUrl && artType !== "video"
              ? <img
                  src={artUrl}
                  alt={songTitle}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `${coverPositionX}% ${coverPositionY}%` }}
                />
              : <div
                  className="w-full h-full flex items-center justify-center text-6xl"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
                >
                  🎵
                </div>
            }
          </div>

          {/* Track identity */}
          <div className="text-center">
            {songTitle && (
              <h2
                className="text-xl font-bold mb-1"
                style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
              >
                {songTitle}
              </h2>
            )}
            <p className="text-sm font-body" style={{ color: "var(--ln-smoke)" }}>
              {artistName}
            </p>
            <GenrePillRow genre={genre} />
          </div>

          {/* Orbiting amount buttons */}
          {tipsEnabled && (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {PRESET_AMOUNTS.map((cents, i) => {
                const isSelected = !useCustom && selectedCents === cents;
                return (
                  <button
                    key={cents}
                    onClick={() => { setSelectedCents(cents); setUseCustom(false); }}
                    className="rounded-full font-bold transition-all"
                    style={{
                      width: isSelected ? "72px" : "56px",
                      height: isSelected ? "72px" : "56px",
                      background: isSelected
                        ? "var(--ln-gold)"
                        : "rgba(196,154,40,0.12)",
                      color: isSelected ? "var(--ln-coal)" : "var(--ln-gold)",
                      border: `2px solid ${isSelected ? "var(--ln-gold)" : "rgba(196,154,40,0.3)"}`,
                      boxShadow: isSelected ? "0 0 24px rgba(196,154,40,0.5)" : "none",
                      fontSize: isSelected ? "18px" : "14px",
                      fontFamily: "'Cinzel', serif",
                      animation: isPlaying ? `nebulaOrbit ${3 + i * 0.4}s ease-in-out infinite` : "none",
                      animationDelay: `${i * 0.2}s`,
                      transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  >
                    ${(cents / 100).toFixed(0)}
                  </button>
                );
              })}
              <button
                onClick={() => setUseCustom(true)}
                className="rounded-full font-bold transition-all"
                style={{
                  width: useCustom ? "72px" : "56px",
                  height: useCustom ? "72px" : "56px",
                  background: useCustom ? "var(--ln-gold)" : "rgba(196,154,40,0.12)",
                  color: useCustom ? "var(--ln-coal)" : "var(--ln-gold)",
                  border: `2px solid ${useCustom ? "var(--ln-gold)" : "rgba(196,154,40,0.3)"}`,
                  fontSize: "11px",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                Other
              </button>
            </div>
          )}

          {/* Custom input in nebula */}
          {useCustom && tipsEnabled && (
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-2xl"
              style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.25)" }}
            >
              <span style={{ color: "var(--ln-gold)" }} className="text-lg font-bold">$</span>
              <input
                type="number"
                min="1"
                max="500"
                step="0.01"
                placeholder="Enter amount"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="bg-transparent text-white text-lg py-1 outline-none w-24 text-center"
                style={{ color: "var(--ln-parchment)" }}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        {tipsEnabled && (
          <div className="px-6 pb-safe pb-8 pt-4">
            <button
              onClick={handleTip}
              disabled={tipMutation.isPending || amountCents < 100}
              className="w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: nebulaState === "complete"
                  ? "rgba(34,197,94,0.9)"
                  : "var(--ln-gold)",
                color: "var(--ln-coal)",
                fontFamily: "'Cinzel', serif",
                boxShadow: "0 0 32px rgba(196,154,40,0.4)",
              }}
            >
              {tipMutation.isPending || nebulaState === "confirm" ? (
                <><Loader2 size={16} className="animate-spin" /> Sending the Signal…</>
              ) : nebulaState === "complete" ? (
                <><Sparkles size={16} /> Signal Sent ✓</>
              ) : (
                <>
                  <DollarSign size={16} />
                  Give {amountCents >= 100 ? `$${(amountCents / 100).toFixed(0)}` : ""} and Unlock the Signal
                </>
              )}
            </button>
            <p className="text-center text-[11px] mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              Your gift fuels the mission and honors the maker.
            </p>
            <p className="text-center text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
              Secure · Sovereign · Transparent
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(
    nebulaState === "nebula" || nebulaState === "confirm" || nebulaState === "complete"
      ? NebulaModal
      : CompactModal,
    document.body
  );
}
