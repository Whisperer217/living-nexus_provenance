/*
   LIVING NEXUS — PlayerQueuePanel
   Spotify-style queue panel embedded in the expanded GlobalPlayer.
   Two modes:
   - STRIP: horizontal panning row of artwork cards (72×72)
   - LIST:  full vertical list with artwork + title + artist + duration
   Linked to Collections (→ /profile?tab=collections) and Profile.
═══════════════════════════════════════════════════════════════════ */

import React, { useRef, useState, useCallback, useEffect } from "react";
import { List, LayoutList, FolderOpen, Music2, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

const GOLD = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.65)";
const NEBULA = "rgba(192,132,252,0.7)";
const NEBULA_DIM = "rgba(192,132,252,0.45)";

export interface QueueTrack {
  id: string;
  title: string;
  artist: string;
  artUrl?: string | null;
  bg?: string | null;
  dur?: string;
}

interface PlayerQueuePanelProps {
  tracks: QueueTrack[];
  currentIdx: number;
  isDesktop: boolean;
  onPlayIdx: (idx: number) => void;
}

// ── Animated bars (playing indicator) ──────────────────────────────
function PlayingBars({ isDesktop }: { isDesktop: boolean }) {
  const color = isDesktop ? GOLD : NEBULA;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: "2px",
        paddingBottom: "6px",
        borderRadius: "inherit",
      }}
    >
      {[1, 2, 3].map(i => (
        <span
          key={i}
          style={{
            width: "3px",
            borderRadius: "1.5px",
            background: color,
            height: "8px",
            animation: `queueWave ${0.4 + i * 0.13}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.09}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes queueWave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  );
}

// ── Horizontal strip card ───────────────────────────────────────────
function StripCard({
  track,
  isActive,
  isDesktop,
  onClick,
}: {
  track: QueueTrack;
  isActive: boolean;
  isDesktop: boolean;
  onClick: () => void;
}) {
  const accent = isDesktop ? GOLD : NEBULA;
  const accentDim = isDesktop ? GOLD_DIM : NEBULA_DIM;

  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: "76px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "5px",
        padding: "4px 2px 2px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "opacity 0.15s",
        opacity: isActive ? 1 : 0.65,
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.opacity = "0.65"; }}
    >
      {/* Artwork */}
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "10px",
          overflow: "hidden",
          flexShrink: 0,
          background: track.bg || "#0a0812",
          position: "relative",
          border: isActive ? `2px solid ${accent}` : "2px solid transparent",
          boxShadow: isActive
            ? isDesktop
              ? `0 0 12px rgba(212,175,55,0.5), 0 0 24px rgba(212,175,55,0.18)`
              : `0 0 12px rgba(192,132,252,0.55), 0 0 24px rgba(138,43,226,0.22)`
            : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        {track.artUrl
          ? <img src={track.artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Music2 size={20} style={{ color: accentDim }} />
            </div>
        }
        {isActive && <PlayingBars isDesktop={isDesktop} />}
      </div>

      {/* Title */}
      <span
        style={{
          fontSize: "9px",
          fontWeight: 600,
          color: isActive ? accent : "rgba(245,237,216,0.7)",
          fontFamily: "'Cinzel', serif",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "72px",
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        {track.title}
      </span>
    </button>
  );
}

// ── List row ────────────────────────────────────────────────────────
function ListRow({
  track,
  index,
  isActive,
  isDesktop,
  onClick,
}: {
  track: QueueTrack;
  index: number;
  isActive: boolean;
  isDesktop: boolean;
  onClick: () => void;
}) {
  const accent = isDesktop ? GOLD : NEBULA;
  const accentDim = isDesktop ? GOLD_DIM : NEBULA_DIM;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        background: isActive
          ? isDesktop ? "rgba(212,175,55,0.06)" : "rgba(138,43,226,0.08)"
          : "transparent",
        borderLeft: isActive ? `2px solid ${accent}` : "2px solid transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {/* Index */}
      <span
        style={{
          fontSize: "10px",
          width: "16px",
          textAlign: "center",
          color: isActive ? accent : "rgba(255,255,255,0.25)",
          fontFamily: "monospace",
          flexShrink: 0,
        }}
      >
        {isActive ? "▶" : index + 1}
      </span>

      {/* Artwork */}
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "7px",
          overflow: "hidden",
          flexShrink: 0,
          background: track.bg || "#0a0812",
          position: "relative",
          border: isActive ? `1px solid ${accent}` : "1px solid transparent",
        }}
      >
        {track.artUrl
          ? <img src={track.artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Music2 size={12} style={{ color: accentDim }} />
            </div>
        }
        {isActive && <PlayingBars isDesktop={isDesktop} />}
      </div>

      {/* Meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: isActive ? accent : "#F5EDD8",
            fontFamily: "'Cinzel', serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {track.title}
        </div>
        <div
          style={{
            fontSize: "10px",
            marginTop: "1px",
            color: isActive ? accentDim : "rgba(255,255,255,0.35)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {track.artist}
        </div>
      </div>

      {/* Duration */}
      {track.dur && (
        <span
          style={{
            fontSize: "10px",
            flexShrink: 0,
            color: isActive ? accentDim : "rgba(255,255,255,0.25)",
            fontFamily: "monospace",
          }}
        >
          {track.dur}
        </span>
      )}
    </button>
  );
}

// ── Main panel ──────────────────────────────────────────────────────
export function PlayerQueuePanel({
  tracks,
  currentIdx,
  isDesktop,
  onPlayIdx,
}: PlayerQueuePanelProps) {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"strip" | "list">("strip");
  const stripRef = useRef<HTMLDivElement>(null);

  const accent = isDesktop ? GOLD : NEBULA;
  const accentDim = isDesktop ? GOLD_DIM : NEBULA_DIM;
  const borderColor = isDesktop ? "rgba(212,175,55,0.12)" : "rgba(138,43,226,0.14)";

  // Auto-scroll strip to keep current card visible
  useEffect(() => {
    if (mode !== "strip" || !stripRef.current) return;
    const el = stripRef.current;
    const card = el.children[currentIdx] as HTMLElement | undefined;
    if (!card) return;
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const containerWidth = el.clientWidth;
    const targetScroll = cardLeft - containerWidth / 2 + cardWidth / 2;
    el.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
  }, [currentIdx, mode]);

  // Drag-to-pan on strip (mouse + touch)
  const panStart = useRef<{ x: number; scrollLeft: number } | null>(null);

  const onStripPointerDown = useCallback((e: React.PointerEvent) => {
    const el = stripRef.current;
    if (!el) return;
    panStart.current = { x: e.clientX, scrollLeft: el.scrollLeft };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onStripPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panStart.current || !stripRef.current) return;
    const dx = e.clientX - panStart.current.x;
    stripRef.current.scrollLeft = panStart.current.scrollLeft - dx;
  }, []);

  const onStripPointerUp = useCallback(() => {
    panStart.current = null;
  }, []);

  if (tracks.length === 0) return null;

  return (
    <div style={{ marginTop: "4px" }}>
      {/* ── Section header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <List size={12} style={{ color: accentDim }} />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: accentDim,
              fontFamily: "'Cinzel', serif",
            }}
          >
            Queue
          </span>
          <span
            style={{
              fontSize: "9px",
              color: "rgba(255,255,255,0.25)",
              fontFamily: "monospace",
            }}
          >
            {currentIdx + 1} / {tracks.length}
          </span>
        </div>

        {/* Mode toggle */}
        <button
          onClick={() => setMode(m => m === "strip" ? "list" : "strip")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 8px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${borderColor}`,
            color: accentDim,
            cursor: "pointer",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: "'Cinzel', serif",
            transition: "background 0.15s",
          }}
          title={mode === "strip" ? "Switch to list view" : "Switch to strip view"}
        >
          {mode === "strip"
            ? <><LayoutList size={10} /> List</>
            : <><List size={10} /> Strip</>
          }
        </button>
      </div>

      {/* ── Strip mode ── */}
      {mode === "strip" && (
        <div
          ref={stripRef}
          onPointerDown={onStripPointerDown}
          onPointerMove={onStripPointerMove}
          onPointerUp={onStripPointerUp}
          onPointerCancel={onStripPointerUp}
          style={{
            display: "flex",
            gap: "4px",
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "4px",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          {/* Hide scrollbar */}
          <style>{`.ln-queue-strip::-webkit-scrollbar { display: none; }`}</style>
          {tracks.map((t, i) => (
            <StripCard
              key={t.id}
              track={t}
              isActive={i === currentIdx}
              isDesktop={isDesktop}
              onClick={() => onPlayIdx(i)}
            />
          ))}
        </div>
      )}

      {/* ── List mode ── */}
      {mode === "list" && (
        <div
          style={{
            maxHeight: "240px",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: `${accentDim} transparent`,
            borderRadius: "10px",
            border: `1px solid ${borderColor}`,
            background: isDesktop ? "rgba(0,0,0,0.25)" : "rgba(10,8,18,0.4)",
          }}
        >
          {tracks.map((t, i) => (
            <ListRow
              key={t.id}
              track={t}
              index={i}
              isActive={i === currentIdx}
              isDesktop={isDesktop}
              onClick={() => onPlayIdx(i)}
            />
          ))}
        </div>
      )}

      {/* ── Collections link ── */}
      <button
        onClick={() => navigate("/profile?tab=collections")}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "10px",
          padding: "9px 12px",
          borderRadius: "10px",
          background: isDesktop ? "rgba(212,175,55,0.04)" : "rgba(138,43,226,0.05)",
          border: `1px dashed ${borderColor}`,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDesktop ? "rgba(212,175,55,0.08)" : "rgba(138,43,226,0.10)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isDesktop ? "rgba(212,175,55,0.04)" : "rgba(138,43,226,0.05)"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FolderOpen size={13} style={{ color: accentDim }} />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: accentDim,
              fontFamily: "'Cinzel', serif",
            }}
          >
            My Collections
          </span>
        </div>
        <ExternalLink size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
      </button>
    </div>
  );
}
