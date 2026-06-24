/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlayerContext
   Global audio player state shared across all pages

   Phase 176: Playback Continuity
   ─────────────────────────────
   The queue is now an IMMUTABLE SNAPSHOT frozen at play-time.
   • playQueueAt() / addAndPlay() each rotate a new queueId (UUID).
   • prev/next/onEnded navigate ONLY within that frozen snapshot.
   • Pages are views only — they cannot mutate the active queue.
   • prevTrack: if currentTime > 3 s → restart; else → go to previous.
   • setQueue (DB seed): only seeds when queueId is null (first load).
═══════════════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo } from "react";
import { safeAudioUrl } from "@shared/const";
import { getCache, setCache, CACHE_KEYS, TTL } from "@/lib/lnxCache";
import { trpc } from "@/lib/trpc";
import { hadSession } from "@/lib/sessionFlags";

/** Generate a stable UUID v4 */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MIN_PLAY_SECONDS = 30; // must match server constant

export interface Comment {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  timestamp: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  desc?: string;
  audioUrl?: string;
  artUrl?: string;
  artType?: "image" | "video";
  emoji?: string;
  bg?: string;
  dur?: string;
  isOwn?: boolean;
  plays?: number;
  tips?: number;
  comments?: Comment[];
  shareCount?: number;
  witnessId?: string;
  aiDisclosure?: "original" | "ai_assisted" | "ai_generated";
  creatorHandle?: string;
  tipsEnabled?: boolean;
  creatorId?: number;
  coverPositionX?: number;
  coverPositionY?: number;
  visualReady?: boolean;
  autoVideoUrl?: string;
  creatorRole?: string;
  contentType?: "audio" | "lyrics" | "manuscript" | "comic" | "guide";
  testimony?: string;
  albumName?: string;
  fadeInSeconds?: number | null;
  fadeOutSeconds?: number | null;
}

/** Describes WHERE the current queue was built from */
export type QueueContext =
  | "CREATOR_PAGE"
  | "EXPLORE"
  | "HOME"
  | "SEARCH"
  | "SONG_DETAIL"
  | "PLAYLIST"
  | "LIKED"
  | "NONE";

export const QUEUE_CONTEXT_LABELS: Record<QueueContext, string> = {
  CREATOR_PAGE: "Creator",
  EXPLORE: "Explore",
  HOME: "New Releases",
  SEARCH: "Search Results",
  SONG_DETAIL: "Related",
  PLAYLIST: "My Playlist",
  LIKED: "Liked Songs",
  NONE: "Now Playing",
};

export const DEMO_TRACKS: Track[] = [];

export const DEMO_ROOMS = [
  { code: "NEXUS", name: "Celestial Lounge", listeners: 4, track: "Celestial Drift", emoji: "🌌" },
  { code: "GOLD7", name: "Golden Hour Room", listeners: 7, track: "Golden Hour Protocol", emoji: "✨" },
  { code: "VOID9", name: "The Void Session", listeners: 2, track: "Midnight Sermon", emoji: "🕯️" },
];

interface PlayerState {
  currentIdx: number;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  /** True once the current track has fired canplay */
  isReady: boolean;
  liked: Set<string>;
  /**
   * IMMUTABLE SNAPSHOT — frozen at playQueueAt / addAndPlay time.
   * Never mutated by page navigation, feed refreshes, or scroll events.
   */
  tracks: Track[];
  queueContext: QueueContext;
  /**
   * Unique ID for the current playback session/queue.
   * Rotated every time a new queue is started (playQueueAt / addAndPlay).
   * null = no queue has been started yet (DB seed is allowed).
   */
  queueId: string | null;
  /** Human-readable source label, e.g. "home_feed", "explore", "creator:123" */
  sourceType: string;
  profileName: string;
  profileBio: string;
  profileLocation: string;
  profileWebsite: string;
  profileSocials: { twitter: string; instagram: string; youtube: string; soundcloud: string };
  profileAvatar: string | null;
  profileBanner: string | null;
  tipsEarned: number;
  trackComments: Record<string, Comment[]>;
  trackTips: Record<string, number>;
}

