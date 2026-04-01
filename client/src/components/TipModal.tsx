/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TipModal (ContextualModal edition)
   Voluntary gift/support modal — anchors to the triggering gift button,
   same pattern as AddToMyListModal.
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Track, usePlayer } from "@/contexts/PlayerContext";
import { toast } from "sonner";
import { ContextualModal } from "@/components/ContextualModal";

const GIFT_AMOUNTS = ["$1", "$5", "$10", "$25"];

interface Props {
  track: Track | null;
  onClose: () => void;
  /** DOMRect of the button that triggered this modal — enables contextual anchoring */
  originRect?: DOMRect | null;
}

export default function TipModal({ track, onClose, originRect }: Props) {
  const { addTip } = usePlayer();
  const [selected, setSelected] = useState("$10");
  const [custom, setCustom] = useState("");

  if (!track) return null;

  const handleSend = () => {
    const amt = custom ? `$${parseFloat(custom).toFixed(2)}` : selected;
    if (!amt) { toast.error("Select a gift amount"); return; }
    const num = parseFloat((amt || "$0").replace("$", ""));
    addTip(num);
    toast.success(`🎁 Gift of ${amt} sent to ${track.artist}!`);
    onClose();
  };

  return (
    <ContextualModal
      open={!!track}
      onClose={onClose}
      originRect={originRect}
      intent="send_gift"
      renderMode="contextual"
      width={320}
      maxHeight={480}
      title="Send a Gift"
      showClose
    >
      {/* Subtitle */}
      <div className="px-4 pb-2 pt-1">
        <p className="text-[12px] font-body" style={{ color: "oklch(0.65 0.03 280)" }}>
          A voluntary gift to show your appreciation
        </p>
      </div>

      {/* Artist info */}
      <div
        className="mx-4 mb-4 flex items-center gap-3 rounded-xl p-3"
        style={{ background: "oklch(0.15 0.05 275)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base overflow-hidden flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
        >
          {track.artUrl && track.artType !== "video"
            ? <img
                src={track.artUrl}
                alt=""
                className="w-full h-full object-cover rounded-full"
                style={{ objectPosition: `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%` }}
              />
            : track.emoji || "🎵"
          }
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium font-body truncate" style={{ color: "oklch(0.90 0.01 80)" }}>
            {track.artist}
          </div>
          <div className="text-[11px] font-body truncate" style={{ color: "oklch(0.65 0.03 280)" }}>
            {track.title}
          </div>
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
                ? "bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37]"
                : "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
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
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(""); }}
          className="w-full pl-7 pr-4 py-2.5 rounded-lg text-[13px] font-body text-white/80
            bg-white/[0.04] border border-white/[0.08] outline-none
            focus:border-[#D4AF37]/50 transition-colors placeholder:text-white/40"
        />
      </div>

      {/* Send button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleSend}
          className="w-full py-2.5 rounded-xl font-heading text-[13px] tracking-wider text-black font-bold
            transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)]"
          style={{ background: "linear-gradient(135deg, #D4AF37, #c9a227)" }}
        >
          Send Gift
        </button>
      </div>
    </ContextualModal>
  );
}
