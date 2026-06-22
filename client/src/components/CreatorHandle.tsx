/**
 * LIVING NEXUS — CreatorHandle
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a creator's handle as a styled interactive chip.
 *
 * Desktop: hover → creator card floats above/below the chip via a React portal
 * Mobile:  tap   → same card appears, tap outside to dismiss
 *
 * The pop-up is rendered via createPortal(…, document.body) so it escapes
 * any overflow-hidden ancestor (e.g. TrackCard, WorkCarousel cards).
 * Position is calculated from getBoundingClientRect on the chip element.
 *
 * Card hierarchy (Slimdoggy v2):
 *   1. Creator identity — avatar + name + role badge + works count
 *   2. Bio — 3 lines max, creator-mission focused
 *   3. Works count — already in header, reinforced visually
 *   4. Genres — single line, max 3, de-emphasised
 *   5. View Profile CTA — full-width, gold shimmer on hover
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { Crown, Music, ExternalLink, Fingerprint } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CreatorHandleProps {
  userId?: number;
  handle?: string | null;
  displayName?: string | null;
  role?: string | null;
  size?: "sm" | "md";
  noPopup?: boolean;
  className?: string;
}

// ── Pop-up position type ──────────────────────────────────────────────────────
interface PopupPos {
  top: number;
  left: number;
  /** true → render above the chip; false → render below */
  above: boolean;
  /** anchor x of the chip centre — used to clamp the card */
  anchorX: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse the primaryGenre field — may be a comma-separated string or JSON array */
function parseGenres(raw: string | null | undefined): string[] {
  if (!raw) return [];
  // Try JSON array first
  if (raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through
    }
  }
  // Comma-separated string
  return raw
    .split(",")
    .map(g => g.trim())
    .filter(Boolean);
}

