/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — GlobalPlayer
   v3.0 — Draggable floating overlay · 3 snap zones · Glass backdrop
   Architecture: Gesture Layer → Player UI Layer → Glass Backdrop → App Content
   The player is a persistent layer that lives above the application
   but does not block it.
═══════════════════════════════════════════════════════════════════ */

import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useFrequencyGlow } from "@/hooks/useFrequencyGlow";
import { useWaveformVisualizer } from "@/hooks/useWaveformVisualizer";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart,
  ChevronDown, ChevronUp, Share2, Download,
  MoreHorizontal, ExternalLink, List, Waves,
  FolderPlus, Shield, GripHorizontal, Music2,
  DollarSign,
} from "lucide-react";
import { AddToCollectionModal } from "@/components/AddToCollectionModal";
import { useLocation } from "wouter";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import PlayerTipModal from "./PlayerTipModal";

/* ── Gold design tokens ─────────────────────────────────────────── */
const GOLD = "#D4AF37";
const GOLD_HL = "#F5E6B3";
const GOLD_GLOW = "rgba(212,175,55,0.6)";
const GLASS_BG = "rgba(0,0,0,0.82)";
const GLASS_BLUR = "blur(16px)";
const GOLD_SHADOW = `0 0 18px ${GOLD_GLOW}, 0 0 32px rgba(212,175,55,0.25), inset 0 0 10px rgba(212,175,55,0.12)`;
const GOLD_BORDER = `1px solid rgba(212,175,55,0.45)`;

/* ── Snap zone heights ──────────────────────────────────────────── */
const SNAP = {
  MINI: 72,       // compact strip — always visible
  FLOAT: 140,     // draggable default
  EXPANDED: 0,    // full height (computed at runtime)
} as const;
type SnapZone = "MINI" | "FLOAT" | "EXPANDED";

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

