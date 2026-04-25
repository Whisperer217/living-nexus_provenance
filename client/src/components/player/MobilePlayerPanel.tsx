/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobilePlayerPanel v3.0
   Structure:
   • Full-bleed artwork — ALWAYS visible (cinematic mode = overlay fade, not hide)
   • Title + Creator + WID badge — ALWAYS visible above controls
   • Right-side emotional action stack: Love | Share | Comment
   • Functional row: Gift | Details | Sound
   • Tabbed BottomSheet: Details / Lyrics / Comments (swipe-down to close)
   • Tap artwork toggles overlay controls (but identity info stays)
   • Video: muted visual loop, audio is source of truth
   • No scroll lock — panel is scrollable end-to-end
   Divine Noir — Orbitron/Cinzel, gold/cyan palette
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX,
  Heart, X, Music, DollarSign, Users,
  Share2, ChevronDown, MessageCircle, Info,
  Check, Shield, Tag, FileText, User, BookOpen,
} from "lucide-react";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import PlayerTipModal from "./PlayerTipModal";
import { AiDisclosurePill } from "@/components/AiDisclosurePill";

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// Floating heart particle
function HeartParticle({ id, onDone }: { id: number; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), 900);
    return () => clearTimeout(t);
  }, [id, onDone]);
  const left = 30 + Math.random() * 40;
  return (
    <div
      className="absolute pointer-events-none select-none text-xl"
      style={{
        left: `${left}%`,
        bottom: "20%",
        animation: "heartFloat 0.9s ease-out forwards",
        zIndex: 60,
      }}
    >
      ❤️
    </div>
  );
}

type BottomSheetTab = "details" | "lyrics" | "comments";

