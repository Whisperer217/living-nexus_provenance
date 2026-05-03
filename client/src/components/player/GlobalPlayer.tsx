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
  DollarSign, MessageCircle, Send, Maximize2, X, Flag,
} from "lucide-react";
import { AddToCollectionModal } from "@/components/AddToCollectionModal";
import { useLocation } from "wouter";
import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import PlayerTipModal from "./PlayerTipModal";
import { toast } from "sonner";

/* ── Gold design tokens ─────────────────────────────────────────── */
const GOLD = "#D4AF37";
const GOLD_HL = "#F5E6B3";
const GOLD_GLOW = "rgba(212,175,55,0.6)";
/* Mobile glass */
const GLASS_BG_MOBILE = "rgba(0,0,0,0.82)";
const GLASS_BLUR_MOBILE = "blur(16px)";
/* Desktop glass — slightly stronger separation (decision #8) */
const GLASS_BG_DESKTOP = "rgba(0,0,0,0.75)";
const GLASS_BLUR_DESKTOP = "blur(18px)";
/* Glow: tightened radius, no fog (decision #1 from visual spec) */
const GOLD_SHADOW_MOBILE = `0 0 10px rgba(212,175,55,0.45), 0 0 18px rgba(212,175,55,0.18)`;
/* Desktop glow: directional — upward light + depth (decision #9) */
const GOLD_SHADOW_DESKTOP = `0 -8px 24px rgba(212,175,55,0.45), 0 12px 32px rgba(0,0,0,0.9)`;
const GOLD_BORDER = `1px solid rgba(212,175,55,0.45)`;

/* ── Snap zone heights ──────────────────────────────────────────── */
const SNAP = {
  MINI: 72,       // compact strip — always visible
  EXPANDED: 0,    // full height on mobile / centered modal on desktop
} as const;
// FLOAT zone removed — only MINI and EXPANDED are valid states.
// Drag previews height freely; release snaps to one of two authoritative zones.
type SnapZone = "MINI" | "EXPANDED";

/* ── Desktop breakpoint ─────────────────────────────────────────── */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

