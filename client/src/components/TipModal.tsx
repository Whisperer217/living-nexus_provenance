/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TipModal
   Divine tip/support modal for artists
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { X, DollarSign } from "lucide-react";
import { Track, usePlayer } from "@/contexts/PlayerContext";
import { toast } from "sonner";

const TIP_AMOUNTS = ["$1", "$5", "$10", "$25"];

interface Props {
  track: Track | null;
  onClose: () => void;
}

export default function TipModal({ track, onClose }: Props) {
  const { addTip } = usePlayer();
  const [selected, setSelected] = useState("$10");
  const [custom, setCustom] = useState("");

  if (!track) return null;

  const handleSend = () => {
    const amt = custom ? `$${parseFloat(custom).toFixed(2)}` : selected;
    if (!amt) { toast.error("Select a tip amount"); return; }
    const num = parseFloat((amt || "$0").replace("$", ""));
    addTip(num);
    toast.success(`💸 Tip of ${amt} sent to ${track.artist}!`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[380px] max-w-[90vw] rounded-2xl p-7 relative animate-fade-up"
        style={{
          background: "oklch(0.095 0.028 275)",
          border: "1px solid oklch(1 0 0 / 12%)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <X size={16} />
        </button>

        <div className="font-heading text-xl text-white/90 mb-1 tracking-wide">Support Artist</div>
        <div className="text-[13px] text-white/35 mb-5 font-body">Send a tip to show your appreciation</div>

        {/* Artist info */}
        <div className="flex items-center gap-3 rounded-xl p-3 mb-5"
          style={{ background: "oklch(0.13 0.028 270)" }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg overflow-hidden flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
            {track.artUrl && track.artType !== "video"
              ? <img src={track.artUrl} alt="" className="w-full h-full object-cover rounded-full" />
              : track.emoji || "🎵"
            }
          </div>
          <div>
            <div className="text-[14px] font-medium text-white/90 font-body">{track.artist}</div>
            <div className="text-[12px] text-white/35 font-body">{track.title}</div>
          </div>
        </div>

        {/* Tip amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {TIP_AMOUNTS.map(amt => (
            <button
              key={amt}
              onClick={() => { setSelected(amt); setCustom(""); }}
              className={`py-2.5 rounded-lg text-[14px] font-bold transition-all
                ${selected === amt && !custom
                  ? "bg-[#E8C547]/10 border border-[#E8C547] text-[#E8C547]"
                  : "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:border-[#E8C547]/40 hover:text-[#E8C547]"
                }`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="relative mb-5">
          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="number"
            placeholder="Custom amount"
            value={custom}
            onChange={e => { setCustom(e.target.value); setSelected(""); }}
            className="w-full pl-8 pr-4 py-2.5 rounded-lg text-[14px] font-body text-white/80
              bg-white/[0.04] border border-white/[0.08] outline-none
              focus:border-[#E8C547]/50 transition-colors placeholder:text-white/20"
          />
        </div>

        <button
          onClick={handleSend}
          className="w-full py-3 rounded-xl font-heading text-[14px] tracking-wider text-black font-bold
            transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)]"
          style={{ background: "linear-gradient(135deg, #E8C547, #C9A84C)" }}
        >
          Send Tip
        </button>
      </div>
    </div>
  );
}
