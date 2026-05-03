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
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useWSP } from "@/contexts/WSPContext";
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

/* ── Surface Bar (60px strip) ── */
function SurfaceBar() {
  const { state, togglePlay, nextTrack, prevTrack, seek, audioRef } = usePlayer();
  const { expand, float } = useWSP();
  const [, navigate] = useLocation();

  const track = state.tracks[state.currentIdx];
  if (!track) return null;

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(state.duration * ratio);
  };

  return (
    <div
      className="wsp-surface-bar"
      style={{
        position: "fixed",
        top: "var(--wsp-top, 56px)",
        left: "var(--wsp-left, 0px)",
        right: 0,
        height: 60,
        zIndex: 350,
        background: "rgba(12,10,6,0.96)",
        borderBottom: "1px solid rgba(255,215,0,0.12)",
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
  const [, navigate] = useLocation();
  const [tiltStyle, setTiltStyle] = useState({});
  const artRef = useRef<HTMLDivElement>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);

  const track = state.tracks[state.currentIdx];
  if (!track) return null;

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const isLiked = state.liked.has(track.id);

  /* Auto-dim overlay after 3s */
  const resetOverlayTimer = useCallback(() => {
    setOverlayVisible(true);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setOverlayVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetOverlayTimer();
    return () => { if (overlayTimer.current) clearTimeout(overlayTimer.current); };
  }, []);

  /* Tilt on mouse move */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!artRef.current) return;
    const rect = artRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTiltStyle({
      transform: `perspective(600px) rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg) scale(1.02)`,
      transition: "transform 0.1s ease",
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({ transform: "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)", transition: "transform 0.4s ease" });
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(state.duration * ratio);
    resetOverlayTimer();
  };

  /* Swipe down to collapse */
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 80) collapse();
  };

  /* ESC to collapse */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") collapse(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapse]);

  return (
    <div
      className="wsp-expanded"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseMove={resetOverlayTimer}
      onClick={resetOverlayTimer}
      style={{
        position: "fixed",
        top: "calc(var(--wsp-top, 56px) + 60px)",
        left: "var(--wsp-left, 0px)",
        right: 0,
        bottom: 0,
        zIndex: 340,
        background: "rgba(8,7,4,0.98)",
        backdropFilter: "blur(24px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Collapse handle */}
      <div className="flex items-center justify-between w-full px-4 pt-3 pb-1 shrink-0">
        <button
          onClick={collapse}
          className="flex items-center gap-1 text-xs transition-all hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.4)" }}
          aria-label="Collapse player"
        >
          <ChevronDown size={16} />
          <span>Collapse</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={float}
            className="p-2 rounded-full transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.3)" }}
            aria-label="Float player"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* 1. Controls row */}
      <div
        className="flex items-center gap-4 px-4 py-2 shrink-0"
        style={{
          opacity: overlayVisible ? 1 : 0.15,
          transition: "opacity 0.6s ease",
        }}
      >
        <button
          onClick={() => prevTrack()}
          className="p-3 rounded-full transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.6)" }}
          aria-label="Previous"
        >
          <SkipBack size={20} />
        </button>
        <button
          onClick={togglePlay}
          className="flex items-center justify-center rounded-full transition-all"
          style={{
            width: 56,
            height: 56,
            background: "rgba(255,215,0,0.15)",
            border: "1px solid rgba(255,215,0,0.4)",
            color: "rgba(255,215,0,0.95)",
          }}
          aria-label={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying
            ? <Pause size={24} fill="currentColor" />
            : <Play size={24} fill="currentColor" />}
        </button>
        <button
          onClick={() => nextTrack()}
          className="p-3 rounded-full transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.6)" }}
          aria-label="Next"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* 2. HERO artwork */}
      <div
        ref={artRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="rounded-xl overflow-hidden cursor-pointer shrink-0"
        style={{
          width: "min(65vw, 320px)",
          aspectRatio: "1 / 1",
          background: "rgba(255,215,0,0.06)",
          border: "1px solid rgba(255,215,0,0.15)",
          ...tiltStyle,
        }}
        onClick={() => navigate(`/song/${track.id}`)}
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
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {track.emoji || "🎵"}
          </div>
        )}
      </div>

      {/* 3. Song identity */}
      <div className="text-center px-6 mt-4 shrink-0">
        <h2
          className="font-display text-xl mb-1 truncate max-w-xs"
          style={{ color: "rgba(255,255,255,0.95)" }}
        >
          {track.title}
        </h2>
        <p className="text-sm truncate" style={{ color: "rgba(255,215,0,0.7)" }}>
          {track.artist}
        </p>
        {track.witnessId && (
          <div
            className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs"
            style={{
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.2)",
              color: "rgba(255,215,0,0.6)",
            }}
          >
            <ShieldCheck size={10} />
            <span className="font-mono">{track.witnessId.slice(0, 20)}…</span>
          </div>
        )}
      </div>

      {/* Seek bar */}
      <div className="w-full px-6 mt-4 shrink-0">
        <div
          className="relative h-1 rounded-full cursor-pointer"
          style={{ background: "rgba(255,255,255,0.1)" }}
          onClick={handleSeek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, rgba(255,215,0,0.9), rgba(255,165,0,0.7))",
              transition: "width 0.25s linear",
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span>{fmtTime(state.currentTime)}</span>
          <span>{fmtTime(state.duration)}</span>
        </div>
      </div>

      {/* 4. Actions row */}
      <div className="flex items-center justify-center gap-6 mt-4 px-4 shrink-0">
        <button
          onClick={() => toggleLike(track.id)}
          className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          style={{ color: isLiked ? "rgba(255,80,80,0.9)" : "rgba(255,255,255,0.4)" }}
          aria-label="Like"
        >
          <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
          <span className="text-xs">Like</span>
        </button>
        <button
          onClick={() => navigate(`/song/${track.id}#comments`)}
          className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          style={{ color: "rgba(255,255,255,0.4)" }}
          aria-label="Comment"
        >
          <MessageCircle size={20} />
          <span className="text-xs">Comment</span>
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/song/${track.id}`);
            incrementShare(track.id);
          }}
          className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          style={{ color: "rgba(255,255,255,0.4)" }}
          aria-label="Share"
        >
          <Share2 size={20} />
          <span className="text-xs">Share</span>
        </button>
        {track.tipsEnabled && (
          <button
            onClick={() => navigate(`/song/${track.id}#tip`)}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
            style={{ color: "rgba(255,215,0,0.6)" }}
            aria-label="Tip"
          >
            <Coins size={20} />
            <span className="text-xs">Tip</span>
          </button>
        )}
        {track.witnessId && (
          <button
            onClick={() => navigate(`/song/${track.id}`)}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
            style={{ color: "rgba(255,215,0,0.6)" }}
            aria-label="Verify"
          >
            <ShieldCheck size={20} />
            <span className="text-xs">Verify</span>
          </button>
        )}
      </div>

      {/* 5. Waveform + glow */}
      <div className="mt-6 mb-4 px-6 w-full flex justify-center shrink-0">
        <WaveformBars isPlaying={state.isPlaying} />
      </div>

      {/* Ambient glow behind artwork */}
      {track.artUrl && (
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "50vw",
            height: "50vw",
            maxWidth: 400,
            maxHeight: 400,
            background: `radial-gradient(ellipse, rgba(255,215,0,0.08) 0%, transparent 70%)`,
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
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
