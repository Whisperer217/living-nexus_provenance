/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TipModal (ContextualModal edition)
   Voluntary gift/support modal — anchors to the triggering gift button.
   Routes to Stripe Checkout for real payment processing.
   Enhanced: genre pills, WID badge, fully dissected style info.
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { DollarSign, ExternalLink, Shield } from "lucide-react";
import { Track } from "@/contexts/PlayerContext";
import { toast } from "sonner";
import { ContextualModal } from "@/components/ContextualModal";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

const GIFT_AMOUNTS = ["$1", "$5", "$10", "$25"];

interface Props {
  track: Track | null;
  onClose: () => void;
  /** DOMRect of the button that triggered this modal — enables contextual anchoring */
  originRect?: DOMRect | null;
}

/** Split comma/slash/pipe-separated genre string into individual tags */
function parseGenreTags(genre: string): string[] {
  if (!genre) return [];
  return genre.split(/[,/|]+/).map(t => t.trim()).filter(Boolean);
}

export default function TipModal({ track, onClose, originRect }: Props) {
  const [selected, setSelected] = useState("$5");
  const [custom, setCustom] = useState("");

  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        toast.info("Redirecting to secure checkout…");
        window.open(data.url, "_blank", "noopener,noreferrer");
        onClose();
      }
    },
    onError: (err) => {
      toast.error(err.message || "Could not start checkout. Please try again.");
    },
  });

  if (!track) return null;

  const handleSend = () => {
    const rawAmt = custom
      ? parseFloat(custom)
      : parseFloat((selected || "$0").replace("$", ""));

    if (!rawAmt || isNaN(rawAmt)) {
      toast.error("Select a gift amount");
      return;
    }
    const amountCents = Math.round(rawAmt * 100);
    if (amountCents < 100) {
      toast.error("Minimum gift is $1.00");
      return;
    }

    const songId = track.id ? parseInt(String(track.id), 10) : null;
    if (!songId || isNaN(songId)) {
      toast.error("Unable to identify song. Please try again.");
      return;
    }

    tipMutation.mutate({
      songId,
      amountCents,
      origin: window.location.origin,
    });
  };

  const displayAmt = custom
    ? `$${parseFloat(custom || "0").toFixed(2)}`
    : selected;

  const genreTags = parseGenreTags(track.genre || "");

  return (
    <ContextualModal
      open={!!track}
      onClose={onClose}
      originRect={originRect}
      intent="send_gift"
      renderMode="contextual"
      width={340}
      maxHeight={580}
      title="Send a Gift"
      showClose
    >
      {/* Subtitle */}
      <div className="px-4 pb-2 pt-1">
        <p className="text-[12px] font-body" style={{ color: "#AA8E64" }}>
          A voluntary gift to show your appreciation
        </p>
      </div>

      {/* Track info card — fully dissected */}
      <div
        className="mx-4 mb-4 rounded-xl overflow-hidden"
        style={{ background: "#2C3438", border: "1px solid #2C3438" }}
      >
        {/* Cover + title row */}
        <div className="flex items-center gap-3 p-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-lg overflow-hidden flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
          >
            {track.artUrl && track.artType !== "video"
              ? <img
                  src={track.artUrl}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                  style={{ objectPosition: `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%` }}
                />
              : <span>{track.emoji || "🎵"}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold font-body truncate" style={{ color: "#E6CDAE" }}>
              {track.title}
            </div>
            <div className="text-[11px] font-body truncate mt-0.5" style={{ color: "#AA8E64" }}>
              {track.artist}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#2C3438" }} />

        {/* Style metadata row */}
        <div className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Genre pills */}
          {genreTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genreTags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-body leading-tight"
                  style={{
                    background: "#2C3438",
                    color: "#AA8E64",
                    border: "1px solid #2C3438",
                  }}
                >
                  {tag}
                </span>
              ))}
              {genreTags.length > 4 && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-body leading-tight"
                  style={{
                    background: "#2C3438",
                    color: "#3F4A50",
                    border: "1px solid #2C3438",
                  }}
                >
                  +{genreTags.length - 4}
                </span>
              )}
            </div>
          )}

          {/* WID badge */}
          {track.witnessId && (
            <Link
              href={`/verify/${track.witnessId}`}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClose(); }}
              className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded font-heading tracking-wider transition-opacity opacity-80 hover:opacity-100"
              style={{
                background: "#2C3438",
                color: "#CBB183",
                border: "1px solid rgba(203,177,131,0.40)",
              }}
              title={`Verified Witness ID: ${track.witnessId}`}
            >
              <Shield size={8} />
              <span>WID</span>
            </Link>
          )}
        </div>
      </div>

      {/* Gift amounts */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-3">
        {GIFT_AMOUNTS.map(amt => (
          <button
            key={amt}
            onClick={() => { setSelected(amt); setCustom(""); }}
            className={`py-2 rounded-lg text-[13px] font-bold transition-all
              ${selected === amt && !custom
                ? "bg-[#3F4A50]/10 border border-[#CBB183] text-[#CBB183]"
                : "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:border-[#CBB183]/40 hover:text-[#CBB183]"
              }`}
          >
            {amt}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="relative px-4 mb-4">
        <DollarSign size={13} className="absolute left-7 top-1/2 -translate-y-1/2 text-white/50" />
        <input
          type="number"
          placeholder="Custom amount"
          min="1"
          step="0.01"
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(""); }}
          className="w-full pl-7 pr-4 py-2.5 rounded-lg text-[13px] font-body text-white/80
            bg-white/[0.04] border border-white/[0.08] outline-none
            focus:border-[#CBB183]/50 transition-colors placeholder:text-white/40"
        />
      </div>

      {/* Stripe disclaimer */}
      <div className="px-4 mb-3 flex items-center gap-1.5">
        <ExternalLink size={10} className="text-white/30 flex-shrink-0" />
        <p className="text-[10px] font-body" style={{ color: "#3F4A50" }}>
          You'll be redirected to Stripe's secure checkout. No charge until you confirm.
        </p>
      </div>

      {/* Send button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleSend}
          disabled={tipMutation.isPending}
          className="w-full py-2.5 rounded-xl font-heading text-[13px] tracking-wider text-black font-bold
            transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          style={{ background: "linear-gradient(135deg, #CBB183, #c9a227)" }}
        >
          {tipMutation.isPending
            ? "Opening Checkout…"
            : `Send ${displayAmt} Gift →`}
        </button>
      </div>
    </ContextualModal>
  );
}
