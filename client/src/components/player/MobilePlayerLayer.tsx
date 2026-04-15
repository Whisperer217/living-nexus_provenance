/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobilePlayerLayer v2.0 (Canonical Player)
   Full-viewport player layer — detached from layout tree via React portal.
   Three states:
     mini      → 64px bottom bar, always present when track loaded
     expanded  → full-screen sheet (100dvh), slides up from bottom
     cinematic → edge-to-edge artwork/video, tap to reveal controls
   Gesture model:
     mini      → swipe-up or tap artwork → expanded
     expanded  → swipe-down (≥60px) → mini
     expanded  → tap ⬛ cinematic button → cinematic
     cinematic → tap → toggle overlay controls
     cinematic → swipe-down (≥80px) → expanded
     landscape → reduced strip UI (play + scrubber + time only)
   Canonical layers (expanded state):
     1. WID provenance panel (expandable)
     2. Signal/reactions display with emoji breakdown
     3. Comments panel (WID-bound, expandable)
     4. "Take to Room" action button
═══════════════════════════════════════════════════════════════════ */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useLightsMode } from "@/contexts/LightsModeContext";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Heart, Music,
  Share2, DollarSign, ChevronDown,
  Maximize2, Check, Video, ListMusic,
  Volume2, VolumeX, Shield, MessageCircle,
  ChevronRight, Send, Users, Fingerprint,
  ExternalLink, Crown, ArrowUp,
  Home, Compass, Bell, User, Rocket, Sparkles, Loader2,
  MoreVertical, ListPlus, UserCircle2, Copy, Flag,
} from "lucide-react";
import GiftModal from "./GiftModal";
import { MediaAsset } from "@/components/MediaAsset";
import { overlayOpen, overlayClose } from "@/lib/overlayController";

// ── Helpers ────────────────────────────────────────────────────────
function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

type PlayerState = "mini" | "expanded" | "cinematic";

// Emoji reaction config
const EMOJI_REACTIONS = [
  { type: "fire",     emoji: "🔥", label: "Fire"     },
  { type: "love",     emoji: "❤️", label: "Love"     },
  { type: "grateful", emoji: "🙏", label: "Grateful" },
  { type: "magic",    emoji: "✨", label: "Magic"    },
  { type: "gem",      emoji: "💎", label: "Gem"      },
  { type: "vibe",     emoji: "🎵", label: "Vibe"     },
];

