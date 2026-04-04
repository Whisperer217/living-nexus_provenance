/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlayerContext
   Global audio player state shared across all pages
═══════════════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { safeAudioUrl } from "@shared/const";
import { getCache, setCache, CACHE_KEYS, TTL } from "@/lib/lnxCache";
import { trpc } from "@/lib/trpc";

/** Generate a stable UUID v4 for this listening session */
function generateSessionId(): string {
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
  creatorHandle?: string; // used for background creator page routing on queue advance
  tipsEnabled?: boolean; // true when creator has Stripe tips enabled
  creatorId?: number; // numeric user ID for Zone 3 artist link
  coverPositionX?: number; // objectPosition X (0-100)
  coverPositionY?: number; // objectPosition Y (0-100)
  visualReady?: boolean; // true once auto-video MP4 is generated and stored
  autoVideoUrl?: string; // S3 CDN URL of the looping MP4 visual
  creatorRole?: string; // user role of the creator (e.g. "founder", "admin", "user")
}

/** Describes WHERE the current queue was built from — controls shuffle/repeat scope */
export type QueueContext =
  | "CREATOR_PAGE"   // creator's published songs only
  | "EXPLORE"        // all published songs on platform
  | "HOME"           // latest releases
  | "SEARCH"         // search results
  | "SONG_DETAIL"    // related songs (same genre / creator)
  | "PLAYLIST"       // user's personal saved playlist
  | "LIKED"          // user's liked songs
  | "NONE";          // no context (single addAndPlay)

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

// DEMO_TRACKS removed — queue only contains real DB-sourced tracks with valid audio URLs
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
  liked: Set<string>;
  tracks: Track[]; // current context queue
  queueContext: QueueContext; // where the queue was built from
  profileName: string;
  profileBio: string;
  profileLocation: string;
  profileWebsite: string;
  profileSocials: { twitter: string; instagram: string; youtube: string; soundcloud: string };
  profileAvatar: string | null;
  profileBanner: string | null;
  tipsEarned: number;
  trackComments: Record<string, Comment[]>; // trackId -> comments
  trackTips: Record<string, number>; // trackId -> tip total
  room: { code: string; name: string; listeners: string[] } | null;
  jukeboxQueueCount: number;
}

interface PlayerContextValue {
  state: PlayerState;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  allTracks: () => Track[];
  currentTrackId: string | null;
  /** Label for the current queue context (e.g. "Explore", "Creator", "My Playlist") */
  queueContextLabel: string;
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
  /** Add a single track and play it immediately (context = NONE) */
  addAndPlay: (t: Track) => void;
  /**
   * Insert a track immediately after the current position in the session queue.
   * Does NOT start playback. Does NOT persist to DB or localStorage.
   * If the queue is empty, the track becomes the first item (but does not auto-play).
   */
  playNext: (t: Track) => void;
  /** Open the Now Playing side panel (mobile) */
  openNowPlayingPanel: () => void;
  /** Whether the Now Playing side panel is open */
  isNowPlayingPanelOpen: boolean;
  /** Close the Now Playing side panel */
  closeNowPlayingPanel: () => void;
  /** Open the full-screen Theater Player (desktop) */
  openTheater: () => void;
  /** Whether the Theater Player overlay is open */
  isTheaterOpen: boolean;
  /** Close the Theater Player overlay */
  closeTheater: () => void;
  /** Replace the entire queue without starting playback (used for initial DB seed) */
  setQueue: (tracks: Track[]) => void;
  /** Patch fields on a single track in the queue by track id (e.g. update visualReady after worker finishes) */
  patchTrack: (trackId: string, patch: Partial<Track>) => void;
  /**
   * Replace the entire queue with a context-tagged set and immediately play startIdx.
   * Shuffle and repeat will operate ONLY within this queue.
   */
  playQueueAt: (tracks: Track[], startIdx: number, context?: QueueContext) => void;
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
  setRoom: (r: PlayerState["room"]) => void;
  /** Update the live Jukebox queue count (set by TogetherPage, read by sidebar) */
  setJukeboxQueueCount: (n: number) => void;
  /** The creator handle of the currently playing track — for background routing */
  backgroundCreatorHandle: string | null;
}

const PLAYER_SESSION_KEY = "ln_player_session";

