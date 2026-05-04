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

/* ── Surface Bar (60px strip — mobile only) ── */
function SurfaceBar() {
  const isMobile = useIsMobile();
  const { state, togglePlay, nextTrack, prevTrack, seek } = usePlayer();
  const { expand, float } = useWSP();
  const [, navigate] = useLocation();

  const track = state.tracks[state.currentIdx];

  // Must be after all hooks — Rules of Hooks
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
      transform: `perspective(700px) rotateY(${dx * 10}deg) rotateX(${-dy * 10}deg) scale(1.03)`,
      transition: "transform 0.08s ease",
    });
    setArtGlowActive(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({ transform: "perspective(700px) rotateY(0deg) rotateX(0deg) scale(1)", transition: "transform 0.5s ease" });
    setArtGlowActive(false);
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
      {/* ── Constrained surface container ── */}
      <div style={{ width: "100%", maxWidth: 1100, padding: "0 16px", display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box", borderRadius: 16, boxShadow: "0 0 40px rgba(255,215,0,0.08)" }}>
      {/* TOP ROW: Collapse + Back/Play/Next + Float — all controls in one strip */}
      <div
        className="flex items-center justify-between w-full px-4 pt-3 pb-2 shrink-0"
        style={{
          opacity: overlayVisible ? 1 : 0.2,
          transition: "opacity 0.6s ease",
        }}
      >
        {/* Left: collapse */}
        <button
          onClick={collapse}
          className="flex items-center gap-1 text-xs transition-all hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.4)" }}
          aria-label="Collapse player"
        >
          <ChevronDown size={16} />
          <span className="hidden sm:inline">Collapse</span>
        </button>

        {/* Center: transport controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => prevTrack()}
            className="p-2 rounded-full transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.55)" }}
            aria-label="Previous"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={togglePlay}
            className="flex items-center justify-center rounded-full transition-all"
            style={{
              width: 48,
              height: 48,
              background: "rgba(255,215,0,0.15)",
              border: "1px solid rgba(255,215,0,0.4)",
              color: "rgba(255,215,0,0.95)",
            }}
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying
              ? <Pause size={20} fill="currentColor" />
              : <Play size={20} fill="currentColor" />}
          </button>
          <button
            onClick={() => nextTrack()}
            className="p-2 rounded-full transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.55)" }}
            aria-label="Next"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Right: float */}
        <button
          onClick={float}
          className="p-2 rounded-full transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.3)" }}
          aria-label="Float player"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* CORE: HERO artwork — primary focal anchor */}
      <div className="relative shrink-0" style={{ marginTop: 8 }}>
        {/* Reactive ambient glow — expands on hover/tilt */}
        <div
          style={{
            position: "absolute",
            inset: "-24px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,215,0,0.18) 0%, transparent 70%)",
            opacity: artGlowActive ? 1 : state.isPlaying ? 0.45 : 0.15,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          ref={artRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="rounded-2xl overflow-hidden cursor-pointer"
          style={{
            width: "min(80vw, 420px)",
            aspectRatio: "1 / 1",
            background: "rgba(255,215,0,0.06)",
            border: "1px solid rgba(255,215,0,0.2)",
            position: "relative",
            zIndex: 1,
            boxShadow: artGlowActive
              ? "0 0 48px rgba(255,215,0,0.25), 0 0 96px rgba(255,165,0,0.12)"
              : "0 0 24px rgba(255,215,0,0.08)",
            transition: "box-shadow 0.4s ease",
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
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {track.emoji || "🎵"}
            </div>
          )}
        </div>
      </div>

      {/* Seek bar — thin, minimal, directly below artwork */}
      <div className="w-full px-8 mt-4 shrink-0">
        <div
          className="relative rounded-full cursor-pointer"
          style={{ height: 2, background: "rgba(255,255,255,0.08)" }}
          onClick={handleSeek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, rgba(255,215,0,0.85), rgba(255,165,0,0.6))",
              transition: "width 0.25s linear",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
          <span>{fmtTime(state.currentTime)}</span>
          <span>{fmtTime(state.duration)}</span>
        </div>
      </div>

      {/* ── INLINE INTERACTION BAR — directly below seek bar ── */}
      <div className="w-full mt-5 shrink-0" style={{ maxWidth: 480 }}>
        {/* Main action row */}
        <div className="flex items-center justify-center gap-6 py-2">
          {/* Like */}
          <button
            onClick={() => toggleLike(track.id)}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
            style={{ color: isLiked ? "rgba(255,80,80,0.9)" : "rgba(255,255,255,0.45)", minWidth: 44, minHeight: 44, justifyContent: "center" }}
            aria-label="Like"
          >
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
          </button>

          {/* Comment toggle */}
          <button
            onClick={() => setShowComment(v => !v)}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
            style={{ color: showComment ? "rgba(255,215,0,0.8)" : "rgba(255,255,255,0.45)", minWidth: 44, minHeight: 44, justifyContent: "center" }}
            aria-label="Comment"
          >
            <MessageCircle size={20} fill={showComment ? "currentColor" : "none"} />
          </button>

          {/* Emoji quick react — 5 presets */}
          {["fire", "love", "grateful", "magic", "vibe"].map((type, i) => {
            const EMOJIS: Record<string, string> = { fire: "🔥", love: "❤️", grateful: "🙏", magic: "✨", vibe: "🎵" };
            return (
              <button
                key={type}
                onClick={() => songIdNum > 0 && toggleReaction.mutate({ songId: songIdNum, type })}
                className="transition-all hover:scale-125 active:scale-95"
                style={{ fontSize: 20, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.75 }}
                aria-label={type}
              >
                {EMOJIS[type]}
              </button>
            );
          })}

          {/* Tip button */}
          {track.tipsEnabled && (
            <button
              onClick={() => setShowTip(v => !v)}
              className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
              style={{ color: showTip ? "rgba(255,215,0,0.9)" : "rgba(255,215,0,0.55)", minWidth: 44, minHeight: 44, justifyContent: "center" }}
              aria-label="Pay It Forward"
            >
              <Coins size={20} />
            </button>
          )}

          {/* Share */}
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/song/${track.id}`);
              incrementShare(track.id);
            }}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
            style={{ color: "rgba(255,255,255,0.45)", minWidth: 44, minHeight: 44, justifyContent: "center" }}
            aria-label="Share"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Inline comment input */}
        {showComment && (
          <div className="mt-2 flex gap-2 px-2">
            <input
              autoFocus
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && commentText.trim() && songIdNum > 0) {
                  addComment.mutate({ songId: songIdNum, content: commentText.trim() });
                }
                if (e.key === "Escape") setShowComment(false);
              }}
              placeholder="Add a witness..."
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,215,0,0.2)",
                color: "rgba(255,255,255,0.85)",
              }}
            />
            <button
              onClick={() => commentText.trim() && songIdNum > 0 && addComment.mutate({ songId: songIdNum, content: commentText.trim() })}
              disabled={addComment.isPending || !commentText.trim()}
              className="px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: "rgba(255,215,0,0.15)", color: "rgba(255,215,0,0.9)", border: "1px solid rgba(255,215,0,0.3)" }}
            >
              {addComment.isPending ? "..." : "Send"}
            </button>
          </div>
        )}

        {/* Inline tip presets */}
        {showTip && track.tipsEnabled && (
          <div className="mt-2 flex items-center gap-2 px-2 justify-center">
            {[5, 10, 25].map(amt => (
              <button
                key={amt}
                onClick={() => {
                  setSelectedTipAmt(amt);
                  createTipCheckout.mutate({ songId: songIdNum, amountCents: amt * 100, origin: window.location.origin });
                }}
                disabled={createTipCheckout.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  background: selectedTipAmt === amt ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.06)",
                  color: selectedTipAmt === amt ? "rgba(255,215,0,0.95)" : "rgba(255,255,255,0.6)",
                  border: selectedTipAmt === amt ? "1px solid rgba(255,215,0,0.5)" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                ${amt}
              </button>
            ))}
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Pay It Forward</span>
          </div>
        )}
      </div>

      {/* Song identity — below interaction bar */}
      <div className="text-center px-6 mt-3 shrink-0">
        <h2
          className="font-display text-xl mb-0.5 truncate max-w-xs"
          style={{ color: "rgba(255,255,255,0.95)" }}
        >
          {track.title}
        </h2>
        <p className="text-sm truncate" style={{ color: "rgba(255,215,0,0.7)" }}>
          {track.artist}
        </p>
        {track.witnessId && (
          <div
            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-xs"
            style={{
              background: "rgba(255,215,0,0.07)",
              border: "1px solid rgba(255,215,0,0.18)",
              color: "rgba(255,215,0,0.55)",
            }}
          >
            <ShieldCheck size={9} />
            <span className="font-mono">{track.witnessId.slice(0, 20)}…</span>
          </div>
        )}
      </div>

      {/* 5. Waveform + glow */}
      <div className="mt-6 px-6 w-full flex justify-center shrink-0">
        <WaveformBars isPlaying={state.isPlaying} />
      </div>

      {/* 6. Activation stages overlay — shown when activation is enabled */}
      {activation?.activationEnabled && activation.stages.length > 0 && (() => {
        const totalGoal = activation.stages.reduce((s, st) => s + st.goalCents, 0);
        const funded = activation.totalFundingCents;
        const pct = totalGoal > 0 ? Math.min(100, (funded / totalGoal) * 100) : 0;
        const currentStageIdx = activation.stages.findIndex(st => !st.reachedAt);
        const currentStage = currentStageIdx >= 0 ? activation.stages[currentStageIdx] : activation.stages[activation.stages.length - 1];
        return (
          <div
            className="w-full px-6 mt-4 shrink-0"
            onClick={() => navigate(`/song/${track.id}`)}
            style={{ cursor: "pointer" }}
          >
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,215,0,0.04)",
                border: "1px solid rgba(255,215,0,0.12)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Target size={11} style={{ color: "rgba(255,215,0,0.6)" }} />
                  <span className="text-xs font-medium" style={{ color: "rgba(255,215,0,0.7)" }}>
                    {currentStage?.label ?? "Activation"}
                  </span>
                </div>
                <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                  ${(funded / 100).toFixed(0)} / ${(totalGoal / 100).toFixed(0)}
                </span>
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, rgba(255,215,0,0.8), rgba(255,165,0,0.6))",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                {activation.stages.map((st, i) => (
                  <div
                    key={st.id}
                    className="flex flex-col items-center gap-0.5"
                    style={{ flex: 1 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: st.reachedAt
                          ? "rgba(74,222,128,0.8)"
                          : i === currentStageIdx
                          ? "rgba(255,215,0,0.6)"
                          : "rgba(255,255,255,0.15)",
                        border: i === currentStageIdx ? "1px solid rgba(255,215,0,0.5)" : "none",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7. Keeper sync context */}
      <div className="flex items-center justify-center gap-2 mt-3 mb-4 shrink-0">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{
            background: "rgba(255,215,0,0.05)",
            border: "1px solid rgba(255,215,0,0.1)",
          }}
        >
          <Zap size={10} style={{ color: "rgba(255,215,0,0.5)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Keeper
          </span>
          <span className="text-xs font-medium" style={{ color: "rgba(255,215,0,0.6)" }}>
            {activeMode}
          </span>
        </div>
      </div>

      </div>{/* end constrained container */}

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