/* ── WID badge ──────────────────────────────────────────────────── */
function WidBadge({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all hover:opacity-80"
      style={{
        background: "rgba(212,175,55,0.12)",
        border: `1px solid ${GOLD}`,
        color: GOLD,
        fontFamily: "'Cinzel', serif",
      }}
      title="Witnessed on Living Nexus — View provenance"
    >
      <Shield size={8} />
      WID
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function GlobalPlayer() {
  const {
    state, audioRef, allTracks, togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute, setVolume, seek, playTrack,
  } = usePlayer();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  /* ── Snap zone state ── */
  const [zone, setZone] = useState<SnapZone>("MINI");

  /* ── Drag state ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(SNAP.MINI);
  const isDragging = useRef(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null); // null = use snap zone

  /* ── Modals ── */
  const [tipOpen, setTipOpen] = useState(false);
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ bottom: number; right: number } | null>(null);
  const [volumePopupPos, setVolumePopupPos] = useState<{ bottom: number; right: number } | null>(null);
  const contextMenuBtnRef = useRef<HTMLButtonElement>(null);
  const contextMenuPortalRef = useRef<HTMLDivElement>(null);
  const volumeBtnRef = useRef<HTMLButtonElement>(null);
  const volumePopupRef = useRef<HTMLDivElement>(null);

  /* ── Playback speed ── */
  const [playbackRate, setPlaybackRate] = useState(1);
  const SPEED_CYCLE = [1, 1.5, 2, 0.75];
  const cycleSpeed = useCallback(() => {
    setPlaybackRate(r => {
      const idx = SPEED_CYCLE.indexOf(r);
      return SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    });
  }, []);
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioRef]);

  /* ── Frequency glow ── */
  const [glowEnabled, setGlowEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("ln-player-glow") === "on"; } catch { return false; }
  });
  const toggleGlow = () => setGlowEnabled(v => {
    const next = !v;
    try { localStorage.setItem("ln-player-glow", next ? "on" : "off"); } catch {}
    return next;
  });
  const { glowShadow } = useFrequencyGlow(audioRef, glowEnabled, state.isPlaying);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useWaveformVisualizer(audioRef, waveCanvasRef, glowEnabled, state.isPlaying);

  /* ── Track data ── */
  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId!), staleTime: 60_000 }
  );
  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;

  /* ── Like state ── */
  const { data: likeStatusData, refetch: refetchLikeStatus } = trpc.songs.getLikeStatus.useQuery(
    { songId: currentSongId! },
    { enabled: !!user && !!currentSongId && !isNaN(currentSongId!) }
  );
  const isLiked = !!likeStatusData?.liked;
  const toggleLikeMutation = trpc.songs.toggleLike.useMutation({
    onSuccess: () => refetchLikeStatus(),
  });

  /* ── Progress ── */
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);

  /* ── Navigation ── */
  const goToSong = useCallback(() => { if (currentSongId) navigate(`/song/${currentSongId}`); }, [currentSongId, navigate]);
  const goToCreator = useCallback(() => {
    if (songDetail?.creator?.id) navigate(`/creator/${songDetail.creator.id}`);
    else if (currentTrack?.artist) navigate(`/creator/${currentTrack.artist}`);
  }, [songDetail, currentTrack, navigate]);
  const goToVerify = useCallback(() => {
    if (currentTrack?.witnessId) navigate(`/verify/${currentTrack.witnessId}`);
  }, [currentTrack, navigate]);

  /* ── Collapse on track change ── */
  useEffect(() => {
    setZone("MINI");
    setDragHeight(null);
  }, [currentTrack?.id]);

  /* ── Computed player height ── */
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const expandedH = Math.min(viewportH * 0.92, 820);

  function getSnapHeight(z: SnapZone): number {
    if (z === "MINI") return SNAP.MINI;
    if (z === "FLOAT") return SNAP.FLOAT;
    return expandedH;
  }

  const playerHeight = dragHeight ?? getSnapHeight(zone);

  /* ── Drag handlers ── */
  function onPointerDown(e: React.PointerEvent) {
    // Only drag from the handle bar area (top 40px of player)
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("canvas")) return;
    dragStartY.current = e.clientY;
    dragStartHeight.current = playerHeight;
    isDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current || dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY; // positive = dragging up = expanding
    const newH = Math.max(SNAP.MINI, Math.min(expandedH, dragStartHeight.current + delta));
    setDragHeight(newH);
  }

  function onPointerUp() {
    if (!isDragging.current) return;
    isDragging.current = false;
    const h = dragHeight ?? playerHeight;
    // Snap to nearest zone
    const midToFloat = (SNAP.MINI + SNAP.FLOAT) / 2;
    const floatToExpanded = (SNAP.FLOAT + expandedH) / 2;
    if (h < midToFloat) {
      setZone("MINI");
    } else if (h < floatToExpanded) {
      setZone("FLOAT");
    } else {
      setZone("EXPANDED");
    }
    setDragHeight(null);
  }

  /* ── Context menu ── */
  function openContextMenu() {
    if (showContextMenu) { setShowContextMenu(false); return; }
    const btn = contextMenuBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setContextMenuPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right - 4 });
    setShowContextMenu(true);
  }

  function openVolumePopup() {
    if (showVolume) { setShowVolume(false); return; }
    const btn = volumeBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setVolumePopupPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right - 4 });
    setShowVolume(true);
  }

  useEffect(() => {
    if (!showContextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuPortalRef.current?.contains(e.target as Node)) return;
      if (contextMenuBtnRef.current?.contains(e.target as Node)) return;
      setShowContextMenu(false);
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [showContextMenu]);

  useEffect(() => {
    if (!showVolume) return;
    const handler = (e: MouseEvent) => {
      if (volumePopupRef.current?.contains(e.target as Node)) return;
      if (volumeBtnRef.current?.contains(e.target as Node)) return;
      setShowVolume(false);
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [showVolume]);

  /* ── Up Next queue (next 3 tracks) ── */
  const upNext = useMemo(() => {
    if (!tracks.length || state.currentIdx < 0) return [];
    const result: typeof tracks = [];
    for (let i = 1; i <= 3; i++) {
      const idx = (state.currentIdx + i) % tracks.length;
      if (tracks[idx]) result.push(tracks[idx]);
    }
    return result;
  }, [tracks, state.currentIdx]);

  /* ── Gold glow shadow (combines frequency glow + static gold) ── */
  const activeShadow = glowEnabled && state.isPlaying && glowShadow
    ? `${GOLD_SHADOW}, ${glowShadow}`
    : GOLD_SHADOW;

  /* ── Render nothing if no track ever loaded ── */
  if (!currentTrack && tracks.length === 0) return null;

  /* ══════════════════════════════════════════════════════════════
     PORTAL CONTENT
  ══════════════════════════════════════════════════════════════ */
  const isExpanded = zone === "EXPANDED" || (dragHeight !== null && dragHeight > SNAP.FLOAT + 40);
  const isFloat = zone === "FLOAT" || (dragHeight !== null && dragHeight >= SNAP.FLOAT - 20 && dragHeight <= SNAP.FLOAT + 40);
  const isMini = !isExpanded && !isFloat;

  const content = (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: `${playerHeight}px`,
        zIndex: 9000,
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        borderTop: GOLD_BORDER,
        borderLeft: GOLD_BORDER,
        borderRight: GOLD_BORDER,
        borderRadius: isExpanded ? "20px 20px 0 0" : "12px 12px 0 0",
        boxShadow: activeShadow,
        transition: dragHeight !== null ? "none" : "height 0.35s cubic-bezier(0.32,0.72,0,1), border-radius 0.35s ease",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* ── DRAG HANDLE ── */}
      <div
        className="flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing"
        style={{ height: "20px", paddingTop: "6px" }}
      >
        <div
          style={{
            width: "40px",
            height: "4px",
            borderRadius: "2px",
            background: `rgba(212,175,55,0.4)`,
          }}
        />
      </div>

      {/* ── MINI BAR (always rendered, fades out when expanded) ── */}
      <div
        className="flex items-center gap-3 flex-shrink-0 px-3"
        style={{
          height: "52px",
          opacity: isExpanded ? 0 : 1,
          transition: "opacity 0.2s ease",
          pointerEvents: isExpanded ? "none" : "auto",
        }}
      >
        {/* Art thumbnail */}
        <button
          onClick={e => { e.stopPropagation(); goToSong(); }}
          className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: currentTrack?.bg || "#111009" }}
        >
          {currentTrack?.artUrl
            ? <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" />
            : <Music2 size={16} style={{ color: GOLD }} />
          }
        </button>

        {/* Title + artist */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-semibold truncate"
            style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}
          >
            {currentTrack?.title || "Nothing playing"}
          </p>
          <p className="text-[11px] truncate" style={{ color: "rgba(212,175,55,0.7)" }}>
            {currentTrack?.artist || ""}
          </p>
        </div>

        {/* Mini controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Like */}
          {user && currentSongId && (
            <button
              onClick={e => { e.stopPropagation(); toggleLikeMutation.mutate({ songId: currentSongId }); }}
              className="p-1.5 transition-colors"
              style={{ color: isLiked ? "#EF4444" : "rgba(255,255,255,0.4)" }}
            >
              <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
            </button>
          )}
          {/* Play/Pause */}
          <button
            onClick={e => { e.stopPropagation(); togglePlay(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ background: GOLD, color: "#000" }}
          >
            {state.isPlaying
              ? <Pause size={15} fill="currentColor" />
              : <Play size={15} fill="currentColor" className="ml-0.5" />
            }
          </button>
          {/* Next */}
          <button
            onClick={e => { e.stopPropagation(); nextTrack(); }}
            className="p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <SkipForward size={15} />
          </button>
          {/* Expand chevron */}
          <button
            onClick={e => { e.stopPropagation(); setZone(z => z === "MINI" ? "FLOAT" : "MINI"); setDragHeight(null); }}
            className="p-1.5 transition-colors"
            style={{ color: GOLD }}
          >
            {isMini ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ── PROGRESS BAR (visible in FLOAT + EXPANDED) ── */}
      {!isMini && (
        <div
          className="flex items-center gap-2 px-4 flex-shrink-0"
          style={{
            opacity: isMini ? 0 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <span className="text-[10px] w-7 text-right tabular-nums" style={{ color: "rgba(212,175,55,0.6)" }}>
            {fmtTime(state.currentTime)}
          </span>
          <div
            className="flex-1 h-1.5 rounded-full cursor-pointer relative"
            style={{ background: "rgba(44,52,56,0.8)" }}
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full relative transition-all"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, #EF4444 0%, #8B7355 50%, ${GOLD_HL} 100%)`,
                boxShadow: progress > 2 ? `0 0 8px 1px ${GOLD_GLOW}` : "none",
              }}
            >
              {state.isPlaying && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                  style={{ background: GOLD_HL, boxShadow: `0 0 8px 3px ${GOLD_GLOW}` }}
                />
              )}
            </div>
          </div>
          <span className="text-[10px] w-7 tabular-nums" style={{ color: "rgba(212,175,55,0.6)" }}>
            {fmtTime(state.duration)}
          </span>
        </div>
      )}

      {/* ── FLOAT CONTROLS ROW (visible in FLOAT) ── */}
      {(isFloat || isExpanded) && (
        <div className="flex items-center justify-between px-4 py-1 flex-shrink-0">
          {/* Playback controls */}
          <div className="flex items-center gap-3">
            <button onClick={e => { e.stopPropagation(); toggleShuffle(); }} className="p-1.5 transition-colors" style={{ color: state.isShuffle ? GOLD : "rgba(255,255,255,0.3)" }}>
              <Shuffle size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); prevTrack(); }} className="p-1.5 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
              <SkipBack size={18} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); togglePlay(); }}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-105"
              style={{ background: GOLD, color: "#000", boxShadow: `0 0 16px ${GOLD_GLOW}` }}
            >
              {state.isPlaying
                ? <Pause size={18} fill="currentColor" />
                : <Play size={18} fill="currentColor" className="ml-0.5" />
              }
            </button>
            <button onClick={e => { e.stopPropagation(); nextTrack(); }} className="p-1.5 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
              <SkipForward size={18} />
            </button>
            <button onClick={e => { e.stopPropagation(); toggleRepeat(); }} className="p-1.5 transition-colors" style={{ color: state.isRepeat ? GOLD : "rgba(255,255,255,0.3)" }}>
              <Repeat size={14} />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {user && currentSongId && (
              <button
                onClick={e => { e.stopPropagation(); toggleLikeMutation.mutate({ songId: currentSongId }); }}
                className="p-1.5 transition-colors"
                style={{ color: isLiked ? "#EF4444" : "rgba(255,255,255,0.35)" }}
              >
                <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
              </button>
            )}
            {currentSongId && (
              <button
                onClick={e => { e.stopPropagation(); setAddToCollectionOpen(true); }}
                className="p-1.5 transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }}
                title="Add to Collection"
              >
                <FolderPlus size={15} />
              </button>
            )}
            {tipsEnabled && currentSongId && (
              <button
                onClick={e => { e.stopPropagation(); setTipOpen(true); }}
                className="p-1.5 transition-colors"
                style={{ color: "rgba(212,175,55,0.7)" }}
                title="Tip creator"
              >
                <DollarSign size={14} />
              </button>
            )}
            <button
              ref={volumeBtnRef}
              onClick={e => { e.stopPropagation(); openVolumePopup(); }}
              className="p-1.5 transition-colors"
              style={{ color: state.isMuted ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)" }}
            >
              {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); toggleGlow(); }}
              className="p-1.5 transition-all rounded"
              style={{
                color: glowEnabled ? "#C084FC" : "rgba(255,255,255,0.25)",
                background: glowEnabled ? "rgba(192,132,252,0.08)" : "transparent",
              }}
              title={glowEnabled ? "Glow: ON" : "Glow: OFF"}
            >
              <Waves size={14} />
            </button>
            <button
              ref={contextMenuBtnRef}
              onClick={e => { e.stopPropagation(); openContextMenu(); }}
              className="p-1.5 transition-colors"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <MoreHorizontal size={16} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setZone(z => z === "EXPANDED" ? "FLOAT" : "EXPANDED"); setDragHeight(null); }}
              className="p-1.5 transition-colors"
              style={{ color: GOLD }}
            >
              {isExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* ── EXPANDED CONTENT ── */}
      {isExpanded && (
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: `${GOLD} transparent` }}
          onPointerDown={e => e.stopPropagation()} // prevent drag from scroll area
        >
          <div className="px-4 pb-6 space-y-5">

            {/* Large artwork */}
            <div className="flex justify-center pt-2">
              <button
                onClick={goToSong}
                className="relative rounded-2xl overflow-hidden transition-transform hover:scale-[1.01]"
                style={{
                  width: "min(280px, 72vw)",
                  height: "min(280px, 72vw)",
                  background: currentTrack?.bg || "#111009",
                  boxShadow: `0 8px 40px ${GOLD_GLOW}, 0 0 0 1px rgba(212,175,55,0.3)`,
                }}
              >
                {currentTrack?.artUrl
                  ? <img
                      src={currentTrack.artUrl}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `${currentTrack.coverPositionX ?? 50}% ${currentTrack.coverPositionY ?? 50}%` }}
                    />
                  : <div className="w-full h-full flex items-center justify-center text-6xl">
                      {currentTrack?.emoji || "🎵"}
                    </div>
                }
                {/* WID badge overlay */}
                {currentTrack?.witnessId && (
                  <div className="absolute top-2 right-2">
                    <WidBadge onClick={goToVerify} />
                  </div>
                )}
              </button>
            </div>

            {/* Title + artist + WID */}
            <div className="text-center space-y-1">
              <h2
                className="text-[22px] font-bold leading-tight"
                style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}
              >
                {currentTrack?.title || "Nothing playing"}
              </h2>
              <button
                onClick={goToCreator}
                className="text-[14px] transition-colors hover:opacity-80 flex items-center gap-1.5 mx-auto"
                style={{ color: GOLD }}
              >
                {currentTrack?.artist || ""}
                {songDetail?.creator && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.12)", border: `1px solid ${GOLD}` }}>
                    ✓
                  </span>
                )}
              </button>
              <p className="text-[11px] tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.5)", fontFamily: "'Cinzel', serif" }}>
                Witnessed on Living Nexus
              </p>
            </div>

            {/* Action row */}
            <div className="flex items-center justify-center gap-5">
              {user && currentSongId && (
                <button
                  onClick={() => toggleLikeMutation.mutate({ songId: currentSongId })}
                  className="flex flex-col items-center gap-1 transition-colors"
                  style={{ color: isLiked ? "#EF4444" : "rgba(255,255,255,0.5)" }}
                >
                  <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                  <span className="text-[9px] uppercase tracking-widest">Like</span>
                </button>
              )}
              {currentSongId && (
                <button
                  onClick={() => setAddToCollectionOpen(true)}
                  className="flex flex-col items-center gap-1 transition-colors"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <FolderPlus size={22} />
                  <span className="text-[9px] uppercase tracking-widest">Add</span>
                </button>
              )}
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/song/${currentSongId}`;
                  try { if (navigator.share) { await navigator.share({ title: currentTrack!.title, url }); return; } } catch {}
                  try { await navigator.clipboard.writeText(url); } catch {}
                }}
                className="flex flex-col items-center gap-1 transition-colors"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <Share2 size={22} />
                <span className="text-[9px] uppercase tracking-widest">Share</span>
              </button>
              {tipsEnabled && currentSongId && (
                <button
                  onClick={() => setTipOpen(true)}
                  className="flex flex-col items-center gap-1 transition-colors"
                  style={{ color: GOLD }}
                >
                  <DollarSign size={22} />
                  <span className="text-[9px] uppercase tracking-widest">Tip</span>
                </button>
              )}
              {currentTrack?.witnessId && (
                <button
                  onClick={goToVerify}
                  className="flex flex-col items-center gap-1 transition-colors"
                  style={{ color: GOLD }}
                >
                  <Shield size={22} />
                  <span className="text-[9px] uppercase tracking-widest">Verify</span>
                </button>
              )}
            </div>

            {/* Provenance strip */}
            {currentTrack?.witnessId && (
              <button
                onClick={goToVerify}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all hover:opacity-80"
                style={{
                  background: "rgba(212,175,55,0.06)",
                  border: GOLD_BORDER,
                }}
              >
                <div className="flex items-center gap-3">
                  <Shield size={18} style={{ color: GOLD }} />
                  <div className="text-left">
                    <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>
                      Provenance
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(212,175,55,0.6)" }}>
                      Verified Creation
                    </p>
                  </div>
                </div>
                <span className="text-[11px]" style={{ color: GOLD }}>View Details →</span>
              </button>
            )}

            {/* Waveform canvas */}
            {glowEnabled && (
              <div className="flex justify-center">
                <canvas
                  ref={waveCanvasRef}
                  width={300}
                  height={48}
                  className="rounded-lg"
                  style={{ opacity: 0.7 }}
                />
              </div>
            )}

            {/* Speed + playback rate */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={cycleSpeed}
                className="px-3 py-1.5 rounded-full text-[11px] font-mono font-bold transition-all"
                style={{
                  color: playbackRate !== 1 ? GOLD : "rgba(255,255,255,0.4)",
                  background: playbackRate !== 1 ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${playbackRate !== 1 ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {playbackRate === 1 ? "1×" : playbackRate === 1.5 ? "1.5×" : playbackRate === 2 ? "2×" : "¾×"}
              </button>
              <button
                onClick={toggleGlow}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                style={{
                  color: glowEnabled ? "#C084FC" : "rgba(255,255,255,0.4)",
                  background: glowEnabled ? "rgba(192,132,252,0.08)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${glowEnabled ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <Waves size={12} className="inline mr-1" />
                {glowEnabled ? "Glow On" : "Glow Off"}
              </button>
            </div>

            {/* Up Next */}
            {upNext.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <List size={13} style={{ color: GOLD }} />
                  <span
                    className="text-[11px] font-bold tracking-widest uppercase"
                    style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}
                  >
                    Up Next
                  </span>
                </div>
                <div className="space-y-2">
                  {upNext.map((t, i) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all hover:bg-white/5 cursor-pointer"
                      style={{ border: "1px solid rgba(212,175,55,0.08)" }}
                      onClick={() => {
                        const idx = tracks.findIndex(tr => tr.id === t.id);
                        if (idx >= 0) playTrack(idx);
                      }}
                    >
                      <span className="text-[11px] w-4 text-center" style={{ color: "rgba(212,175,55,0.4)" }}>
                        {i + 1}
                      </span>
                      <div
                        className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ background: t.bg || "#111009" }}
                      >
                        {t.artUrl
                          ? <img src={t.artUrl} alt="" className="w-full h-full object-cover" />
                          : <Music2 size={12} style={{ color: GOLD }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate" style={{ color: "#F5EDD8" }}>
                          {t.title}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: "rgba(212,175,55,0.6)" }}>
                          {t.artist}
                        </p>
                      </div>
                      {t.dur && (
                        <span className="text-[10px] flex-shrink-0 tabular-nums" style={{ color: "rgba(212,175,55,0.5)" }}>
                          {t.dur}
                        </span>
                      )}
                      <GripHorizontal size={12} style={{ color: "rgba(212,175,55,0.3)" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );

  /* ── Volume popup portal ── */
  const volumePortal = showVolume && volumePopupPos ? createPortal(
    <div
      ref={volumePopupRef}
      style={{
        position: "fixed",
        bottom: volumePopupPos.bottom,
        right: volumePopupPos.right,
        zIndex: 99999,
        background: "var(--ln-coal)",
        border: GOLD_BORDER,
        borderRadius: "1rem",
        boxShadow: GOLD_SHADOW,
        padding: "12px 14px 10px",
        minWidth: "140px",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono tracking-widest" style={{ color: GOLD }}>
          {state.isMuted ? "MUTED" : `${Math.round(state.volume * 100)}%`}
        </span>
        <button onClick={toggleMute} className="p-1 rounded-full" style={{ color: state.isMuted ? GOLD : "rgba(255,255,255,0.4)" }}>
          <VolumeX size={11} />
        </button>
      </div>
      <div className="flex items-center justify-center py-2">
        <input
          type="range" min="0" max="1" step="0.01"
          value={state.isMuted ? 0 : state.volume}
          onChange={e => { if (state.isMuted) toggleMute(); setVolume(parseFloat(e.target.value)); }}
          className="volume-slider-vertical"
          style={{
            background: `linear-gradient(to top, ${GOLD_HL} ${state.isMuted ? 0 : state.volume * 100}%, rgba(44,52,56,0.8) ${state.isMuted ? 0 : state.volume * 100}%)`,
          }}
        />
      </div>
    </div>,
    document.body
  ) : null;

  /* ── Context menu portal ── */
  const contextMenuPortal = showContextMenu && contextMenuPos ? createPortal(
    <div
      ref={contextMenuPortalRef}
      style={{
        position: "fixed",
        bottom: contextMenuPos.bottom,
        right: contextMenuPos.right,
        zIndex: 99999,
        background: "var(--ln-coal)",
        border: GOLD_BORDER,
        borderRadius: "1rem",
        boxShadow: GOLD_SHADOW,
        minWidth: "160px",
        overflow: "hidden",
      }}
    >
      <button onClick={() => { setShowContextMenu(false); goToSong(); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] transition-colors hover:bg-white/5 text-left" style={{ color: "var(--ln-parchment)" }}>
        <ExternalLink size={13} style={{ color: "rgba(255,255,255,0.4)" }} /> Go to Song
      </button>
      <button onClick={() => { setShowContextMenu(false); goToCreator(); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] transition-colors hover:bg-white/5 text-left" style={{ color: "var(--ln-parchment)" }}>
        <ExternalLink size={13} style={{ color: "rgba(255,255,255,0.4)" }} /> View Creator
      </button>
      <button
        onClick={async () => {
          setShowContextMenu(false);
          const url = `${window.location.origin}/song/${currentSongId}`;
          try { if (navigator.share) { await navigator.share({ title: currentTrack!.title, url }); return; } } catch {}
          try { await navigator.clipboard.writeText(url); } catch {}
        }}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] transition-colors hover:bg-white/5 text-left"
        style={{ color: "var(--ln-parchment)" }}
      >
        <Share2 size={13} style={{ color: "rgba(255,255,255,0.4)" }} /> Share Artifact
      </button>
      {currentSongId && (
        <button onClick={() => { setShowContextMenu(false); setAddToCollectionOpen(true); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] transition-colors hover:bg-white/5 text-left" style={{ color: "var(--ln-parchment)" }}>
          <FolderPlus size={13} style={{ color: "rgba(255,255,255,0.4)" }} /> Add to Collection
        </button>
      )}
      {(() => {
        const dlPerm = (songDetail?.song as any)?.downloadPermission as string | undefined;
        if (!dlPerm || dlPerm === "none") return null;
        return (
          <button
            onClick={() => {
              setShowContextMenu(false);
              const a = document.createElement("a");
              a.href = `/api/download/${currentSongId}`;
              a.style.display = "none";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] transition-colors hover:bg-white/5 text-left"
            style={{ color: "var(--ln-parchment)" }}
          >
            <Download size={13} style={{ color: "rgba(255,255,255,0.4)" }} /> Download
          </button>
        );
      })()}
      <button onClick={() => { setShowContextMenu(false); navigate("/archive"); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] transition-colors hover:bg-white/5 text-left border-t" style={{ color: "var(--ln-parchment)", borderColor: "rgba(44,52,56,0.5)" }}>
        <List size={13} style={{ color: "rgba(255,255,255,0.4)" }} /> View Queue
      </button>
    </div>,
    document.body
  ) : null;

  /* ── Modals ── */
  const modals = (
    <>
      {tipOpen && currentSongId && (
        <PlayerTipModal
          songId={currentSongId}
          songTitle={currentTrack?.title}
          artistName={currentTrack?.artist || "this creator"}
          genre={currentTrack?.genre}
          witnessId={currentTrack?.witnessId}
          artUrl={currentTrack?.artUrl}
          artType={currentTrack?.artType}
          coverPositionX={currentTrack?.coverPositionX}
          coverPositionY={currentTrack?.coverPositionY}
          stripeAccountId={creatorStripeAccountId}
          onClose={() => setTipOpen(false)}
        />
      )}
      <AddToCollectionModal
        open={!!(addToCollectionOpen && currentSongId)}
        songId={currentSongId ?? 0}
        songTitle={currentTrack?.title ?? ""}
        onClose={() => setAddToCollectionOpen(false)}
      />
    </>
  );

  return createPortal(
    <>
      {content}
      {volumePortal}
      {contextMenuPortal}
      {modals}
    </>,
    document.body
  );
}
