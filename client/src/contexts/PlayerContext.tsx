/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlayerContext
   Global audio player state shared across all pages
═══════════════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";

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
}

export const DEMO_TRACKS: Track[] = [
  { id: "d1", title: "Celestial Drift", artist: "Living Nexus Artist", genre: "Ambient", emoji: "🌌", bg: "linear-gradient(135deg,#1a0a2e,#0a1a2e)", dur: "3:42", plays: 0 },
  { id: "d2", title: "Golden Hour Protocol", artist: "Living Nexus Artist", genre: "Electronic", emoji: "✨", bg: "linear-gradient(135deg,#2e1a0a,#1a2e0a)", dur: "4:18", plays: 0 },
  { id: "d3", title: "Midnight Sermon", artist: "Living Nexus Artist", genre: "Lo-fi", emoji: "🕯️", bg: "linear-gradient(135deg,#0a0a2e,#1a0a1a)", dur: "2:55", plays: 0 },
  { id: "d4", title: "Sacred Frequencies", artist: "Living Nexus Artist", genre: "Ambient", emoji: "🔮", bg: "linear-gradient(135deg,#1a0a2e,#2e0a1a)", dur: "5:01", plays: 0 },
  { id: "d5", title: "Throne of Bass", artist: "Living Nexus Artist", genre: "Trap", emoji: "👑", bg: "linear-gradient(135deg,#2e1a00,#1a0a00)", dur: "3:28", plays: 0 },
  { id: "d6", title: "Violet Prophecy", artist: "Living Nexus Artist", genre: "R&B", emoji: "💜", bg: "linear-gradient(135deg,#1a0a2e,#0a1a2e)", dur: "4:07", plays: 0 },
  { id: "d7", title: "Architect of Sound", artist: "Living Nexus Artist", genre: "House", emoji: "🏛️", bg: "linear-gradient(135deg,#0a2e1a,#0a1a2e)", dur: "6:22", plays: 0 },
  { id: "d8", title: "Divine Static", artist: "Living Nexus Artist", genre: "Indie", emoji: "⚡", bg: "linear-gradient(135deg,#2e2e0a,#1a0a0a)", dur: "3:14", plays: 0 },
];

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
  tracks: Track[]; // user-uploaded tracks
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
}

interface PlayerContextValue {
  state: PlayerState;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  allTracks: () => Track[];
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
  addAndPlay: (t: Track) => void;
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
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const [state, setState] = useState<PlayerState>({
    currentIdx: -1,
    isPlaying: false,
    isShuffle: false,
    isRepeat: false,
    isMuted: false,
    volume: 0.75,
    currentTime: 0,
    duration: 0,
    liked: new Set(),
    tracks: [],
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
  });

  const allTracks = useCallback(() => [...DEMO_TRACKS, ...state.tracks], [state.tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = state.volume;

    const onTimeUpdate = () => setState(s => ({ ...s, currentTime: audio.currentTime }));
    const onDurationChange = () => setState(s => ({ ...s, duration: audio.duration || 0 }));
    const onEnded = () => {
      setState(s => {
        const tracks = [...DEMO_TRACKS, ...s.tracks];
        if (s.isRepeat) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          return s;
        }
        let next = s.currentIdx + 1;
        if (s.isShuffle) next = Math.floor(Math.random() * tracks.length);
        if (next >= tracks.length) next = 0;
        const t = tracks[next];
        if (t?.audioUrl) {
          audio.src = t.audioUrl;
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
      const tracks = [...DEMO_TRACKS, ...s.tracks];
      const t = tracks[idx];
      if (!t) return s;
      if (t.audioUrl) {
        audio.src = t.audioUrl;
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
      const tracks = [...DEMO_TRACKS, ...s.tracks];
      let next = s.isShuffle
        ? Math.floor(Math.random() * tracks.length)
        : (s.currentIdx + 1) % tracks.length;
      const t = tracks[next];
      const audio = audioRef.current;
      if (audio && t?.audioUrl) {
        audio.src = t.audioUrl;
        audio.play().catch(() => {});
      }
      return { ...s, currentIdx: next, isPlaying: !!t?.audioUrl };
    });
  }, []);

  const prevTrack = useCallback(() => {
    setState(s => {
      const tracks = [...DEMO_TRACKS, ...s.tracks];
      const prev = (s.currentIdx - 1 + tracks.length) % tracks.length;
      const t = tracks[prev];
      const audio = audioRef.current;
      if (audio && t?.audioUrl) {
        audio.src = t.audioUrl;
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

  // Add a track (or replace existing) and immediately play it
  const addAndPlay = useCallback((t: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    setState(s => {
      const filtered = s.tracks.filter(tr => tr.id !== t.id);
      const newTracks = [t, ...filtered];
      const newIdx = DEMO_TRACKS.length; // first user-track slot
      if (t.audioUrl) {
        audio.src = t.audioUrl;
        audio.play().catch(() => {});
      }
      return { ...s, tracks: newTracks, currentIdx: newIdx, isPlaying: !!t.audioUrl };
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
    const all = [...DEMO_TRACKS, ...s.tracks];
    const updated = all.map(t => t.id === trackId ? { ...t, shareCount: (t.shareCount || 0) + 1 } : t);
    const userTracks = updated.filter(t => t.isOwn);
    return { ...s, tracks: userTracks };
  }), []);
  const setRoom = useCallback((r: PlayerState["room"]) => setState(s => ({ ...s, room: r })), []);

  return (
    <PlayerContext.Provider value={{
      state, audioRef, allTracks,
      playTrack, togglePlay, nextTrack, prevTrack,
      toggleShuffle, toggleRepeat, toggleMute, setVolume, seek,
      toggleLike, addTrack, addAndPlay,
      setProfileName, setProfileBio, setProfileLocation, setProfileWebsite, setProfileSocials,
      setProfileAvatar, setProfileBanner,
      addTip, addTrackTip, addComment, incrementShare, setRoom,
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
