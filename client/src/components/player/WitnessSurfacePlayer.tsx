/* ================================================================
   LIVING NEXUS — WitnessSurfacePlayer (WSP)
   The persistent top-layer interface representing the active work.

   Three modes:
     surface  — 60px strip anchored under navbar, always visible
     expanded — expands downward: controls → artwork → identity → actions → waveform
     floating — detached draggable widget, edge-snapping, localStorage position

   Design rule:
     The artwork is the primary focus.
     Controls are secondary.
     The WSP represents the active testimony, not just playback.
================================================================ */
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Share2,
  MessageCircle,
  Coins,
  ShieldCheck,
  ChevronDown,
  Maximize2,
  Minimize2,
  ExternalLink,
  GripHorizontal,
  X,
  Volume2,
  VolumeX,
  Zap,
  Target,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useWSP } from "@/contexts/WSPContext";
import { useKeeperAttrs } from "@/contexts/KeeperAttrsContext";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

/* ── Helpers ── */
function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ── Waveform bars (decorative) ── */
function WaveformBars({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-8">
      {Array.from({ length: 32 }).map((_, i) => {
        const height = 20 + Math.sin(i * 0.7) * 12 + Math.cos(i * 1.3) * 8;
        return (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: 3,
              height: `${height}px`,
              background: isPlaying
                ? `rgba(255,215,0,${0.3 + Math.abs(Math.sin(i * 0.5)) * 0.5})`
                : "rgba(255,255,255,0.12)",
              animation: isPlaying ? `wsp-bar-${(i % 4) + 1} 0.8s ease-in-out infinite` : "none",
              animationDelay: `${(i % 8) * 0.1}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Mobile-only hook ── */
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/* ── Surface Bar — DISABLED (Phase 164: single bottom-sheet player only) ── */
/* The GlobalPlayer at the bottom is the sole mobile player. WSP surface bar is removed
   to eliminate duplication. The WSP expanded panel is also disabled (see ExpandedPanel guard). */
function SurfaceBar() {
  return null;
}

/* ── Original SurfaceBar (dead code removed to fix TS errors) ── */
function _SurfaceBar_DISABLED() {
  const isMobile = useIsMobile();
  const { state, togglePlay, nextTrack, prevTrack, seek } = usePlayer();
  const { expand, float } = useWSP();
  const [, navigate] = useLocation();

  const track = state.tracks[state.currentIdx];
  if (!isMobile) return null;
  if (!track) return null;

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(state.duration * ratio);
  };

  return (
    <div
      className="wsp-surface-bar md:hidden"
      style={{
        position: "fixed",
        top: "var(--wsp-top, 56px)",
        left: "var(--wsp-left, 0px)",
        right: 0,
        height: 60,
        zIndex: 350,
        background: "rgba(14,11,7,0.97)",
        borderBottom: "1px solid rgba(255,215,0,0.12)",
        borderLeft: "3px solid rgba(255,215,0,0.5)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Progress track */}
      <div
        className="cursor-pointer"
        style={{ height: 2, background: "rgba(255,255,255,0.08)", flexShrink: 0 }}
        onClick={handleSeek}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, rgba(255,215,0,0.9), rgba(255,165,0,0.7))",
            transition: "width 0.25s linear",
          }}
        />
      </div>

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 flex-1 min-w-0">
        {/* Artwork — tap to expand */}
        <button
          onClick={expand}
          className="shrink-0 rounded overflow-hidden"
          style={{ width: 40, height: 40, background: "rgba(255,215,0,0.08)" }}
          aria-label="Expand player"
        >
          {track.artUrl ? (
            <img
              src={track.artUrl}
              alt={track.title}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%`,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">
              {track.emoji || "🎵"}
            </div>
          )}
        </button>

        {/* Title + artist — tap to expand */}
        <button
          onClick={expand}
          className="flex-1 min-w-0 text-left"
          aria-label="Expand player"
        >
          <div
            className="text-sm font-medium truncate"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            {track.title}
          </div>
          <div
            className="text-xs truncate"
            style={{ color: "rgba(255,215,0,0.6)" }}
          >
            {track.artist}
          </div>
        </button>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => prevTrack()}
            className="p-2 rounded-full transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)" }}
            aria-label="Previous"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={togglePlay}
            className="flex items-center justify-center rounded-full transition-all"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,215,0,0.15)",
              border: "1px solid rgba(255,215,0,0.3)",
              color: "rgba(255,215,0,0.9)",
            }}
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button
            onClick={() => nextTrack()}
            className="p-2 rounded-full transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)" }}
            aria-label="Next"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Provenance pulse — 3 animated dots when track is witnessed */}
        {track.witnessId && (
          <div
            className="shrink-0 hidden sm:flex items-center gap-[3px]"
            title={`Witnessed: ${track.witnessId.slice(0, 16)}…`}
          >
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "rgba(74,222,128,0.7)",
                  animation: "wsp-provenance-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                  animationDelay: `${i * 220}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Pop-out to floating */}
        <button
          onClick={float}
          className="p-2 rounded-full transition-all hover:bg-white/5 shrink-0 hidden sm:flex"
          style={{ color: "rgba(255,255,255,0.3)" }}
          aria-label="Float player"
        >
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Expanded Panel (expands downward from surface bar) ── */
function ExpandedPanel() {
  const {
    state,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    toggleLike,
    incrementShare,
  } = usePlayer();
  const { collapse, float } = useWSP();
  const { activeMode } = useKeeperAttrs();
  const [, navigate] = useLocation();
  const [tiltStyle, setTiltStyle] = useState({});
  const artRef = useRef<HTMLDivElement>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);

  /* Inline Interaction Bar state */
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [selectedTipAmt, setSelectedTipAmt] = useState(10);

  const track = state.tracks[state.currentIdx];

  /* Activation data — only fetch when track is loaded */
  const songIdNum = track ? parseInt(track.id, 10) : 0;
  const { data: activation } = trpc.activation.getForSong.useQuery(
    { songId: songIdNum },
    { enabled: !!track && songIdNum > 0 }
  );

  /* Inline interaction mutations */
  const addComment = trpc.comments.add.useMutation({
    onSuccess: () => { setCommentText(""); setShowComment(false); },
  });
  const createTipCheckout = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (data) => { if (data?.url) window.location.href = data.url; },
  });
  const toggleReaction = trpc.songs.toggleReaction.useMutation();

  /* Artwork reactive glow — brightens on hover/tilt interaction */
  const [artGlowActive, setArtGlowActive] = useState(false);

  /* Phase 164: WSP expanded panel disabled — GlobalPlayer handles ALL expanded views */
  const isMobileExpanded = useIsMobile();
  void isMobileExpanded;

  if (!track) return null;
  // Always return null — GlobalPlayer is the single player on both mobile and desktop
  return null;
}