function fmtTime(s: number, ready = true) {
  // When not ready, show loading indicator rather than 0:00 to communicate "loading new track"
  if (!ready) return "--:--";
  if (!s || !isFinite(s) || isNaN(s)) return "0:00";
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
function GlobalPlayerInner() {
  const {
    state, audioRef, allTracks, togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute, setVolume, seek, playTrack,
    isReady,
  } = usePlayer();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const isDesktop = useIsDesktop();

  /* ── Snap zone state ── */
  const [zone, setZone] = useState<SnapZone>("MINI");

  /* ── Desktop position anchor: bottom-right or bottom-left (decision #5) ── */
  const [desktopAnchor, setDesktopAnchor] = useState<"right" | "left">("right");

  /* ── Drag state ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(SNAP.MINI);
  const isDragging = useRef(false);
  const hasDragged = useRef(false); // true once pointer has moved ≥ DRAG_THRESHOLD px
  const DRAG_THRESHOLD = 6; // px — below this, pointer-up is treated as a click, not a drag
  const [dragHeight, setDragHeight] = useState<number | null>(null); // null = use snap zone

  /* ── Tip modal suspension (Option A) ── */
  // Reads data-tip-modal-open set by PlayerTipModal to fade/dock the player
  const [tipModalOpen, setTipModalOpen] = useState(false);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTipModalOpen(document.body.hasAttribute("data-tip-modal-open"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-tip-modal-open"] });
    return () => observer.disconnect();
  }, []);

  /* ── Cinematic mode ── */
  const [cinematic, setCinematic] = useState(false);
  const [cinematicOverlay, setCinematicOverlay] = useState(true);
  const cinematicHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showCinematicOverlay() {
    setCinematicOverlay(true);
    if (cinematicHideTimer.current) clearTimeout(cinematicHideTimer.current);
    cinematicHideTimer.current = setTimeout(() => setCinematicOverlay(false), 3000);
  }
  useEffect(() => { if (cinematic) showCinematicOverlay(); }, [cinematic]);
  useEffect(() => () => { if (cinematicHideTimer.current) clearTimeout(cinematicHideTimer.current); }, []);

  /* ── Visual persistence: auto-elevate to EXPANDED when playback starts from MINI ── */
  // FLOAT zone removed — when playback starts, go directly to EXPANDED.
  // User can drag back to MINI manually.
  useEffect(() => {
    if (state.isPlaying && zone === 'MINI') {
      setZone('EXPANDED');
      setDragHeight(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isPlaying]);

  /* ── Cinematic exit channels: ESC key ── */
  useEffect(() => {
    if (!cinematic) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setCinematic(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cinematic]);

  /* ── Artwork swipe gesture — momentum physics ── */
  const artSwipeStartX = useRef<number | null>(null);
  const artSwipeStartY = useRef<number | null>(null);
  const artSwipeLastX = useRef<number | null>(null);      // previous frame X for velocity
  const artSwipeLastT = useRef<number>(0);                // previous frame timestamp
  const artSwipeVelocity = useRef<number>(0);             // px/ms at release
  const artSwipeLocked = useRef<boolean>(false);          // vertical scroll lock
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const SWIPE_THRESHOLD = 50;           // px — reduced because velocity also counts
  const VELOCITY_THRESHOLD = 0.35;      // px/ms — fast flick triggers even under px threshold
  const RUBBER_BAND = 0.35;             // 0–1 — resistance at track boundaries (first/last)

  function onArtPointerDown(e: React.PointerEvent) {
    artSwipeStartX.current = e.clientX;
    artSwipeStartY.current = e.clientY;
    artSwipeLastX.current = e.clientX;
    artSwipeLastT.current = e.timeStamp;
    artSwipeVelocity.current = 0;
    artSwipeLocked.current = false;
    setSwipeDelta(0);
    setSwipeDir(null);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onArtPointerMove(e: React.PointerEvent) {
    if (artSwipeStartX.current === null) return;
    const dx = e.clientX - artSwipeStartX.current;
    const dy = e.clientY - (artSwipeStartY.current ?? e.clientY);
    // Lock to vertical scroll if it dominates early
    if (!artSwipeLocked.current && Math.abs(dy) > Math.abs(dx) + 10) {
      artSwipeLocked.current = true;
    }
    if (artSwipeLocked.current) return;

    // Velocity: exponential moving average for smoothness
    const dt = e.timeStamp - artSwipeLastT.current;
    if (dt > 0 && artSwipeLastX.current !== null) {
      const instantV = (e.clientX - artSwipeLastX.current) / dt;
      artSwipeVelocity.current = artSwipeVelocity.current * 0.6 + instantV * 0.4;
    }
    artSwipeLastX.current = e.clientX;
    artSwipeLastT.current = e.timeStamp;

    // Rubber-band resistance at queue boundaries
    const tracks = state.tracks.filter(t => !!t.audioUrl);
    const atStart = state.currentIdx <= 0;
    const atEnd = state.currentIdx >= tracks.length - 1;
    let resistedDx = dx;
    if ((atStart && dx > 0) || (atEnd && dx < 0)) {
      // Apply rubber-band: diminishing returns past boundary
      resistedDx = Math.sign(dx) * Math.pow(Math.abs(dx), RUBBER_BAND) * 12;
    }

    setSwipeDelta(resistedDx);
    setSwipeDir(resistedDx < 0 ? "left" : resistedDx > 0 ? "right" : null);
  }

  function onArtPointerUp() {
    if (artSwipeStartX.current === null) return;
    const dx = swipeDelta;
    const vel = artSwipeVelocity.current;
    artSwipeStartX.current = null;
    artSwipeStartY.current = null;
    artSwipeLastX.current = null;
    artSwipeVelocity.current = 0;
    artSwipeLocked.current = false;

    // Animate spring-back before resetting
    setSwipeDelta(0);
    setSwipeDir(null);

    // Trigger on px threshold OR velocity threshold (fast flick)
    const shouldTrigger = Math.abs(dx) >= SWIPE_THRESHOLD || Math.abs(vel) >= VELOCITY_THRESHOLD;
    if (shouldTrigger) {
      if (dx < 0 || vel < -VELOCITY_THRESHOLD) nextTrack();
      else prevTrack();
    }
  }

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

  /* ── Optimistic display track ──
   * Mirrors currentTrack but updates IMMEDIATELY when the track index changes,
   * before isReady fires. This gives instant visual feedback on swipe/skip
   * while the audio engine resets and loads the new src in the background.
   * The audio invariants (isReady, atomic reset) are NOT affected.
   */
  const [displayTrack, setDisplayTrack] = useState<typeof currentTrack>(currentTrack);
  useEffect(() => {
    setDisplayTrack(currentTrack);
  }, [state.currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  // Use displayTrack for all visual rendering so swipe feels instant
  const visTrack = displayTrack ?? currentTrack;

  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId!), staleTime: 60_000 }
  );

  /* ── Comments (after currentSongId is available) ── */
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const { data: commentsData, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: currentSongId ?? 0 },
    { enabled: !!currentSongId && !isNaN(currentSongId) && commentsOpen, staleTime: 30_000 }
  );
  const comments = commentsData ?? [];
  const addCommentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { setCommentText(""); refetchComments(); },
  });
  const reportCommentMutation = trpc.comments.report.useMutation({
    onSuccess: (res: { alreadyReported: boolean }) => {
      if (res.alreadyReported) toast.info("You already reported this comment.");
      else toast.success("Report submitted. Thank you.");
      setReportingCommentId(null);
    },
    onError: (e: { message: string }) => { toast.error(e.message); setReportingCommentId(null); },
  });
  async function handleSubmitComment() {
    if (!user || !commentText.trim() || !currentSongId) return;
    setCommentSubmitting(true);
    try { await addCommentMutation.mutateAsync({ songId: currentSongId, content: commentText.trim() }); }
    finally { setCommentSubmitting(false); }
  }
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

  /* ── Computed player height ── */
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const expandedH = Math.min(viewportH * 0.92, 820);

  function getSnapHeight(z: SnapZone): number {
    if (z === "MINI") return SNAP.MINI;
    return expandedH;
  }

  const playerHeight = dragHeight ?? getSnapHeight(zone);

  /* ── Drag handlers ── */
  function onPointerDown(e: React.PointerEvent) {
    // Zone-state lock: cinematic mode owns the full screen — block drag zone transitions
    if (cinematic) return;
    // Only drag from the handle bar area (top 40px of player)
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("canvas")) return;
    dragStartY.current = e.clientY;
    dragStartHeight.current = playerHeight;
    isDragging.current = true;
    hasDragged.current = false; // reset for each new gesture
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current || dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY; // positive = dragging up = expanding
    // Only activate drag once the pointer has moved past the threshold
    if (!hasDragged.current && Math.abs(delta) < DRAG_THRESHOLD) return;
    hasDragged.current = true;
    const newH = Math.max(SNAP.MINI, Math.min(expandedH, dragStartHeight.current + delta));
    setDragHeight(newH);
  }

  function onPointerUp() {
    if (!isDragging.current) return;
    isDragging.current = false;
    // If the pointer never moved past the threshold, treat as a click — do not snap zones
    if (!hasDragged.current) {
      hasDragged.current = false;
      setDragHeight(null);
      return;
    }
    hasDragged.current = false;
    const h = dragHeight ?? playerHeight;
    // Single threshold: below midpoint → MINI, above → EXPANDED
    // FLOAT zone removed — no half-states, no ambiguity
    const midpoint = (SNAP.MINI + expandedH) / 2;
    if (h < midpoint) {
      setZone("MINI");
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

  /* ── Gold glow shadow — desktop directional, mobile tight (decisions #1 + #9) ── */
  const baseShadow = isDesktop ? GOLD_SHADOW_DESKTOP : GOLD_SHADOW_MOBILE;
  const activeShadow = glowEnabled && state.isPlaying && glowShadow
    ? `${baseShadow}, ${glowShadow}`
    : baseShadow;

  /* ── Render nothing if no track ever loaded ── */
  if (!visTrack && tracks.length === 0) return null;

  /* ══════════════════════════════════════════════════════════════
     PORTAL CONTENT
  ══════════════════════════════════════════════════════════════ */
  // FLOAT zone removed — only MINI and EXPANDED are valid.
  // isExpanded is true when zone is EXPANDED or drag preview is above the midpoint.
  const isExpanded = zone === "EXPANDED" || (dragHeight !== null && dragHeight > (SNAP.MINI + 200));
  const isMini = !isExpanded;

  /* ── Desktop expanded = centered modal (decision #3) ── */
  const desktopExpandedStyle: React.CSSProperties = isDesktop && isExpanded ? {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(900px, 90vw)",
    height: "min(700px, 85vh)",
    right: "auto",
    bottom: "auto",
  } : {};

  /* ── Desktop floating card style (Phase 108: AppShell-aware positioning) ── */
  // Player spans MainColumn only: left=72px (LeftRail width), right=320px (RightRail width)
  // Anchor toggle still works but shifts within the MainColumn bounds
  const RAIL_LEFT = 72;   // LeftRail width
  const RAIL_RIGHT = 320; // RightRail width
  const desktopFloatStyle: React.CSSProperties = isDesktop && !isExpanded ? {
    width: `calc(100vw - ${RAIL_LEFT}px - ${RAIL_RIGHT}px - 64px)`, // fluid within MainColumn minus margins
    maxWidth: 1100,
    minWidth: 560,
    right: desktopAnchor === "right" ? `${RAIL_RIGHT + 16}px` : "auto",
    left: desktopAnchor === "left" ? `${RAIL_LEFT + 16}px` : "auto",
    bottom: "24px",
    borderRadius: "20px",          /* fully detached floating card — all 4 corners */
    transform: "translateY(6px)", /* elevation: lifted above page */
  } : {};

  const glassBg = isDesktop ? GLASS_BG_DESKTOP : GLASS_BG_MOBILE;
  // Adaptive blur: reduce GPU cost during active playback (Decision #3)
  const glassBlur = state.isPlaying
    ? (isDesktop ? "blur(4px)" : "blur(4px)")
    : (isDesktop ? GLASS_BLUR_DESKTOP : GLASS_BLUR_MOBILE);

  const content = (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: isDesktop && isExpanded ? undefined : `${playerHeight}px`,
        zIndex: 9000,
        willChange: "transform",
        contain: "layout paint",
        background: glassBg,
        backdropFilter: glassBlur,
        WebkitBackdropFilter: glassBlur,
        border: GOLD_BORDER,
        borderRadius: isExpanded ? "20px 20px 0 0" : isDesktop ? "20px" : "12px 12px 0 0",
        boxShadow: activeShadow,
        // Spring-physics transition: overshoot + settle for zone changes; none during active drag
        transition: dragHeight !== null ? "none" : "height 0.4s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.35s ease, transform 0.35s ease, opacity 0.4s ease",
        /* Suspension: fade + dock when tip modal is open (Option A) */
        opacity: tipModalOpen ? 0.15 : 1,
        pointerEvents: tipModalOpen ? "none" : undefined,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        touchAction: "none",
        /* Apply desktop overrides */
        ...desktopFloatStyle,
        ...desktopExpandedStyle,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* ── DRAG HANDLE (mobile) / CLICK TOGGLE HEADER (desktop) ── */}
      <div
        className="flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing"
        style={{ height: "20px", paddingTop: "6px", position: "relative" }}
      >
        {/* Mobile: pill handle */}
        {!isDesktop && (
          <div
            style={{
              width: "40px",
              height: "4px",
              borderRadius: "2px",
              background: `rgba(212,175,55,0.4)`,
            }}
          />
        )}
        {/* Desktop: anchor toggle (bottom-right ↔ bottom-left) — decision #5 */}
        {isDesktop && !isExpanded && (
          <button
            onClick={e => { e.stopPropagation(); setDesktopAnchor(a => a === "right" ? "left" : "right"); }}
            className="absolute right-3 top-0 text-[9px] tracking-widest uppercase opacity-30 hover:opacity-70 transition-opacity"
            style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}
            title={`Anchor: ${desktopAnchor} — click to switch`}
          >
            {desktopAnchor === "right" ? "⇤" : "⇥"}
          </button>
        )}
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
          style={{ background: visTrack?.bg || "#111009" }}
        >
          {visTrack?.artUrl
            ? <img src={visTrack.artUrl} alt="" className="w-full h-full object-cover" />
            : <Music2 size={16} style={{ color: GOLD }} />
          }
        </button>

        {/* Title + artist */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-semibold truncate"
            style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}
          >
            {visTrack?.title || "Nothing playing"}
          </p>
          <p className="text-[11px] truncate" style={{ color: "rgba(212,175,55,0.7)" }}>
            {visTrack?.artist || ""}
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
          {/* Expand chevron — click-first on desktop (decision #4) */}
          <button
            onClick={e => { e.stopPropagation(); setZone(z => z === "MINI" ? "EXPANDED" : "MINI"); setDragHeight(null); }}
            className="p-1.5 transition-colors"
            style={{ color: GOLD }}
            title={isMini ? "Expand player" : "Collapse player"}
          >
            {isMini ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ── PROGRESS BAR — crisp 3px track, glow only on knob (decision #4 visual spec) ── */}
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
            className="flex-1 cursor-pointer relative"
            style={{ background: "#1a1a1a", height: "3px", borderRadius: "2px" }}
            onClick={handleSeek}
          >
            <div
              className="h-full relative"
              style={{
                width: `${progress}%`,
                background: GOLD,
                borderRadius: "2px",
              }}
            >
              {/* Knob — glow only here (decision #4) */}
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: "12px",
                  height: "12px",
                  background: GOLD_HL,
                  boxShadow: state.isPlaying ? `0 0 14px rgba(245,230,179,0.7)` : "none",
                  transform: "translateY(-50%) translateX(50%)",
                }}
              />
            </div>
          </div>
          <span className="text-[10px] w-7 tabular-nums" style={{ color: "rgba(212,175,55,0.6)" }}>
            {fmtTime(state.duration, isReady)}
          </span>
        </div>
      )}

      {/* ── EXPANDED CONTROLS ROW: stacked controls visible when not in MINI zone ── */}
      {/* FLOAT zone removed — this row is shown whenever isExpanded is true ── */}
      {isExpanded && (
        <div className="flex items-center justify-between px-4 py-1 flex-shrink-0">
          {/* Playback controls — 3-tier hierarchy */}
          <div className="flex items-center gap-3">
            <button onClick={e => { e.stopPropagation(); toggleShuffle(); }} className="p-1.5 transition-colors" style={{ color: state.isShuffle ? GOLD : "rgba(212,175,55,0.65)" }}><Shuffle size={14} /></button>
            <button onClick={e => { e.stopPropagation(); prevTrack(); }} className="p-1.5 transition-colors" style={{ color: GOLD, opacity: 0.9 }}><SkipBack size={18} /></button>
            {/* Circular play button — 56px spec */}
            <button
              onClick={e => { e.stopPropagation(); togglePlay(); }}
              className="flex items-center justify-center rounded-full transition-transform hover:scale-105"
              style={{ width: "56px", height: "56px", background: GOLD, color: "#000", boxShadow: `0 0 12px rgba(212,175,55,0.55), 0 0 24px rgba(212,175,55,0.22)`, filter: `drop-shadow(0 0 10px rgba(212,175,55,0.6))` }}
            >
              {state.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={e => { e.stopPropagation(); nextTrack(); }} className="p-1.5 transition-colors" style={{ color: GOLD, opacity: 0.9 }}><SkipForward size={18} /></button>
            <button onClick={e => { e.stopPropagation(); toggleRepeat(); }} className="p-1.5 transition-colors" style={{ color: state.isRepeat ? GOLD : "rgba(212,175,55,0.65)" }}><Repeat size={14} /></button>
          </div>
          {/* Right utility actions */}
          <div className="flex items-center gap-1">
            {user && currentSongId && (
              <button onClick={e => { e.stopPropagation(); toggleLikeMutation.mutate({ songId: currentSongId }); }} className="p-1.5 transition-colors" style={{ color: isLiked ? "#EF4444" : "rgba(212,175,55,0.65)" }}>
                <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
              </button>
            )}
            {currentSongId && (
              <button onClick={e => { e.stopPropagation(); setCommentsOpen(true); }} className="p-1.5 transition-colors" style={{ color: "rgba(212,175,55,0.65)" }} title="Comments">
                <MessageCircle size={14} />
              </button>
            )}
            {currentSongId && (
              <button onClick={e => { e.stopPropagation(); setAddToCollectionOpen(true); }} className="p-1.5 transition-colors" style={{ color: "rgba(212,175,55,0.65)" }} title="Add to Collection">
                <FolderPlus size={15} />
              </button>
            )}
            {tipsEnabled && currentSongId && (
              <button onClick={e => { e.stopPropagation(); setTipOpen(true); }} className="p-1.5 transition-colors" style={{ color: "rgba(212,175,55,0.65)" }} title="Tip creator">
                <DollarSign size={14} />
              </button>
            )}
            <button ref={volumeBtnRef} onClick={e => { e.stopPropagation(); openVolumePopup(); }} className="p-1.5 transition-colors" style={{ color: state.isMuted ? "rgba(212,175,55,0.3)" : "rgba(212,175,55,0.65)" }}>
              {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button onClick={e => { e.stopPropagation(); toggleGlow(); }} className="p-1.5 transition-all rounded" style={{ color: glowEnabled ? "#C084FC" : "rgba(212,175,55,0.4)", background: glowEnabled ? "rgba(192,132,252,0.08)" : "transparent" }} title={glowEnabled ? "Glow: ON" : "Glow: OFF"}><Waves size={14} /></button>
            <button ref={contextMenuBtnRef} onClick={e => { e.stopPropagation(); openContextMenu(); }} className="p-1.5 transition-colors" style={{ color: "rgba(212,175,55,0.65)" }}><MoreHorizontal size={16} /></button>
            {/* Collapse button: EXPANDED → MINI (FLOAT zone removed) */}
            <button onClick={e => { e.stopPropagation(); setZone(z => z === "EXPANDED" ? "MINI" : "EXPANDED"); setDragHeight(null); }} className="p-1.5 transition-colors" style={{ color: GOLD, filter: `drop-shadow(0 0 6px rgba(212,175,55,0.5))` }} title={isExpanded ? "Collapse" : "Expand player"}>
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

            {/* Large artwork — with swipe gesture + cinematic tap */}
            <div className="flex justify-center pt-2">
              <div
                className="relative rounded-2xl overflow-hidden select-none"
                style={{
                  width: "min(280px, 72vw)",
                  height: "min(280px, 72vw)",
                  background: visTrack?.bg || "#111009",
                  boxShadow: swipeDir
                    ? `0 8px 40px ${GOLD_GLOW}, ${swipeDir === "left" ? "-6px" : "6px"} 0 24px rgba(212,175,55,0.4), 0 0 0 1px rgba(212,175,55,0.3)`
                    : `0 8px 40px ${GOLD_GLOW}, 0 0 0 1px rgba(212,175,55,0.3)`,
                  transform: swipeDelta !== 0 ? `translateX(${Math.sign(swipeDelta) * Math.min(Math.abs(swipeDelta) * 0.25, 24)}px) rotate(${Math.sign(swipeDelta) * Math.min(Math.abs(swipeDelta) * 0.02, 2)}deg)` : undefined,
                  transition: swipeDelta === 0 ? "transform 0.3s cubic-bezier(0.32,0.72,0,1), box-shadow 0.2s ease" : "none",
                  cursor: "pointer",
                }}
                onPointerDown={onArtPointerDown}
                onPointerMove={onArtPointerMove}
                onPointerUp={onArtPointerUp}
                onPointerCancel={onArtPointerUp}
                onClick={e => { if (Math.abs(swipeDelta) < 5) { e.stopPropagation(); setCinematic(true); } }}
              >
                {visTrack?.artUrl
                  ? <img
                      src={visTrack.artUrl}
                      alt={visTrack.title}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `${visTrack.coverPositionX ?? 50}% ${visTrack.coverPositionY ?? 50}%` }}
                    />
                  : <div className="w-full h-full flex items-center justify-center text-6xl">
                      {visTrack?.emoji || "🎵"}
                    </div>
                }
                {/* Swipe direction hint */}
                {swipeDir && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                    <span className="text-4xl" style={{ color: GOLD, filter: `drop-shadow(0 0 12px ${GOLD})` }}>
                      {swipeDir === "left" ? "▶" : "◀"}
                    </span>
                  </div>
                )}
                {/* Tap hint overlay */}
                {!swipeDir && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px]" style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.5)" }}>
                    <Maximize2 size={9} /> Cinematic
                  </div>
                )}
                {/* WID badge overlay */}
                {visTrack?.witnessId && (
                  <div className="absolute top-2 right-2">
                    <WidBadge onClick={goToVerify} />
                  </div>
                )}
              </div>
            </div>

            {/* Title + artist + WID */}
            <div className="text-center space-y-1">
              <h2
                className="text-[22px] font-bold leading-tight"
                style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}
              >
                {visTrack?.title || "Nothing playing"}
              </h2>
              <button
                onClick={goToCreator}
                className="text-[14px] transition-colors hover:opacity-80 flex items-center gap-1.5 mx-auto"
                style={{ color: GOLD }}
              >
                {visTrack?.artist || ""}
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
                <button onClick={() => toggleLikeMutation.mutate({ songId: currentSongId })} className="flex flex-col items-center gap-1 transition-colors" style={{ color: isLiked ? "#EF4444" : "rgba(255,255,255,0.5)" }}>
                  <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                  <span className="text-[9px] uppercase tracking-widest">Like</span>
                </button>
              )}
              {currentSongId && (
                <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <MessageCircle size={22} />
                  <span className="text-[9px] uppercase tracking-widest">Comments</span>
                </button>
              )}
              {currentSongId && (
                <button onClick={() => setAddToCollectionOpen(true)} className="flex flex-col items-center gap-1 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <FolderPlus size={22} />
                  <span className="text-[9px] uppercase tracking-widest">Add</span>
                </button>
              )}
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/song/${currentSongId}`;
                  try { if (navigator.share) { await navigator.share({ title: visTrack?.title ?? '', url }); return; } } catch {}
                  try { await navigator.clipboard.writeText(url); } catch {}
                }}
                className="flex flex-col items-center gap-1 transition-colors"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <Share2 size={22} />
                <span className="text-[9px] uppercase tracking-widest">Share</span>
              </button>
              {tipsEnabled && currentSongId && (
                <button onClick={() => setTipOpen(true)} className="flex flex-col items-center gap-1 transition-colors" style={{ color: GOLD }}>
                  <DollarSign size={22} />
                  <span className="text-[9px] uppercase tracking-widest">Tip</span>
                </button>
              )}
              {visTrack?.witnessId && (
                <button onClick={goToVerify} className="flex flex-col items-center gap-1 transition-colors" style={{ color: GOLD }}>
                  <Shield size={22} />
                  <span className="text-[9px] uppercase tracking-widest">Verify</span>
                </button>
              )}
            </div>

            {/* Provenance strip */}
            {visTrack?.witnessId && (
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
        boxShadow: GOLD_SHADOW_MOBILE,
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
        boxShadow: GOLD_SHADOW_MOBILE,
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
          try { if (navigator.share) { await navigator.share({ title: visTrack?.title ?? '', url }); return; } } catch {}
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

  /* ── Comments drawer portal ── */
  const commentsDrawer = commentsOpen && currentSongId ? createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        display: "flex",
        alignItems: isDesktop ? "center" : "flex-end",
        justifyContent: isDesktop ? "flex-end" : "center",
        pointerEvents: "auto",
      }}
      onClick={e => { if (e.target === e.currentTarget) setCommentsOpen(false); }}
    >
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={() => setCommentsOpen(false)} />
      {/* Panel */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "var(--ln-coal, #111009)",
          border: `1px solid rgba(212,175,55,0.25)`,
          borderRadius: isDesktop ? "20px" : "20px 20px 0 0",
          boxShadow: `0 -4px 32px rgba(212,175,55,0.12), 0 0 0 1px rgba(212,175,55,0.08)`,
          width: isDesktop ? "400px" : "100%",
          maxWidth: isDesktop ? "400px" : "100vw",
          height: isDesktop ? "min(600px, 80vh)" : "70vh",
          marginRight: isDesktop ? "32px" : undefined,
          marginBottom: isDesktop ? "100px" : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
          <div>
            <span className="text-[12px] font-semibold" style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}>Comments</span>
            {comments.length > 0 && <span className="ml-2 text-[10px]" style={{ color: "rgba(212,175,55,0.6)" }}>{comments.length}</span>}
          </div>
          <button onClick={() => setCommentsOpen(false)} className="p-1.5 rounded-full transition-colors hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)" }}>
            <X size={14} />
          </button>
        </div>
        {/* Track info */}
        <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(212,175,55,0.06)" }}>
          {visTrack?.artUrl && <img src={visTrack.artUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold truncate" style={{ color: "#F5EDD8" }}>{visTrack?.title}</p>
            <p className="text-[10px] truncate" style={{ color: "rgba(212,175,55,0.6)" }}>{visTrack?.artist}</p>
          </div>
        </div>
        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              <MessageCircle size={28} />
              <p className="text-[11px]">No comments yet. Be the first.</p>
            </div>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="flex gap-2.5 group">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(212,175,55,0.15)", color: "rgba(212,175,55,0.8)" }}>
                  {(c.user?.name || c.user?.username || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold" style={{ color: "#F5EDD8" }}>{c.user?.name || c.user?.username || "Anonymous"}</span>
                    {c.createdAt && <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{new Date(c.createdAt).toLocaleDateString()}</span>}
                    {user && c.id && (
                      <button
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                        style={{ color: reportingCommentId === c.id ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.25)" }}
                        title="Report comment"
                        onClick={e => {
                          e.stopPropagation();
                          if (reportingCommentId === c.id) return;
                          setReportingCommentId(c.id);
                          reportCommentMutation.mutate({ commentId: c.id, reason: "other" });
                        }}
                      >
                        <Flag size={10} />
                      </button>
                    )}
                  </div>
                  <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Comment input */}
        <div className="px-4 pb-4 pt-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(212,175,55,0.1)" }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
              placeholder={user ? "Add a comment…" : "Sign in to comment"}
              disabled={!user || commentSubmitting}
              className="flex-1 text-[12px] px-3 py-2 rounded-xl outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.2)", color: "#F5EDD8" }}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!user || !commentText.trim() || commentSubmitting}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: "#C49A28", color: "#111009" }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  /* ── Cinematic overlay portal ── */
  const cinematicPortal = cinematic && visTrack ? createPortal(
    <div
      className="fixed inset-0"
      style={{
        zIndex: 99995,
        background: "#000",
        cursor: "pointer",
        // Entrance animation: fade + scale-up from slightly below
        animation: "ln-cinematic-enter 0.45s cubic-bezier(0.32,0.72,0,1) both",
      }}
      onClick={showCinematicOverlay}
    >
      {/* Depth layer 1: far background — heavy blur, low brightness */}
      {visTrack.artUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${visTrack.artUrl})`,
            backgroundSize: "cover",
            backgroundPosition: `${visTrack.coverPositionX ?? 50}% ${visTrack.coverPositionY ?? 50}%`,
            filter: "blur(60px) brightness(0.25) saturate(1.6)",
            transform: "scale(1.15)",
            // Parallax: background shifts slightly opposite to swipe
            transition: swipeDelta === 0 ? "transform 0.6s ease" : "none",
            ...(swipeDelta !== 0 ? { transform: `scale(1.15) translateX(${-swipeDelta * 0.04}px)` } : {}),
          }}
        />
      )}
      {/* Depth layer 2: mid vignette — radial dark gradient for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* Depth layer 3: gold ambient glow behind artwork */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: "120px", pointerEvents: "none" }}
      >
        <div
          style={{
            width: "min(420px, 88vw)",
            height: "min(420px, 88vw)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)",
            filter: "blur(24px)",
            transform: swipeDelta !== 0 ? `translateX(${Math.sign(swipeDelta) * Math.min(Math.abs(swipeDelta) * 0.15, 20)}px)` : undefined,
            transition: swipeDelta === 0 ? "transform 0.5s ease" : "none",
          }}
        />
      </div>
      {/* Center artwork */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "120px" }}>
        <div
          className="relative rounded-3xl overflow-hidden select-none"
          style={{
            width: "min(380px, 80vw)",
            height: "min(380px, 80vw)",
            boxShadow: `0 32px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.35), 0 0 80px rgba(212,175,55,0.2)`,
            transform: swipeDelta !== 0
              ? `translateX(${Math.sign(swipeDelta) * Math.min(Math.abs(swipeDelta) * 0.3, 30)}px) rotate(${Math.sign(swipeDelta) * Math.min(Math.abs(swipeDelta) * 0.02, 3)}deg) scale(${swipeDelta !== 0 ? 0.97 : 1})`
              : undefined,
            transition: swipeDelta === 0 ? "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease" : "none",
          }}
          onPointerDown={onArtPointerDown}
          onPointerMove={onArtPointerMove}
          onPointerUp={onArtPointerUp}
          onPointerCancel={onArtPointerUp}
        >
          {visTrack.artUrl
            ? <img src={visTrack.artUrl} alt={visTrack.title} className="w-full h-full object-cover" style={{ objectPosition: `${visTrack.coverPositionX ?? 50}% ${visTrack.coverPositionY ?? 50}%` }} />
            : <div className="w-full h-full flex items-center justify-center text-8xl" style={{ background: visTrack.bg || "#111009" }}>{visTrack.emoji || "🎵"}</div>
          }
          {swipeDir && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(2px)" }}>
              <span className="text-5xl" style={{ color: "#D4AF37", filter: "drop-shadow(0 0 20px #D4AF37) drop-shadow(0 0 40px rgba(212,175,55,0.5))" }}>{swipeDir === "left" ? "▶" : "◄"}</span>
            </div>
          )}
        </div>
      </div>
      {/* Overlay controls — auto-hide after 3s */}
      <div
        className="absolute inset-0 flex flex-col justify-between"
        style={{ transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)", opacity: cinematicOverlay ? 1 : 0, pointerEvents: cinematicOverlay ? "auto" : "none" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6" style={{ paddingTop: "max(24px, env(safe-area-inset-top, 24px))" }}>
          <button
            onClick={e => { e.stopPropagation(); setCinematic(false); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-white/10"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.8)" }}
          >
            <ChevronDown size={18} />
            <span className="text-[11px] font-medium">Exit Cinematic</span>
          </button>
          <div className="text-[9px] font-mono tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Cinematic</div>
          {visTrack.witnessId ? (
            <button onClick={e => { e.stopPropagation(); setCinematic(false); goToVerify(); }} className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(74,222,128,0.5)", color: "#4ade80", backdropFilter: "blur(4px)" }}>
              <Shield size={8} /> WID
            </button>
          ) : <div className="w-12" />}
        </div>
        {/* Bottom controls */}
        <div className="px-6 pb-8" style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))" }}>
          <div className="text-center mb-4">
            <p className="text-[18px] font-semibold" style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif", textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}>{visTrack.title}</p>
            <p className="text-[13px] mt-1" style={{ color: "rgba(212,175,55,0.8)", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>{visTrack.artist}</p>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>{fmtTime(state.currentTime)}</span>
            <div className="flex-1 cursor-pointer" style={{ background: "rgba(255,255,255,0.15)", height: "3px", borderRadius: "2px" }} onClick={handleSeek}>
              <div style={{ width: `${progress}%`, background: "#D4AF37", height: "100%", borderRadius: "2px", position: "relative" }}>
                <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%) translateX(50%)", width: "12px", height: "12px", borderRadius: "50%", background: "#F5E6B3", boxShadow: "0 0 12px rgba(245,230,179,0.8)" }} />
              </div>
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>{fmtTime(state.duration, isReady)}</span>
          </div>
          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button onClick={e => { e.stopPropagation(); prevTrack(); }} style={{ color: "rgba(255,255,255,0.7)" }}><SkipBack size={24} fill="currentColor" /></button>
            <button
              onClick={e => { e.stopPropagation(); togglePlay(); }}
              className="flex items-center justify-center rounded-full transition-transform hover:scale-105"
              style={{ width: "64px", height: "64px", background: "#D4AF37", color: "#000", boxShadow: "0 0 20px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.25)" }}
            >
              {state.isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" style={{ marginLeft: "3px" }} />}
            </button>
            <button onClick={e => { e.stopPropagation(); nextTrack(); }} style={{ color: "rgba(255,255,255,0.7)" }}><SkipForward size={24} fill="currentColor" /></button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  /* ── Modals ── */
  const modals = (
    <>
      {tipOpen && currentSongId && (
        <PlayerTipModal
          songId={currentSongId}
          songTitle={visTrack?.title}
          artistName={visTrack?.artist || "this creator"}
          genre={visTrack?.genre}
          witnessId={visTrack?.witnessId}
          artUrl={visTrack?.artUrl}
          artType={visTrack?.artType}
          coverPositionX={visTrack?.coverPositionX}
          coverPositionY={visTrack?.coverPositionY}
          stripeAccountId={creatorStripeAccountId}
          onClose={() => setTipOpen(false)}
        />
      )}
      <AddToCollectionModal
        open={!!(addToCollectionOpen && currentSongId)}
        songId={currentSongId ?? 0}
        songTitle={visTrack?.title ?? ""}
        onClose={() => setAddToCollectionOpen(false)}
      />
    </>
  );

  return createPortal(
    <>
      {content}
      {volumePortal}
      {contextMenuPortal}
      {commentsDrawer}
      {cinematicPortal}
      {modals}
    </>,
    document.body
  );
}

// Memoized export — prevents re-renders from parent layout changes (Decision #5)
const GlobalPlayer = memo(GlobalPlayerInner);
export default GlobalPlayer;
