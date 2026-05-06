/**
 * ChildrensBookReader — Living Nexus Children's Book Narrative Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Principle: Page Atmosphere
 *
 * Children's books are NOT panel logic — they are page atmosphere.
 * This engine treats the full page as the unit of meaning.
 *
 * Desktop default: Spread (open-book framing, visual breathing room)
 * Mobile default:  Single full page (no panel splitting)
 *
 * Features:
 * - Warm, always-visible UI chrome (larger tap targets)
 * - Soft page-flip animation (not slide)
 * - Ambient Reading Mode: particles, soft page glow, warm themes
 * - Narration Anchors: voice clip / SFX / music cue per page turn
 * - Tap anywhere to advance
 * - Read Aloud placeholder (future TTS)
 *
 * Narration Anchor format (stored in pagesJson per page):
 * { page: number, narration: { voiceUrl?: string, sfxUrl?: string, musicUrl?: string } }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, X, Volume2, VolumeX,
  Sparkles, BookOpen, Maximize2, Minimize2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChildrensPage {
  pageNumber: number;
  imageUrl: string;
  caption?: string;
  narration?: {
    voiceUrl?: string;
    sfxUrl?: string;
    musicUrl?: string;
  };
}

type AmbientTheme = "none" | "fireplace" | "rain" | "nightsky" | "forest";

interface Props {
  pages: ChildrensPage[];
  title: string;
  onClose: () => void;
  startPage?: number;
}

// ── Ambient particle system ───────────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  drift: number;
  color: string;
}

function useParticles(active: boolean, theme: AmbientTheme) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const frameRef = useRef<number | null>(null);
  const counterRef = useRef(0);

  const themeColors: Record<AmbientTheme, string[]> = {
    none: [],
    fireplace: ["#FF6B35", "#FF9A3C", "#FFD166", "#FFEFBA"],
    rain: ["#A8D8EA", "#B8E0F7", "#D4EDFF"],
    nightsky: ["#E8DFC8", "#C9A84C", "#FFFFFF"],
    forest: ["#90EE90", "#98FB98", "#7CFC00", "#ADFF2F"],
  };

  useEffect(() => {
    if (!active || theme === "none") {
      setParticles([]);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    const colors = themeColors[theme];
    const maxParticles = 18;

    const tick = () => {
      setParticles(prev => {
        let next = prev
          .map(p => ({
            ...p,
            y: theme === "rain" ? p.y + p.speed : p.y - p.speed,
            x: p.x + Math.sin(p.y * 0.02) * p.drift,
            opacity: p.opacity - 0.003,
          }))
          .filter(p => p.opacity > 0 && p.y > -20 && p.y < window.innerHeight + 20);

        if (next.length < maxParticles && Math.random() < 0.15) {
          counterRef.current++;
          next = [...next, {
            id: counterRef.current,
            x: Math.random() * window.innerWidth,
            y: theme === "rain" ? -10 : window.innerHeight + 10,
            size: Math.random() * 4 + 2,
            opacity: Math.random() * 0.5 + 0.2,
            speed: Math.random() * 1.5 + 0.5,
            drift: Math.random() * 0.8 - 0.4,
            color: colors[Math.floor(Math.random() * colors.length)],
          }];
        }
        return next;
      });
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, theme]);

  return particles;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChildrensBookReader({ pages, title, onClose, startPage = 0 }: Props) {
  const totalPages = pages.length;
  const [pageIdx, setPageIdx] = useState(Math.max(0, Math.min(startPage, totalPages - 1)));
  const [isSpread, setIsSpread] = useState(() => window.innerWidth >= 768);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<"forward" | "back">("forward");
  const [ambientActive, setAmbientActive] = useState(false);
  const [ambientTheme, setAmbientTheme] = useState<AmbientTheme>("fireplace");
  const [showAmbientMenu, setShowAmbientMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const particles = useParticles(ambientActive, ambientTheme);

  // ── UI auto-hide (children's: stays visible longer — 6s) ──────────────────
  const bumpUI = useCallback(() => {
    setShowUI(true);
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    uiTimerRef.current = setTimeout(() => setShowUI(false), 6000);
  }, []);

  useEffect(() => {
    bumpUI();
    return () => { if (uiTimerRef.current) clearTimeout(uiTimerRef.current); };
  }, [bumpUI]);

  // ── Responsive spread ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsSpread(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Narration anchor playback ──────────────────────────────────────────────
  const playNarration = useCallback((page: ChildrensPage) => {
    if (!soundEnabled || !page.narration) return;
    const url = page.narration.voiceUrl || page.narration.sfxUrl || page.narration.musicUrl;
    if (!url) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(url);
    audio.volume = 0.7;
    audio.play().catch(() => {}); // graceful fail if autoplay blocked
    audioRef.current = audio;
  }, [soundEnabled]);

  // ── Page navigation with flip animation ───────────────────────────────────
  const goTo = useCallback((idx: number, dir: "forward" | "back") => {
    const next = Math.max(0, Math.min(idx, totalPages - 1));
    if (next === pageIdx || isFlipping) return;
    setFlipDir(dir);
    setIsFlipping(true);
    setTimeout(() => {
      setPageIdx(next);
      setIsFlipping(false);
      playNarration(pages[next]);
    }, 380);
    bumpUI();
  }, [pageIdx, totalPages, isFlipping, playNarration, pages, bumpUI]);

  const goNext = useCallback(() => {
    const step = isSpread ? 2 : 1;
    goTo(pageIdx + step, "forward");
  }, [pageIdx, isSpread, goTo]);

  const goPrev = useCallback(() => {
    const step = isSpread ? 2 : 1;
    goTo(pageIdx - step, "back");
  }, [pageIdx, isSpread, goTo]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  // ── Touch ──────────────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    bumpUI();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Spread pair ────────────────────────────────────────────────────────────
  const rightPageIdx = isSpread && pageIdx < totalPages - 1 ? pageIdx + 1 : null;

  // ── Ambient theme label ────────────────────────────────────────────────────
  const themeLabels: Record<AmbientTheme, string> = {
    none: "Off",
    fireplace: "🔥 Fireplace",
    rain: "🌧 Rain",
    nightsky: "✨ Night Sky",
    forest: "🌿 Forest",
  };

  // ── Warm background color per ambient theme ────────────────────────────────
  const bgColors: Record<AmbientTheme, string> = {
    none: "#1A1008",
    fireplace: "#1C0F06",
    rain: "#0A1220",
    nightsky: "#060A18",
    forest: "#071510",
  };

  const glowColors: Record<AmbientTheme, string> = {
    none: "rgba(196,154,40,0.05)",
    fireplace: "rgba(255,107,53,0.08)",
    rain: "rgba(168,216,234,0.06)",
    nightsky: "rgba(196,154,40,0.07)",
    forest: "rgba(144,238,144,0.06)",
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden select-none"
      style={{ background: bgColors[ambientTheme] }}
      onMouseMove={bumpUI}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={bumpUI}
    >
      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes cbFlipForward {
          0%   { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1); }
          40%  { opacity: 0.2; transform: perspective(1200px) rotateY(-12deg) scale(0.97); }
          60%  { opacity: 0.2; transform: perspective(1200px) rotateY(12deg) scale(0.97); }
          100% { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1); }
        }
        @keyframes cbFlipBack {
          0%   { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1); }
          40%  { opacity: 0.2; transform: perspective(1200px) rotateY(12deg) scale(0.97); }
          60%  { opacity: 0.2; transform: perspective(1200px) rotateY(-12deg) scale(0.97); }
          100% { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1); }
        }
        .cb-flip-forward { animation: cbFlipForward 0.76s cubic-bezier(0.4,0,0.2,1) forwards; }
        .cb-flip-back    { animation: cbFlipBack    0.76s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>

      {/* ── Ambient particles ── */}
      {ambientActive && particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            filter: "blur(0.5px)",
          }}
        />
      ))}

      {/* ── Soft page glow ── */}
      {ambientActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${glowColors[ambientTheme]}, transparent 70%)`,
          }}
        />
      )}

      {/* ── TOP BAR ── */}
      <div
        className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 transition-all duration-500"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)",
          opacity: showUI ? 1 : 0,
          pointerEvents: showUI ? "auto" : "none",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: back */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm font-heading font-bold tracking-wide"
          style={{ color: "rgba(196,154,40,0.9)" }}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Exit</span>
        </button>

        {/* Center: title + page */}
        <div className="flex flex-col items-center">
          <span className="text-sm font-heading font-bold tracking-wide truncate max-w-[200px]"
            style={{ color: "#F5F0E8", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            {title}
          </span>
          <span className="text-[10px] font-heading tracking-wider"
            style={{ color: "rgba(196,154,40,0.6)" }}>
            {isSpread && rightPageIdx !== null
              ? `Pages ${pageIdx + 1}–${rightPageIdx + 1} of ${totalPages}`
              : `Page ${pageIdx + 1} of ${totalPages}`}
          </span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(0,0,0,0.4)", color: soundEnabled ? "rgba(196,154,40,0.8)" : "rgba(255,255,255,0.3)" }}
            title={soundEnabled ? "Mute narration" : "Enable narration"}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Ambient toggle */}
          <div className="relative">
            <button
              onClick={() => { setShowAmbientMenu(m => !m); bumpUI(); }}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{
                background: ambientActive ? "rgba(196,154,40,0.2)" : "rgba(0,0,0,0.4)",
                color: ambientActive ? "rgba(196,154,40,0.9)" : "rgba(255,255,255,0.3)",
              }}
              title="Ambient Reading Mode"
            >
              <Sparkles size={14} />
            </button>

            {/* Ambient menu */}
            {showAmbientMenu && (
              <div
                className="absolute top-10 right-0 rounded-2xl p-3 w-48 z-30"
                style={{ background: "rgba(20,12,6,0.97)", border: "1px solid rgba(196,154,40,0.2)", backdropFilter: "blur(16px)" }}
              >
                <p className="text-[9px] uppercase tracking-widest font-heading mb-2" style={{ color: "rgba(196,154,40,0.6)" }}>
                  Ambient Reading
                </p>
                {(["none", "fireplace", "rain", "nightsky", "forest"] as AmbientTheme[]).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      if (t === "none") { setAmbientActive(false); }
                      else { setAmbientActive(true); setAmbientTheme(t); }
                      setShowAmbientMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      background: (t === "none" ? !ambientActive : ambientActive && ambientTheme === t)
                        ? "rgba(196,154,40,0.15)" : "transparent",
                      color: (t === "none" ? !ambientActive : ambientActive && ambientTheme === t)
                        ? "rgba(196,154,40,0.9)" : "rgba(232,223,200,0.6)",
                    }}
                  >
                    {themeLabels[t]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spread toggle */}
          <button
            onClick={() => setIsSpread(s => !s)}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full transition-colors"
            style={{
              background: isSpread ? "rgba(196,154,40,0.2)" : "rgba(0,0,0,0.4)",
              color: isSpread ? "rgba(196,154,40,0.9)" : "rgba(255,255,255,0.3)",
            }}
            title={isSpread ? "Single page" : "Open book spread"}
          >
            <BookOpen size={14} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.3)" }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.3)" }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── PAGE AREA ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-16 relative">
        {/* Left nav */}
        <button
          onClick={goPrev}
          disabled={pageIdx === 0}
          className="absolute left-2 z-10 w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-20"
          style={{
            background: "rgba(196,154,40,0.15)",
            border: "1px solid rgba(196,154,40,0.3)",
            color: "rgba(196,154,40,0.9)",
          }}
        >
          <ChevronLeft size={22} />
        </button>

        {/* Book pages */}
        <div
          className={`flex items-center justify-center gap-1 max-h-full
            ${isFlipping ? (flipDir === "forward" ? "cb-flip-forward" : "cb-flip-back") : ""}`}
          style={{
            filter: ambientActive ? "drop-shadow(0 0 40px rgba(196,154,40,0.12))" : "none",
          }}
        >
          {/* Left page / single page */}
          <div
            className="relative rounded-lg overflow-hidden shadow-2xl"
            style={{
              border: "1px solid rgba(196,154,40,0.12)",
              boxShadow: ambientActive
                ? `0 0 60px ${glowColors[ambientTheme]}, 0 20px 60px rgba(0,0,0,0.6)`
                : "0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            <img
              src={pages[pageIdx]?.imageUrl}
              alt={`Page ${pageIdx + 1}`}
              className="block"
              style={{
                maxHeight: "calc(100vh - 140px)",
                maxWidth: isSpread && rightPageIdx !== null ? "44vw" : "88vw",
                objectFit: "contain",
              }}
              draggable={false}
            />
            {/* Page caption */}
            {pages[pageIdx]?.caption && (
              <div
                className="absolute bottom-0 inset-x-0 px-4 py-3 text-center text-sm"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
                  color: "#F5F0E8",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "1rem",
                  lineHeight: "1.5",
                }}
              >
                {pages[pageIdx].caption}
              </div>
            )}
            {/* Narration indicator */}
            {pages[pageIdx]?.narration && soundEnabled && (
              <div
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full"
                style={{ background: "rgba(196,154,40,0.25)", color: "rgba(196,154,40,0.8)" }}
                title="Narration available"
              >
                <Volume2 size={10} />
              </div>
            )}
          </div>

          {/* Right page (spread) */}
          {isSpread && rightPageIdx !== null && (
            <div
              className="relative rounded-lg overflow-hidden shadow-2xl"
              style={{
                border: "1px solid rgba(196,154,40,0.12)",
                boxShadow: ambientActive
                  ? `0 0 60px ${glowColors[ambientTheme]}, 0 20px 60px rgba(0,0,0,0.6)`
                  : "0 20px 60px rgba(0,0,0,0.6)",
              }}
            >
              <img
                src={pages[rightPageIdx]?.imageUrl}
                alt={`Page ${rightPageIdx + 1}`}
                className="block"
                style={{
                  maxHeight: "calc(100vh - 140px)",
                  maxWidth: "44vw",
                  objectFit: "contain",
                }}
                draggable={false}
              />
              {pages[rightPageIdx]?.caption && (
                <div
                  className="absolute bottom-0 inset-x-0 px-4 py-3 text-center text-sm"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
                    color: "#F5F0E8",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "1rem",
                    lineHeight: "1.5",
                  }}
                >
                  {pages[rightPageIdx].caption}
                </div>
              )}
              {pages[rightPageIdx]?.narration && soundEnabled && (
                <div
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full"
                  style={{ background: "rgba(196,154,40,0.25)", color: "rgba(196,154,40,0.8)" }}
                >
                  <Volume2 size={10} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right nav */}
        <button
          onClick={goNext}
          disabled={pageIdx >= totalPages - 1}
          className="absolute right-2 z-10 w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-20"
          style={{
            background: "rgba(196,154,40,0.15)",
            border: "1px solid rgba(196,154,40,0.3)",
            color: "rgba(196,154,40,0.9)",
          }}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div
        className="absolute bottom-0 inset-x-0 z-20 transition-all duration-500"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
          opacity: showUI ? 1 : 0,
          pointerEvents: showUI ? "auto" : "none",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Page dots */}
        <div className="flex justify-center gap-1.5 py-3">
          {pages.slice(0, Math.min(totalPages, 20)).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > pageIdx ? "forward" : "back")}
              className="rounded-full transition-all"
              style={{
                width: i === pageIdx || (isSpread && i === rightPageIdx) ? "18px" : "6px",
                height: "6px",
                background: i === pageIdx || (isSpread && i === rightPageIdx)
                  ? "rgba(196,154,40,0.9)"
                  : "rgba(196,154,40,0.2)",
              }}
            />
          ))}
          {totalPages > 20 && (
            <span className="text-[9px] ml-1" style={{ color: "rgba(196,154,40,0.4)" }}>
              +{totalPages - 20}
            </span>
          )}
        </div>

        {/* Read Aloud placeholder */}
        <div className="flex justify-center pb-3">
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-heading tracking-widest opacity-40 cursor-not-allowed"
            style={{ border: "1px solid rgba(196,154,40,0.2)", color: "rgba(196,154,40,0.6)" }}
            title="Read Aloud — coming soon"
            disabled
          >
            <Volume2 size={10} /> READ ALOUD · COMING SOON
          </button>
        </div>
      </div>
    </div>
  );
}
