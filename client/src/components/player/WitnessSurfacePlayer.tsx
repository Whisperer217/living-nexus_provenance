/* ================================================================
   LIVING NEXUS — WitnessSurfacePlayer (WSP)
   The persistent floating manifestation dock.

   Three modes:
     surface  — compact glass capsule floating above mobile nav bar
     expanded — full-viewport atmospheric ceremonial takeover
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
  BookOpen,
  Map,
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
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(360px, calc(100vw - 24px))",
        height: 64,
        zIndex: 350,
        background: "rgba(10,8,5,0.94)",
        border: "1px solid rgba(255,215,0,0.22)",
        borderRadius: 32,
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,215,0,0.08), inset 0 1px 0 rgba(255,215,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Progress track — thin gold line at top of capsule */}
      <div
        className="cursor-pointer"
        style={{ height: 2, background: "rgba(255,255,255,0.06)", flexShrink: 0 }}
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
      <div className="flex items-center gap-2 px-3 flex-1 min-w-0">
        {/* Artwork — tap to expand */}
        <button
          onClick={expand}
          className="shrink-0 rounded-full overflow-hidden"
          style={{ width: 38, height: 38, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.15)" }}
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
            className="text-xs font-medium truncate"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            {track.title}
          </div>
          <div
            className="truncate"
            style={{ color: "rgba(255,215,0,0.6)", fontSize: 10 }}
          >
            {track.artist}
          </div>
        </button>

        {/* Manifestation CTA — content-type specific */}
        <ManifestationCTA contentType={track.contentType} trackId={track.id} size="xs" />

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="flex items-center justify-center rounded-full transition-all shrink-0"
          style={{
            width: 34,
            height: 34,
            background: "rgba(255,215,0,0.15)",
            border: "1px solid rgba(255,215,0,0.3)",
            color: "rgba(255,215,0,0.9)",
          }}
          aria-label={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>

        {/* Provenance pulse — 3 animated dots when track is witnessed */}
        {track.witnessId && (
          <div
            className="shrink-0 flex items-center gap-[3px]"
            title={`Witnessed: ${track.witnessId.slice(0, 16)}…`}
          >
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "rgba(74,222,128,0.7)",
                  animation: "wsp-provenance-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                  animationDelay: `${i * 220}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Expanded Panel (full-viewport atmospheric takeover) ── */
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

/* ── Manifestation CTA button — content-type aware ── */
function ManifestationCTA({
  contentType,
  trackId,
  size = "sm",
}: {
  contentType?: string;
  trackId: string;
  size?: "sm" | "xs";
}) {
  const [, navigate] = useLocation();
  if (contentType === "comic" || contentType === "manuscript") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/book/${trackId}`); }}
        className="flex items-center gap-1 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shrink-0"
        style={{
          padding: size === "xs" ? "3px 10px" : "4px 12px",
          fontSize: size === "xs" ? 10 : 11,
          background: "rgba(255,215,0,0.18)",
          border: "1px solid rgba(255,215,0,0.4)",
          color: "rgba(255,215,0,0.95)",
          letterSpacing: "0.04em",
        }}
        aria-label="Read Now"
      >
        <BookOpen size={size === "xs" ? 9 : 10} />
        READ NOW
      </button>
    );
  }
  if (contentType === "guide") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/guide/${trackId}`); }}
        className="flex items-center gap-1 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shrink-0"
        style={{
          padding: size === "xs" ? "3px 10px" : "4px 12px",
          fontSize: size === "xs" ? 10 : 11,
          background: "rgba(255,215,0,0.18)",
          border: "1px solid rgba(255,215,0,0.4)",
          color: "rgba(255,215,0,0.95)",
          letterSpacing: "0.04em",
        }}
        aria-label="Enter Guide"
      >
        <Map size={size === "xs" ? 9 : 10} />
        ENTER GUIDE
      </button>
    );
  }
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

      {/* Surface bar — compact floating glass capsule when track is loaded and not floating */}
      {mode !== "floating" && <SurfaceBar />}

      {/* Expanded panel — full-viewport atmospheric takeover */}
      {mode === "expanded" && <ExpandedPanel />}

      {/* Floating widget — detached */}
      {mode === "floating" && <FloatingWidget />}
    </>
  );
}