interface PlayerContextValue {
  state: PlayerState;
  isReady: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  allTracks: () => Track[];
  currentTrackId: string | null;
  queueContextLabel: string;
  /** Unique ID for the current playback session — rotates on every new queue */
  queueId: string | null;
  playTrack: (idx: number) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  seek: (t: number) => void;
  toggleLike: (id: string) => void;
  addTrack: (t: Track) => void;
  /** Start a new single-track session. Rotates queueId. Does NOT merge into existing queue. */
  addAndPlay: (t: Track) => void;
  /**
   * Insert a track immediately after the current position in the session queue.
   * Session-only — never written to DB or localStorage.
   */
  playNext: (t: Track) => void;
  openNowPlayingPanel: () => void;
  isNowPlayingPanelOpen: boolean;
  closeNowPlayingPanel: () => void;
  openTheater: () => void;
  isTheaterOpen: boolean;
  closeTheater: () => void;
  /** Seed the queue only if no session has been started yet (queueId is null). */
  setQueue: (tracks: Track[]) => void;
  patchTrack: (trackId: string, patch: Partial<Track>) => void;
  /**
   * Replace the entire queue with a context-tagged set and immediately play startIdx.
   * Freezes the queue as an immutable snapshot and rotates queueId.
   */
  playQueueAt: (tracks: Track[], startIdx: number, context?: QueueContext, sourceType?: string) => void;
  setProfileName: (n: string) => void;
  setProfileBio: (b: string) => void;
  setProfileLocation: (l: string) => void;
  setProfileWebsite: (w: string) => void;
  setProfileSocials: (s: PlayerState["profileSocials"]) => void;
  setProfileAvatar: (url: string) => void;
  setProfileBanner: (url: string) => void;
  addTip: (amount: number) => void;
  addTrackTip: (trackId: string, amount: number) => void;
  addComment: (trackId: string, comment: Comment) => void;
  incrementShare: (trackId: string) => void;
  backgroundCreatorHandle: string | null;
}

const PLAYER_SESSION_KEY = "ln_player_session";

