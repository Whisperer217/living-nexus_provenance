/* ══════════════════════════════════════════════════════════════════
   LIVING NEXUS — CreatorCard  (v3)
   A hover/tap-capable identity card that appears on track cards,
   discover feeds, and archive surfaces.

   v3 mobile improvements:
   - Touch: tap trigger to open card (no hover on touch devices)
   - Viewport-aware: card flips above/below based on available space
   - Width: clamps to viewport width on small screens (no overflow)
   - Position: left-edge clamped so card never clips off-screen
   - Button: larger tap target (py-3) on touch, shimmer still plays on tap
   - Outside-tap dismissal via touchstart listener
   - isTouchDevice detection prevents hover delay on mobile
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Fingerprint, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CreatorCardProps {
  creatorId: number;
  /** Inline mode: just avatar + name as a clickable link */
  inline?: boolean;
  /** Show the hover/tap card */
  showCard?: boolean;
  /** Override display name (avoids extra query when already available) */
  displayName?: string;
  avatarUrl?: string;
  className?: string;
}

/** True once a touchstart fires — used to skip hover logic on touch devices */
let globalTouchDetected = false;
if (typeof window !== "undefined") {
  window.addEventListener("touchstart", () => { globalTouchDetected = true; }, { once: true, passive: true });
}

export function CreatorCard({
  creatorId,
  inline = false,
  showCard = true,
  displayName,
  avatarUrl,
  className = "",
}: CreatorCardProps) {
  const [active, setActive] = useState(false);       // card open (hover or tap)
  const [fetching, setFetching] = useState(false);   // enables the query
  const [btnActive, setBtnActive] = useState(false); // button press state
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: creator } = trpc.profile.getCreatorMini.useQuery(
    { userId: creatorId },
    { enabled: showCard && fetching, staleTime: 60_000 }
  );

  /** Compute card position so it stays inside the viewport */
  const computeCardStyle = useCallback(() => {
    if (!triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const cardWidth = Math.min(320, vw - 24); // 12px margin each side

    // Horizontal: align to trigger left, but clamp so right edge doesn't overflow
    let left = 0;
    const triggerLeft = trigger.left;
    if (triggerLeft + cardWidth > vw - 12) {
      left = vw - 12 - cardWidth - triggerLeft;
    }

    // Vertical: prefer above, fall back to below if not enough space
    const spaceAbove = trigger.top;
    const openAbove = spaceAbove > 220; // enough room above?

    setCardStyle({
      width: `${cardWidth}px`,
      left: `${left}px`,
      ...(openAbove
        ? { bottom: "calc(100% + 8px)", top: "auto" }
        : { top: "calc(100% + 8px)", bottom: "auto" }),
    });
  }, []);

  const openCard = useCallback(() => {
    setFetching(true);
    computeCardStyle();
    setActive(true);
  }, [computeCardStyle]);

  const closeCard = useCallback(() => {
    setActive(false);
  }, []);

  // ── Desktop: hover with 400 ms delay ──────────────────────────────
  const handleMouseEnter = () => {
    if (!showCard || globalTouchDetected) return;
    hoverTimeout.current = setTimeout(openCard, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    closeCard();
  };

  // ── Mobile: tap trigger to toggle ────────────────────────────────
  const handleTriggerTap = (e: React.TouchEvent) => {
    if (!showCard) return;
    e.preventDefault(); // prevent ghost click
    if (active) {
      closeCard();
    } else {
      openCard();
    }
  };

  // ── Outside-tap / outside-click dismissal ────────────────────────
  useEffect(() => {
    if (!active) return;
    const dismiss = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        cardRef.current && !cardRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        closeCard();
      }
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("touchstart", dismiss, { passive: true });
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("touchstart", dismiss);
    };
  }, [active, closeCard]);

  const name = displayName || creator?.name || creator?.artistHandle || "Creator";
  const avatar = avatarUrl || creator?.profilePhotoUrl;

  const genres = creator?.primaryGenre
    ? creator.primaryGenre.split(",").map((g: string) => g.trim()).filter(Boolean).slice(0, 3)
    : [];

  const isFounder = !!creator?.founderWid;
  const publishedCount = creator?.publishedCount ?? 0;

  // ── Inline mode ───────────────────────────────────────────────────
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
      ref={triggerRef}
    >
      {/* ── Trigger: avatar + name ── */}
      <button
        type="button"
        className="inline-flex items-center gap-1.5 group cursor-pointer bg-transparent border-0 p-0"
        onTouchEnd={handleTriggerTap}
        onClick={() => { if (!globalTouchDetected) { /* handled by hover */ } }}
        aria-label={`View ${name}'s creator card`}
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C49A28]/40 to-[#7A5A1E]/40 ring-1 ring-white/10" />
        )}
        <span className="text-[11px] font-body text-white/60 group-hover:text-white/80 transition-colors truncate max-w-[120px]">
          {name}
        </span>
      </button>

      {/* ── Card panel ── */}
      {active && creator && (
        <div
          ref={cardRef}
          className="absolute z-50 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden"
          style={{
            ...cardStyle,
            background: "linear-gradient(160deg, #0f0c06 0%, #1c1508 60%, #0d0b07 100%)",
            border: "1px solid rgba(196,154,40,0.22)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* ── Top strip: Avatar + Name + Founder + Works count ── */}
          <div
            className="flex items-center gap-3 px-4 pt-4 pb-3"
            style={{ borderBottom: "1px solid rgba(196,154,40,0.10)" }}
          >
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

            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-heading text-white/90 leading-tight truncate">
                {creator.name || creator.artistHandle}
              </div>
              {creator.artistHandle && creator.name && (
                <div className="text-[10px] font-body text-white/40 mt-0.5">@{creator.artistHandle}</div>
              )}
              {creator.role && (
                <div className="text-[10px] font-body text-white/28 italic mt-0.5">{creator.role}</div>
              )}
            </div>

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

          {/* ── Genres — single-line, 3 max ── */}
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

          {/* ── View Profile button — larger tap target on mobile ── */}
          <div className="px-4 py-3">
            <Link
              href={`/creator/${creatorId}`}
              className="relative flex items-center justify-between w-full px-4 py-3 rounded-lg overflow-hidden"
              style={{
                background: btnActive
                  ? "rgba(196,154,40,0.22)"
                  : "rgba(196,154,40,0.09)",
                border: `1px solid rgba(196,154,40,${btnActive ? "0.50" : "0.22"})`,
                boxShadow: btnActive
                  ? "0 0 16px rgba(196,154,40,0.20), inset 0 0 12px rgba(196,154,40,0.06)"
                  : "none",
                transition: "all 0.25s ease",
                minHeight: "44px", // WCAG touch target minimum
              }}
              onMouseEnter={() => setBtnActive(true)}
              onMouseLeave={() => setBtnActive(false)}
              onTouchStart={() => setBtnActive(true)}
              onTouchEnd={() => setBtnActive(false)}
            >
              {/* Shimmer sweep */}
              <span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(196,154,40,0.12) 50%, transparent 60%)",
                  transform: btnActive ? "translateX(100%)" : "translateX(-100%)",
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
                  transform: btnActive ? "translateX(3px)" : "translateX(0)",
                }}
              />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