// ── Scrubber ───────────────────────────────────────────────────────
function Scrubber({
  progress, currentTime, duration, onSeek, onSeekTouch, thin = false,
}: {
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSeekTouch: (e: React.TouchEvent<HTMLDivElement>) => void;
  thin?: boolean;
}) {
  return (
    <div className="w-full select-none">
      <div
        className={`relative w-full rounded-full cursor-pointer ${thin ? "h-0.5" : "h-1"} group`}
        style={{ background: "rgba(196,154,40,0.14)" }}
        onClick={onSeek}
        onTouchMove={onSeekTouch}
        onTouchStart={onSeekTouch}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-100"
          style={{
            width: `${Math.min(100, progress)}%`,
            background: "linear-gradient(90deg, #C49A28, #C49A28)",
          }}
        />
        {!thin && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `calc(${Math.min(100, progress)}% - 6px)`,
              background: "#C49A28",
              boxShadow: "0 0 6px rgba(196,154,40,0.42)",
            }}
          />
        )}
      </div>
      {!thin && (
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono" style={{ color: "#6B6555" }}>
            {fmtTime(currentTime)}
          </span>
          <span className="text-[10px] font-mono" style={{ color: "#6B6555" }}>
            {fmtTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
// ── Discover Panel ──────────────────────────────────────────────────
function DiscoverPanel({
  songId,
  genre,
  onPlay,
  onPlayAll,
}: {
  songId: number | null;
  genre?: string | null;
  onPlay: (t: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
}) {
  const { data, isLoading } = trpc.songs.getRelated.useQuery(
    { songId: songId!, genre: genre ?? undefined },
    { enabled: !!songId && !isNaN(songId!), staleTime: 120_000 }
  );

  const toTrack = (s: any): Track => {
    const song = s.song ?? s;
    const creator = s.creator ?? {};
    return {
      id: String(song.id),
      title: song.title ?? "Untitled",
      artist: creator.name ?? creator.artistHandle ?? song.artistName ?? "Unknown",
      genre: song.genre ?? "",
      audioUrl: song.audioUrl ?? undefined,
      artUrl: song.coverArtUrl ?? undefined,
      witnessId: song.witnessId ?? undefined,
      creatorId: creator.id ?? undefined,
      creatorHandle: creator.artistHandle ?? undefined,
      creatorRole: creator.role ?? undefined,
      visualReady: song.visualReady ?? undefined,
      autoVideoUrl: song.autoVideoUrl ?? undefined,
      coverPositionX: song.coverPositionX ?? 50,
      coverPositionY: song.coverPositionY ?? 50,
    };
  };

  const tracks: Track[] = ((data ?? []) as any[])
    .map(toTrack)
    .filter((t) => !!t.audioUrl)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin" style={{ color: "#1C1A14" }} />
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
        <Sparkles size={24} style={{ color: "#111009" }} />
        <div className="text-[12px] font-heading" style={{ color: "#1C1A14" }}>
          No related tracks found
        </div>
        <div className="text-[10px]" style={{ color: "#111009" }}>
          Try exploring other genres
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 px-6 pb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-heading tracking-[0.18em] uppercase"
          style={{ color: "rgba(196,154,40,0.42)" }}>
          Related Tracks
        </div>
        {tracks.length > 1 && (
          <button
            onClick={() => onPlayAll(tracks)}
            className="flex items-center gap-1.5 text-[10px] font-heading tracking-wide px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{
              background: "rgba(196,154,40,0.08)",
              border: "1px solid rgba(196,154,40,0.20)",
              color: "#C49A28",
            }}
          >
            <Play size={10} fill="currentColor" />
            Play All
          </button>
        )}
      </div>
      {/* Track list */}
      <div className="flex flex-col gap-2">
        {tracks.map((track) => (
          <button
            key={track.id}
            onClick={() => onPlay(track)}
            className="flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98] text-left"
            style={{
              background: "rgba(44,52,56,0.6)",
              border: "1px solid rgba(44,52,56,0.5)",
            }}
          >
            {/* Art */}
            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden"
              style={{ background: "#111009" }}
            >
              {track.artUrl ? (
                <img src={track.artUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={16} style={{ color: "#1C1A14" }} />
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-heading text-white truncate leading-tight">
                {track.title}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: "#1C1A14" }}>
                {track.artist}
              </div>
              {track.genre && (
                <div
                  className="inline-block mt-1 text-[9px] font-heading tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(196,154,40,0.08)",
                    color: "rgba(230,205,174,0.7)",
                    border: "1px solid rgba(196,154,40,0.12)",
                  }}
                >
                  {track.genre}
                </div>
              )}
            </div>
            {/* Play icon */}
            <Play size={14} style={{ color: "rgba(196,154,40,0.35)", flexShrink: 0 }} />
          </button>
        ))}
      </div>
      {/* Spacer */}
      <div className="h-6" />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────
export default function MobilePlayerLayer() {
  const {
    state, audioRef, allTracks,
    togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute,
    setVolume, seek,
    queueContextLabel,
    patchTrack,
    addAndPlay, playQueueAt, playNext,
  } = usePlayer();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [playerState, setPlayerState] = useState<PlayerState>("mini");
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // Expanded sheet tab: "playing" | "discover"
  const [expandedTab, setExpandedTab] = useState<"playing" | "discover">("playing");
  // Canonical panel states
  const [widPanelOpen, setWidPanelOpen] = useState(false);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Scroll container ref — used to check scrollTop before triggering dismiss
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Scroll-to-top button visibility
  const [showScrollTop, setShowScrollTop] = useState(false);
  // Haptic feedback: track whether we've fired vibration for the current drag
  const hapticFiredRef = useRef(false);

  // Pinch-to-zoom artwork state
  const [artZoom, setArtZoom] = useState(1);
  const [artZoomed, setArtZoomed] = useState(false);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);

  const getPinchDist = (e: React.TouchEvent) => {
    const [t0, t1] = [e.touches[0], e.touches[1]];
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  };

  const onArtTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStartDistRef.current = getPinchDist(e);
      pinchStartZoomRef.current = artZoom;
    }
  };

  const onArtTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      e.preventDefault();
      const ratio = getPinchDist(e) / pinchStartDistRef.current;
      const next = Math.min(Math.max(pinchStartZoomRef.current * ratio, 1), 3);
      setArtZoom(next);
      setArtZoomed(next > 1.05);
    }
  };

  const onArtTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
  };

  const resetArtZoom = () => {
    setArtZoom(1);
    setArtZoomed(false);
  };

  // Overlay auto-hide timer in cinematic mode
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setOverlayVisible(false), 3000);
  }, []);

  // Detect landscape orientation
  useEffect(() => {
    const check = () => {
      setIsLandscape(window.matchMedia("(orientation: landscape)").matches);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // Body scroll lock: routed through global overlayController.
  // Controller is reference-counted — safe even if hamburger menu is also open.
  useEffect(() => {
    if (playerState === "expanded" || playerState === "cinematic") {
      overlayOpen("player-expanded");
    } else {
      overlayClose("player-expanded");
    }
    return () => {
      overlayClose("player-expanded");
    };
  }, [playerState]);

  // ── History API: intercept device back button ─────────────────
  // When entering expanded/cinematic, push a history entry so the device back
  // button steps back through player states instead of navigating the page.
  useEffect(() => {
    if (playerState === "mini") {
      // Popped back to mini — nothing to push
      return;
    }
    // Push a dummy history entry so the back button fires popstate here
    window.history.pushState({ playerState }, "");
  }, [playerState]);

  useEffect(() => {
    const handlePopState = (_e: PopStateEvent) => {
      // Only intercept if we're in expanded or cinematic state
      if (playerState === "cinematic") {
        // cinematic → expanded
        setPlayerState("expanded");
        // Push another entry so the next back goes expanded → mini
        window.history.pushState({ playerState: "expanded" }, "");
        return;
      }
      if (playerState === "expanded") {
        // expanded → mini
        setPlayerState("mini");
        return;
      }
      // mini — let the browser handle it (navigate back in page history)
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [playerState]);

  // Reset canonical panels when track changes
  useEffect(() => {
    setWidPanelOpen(false);
    setCommentsPanelOpen(false);
    setCommentText("");
  }, [state.currentIdx]);

  // ── Gesture: swipe-up on mini → expanded ──────────────────────
  const miniTouchStartY = useRef<number | null>(null);
  const miniDragLocked = useRef(false);
  const onMiniTouchStart = (e: React.TouchEvent) => {
    miniTouchStartY.current = e.touches[0].clientY;
    miniDragLocked.current = false;
    // Do NOT lock scroll on touchStart — only lock when actual upward drag is detected
    // in onMiniTouchMove. Locking here blocks the scroll div behind the mini bar.
  };
  const onMiniTouchMove = (e: React.TouchEvent) => {
    if (miniTouchStartY.current === null) return;
    const delta = miniTouchStartY.current - e.touches[0].clientY;
    // Only lock scroll once the user has dragged upward ≥8px (intent confirmed)
    if (!miniDragLocked.current && delta > 8) {
      miniDragLocked.current = true;
      // Use "light" mode: sets overflow:hidden only, does NOT set touchAction:none
      // on body. This prevents body scroll without killing the scroll div behind.
      overlayOpen("player-drag", "light");
    }
  };
  const onMiniTouchEnd = (e: React.TouchEvent) => {
    // Always restore scroll on release
    if (miniDragLocked.current) overlayClose("player-drag");
    miniDragLocked.current = false;
    if (miniTouchStartY.current === null) return;
    const delta = miniTouchStartY.current - e.changedTouches[0].clientY;
    if (delta > 120) setPlayerState("cinematic");
    else if (delta > 40) setPlayerState("expanded");
    miniTouchStartY.current = null;
  };
  const onMiniTouchCancel = () => {
    // Touch cancelled (e.g. incoming call, notification) — always clean up
    if (miniDragLocked.current) overlayClose("player-drag");
    miniDragLocked.current = false;
    miniTouchStartY.current = null;
  };

  // ── Gesture: swipe-down on expanded → mini (drag handle ONLY) ────────────────────
  // The dismiss gesture only fires when the scroll container is scrolled to the top.
  // This lets users freely scroll through comments/reactions while the song plays.
  const expandedTouchStartY = useRef<number | null>(null);
  const [expandedDragOffset, setExpandedDragOffset] = useState(0);
  const onExpandedTouchStart = (e: React.TouchEvent) => {
    expandedTouchStartY.current = e.touches[0].clientY;
    setExpandedDragOffset(0);
    hapticFiredRef.current = false;
    // Lock page scroll during expanded drag-to-dismiss
    overlayOpen("player-drag");
  };
  const onExpandedTouchMove = (e: React.TouchEvent) => {
    if (expandedTouchStartY.current === null) return;
    // Only allow dismiss drag when scroll container is at the very top
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    if (scrollTop > 4) {
      // User is scrolled down — cancel dismiss, let native scroll work
      expandedTouchStartY.current = null;
      setExpandedDragOffset(0);
      return;
    }
    const delta = e.touches[0].clientY - expandedTouchStartY.current;
    if (delta > 0) {
      const clamped = Math.min(delta, 200);
      setExpandedDragOffset(clamped);
      // Haptic pulse once when crossing the 60px dismiss threshold
      if (clamped >= 60 && !hapticFiredRef.current) {
        hapticFiredRef.current = true;
        try { navigator.vibrate?.(10); } catch {}
      } else if (clamped < 60) {
        hapticFiredRef.current = false;
      }
    }
  };
  const onExpandedTouchEnd = () => {
    // Always restore scroll on release
    overlayClose("player-drag");
    if (expandedDragOffset > 60) {
      setPlayerState("mini");
    }
    setExpandedDragOffset(0);
    expandedTouchStartY.current = null;
    hapticFiredRef.current = false;
  };
  const onExpandedTouchCancel = () => {
    // Touch cancelled — always clean up to prevent stuck scroll lock
    overlayClose("player-drag");
    setExpandedDragOffset(0);
    expandedTouchStartY.current = null;
    hapticFiredRef.current = false;
  };
  // ── Gesture: swipe-down on cinematic → expanded ────────────────
  const cinematicTouchStartY = useRef<number | null>(null);
  const onCinematicTouchStart = (e: React.TouchEvent) => {
    cinematicTouchStartY.current = e.touches[0].clientY;
    showOverlay();
  };
  const onCinematicTouchEnd = (e: React.TouchEvent) => {
    if (cinematicTouchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - cinematicTouchStartY.current;
    if (delta > 80) setPlayerState("expanded");
    cinematicTouchStartY.current = null;
  };

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail — poll every 30s while visualReady is false so the shimmer
  // disappears and the video fades in automatically once the worker finishes.
  const isTrackVisualPending = currentTrack?.visualReady === false;
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    {
      enabled: !!currentSongId && !isNaN(currentSongId),
      staleTime: 60_000,
      refetchInterval: isTrackVisualPending ? 30_000 : false,
    }
  );
  // When the 30s poll returns visualReady:true, patch the track in the queue so
  // the shimmer clears and the video fades in without a page reload.
  const songDetailVisualReady = (songDetail?.song as any)?.visualReady as boolean | undefined;
  const songDetailAutoVideoUrl = (songDetail?.song as any)?.autoVideoUrl as string | null | undefined;
  useEffect(() => {
    if (!currentTrack || !songDetailVisualReady) return;
    if (currentTrack.visualReady === true) return; // already patched
    patchTrack(currentTrack.id, {
      visualReady: true,
      autoVideoUrl: songDetailAutoVideoUrl ?? currentTrack.autoVideoUrl,
    });
  }, [songDetailVisualReady, songDetailAutoVideoUrl, currentTrack, patchTrack]);

  const stripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const videoUrl = (songDetail?.song as any)?.videoUrl as string | null | undefined;
  const videoWitnessId = (songDetail?.song as any)?.videoWitnessId as string | null | undefined;
  const lyricsText = (songDetail?.song as any)?.lyricsText as string | null | undefined;
  const creatorId = currentTrack?.creatorId ?? (songDetail?.creator as any)?.id ?? null;

  // WID — prefer track.witnessId, fall back to videoWitnessId
  const widBadge = currentTrack?.witnessId || videoWitnessId || null;

  // ── Sync --player-height CSS token so scroll area padding is exact ──────────
  // When no track is loaded the MiniBar is hidden, so the bottom stack should
  // only account for the nav bar — not the extra 64px mini-player height.
  // This eliminates the "black dead zone" gap below content on mobile.
  useEffect(() => {
    const root = document.documentElement;
    if (currentTrack) {
      root.style.setProperty("--player-height", "64px");
    } else {
      root.style.setProperty("--player-height", "0px");
    }
    return () => {
      // Restore default on unmount (desktop fallback)
      root.style.removeProperty("--player-height");
    };
  }, [!!currentTrack]);

  // Like state
  const { data: likeStatusData, refetch: refetchLikeStatus } = trpc.songs.getLikeStatus.useQuery(
    { songId: currentSongId! },
    { enabled: !!user && !!currentSongId && !isNaN(currentSongId) }
  );
  const isLiked = !!likeStatusData?.liked;
  const toggleLikeMutation = trpc.songs.toggleLike.useMutation({
    onSuccess: () => refetchLikeStatus(),
  });
  const handleToggleLike = useCallback(() => {
    if (!user || !currentSongId) return;
    toggleLikeMutation.mutate({ songId: currentSongId });
  }, [user, currentSongId, toggleLikeMutation]);

  // Reactions
  const { data: reactionsData, refetch: refetchReactions } = trpc.songs.getReactions.useQuery(
    { songId: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 30_000 }
  );
  const reactionCounts = reactionsData?.counts ?? {};
  const myReactions = reactionsData?.mine ?? [];
  const toggleReactionMutation = trpc.songs.toggleReaction.useMutation({
    onSuccess: () => refetchReactions(),
  });
  const handleToggleReaction = useCallback((type: string) => {
    if (!user || !currentSongId) return;
    toggleReactionMutation.mutate({ songId: currentSongId, type });
  }, [user, currentSongId, toggleReactionMutation]);

  // Witness Activity — live listener count (poll every 30s)
  const { data: listenerData } = trpc.songs.getListenerCount.useQuery(
    { songId: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), refetchInterval: 30_000, staleTime: 25_000 }
  );
   const listenerCount = (listenerData as any)?.count ?? 0;
  // Related tracks — for Discover tab
  const { data: relatedData, isLoading: relatedLoading } = trpc.songs.getRelated.useQuery(
    { songId: currentSongId!, genre: currentTrack?.genre ?? undefined },
    { enabled: !!currentSongId && !isNaN(currentSongId) && expandedTab === "discover", staleTime: 120_000 }
  );
  const relatedTracks = (relatedData ?? []) as any[];
  // Comments
  const { data: commentsData, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId) && commentsPanelOpen, staleTime: 30_000 }
  );
  const comments = (commentsData ?? []) as any[];
  const addCommentMutation = trpc.comments.add.useMutation({
    onSuccess: () => {
      setCommentText("");
      setCommentSubmitting(false);
      refetchComments();
    },
    onError: () => setCommentSubmitting(false),
  });
  const handleSubmitComment = useCallback(() => {
    if (!commentText.trim() || !currentSongId) return;
    setCommentSubmitting(true);
    addCommentMutation.mutate({
      songId: currentSongId,
      content: commentText.trim(),
      authorName: user?.name || undefined,
    });
  }, [commentText, currentSongId, user, addCommentMutation]);

  // Video ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoBuffering, setVideoBuffering] = useState(true);
  const [showMobileVolume, setShowMobileVolume] = useState(false);
  const [showMiniMenu, setShowMiniMenu] = useState(false);
  const showVideo = state.isPlaying && !videoBuffering;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (state.isPlaying && playerState !== "mini") {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [state.isPlaying, playerState, videoUrl]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    const onWaiting = () => setVideoBuffering(true);
    const onCanPlay = () => setVideoBuffering(false);
    const onPlaying = () => setVideoBuffering(false);
    vid.addEventListener("waiting", onWaiting);
    vid.addEventListener("stalled", onWaiting);
    vid.addEventListener("canplay", onCanPlay);
    vid.addEventListener("canplaythrough", onCanPlay);
    vid.addEventListener("playing", onPlaying);
    vid.addEventListener("error", () => setVideoBuffering(false));
    return () => {
      vid.removeEventListener("waiting", onWaiting);
      vid.removeEventListener("stalled", onWaiting);
      vid.removeEventListener("canplay", onCanPlay);
      vid.removeEventListener("canplaythrough", onCanPlay);
      vid.removeEventListener("playing", onPlaying);
    };
  }, [videoUrl]);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) { vid.pause(); vid.currentTime = 0; }
    setVideoBuffering(true);
  }, [currentTrack?.id]);

  // Scrubber
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);
  const handleSeekTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    seek(((touch.clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);

  // Share
  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    // Always use /song/:id — canonical shareable URL with server-side OG tags
    const url = currentSongId ? `${window.location.origin}/song/${currentSongId}` : window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: currentTrack.title ?? "", url }); return; }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [currentTrack, currentSongId, widBadge]);

  // useLightsMode MUST be called before any early return (Rules of Hooks)
  const { mode: lightsMode } = useLightsMode();
  const isLightsOn = lightsMode === "on";

  // Don't render if no track
  if (!currentTrack) return null;

  // Non-audio works (manuscript, comic, lyrics) should not show scrubber or timestamps
  const isNonAudio = currentTrack.contentType === "manuscript" || currentTrack.contentType === "comic" || currentTrack.contentType === "lyrics";

  // visualReady gate: true when the auto-video MP4 is still being generated
  const isVisualPending = currentTrack.visualReady === false && !videoUrl;

  // ── Artwork/Video layer (shared across expanded + cinematic) ──
  const ArtworkLayer = ({ fill = false }: { fill?: boolean }) => (
    <div className={`relative ${fill ? "absolute inset-0" : "w-full h-full"} overflow-hidden`}>
      <MediaAsset
        src={currentTrack.artUrl}
        alt={currentTrack.title}
        mode="player"
        focalX={currentTrack.coverPositionX ?? 50}
        focalY={currentTrack.coverPositionY ?? 50}
        emoji={currentTrack.emoji}
        bg={currentTrack.bg}
        showGradient={false}
        videoUrl={videoUrl}
        showVideo={showVideo}
        videoRef={videoRef as React.RefObject<HTMLVideoElement | null>}
        className="absolute inset-0 w-full h-full"
      />
      {/* ── visualReady shimmer: shown while the auto-video MP4 is being generated ── */}
      {isVisualPending && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-1.5 py-1.5 px-3"
          style={{ background: "linear-gradient(to top, rgba(44,52,56,0.82), transparent)" }}
        >
          <div className="flex gap-0.5 items-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{
                  background: "rgba(196,154,40,0.46)",
                  animationName: "pulse",
                  animationDuration: "2s",
                  animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
                  animationIterationCount: "infinite",
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>
          <span className="text-[9px] font-heading tracking-wider" style={{ color: "rgba(196,154,40,0.46)" }}>
            generating visual…
          </span>
        </div>
      )}
      {videoUrl && showVideo && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
          style={{ background: "rgba(230,205,174,0.9)", color: "#111009" }}>
          <Video size={9} /> Live
        </div>
      )}
    </div>
  );

  // ── Controls row (shared) ──────────────────────────────────────
  const ControlsRow = ({ large = false, overlay = false }: { large?: boolean; overlay?: boolean }) => (
    <div className={`flex items-center justify-center gap-${large ? "8" : "6"}`}>
      <button
        onClick={toggleShuffle}
        className="transition-all active:scale-90"
        style={{ color: state.isShuffle ? "#D0A15F" : "rgba(196,154,40,0.30)" }}
      >
        <Shuffle size={large ? 20 : 16} />
      </button>
      <button
        onClick={prevTrack}
        className="transition-all active:scale-90"
        style={{ color: overlay ? "white" : "#C49A28", filter: overlay ? "none" : "drop-shadow(0 1px 3px rgba(196,154,40,0.22))" }}
      >
        <SkipBack size={large ? 28 : 22} fill="currentColor" />
      </button>
      <button
        onClick={togglePlay}
        className="flex items-center justify-center rounded-full transition-all active:scale-90"
        style={{
          width: large ? "64px" : "52px",
          height: large ? "64px" : "52px",
          background: "linear-gradient(135deg, #F5E6C8 0%, #D0A15F 45%, #C49A28 100%)",
          boxShadow: "0 4px 24px rgba(196,154,40,0.38), 0 0 0 1px rgba(245,230,200,0.18)",
          color: "#111009",
        }}
      >
        {state.isPlaying
          ? <Pause size={large ? 26 : 20} fill="currentColor" />
          : <Play size={large ? 26 : 20} fill="currentColor" style={{ marginLeft: "2px" }} />}
      </button>
      <button
        onClick={nextTrack}
        className="transition-all active:scale-90"
        style={{ color: overlay ? "white" : "#C49A28", filter: overlay ? "none" : "drop-shadow(0 1px 3px rgba(196,154,40,0.22))" }}
      >
        <SkipForward size={large ? 28 : 22} fill="currentColor" />
      </button>
      <button
        onClick={toggleRepeat}
        className="transition-all active:scale-90"
        style={{ color: state.isRepeat ? "#D0A15F" : "rgba(196,154,40,0.30)" }}
      >
        <Repeat size={large ? 20 : 16} />
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  MINI STATE
  // ══════════════════════════════════════════════════════════════
  // (lightsMode / isLightsOn declared above the early return — see Rules of Hooks)
  // ── Bottom Nav Bar ─────────────────────────────────────────────
  const BottomNavBar = () => {
    const [location] = useLocation();
    const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
      enabled: !!user,
      refetchInterval: 30_000,
    });
    const NAV_ITEMS = [
      { icon: Home,    label: "Home",     path: "/" },
      { icon: Compass, label: "Explore",  path: "/explore" },
      { icon: Rocket,  label: "Projects", path: "/projects" },
      { icon: Bell,    label: "Signals",  path: "/notifications", badge: (unreadCount as number) > 0 ? String(Math.min(unreadCount as number, 99)) : undefined },
      { icon: User,    label: "Profile",  path: "/profile" },
    ];
    return (
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9000]"
        style={{
          height: `calc(56px + max(env(safe-area-inset-bottom, 0px), 8px))`,
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
          /* Solid background — no bleed-through from content below */
          background: isLightsOn
            ? "linear-gradient(180deg, #1a2a3a 0%, #1e2d3a 100%)"
            : "linear-gradient(180deg, #1E2D3A 0%, #111009 100%)",
          backdropFilter: "blur(12px) saturate(1.2)",
          borderTop: isLightsOn ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(196,154,40,0.08)",
        }}
      >
        <div className="flex items-center justify-around h-14 px-2">
          {NAV_ITEMS.map(({ icon: Icon, label, path, badge }) => {
            const isActive = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => { try { navigator.vibrate?.(5); } catch {} navigate(path); }}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all active:scale-90"
                style={{ color: isActive ? "#C49A28" : "#6B6555" }}
                aria-label={label}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  {badge && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                      style={{ background: "#EF4444", color: "white" }}
                    >{badge}</span>
                  )}
                </div>
                <span className="text-[9px] font-heading tracking-wide uppercase" style={{ lineHeight: 1 }}>{label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full" style={{ background: "#C49A28" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const MiniBar = () => (
    <div
      className="md:hidden fixed left-0 right-0 z-[9001]"
      style={{
        /* Sits above BottomNavBar — uses --nav-total token */
        bottom: `calc(var(--nav-height, 56px) + max(env(safe-area-inset-bottom, 0px), 8px))`,
        minHeight: "64px",
        paddingBottom: 0,
        /* Solid background — no bleed-through */
        background: isLightsOn
          ? "linear-gradient(180deg, #1a2a3a 0%, #1e2d3a 100%)"
          : "linear-gradient(180deg, #1E2D3A 0%, #111009 100%)",
        backdropFilter: "blur(16px) saturate(1.3)",
        borderTop: isLightsOn
          ? "1px solid rgba(255,255,255,0.15)"
          : "1px solid rgba(196,154,40,0.16)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.75), 0 -1px 0 rgba(196,154,40,0.08)",
      }}
      onTouchStart={onMiniTouchStart}
      onTouchMove={onMiniTouchMove}
      onTouchEnd={onMiniTouchEnd}
      onTouchCancel={onMiniTouchCancel}
    >
      {/* Progress line at top of mini bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: "rgba(196,154,40,0.06)" }}>
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${Math.min(100, progress)}%`,
            background: "linear-gradient(90deg, #C49A28, #C49A28)",
          }}
        />
      </div>
      {/* Content row */}
      <div className="flex items-center gap-3 px-4 pt-2 pb-1">
        {/* Thumbnail — tap to expand */}
        <button
          onClick={() => setPlayerState("expanded")}
          className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden relative"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.50)" }}
        >
          {currentTrack.artUrl ? (
            <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "#111009" }}>
              <Music size={16} style={{ color: "#6B6555" }} />
            </div>
          )}
          {/* Live wave indicator */}
          {state.isPlaying && (
            <div className="absolute inset-0 flex items-end justify-center pb-1 gap-[2px]"
              style={{ background: "rgba(0,0,0,0.35)" }}>
              {[1,2,3,4].map(i => (
                <span key={i} className="w-[2px] rounded-full"
                  style={{
                    height: "6px",
                    background: "#C49A28",
                    animationName: "mobileWave",
                    animationDuration: `${0.4 + i * 0.1}s`,
                    animationTimingFunction: "ease-in-out",
                    animationIterationCount: "infinite",
                    animationDirection: "alternate",
                    animationDelay: `${i * 0.08}s`,
                  }} />
              ))}
            </div>
          )}
        </button>
        {/* Track info — tap to expand */}
        <button
          onClick={() => setPlayerState("expanded")}
          className="flex-1 min-w-0 text-left"
        >
          <div className="text-[13px] font-heading text-white truncate leading-tight">
            {currentTrack.title || "Unknown Track"}
          </div>
          <div className="text-[11px] truncate mt-0.5" style={{ color: "#6B6555" }}>
            {currentTrack.artist || "Unknown Artist"}
          </div>
        </button>
        {/* Like */}
        <button
          onClick={handleToggleLike}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition-all active:scale-90"
          style={{ color: isLiked ? "#EF4444" : "rgba(196,154,40,0.35)" }}
        >
          <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
        </button>
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            background: "linear-gradient(135deg, #C49A28, #C49A28)",
            boxShadow: "0 2px 10px rgba(196,154,40,0.16)",
          }}
        >
          {state.isPlaying
            ? <Pause size={18} fill="currentColor" style={{ color: "#111009" }} />
            : <Play size={18} fill="currentColor" style={{ color: "#111009", marginLeft: "2px" }} />}
        </button>
        {/* Next */}
        <button
          onClick={nextTrack}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition-all active:scale-90"
          style={{ color: "#6B6555" }}
        >
          <SkipForward size={18} fill="currentColor" />
        </button>

        {/* Vertical audio visualizer — visible when playing */}
        {state.isPlaying && (
          <div className="flex-shrink-0 flex items-end gap-[2px] h-5 px-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map(i => (
              <span
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  background: "rgba(230,205,174,0.7)",
                  animationName: "mobileWave",
                  animationDuration: `${0.35 + i * 0.09}s`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDirection: "alternate",
                  animationDelay: `${i * 0.07}s`,
                  minHeight: "3px",
                  height: `${6 + (i % 3) * 4}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* 3-dot track settings menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMiniMenu(v => !v); }}
            className="w-7 h-8 flex items-center justify-center transition-all active:scale-90"
            style={{ color: "#6B6555" }}
            aria-label="Track options"
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown menu */}
          {showMiniMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[22]"
                onClick={() => setShowMiniMenu(false)}
              />
              <div
                className="absolute bottom-full right-0 mb-2 w-52 rounded-2xl overflow-hidden z-[23]"
                style={{
                  background: "rgba(44,52,56,0.97)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(196,154,40,0.16)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.70)",
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Track header */}
                <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(196,154,40,0.08)" }}>
                  <p className="text-[12px] font-heading text-white/90 truncate">{currentTrack.title}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "#1C1A14" }}>{currentTrack.artist}</p>
                </div>

                {/* Menu items */}
                {[
                  {
                    icon: <ListPlus size={15} />,
                    label: "Play Next",
                    action: () => { playNext(currentTrack); setShowMiniMenu(false); },
                  },
                  {
                    icon: <UserCircle2 size={15} />,
                    label: "View Artist",
                    action: () => {
                      if (currentTrack.creatorHandle || currentTrack.creatorId) {
                        window.location.href = `/creator/${currentTrack.creatorHandle || currentTrack.creatorId}`;
                      }
                      setShowMiniMenu(false);
                    },
                  },
                  {
                    icon: <Share2 size={15} />,
                    label: "Share Track",
                    action: () => {
                      const url = `${window.location.origin}/song/${currentTrack.id}`;
                      navigator.clipboard?.writeText(url).catch(() => {});
                      setShowMiniMenu(false);
                    },
                  },
                  {
                    icon: <Copy size={15} />,
                    label: "Copy Link",
                    action: () => {
                      const url = `${window.location.origin}/song/${currentTrack.id}`;
                      navigator.clipboard?.writeText(url).catch(() => {});
                      setShowMiniMenu(false);
                    },
                  },
                  {
                    icon: <Flag size={15} />,
                    label: "Report",
                    action: () => { setShowMiniMenu(false); },
                    danger: true,
                  },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 active:bg-white/10"
                    style={{ color: item.danger ? "#EF4444" : "#DACAAA" }}
                  >
                    <span style={{ color: item.danger ? "#EF4444" : "rgba(230,205,174,0.7)" }}>{item.icon}</span>
                    <span className="text-[13px] font-body">{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  EXPANDED STATE
  // ══════════════════════════════════════════════════════════════
  const ExpandedSheet = () => (
    <div
      className="md:hidden fixed inset-0 z-[9010] flex flex-col"
      style={{
        background: "linear-gradient(180deg, #1E2D3A 0%, #232E35 35%, #111009 100%)",
        transform: `translateY(${expandedDragOffset}px)`,
        transition: expandedDragOffset === 0 ? "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)" : "none",
        paddingTop: "env(safe-area-inset-top, 0px)",
        overscrollBehaviorX: "none",
        // touchAction:none on the sheet root ensures all touch events reach player controls
        // regardless of what page is behind the portal. The drag handle re-enables pan-y
        // via its own onTouchStart handler which calls overlayOpen("player-drag").
        touchAction: "none",
        // overflow:hidden prevents the sheet from visually escaping its bounds
        // when translateY goes negative (upward momentum from aggressive swipe-up).
        overflow: "hidden",
      }}
    >
      {/* Drag handle — ONLY this element triggers swipe-to-dismiss */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        onTouchStart={onExpandedTouchStart}
        onTouchMove={onExpandedTouchMove}
        onTouchEnd={onExpandedTouchEnd}
        onTouchCancel={onExpandedTouchCancel}
      >
        <div className="w-10 h-1 rounded-full" style={{ background: "rgba(196,154,40,0.10)" }} />
      </div>

      {/* Scroll-to-top button — floats over content when user has scrolled down */}
      {showScrollTop && (
        <button
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="absolute bottom-24 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-full shadow-lg transition-all active:scale-90"
          style={{
            background: "rgba(196,154,40,0.08)",
            border: "1px solid rgba(196,154,40,0.20)",
            color: "#C49A28",
            backdropFilter: "blur(8px)",
          }}
          aria-label="Scroll to top"
        >
          <ArrowUp size={16} />
        </button>
      )}

      {/* Scrollable content area — everything below the drag handle scrolls freely */}
      {/* iOS Safari requires explicit height:0 + min-height:0 on flex-1 children to compute scroll height */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          const top = (e.currentTarget as HTMLDivElement).scrollTop;
          setShowScrollTop(top > 80);
        }}
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehaviorY: "contain",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
          height: 0,
          minHeight: 0,
          background: "linear-gradient(180deg, #1E2D3A 0%, #232E35 35%, #111009 100%)",
        }}
      >

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3">
        <button
          onClick={() => setPlayerState("mini")}
          className="p-2 rounded-xl transition-all active:scale-90"
          style={{ color: "#6B6555" }}
        >
          <ChevronDown size={22} />
        </button>
        <div className="text-center">
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #F5E6C8 0%, #C49A28 60%, #D0A15F 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
            }}
          >
            Now Playing
          </div>
          {queueContextLabel && (
            <div className="text-[9px] mt-0.5" style={{ color: "rgba(196,154,40,0.38)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>
              {queueContextLabel}
            </div>
          )}
        </div>
        <button
          onClick={() => setPlayerState("cinematic")}
          className="p-2 rounded-xl transition-all active:scale-90"
          style={{ color: "#6B6555" }}
          title="Cinematic mode"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Tab bar: Now Playing | Discover */}
      <div
        className="flex-shrink-0 flex items-center gap-1 mx-8 mb-4 p-1 rounded-2xl"
        style={{
          background: "rgba(30,45,58,0.85)",
          border: "1px solid rgba(196,154,40,0.10)",
        }}
      >
        {(["playing", "discover"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setExpandedTab(tab)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all text-[11px] font-heading tracking-wide"
            style={{
              background: expandedTab === tab ? "rgba(196,154,40,0.08)" : "transparent",
              color: expandedTab === tab ? "#D0A15F" : "rgba(196,154,40,0.26)",
              border: expandedTab === tab ? "1px solid rgba(196,154,40,0.20)" : "1px solid transparent",
            }}
          >
            {tab === "playing" ? <ListMusic size={12} /> : <Sparkles size={12} />}
            {tab === "playing" ? "Now Playing" : "Discover"}
          </button>
        ))}
      </div>

      {/* Artwork — square, centered, pinch-to-zoom */}
      <div className="flex-shrink-0 px-8 pb-5">
        <div
          className="w-full rounded-2xl relative"
          style={{
            aspectRatio: "1 / 1",
            boxShadow: "0 16px 64px rgba(0,0,0,0.60), 0 4px 16px rgba(196,154,40,0.06)",
            overflow: artZoomed ? "visible" : "hidden",
            zIndex: artZoomed ? 20 : "auto",
          }}
          onTouchStart={onArtTouchStart}
          onTouchMove={onArtTouchMove}
          onTouchEnd={onArtTouchEnd}
        >
          {/* Zoomed artwork inner — scales from center */}
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${artZoom})`,
              transformOrigin: "center center",
              transition: artZoom === 1 ? "transform 0.3s cubic-bezier(0.32,0.72,0,1)" : "none",
              borderRadius: "1rem",
              overflow: "hidden",
            }}
          >
            <ArtworkLayer />
          </div>
          {/* WID badge on artwork — always show if WID exists and not zoomed */}
          {widBadge && !artZoomed && (
            <button
              onClick={() => setWidPanelOpen(true)}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold"
              style={{
                background: "rgba(44,52,56,0.88)",
                border: "1px solid rgba(74,222,128,0.5)",
                color: "#4ADE80",
                backdropFilter: "blur(4px)",
              }}
            >
              <Shield size={8} />
              WID
            </button>
          )}
          {/* Tap-to-reset overlay when zoomed */}
          {artZoomed && (
            <div
              className="fixed inset-0 z-[41]"
              onClick={resetArtZoom}
              style={{ cursor: "zoom-out" }}
            />
          )}
        </div>
      </div>

      {/* Track info */}
      <div className="flex-shrink-0 px-8 pb-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          {/* Track title — 24k gold-etched */}
          <div
            className="text-[20px] truncate leading-tight"
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              background: "linear-gradient(135deg, #F5E6C8 0%, #C49A28 40%, #D0A15F 70%, #C49A28 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
              filter: "drop-shadow(0 1px 2px rgba(196,154,40,0.26))",
              letterSpacing: "0.02em",
            }}
          >
            {currentTrack.title || "Unknown Track"}
          </div>
          {/* Creator name — clickable, with founder crown badge */}
          {creatorId ? (
            <button
              onClick={() => { setPlayerState("mini"); navigate(`/creator/${creatorId}`); }}
              className="flex items-center gap-1.5 text-[13px] mt-1.5 truncate text-left transition-all active:opacity-70"
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 400,
                color: "#6B6555",
                letterSpacing: "0.04em",
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }}
            >
              {currentTrack.creatorRole === "founder" && (
                <Crown size={11} style={{ color: "#C49A28", flexShrink: 0 }} />
              )}
              {currentTrack.artist || "Unknown Artist"}
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 text-[13px] mt-1.5 truncate"
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 400,
                color: "#6B6555",
                letterSpacing: "0.04em",
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }}
            >
              {currentTrack.creatorRole === "founder" && (
                <Crown size={11} style={{ color: "#C49A28", flexShrink: 0 }} />
              )}
              {currentTrack.artist || "Unknown Artist"}
            </div>
          )}
        </div>
        <button
          onClick={handleToggleLike}
          className="flex-shrink-0 ml-4 p-2 rounded-full transition-all active:scale-90"
          style={{
            color: isLiked ? "#EF4444" : "#1C1A14",
            background: isLiked ? "rgba(239,68,68,0.12)" : "transparent",
          }}
        >
          <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Scrubber — hidden for non-audio content types */}
      {!isNonAudio && (
        <div className="flex-shrink-0 px-8 pb-5">
          <Scrubber
            progress={progress}
            currentTime={state.currentTime}
            duration={state.duration}
            onSeek={handleSeek}
            onSeekTouch={handleSeekTouch}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex-shrink-0 px-8 pb-6">
        <ControlsRow large />
      </div>

      {/* Action row */}
      <div className="flex-shrink-0 px-8 pb-4 flex items-center justify-between">
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          style={{ color: copied ? "#4ADE80" : "rgba(196,154,40,0.42)" }}
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
          <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: "'Cinzel', serif", fontSize: "8px" }}>{copied ? "Copied" : "Share"}</span>
        </button>
        <button
          onClick={() => setGiftOpen(true)}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          style={{ color: "rgba(196,154,40,0.42)" }}
        >
          <DollarSign size={18} />
          <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: "'Cinzel', serif", fontSize: "8px" }}>Tip</span>
        </button>
        <button
          onClick={() => {
            if (currentSongId) {
              setPlayerState("mini");
              navigate(`/song/${currentSongId}`);
            }
          }}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          style={{ color: "rgba(196,154,40,0.42)" }}
        >
          <ListMusic size={18} />
          <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: "'Cinzel', serif", fontSize: "8px" }}>Details</span>
        </button>
        {/* Volume */}
        <div className="relative flex flex-col items-center">
          {showMobileVolume && (
            <div
              className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-2xl p-3 shadow-2xl z-50 flex flex-col items-center gap-2"
              style={{ background: "#111009", border: "1px solid rgba(44,52,56,0.6)" }}
            >
              <span className="text-[10px] font-mono" style={{ color: "#C49A28" }}>
                {state.isMuted ? "0" : Math.round(state.volume * 100)}%
              </span>
              <input
                type="range"
                min="0" max="1" step="0.01"
                value={state.isMuted ? 0 : state.volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); }}
                className="volume-slider-vertical"
                style={{
                  background: `linear-gradient(to top, #C49A28 ${
                    state.isMuted ? 0 : state.volume * 100
                  }%, rgba(44,52,56,0.7) ${
                    state.isMuted ? 0 : state.volume * 100
                  }%)`,
                }}
              />
              <button
                onClick={toggleMute}
                className="p-1 transition-colors"
                style={{ color: state.isMuted ? "#C49A28" : "#1C1A14" }}
              >
                <VolumeX size={12} />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowMobileVolume(v => !v)}
            className="flex flex-col items-center gap-1 transition-all active:scale-90"
            style={{ color: state.isMuted ? "#EF4444" : "rgba(196,154,40,0.42)" }}
          >
            {state.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: "'Cinzel', serif", fontSize: "8px" }}>{state.isMuted ? "Muted" : "Vol"}</span>
          </button>
        </div>
      </div>

      {/* ── CANONICAL LAYERS ── */}

      {/* WID Provenance Panel */}
      {widBadge && (
        <div className="flex-shrink-0 mx-8 mb-4 rounded-2xl overflow-hidden"
          style={{
            background: "rgba(44,52,56,0.6)",
            border: "1px solid rgba(74,222,128,0.35)",
          }}
        >
          {/* Header — always visible */}
          <button
            className="w-full flex items-center justify-between px-4 py-3 transition-all active:scale-[0.99]"
            onClick={() => setWidPanelOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Fingerprint size={14} style={{ color: "#4ADE80" }} />
              <span className="text-[11px] font-heading tracking-[0.12em] uppercase"
                style={{ color: "#4ADE80" }}>
                Origin Proof
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(44,52,56,0.5)",
                  color: "#4ADE80",
                  border: "1px solid rgba(74,222,128,0.3)",
                }}>
                ✓ WID
              </span>
            </div>
            <ChevronRight
              size={14}
              style={{
                color: "#1C1A14",
                transform: widPanelOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>
          {/* Expanded content */}
          {widPanelOpen && (
            <div className="px-4 pb-4 space-y-3 border-t"
              style={{ borderColor: "rgba(34,197,94,0.2)" }}>
              <div className="pt-3">
                <div className="text-[9px] font-heading tracking-[0.15em] uppercase mb-1"
                  style={{ color: "#1C1A14" }}>
                  Witness ID
                </div>
                <div className="text-[11px] font-mono break-all"
                  style={{ color: "#4ADE80" }}>
                  {widBadge}
                </div>
              </div>
              {currentTrack.title && (
                <div>
                  <div className="text-[9px] font-heading tracking-[0.15em] uppercase mb-1"
                    style={{ color: "#1C1A14" }}>
                    Work
                  </div>
                  <div className="text-[12px]" style={{ color: "#DACAAA" }}>
                    {currentTrack.title}
                  </div>
                </div>
              )}
              {currentTrack.artist && (
                <div>
                  <div className="text-[9px] font-heading tracking-[0.15em] uppercase mb-1"
                    style={{ color: "#1C1A14" }}>
                    Creator
                  </div>
                  <div className="text-[12px]" style={{ color: "#DACAAA" }}>
                    {currentTrack.artist}
                  </div>
                </div>
              )}
              <button
                onClick={() => { setPlayerState("mini"); navigate(`/verify/${widBadge}`); }}
                className="flex items-center gap-1.5 text-[10px] font-heading tracking-wide transition-all active:scale-95"
                style={{ color: "#4ADE80" }}
              >
                <ExternalLink size={11} />
                Verify on-chain provenance
              </button>
            </div>
          )}
        </div>
      )}

      {/* Signal / Reactions */}
      <div className="flex-shrink-0 mx-8 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[9px] font-heading tracking-[0.15em] uppercase"
            style={{ color: "#6B6555" }}>
            Signals
          </div>
          <div className="flex-1 h-px" style={{ background: "rgba(44,52,56,0.5)" }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {EMOJI_REACTIONS.map(({ type, emoji, label }) => {
            const count = (reactionCounts as Record<string, number>)[type] ?? 0;
            const isActive = myReactions.includes(type);
            return (
              <button
                key={type}
                onClick={() => handleToggleReaction(type)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all active:scale-90"
                title={label}
                style={{
                  background: isActive
                    ? "rgba(122,90,30,0.6)"
                    : "rgba(44,52,56,0.8)",
                  border: `1px solid ${isActive ? "rgba(196,154,40,0.35)" : "rgba(44,52,56,0.6)"}`,
                }}
              >
                <span className="text-[14px] leading-none">{emoji}</span>
                {count > 0 && (
                  <span className="text-[10px] font-mono"
                    style={{ color: isActive ? "#C49A28" : "#1C1A14" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Witness Activity Strip */}
      {listenerCount > 0 && (
        <div
          className="flex-shrink-0 mx-8 mb-3 flex items-center justify-center gap-2 py-2 px-4 rounded-full animate-fade-in"
          style={{
            background: "rgba(44,52,56,0.5)",
            border: "1px solid rgba(44,52,56,0.4)",
          }}
        >
          <span className="text-[13px]">🎧</span>
          <span
            className="text-[12px] font-medium tracking-wide"
            style={{ color: "#6B6555" }}
          >
            {listenerCount === 1
              ? "1 person currently listening"
              : `${listenerCount} people currently listening`}
          </span>
        </div>
      )}

      {/* Comments Panel */}
      <div className="flex-shrink-0 mx-8 mb-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(44,52,56,0.6)",
          border: "1px solid rgba(44,52,56,0.5)",
        }}
      >
        {/* Header */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 transition-all active:scale-[0.99]"
          onClick={() => setCommentsPanelOpen(v => !v)}
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={14} style={{ color: "#1C1A14" }} />
            <span className="text-[11px] font-heading tracking-[0.12em] uppercase"
              style={{ color: "#1C1A14" }}>
              Comments
            </span>
            {comments.length > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(44,52,56,0.8)",
                  color: "#1C1A14",
                }}>
                {comments.length}
              </span>
            )}
          </div>
          <ChevronRight
            size={14}
            style={{
              color: "#111009",
              transform: commentsPanelOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>
        {/* Expanded content */}
        {commentsPanelOpen && (
          <div className="border-t" style={{ borderColor: "rgba(44,52,56,0.4)" }}>
            {/* Comment list */}
            <div className="max-h-48 overflow-y-auto px-4 py-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-[11px] text-center py-2" style={{ color: "#111009" }}>
                  No comments yet. Be the first.
                </p>
              ) : (
                comments.slice(0, 20).map((c: any, i: number) => (
                  <div key={c.id ?? i} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]"
                      style={{ background: "#111009", color: "#1C1A14" }}>
                      {(c.authorName || c.userName || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] font-heading" style={{ color: "#6B6555" }}>
                          {c.authorName || c.userName || "Anonymous"}
                        </span>
                        {c.createdAt && (
                          <span className="text-[9px]" style={{ color: "#111009" }}>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "#6B6555" }}>
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Comment input */}
            <div className="px-4 pb-3 border-t" style={{ borderColor: "rgba(44,52,56,0.5)" }}>
              <div className="flex gap-2 pt-3">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                  placeholder={user ? "Add a comment…" : "Sign in to comment"}
                  disabled={!user || commentSubmitting}
                  className="flex-1 text-[11px] px-3 py-2 rounded-xl outline-none transition-all"
                  style={{
                    background: "rgba(44,52,56,0.8)",
                    border: "1px solid rgba(44,52,56,0.6)",
                    color: "#DACAAA",
                  }}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!user || !commentText.trim() || commentSubmitting}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-40"
                  style={{
                    background: "#C49A28",
                    color: "#111009",
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lyrics strip (if available) */}
      {lyricsText && (
        <div className="flex-shrink-0 px-8 pb-6">
          <div className="text-[11px] font-heading tracking-[0.12em] uppercase mb-3"
            style={{ color: "#111009" }}>
            Lyrics
          </div>
          <div className="text-[13px] font-body leading-relaxed whitespace-pre-wrap"
            style={{ color: "#1C1A14" }}>
            {lyricsText}
          </div>
        </div>
      )}

      {/* Bottom padding spacer */}
      <div className="flex-shrink-0 h-6" />

      {/* ── DISCOVER TAB CONTENT ── */}
      {expandedTab === "discover" && (
        <DiscoverPanel
          songId={currentSongId}
          genre={currentTrack?.genre}
          onPlay={(t: Track) => { addAndPlay(t); setExpandedTab("playing"); }}
          onPlayAll={(tracks: Track[]) => { playQueueAt(tracks, 0, "SONG_DETAIL"); setExpandedTab("playing"); }}
        />
      )}
      </div>{/* end scrollable content area */}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  CINEMATIC STATE
  // ══════════════════════════════════════════════════════════════
  const CinematicLayer = () => (
    <div
      className="md:hidden fixed inset-0 z-[9020] bg-black"
      style={{ overscrollBehaviorX: "none", touchAction: "pan-y" }}
      onTouchStart={onCinematicTouchStart}
      onTouchEnd={onCinematicTouchEnd}
      onClick={showOverlay}
    >
      {/* Full-bleed artwork/video */}
      <MediaAsset
        src={currentTrack.artUrl}
        alt={currentTrack.title}
        mode="cinematic"
        focalX={currentTrack.coverPositionX ?? 50}
        focalY={currentTrack.coverPositionY ?? 50}
        emoji={currentTrack.emoji}
        bg={currentTrack.bg}
        showGradient={false}
        videoUrl={videoUrl}
        showVideo={showVideo}
        videoRef={videoRef as React.RefObject<HTMLVideoElement | null>}
        className="absolute inset-0 w-full h-full"
      />
      {/* Ambient gradient — bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: isLandscape ? "35%" : "45%",
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
          transition: "opacity 0.4s",
          opacity: overlayVisible ? 1 : 0,
        }}
      />
      {/* Top gradient */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "20%",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, transparent 100%)",
          transition: "opacity 0.4s",
          opacity: overlayVisible ? 1 : 0,
        }}
      />
      {/* Overlay controls */}
      <div
        className="absolute inset-0 flex flex-col justify-between"
        style={{
          transition: "opacity 0.4s",
          opacity: overlayVisible ? 1 : 0,
          pointerEvents: overlayVisible ? "auto" : "none",
          paddingTop: "env(safe-area-inset-top, 16px)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-3">
          <button
            onClick={(e) => { e.stopPropagation(); setPlayerState("expanded"); }}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.30)", backdropFilter: "blur(8px)" }}
          >
            <ChevronDown size={22} />
          </button>
          <div className="text-center">
            <div className="text-[9px] font-heading tracking-[0.2em] uppercase text-white/50">
              Cinematic
            </div>
          </div>
          {/* WID badge in cinematic */}
          {widBadge ? (
            <button
              onClick={(e) => { e.stopPropagation(); setPlayerState("expanded"); setWidPanelOpen(true); }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold"
              style={{
                background: "rgba(44,52,56,0.88)",
                border: "1px solid rgba(74,222,128,0.5)",
                color: "#4ADE80",
                backdropFilter: "blur(4px)",
              }}
            >
              <Shield size={8} />
              WID
            </button>
          ) : <div className="w-10" />}
        </div>
        {/* Bottom controls */}
        {isLandscape ? (
          <div className="px-6 pb-3">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-heading text-white truncate">{currentTrack.title}</div>
                <div className="text-[11px] text-white/50 truncate mt-0.5">{currentTrack.artist}</div>
              </div>
              <button type="button" onClick={togglePlay} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #C49A28, #C49A28)", color: "#111009" }}>
                {state.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: "2px" }} />}
              </button>
              {!isNonAudio && (
                <div className="flex-1">
                  <Scrubber
                    progress={progress}
                    currentTime={state.currentTime}
                    duration={state.duration}
                    onSeek={handleSeek}
                    onSeekTouch={handleSeekTouch}
                    thin
                  />
                </div>
              )}
              {!isNonAudio && (
                <span className="text-[10px] font-mono text-white/50 flex-shrink-0">
                  {fmtTime(state.duration)}
                </span>
              )}
              <button type="button" onClick={nextTrack} style={{ color: "rgba(255,255,255,0.6)" }}>
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-4 space-y-5">
            {/* Track info + like */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-heading text-white truncate">{currentTrack.title}</div>
                <div className="text-[12px] text-white/50 truncate mt-0.5">{currentTrack.artist}</div>
              </div>
              <button type="button" onClick={handleToggleLike} className="flex-shrink-0 ml-3 p-2"
                style={{ color: isLiked ? "#EF4444" : "rgba(255,255,255,0.4)" }}>
                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>
            {!isNonAudio && (
              <Scrubber
                progress={progress}
                currentTime={state.currentTime}
                duration={state.duration}
                onSeek={handleSeek}
                onSeekTouch={handleSeekTouch}
              />
            )}
            <ControlsRow large overlay />
            {/* Action tray */}
            <div className="flex items-center justify-around pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); setGiftOpen(true); }}
                className="flex flex-col items-center gap-1 transition-all active:scale-90"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-xl"
                  style={{ background: "rgba(196,154,40,0.08)", backdropFilter: "blur(8px)" }}>
                  <DollarSign size={16} />
                </div>
                <span className="text-[9px] font-heading tracking-widest uppercase">Tip</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="flex flex-col items-center gap-1 transition-all active:scale-90"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-xl"
                  style={{ background: "rgba(196,154,40,0.08)", backdropFilter: "blur(8px)" }}>
                  {copied ? <Check size={16} style={{ color: "#C49A28" }} /> : <Share2 size={16} />}
                </div>
                <span className="text-[9px] font-heading tracking-widest uppercase">{copied ? "Copied" : "Share"}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPlayerState("mini"); navigate(`/song/${currentSongId}`); }}
                className="flex flex-col items-center gap-1 transition-all active:scale-90"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-xl"
                  style={{ background: "rgba(196,154,40,0.08)", backdropFilter: "blur(8px)" }}>
                  <ListMusic size={16} />
                </div>
                <span className="text-[9px] font-heading tracking-widest uppercase">Details</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render via portal ──────────────────────────────────────────
  return createPortal(
    <>
      <style>{`
        @keyframes mobileWave {
          from { height: 3px; }
          to   { height: 10px; }
        }
      `}</style>
      {/* Bottom nav bar — always visible on mobile */}
      <BottomNavBar />
      {/* Mini player — sits above bottom nav when a track is loaded */}
      {playerState === "mini" && <MiniBar />}
      {playerState === "expanded" && <ExpandedSheet />}
      {playerState === "cinematic" && <CinematicLayer />}
      {giftOpen && currentTrack && currentSongId && (
        <GiftModal
          songId={currentSongId}
          artistName={currentTrack.artist ?? ""}
          stripeAccountId={stripeAccountId}
          onClose={() => setGiftOpen(false)}
        />
      )}
    </>,
    document.body
  );
}