function loadSessionTracks(): {
  tracks: Track[];
  currentIdx: number;
  queueContext: QueueContext;
  queueId: string | null;
  sourceType: string;
} {
  try {
    const raw = sessionStorage.getItem(PLAYER_SESSION_KEY);
    if (!raw) return { tracks: [], currentIdx: -1, queueContext: "NONE", queueId: null, sourceType: "" };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tracks) && typeof parsed.currentIdx === "number") {
      return {
        tracks: parsed.tracks as Track[],
        currentIdx: parsed.currentIdx,
        queueContext: (parsed.queueContext ?? "NONE") as QueueContext,
        queueId: parsed.queueId ?? null,
        sourceType: parsed.sourceType ?? "",
      };
    }
  } catch { /* ignore */ }
  return { tracks: [], currentIdx: -1, queueContext: "NONE", queueId: null, sourceType: "" };
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ── Module-level audio singleton ─────────────────────────────────────────────
// A single <audio> element that persists across React re-renders.
// This prevents dual-audio when the PlayerProvider remounts (e.g. soft navigation).
let _globalAudio: HTMLAudioElement | null = null;
function getOrCreateAudio(): HTMLAudioElement {
  if (!_globalAudio) {
    _globalAudio = new Audio();
    _globalAudio.crossOrigin = "anonymous";
    // Stop audio cleanly on page unload to prevent ghost audio after navigation
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        if (_globalAudio) {
          _globalAudio.pause();
          _globalAudio.src = "";
        }
      });
      // Also stop on pagehide (mobile Safari / bfcache)
      window.addEventListener("pagehide", () => {
        if (_globalAudio) {
          _globalAudio.pause();
          _globalAudio.src = "";
        }
      });
    }
  }
  return _globalAudio;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null as unknown as HTMLAudioElement);
  if (!audioRef.current) {
    (audioRef as React.MutableRefObject<HTMLAudioElement>).current = getOrCreateAudio();
  }

  const [isNowPlayingPanelOpen, setIsNowPlayingPanelOpen] = useState(false);
  const openNowPlayingPanel = useCallback(() => setIsNowPlayingPanelOpen(true), []);
  const closeNowPlayingPanel = useCallback(() => setIsNowPlayingPanelOpen(false), []);
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);
  const openTheater = useCallback(() => setIsTheaterOpen(true), []);
  const closeTheater = useCallback(() => setIsTheaterOpen(false), []);

  const [state, setState] = useState<PlayerState>(() => {
    const session = loadSessionTracks();
    return {
      currentIdx: session.currentIdx,
      isPlaying: false,
      isShuffle: false,
      isRepeat: false,
      isMuted: false,
      volume: getCache<number>(CACHE_KEYS.VOLUME) ?? 0.75,
      currentTime: 0,
      duration: 0,
      isReady: false,
      liked: new Set(),
      tracks: session.tracks,
      queueContext: session.queueContext,
      queueId: session.queueId,
      sourceType: session.sourceType,
      profileName: "",
      profileBio: "",
      profileLocation: "",
      profileWebsite: "",
      profileSocials: { twitter: "", instagram: "", youtube: "", soundcloud: "" },
      profileAvatar: null,
      profileBanner: null,
      tipsEarned: 0,
      trackComments: {},
      trackTips: {},
    };
  });

  const allTracks = useCallback(() => state.tracks.filter(t => !!t.audioUrl), [state.tracks]);

  // ── Playback Settings (crossfade / gapless / fade) ──────────────────────────
  // Only fetch for authenticated users — playback.getSettings is a protectedProcedure
  // that returns 401 for guests, which would trigger a false redirect without this guard.
  const { data: playbackSettingsData } = trpc.playback.getSettings.useQuery(undefined, {
    enabled: hadSession(),
    staleTime: 60_000,
    retry: false,
  });

  const playbackSettings = useMemo(() => ({
    transitionMode: (playbackSettingsData as any)?.transitionMode ?? "standard",
    crossfadeDuration: (playbackSettingsData as any)?.crossfadeDuration ?? 5,
    globalFadeIn: (playbackSettingsData as any)?.globalFadeIn ?? 0,
    globalFadeOut: (playbackSettingsData as any)?.globalFadeOut ?? 0,
    respectTrackFades: (playbackSettingsData as any)?.respectTrackFades ?? true,
    preloadNext: (playbackSettingsData as any)?.preloadNext ?? true,
    albumMode: (playbackSettingsData as any)?.albumMode ?? false,
  }), [playbackSettingsData]);

  // Refs for crossfade/fade engine
  const fadeRafRef = useRef<number | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeActiveRef = useRef(false);

  /** Cancel any in-progress fade animation frame */
  const cancelFade = useCallback(() => {
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  }, []);

  /** Fade audio element volume from `from` to `to` over `durationMs` ms */
  const fadeVolume = useCallback((
    audioEl: HTMLAudioElement,
    from: number,
    to: number,
    durationMs: number,
    onComplete?: () => void,
  ) => {
    const startTime = performance.now();
    audioEl.volume = from;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      audioEl.volume = from + (to - from) * progress;
      if (progress < 1) {
        fadeRafRef.current = requestAnimationFrame(tick);
      } else {
        audioEl.volume = to;
        fadeRafRef.current = null;
        onComplete?.();
      }
    };
    fadeRafRef.current = requestAnimationFrame(tick);
  }, []);

  // Keep a stable ref to playback settings so the audio engine (which runs in a
  // closed-over useEffect with [] deps) can always read the latest preferences.
  const playbackSettingsRef = useRef(playbackSettings);
  useEffect(() => { playbackSettingsRef.current = playbackSettings; }, [playbackSettings]);

  // Keep a stable ref to current state for use inside the audio engine
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Restore audio.src on mount after page reload
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const tracks = state.tracks.filter(t => !!t.audioUrl);
    const t = tracks[state.currentIdx];
    if (t?.audioUrl && !audio.src) {
      audio.src = safeAudioUrl(t.audioUrl);
      audio.load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist queue snapshot + queueId to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify({
        tracks: state.tracks,
        currentIdx: state.currentIdx,
        queueContext: state.queueContext,
        queueId: state.queueId,
        sourceType: state.sourceType,
      }));
    } catch { /* quota exceeded — ignore */ }
  }, [state.tracks, state.currentIdx, state.queueContext, state.queueId, state.sourceType]);

  const pendingAudioAction = useRef<{ src: string; play: boolean } | null>(null);

  useEffect(() => {
    if (pendingAudioAction.current) {
      const audio = audioRef.current;
      const action = pendingAudioAction.current;
      pendingAudioAction.current = null;
      if (audio && action.src) {
        audio.src = action.src;
        audio.load();
        if (action.play) audio.play().catch(() => {});
      }
    }
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = state.volume;

    const onTimeUpdate = () => {
      setState(s => ({ ...s, currentTime: audio.currentTime }));

      // ── Crossfade / fade-out trigger ──────────────────────────────────────────────────
      const settings = playbackSettingsRef.current;
      const s = stateRef.current;
      const dur = audio.duration;
      const cur = audio.currentTime;
      if (!isFinite(dur) || dur === 0) return;

      const tracks = s.tracks.filter(t => !!t.audioUrl);
      const currentTrack = tracks[s.currentIdx];

      // Determine fade-out duration for current track
      const trackFadeOut = settings.respectTrackFades && currentTrack?.fadeOutSeconds
        ? currentTrack.fadeOutSeconds
        : settings.globalFadeOut;

      // Crossfade mode: start fading out current + fading in next
      if (settings.transitionMode === "crossfade" && !crossfadeActiveRef.current) {
        const xfadeSec = settings.crossfadeDuration;
        const timeLeft = dur - cur;
        if (timeLeft <= xfadeSec && timeLeft > 0) {
          crossfadeActiveRef.current = true;
          // Fade out current track
          cancelFade();
          fadeVolume(audio, audio.volume, 0, timeLeft * 1000, () => {
            crossfadeActiveRef.current = false;
          });
          // Start next track and fade it in
          const nextIdx = s.isShuffle
            ? (() => { let r = Math.floor(Math.random() * (tracks.length - 1)); if (r >= s.currentIdx) r++; return r; })()
            : s.currentIdx + 1;
          if (nextIdx < tracks.length) {
            const nextT = tracks[nextIdx];
            if (nextT?.audioUrl) {
              const nextAudio = new Audio(safeAudioUrl(nextT.audioUrl));
              nextAudio.volume = 0;
              nextAudioRef.current = nextAudio;
              nextAudio.play().catch(() => {});
              // Fade next in over the crossfade window
              const doXfadeIn = () => {
                fadeVolume(nextAudio, 0, s.volume, timeLeft * 1000, () => {
                  // Transition complete: swap sources
                  audio.pause();
                  audio.src = safeAudioUrl(nextT.audioUrl);
                  audio.currentTime = nextAudio.currentTime;
                  audio.volume = s.volume;
                  nextAudio.pause();
                  nextAudioRef.current = null;
                  setState(prev => ({
                    ...prev,
                    currentIdx: nextIdx,
                    isPlaying: true,
                    isReady: true,
                    duration: nextAudio.duration || 0,
                    currentTime: nextAudio.currentTime,
                  }));
                  audio.play().catch(() => {});
                });
              };
              if (nextAudio.readyState >= 2) doXfadeIn();
              else nextAudio.addEventListener("canplay", doXfadeIn, { once: true });
            }
          }
        }
      } else if (settings.transitionMode !== "crossfade" && trackFadeOut > 0 && !crossfadeActiveRef.current) {
        // Standard fade-out near end of track
        const timeLeft = dur - cur;
        if (timeLeft <= trackFadeOut && timeLeft > 0.1) {
          crossfadeActiveRef.current = true;
          cancelFade();
          fadeVolume(audio, audio.volume, 0, (timeLeft - 0.05) * 1000, () => {
            crossfadeActiveRef.current = false;
            audio.volume = s.volume; // restore for next track
          });
        }
      }

      // Preload next track for gapless mode
      if ((settings.transitionMode === "gapless" || settings.transitionMode === "album_blend") && settings.preloadNext) {
        const timeLeft = dur - cur;
        if (timeLeft <= 15 && !nextAudioRef.current) {
          const nextIdx = s.currentIdx + 1;
          if (nextIdx < tracks.length) {
            const nextT = tracks[nextIdx];
            if (nextT?.audioUrl) {
              const preload = new Audio(safeAudioUrl(nextT.audioUrl));
              preload.preload = "auto";
              preload.load();
              nextAudioRef.current = preload;
            }
          }
        }
      }
    };
    const onDurationChange = () => setState(s => ({
      ...s,
      duration: isFinite(audio.duration) && !isNaN(audio.duration) ? audio.duration : 0,
    }));
    const onCanPlay = () => setState(s => ({ ...s, isReady: true }));

    /** Advance to the next track, applying crossfade/gapless/standard transition */
    const advanceToNext = (s: typeof stateRef.current, fromEnded: boolean) => {
      const settings = playbackSettingsRef.current;
      const tracks = s.tracks.filter(t => !!t.audioUrl);
      if (s.isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return s;
      }
      let next = s.currentIdx + 1;
      if (s.isShuffle) {
        if (tracks.length > 1) {
          let rand = Math.floor(Math.random() * (tracks.length - 1));
          if (rand >= s.currentIdx) rand += 1;
          next = rand;
        } else {
          next = 0;
        }
      }
      if (next >= tracks.length) {
        audio.pause();
        audio.currentTime = 0;
        return { ...s, isPlaying: false, isReady: false, duration: 0, currentTime: 0 };
      }
      const nextTrackData = tracks[next];
      if (!nextTrackData?.audioUrl) {
        return { ...s, currentIdx: next, isPlaying: false, isReady: false, duration: 0, currentTime: 0 };
      }

      const mode = settings.transitionMode;

      if (mode === "crossfade" && fromEnded === false) {
        // Crossfade: already handled by the timeupdate crossfade trigger — just update state
        return { ...s, currentIdx: next, isPlaying: true, isReady: false, duration: 0, currentTime: 0 };
      }

      if (mode === "gapless" || mode === "album_blend") {
        // Gapless: preloaded next audio is already buffered, swap immediately
        if (nextAudioRef.current && nextAudioRef.current.src === safeAudioUrl(nextTrackData.audioUrl)) {
          const preloaded = nextAudioRef.current;
          // Swap: make preloaded the main audio
          audio.pause();
          audio.src = safeAudioUrl(nextTrackData.audioUrl);
          audio.currentTime = preloaded.currentTime;
          audio.volume = s.volume;
          audio.play().catch(() => {});
          nextAudioRef.current = null;
        } else {
          audio.src = safeAudioUrl(nextTrackData.audioUrl);
          audio.load();
          audio.play().catch(() => {});
        }
      } else {
        // Standard: apply global fade-in if configured
        const fadeIn = settings.respectTrackFades && nextTrackData.fadeInSeconds
          ? nextTrackData.fadeInSeconds
          : settings.globalFadeIn;
        audio.src = safeAudioUrl(nextTrackData.audioUrl);
        audio.load();
        if (fadeIn > 0) {
          audio.volume = 0;
          audio.play().catch(() => {});
          // Fade in after canplay
          const doFadeIn = () => {
            cancelFade();
            fadeVolume(audio, 0, s.volume, fadeIn * 1000);
            audio.removeEventListener("canplay", doFadeIn);
          };
          audio.addEventListener("canplay", doFadeIn, { once: true });
        } else {
          audio.volume = s.volume;
          audio.play().catch(() => {});
        }
      }
      return { ...s, currentIdx: next, isPlaying: true, isReady: false, duration: 0, currentTime: 0 };
    };

    const onEnded = () => {
      setState(s => advanceToNext(s, true));
    };

    const onError = () => {
      setState(s => {
        // Only auto-advance on error if the player was actively playing.
        // If paused (e.g. restored from sessionStorage on page reload), do NOT
        // advance — this prevents the "track changes on reload" bug on mobile
        // Chrome where audio.load() triggers an async error event after the
        // listener attaches (e.g. CORS preflight, auth re-check, or stale URL).
        if (!s.isPlaying) {
          return { ...s, isReady: false, duration: 0 };
        }
        const tracks = s.tracks.filter(t => !!t.audioUrl);
        const next = s.currentIdx + 1;
        if (next >= tracks.length) {
          audio.pause();
          return { ...s, isPlaying: false, isReady: false, duration: 0, currentTime: 0 };
        }
        const t = tracks[next];
        if (t?.audioUrl) {
          audio.src = safeAudioUrl(t.audioUrl);
          audio.load();
          audio.play().catch(() => {});
        }
        return { ...s, currentIdx: next, isPlaying: !!t?.audioUrl, isReady: false, duration: 0, currentTime: 0 };
      });
    };

    const onPlay = () => setState(s => ({ ...s, isPlaying: true }));
    const onPause = () => setState(s => ({ ...s, isPlaying: false }));

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playTrack = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    // Cancel any in-progress crossfade/fade when manually selecting a track
    cancelFade();
    crossfadeActiveRef.current = false;
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current = null;
    }
    setState(s => {
      const tracks = s.tracks.filter(t => !!t.audioUrl);
      const t = tracks[idx];
      if (!t) return s;
      if (t.audioUrl) {
        audio.volume = s.volume;
        audio.src = safeAudioUrl(t.audioUrl);
        audio.load();
        // Apply fade-in if configured
        const settings = playbackSettingsRef.current;
        const fadeIn = settings.respectTrackFades && t.fadeInSeconds
          ? t.fadeInSeconds
          : settings.globalFadeIn;
        if (fadeIn > 0) {
          audio.volume = 0;
          audio.play().catch(() => {});
          audio.addEventListener("canplay", () => {
            fadeVolume(audio, 0, s.volume, fadeIn * 1000);
          }, { once: true });
        } else {
          audio.play().catch(() => {});
        }
      } else {
        audio.pause();
      }
      return { ...s, currentIdx: idx, isPlaying: !!t.audioUrl, isReady: false, duration: 0, currentTime: 0 };
    });
  }, [cancelFade, fadeVolume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const nextTrack = useCallback(() => {
    const audio = audioRef.current;
    setState(s => {
      // Navigate strictly within the frozen snapshot
      const tracks = s.tracks.filter(t => !!t.audioUrl);
      const next = s.isShuffle
        ? Math.floor(Math.random() * tracks.length)
        : s.currentIdx + 1;
      if (!s.isShuffle && next >= tracks.length) {
        if (audio) { audio.pause(); audio.currentTime = 0; }
        return { ...s, isPlaying: false, isReady: false, duration: 0, currentTime: 0 };
      }
      const t = tracks[next];
      if (audio && t?.audioUrl) {
        audio.src = safeAudioUrl(t.audioUrl);
        audio.load();
        audio.play().catch(() => {});
      }
      return { ...s, currentIdx: next, isPlaying: !!t?.audioUrl, isReady: false, duration: 0, currentTime: 0 };
    });
  }, []);

  /**
   * Previous track with 3-second restart rule:
   * • If currentTime > 3 s → restart the current track from the beginning.
   * • Otherwise → go to the previous track in the frozen snapshot.
   */
  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // 3-second restart rule
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      if (audio.paused) audio.play().catch(() => {});
      return;
    }
    setState(s => {
      const tracks = s.tracks.filter(t => !!t.audioUrl);
      if (tracks.length === 0) return s;
      // At the very first track, restart it rather than wrapping to end
      const prev = s.currentIdx <= 0 ? 0 : s.currentIdx - 1;
      const t = tracks[prev];
      if (audio && t?.audioUrl) {
        audio.src = safeAudioUrl(t.audioUrl);
        audio.load();
        audio.play().catch(() => {});
      }
      return { ...s, currentIdx: prev, isPlaying: !!t?.audioUrl, isReady: false, duration: 0, currentTime: 0 };
    });
  }, []);

  const toggleShuffle = useCallback(() => setState(s => ({ ...s, isShuffle: !s.isShuffle })), []);
  const toggleRepeat = useCallback(() => setState(s => ({ ...s, isRepeat: !s.isRepeat })), []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setState(s => {
      audio.muted = !s.isMuted;
      return { ...s, isMuted: !s.isMuted };
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = v;
    setState(s => ({ ...s, volume: v, isMuted: false }));
    setCache(CACHE_KEYS.VOLUME, v, TTL.UI_STATE);
  }, []);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = t;
  }, []);

  const toggleLike = useCallback((id: string) => {
    setState(s => {
      const liked = new Set(s.liked);
      if (liked.has(id)) liked.delete(id); else liked.add(id);
      return { ...s, liked };
    });
  }, []);

  const addTrack = useCallback((t: Track) => {
    setState(s => ({ ...s, tracks: [t, ...s.tracks] }));
  }, []);

  /**
   * Insert a track immediately after the current position in the session queue.
   * Session-only — never written to DB or localStorage.
   */
  const playNext = useCallback((t: Track) => {
    setState(s => {
      const withoutTrack = s.tracks.filter(tr => tr.id !== t.id);
      const insertAt = s.currentIdx >= 0 ? s.currentIdx + 1 : 0;
      const newTracks = [
        ...withoutTrack.slice(0, insertAt),
        t,
        ...withoutTrack.slice(insertAt),
      ];
      return { ...s, tracks: newTracks };
    });
  }, []);

  /**
   * Start a new single-track playback session.
   * Rotates queueId — the existing queue is replaced with just this track.
   * Pages calling addAndPlay() should prefer playQueueAt() with a full list
   * when they have surrounding context available.
   */
  const addAndPlay = useCallback((t: Track) => {
    const audio = audioRef.current;
    if (!audio || !t.audioUrl) return;
    const newQueueId = generateId();
    if (t.audioUrl) {
      audio.src = safeAudioUrl(t.audioUrl);
      audio.load();
      audio.play().catch(() => {});
    }
    setState(s => ({
      ...s,
      tracks: [t],
      currentIdx: 0,
      isPlaying: !!t.audioUrl,
      queueContext: "NONE",
      queueId: newQueueId,
      sourceType: "single",
      isReady: false,
      duration: 0,
      currentTime: 0,
    }));
  }, []);

  /**
   * Seed the queue ONLY if no playback session has been started yet (queueId is null).
   * Once a user has tapped play, this is a no-op — the active session is never overwritten.
   */
  const setQueue = useCallback((newTracks: Track[]) => {
    const validTracks = newTracks.filter(t => !!t.audioUrl);
    setState(s => {
      // Guard: only seed if no session has been started
      if (s.queueId !== null) return s;
      return { ...s, tracks: validTracks };
    });
  }, []);

  /**
   * Replace the entire queue with a context-tagged set and immediately play startIdx.
   * Freezes the queue as an IMMUTABLE SNAPSHOT and rotates queueId.
   * Next/prev/shuffle/repeat all operate exclusively within this snapshot.
   */
  const playQueueAt = useCallback((
    newTracks: Track[],
    startIdx: number,
    context: QueueContext = "NONE",
    sourceType = "",
  ) => {
    const audio = audioRef.current;
    if (!audio) return;
    const validTracks = newTracks.filter(t => !!t.audioUrl);
    const clampedIdx = Math.max(0, Math.min(startIdx, validTracks.length - 1));
    const t = validTracks[clampedIdx];
    if (!t?.audioUrl) return;
    const newQueueId = generateId();
    audio.src = safeAudioUrl(t.audioUrl);
    audio.load();
    audio.play().catch(() => {});
    setState(s => ({
      ...s,
      tracks: validTracks,
      currentIdx: clampedIdx,
      isPlaying: true,
      queueContext: context,
      queueId: newQueueId,
      sourceType,
      isReady: false,
      duration: 0,
      currentTime: 0,
    }));
  }, []);

  const setProfileName = useCallback((n: string) => setState(s => ({ ...s, profileName: n })), []);
  const setProfileBio = useCallback((b: string) => setState(s => ({ ...s, profileBio: b })), []);
  const setProfileLocation = useCallback((l: string) => setState(s => ({ ...s, profileLocation: l })), []);
  const setProfileWebsite = useCallback((w: string) => setState(s => ({ ...s, profileWebsite: w })), []);
  const setProfileSocials = useCallback((socials: PlayerState["profileSocials"]) => setState(s => ({ ...s, profileSocials: socials })), []);
  const setProfileAvatar = useCallback((url: string) => setState(s => ({ ...s, profileAvatar: url })), []);
  const setProfileBanner = useCallback((url: string) => setState(s => ({ ...s, profileBanner: url })), []);
  const addTip = useCallback((amount: number) => setState(s => ({ ...s, tipsEarned: s.tipsEarned + amount })), []);
  const addTrackTip = useCallback((trackId: string, amount: number) => setState(s => ({
    ...s,
    trackTips: { ...s.trackTips, [trackId]: (s.trackTips[trackId] || 0) + amount },
    tipsEarned: s.tipsEarned + amount,
  })), []);
  const addComment = useCallback((trackId: string, comment: Comment) => setState(s => ({
    ...s,
    trackComments: {
      ...s.trackComments,
      [trackId]: [...(s.trackComments[trackId] || []), comment],
    },
  })), []);
  const incrementShare = useCallback((trackId: string) => setState(s => {
    const updated = s.tracks.map(t => t.id === trackId ? { ...t, shareCount: (t.shareCount || 0) + 1 } : t);
    return { ...s, tracks: updated };
  }), []);

  const patchTrack = useCallback((trackId: string, patch: Partial<Track>) => {
    setState(s => ({
      ...s,
      tracks: s.tracks.map(t => t.id === trackId ? { ...t, ...patch } : t),
    }));
  }, []);

  const currentTrackId = state.currentIdx >= 0
    ? (state.tracks.filter(t => !!t.audioUrl)[state.currentIdx]?.id ?? null)
    : null;
  const backgroundCreatorHandle = state.currentIdx >= 0
    ? (state.tracks.filter(t => !!t.audioUrl)[state.currentIdx]?.creatorHandle ?? null)
    : null;
  const queueContextLabel = QUEUE_CONTEXT_LABELS[state.queueContext] ?? "Now Playing";

  // ── Play Audit (Trust Layer) ─────────────────────────────────────────────────
  const playSessionRef = useRef<{ sessionId: string; songId: number; witnessId?: string; reported: boolean } | null>(null);
  const recordPlayMutation = trpc.songs.recordPlay.useMutation();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      const tracks = state.tracks.filter(t => !!t.audioUrl);
      const track = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
      if (!track?.id) return;
      const songId = parseInt(track.id, 10);
      if (isNaN(songId)) return;
      if (!playSessionRef.current || playSessionRef.current.songId !== songId) {
        playSessionRef.current = {
          sessionId: generateId(),
          songId,
          witnessId: track.witnessId,
          reported: false,
        };
      }
    };

    const onTimeUpdate = () => {
      const session = playSessionRef.current;
      if (!session || session.reported) return;
      const elapsed = audio.currentTime;
      if (elapsed >= MIN_PLAY_SECONDS) {
        session.reported = true;
        recordPlayMutation.mutate({
          songId: session.songId,
          witnessId: session.witnessId,
          sessionId: session.sessionId,
          durationSeconds: Math.floor(elapsed),
          totalDurationSeconds: audio.duration > 0 ? Math.floor(audio.duration) : undefined,
        });
      }
    };

    const onEnded = () => {
      const session = playSessionRef.current;
      if (session && !session.reported && audio.currentTime >= MIN_PLAY_SECONDS) {
        session.reported = true;
        recordPlayMutation.mutate({
          songId: session.songId,
          witnessId: session.witnessId,
          sessionId: session.sessionId,
          durationSeconds: Math.floor(audio.currentTime),
          totalDurationSeconds: audio.duration > 0 ? Math.floor(audio.duration) : undefined,
        });
      }
      playSessionRef.current = null;
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentIdx, state.tracks]);

  // ── MediaSession API ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const tracks = state.tracks.filter(t => !!t.audioUrl);
    const track = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
    if (!track) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Unknown Track',
      artist: track.artist || 'Living Nexus',
      album: 'Living Nexus',
      artwork: track.artUrl
        ? [
            { src: track.artUrl, sizes: '512x512', type: 'image/jpeg' },
            { src: track.artUrl, sizes: '256x256', type: 'image/jpeg' },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      prevTrack();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      nextTrack();
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const audio = audioRef.current;
      if (audio) audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset ?? 10));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const audio = audioRef.current;
      if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (details.seekOffset ?? 10));
    });
  }, [state.currentIdx, state.tracks, nextTrack, prevTrack]);

  const isReady = state.isReady;

  return (
    <PlayerContext.Provider value={{
      state, isReady, audioRef, allTracks, currentTrackId, queueContextLabel,
      queueId: state.queueId,
      playTrack, togglePlay, nextTrack, prevTrack,
      toggleShuffle, toggleRepeat, toggleMute, setVolume, seek,
      toggleLike, addTrack, addAndPlay, playNext, setQueue, playQueueAt, patchTrack,
      openNowPlayingPanel, isNowPlayingPanelOpen, closeNowPlayingPanel,
      openTheater, isTheaterOpen, closeTheater,
      setProfileName, setProfileBio, setProfileLocation, setProfileWebsite, setProfileSocials,
      setProfileAvatar, setProfileBanner,
      addTip, addTrackTip, addComment, incrementShare,
      backgroundCreatorHandle,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
