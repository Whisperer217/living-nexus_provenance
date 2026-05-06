/**
 * ManuscriptReader — Living Nexus Manuscript Narrative Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Principle: Language-First
 *
 * Manuscripts are NOT visual-first — they are language-first.
 * This engine is: Kindle + Notion + Sacred Text
 *
 * Features:
 * - Vertical flowing text layout (not paginated images)
 * - Reader-selectable typography: Serif / Sans / Mono
 * - Reader-selectable theme: Sepia / Dark / Paper
 * - 700–850px readable column, centered
 * - Focus Mode: hides all chrome, only text visible (ESC to exit)
 * - Ambient audio: optional background (Rain / Fireplace / Silence)
 * - Resume position: saves scroll position to localStorage per work ID
 * - Inline Witness Layer anchors (scaffold — future annotation UI)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Type, Moon, Sun, BookOpen, Maximize2, Minimize2,
  Volume2, VolumeX, ChevronUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ManuscriptContent {
  // The manuscript text content — can be plain text or simple HTML
  // Chapters are delimited by "## Chapter Title" markdown headings
  text: string;
  // Optional cover image
  coverImageUrl?: string;
  // Optional per-paragraph witness layer anchors (scaffold)
  witnessAnchors?: WitnessAnchor[];
}

export interface WitnessAnchor {
  anchorType: "paragraph" | "page" | "scene";
  anchorId: string;         // paragraph index or scene label
  authorId: string;
  content: string;          // testimony / annotation / scripture reference
  createdAt: number;        // UTC ms
}

type FontStyle = "serif" | "sans" | "mono";
type ThemeStyle = "sepia" | "dark" | "paper";
type AmbientAudio = "none" | "rain" | "fireplace";

interface Props {
  workId: string;           // used for localStorage resume key
  title: string;
  author?: string;
  content: ManuscriptContent;
  onClose: () => void;
}

// ── Theme definitions ─────────────────────────────────────────────────────────

const THEMES: Record<ThemeStyle, {
  bg: string; text: string; muted: string; border: string;
  chrome: string; chromeBorder: string;
}> = {
  sepia: {
    bg: "#F4ECD8",
    text: "#3D2B1F",
    muted: "#8B6B4A",
    border: "rgba(139,107,74,0.2)",
    chrome: "rgba(244,236,216,0.95)",
    chromeBorder: "rgba(139,107,74,0.15)",
  },
  dark: {
    bg: "#0E1117",
    text: "#E8DFC8",
    muted: "#7A6E5F",
    border: "rgba(196,154,40,0.12)",
    chrome: "rgba(14,17,23,0.95)",
    chromeBorder: "rgba(196,154,40,0.1)",
  },
  paper: {
    bg: "#FAFAF8",
    text: "#1A1A1A",
    muted: "#6B6B6B",
    border: "rgba(0,0,0,0.08)",
    chrome: "rgba(250,250,248,0.95)",
    chromeBorder: "rgba(0,0,0,0.06)",
  },
};

const FONTS: Record<FontStyle, { family: string; label: string }> = {
  serif: { family: "'Cormorant Garamond', 'Georgia', serif", label: "Serif" },
  sans:  { family: "'Inter', 'Helvetica Neue', sans-serif", label: "Sans" },
  mono:  { family: "'JetBrains Mono', 'Courier New', monospace", label: "Mono" },
};

// ── Ambient audio (simple oscillator-based — no external files needed) ────────
// We use a simple approach: if a URL is provided externally, use it.
// Otherwise the button is a placeholder for future integration.

// ── Component ─────────────────────────────────────────────────────────────────

export function ManuscriptReader({ workId, title, author, content, onClose }: Props) {
  const [font, setFont] = useState<FontStyle>("serif");
  const [theme, setTheme] = useState<ThemeStyle>("dark");
  const [fontSize, setFontSize] = useState(18); // px
  const [lineHeight, setLineHeight] = useState(1.8);
  const [focusMode, setFocusMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ambientAudio, setAmbientAudio] = useState<AmbientAudio>("none");
  const [showUI, setShowUI] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeKey = `ln-manuscript-pos-${workId}`;

  const t = THEMES[theme];
  const f = FONTS[font];

  // ── Resume scroll position ─────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(resumeKey);
    if (saved && scrollRef.current) {
      const pos = parseFloat(saved);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = pos;
      }, 100);
    }
  }, [resumeKey]);

  const saveScrollPosition = useCallback(() => {
    if (scrollRef.current) {
      localStorage.setItem(resumeKey, String(scrollRef.current.scrollTop));
    }
  }, [resumeKey]);

  // ── Scroll tracking ────────────────────────────────────────────────────────
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
    setScrollProgress(Math.min(1, Math.max(0, progress)));
    setShowScrollTop(el.scrollTop > 400);
    saveScrollPosition();
  }, [saveScrollPosition]);

  // ── UI auto-hide (focus mode: immediate hide, normal: 5s) ─────────────────
  const bumpUI = useCallback(() => {
    if (focusMode) return;
    setShowUI(true);
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    uiTimerRef.current = setTimeout(() => setShowUI(false), 5000);
  }, [focusMode]);

  useEffect(() => {
    if (focusMode) {
      setShowUI(false);
    } else {
      bumpUI();
    }
    return () => { if (uiTimerRef.current) clearTimeout(uiTimerRef.current); };
  }, [focusMode, bumpUI]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (focusMode) { setFocusMode(false); return; }
        onClose();
      }
      if (e.key === "f" || e.key === "F") setFocusMode(m => !m);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusMode, onClose]);

  // ── Ambient audio (placeholder — URLs would come from creator config) ──────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // In production, these would be CDN-hosted ambient loops
    // For now, the button is functional but audio requires a URL
    const urls: Record<AmbientAudio, string | null> = {
      none: null,
      rain: null,      // future: CDN URL
      fireplace: null, // future: CDN URL
    };
    const url = urls[ambientAudio];
    if (url) {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0.25;
      audio.play().catch(() => {});
      audioRef.current = audio;
    }
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, [ambientAudio]);

  // ── Text rendering: split into paragraphs, detect chapter headings ─────────
  const paragraphs = content.text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const renderParagraph = (para: string, idx: number) => {
    // Chapter heading: ## Title
    if (para.startsWith("## ")) {
      return (
        <h2
          key={idx}
          className="mt-12 mb-4"
          style={{
            fontFamily: f.family,
            fontSize: `${fontSize * 1.4}px`,
            fontWeight: 700,
            color: t.text,
            letterSpacing: "0.02em",
            borderBottom: `1px solid ${t.border}`,
            paddingBottom: "0.5em",
          }}
        >
          {para.replace(/^## /, "")}
        </h2>
      );
    }
    // Scene break: ---
    if (para === "---") {
      return (
        <div key={idx} className="flex justify-center my-8">
          <span style={{ color: t.muted, letterSpacing: "0.5em", fontSize: "0.8em" }}>✦ ✦ ✦</span>
        </div>
      );
    }
    // Regular paragraph
    return (
      <p
        key={idx}
        className="relative"
        style={{
          fontFamily: f.family,
          fontSize: `${fontSize}px`,
          lineHeight,
          color: t.text,
          marginBottom: `${fontSize * 0.8}px`,
          textAlign: "justify",
          textIndent: "2em",
        }}
      >
        {para}
        {/* Witness anchor indicator (scaffold) */}
        {content.witnessAnchors?.some(a => a.anchorId === String(idx)) && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full ml-1 align-middle opacity-50"
            style={{ background: "rgba(196,154,40,0.8)", verticalAlign: "super", fontSize: "0.6em" }}
            title="Witness annotation available"
          />
        )}
      </p>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{ background: t.bg }}
      onMouseMove={bumpUI}
      onClick={() => { setShowSettings(false); bumpUI(); }}
    >
      {/* ── TOP BAR ── */}
      <div
        className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-3 transition-all duration-500"
        style={{
          background: `linear-gradient(to bottom, ${t.chrome} 0%, transparent 100%)`,
          borderBottom: `1px solid ${t.chromeBorder}`,
          opacity: showUI ? 1 : 0,
          pointerEvents: showUI ? "auto" : "none",
          backdropFilter: "blur(12px)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: close */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm font-heading font-bold tracking-wide transition-opacity hover:opacity-70"
          style={{ color: t.muted }}
        >
          <X size={16} />
          <span className="hidden sm:inline">Close</span>
        </button>

        {/* Center: title */}
        <div className="flex flex-col items-center">
          <span
            className="text-sm font-bold tracking-wide truncate max-w-[200px]"
            style={{ fontFamily: f.family, color: t.text }}
          >
            {title}
          </span>
          {author && (
            <span className="text-[10px] tracking-wider" style={{ color: t.muted, fontFamily: f.family }}>
              {author}
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5">
          {/* Font selector */}
          <div className="flex items-center gap-0.5 rounded-lg px-1 py-0.5" style={{ background: t.border }}>
            {(["serif", "sans", "mono"] as FontStyle[]).map(fk => (
              <button
                key={fk}
                onClick={() => setFont(fk)}
                className="px-2 py-0.5 rounded text-[10px] font-heading font-bold tracking-wide transition-all"
                style={{
                  background: font === fk ? t.text : "transparent",
                  color: font === fk ? t.bg : t.muted,
                }}
              >
                {FONTS[fk].label}
              </button>
            ))}
          </div>

          {/* Theme selector */}
          <div className="flex items-center gap-0.5 rounded-lg px-1 py-0.5" style={{ background: t.border }}>
            {(["sepia", "dark", "paper"] as ThemeStyle[]).map(tk => {
              const icons = { sepia: "☕", dark: "🌙", paper: "📄" };
              return (
                <button
                  key={tk}
                  onClick={() => setTheme(tk)}
                  className="px-2 py-0.5 rounded text-[10px] transition-all"
                  style={{
                    background: theme === tk ? t.text : "transparent",
                    color: theme === tk ? t.bg : t.muted,
                  }}
                  title={tk}
                >
                  {icons[tk]}
                </button>
              );
            })}
          </div>

          {/* Font size */}
          <button
            onClick={() => setFontSize(s => Math.max(14, s - 1))}
            className="w-7 h-7 flex items-center justify-center rounded transition-opacity hover:opacity-70 text-sm font-bold"
            style={{ color: t.muted }}
            title="Decrease font size"
          >
            A-
          </button>
          <button
            onClick={() => setFontSize(s => Math.min(28, s + 1))}
            className="w-7 h-7 flex items-center justify-center rounded transition-opacity hover:opacity-70 text-base font-bold"
            style={{ color: t.muted }}
            title="Increase font size"
          >
            A+
          </button>

          {/* Focus mode */}
          <button
            onClick={() => setFocusMode(m => !m)}
            className="w-7 h-7 flex items-center justify-center rounded transition-opacity hover:opacity-70"
            style={{ color: focusMode ? "rgba(196,154,40,0.9)" : t.muted }}
            title="Focus Mode (F)"
          >
            {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Ambient audio */}
          <button
            onClick={() => setAmbientAudio(a => a === "none" ? "rain" : a === "rain" ? "fireplace" : "none")}
            className="w-7 h-7 flex items-center justify-center rounded transition-opacity hover:opacity-70"
            style={{ color: ambientAudio !== "none" ? "rgba(196,154,40,0.9)" : t.muted }}
            title={`Ambient: ${ambientAudio}`}
          >
            {ambientAudio !== "none" ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      {/* ── Reading progress bar ── */}
      <div
        className="absolute top-0 inset-x-0 z-30 h-0.5 transition-opacity duration-500"
        style={{ opacity: showUI ? 1 : 0.3 }}
      >
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${scrollProgress * 100}%`,
            background: theme === "dark" ? "rgba(196,154,40,0.6)" : "rgba(139,107,74,0.5)",
          }}
        />
      </div>

      {/* ── Focus mode hint ── */}
      {focusMode && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full text-[10px] font-heading tracking-widest transition-all"
          style={{
            background: "rgba(0,0,0,0.3)",
            color: t.muted,
            opacity: 0.6,
          }}
        >
          FOCUS MODE · ESC TO EXIT
        </div>
      )}

      {/* ── MAIN SCROLL AREA ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={onScroll}
        style={{ paddingTop: "64px", paddingBottom: "80px" }}
      >
        {/* Cover image */}
        {content.coverImageUrl && (
          <div className="flex justify-center mb-12 px-4">
            <img
              src={content.coverImageUrl}
              alt={title}
              className="rounded-lg shadow-xl"
              style={{ maxHeight: "400px", maxWidth: "100%", objectFit: "contain" }}
            />
          </div>
        )}

        {/* Title block */}
        <div
          className="text-center mb-12 px-4"
          style={{ maxWidth: "800px", margin: "0 auto 3rem" }}
        >
          <h1
            style={{
              fontFamily: f.family,
              fontSize: `${fontSize * 2}px`,
              fontWeight: 700,
              color: t.text,
              lineHeight: 1.2,
              marginBottom: "0.5em",
            }}
          >
            {title}
          </h1>
          {author && (
            <p style={{ fontFamily: f.family, color: t.muted, fontSize: `${fontSize * 0.85}px` }}>
              by {author}
            </p>
          )}
          <div className="mt-6" style={{ borderTop: `1px solid ${t.border}`, width: "60px", margin: "1.5rem auto 0" }} />
        </div>

        {/* Manuscript text */}
        <div
          className="px-4"
          style={{
            maxWidth: "780px",
            margin: "0 auto",
            minHeight: "60vh",
          }}
        >
          {paragraphs.map((para, idx) => renderParagraph(para, idx))}

          {/* End mark */}
          <div className="flex flex-col items-center mt-16 mb-8 gap-3">
            <span style={{ color: t.muted, letterSpacing: "0.5em", fontSize: "0.8em" }}>✦ ✦ ✦</span>
            <p style={{ fontFamily: f.family, color: t.muted, fontSize: `${fontSize * 0.8}px`, fontStyle: "italic" }}>
              End of manuscript
            </p>
          </div>
        </div>
      </div>

      {/* ── SCROLL TO TOP ── */}
      {showScrollTop && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="absolute bottom-6 right-6 z-20 w-10 h-10 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-110"
          style={{
            background: theme === "dark" ? "rgba(196,154,40,0.2)" : "rgba(139,107,74,0.15)",
            border: `1px solid ${t.border}`,
            color: t.muted,
          }}
          title="Back to top"
        >
          <ChevronUp size={18} />
        </button>
      )}

      {/* ── BOTTOM STATUS BAR ── */}
      <div
        className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between px-5 py-2 transition-all duration-500"
        style={{
          background: `linear-gradient(to top, ${t.chrome} 0%, transparent 100%)`,
          borderTop: `1px solid ${t.chromeBorder}`,
          opacity: showUI ? 1 : 0,
          pointerEvents: showUI ? "auto" : "none",
          backdropFilter: "blur(12px)",
        }}
      >
        <span className="text-[10px] font-heading tracking-widest" style={{ color: t.muted }}>
          {Math.round(scrollProgress * 100)}% READ
        </span>
        <div className="flex items-center gap-2">
          <Type size={10} style={{ color: t.muted }} />
          <span className="text-[10px] font-heading tracking-wider" style={{ color: t.muted }}>
            {FONTS[font].label} · {fontSize}px · {theme}
          </span>
        </div>
        <span className="text-[10px] font-heading tracking-widest" style={{ color: t.muted }}>
          {ambientAudio !== "none" ? `🎵 ${ambientAudio}` : ""}
        </span>
      </div>
    </div>
  );
}