function loadSessionTracks(): { tracks: Track[]; currentIdx: number; queueContext: QueueContext } {
  try {
    const raw = sessionStorage.getItem(PLAYER_SESSION_KEY);
    if (!raw) return { tracks: [], currentIdx: -1, queueContext: "NONE" };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tracks) && typeof parsed.currentIdx === "number") {
      return {
        tracks: parsed.tracks as Track[],
        currentIdx: parsed.currentIdx,
        queueContext: (parsed.queueContext ?? "NONE") as QueueContext,
      };
    }
  } catch { /* ignore */ }
  return { tracks: [], currentIdx: -1, queueContext: "NONE" };
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(new Audio());
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
      isPlaying: false, // never auto-play on reload
      isShuffle: false,
      isRepeat: false,
      isMuted: false,
      volume: getCache<number>(CACHE_KEYS.VOLUME) ?? 0.75,
      currentTime: 0,
      duration: 0,
      liked: new Set(),
      tracks: session.tracks,
      queueContext: session.queueContext,
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
      room: null,
      jukeboxQueueCount: 0,
    };
  });

  // Only real DB-sourced tracks — DEMO_TRACKS is empty, guard is here for safety
  const allTracks = useCallback(() => state.tracks.filter(t => !!t.audioUrl), [state.tracks]);

  // Persist queue + currentIdx to sessionStorage so navigation doesn't lose the player state
  useEffect(() => {
    try {
      sessionStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify({
        tracks: state.tracks,
        currentIdx: state.currentIdx,
        queueContext: state.queueContext,
      }));
    } catch { /* quota exceeded — ignore */ }
  }, [state.tracks, state.currentIdx, state.queueContext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = state.volume;

    const onTimeUpdate = () => setState(s => ({ ...s, currentTime: audio.currentTime }));
    const onDurationChange = () => setState(s => ({ ...s, duration: audio.duration || 0 }));
    const onEnded = () => {
      setState(s => {
        const tracks = s.tracks.filter(t => !!t.audioUrl);
        if (s.isRepeat) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          return s;
        }
        // Shuffle and repeat operate ONLY within the current context queue
        let next = s.currentIdx + 1;
        if (s.isShuffle) {
          // Pick a random index that is NOT the current one (if queue has >1 track)
          if (tracks.length > 1) {
            let rand = Math.floor(Math.random() * (tracks.length - 1));
            if (rand >= s.currentIdx) rand += 1;
            next = rand;
          } else {
            next = 0;
          }
        }
        // Wrap around within the context queue
        if (next >= tracks.length) next = 0;
        const t = tracks[next];
        if (t?.audioUrl) {
          audio.src = safeAudioUrl(t.audioUrl);
          audio.play().catch(() => {});
        }
        return { ...s, currentIdx: next, isPlaying: !!t?.audioUrl };
      });
    };
    const onPlay = () => setState(s => ({ ...s, isPlaying: true }));
    const onPause = () => setState(s => ({ ...s, isPlaying: false }));

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [state.tracks]);

  const playTrack = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    setState(s => {
      const tracks = s.tracks.filter(t => !!t.audioUrl);
      const t = tracks[idx];
      if (!t) return s;
      if (t.audioUrl) {
        audio.src = safeAudioUrl(t.audioUrl);
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      return { ...s, currentIdx: idx, isPlaying: !!t.audioUrl };
    });
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const nextTrack = useCallback(() => {
    setState(s => {
      const tracks = s.tracks.filter(t => !!t.audioUrl);
      let next = s.isShuffle
        ? Math.floor(Math.random() * tracks.length)
        : (s.currentIdx + 1) % tracks.length;
      const t = tracks[next];
      const audio = audioRef.current;
      if (audio && t?.audioUrl) {
        audio.src = safeAudioUrl(t.audioUrl);
        audio.play().catch(() => {});
      }
      return { ...s, currentIdx: next, isPlaying: !!t?.audioUrl };
    });
  }, []);

  const prevTrack = useCallback(() => {
    setState(s => {
      const tracks = s.tracks.filter(t => !!t.audioUrl);
      const prev = (s.currentIdx - 1 + tracks.length) % tracks.length;
      const t = tracks[prev];
      const audio = audioRef.current;
      if (audio && t?.audioUrl) {
        audio.src = safeAudioUrl(t.audioUrl);
        audio.play().catch(() => {});
      }
      return { ...s, currentIdx: prev, isPlaying: !!t?.audioUrl };
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
    setCache(CACHE_KEYS.VOLUME, v, TTL.UI_STATE); // persist across page reloads
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
   * If the track is already in the queue, it is moved to the next position.
   */
  const playNext = useCallback((t: Track) => {
    setState(s => {
      // Remove the track if it already exists to avoid duplicates
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

  // Add a single track and immediately play it — context is NONE (no queue context)
  // Guard: silently reject tracks without a real audio URL
  const addAndPlay = useCallback((t: Track) => {
    const audio = audioRef.current;
    if (!audio || !t.audioUrl) return;
    setState(s => {
      const filtered = s.tracks.filter(tr => tr.id !== t.id);
      const newTracks = [t, ...filtered];
      const newIdx = 0;
      if (t.audioUrl) {
        audio.src = safeAudioUrl(t.audioUrl);
        audio.play().catch(() => {});
      }
      return { ...s, tracks: newTracks, currentIdx: newIdx, isPlaying: !!t.audioUrl, queueContext: "NONE" };
    });
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
  const setRoom = useCallback((r: PlayerState["room"]) => setState(s => ({ ...s, room: r })), []);
  const setJukeboxQueueCount = useCallback((n: number) => setState(s => ({ ...s, jukeboxQueueCount: n })), []);

  /** Patch a single track's fields in the queue by id */
  const patchTrack = useCallback((trackId: string, patch: Partial<Track>) => {
    setState(s => ({
      ...s,
      tracks: s.tracks.map(t => t.id === trackId ? { ...t, ...patch } : t),
    }));
  }, []);

  /** Replace the entire queue without starting playback (used for initial DB seed) */
  const setQueue = useCallback((newTracks: Track[]) => {
    const validTracks = newTracks.filter(t => !!t.audioUrl);
    setState(s => {
      // Only seed if queue is currently empty to avoid overwriting user-initiated playback
      if (s.tracks.length > 0) return s;
      return { ...s, tracks: validTracks };
    });
  }, []);

  /**
   * Replace the entire queue with a context-tagged set and immediately play startIdx.
   * Shuffle and repeat will operate ONLY within this context queue.
   */
  const playQueueAt = useCallback((newTracks: Track[], startIdx: number, context: QueueContext = "NONE") => {
    const audio = audioRef.current;
    if (!audio) return;
    const validTracks = newTracks.filter(t => !!t.audioUrl);
    const clampedIdx = Math.max(0, Math.min(startIdx, validTracks.length - 1));
    const t = validTracks[clampedIdx];
    if (!t?.audioUrl) return;
    audio.src = safeAudioUrl(t.audioUrl);
    audio.play().catch(() => {});
    setState(s => ({ ...s, tracks: validTracks, currentIdx: clampedIdx, isPlaying: true, queueContext: context }));
  }, []);

  const currentTrackId = state.currentIdx >= 0 ? (state.tracks.filter(t => !!t.audioUrl)[state.currentIdx]?.id ?? null) : null;
  const backgroundCreatorHandle = state.currentIdx >= 0 ? (state.tracks.filter(t => !!t.audioUrl)[state.currentIdx]?.creatorHandle ?? null) : null;
  const queueContextLabel = QUEUE_CONTEXT_LABELS[state.queueContext] ?? "Now Playing";

  // ── Play Audit (Trust Layer) ─────────────────────────────────────────────────
  // Each track gets a fresh sessionId when it starts playing.
  // After MIN_PLAY_SECONDS (30 s) of continuous listening, we fire recordPlay once.
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
      // Start a new session if the track changed or no session exists
      if (!playSessionRef.current || playSessionRef.current.songId !== songId) {
        playSessionRef.current = {
          sessionId: generateSessionId(),
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
        session.reported = true; // prevent duplicate fires
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
      // On natural end, fire a final play event if not already reported
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
      // Reset session for next track
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

  // ── MediaSession API: lock screen / notification shade controls ──
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

  return (
    <PlayerContext.Provider value={{
      state, audioRef, allTracks, currentTrackId, queueContextLabel,
      playTrack, togglePlay, nextTrack, prevTrack,
      toggleShuffle, toggleRepeat, toggleMute, setVolume, seek,
      toggleLike, addTrack, addAndPlay, playNext, setQueue, playQueueAt, patchTrack,
      openNowPlayingPanel, isNowPlayingPanelOpen, closeNowPlayingPanel,
      openTheater, isTheaterOpen, closeTheater,
      setProfileName, setProfileBio, setProfileLocation, setProfileWebsite, setProfileSocials,
      setProfileAvatar, setProfileBanner,
      addTip, addTrackTip, addComment, incrementShare, setRoom, setJukeboxQueueCount,
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
