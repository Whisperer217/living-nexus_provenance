/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ManifestationGestureLayer (Phase 194.2)
   Gesture-based manifestation navigation for both desktop and mobile.

   Desktop:
     Drag Right → Next manifestation (card slides left, next slides in)
     Drag Left  → Previous manifestation (card slides right, prev slides in)
     Double Click → Witness / Favorite manifestation
     Hold (500ms) → Manifestation Quick View panel

   Mobile:
     Swipe Right → Next manifestation
     Swipe Left  → Previous manifestation
     Long Press (500ms) → Manifestation Quick View
     Swipe Up (≥80px, fast) → Enter Creator Domain

   Drift Check (Phase 194.2 doctrine):
     ✓ Strengthens creator discovery (swipe-up → Creator Domain)
     ✓ Strengthens creator identity (Creator Domain entry: Identity first)
     ✓ Moves users toward Creator Domains (primary gesture)
     ✓ Reduces friction (replaces multi-click navigation)
     ✓ Avoids disposable content behavior (no score, no feed)
═══════════════════════════════════════════════════════════════════ */
import React, {
  useRef, useState, useCallback, useEffect, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Heart, ExternalLink, MessageCircle, Shield, User, X,
  ChevronRight, ArrowUp,
} from "lucide-react";
import type { Track } from "@/contexts/PlayerContext";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GestureCallbacks {
  onNext: () => void;
  onPrev: () => void;
  onWitness: () => void;
}

interface QuickViewProps {
  track: Track;
  songId: number;
  onClose: () => void;
  onWitness: () => void;
  isLiked: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(s?: number) {
  if (!s || isNaN(s)) return "";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function getMediumLabel(contentType?: string) {
  const map: Record<string, string> = {
    audio: "Music",
    lyrics: "Lyrics",
    manuscript: "Manuscript",
    comic: "Comic",
    guide: "Guide",
  };
  return map[contentType ?? "audio"] ?? "Manifestation";
}

// ── Manifestation Quick View Panel ───────────────────────────────────────────

function ManifestationQuickView({ track, songId, onClose, onWitness, isLiked }: QuickViewProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: songId },
    { enabled: !!songId, staleTime: 60_000 }
  );
  const { data: commentsData } = trpc.comments.list.useQuery(
    { songId },
    { enabled: !!songId, staleTime: 30_000 }
  );

  const song = songDetail?.song as any;
  const creator = songDetail?.creator as any;
  const comments = (commentsData ?? []) as any[];
  const witnessId = song?.witnessId ?? track.witnessId;
  const playCount = song?.playCount ?? 0;
  const medium = getMediumLabel(track.contentType);

