/**
 * ConstellationPage — Phase 196
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive node graph showing a song's creative relationships:
 *   - Central node: the focal song
 *   - Inner ring: other works by the same creator
 *   - Outer ring: related works by genre (different creators)
 *
 * Rendered on an HTML canvas with SVG overlay for labels.
 * Route: /constellation/:songId
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Track } from "@/contexts/PlayerContext";
import { ArrowLeft, Play, Pause, ExternalLink, Info, X } from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeData {
  id: number;
  title: string;
  artist: string;
  artUrl?: string | null;
  audioUrl?: string | null;
  bg?: string;
  emoji?: string;
  ring: "center" | "inner" | "outer";
  witnessId?: string | null;
  contentType?: string | null;
}

interface CanvasNode extends NodeData {
  x: number;
  y: number;
  r: number;
  angle: number;
  orbitR: number;
  orbitSpeed: number;
  hovered: boolean;
  img?: HTMLImageElement;
  imgLoaded: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = {
  bg: "#000000",
  centerGlow: "rgba(212,175,55,0.35)",
  innerOrbit: "rgba(212,175,55,0.18)",
  outerOrbit: "rgba(138,43,226,0.15)",
  centerRing: "#D4AF37",
  innerRing: "rgba(212,175,55,0.7)",
  outerRing: "rgba(138,43,226,0.6)",
  star: "rgba(255,255,255,0.5)",
  label: "#F5EDD8",
  labelSub: "rgba(212,175,55,0.7)",
  line: "rgba(255,255,255,0.06)",
};

const INNER_ORBIT_R_FRAC = 0.28; // fraction of min(w,h)
const OUTER_ORBIT_R_FRAC = 0.44;
const CENTER_R = 52;
const INNER_R = 30;
const OUTER_R = 24;

// ─── Star field ───────────────────────────────────────────────────────────────

interface Star { x: number; y: number; r: number; alpha: number; twinkle: number }

function generateStars(w: number, h: number, count = 180): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.2,
    alpha: Math.random() * 0.6 + 0.1,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipState {
  node: CanvasNode;
  x: number;
  y: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConstellationPage() {
  const { songId } = useParams<{ songId: string }>();
  const [, navigate] = useLocation();
  const songIdNum = parseInt(songId ?? "0", 10);

  const { data, isLoading, error } = trpc.songs.constellation.useQuery(
    { songId: songIdNum },
    { enabled: !!songIdNum && !isNaN(songIdNum) }
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<CanvasNode[]>([]);
  const starsRef = useRef<Star[]>([]);
  const timeRef = useRef(0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const { state: playerState, addAndPlay, togglePlay } = usePlayer();
  const currentTrack = playerState.currentIdx >= 0 ? playerState.tracks[playerState.currentIdx] : null;

  // ─── Build node list from data ─────────────────────────────────────────────

  const nodeDataList = useMemo<NodeData[]>(() => {
    if (!data) return [];
    const list: NodeData[] = [];
    // Central
    const c = data.central;
    list.push({
      id: c.song.id,
      title: c.song.title,
      artist: c.creator?.artistHandle ?? c.creator?.name ?? "Unknown",
      artUrl: c.song.coverArtUrl,
      audioUrl: c.song.fileUrl,
      bg: c.song.bg ?? "#1a0a2e",
      emoji: c.song.emoji ?? "🎵",
      ring: "center",
      witnessId: c.song.witnessId,
      contentType: c.song.contentType,
    });
    // Inner ring (same creator)
    for (const item of data.inner) {
      list.push({
        id: item.song.id,
        title: item.song.title,
        artist: item.creator?.artistHandle ?? item.creator?.name ?? "Unknown",
        artUrl: item.song.coverArtUrl,
        audioUrl: item.song.fileUrl,
        bg: item.song.bg ?? "#0a1a2e",
        emoji: item.song.emoji ?? "🎵",
        ring: "inner",
        witnessId: item.song.witnessId,
        contentType: item.song.contentType,
      });
    }
    // Outer ring (same genre)
    for (const item of data.outer) {
      if (item.song.id === c.song.id) continue; // skip central if it appears
      list.push({
        id: item.song.id,
        title: item.song.title,
        artist: item.creator?.artistHandle ?? item.creator?.name ?? "Unknown",
        artUrl: item.song.coverArtUrl,
        audioUrl: item.song.fileUrl,
        bg: item.song.bg ?? "#1a0a0a",
        emoji: item.song.emoji ?? "🎵",
        ring: "outer",
        witnessId: item.song.witnessId,
        contentType: item.song.contentType,
      });
    }
    return list;
  }, [data]);

  // ─── Layout nodes on canvas ────────────────────────────────────────────────

  const layoutNodes = useCallback((w: number, h: number, nodes: NodeData[]): CanvasNode[] => {
    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(w, h);
    const innerOrbitR = minDim * INNER_ORBIT_R_FRAC;
    const outerOrbitR = minDim * OUTER_ORBIT_R_FRAC;

    const result: CanvasNode[] = [];
    const innerNodes = nodes.filter(n => n.ring === "inner");
    const outerNodes = nodes.filter(n => n.ring === "outer");

    for (const nd of nodes) {
      let x = cx, y = cy, angle = 0, orbitR = 0, orbitSpeed = 0, r = CENTER_R;
      if (nd.ring === "center") {
        x = cx; y = cy; orbitR = 0; orbitSpeed = 0; r = CENTER_R;
      } else if (nd.ring === "inner") {
        const idx = innerNodes.indexOf(nd);
        const total = innerNodes.length;
        angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
        orbitR = innerOrbitR;
        orbitSpeed = 0.00012 + idx * 0.000015;
        r = INNER_R;
        x = cx + Math.cos(angle) * orbitR;
        y = cy + Math.sin(angle) * orbitR;
      } else {
        const idx = outerNodes.indexOf(nd);
        const total = outerNodes.length;
        angle = (idx / total) * Math.PI * 2 - Math.PI / 2 + Math.PI / (total * 2);
        orbitR = outerOrbitR;
        orbitSpeed = 0.00008 + idx * 0.00001;
        r = OUTER_R;
        x = cx + Math.cos(angle) * orbitR;
        y = cy + Math.sin(angle) * orbitR;
      }

      // Preload image
      let img: HTMLImageElement | undefined;
      let imgLoaded = false;
      if (nd.artUrl) {
        img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { imgLoaded = true; };
        img.src = nd.artUrl;
      }

      result.push({ ...nd, x, y, r, angle, orbitR, orbitSpeed, hovered: false, img, imgLoaded });
    }
    return result;
  }, []);

  // ─── Canvas setup + resize ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      setDims({ w, h });
    });
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, []);

  // ─── Re-layout when data or dims change ───────────────────────────────────

  useEffect(() => {
    if (!dims.w || !dims.h || !nodeDataList.length) return;
    nodesRef.current = layoutNodes(dims.w, dims.h, nodeDataList);
    starsRef.current = generateStars(dims.w, dims.h);
  }, [dims, nodeDataList, layoutNodes]);

  // ─── Animation loop ───────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio;

    function draw(ts: number) {
      const dt = ts - timeRef.current;
      timeRef.current = ts;
      const w = canvas!.width / dpr;
      const h = canvas!.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.min(w, h);
      const innerOrbitR = minDim * INNER_ORBIT_R_FRAC;
      const outerOrbitR = minDim * OUTER_ORBIT_R_FRAC;

      ctx!.save();
      ctx!.scale(dpr, dpr);
      ctx!.clearRect(0, 0, w, h);

      // Background
      ctx!.fillStyle = PALETTE.bg;
      ctx!.fillRect(0, 0, w, h);

      // Stars
      for (const star of starsRef.current) {
        star.twinkle += 0.012;
        const alpha = star.alpha * (0.6 + 0.4 * Math.sin(star.twinkle));
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx!.fill();
      }

      // Orbit rings
      ctx!.beginPath();
      ctx!.arc(cx, cy, innerOrbitR, 0, Math.PI * 2);
      ctx!.strokeStyle = PALETTE.innerOrbit;
      ctx!.lineWidth = 1;
      ctx!.setLineDash([4, 8]);
      ctx!.stroke();
      ctx!.setLineDash([]);

      ctx!.beginPath();
      ctx!.arc(cx, cy, outerOrbitR, 0, Math.PI * 2);
      ctx!.strokeStyle = PALETTE.outerOrbit;
      ctx!.lineWidth = 1;
      ctx!.setLineDash([3, 10]);
      ctx!.stroke();
      ctx!.setLineDash([]);

      // Update node positions
      for (const node of nodesRef.current) {
        if (node.ring === "center") continue;
        node.angle += node.orbitSpeed * dt;
        node.x = cx + Math.cos(node.angle) * node.orbitR;
        node.y = cy + Math.sin(node.angle) * node.orbitR;
      }

      // Connection lines from center to each node
      const center = nodesRef.current.find(n => n.ring === "center");
      if (center) {
        for (const node of nodesRef.current) {
          if (node.ring === "center") continue;
          ctx!.beginPath();
          ctx!.moveTo(center.x, center.y);
          ctx!.lineTo(node.x, node.y);
          ctx!.strokeStyle = node.ring === "inner" ? "rgba(212,175,55,0.08)" : "rgba(138,43,226,0.06)";
          ctx!.lineWidth = 0.5;
          ctx!.stroke();
        }
      }

      // Draw nodes (back to front: outer → inner → center)
      const drawOrder = [
        ...nodesRef.current.filter(n => n.ring === "outer"),
        ...nodesRef.current.filter(n => n.ring === "inner"),
        ...nodesRef.current.filter(n => n.ring === "center"),
      ];

      for (const node of drawOrder) {
        const { x, y, r, hovered } = node;
        const scale = hovered ? 1.15 : 1;
        const sr = r * scale;

        // Glow
        if (node.ring === "center") {
          const grd = ctx!.createRadialGradient(x, y, sr * 0.5, x, y, sr * 2.5);
          grd.addColorStop(0, "rgba(212,175,55,0.25)");
          grd.addColorStop(1, "rgba(212,175,55,0)");
          ctx!.beginPath();
          ctx!.arc(x, y, sr * 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = grd;
          ctx!.fill();
        } else if (hovered) {
          const glowColor = node.ring === "inner" ? "rgba(212,175,55,0.2)" : "rgba(138,43,226,0.2)";
          const grd = ctx!.createRadialGradient(x, y, sr * 0.5, x, y, sr * 2);
          grd.addColorStop(0, glowColor);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx!.beginPath();
          ctx!.arc(x, y, sr * 2, 0, Math.PI * 2);
          ctx!.fillStyle = grd;
          ctx!.fill();
        }

        // Clip circle
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(x, y, sr, 0, Math.PI * 2);
        ctx!.clip();

        // Art or fallback
        if (node.img && node.img.complete && node.img.naturalWidth > 0) {
          ctx!.drawImage(node.img, x - sr, y - sr, sr * 2, sr * 2);
        } else {
          ctx!.fillStyle = node.bg ?? "#1a0a2e";
          ctx!.fillRect(x - sr, y - sr, sr * 2, sr * 2);
          ctx!.font = `${sr * 0.9}px serif`;
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(node.emoji ?? "🎵", x, y);
        }
        ctx!.restore();

        // Ring border
        ctx!.beginPath();
        ctx!.arc(x, y, sr, 0, Math.PI * 2);
        const ringColor = node.ring === "center"
          ? PALETTE.centerRing
          : node.ring === "inner"
            ? PALETTE.innerRing
            : PALETTE.outerRing;
        ctx!.strokeStyle = hovered ? ringColor : ringColor.replace(/[\d.]+\)$/, "0.5)");
        ctx!.lineWidth = node.ring === "center" ? 2.5 : 1.5;
        ctx!.stroke();

        // WID dot
        if (node.witnessId) {
          ctx!.beginPath();
          ctx!.arc(x + sr * 0.65, y - sr * 0.65, 5, 0, Math.PI * 2);
          ctx!.fillStyle = "#4ade80";
          ctx!.fill();
        }

        // Currently playing indicator
        const isPlaying = currentTrack?.id === String(node.id) && playerState.isPlaying;
        if (isPlaying) {
          ctx!.beginPath();
          ctx!.arc(x, y, sr + 5, 0, Math.PI * 2);
          ctx!.strokeStyle = "rgba(212,175,55,0.8)";
          ctx!.lineWidth = 2;
          ctx!.setLineDash([4, 4]);
          ctx!.stroke();
          ctx!.setLineDash([]);
        }
      }

      ctx!.restore();
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, currentTrack?.id, playerState.isPlaying]);

  // ─── Mouse / touch interaction ────────────────────────────────────────────

  const getHoveredNode = useCallback((clientX: number, clientY: number): CanvasNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    for (const node of [...nodesRef.current].reverse()) {
      const dx = mx - node.x;
      const dy = my - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.r * 1.3) return node;
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const hovered = getHoveredNode(e.clientX, e.clientY);
    for (const n of nodesRef.current) n.hovered = n === hovered;
    if (hovered) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      setTooltip({ node: hovered, x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setTooltip(null);
    }
  }, [getHoveredNode]);

  const handleMouseLeave = useCallback(() => {
    for (const n of nodesRef.current) n.hovered = false;
    setTooltip(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const clicked = getHoveredNode(e.clientX, e.clientY);
    if (clicked) setSelectedNode(clicked);
  }, [getHoveredNode]);

  // Touch support
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.changedTouches[0];
    const clicked = getHoveredNode(touch.clientX, touch.clientY);
    if (clicked) setSelectedNode(clicked);
  }, [getHoveredNode]);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const centralData = data?.central;
  const creatorName = centralData?.creator?.artistHandle ?? centralData?.creator?.name ?? "Unknown";
  const songTitle = centralData?.song?.title ?? "Constellation";
  const genre = centralData?.song?.genre;

  const isCurrentlyPlaying = (node: CanvasNode) =>
    currentTrack?.id === String(node.id) && playerState.isPlaying;

  const handlePlayNode = useCallback((node: CanvasNode) => {
    if (currentTrack?.id === String(node.id)) {
      togglePlay();
    } else {
      addAndPlay({
        id: String(node.id),
        title: node.title,
        artist: node.artist,
        genre: "",
        artUrl: node.artUrl ?? undefined,
        audioUrl: node.audioUrl ?? undefined,
        bg: node.bg,
        emoji: node.emoji,
        contentType: (node.contentType as Track["contentType"]) ?? "audio",
      });
    }
  }, [currentTrack?.id, togglePlay, addAndPlay]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#000" }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.6)" }}>
            Mapping Constellation
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#000" }}>
        <div className="text-center px-6">
          <p className="text-[#D4AF37] text-lg font-semibold mb-2">Constellation not found</p>
          <p className="text-white/50 text-sm mb-6">This work may not be publicly available.</p>
          <button onClick={() => navigate(-1 as any)} className="px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#000", zIndex: 50 }}>
      {/* Canvas */}
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Top bar */}
      <div
        className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top))",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
      >
        <Link href={`/song/${songIdNum}`}>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all hover:bg-white/10"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)" }}>
            <ArrowLeft size={13} />
            Back
          </button>
        </Link>

        <div className="text-center">
          <p className="text-[11px] font-mono tracking-[0.2em] uppercase" style={{ color: "rgba(212,175,55,0.6)" }}>
            Constellation
          </p>
          <p className="text-[13px] font-semibold" style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}>
            {songTitle}
          </p>
          <p className="text-[10px]" style={{ color: "rgba(212,175,55,0.6)" }}>{creatorName}</p>
        </div>

        <div className="flex items-center gap-2">
          {genre && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider uppercase"
              style={{ background: "rgba(138,43,226,0.2)", border: "1px solid rgba(138,43,226,0.4)", color: "rgba(192,132,252,0.9)" }}>
              {genre}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-24 left-4 z-20 flex flex-col gap-1.5 px-3 py-2 rounded-xl"
        style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ border: "1.5px solid #D4AF37" }} />
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>This work</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ border: "1.5px solid rgba(212,175,55,0.7)" }} />
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>Same creator</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ border: "1.5px solid rgba(138,43,226,0.6)" }} />
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>Same genre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "#4ade80" }} />
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>WID verified</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: Math.min(tooltip.x + 16, dims.w - 200),
            top: Math.max(tooltip.y - 60, 60),
            maxWidth: 180,
          }}
        >
          <div className="px-3 py-2 rounded-xl text-left"
            style={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}>
            <p className="text-[12px] font-semibold leading-tight" style={{ color: "#F5EDD8" }}>{tooltip.node.title}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(212,175,55,0.7)" }}>{tooltip.node.artist}</p>
            {tooltip.node.witnessId && (
              <p className="text-[9px] mt-1 font-mono" style={{ color: "#4ade80" }}>WID Verified</p>
            )}
            <p className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Tap to view</p>
          </div>
        </div>
      )}

      {/* Selected node panel */}
      {selectedNode && (
        <div
          className="absolute bottom-0 inset-x-0 z-30"
          style={{
            paddingBottom: "max(16px, env(safe-area-inset-bottom))",
            background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 80%, transparent 100%)",
          }}
        >
          <div className="max-w-sm mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              {/* Art */}
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                style={{ border: `1.5px solid ${selectedNode.ring === "center" ? "#D4AF37" : selectedNode.ring === "inner" ? "rgba(212,175,55,0.6)" : "rgba(138,43,226,0.6)"}` }}>
                {selectedNode.artUrl
                  ? <img src={selectedNode.artUrl} alt={selectedNode.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: selectedNode.bg ?? "#1a0a2e" }}>{selectedNode.emoji}</div>
                }
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate" style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}>{selectedNode.title}</p>
                <p className="text-[11px]" style={{ color: "rgba(212,175,55,0.7)" }}>{selectedNode.artist}</p>
                {selectedNode.witnessId && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full mt-1"
                    style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                    WID Verified
                  </span>
                )}
              </div>
              {/* Close */}
              <button onClick={() => setSelectedNode(null)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePlayNode(selectedNode)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{ background: "#D4AF37", color: "#000" }}
              >
                {isCurrentlyPlaying(selectedNode) ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" style={{ marginLeft: "2px" }} />}
                {isCurrentlyPlaying(selectedNode) ? "Pause" : "Play"}
              </button>
              <Link href={`/song/${selectedNode.id}`}>
                <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <ExternalLink size={13} />
                  View
                </button>
              </Link>
              {selectedNode.ring !== "center" && (
                <Link href={`/constellation/${selectedNode.id}`}>
                  <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:bg-white/10"
                    style={{ background: "rgba(138,43,226,0.15)", color: "rgba(192,132,252,0.9)", border: "1px solid rgba(138,43,226,0.3)" }}>
                    <Info size={13} />
                    Explore
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
