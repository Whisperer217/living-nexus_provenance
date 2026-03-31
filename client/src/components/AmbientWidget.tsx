/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — AmbientWidget
   Phase 8: Floating ambient player widget.
   Renders in the bottom-right corner, above the main PlayerBar.
   Handles YouTube iframes and direct audio playback.
   Completely isolated from the main PlayerContext.
═══════════════════════════════════════════════════════════════════════════ */

import { useRef, useEffect, useState } from "react";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import {
  X, Minimize2, Maximize2, Volume2, VolumeX,
  Music2, Youtube, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// ── YouTube embed URL builder ──────────────────────────────────────────────────
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;

    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
      // Handle playlist URLs
      const listId = u.searchParams.get("list");
      if (!videoId && listId) {
        return `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1&enablejsapi=1`;
      }
    }

    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  } catch {
    return null;
  }
}

// ── Source icon ────────────────────────────────────────────────────────────────
function SourceIcon({ type }: { type: string }) {
  if (type === "youtube") return <Youtube className="w-3.5 h-3.5 text-red-400" />;
  if (type === "suno") return <Music2 className="w-3.5 h-3.5 text-purple-400" />;
  return <Music2 className="w-3.5 h-3.5 text-white/40" />;
}

// ── Main widget ────────────────────────────────────────────────────────────────
export default function AmbientWidget() {
  const { track, isPlaying, volume, minimized, pause, resume, stop, setVolume, toggleMinimized } =
    useAmbientPlayer();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [showVolume, setShowVolume] = useState(false);
  const [muted, setMuted] = useState(false);
  const prevVolume = useRef(volume);

  // When track changes and it's a YouTube/Suno type, the iframe handles playback
  useEffect(() => {
    if (!track) return;
    if (track.sourceType === "youtube" || track.sourceType === "suno") {
      // iframe autoplay handles it; nothing extra needed
    }
  }, [track]);

  if (!track) return null;

  const embedUrl =
    track.sourceType === "youtube" ? getYouTubeEmbedUrl(track.sourceUrl) : null;

  const handleMuteToggle = () => {
    if (muted) {
      setVolume(prevVolume.current || 0.5);
      setMuted(false);
    } else {
      prevVolume.current = volume;
      setVolume(0);
      setMuted(true);
    }
  };

  return (
    <div
      className="fixed bottom-24 right-4 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300"
      style={{
        width: minimized ? 260 : 320,
        background: "oklch(0.1 0.04 280 / 0.95)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
        <SourceIcon type={track.sourceType} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/90 truncate">{track.title}</p>
          {track.artist && (
            <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Volume toggle */}
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-white/40 hover:text-white/80"
            onClick={() => setShowVolume((v) => !v)}
            title="Volume"
          >
            {muted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </Button>
          {/* Open source */}
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-white/40 hover:text-white/80"
            onClick={() => window.open(track.sourceUrl, "_blank")}
            title="Open source"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          {/* Minimize/maximize */}
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-white/40 hover:text-white/80"
            onClick={toggleMinimized}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </Button>
          {/* Close */}
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-white/40 hover:text-red-400"
            onClick={stop}
            title="Stop ambient"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Volume slider (collapsible) ── */}
      {showVolume && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-white/40 hover:text-white/80 shrink-0"
            onClick={handleMuteToggle}
          >
            {muted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </Button>
          <Slider
            value={[muted ? 0 : volume * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => {
              setVolume(v / 100);
              if (v > 0) setMuted(false);
            }}
            className="flex-1"
          />
          <span className="text-[10px] text-white/40 w-7 text-right shrink-0">
            {muted ? "0" : Math.round(volume * 100)}%
          </span>
        </div>
      )}

      {/* ── Content (iframe or audio controls) ── */}
      {!minimized && (
        <>
          {embedUrl ? (
            /* YouTube embed */
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={track.title}
              />
            </div>
          ) : (
            /* Direct audio or Suno — show thumbnail + play/pause */
            <div className="flex flex-col items-center gap-3 p-4">
              {track.thumbnailUrl ? (
                <img
                  src={track.thumbnailUrl}
                  alt={track.title}
                  className="w-full rounded-lg object-cover"
                  style={{ maxHeight: 140 }}
                />
              ) : (
                <div
                  className="w-full rounded-lg flex items-center justify-center"
                  style={{ height: 80, background: "oklch(0.15 0.05 280)" }}
                >
                  <Music2 className="w-8 h-8 text-white/20" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={isPlaying ? pause : resume}
                  className="bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs px-4"
                >
                  {isPlaying ? "Pause" : "Resume"}
                </Button>
                <a
                  href={track.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Open
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Minimized state: just the pill ── */}
      {minimized && (
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[10px] text-white/40">
            {isPlaying ? "▶ Playing ambient" : "⏸ Paused"}
          </span>
          {track.sourceType === "audio" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] text-white/50 hover:text-white/80 h-5 px-2"
              onClick={isPlaying ? pause : resume}
            >
              {isPlaying ? "Pause" : "Resume"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