  const goToCreator = () => {
    if (creator?.id) { navigate(`/creator/${creator.id}`); onClose(); }
  };
  const goToSong = () => {
    navigate(`/song/${songId}`); onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9050] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0d0b07 0%, #080604 100%)",
          border: "1px solid rgba(196,154,40,0.20)",
          borderBottom: "none",
          boxShadow: "0 -16px 64px rgba(0,0,0,0.80)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
          animation: "slideUpPanel 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(196,154,40,0.25)" }} />
        </div>

        {/* Header: art + metadata */}
        <div className="flex gap-4 px-5 pt-3 pb-4">
          {/* Cover art */}
          <div
            className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.60)" }}
          >
            {track.artUrl
              ? <img src={track.artUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl"
                  style={{ background: track.bg || "#1a1208" }}>
                  {track.emoji || "🎵"}
                </div>
            }
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
            <p
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: "rgba(196,154,40,0.55)" }}
            >
              {medium}
            </p>
            <h2
              className="text-[16px] font-bold leading-tight truncate"
              style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}
            >
              {track.title}
            </h2>
            {/* Creator */}
            <button
              onClick={goToCreator}
              className="flex items-center gap-1.5 text-left group"
            >
              {creator?.profilePhotoUrl
                ? <img src={creator.profilePhotoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                : <User size={14} style={{ color: "rgba(196,154,40,0.55)" }} />
              }
              <span
                className="text-[13px] truncate group-hover:underline"
                style={{ color: "rgba(196,154,40,0.80)" }}
              >
                {creator?.artistHandle || creator?.name || track.artist}
              </span>
              <ChevronRight size={12} style={{ color: "rgba(196,154,40,0.40)" }} />
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(196,154,40,0.08)", color: "rgba(196,154,40,0.55)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Provenance row */}
        {witnessId && (
          <div
            className="mx-5 mb-4 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.14)" }}
          >
            <Shield size={13} style={{ color: "var(--ln-gold)", flexShrink: 0 }} />
            <span className="text-[11px] font-mono" style={{ color: "rgba(196,154,40,0.70)" }}>
              {witnessId}
            </span>
            <span className="ml-auto text-[10px]" style={{ color: "rgba(196,154,40,0.40)" }}>
              Provenance Verified
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-3 px-5 mb-4">
          <div
            className="flex-1 rounded-xl px-3 py-2 flex flex-col items-center gap-0.5"
            style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.10)" }}
          >
            <span className="text-[15px] font-bold" style={{ color: "#F5EDD8" }}>
              {playCount > 999 ? `${(playCount / 1000).toFixed(1)}k` : playCount}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(196,154,40,0.45)" }}>Plays</span>
          </div>
          <div
            className="flex-1 rounded-xl px-3 py-2 flex flex-col items-center gap-0.5"
            style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.10)" }}
          >
            <span className="text-[15px] font-bold" style={{ color: "#F5EDD8" }}>
              {comments.length}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(196,154,40,0.45)" }}>Witnesses</span>
          </div>
          {song?.durationSeconds && (
            <div
              className="flex-1 rounded-xl px-3 py-2 flex flex-col items-center gap-0.5"
              style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.10)" }}
            >
              <span className="text-[15px] font-bold" style={{ color: "#F5EDD8" }}>
                {fmtDuration(song.durationSeconds)}
              </span>
              <span className="text-[10px]" style={{ color: "rgba(196,154,40,0.45)" }}>Duration</span>
            </div>
          )}
        </div>

        {/* Recent comments */}
        {comments.length > 0 && (
          <div className="px-5 mb-4">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2"
              style={{ color: "rgba(196,154,40,0.40)" }}>
              <MessageCircle size={10} className="inline mr-1" />
              Recent Witness Notes
            </p>
            <div className="flex flex-col gap-2 max-h-24 overflow-y-auto">
              {comments.slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]"
                    style={{ background: "rgba(196,154,40,0.12)", color: "rgba(196,154,40,0.60)" }}>
                    {(c.authorName || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold mr-1.5"
                      style={{ color: "rgba(196,154,40,0.60)" }}>
                      {c.authorName || "Anonymous"}
                    </span>
                    <span className="text-[11px]" style={{ color: "rgba(232,223,200,0.70)" }}>
                      {c.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-3 px-5 pb-4">
          {/* Witness / Like */}
          <button
            onClick={() => { onWitness(); }}
            disabled={!user}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] transition-all disabled:opacity-40"
            style={{
              background: isLiked ? "rgba(239,68,68,0.15)" : "rgba(196,154,40,0.08)",
              border: `1px solid ${isLiked ? "rgba(239,68,68,0.35)" : "rgba(196,154,40,0.20)"}`,
              color: isLiked ? "#ef4444" : "rgba(196,154,40,0.80)",
            }}
          >
            <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
            {isLiked ? "Witnessed" : "Witness"}
          </button>

          {/* View Manifestation */}
          <button
            onClick={goToSong}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] transition-all"
            style={{
              background: "rgba(196,154,40,0.08)",
              border: "1px solid rgba(196,154,40,0.20)",
              color: "rgba(196,154,40,0.80)",
            }}
          >
            <ExternalLink size={14} />
            View
          </button>

          {/* Enter Creator Domain */}
          {creator?.id && (
            <button
              onClick={goToCreator}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] transition-all"
              style={{
                background: "rgba(196,154,40,0.15)",
                border: "1px solid rgba(196,154,40,0.35)",
                color: "var(--ln-gold)",
              }}
            >
              <ArrowUp size={14} />
              Domain
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpPanel {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ── Creator Domain Entry Overlay ─────────────────────────────────────────────

interface DomainEntryProps {
  track: Track;
  creatorId: number;
  creatorHandle?: string;
  creatorAvatar?: string;
  onDone: () => void;
}

function CreatorDomainEntry({ track, creatorId, creatorHandle, creatorAvatar, onDone }: DomainEntryProps) {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<"expand" | "reveal" | "done">("expand");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 350);
    const t2 = setTimeout(() => {
      setPhase("done");
      navigate(`/creator/${creatorId}`);
      onDone();
    }, 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [creatorId, navigate, onDone]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9060] flex flex-col items-center justify-center"
      style={{
        background: "#000000",
        transition: "opacity 0.3s",
        opacity: phase === "done" ? 0 : 1,
      }}
    >
      {/* Expanding artwork */}
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: phase === "expand" ? "20px" : "0px",
          width: phase === "expand" ? "200px" : "100vw",
          height: phase === "expand" ? "200px" : "100vh",
          transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {track.artUrl
          ? <img src={track.artUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-6xl"
              style={{ background: track.bg || "#1a1208" }}>
              {track.emoji || "🎵"}
            </div>
        }
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.70) 100%)",
            opacity: phase === "reveal" ? 1 : 0,
            transition: "opacity 0.35s",
          }}
        />
      </div>

      {/* Creator identity — fades in */}
      <div
        className="absolute bottom-0 left-0 right-0 px-8 pb-16 flex flex-col items-center gap-3"
        style={{
          opacity: phase === "reveal" ? 1 : 0,
          transform: phase === "reveal" ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.35s 0.15s",
        }}
      >
        {creatorAvatar && (
          <img
            src={creatorAvatar}
            alt=""
            className="w-16 h-16 rounded-full border-2 object-cover"
            style={{ borderColor: "rgba(196,154,40,0.60)" }}
          />
        )}
        <p className="text-[13px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.60)" }}>
          Entering Creator Domain
        </p>
        <h2
          className="text-[24px] font-bold text-center"
          style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}
        >
          {creatorHandle || "Creator Domain"}
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--ln-gold)" }} />
          <span className="text-[11px]" style={{ color: "rgba(196,154,40,0.50)" }}>Identity · Domain · Manifestations</span>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--ln-gold)" }} />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Swipe / Drag Indicator ────────────────────────────────────────────────────