export default function MobilePlayerPanel() {
  const {
    state, audioRef, allTracks,
    togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute,
    setVolume, seek,
    isNowPlayingPanelOpen, openNowPlayingPanel, closeNowPlayingPanel,
    queueContextLabel,
  } = usePlayer();
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  const open = isNowPlayingPanelOpen;
  const togglePanel = () => isNowPlayingPanelOpen ? closeNowPlayingPanel() : openNowPlayingPanel();

  // LAYER AUTHORITY: Close panel on route change — one primary surface at a time
  useEffect(() => {
    if (open) closeNowPlayingPanel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Cinematic mode: controls overlay fades, but identity (title/WID/art) ALWAYS visible
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<BottomSheetTab>("details");

  // Tip modal
  const [tipOpen, setTipOpen] = useState(false);

  // Share copied
  const [copied, setCopied] = useState(false);

  // Heart particles
  const [hearts, setHearts] = useState<number[]>([]);
  const heartCounter = useRef(0);

  // Draggable floating tab
  const STORAGE_KEY = "ln_player_tab_top";
  const DEFAULT_TOP = () => Math.max(0, window.innerHeight - 220);
  const [tabTop, setTabTop] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : DEFAULT_TOP();
    } catch { return DEFAULT_TOP(); }
  });
  const dragStartY = useRef<number | null>(null);
  const dragStartTop = useRef<number>(0);
  const isDragging = useRef(false);

  const onTabTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartTop.current = tabTop;
    isDragging.current = false;
  }, [tabTop]);

  const onTabTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (Math.abs(delta) > 4) isDragging.current = true;
    if (!isDragging.current) return;
    e.stopPropagation();
    const newTop = Math.max(60, Math.min(window.innerHeight - 160, dragStartTop.current + delta));
    setTabTop(newTop);
  }, []);

  const onTabTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      try { sessionStorage.setItem(STORAGE_KEY, String(tabTop)); } catch {}
    }
    dragStartY.current = null;
    isDragging.current = false;
  }, [tabTop]);

  // Grab-handle swipe down to close
  const grabTouchStartY = useRef<number | null>(null);
  const onGrabTouchStart = (e: React.TouchEvent) => { grabTouchStartY.current = e.touches[0].clientY; };
  const onGrabTouchEnd = (e: React.TouchEvent) => {
    if (grabTouchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - grabTouchStartY.current;
    if (delta > 60) closeNowPlayingPanel();
    grabTouchStartY.current = null;
  };

  // Sheet swipe down to close
  const sheetTouchStartY = useRef<number | null>(null);
  const onSheetTouchStart = (e: React.TouchEvent) => { sheetTouchStartY.current = e.touches[0].clientY; };
  const onSheetTouchEnd = (e: React.TouchEvent) => {
    if (sheetTouchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - sheetTouchStartY.current;
    if (delta > 60) setSheetOpen(false);
    sheetTouchStartY.current = null;
  };

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 60_000 }
  );
  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;
  const song = songDetail?.song as any;
  const creator = songDetail?.creator as any;
  const lyricsText = song?.lyricsText as string | null | undefined;

  // Comments
  const { data: commentsData, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: currentSongId! },
    { enabled: sheetOpen && sheetTab === "comments" && !!currentSongId && !isNaN(currentSongId), staleTime: 30_000 }
  );
  const addCommentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { refetchComments(); setNewComment(""); },
  });
  const [newComment, setNewComment] = useState("");
  const submitComment = useCallback(() => {
    if (!newComment.trim() || !currentSongId) return;
    addCommentMutation.mutate({
      songId: currentSongId,
      content: newComment.trim(),
      authorName: user?.name ?? "Anonymous",
    });
  }, [newComment, currentSongId, addCommentMutation, user]);

  // DB-backed like
  const { data: likeStatusData, refetch: refetchLikeStatus } = trpc.songs.getLikeStatus.useQuery(
    { songId: currentSongId! },
    { enabled: !!user && !!currentSongId && !isNaN(currentSongId) }
  );
  const isLiked = !!likeStatusData?.liked;
  const toggleLikeMutation = trpc.songs.toggleLike.useMutation({
    onSuccess: () => refetchLikeStatus(),
  });

  const handleLove = useCallback(() => {
    if (!user || !currentSongId || isNaN(currentSongId)) return;
    toggleLikeMutation.mutate({ songId: currentSongId });
    const id = heartCounter.current++;
    setHearts(h => [...h, id]);
  }, [user, currentSongId, toggleLikeMutation]);

  const removeHeart = useCallback((id: number) => {
    setHearts(h => h.filter(x => x !== id));
  }, []);

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);

  const handleSeekTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.touches[0].clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);

  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    // Always use /song/:id — canonical shareable URL with server-side OG tags
    const url = currentSongId ? `${window.location.origin}/song/${currentSongId}` : window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: currentTrack.title || "", url }); return; }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [currentTrack, currentSongId]);

  // Tap artwork to toggle controls overlay (identity always stays)
  const handleArtTap = useCallback(() => {
    if (sheetOpen) return; // don't toggle when sheet is open
    setControlsVisible(v => !v);
  }, [sheetOpen]);

  // Auto-restore controls after 4s
  useEffect(() => {
    if (!controlsVisible) {
      controlsHideTimer.current = setTimeout(() => setControlsVisible(true), 4000);
    }
    return () => { if (controlsHideTimer.current) clearTimeout(controlsHideTimer.current); };
  }, [controlsVisible]);

  // Reset on track change
  useEffect(() => {
    setControlsVisible(true);
    setSheetOpen(false);
    setNewComment("");
  }, [currentTrack?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (sheetOpen) setSheetOpen(false);
        else closeNowPlayingPanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sheetOpen, closeNowPlayingPanel]);

  // Background video — muted visual loop, audio is source of truth
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = song?.videoUrl as string | null | undefined;
  const videoWitnessId = song?.videoWitnessId as string | null | undefined;
  const [videoBuffering, setVideoBuffering] = useState(true);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    // Video is always muted — audio element is the source of truth
    vid.muted = true;
    vid.loop = true;
    if (state.isPlaying && open) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [state.isPlaying, open, videoUrl]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    const onWaiting  = () => setVideoBuffering(true);
    const onCanPlay  = () => setVideoBuffering(false);
    const onPlaying  = () => setVideoBuffering(false);
    const onError    = () => setVideoBuffering(false);
    vid.addEventListener("waiting",  onWaiting);
    vid.addEventListener("canplay",  onCanPlay);
    vid.addEventListener("playing",  onPlaying);
    vid.addEventListener("error",    onError);
    return () => {
      vid.removeEventListener("waiting",  onWaiting);
      vid.removeEventListener("canplay",  onCanPlay);
      vid.removeEventListener("playing",  onPlaying);
      vid.removeEventListener("error",    onError);
    };
  }, [videoUrl]);

  const showVideo = state.isPlaying && !videoBuffering && !!videoUrl;

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) { vid.pause(); vid.currentTime = 0; }
    setVideoBuffering(true);
  }, [currentTrack?.id]);

  // Open sheet with specific tab
  const openSheet = useCallback((tab: BottomSheetTab) => {
    setSheetTab(tab);
    setSheetOpen(true);
    setControlsVisible(true); // always show controls when sheet opens
  }, []);

  return (
    <>
      {/* ── Floating tab (right edge, draggable) ── */}
      {/* Outer div: handles drag only — NOT a click target */}
      <div
        onTouchStart={onTabTouchStart}
        onTouchMove={onTabTouchMove}
        onTouchEnd={onTabTouchEnd}
        className="md:hidden fixed z-[25] flex flex-col items-center justify-center gap-1"
        style={{
          right: 0,
          top: `${tabTop}px`,
          width: "44px",
          paddingTop: "10px",
          paddingBottom: "10px",
          borderRadius: "10px 0 0 10px",
          background: "#000000",
          border: "1px solid #111009",
          borderRight: "none",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.50), -2px 0 8px rgba(196,154,40,0.12)",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* Art thumbnail — visual only, no click */}
        <div
          className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center pointer-events-none"
          style={{ background: currentTrack?.bg || "var(--ln-coal)" }}
        >
          {currentTrack?.artUrl && currentTrack.artType !== "video" ? (
            <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover"
              style={{ objectPosition: `${currentTrack.coverPositionX ?? 50}% ${currentTrack.coverPositionY ?? 50}%` }} />
          ) : currentTrack?.artUrl && currentTrack.artType === "video" ? (
            <video src={currentTrack.artUrl} className="w-full h-full object-cover" muted />
          ) : (
            <Music className="w-4 h-4 opacity-40 text-white" />
          )}
        </div>
        {/* Wave bars — visual only, no click */}
        {state.isPlaying && (
          <div className="flex items-end gap-[2px] h-3 pointer-events-none">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-[3px] rounded-full"
                style={{ background: "var(--ln-iron)", animation: `mobileWave 0.8s ease-in-out ${i * 0.15}s infinite alternate`, height: "6px" }} />
            ))}
          </div>
        )}
        {/* Arrow button — ONLY this triggers open/close */}
        <button
          onClick={(e) => { e.stopPropagation(); if (!isDragging.current) togglePanel(); }}
          aria-label={open ? "Collapse player" : "Expand player"}
          className="flex items-center justify-center w-8 h-6 rounded transition-colors hover:bg-white/10 active:scale-90"
          style={{ touchAction: "manipulation" }}
        >
          <span
            className="text-white/60 transition-transform duration-300 select-none"
            style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", fontSize: "14px", lineHeight: 1 }}
          >
            ›
          </span>
        </button>
      </div>

      {/* ── Backdrop — dims page when panel is open, capped above player bar ── */}
      {open && (
        <div
          className="md:hidden fixed z-[34]"
          style={{
            top: 0, left: 0, right: 0, bottom: "68px",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
          }}
          onClick={closeNowPlayingPanel}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
          QUICK PLAY PANEL — slides in from bottom
          Capped: top=0, bottom=68px (above global player bar)
          Never covers the player bar. Never extends below it.
      ════════════════════════════════════════════════════════════ */}
      <div
        className="md:hidden fixed z-[35] flex flex-col
          transition-transform duration-500 ease-in-out"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: "68px",
          background: "#000000",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.80)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
        }}
      >
        {/* ══ ARTWORK SECTION — full-bleed, dominant, ALWAYS visible ══ */}
        <div
          className="relative flex-shrink-0"
          style={{ height: "55vh", minHeight: "220px", maxHeight: "480px" }}
        >
          {/* Background video — muted visual loop */}
          {videoUrl && (
            <video ref={videoRef} src={videoUrl}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: showVideo ? 1 : 0 }}
              playsInline loop muted preload="metadata" />
          )}

          {/* Cover art — ALWAYS rendered, fallback to placeholder */}
          {currentTrack?.artUrl ? (
            <img src={currentTrack.artUrl} alt={currentTrack.title || "Track artwork"}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{
                opacity: showVideo ? 0 : 1,
                objectPosition: `${currentTrack.coverPositionX ?? 50}% ${currentTrack.coverPositionY ?? 50}%`,
              }} />
          ) : (
            /* Placeholder — always show something, never blank */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: currentTrack?.bg || "var(--ln-coal)" }}>
              <Music className="w-16 h-16 opacity-20 text-white" />
              {currentTrack && (
                <span className="text-[11px] opacity-30 text-white font-body px-4 text-center line-clamp-2">
                  {currentTrack.title}
                </span>
              )}
            </div>
          )}

          {/* Gradient fade — bottom of artwork into controls */}
          <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, #000000)" }} />

          {/* Tap zone — toggle controls overlay (identity always stays) */}
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={handleArtTap} />

          {/* Heart particles */}
          {hearts.map(id => <HeartParticle key={id} id={id} onDone={removeHeart} />)}

          {/* ── Swipe-down handle ── */}
          <div className="absolute top-2 inset-x-0 flex justify-center z-20 pointer-events-none">
            <div className="rounded-full" style={{ width: "40px", height: "4px", background: "rgba(196,154,40,0.2)" }} />
          </div>

          {/* ── Header controls ── */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-8 z-20">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(196,154,40,0.5)", fontFamily: "'Cinzel', serif" }}>
                Now Playing
              </span>
              {queueContextLabel && (
                <span className="text-[8px] tracking-wider"
                  style={{ color: "rgba(196,154,40,0.3)", fontFamily: "'Cinzel', serif" }}>
                  {queueContextLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={closeNowPlayingPanel}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-all"
                style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
                <ChevronDown size={16} />
              </button>
              <button type="button" onClick={closeNowPlayingPanel}
                className="p-1.5 rounded-lg text-white/30 hover:text-white transition-all"
                style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── RIGHT-SIDE EMOTIONAL ACTION STACK — always interactive ── */}
          <div
            className="absolute right-4 bottom-20 flex flex-col items-center gap-5 z-20"
            style={{ pointerEvents: "auto" }}
          >
            {/* Love ❤️ */}
            <button
              onClick={(e) => { e.stopPropagation(); handleLove(); }}
              disabled={!user}
              className="flex flex-col items-center gap-1 group"
              title={!user ? "Sign in to love" : isLiked ? "Loved" : "Love"}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: isLiked ? "rgba(239,68,68,0.25)" : "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(8px)",
                  border: isLiked ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(196,154,40,0.10)",
                  boxShadow: isLiked ? "0 0 12px rgba(196,68,10,0.3)" : "none",
                }}
              >
                <Heart size={18} fill={isLiked ? "var(--ln-ember)" : "none"}
                  style={{ color: isLiked ? "var(--ln-ember)" : "rgba(196,154,40,0.6)" }} />
              </div>
              <span className="text-[9px]" style={{ color: "rgba(196,154,40,0.4)" }}>Love</span>
            </button>

            {/* Share 🔁 */}
            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: copied ? "rgba(196,154,40,0.15)" : "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(8px)",
                  border: copied ? "1px solid rgba(196,154,40,0.3)" : "1px solid rgba(196,154,40,0.10)",
                }}
              >
                {copied
                  ? <Check size={18} style={{ color: "var(--ln-gold)" }} />
                  : <Share2 size={18} style={{ color: "rgba(196,154,40,0.6)" }} />}
              </div>
              <span className="text-[9px]" style={{ color: "rgba(196,154,40,0.4)" }}>
                {copied ? "Copied!" : "Share"}
              </span>
            </button>

            {/* Comment 💬 */}
            <button
              onClick={(e) => { e.stopPropagation(); openSheet("comments"); }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: (sheetOpen && sheetTab === "comments") ? "rgba(56,189,248,0.25)" : "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(8px)",
                  border: (sheetOpen && sheetTab === "comments") ? "1px solid rgba(56,189,248,0.4)" : "1px solid rgba(196,154,40,0.10)",
                }}
              >
                <MessageCircle size={18} style={{ color: (sheetOpen && sheetTab === "comments") ? "#38BDF8" : "rgba(196,154,40,0.6)" }} />
              </div>
              <span className="text-[9px]" style={{ color: "rgba(196,154,40,0.4)" }}>
                {commentsData?.length ? commentsData.length : ""}Comment
              </span>
            </button>
          </div>

          {/* Video WID badge */}
          {videoWitnessId && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/verify/${videoWitnessId}`); }}
              className="absolute top-12 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold tracking-wide z-20"
              style={{
                background: "rgba(44,52,56,0.88)",
                border: "1px solid rgba(74,222,128,0.5)",
                color: "var(--ln-seal-bright)",
                backdropFilter: "blur(4px)",
              }}
            >
              ✓ Video WID
            </button>
          )}
        </div>

        {/* ══ TRACK IDENTITY — ALWAYS VISIBLE (cinematic mode keeps this) ══ */}
        <div className="flex-shrink-0 px-6 pt-4 pb-2">
          {/* Title */}
          <button
            onClick={() => { if (currentSongId) navigate(`/song/${currentSongId}`); }}
            disabled={!currentSongId}
            className="text-xl font-semibold leading-snug line-clamp-1 text-left w-full
              transition-opacity hover:opacity-75 disabled:cursor-default"
            style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
          >
            {currentTrack?.title || "No track selected"}
          </button>
          {/* Artist */}
          <button
            onClick={() => { if (creator?.id) navigate(`/creator/${creator.id}`); }}
            disabled={!creator?.id}
            className="text-sm truncate mt-0.5 text-left w-full transition-opacity hover:opacity-75 disabled:cursor-default"
            style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}
          >
            {currentTrack?.artist || "—"}
          </button>
          {/* WID badge — always visible */}
          {currentTrack?.witnessId && (
            <button
              onClick={() => navigate(`/verify/${currentTrack.witnessId}`)}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1 rounded-full
                transition-opacity hover:opacity-80"
              style={{
                background: "rgba(196,154,40,0.08)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.25)",
              }}
              title="View Witness Certificate"
            >
              <Shield size={10} />
              WID: {currentTrack.witnessId.slice(0, 14)}…
            </button>
          )}
        </div>

        {/* ══ PROGRESS BAR — always visible ══ */}
        <div className="flex-shrink-0 px-6 pb-2">
          <div
            className="relative h-1 rounded-full cursor-pointer"
            style={{ background: "rgba(196,154,40,0.09)" }}
            onClick={handleSeek}
            onTouchMove={handleSeekTouch}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: "var(--ln-gold)" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
              {fmtTime(state.currentTime)}
            </span>
            <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
              {fmtTime(state.duration)}
            </span>
          </div>
        </div>

        {/* ══ PLAYER CONTROLS — fade in cinematic mode, but always tappable ══ */}
        <div
          className="flex-shrink-0 px-6 pb-3 transition-opacity duration-500"
          style={{ opacity: controlsVisible ? 1 : 0.15 }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={toggleShuffle}
              className="p-2 transition-colors"
              style={{ color: state.isShuffle ? "var(--ln-gold)" : "var(--ln-iron)" }}
            >
              <Shuffle size={18} />
            </button>
            <button type="button" onClick={prevTrack} className="p-2" style={{ color: "var(--ln-parchment)" }}>
              <SkipBack size={24} />
            </button>
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform
                hover:scale-105 active:scale-95 shadow-xl"
              style={{
                background: "var(--ln-parchment)",
                color: "var(--ln-coal)",
                boxShadow: "0 0 24px rgba(196,154,40,0.2)",
              }}
            >
              {state.isPlaying
                ? <Pause size={22} fill="currentColor" />
                : <Play size={22} fill="currentColor" className="ml-0.5" />}
            </button>
            <button type="button" onClick={nextTrack} className="p-2" style={{ color: "var(--ln-parchment)" }}>
              <SkipForward size={24} />
            </button>
            <button
              onClick={toggleRepeat}
              className="p-2 transition-colors"
              style={{ color: state.isRepeat ? "var(--ln-gold)" : "var(--ln-iron)" }}
            >
              <Repeat size={18} />
            </button>
          </div>
        </div>

        {/* ══ FUNCTIONAL ROW — Gift | Details | Lyrics | Sound ══ */}
        <div className="flex-shrink-0 px-6 pb-4">
          <div className="flex items-center gap-2">
            {/* Gift */}
            <button
              onClick={() => {
                if (!tipsEnabled || !currentTrack) return;
                setTipOpen(true);
              }}
              disabled={!tipsEnabled || !currentTrack}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold
                transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
              style={{
                background: tipsEnabled ? "rgba(196,154,40,0.08)" : "var(--ln-coal)",
                color: tipsEnabled ? "var(--ln-gold)" : "var(--ln-iron)",
                border: tipsEnabled ? "1px solid rgba(196,154,40,0.2)" : "1px solid #111009",
                fontFamily: "'Cinzel', serif",
              }}
              title={tipsEnabled ? "Gift creator" : "Tips not enabled"}
            >
              <DollarSign size={12} />
              Gift
            </button>

            {/* Details */}
            <button
              onClick={() => openSheet("details")}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold
                transition-all active:scale-95"
              style={{
                background: (sheetOpen && sheetTab === "details") ? "rgba(56,189,248,0.15)" : "var(--ln-coal)",
                color: (sheetOpen && sheetTab === "details") ? "#38BDF8" : "var(--ln-smoke)",
                border: (sheetOpen && sheetTab === "details") ? "1px solid rgba(56,189,248,0.35)" : "1px solid #111009",
                fontFamily: "'Cinzel', serif",
              }}
            >
              <Info size={12} />
              Details
            </button>

            {/* Lyrics */}
            <button
              onClick={() => openSheet("lyrics")}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold
                transition-all active:scale-95"
              style={{
                background: (sheetOpen && sheetTab === "lyrics") ? "rgba(170,142,100,0.15)" : "var(--ln-coal)",
                color: (sheetOpen && sheetTab === "lyrics") ? "var(--ln-parchment)" : "var(--ln-smoke)",
                border: (sheetOpen && sheetTab === "lyrics") ? "1px solid rgba(170,142,100,0.35)" : "1px solid #111009",
                fontFamily: "'Cinzel', serif",
              }}
            >
              <BookOpen size={12} />
              Lyrics
            </button>

            {/* Sound */}
            <button
              onClick={toggleMute}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold
                transition-all active:scale-95"
              style={{
                background: state.isMuted ? "rgba(239,68,68,0.12)" : "var(--ln-coal)",
                color: state.isMuted ? "var(--ln-ember)" : "var(--ln-smoke)",
                border: state.isMuted ? "1px solid rgba(196,68,10,0.3)" : "1px solid #111009",
                fontFamily: "'Cinzel', serif",
              }}
            >
              {state.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              Sound
            </button>
          </div>
        </div>

        {/* ══ QUEUE CONTEXT + GRAB HANDLE ══ */}
        <div
          className="flex-shrink-0 flex flex-col items-center pb-6 pt-2 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={onGrabTouchStart}
          onTouchEnd={onGrabTouchEnd}
        >
          {currentTrack && (
            <div className="flex items-center gap-2 mt-3 px-4">
              <AddToPlaylistButton songId={currentSongId!} variant="full" className="flex-1" />
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TABBED BOTTOM SHEET — Details / Lyrics / Comments
          Overlays the player panel, swipe-down to close
      ══════════════════════════════════════════════════════════════ */}
      {open && (
        <div
          className="md:hidden fixed z-[60] transition-transform duration-300 ease-in-out flex flex-col"
          style={{
            bottom: 0,
            left: 0,
            right: 0,
            width: "100vw",
            height: "72vh",
            maxHeight: "600px",
            background: "#000000",
            borderTop: "1px solid #111009",
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.60)",
            transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
          onTouchStart={onSheetTouchStart}
          onTouchEnd={onSheetTouchEnd}
        >
          {/* Sheet drag handle */}
          <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="rounded-full" style={{ width: "40px", height: "4px", background: "#000000" }} />
          </div>

          {/* Tab bar */}
          <div className="flex-shrink-0 flex items-center gap-1 px-4 pb-3">
            {(["details", "lyrics", "comments"] as BottomSheetTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setSheetTab(tab)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all"
                style={{
                  background: sheetTab === tab ? "rgba(196,154,40,0.08)" : "transparent",
                  color: sheetTab === tab ? "var(--ln-gold)" : "var(--ln-smoke)",
                  border: sheetTab === tab ? "1px solid rgba(196,154,40,0.2)" : "1px solid transparent",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={() => setSheetOpen(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--ln-iron)" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Sheet content — scrollable */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#111009 transparent", overscrollBehavior: "contain" }}>

            {/* ── DETAILS TAB ── */}
            {sheetTab === "details" && (
              <div className="px-4 pb-4 space-y-3">
                {currentTrack?.witnessId && (
                  <div className="flex items-start gap-2.5">
                    <Shield size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ln-gold)" }} />
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--ln-smoke)" }}>Witness ID</div>
                      <button
                        onClick={() => { navigate(`/verify/${currentTrack.witnessId}`); setSheetOpen(false); }}
                        className="text-[11px] font-mono break-all text-left hover:opacity-75 transition-opacity"
                        style={{ color: "var(--ln-gold)" }}
                      >
                        {currentTrack.witnessId}
                      </button>
                    </div>
                  </div>
                )}
                {creator && (
                  <div className="flex items-start gap-2.5">
                    <User size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ln-seal-bright)" }} />
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--ln-smoke)" }}>Creator</div>
                      <button
                        onClick={() => { if (creator.id) { navigate(`/creator/${creator.id}`); setSheetOpen(false); } }}
                        className="text-[12px] font-semibold hover:opacity-75 transition-opacity"
                        style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
                      >
                        {creator.artistHandle || creator.name || "Unknown"}
                      </button>
                    </div>
                  </div>
                )}
                {song?.licenseStatus && (
                  <div className="flex items-start gap-2.5">
                    <FileText size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ln-smoke)" }} />
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--ln-smoke)" }}>License</div>
                      <span className="text-[12px] capitalize" style={{ color: "var(--ln-parchment)" }}>{song.licenseStatus}</span>
                    </div>
                  </div>
                )}
                {currentTrack?.aiDisclosure && (
                  <div className="flex items-start gap-2.5">
                    <Shield size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ln-ember)" }} />
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--ln-smoke)" }}>AI Disclosure</div>
                      <AiDisclosurePill value={currentTrack.aiDisclosure as any} size="full" showTooltip={false} />
                    </div>
                  </div>
                )}
                {currentTrack?.genre && (() => {
                  const tags = currentTrack.genre.split(',').map((t: string) => t.trim()).filter(Boolean);
                  if (tags.length === 0) return null;
                  const visible = tags.slice(0, 6);
                  const overflow = tags.length - visible.length;
                  return (
                    <div className="flex items-start gap-2.5">
                      <Tag size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ln-gold)" }} />
                      <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--ln-smoke)" }}>Genre / Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {visible.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-full font-body leading-none"
                              style={{
                                background: "rgba(44,52,56,0.8)",
                                color: "var(--ln-parchment)",
                                border: "1px solid rgba(44,52,56,0.6)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {overflow > 0 && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-body leading-none"
                              style={{
                                background: "rgba(44,52,56,0.6)",
                                color: "var(--ln-iron)",
                                border: "1px solid rgba(44,52,56,0.4)",
                              }}
                            >
                              +{overflow}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {currentSongId && (
                  <button
                    onClick={() => { navigate(`/song/${currentSongId}`); setSheetOpen(false); closeNowPlayingPanel(); }}
                    className="w-full mt-2 py-2 rounded-xl text-[11px] font-semibold tracking-wide transition-all active:scale-95"
                    style={{
                      background: "rgba(196,154,40,0.08)",
                      color: "var(--ln-gold)",
                      border: "1px solid rgba(196,154,40,0.17)",
                      fontFamily: "'Cinzel', serif",
                    }}
                  >
                    Open Full Song Page →
                  </button>
                )}
                {!currentTrack && (
                  <div className="text-center py-8 text-white/30 text-[12px]">No track selected</div>
                )}
              </div>
            )}

            {/* ── LYRICS TAB ── */}
            {sheetTab === "lyrics" && (
              <div className="px-4 pb-4">
                {lyricsText ? (
                  <pre
                    className="text-[13px] leading-relaxed whitespace-pre-wrap font-body"
                    style={{ color: "var(--ln-parchment)" }}
                  >
                    {lyricsText}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <BookOpen size={28} className="opacity-20" style={{ color: "var(--ln-gold)" }} />
                    <p className="text-[12px] italic text-center" style={{ color: "var(--ln-iron)" }}>
                      No lyrics available for this track.
                    </p>
                    {currentSongId && (
                      <button
                        onClick={() => { navigate(`/song/${currentSongId}`); setSheetOpen(false); closeNowPlayingPanel(); }}
                        className="text-[11px] px-3 py-1.5 rounded-lg transition-all"
                        style={{ color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }}
                      >
                        View song page
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── COMMENTS TAB ── */}
            {sheetTab === "comments" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 px-4 pb-2 space-y-3">
                  {commentsData && commentsData.length > 0 ? (
                    commentsData.map((c: any) => (
                      <div key={c.id} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                          style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)" }}>
                          {(c.authorName ?? "A")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold" style={{ color: "var(--ln-seal-bright)" }}>
                              {c.authorName ?? "Anonymous"}
                            </span>
                            <span className="text-[9px]" style={{ color: "var(--ln-iron)" }}>
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[12px] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <MessageCircle size={20} className="mx-auto mb-1.5 opacity-20" style={{ color: "var(--ln-gold)" }} />
                      <p className="text-[12px] italic" style={{ color: "var(--ln-iron)" }}>
                        No comments yet. Be the first.
                      </p>
                    </div>
                  )}
                </div>
                {/* Comment input — pinned to bottom of sheet */}
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2"
                  style={{ borderTop: "1px solid #111009" }}>
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                    placeholder={user ? "Leave a witness..." : "Sign in to comment"}
                    disabled={!user || addCommentMutation.isPending}
                    maxLength={1000}
                    className="flex-1 rounded-xl px-3 py-2 text-[12px] outline-none transition-colors disabled:opacity-50"
                    style={{
                      background: "#000000",
                      border: "1px solid #111009",
                      color: "var(--ln-parchment)",
                    }}
                  />
                  <button
                    onClick={submitComment}
                    disabled={!user || !newComment.trim() || addCommentMutation.isPending}
                    className="px-3 py-2 rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-40 active:scale-95"
                    style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sheet backdrop — dims the player panel behind the sheet */}
      {open && sheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-[55] bg-black/40"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes mobileWave {
          from { height: 3px; }
          to   { height: 10px; }
        }
        @keyframes heartFloat {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          60%  { opacity: 0.8; transform: translateY(-40px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
        }
      `}</style>

      {/* Tip Modal */}
      {tipOpen && currentSongId && (
        <PlayerTipModal
          songId={currentSongId}
          songTitle={currentTrack?.title}
          artistName={currentTrack?.artist || "this creator"}
          genre={currentTrack?.genre}
          witnessId={currentTrack?.witnessId}
          artUrl={currentTrack?.artUrl}
          coverPositionX={currentTrack?.coverPositionX}
          coverPositionY={currentTrack?.coverPositionY}
          stripeAccountId={creatorStripeAccountId}
          onClose={() => setTipOpen(false)}
        />
      )}
    </>
  );
}
