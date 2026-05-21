/**
 * LIVING NEXUS — CreatorHandle
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a creator's handle as a styled interactive chip.
 *
 * Desktop: hover → mini profile card floats above the chip via a React portal
 * Mobile:  tap   → same card appears, tap outside to dismiss
 *
 * The pop-up is rendered via createPortal(…, document.body) so it escapes
 * any overflow-hidden ancestor (e.g. TrackCard, WorkCarousel cards).
 * Position is calculated from getBoundingClientRect on the chip element.
 *
 * Props:
 *   userId      — numeric user ID (required for pop-up data fetch)
 *   handle      — artistHandle string (e.g. "picklesmith")
 *   displayName — fallback display text if handle is null
 *   role        — "founder" | "admin" | "user" — controls badge
 *   size        — "sm" | "md" (default "sm")
 *   noPopup     — disable the pop-up (e.g. inside the pop-up itself)
 *   className   — extra class names
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
  /** ref forwarded so the parent's outside-click handler can exclude this node */
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { data, isLoading } = trpc.profile.getCreatorMini.useQuery(
    { userId },
    { staleTime: 60_000 }
  );

  // Always navigate by numeric ID — CreatorProfilePage uses parseInt(id) to query the DB.
  // Using artistHandle (a string) causes parseInt to return NaN → "Creator not found".
  const profileUrl = `/creator/${data?.id ?? userId}`;

  const CARD_WIDTH = 256; // w-64

  // Clamp left so the card never overflows the viewport
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const clampedLeft = Math.min(
    Math.max(8, pos.left - CARD_WIDTH / 2),
    viewportWidth - CARD_WIDTH - 8
  );

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    width: CARD_WIDTH,
    left: clampedLeft,
    ...(pos.above
      ? { bottom: `calc(100vh - ${pos.top}px + 6px)` }
      : { top: pos.top + 6 }),
    background: "var(--ln-coal)",
    border: "1px solid rgba(196,154,40,0.25)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,154,40,0.1)",
    borderRadius: "0.75rem",
    overflow: "hidden",
  };

  return createPortal(
    <div
      ref={cardRef}
      style={style}
      onClick={e => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isLoading ? (
        <div className="p-4 flex items-center justify-center">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(196,154,40,0.4)", borderTopColor: "transparent" }}
          />
        </div>
      ) : data ? (
        <>
          {/* Header row */}
          <div className="flex items-center gap-3 p-3 pb-2">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden"
              style={{
                background: data.profilePhotoUrl
                  ? "transparent"
                  : "linear-gradient(135deg, #7C3AED, #A78BFA)",
                color: "#fff",
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

            {/* Name + handle */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="font-semibold text-sm truncate"
                  style={{ color: "#E2E8F0" }}
                >
                  {data.name || data.artistHandle || "Creator"}
                </span>
                {data.role === "founder" && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest flex-shrink-0"
                    style={{
                      background: "rgba(245,196,81,0.15)",
                      color: "#F5C451",
                      border: "1px solid rgba(245,196,81,0.35)",
                    }}
                  >
                    <Crown className="w-2.5 h-2.5" />
                    FOUNDER
                  </span>
                )}
                {data.role === "admin" && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest flex-shrink-0"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      color: "#F87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </div>
              {data.artistHandle && (
                <div
                  className="text-[11px] truncate"
                  style={{ color: "var(--ln-gold)" }}
                >
                  @{data.artistHandle}
                </div>
              )}
            </div>
          </div>

          {/* Bio snippet */}
          {data.bio && (
            <div className="px-3 pb-2">
              <p
                className="text-[11px] leading-relaxed line-clamp-2"
                style={{ color: "#94A3B8" }}
              >
                {data.bio}
              </p>
            </div>
          )}

          {/* Witness Identity glimpse */}
          {(data.witnessEpitaph || data.witnessPhilosophy) && (
            <div className="mx-3 mb-2 p-2 rounded-lg" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.12)" }}>
              <div className="flex items-center gap-1 mb-1">
                <Fingerprint className="w-2.5 h-2.5" style={{ color: "var(--ln-gold)" }} />
                <span className="text-[8px] font-bold tracking-widest" style={{ color: "var(--ln-gold)" }}>WITNESS IDENTITY</span>
              </div>
              <p className="text-[10px] leading-relaxed line-clamp-2 italic" style={{ color: "rgba(196,154,40,0.7)" }}>
                {data.witnessEpitaph ? `"${data.witnessEpitaph}"` : data.witnessPhilosophy}
              </p>
            </div>
          )}

          {/* View Identity Page link */}
          {(data.witnessPhilosophy || data.witnessOriginStory || data.witnessDoctrine) && (
            <div className="px-3 pb-1">
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); navigate(`/identity/${data.id ?? userId}`); onClose(); }}
                className="flex items-center gap-1 text-[9px] font-semibold tracking-wider transition-all hover:opacity-80"
                style={{ color: "var(--ln-gold)" }}
              >
                <Fingerprint className="w-2.5 h-2.5" /> VIEW FULL IDENTITY
              </button>
            </div>
          )}

          {/* Stats row */}
          <div className="px-3 pb-2 flex items-center gap-3">
            {data.primaryGenre && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(196,154,40,0.1)",
                  color: "var(--ln-gold)",
                  border: "1px solid rgba(196,154,40,0.2)",
                }}
              >
                {data.primaryGenre}
              </span>
            )}
            {(data.songSlotsUsed ?? 0) > 0 && (
              <span
                className="flex items-center gap-1 text-[10px]"
                style={{ color: "#64748B" }}
              >
                <Music className="w-3 h-3" />
                {data.songSlotsUsed} works
              </span>
            )}
          </div>

          {/* CTA — navigate FIRST, then close so the route change isn't cancelled */}
          <div className="px-3 pb-3">
            <button
              onPointerDown={e => {
                // Prevent the document mousedown/pointerdown outside-click handler
                // from firing before this button's click handler runs.
                e.stopPropagation();
              }}
              onClick={e => {
                e.stopPropagation();
                navigate(profileUrl);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "rgba(196,154,40,0.15)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.3)",
              }}
            >
              <ExternalLink className="w-3 h-3" />
              View Profile
            </button>
          </div>
        </>
      ) : (
        <div className="p-4 text-xs text-center" style={{ color: "#64748B" }}>
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
  // navigate is captured here (inside the Router context) and passed to the
  // portal-rendered CreatorMiniCard, which is outside the Router subtree.
  const [, navigate] = useLocation();

  const label = handle ? `@${handle}` : (displayName ?? "Unknown");
  // Always use numeric userId for navigation — CreatorProfilePage uses parseInt(id).
  // Passing the handle string causes parseInt to return NaN → "Creator not found".
  const profileUrl = userId ? `/creator/${userId}` : undefined;

  const isFounder = role === "founder";
  const isAdmin = role === "admin";

  // ── Compute pop-up position from chip's bounding rect ──────────────────────
  const openPopup = useCallback(() => {
    if (noPopup || !userId || !chipRef.current) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);

    const rect = chipRef.current.getBoundingClientRect();
    const CARD_HEIGHT_APPROX = 220;
    const above = rect.top > CARD_HEIGHT_APPROX + 16;

    setPopupPos({
      top: above ? rect.top : rect.bottom,
      left: rect.left + rect.width / 2,
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
    // Use capture so we see the event before stopPropagation on inner elements
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("touchstart", handler, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
  }, [open]);

  // Close on scroll (repositioning would be complex; just close)
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
      // On touch devices, toggle pop-up instead of navigating
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
