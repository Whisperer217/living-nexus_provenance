/* ══════════════════════════════════════════════════════════════════
   LIVING NEXUS — CreatorCard  (v2)
   A hover/tap-capable identity card that appears on track cards,
   discover feeds, and archive surfaces.

   Changes in v2:
   - Full banner-width panel (no oval bubble)
   - Hierarchy: Creator → Bio → Works Count → Genres
   - Bio expanded to 2–3 lines
   - Published works count in upper-right beside Founder badge
   - Genres reduced to single-line metadata field (3 max)
   - Increased spacing/padding for typography readability
   - Hover animation on "View Profile" button (shimmer + arrow)
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Fingerprint, ArrowRight } from "lucide-react";
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
  const [btnHovered, setBtnHovered] = useState(false);
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

  // Parse genres — primaryGenre may be comma-separated; cap at 3
  const genres = creator?.primaryGenre
    ? creator.primaryGenre.split(",").map((g: string) => g.trim()).filter(Boolean).slice(0, 3)
    : [];

  const isFounder = !!creator?.founderWid;
  const publishedCount = creator?.publishedCount ?? 0;

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

      {/* Hover Card — full-width panel, no oval bubble */}
      {cardVisible && creator && (
        <div
          className="absolute z-50 bottom-full left-0 mb-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden"
          style={{
            width: "320px",
            background: "linear-gradient(160deg, #0f0c06 0%, #1c1508 60%, #0d0b07 100%)",
            border: "1px solid rgba(196,154,40,0.22)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* ── Top strip: Avatar + Name + Founder badge + Works count ── */}
          <div
            className="flex items-center gap-3 px-4 pt-4 pb-3"
            style={{ borderBottom: "1px solid rgba(196,154,40,0.10)" }}
          >
            {/* Avatar */}
            {creator.profilePhotoUrl ? (
              <img
                src={creator.profilePhotoUrl}
                alt=""
                className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                style={{ boxShadow: "0 0 0 2px rgba(196,154,40,0.35)" }}
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full flex-shrink-0 bg-gradient-to-br from-[#C49A28]/30 to-[#7A5A1E]/30"
                style={{ boxShadow: "0 0 0 2px rgba(196,154,40,0.35)" }}
              />
            )}

            {/* Name + handle */}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-heading text-white/92 leading-tight truncate">
                {creator.name || creator.artistHandle}
              </div>
              {creator.artistHandle && creator.name && (
                <div className="text-[10px] font-body text-white/38 mt-0.5">@{creator.artistHandle}</div>
              )}
              {creator.role && (
                <div className="text-[10px] font-body text-white/28 italic mt-0.5">{creator.role}</div>
              )}
            </div>

            {/* Upper-right: Founder badge + Works count */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {isFounder && (
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.28)" }}
                >
                  <Fingerprint size={8} style={{ color: "var(--ln-gold)" }} />
                  <span className="text-[8px] font-heading tracking-widest" style={{ color: "var(--ln-gold)" }}>FOUNDER</span>
                </div>
              )}
              {publishedCount > 0 && (
                <div className="text-right">
                  <span className="text-[13px] font-heading text-white/80">{publishedCount}</span>
                  <span className="text-[9px] font-body text-white/30 ml-1">Works</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Bio — 2–3 lines ── */}
          {(creator.bio || creator.witnessEpitaph || creator.witnessPhilosophy) && (
            <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}>
              <p className="text-[11.5px] font-body text-white/58 leading-relaxed line-clamp-3">
                {creator.bio || creator.witnessEpitaph || creator.witnessPhilosophy}
              </p>
            </div>
          )}

          {/* ── Genres — single-line metadata, 3 max ── */}
          {genres.length > 0 && (
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}
            >
              <span className="text-[9px] font-heading tracking-widest text-white/25 flex-shrink-0">GENRE</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {genres.map((g: string) => (
                  <span
                    key={g}
                    className="text-[9.5px] font-body text-white/50 px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── View Profile button with shimmer + arrow hover ── */}
          <div className="px-4 py-3">
            <Link
              href={`/creator/${creatorId}`}
              className="relative flex items-center justify-between w-full px-4 py-2.5 rounded-lg overflow-hidden transition-all duration-300 group/btn"
              style={{
                background: btnHovered
                  ? "rgba(196,154,40,0.18)"
                  : "rgba(196,154,40,0.09)",
                border: `1px solid rgba(196,154,40,${btnHovered ? "0.45" : "0.22"})`,
                boxShadow: btnHovered
                  ? "0 0 16px rgba(196,154,40,0.18), inset 0 0 12px rgba(196,154,40,0.06)"
                  : "none",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
            >
              {/* Shimmer sweep */}
              <span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(196,154,40,0.12) 50%, transparent 60%)",
                  transform: btnHovered ? "translateX(100%)" : "translateX(-100%)",
                  transition: "transform 0.5s ease",
                }}
              />
              <span
                className="text-[10px] font-heading tracking-wider relative z-10"
                style={{ color: "var(--ln-gold)" }}
              >
                VIEW PROFILE
              </span>
              <ArrowRight
                size={12}
                className="relative z-10 transition-transform duration-300"
                style={{
                  color: "var(--ln-gold)",
                  transform: btnHovered ? "translateX(3px)" : "translateX(0)",
                }}
              />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