interface SwipeIndicatorProps {
  direction: "left" | "right" | "up" | null;
  progress: number; // 0-1
}

function SwipeIndicator({ direction, progress }: SwipeIndicatorProps) {
  if (!direction || progress < 0.1) return null;
  const opacity = Math.min(progress * 1.5, 0.85);
  const label = direction === "left" ? "← Prev" : direction === "right" ? "Next →" : "↑ Creator Domain";
  const color = direction === "up" ? "var(--ln-gold)" : "rgba(232,223,200,0.80)";
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
      style={{ opacity }}
    >
      <div
        className="px-4 py-2 rounded-full text-[13px] font-bold"
        style={{
          background: "rgba(0,0,0,0.70)",
          border: `1px solid ${direction === "up" ? "rgba(196,154,40,0.40)" : "rgba(232,223,200,0.20)"}`,
          color,
          backdropFilter: "blur(8px)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── useManifestationGesture hook ──────────────────────────────────────────────

export interface UseManifestationGestureOptions {
  onNext: () => void;
  onPrev: () => void;
  onWitness: () => void;
  onEnterDomain: () => void;
  /** Minimum drag distance in px to trigger next/prev */
  threshold?: number;
  /** Minimum swipe-up distance to trigger domain entry */
  upThreshold?: number;
  /** Hold duration in ms to trigger Quick View */
  holdDuration?: number;
  disabled?: boolean;
}

export interface UseManifestationGestureReturn {
  /** Attach to the gesture target element */
  desktopHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
  };
  mobileHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
  quickViewOpen: boolean;
  setQuickViewOpen: (v: boolean) => void;
  /** Swipe feedback state for indicator */
  swipeDirection: "left" | "right" | "up" | null;
  swipeProgress: number;
  /** Whether the gesture is actively dragging */
  isDragging: boolean;
  /** Drag offset in px (for card slide animation) */
  dragOffset: number;
}

export function useManifestationGesture({
  onNext,
  onPrev,
  onWitness,
  onEnterDomain,
  threshold = 60,
  upThreshold = 80,
  holdDuration = 500,
  disabled = false,
}: UseManifestationGestureOptions): UseManifestationGestureReturn {
  // Desktop state
  const mouseDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  // Mobile state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mobileLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileDragRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Swipe indicator
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "up" | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
  }, []);
  const clearMobileLongPress = useCallback(() => {
    if (mobileLongPressRef.current) { clearTimeout(mobileLongPressRef.current); mobileLongPressRef.current = null; }
  }, []);

  // ── Desktop handlers ─────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || e.button !== 0) return;
    mouseDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDragging(false);
    setDragOffset(0);
    // Start hold timer
    holdTimerRef.current = setTimeout(() => {
      setQuickViewOpen(true);
      mouseDownRef.current = null;
    }, holdDuration);
  }, [disabled, holdDuration]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDownRef.current) return;
    const dx = e.clientX - mouseDownRef.current.x;
    const absDx = Math.abs(dx);
    if (absDx > 8) {
      clearHold();
      setIsDragging(true);
      setDragOffset(dx);
      const dir = dx > 0 ? "right" : "left";
      setSwipeDirection(dir);
      setSwipeProgress(Math.min(absDx / threshold, 1));
    }
  }, [clearHold, threshold]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    clearHold();
    if (!mouseDownRef.current) return;
    const dx = e.clientX - mouseDownRef.current.x;
    const absDx = Math.abs(dx);
    mouseDownRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    setSwipeDirection(null);
    setSwipeProgress(0);
    if (absDx >= threshold) {
      if (dx > 0) onNext(); else onPrev();
    }
  }, [clearHold, threshold, onNext, onPrev]);

  const onMouseLeave = useCallback((e: React.MouseEvent) => {
    clearHold();
    if (!mouseDownRef.current) return;
    const dx = e.clientX - mouseDownRef.current.x;
    mouseDownRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    setSwipeDirection(null);
    setSwipeProgress(0);
    if (Math.abs(dx) >= threshold) {
      if (dx > 0) onNext(); else onPrev();
    }
  }, [clearHold, threshold, onNext, onPrev]);

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    onWitness();
  }, [disabled, onWitness]);

  // ── Mobile handlers ──────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    mobileDragRef.current = { dx: 0, dy: 0 };
    // Long press timer
    mobileLongPressRef.current = setTimeout(() => {
      setQuickViewOpen(true);
      touchStartRef.current = null;
    }, holdDuration);
  }, [disabled, holdDuration]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    mobileDragRef.current = { dx, dy };
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    // Cancel long press if moved
    if (absDx > 10 || absDy > 10) clearMobileLongPress();
    // Swipe-up indicator
    if (absDy > absDx && dy < -20) {
      setSwipeDirection("up");
      setSwipeProgress(Math.min(Math.abs(dy) / upThreshold, 1));
    } else if (absDx > absDy && absDx > 20) {
      setSwipeDirection(dx > 0 ? "right" : "left");
      setSwipeProgress(Math.min(absDx / threshold, 1));
    }
  }, [clearMobileLongPress, threshold, upThreshold]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearMobileLongPress();
    if (!touchStartRef.current) return;
    const { dx, dy } = mobileDragRef.current;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;
    setSwipeDirection(null);
    setSwipeProgress(0);
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    // Swipe-up → Creator Domain (must be faster than 600ms)
    if (absDy > absDx && dy < -upThreshold && elapsed < 600) {
      onEnterDomain();
      return;
    }
    // Horizontal swipe → next/prev
    if (absDx > absDy && absDx >= threshold) {
      if (dx > 0) onNext(); else onPrev();
    }
  }, [clearMobileLongPress, threshold, upThreshold, onNext, onPrev, onEnterDomain]);

  const onTouchCancel = useCallback(() => {
    clearMobileLongPress();
    touchStartRef.current = null;
    setSwipeDirection(null);
    setSwipeProgress(0);
  }, [clearMobileLongPress]);

  // Cleanup on unmount
  useEffect(() => () => { clearHold(); clearMobileLongPress(); }, [clearHold, clearMobileLongPress]);

  return {
    desktopHandlers: { onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onDoubleClick },
    mobileHandlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    quickViewOpen,
    setQuickViewOpen,
    swipeDirection,
    swipeProgress,
    isDragging,
    dragOffset,
  };
}

