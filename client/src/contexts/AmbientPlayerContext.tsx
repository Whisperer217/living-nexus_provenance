/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — AmbientPlayerContext
   Phase 8: Background Playback
   A lightweight, session-only ambient audio player that runs completely
   separate from the main LN PlayerContext. Designed for external content
   (YouTube embeds, Suno links) so creators can have ambient sound playing
   while browsing the platform without interrupting their LN queue.

   Key constraints:
   - Session-only: no persistence, clears on page reload
   - Never touches the main PlayerContext queue
   - Volume is independent from main player
   - Minimizable floating widget
═══════════════════════════════════════════════════════════════════════════ */

import {
  createContext, useContext, useRef, useState, useCallback,
  type ReactNode,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface AmbientTrack {
  id: string;
  title: string;
  artist?: string;
  sourceUrl: string;           // Original URL (YouTube / Suno / direct audio)
  sourceType: "youtube" | "suno" | "audio" | "other";
  thumbnailUrl?: string | null;
}

interface AmbientPlayerState {
  track: AmbientTrack | null;
  isPlaying: boolean;
  volume: number;              // 0–1
  minimized: boolean;
}

interface AmbientPlayerActions {
  play: (track: AmbientTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  toggleMinimized: () => void;
}

type AmbientPlayerContextValue = AmbientPlayerState & AmbientPlayerActions;

// ── Context ────────────────────────────────────────────────────────────────────
const AmbientPlayerContext = createContext<AmbientPlayerContextValue | null>(null);

export function useAmbientPlayer(): AmbientPlayerContextValue {
  const ctx = useContext(AmbientPlayerContext);
  if (!ctx) throw new Error("useAmbientPlayer must be used inside AmbientPlayerProvider");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function AmbientPlayerProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<AmbientTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [minimized, setMinimized] = useState(false);

  // For direct audio URLs we use an <audio> element; for YouTube/Suno we open
  // an iframe embed. The iframe ref is managed by the AmbientWidget component.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((newTrack: AmbientTrack) => {
    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    setTrack(newTrack);
    setIsPlaying(true);
    setMinimized(false);

    if (newTrack.sourceType === "audio") {
      const audio = new Audio(newTrack.sourceUrl);
      audio.volume = volume;
      audio.play().catch(() => setIsPlaying(false));
      audio.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current = audio;
    }
    // YouTube/Suno: the AmbientWidget iframe handles playback
  }, [volume]);

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setTrack(null);
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const toggleMinimized = useCallback(() => setMinimized((m) => !m), []);

  return (
    <AmbientPlayerContext.Provider
      value={{ track, isPlaying, volume, minimized, play, pause, resume, stop, setVolume, toggleMinimized }}
    >
      {children}
    </AmbientPlayerContext.Provider>
  );
}