/* ── Floating Widget (detached, draggable) ── */
function FloatingWidget() {
  const { state, togglePlay } = usePlayer();
  const { floatingPosition, setFloatingPosition, dock } = useWSP();
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState(floatingPosition);

  const track = state.tracks[state.currentIdx];
  if (!track) return null;

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  /* ── Pointer drag ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    /* Snap to nearest edge */
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const widgetW = 200;
    const widgetH = 72;
    let finalX = pos.x;
    let finalY = clamp(pos.y, 60, sh - widgetH - 20);

    /* Snap left or right */
    if (pos.x + widgetW / 2 < sw / 2) {
      finalX = 12;
    } else {
      finalX = sw - widgetW - 12;
    }

    /* If dragged to top 80px → dock */
    if (pos.y < 80) {
      dock();
      return;
    }

    const snapped = { x: finalX, y: finalY };
    setPos(snapped);
    setFloatingPosition(snapped);
  }, [pos, dock, setFloatingPosition]);

  return (
    <div
      ref={dragRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 200,
        zIndex: 9999,
        background: "rgba(12,10,6,0.96)",
        border: "1px solid rgba(255,215,0,0.2)",
        borderRadius: 12,
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* Progress strip */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: "12px 12px 0 0" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "rgba(255,215,0,0.8)",
            borderRadius: "12px 12px 0 0",
            transition: "width 0.25s linear",
          }}
        />
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        {/* Drag handle */}
        <GripHorizontal size={12} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />

        {/* Artwork */}
        <div
          className="rounded overflow-hidden shrink-0"
          style={{ width: 32, height: 32, background: "rgba(255,215,0,0.08)" }}
        >
          {track.artUrl ? (
            <img src={track.artUrl} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm">
              {track.emoji || "🎵"}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
            {track.title}
          </div>
          <div className="text-xs truncate" style={{ color: "rgba(255,215,0,0.5)", fontSize: 10 }}>
            {track.artist}
          </div>
        </div>

        {/* Play/pause */}
        <button
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,215,0,0.12)",
            color: "rgba(255,215,0,0.9)",
          }}
          aria-label={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
        </button>

        {/* Dock */}
        <button
          onClick={(e) => { e.stopPropagation(); dock(); }}
          className="shrink-0 flex items-center justify-center rounded-full hover:bg-white/5"
          style={{ width: 24, height: 24, color: "rgba(255,255,255,0.3)" }}
          aria-label="Dock player"
        >
          <Minimize2 size={10} />
        </button>
      </div>
    </div>
  );
}

/* ── CSS animations injected once ── */
const WSP_STYLE = `
  @keyframes wsp-bar-1 { 0%,100%{height:8px} 50%{height:24px} }
  @keyframes wsp-bar-2 { 0%,100%{height:16px} 50%{height:8px} }
  @keyframes wsp-bar-3 { 0%,100%{height:12px} 50%{height:28px} }
  @keyframes wsp-bar-4 { 0%,100%{height:20px} 50%{height:10px} }
  @keyframes wsp-provenance-pulse {
    0%,100% { opacity: 0.3; transform: scale(0.85); }
    50% { opacity: 1; transform: scale(1.15); }
  }
`;

/* ── Root WSP component ── */
export default function WitnessSurfacePlayer() {
  const { state } = usePlayer();
  const { mode, setHasSurface } = useWSP();

  const hasTrack = state.tracks.length > 0 && state.currentIdx >= 0;

  useEffect(() => {
    setHasSurface(hasTrack);
  }, [hasTrack, setHasSurface]);

  if (!hasTrack) return null;

  return (
    <>
      <style>{WSP_STYLE}</style>

      {/* Surface bar — always visible when track is loaded and not floating */}
      {mode !== "floating" && <SurfaceBar />}

      {/* Expanded panel — slides down from surface bar */}
      {mode === "expanded" && <ExpandedPanel />}

      {/* Floating widget — detached */}
      {mode === "floating" && <FloatingWidget />}
    </>
  );
}