// ── ManifestationGestureWrapper ───────────────────────────────────────────────
// Drop-in wrapper that adds gesture navigation to any player art area.

interface ManifestationGestureWrapperProps {
  track: Track | null;
  songId: number | null;
  isLiked: boolean;
  onNext: () => void;
  onPrev: () => void;
  onWitness: () => void;
  /** Whether to enable mobile swipe-up → Creator Domain */
  enableDomainEntry?: boolean;
  /** Whether this is a mobile surface (enables touch handlers) */
  isMobile?: boolean;
  /** Whether this is a desktop surface (enables mouse handlers) */
  isDesktop?: boolean;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ManifestationGestureWrapper({
  track,
  songId,
  isLiked,
  onNext,
  onPrev,
  onWitness,
  enableDomainEntry = true,
  isMobile = false,
  isDesktop = false,
  children,
  className,
  style,
}: ManifestationGestureWrapperProps) {
  const [, navigate] = useLocation();
  const [domainEntryOpen, setDomainEntryOpen] = useState(false);

  // Fetch creator info for domain entry
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: songId! },
    { enabled: !!songId, staleTime: 60_000 }
  );
  const creator = songDetail?.creator as any;

  const handleEnterDomain = useCallback(() => {
    if (!enableDomainEntry || !creator?.id) {
      if (creator?.id) navigate(`/creator/${creator.id}`);
      return;
    }
    setDomainEntryOpen(true);
  }, [enableDomainEntry, creator, navigate]);

  const {
    desktopHandlers,
    mobileHandlers,
    quickViewOpen,
    setQuickViewOpen,
    swipeDirection,
    swipeProgress,
    isDragging,
    dragOffset,
  } = useManifestationGesture({
    onNext,
    onPrev,
    onWitness,
    onEnterDomain: handleEnterDomain,
    disabled: !track,
  });

  if (!track) return <div className={className} style={style}>{children}</div>;

  const gestureProps = {
    ...(isDesktop ? desktopHandlers : {}),
    ...(isMobile ? mobileHandlers : {}),
  };

  return (
    <>
      <div
        className={className}
        style={{
          ...style,
          cursor: isDesktop ? "grab" : undefined,
          userSelect: "none",
          transform: isDragging && dragOffset !== 0
            ? `translateX(${Math.sign(dragOffset) * Math.min(Math.abs(dragOffset), 40)}px)`
            : undefined,
          transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        {...gestureProps}
      >
        {children}
        {/* Swipe indicator overlay */}
        <SwipeIndicator direction={swipeDirection} progress={swipeProgress} />
      </div>

      {/* Quick View panel */}
      {quickViewOpen && songId && (
        <ManifestationQuickView
          track={track}
          songId={songId}
          onClose={() => setQuickViewOpen(false)}
          onWitness={() => { onWitness(); setQuickViewOpen(false); }}
          isLiked={isLiked}
        />
      )}

      {/* Creator Domain entry animation */}
      {domainEntryOpen && creator?.id && (
        <CreatorDomainEntry
          track={track}
          creatorId={creator.id}
          creatorHandle={creator.artistHandle || creator.name}
          creatorAvatar={creator.profilePhotoUrl}
          onDone={() => setDomainEntryOpen(false)}
        />
      )}
    </>
  );
}