// ── Mini pop-up card (portal-rendered) ───────────────────────────────────────
function CreatorMiniCard({
  userId,
  pos,
  onClose,
  onMouseEnter,
  onMouseLeave,
  navigate,
  cardRef,
}: {
  userId: number;
  pos: PopupPos;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  navigate: (to: string) => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { data, isLoading } = trpc.profile.getCreatorMini.useQuery(
    { userId },
    { staleTime: 60_000 }
  );

  const profileUrl = `/creator/${data?.id ?? userId}`;

  const CARD_WIDTH = 320; // wider than before — banner-width feel

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const clampedLeft = Math.min(
    Math.max(8, pos.anchorX - CARD_WIDTH / 2),
    viewportWidth - CARD_WIDTH - 8
  );

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    width: CARD_WIDTH,
    left: clampedLeft,
    ...(pos.above
      ? { bottom: `calc(100vh - ${pos.top}px + 8px)` }
      : { top: pos.top + 8 }),
    background: "linear-gradient(160deg, #111111 0%, #0a0a0a 100%)",
    border: "1px solid rgba(196,154,40,0.28)",
    boxShadow:
      "0 12px 40px rgba(0,0,0,0.75), 0 0 0 1px rgba(196,154,40,0.08), 0 0 24px rgba(196,154,40,0.06)",
    borderRadius: "1rem",
    overflow: "hidden",
  };

  const isFounder = data?.role === "founder";
  const isAdmin = data?.role === "admin";

  const genres = parseGenres(data?.primaryGenre).slice(0, 3);
  const publishedCount = data?.publishedCount ?? 0;

  return createPortal(
    <div
      ref={cardRef}
      style={style}
      onClick={e => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isLoading ? (
        /* ── Loading state ── */
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="ln-skeleton w-12 h-12 rounded-full flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="ln-skeleton h-4 w-32 rounded" />
              <div className="ln-skeleton h-3 w-20 rounded" />
            </div>
          </div>
          <div className="ln-skeleton h-3 w-full rounded" />
          <div className="ln-skeleton h-3 w-4/5 rounded" />
          <div className="ln-skeleton h-8 w-full rounded-lg mt-1" />
        </div>
      ) : data ? (
        <>
          {/* ── 1. IDENTITY HEADER ── */}
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold overflow-hidden"
              style={{
                background: data.profilePhotoUrl
                  ? "transparent"
                  : "linear-gradient(135deg, rgba(196,154,40,0.3), rgba(196,154,40,0.1))",
                color: "var(--ln-gold)",
                border: "1.5px solid rgba(196,154,40,0.3)",
                boxShadow: "0 0 12px rgba(196,154,40,0.12)",
              }}
            >
              {data.profilePhotoUrl ? (
                <img
                  src={data.profilePhotoUrl}
                  alt={data.name ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                (data.artistHandle || data.name || "?").charAt(0).toUpperCase()
              )}
            </div>

            {/* Name + handle + works count */}
            <div className="flex-1 min-w-0">
              {/* Row 1: name + badge */}
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span
                  className="font-bold text-sm leading-tight"
                  style={{
                    color: "#EDE5D0",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.02em",
                  }}
                >
                  {data.name || data.artistHandle || "Creator"}
                </span>
                {isFounder && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest flex-shrink-0"
                    style={{
                      background: "rgba(245,196,81,0.14)",
                      color: "#F5C451",
                      border: "1px solid rgba(245,196,81,0.35)",
                    }}
                  >
                    <Crown className="w-2.5 h-2.5" />
                    FOUNDER
                  </span>
                )}
                {isAdmin && !isFounder && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest flex-shrink-0"
                    style={{
                      background: "rgba(239,68,68,0.14)",
                      color: "#F87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </div>

              {/* Row 2: handle + works count */}
              <div className="flex items-center justify-between gap-2">
                {data.artistHandle && (
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--ln-gold)", letterSpacing: "0.01em" }}
                  >
                    @{data.artistHandle}
                  </span>
                )}
                {publishedCount > 0 && (
                  <span
                    className="flex items-center gap-1 text-[11px] font-semibold flex-shrink-0"
                    style={{ color: "rgba(196,154,40,0.75)" }}
                  >
                    <Music className="w-3 h-3" />
                    {publishedCount} {publishedCount === 1 ? "Work" : "Works"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ height: "1px", background: "rgba(196,154,40,0.10)", margin: "0 16px" }} />

          {/* ── 2. BIO ── */}
          {data.bio && (
            <div className="px-4 pt-3 pb-2">
              <p
                className="text-[12px] leading-[1.7] line-clamp-3"
                style={{ color: "rgba(237,229,208,0.72)" }}
              >
                {data.bio}
              </p>
            </div>
          )}

          {/* ── 3. WITNESS IDENTITY glimpse (optional) ── */}
          {(data.witnessEpitaph || data.witnessPhilosophy) && (
            <div
              className="mx-4 mb-3 px-3 py-2 rounded-lg"
              style={{
                background: "rgba(196,154,40,0.05)",
                border: "1px solid rgba(196,154,40,0.12)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Fingerprint className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                <span
                  className="text-[9px] font-bold tracking-widest"
                  style={{ color: "var(--ln-gold)" }}
                >
                  WITNESS IDENTITY
                </span>
              </div>
              <p
                className="text-[11px] leading-relaxed line-clamp-2 italic"
                style={{ color: "rgba(196,154,40,0.65)" }}
              >
                {data.witnessEpitaph
                  ? `"${data.witnessEpitaph}"`
                  : data.witnessPhilosophy}
              </p>
            </div>
          )}

          {/* ── 4. GENRES — single line, max 3, de-emphasised ── */}
          {genres.length > 0 && (
            <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
              {genres.map(g => (
                <span
                  key={g}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(196,154,40,0.07)",
                    color: "rgba(196,154,40,0.55)",
                    border: "1px solid rgba(196,154,40,0.14)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* ── 5. VIEW PROFILE CTA ── */}
          <div className="px-4 pb-4">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                navigate(profileUrl);
                onClose();
              }}
              className="creator-card-cta flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-semibold tracking-wide transition-all"
              style={{
                background: "rgba(196,154,40,0.12)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.3)",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 creator-card-cta-icon" />
              View Profile
            </button>
          </div>
        </>
      ) : (
        <div className="p-5 text-xs text-center" style={{ color: "#64748B" }}>
          Profile unavailable
        </div>
      )}
    </div>,
    document.body
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CreatorHandle({
  userId,
  handle,
  displayName,
  role,
  size = "sm",
  noPopup = false,
  className = "",
}: CreatorHandleProps) {
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, navigate] = useLocation();

  const label = handle ? `@${handle}` : (displayName ?? "Unknown");
  const profileUrl = userId ? `/creator/${userId}` : undefined;

  const isFounder = role === "founder";
  const isAdmin = role === "admin";

  // ── Compute pop-up position from chip's bounding rect ──────────────────────
  const openPopup = useCallback(() => {
    if (noPopup || !userId || !chipRef.current) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);

    const rect = chipRef.current.getBoundingClientRect();
    const CARD_HEIGHT_APPROX = 260;
    const above = rect.top > CARD_HEIGHT_APPROX + 16;

    setPopupPos({
      top: above ? rect.top : rect.bottom,
      left: rect.left + rect.width / 2,
      anchorX: rect.left + rect.width / 2,
      above,
    });
    setOpen(true);
  }, [noPopup, userId]);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setPopupPos(null);
    }, 220);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Close on outside click/tap — but NOT if the tap was inside the portal card
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const insideChip = chipRef.current?.contains(target);
      const insideCard = cardRef.current?.contains(target);
      if (!insideChip && !insideCard) {
        setOpen(false);
        setPopupPos(null);
      }
    };
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("touchstart", handler, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const handler = () => {
      setOpen(false);
      setPopupPos(null);
    };
    window.addEventListener("scroll", handler, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", handler, { capture: true });
  }, [open]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (noPopup || !userId) return;
      if (window.matchMedia("(hover: none)").matches) {
        e.preventDefault();
        if (open) {
          setOpen(false);
          setPopupPos(null);
        } else {
          openPopup();
        }
      }
    },
    [noPopup, userId, open, openPopup]
  );

  const textSize = size === "md" ? "text-sm" : "text-[11px]";

  const chip = (
    <span
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={openPopup}
      onMouseLeave={scheduleClose}
    >
      {/* The handle chip */}
      <span
        ref={chipRef}
        className={`inline-flex items-center gap-1 font-semibold ${textSize} rounded-full px-2 py-0.5 cursor-pointer transition-all select-none`}
        style={{
          background: isFounder
            ? "rgba(245,196,81,0.1)"
            : isAdmin
            ? "rgba(239,68,68,0.1)"
            : "rgba(196,154,40,0.08)",
          color: isFounder ? "#F5C451" : isAdmin ? "#F87171" : "var(--ln-gold)",
          border: isFounder
            ? "1px solid rgba(245,196,81,0.3)"
            : isAdmin
            ? "1px solid rgba(239,68,68,0.25)"
            : "1px solid rgba(196,154,40,0.2)",
          boxShadow: open ? "0 0 8px rgba(196,154,40,0.2)" : "none",
          letterSpacing: "0.01em",
        }}
        onClick={handleClick}
      >
        {isFounder && <Crown className="w-2.5 h-2.5 flex-shrink-0" />}
        {label}
      </span>

      {/* Pop-up card — rendered via portal so it escapes overflow-hidden */}
      {open && userId && !noPopup && popupPos && (
        <CreatorMiniCard
          userId={userId}
          pos={popupPos}
          onClose={() => { setOpen(false); setPopupPos(null); }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          navigate={navigate}
          cardRef={cardRef}
        />
      )}
    </span>
  );

  // If pop-up is disabled, wrap in a link
  if (noPopup && profileUrl) {
    return (
      <Link href={profileUrl} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {chip}
      </Link>
    );
  }

  return chip;
}
