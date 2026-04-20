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
import { Link } from "wouter";
import { Crown, Music, ExternalLink } from "lucide-react";
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
}: {
  userId: number;
  pos: PopupPos;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { data, isLoading } = trpc.profile.getCreatorMini.useQuery(
    { userId },
    { staleTime: 60_000 }
  );

  const profileUrl = data?.artistHandle
    ? `/creator/${data.artistHandle}`
    : `/creator/${userId}`;

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

          {/* CTA */}
          <div className="px-3 pb-3">
            <Link
              href={profileUrl}
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{
                background: "rgba(196,154,40,0.15)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.3)",
              }}
            >
              <ExternalLink className="w-3 h-3" />
              View Profile
            </Link>
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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = handle ? `@${handle}` : (displayName ?? "Unknown");
  const profileUrl = handle
    ? `/creator/${handle}`
    : userId
    ? `/creator/${userId}`
    : undefined;

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

  // Close on outside click (mobile)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPopupPos(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
