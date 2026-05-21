/* ══════════════════════════════════════════════════════════════════
   LIVING NEXUS — CreatorCard
   A compact, hover/tap-capable identity card that appears on track
   cards, discover feeds, and archive surfaces. Shows the creator's
   avatar, name, role, and a glimpse of their witness identity.
   Links to their full Identity Page (/identity/:id).
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Fingerprint, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CreatorCardProps {
  creatorId: number;
  /** Inline mode: just avatar + name as a clickable link */
  inline?: boolean;
  /** Show the hover card on desktop */
  showCard?: boolean;
  /** Override display name (avoids extra query when already available) */
  displayName?: string;
  avatarUrl?: string;
  className?: string;
}

export function CreatorCard({
  creatorId,
  inline = false,
  showCard = true,
  displayName,
  avatarUrl,
  className = "",
}: CreatorCardProps) {
  const [hovered, setHovered] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch creator mini profile only when card is shown
  const { data: creator } = trpc.profile.getCreatorMini.useQuery(
    { userId: creatorId },
    { enabled: showCard && hovered, staleTime: 60_000 }
  );

  const handleMouseEnter = () => {
    if (!showCard) return;
    hoverTimeout.current = setTimeout(() => {
      setHovered(true);
      setCardVisible(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setCardVisible(false);
    setTimeout(() => setHovered(false), 300);
  };

  // Close on outside click (mobile tap)
  useEffect(() => {
    if (!cardVisible) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setCardVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cardVisible]);

  const name = displayName || creator?.name || creator?.artistHandle || "Creator";
  const avatar = avatarUrl || creator?.profilePhotoUrl;

  if (inline) {
    return (
      <Link href={`/creator/${creatorId}`} className={`inline-flex items-center gap-1.5 group ${className}`}>
        {avatar && (
          <img src={avatar} alt="" className="w-4 h-4 rounded-full object-cover ring-1 ring-white/10" />
        )}
        <span className="text-[11px] font-body text-white/60 group-hover:text-white/80 transition-colors truncate">
          {name}
        </span>
      </Link>
    );
  }

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={cardRef}
    >
      {/* Trigger — avatar + name */}
      <Link href={`/creator/${creatorId}`} className="inline-flex items-center gap-1.5 group">
        {avatar ? (
          <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C49A28]/40 to-[#7A5A1E]/40 ring-1 ring-white/10" />
        )}
        <span className="text-[11px] font-body text-white/60 group-hover:text-white/80 transition-colors truncate max-w-[120px]">
          {name}
        </span>
      </Link>

      {/* Hover Card */}
      {cardVisible && creator && (
        <div
          className="absolute z-50 bottom-full left-0 mb-2 w-72 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            background: "linear-gradient(145deg, #0d0b07 0%, #1a1408 100%)",
            border: "1px solid rgba(196,154,40,0.25)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {creator.profilePhotoUrl ? (
              <img src={creator.profilePhotoUrl} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#C49A28]/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C49A28]/30 to-[#7A5A1E]/30 ring-2 ring-[#C49A28]/30" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-heading text-white/90 truncate">{creator.name || creator.artistHandle}</div>
              {creator.artistHandle && (
                <div className="text-[10px] font-body text-white/40">@{creator.artistHandle}</div>
              )}
              {creator.role && (
                <div className="text-[10px] font-body text-white/30 mt-0.5 italic">{creator.role}</div>
              )}
            </div>
          </div>

          {/* Witness Identity glimpse */}
          {(creator.witnessPhilosophy || creator.witnessEpitaph) && (
            <div className="mb-3 p-2.5 rounded-lg" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.12)" }}>
              <div className="flex items-center gap-1 mb-1.5">
                <Fingerprint size={10} style={{ color: "var(--ln-gold)" }} />
                <span className="text-[9px] font-heading tracking-widest" style={{ color: "var(--ln-gold)" }}>WITNESS IDENTITY</span>
              </div>
              {creator.witnessEpitaph && (
                <p className="text-[11px] font-body text-white/60 italic leading-relaxed line-clamp-2">
                  "{creator.witnessEpitaph}"
                </p>
              )}
              {!creator.witnessEpitaph && creator.witnessPhilosophy && (
                <p className="text-[11px] font-body text-white/50 leading-relaxed line-clamp-2">
                  {creator.witnessPhilosophy}
                </p>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-3">
            {(creator.songSlotsUsed ?? 0) > 0 && (
              <div className="text-center">
                <div className="text-[12px] font-heading text-white/80">{creator.songSlotsUsed}</div>
                <div className="text-[9px] font-body text-white/30">works</div>
              </div>
            )}
            {creator.primaryGenre && (
              <div className="text-center">
                <div className="text-[10px] font-heading text-white/60 px-2 py-0.5 rounded-full" style={{ background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.2)" }}>{creator.primaryGenre}</div>
              </div>
            )}
          </div>

          {/* View full identity link */}
          <Link
            href={`/identity/${creatorId}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[10px] font-heading tracking-wider transition-all hover:opacity-80"
            style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
          >
            <ExternalLink size={10} /> VIEW FULL IDENTITY
          </Link>
        </div>
      )}
    </div>
  );
}
