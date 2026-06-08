/**
 * ShelfBlock — The primary visual browsing experience for Creator Domains.
 *
 * Renders a creator's works as a physical shelf metaphor:
 *   - Music      → Record rack (album spines / square covers)
 *   - Books      → Bookshelf (tall spines)
 *   - Comics     → Comic rack (portrait covers)
 *   - Manuscripts→ Cabinet (document thumbnails)
 *   - Artifacts  → Display case (square thumbnails)
 *   - Merch      → Product display (square thumbnails)
 *
 * View modes: "rack" | "grid" | "list" | "spine"
 */

import { useState, useRef } from "react";
import { Play, Pause, Music, BookOpen, BookMarked, FileText, Package, ShoppingBag, ExternalLink, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import type { ShelfBlockConfig } from "@shared/domainTypes";
import { Link } from "wouter";

interface ShelfBlockProps {
  userId: number;
  config: ShelfBlockConfig;
  medium: "music" | "books" | "comics" | "manuscripts" | "artifacts" | "merch";
  isOwner?: boolean;
}

// ── Medium metadata ────────────────────────────────────────────────────────────
const MEDIUM_META = {
  music:       { label: "Records",      icon: Music,       coverRatio: "1/1" as const },
  books:       { label: "Library",      icon: BookOpen,    coverRatio: "2/3" as const },
  comics:      { label: "Comics",       icon: BookMarked,  coverRatio: "3/4" as const },
  manuscripts: { label: "Manuscripts",  icon: FileText,    coverRatio: "3/4" as const },
  artifacts:   { label: "Artifacts",    icon: Package,     coverRatio: "1/1" as const },
  merch:       { label: "Merchandise",  icon: ShoppingBag, coverRatio: "1/1" as const },
};

// ── Spine view (tall book-style) ───────────────────────────────────────────────
function SpineItem({ song, index, onClick }: {
  song: { id: number; title: string; coverArtUrl?: string | null };
  index: number;
  onClick: () => void;
}) {
  const spineColors = [
    "#1a1a2e", "#16213e", "#0f3460", "#1a2e1a", "#2e1a1a",
    "#2e2a1a", "#1a2e2e", "#2a1a2e", "#1e2a1a", "#2e1e1a",
  ];
  const bg = spineColors[index % spineColors.length];

  return (
    <button
      onClick={onClick}
      className="relative group flex-shrink-0 cursor-pointer"
      style={{ width: 32, height: 180 }}
      title={song.title}
    >
      {song.coverArtUrl ? (
        <img
          src={song.coverArtUrl}
          alt={song.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: bg, writingMode: "vertical-rl" }}
        >
          <span className="text-[9px] font-medium text-white/70 px-1 truncate max-h-full">
            {song.title}
          </span>
        </div>
      )}
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ boxShadow: "inset 0 0 0 2px rgba(212,175,55,0.6), 0 0 12px rgba(212,175,55,0.3)" }} />
    </button>
  );
}

// ── Rack item (square album cover) ─────────────────────────────────────────────
function RackItem({ song, isPlaying, onPlay }: {
  song: { id: number; title: string; coverArtUrl?: string | null; genre?: string | null; witnessId?: string | null };
  isPlaying: boolean;
  onPlay: () => void;
}) {
  return (
    <Link href={`/track/${song.id}`}>
      <div className="group relative flex-shrink-0 cursor-pointer" style={{ width: 120 }}>
        {/* Cover */}
        <div className="relative w-full aspect-square overflow-hidden rounded-sm"
          style={{ boxShadow: "4px 4px 12px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
          {song.coverArtUrl ? (
            <img src={song.coverArtUrl} alt={song.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)" }}>
              <Music className="w-8 h-8 text-white/20" />
            </div>
          )}
          {/* Play overlay */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlay(); }}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" fill="white" />
            ) : (
              <Play className="w-8 h-8 text-white" fill="white" />
            )}
          </button>
          {/* WID badge */}
          {song.witnessId && (
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Shield className="w-3 h-3 text-[#D4AF37]" />
            </div>
          )}
        </div>
        {/* Title */}
        <p className="mt-1.5 text-xs text-white/70 truncate group-hover:text-white/90 transition-colors leading-tight">
          {song.title}
        </p>
        {song.genre && (
          <p className="text-[10px] text-white/40 truncate">{song.genre}</p>
        )}
      </div>
    </Link>
  );
}

// ── Grid item (portrait cover for comics/books) ────────────────────────────────
function GridItem({ song, ratio }: {
  song: { id: number; title: string; coverArtUrl?: string | null };
  ratio: string;
}) {
  const [aspectW, aspectH] = ratio.split("/").map(Number);
  const width = 110;
  const height = Math.round(width * (aspectH / aspectW));

  return (
    <Link href={`/track/${song.id}`}>
      <div className="group relative flex-shrink-0 cursor-pointer" style={{ width }}>
        <div className="relative overflow-hidden rounded-sm"
          style={{ width, height, boxShadow: "3px 3px 10px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
          {song.coverArtUrl ? (
            <img src={song.coverArtUrl} alt={song.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)" }}>
              <BookOpen className="w-6 h-6 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.3)" }} />
        </div>
        <p className="mt-1.5 text-xs text-white/70 truncate group-hover:text-white/90 transition-colors leading-tight">
          {song.title}
        </p>
      </div>
    </Link>
  );
}

// ── List item ──────────────────────────────────────────────────────────────────
function ListItem({ song, index, isPlaying, onPlay, showPlay }: {
  song: { id: number; title: string; coverArtUrl?: string | null; genre?: string | null; witnessId?: string | null };
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  showPlay: boolean;
}) {
  return (
    <Link href={`/track/${song.id}`}>
      <div className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
        <span className="w-5 text-right text-xs text-white/30 flex-shrink-0">{index + 1}</span>
        {/* Thumbnail */}
        <div className="relative w-9 h-9 flex-shrink-0 rounded overflow-hidden">
          {song.coverArtUrl ? (
            <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <Music className="w-4 h-4 text-white/30" />
            </div>
          )}
          {showPlay && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlay(); }}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-white" fill="white" /> : <Play className="w-4 h-4 text-white" fill="white" />}
            </button>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 truncate group-hover:text-white transition-colors">{song.title}</p>
          {song.genre && <p className="text-xs text-white/40 truncate">{song.genre}</p>}
        </div>
        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {song.witnessId && <Shield className="w-3 h-3 text-[#D4AF37]/60" />}
          <ExternalLink className="w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  );
}

// ── Song type from getCreator ──────────────────────────────────────────────────
interface CreatorSong {
  id: number;
  title: string;
  coverArtUrl?: string | null;
  genre?: string | null;
  witnessId?: string | null;
  fileUrl?: string | null;
  contentType?: string | null;
  displayName?: string | null;
}

// ── Main ShelfBlock ────────────────────────────────────────────────────────────
export function ShelfBlock({ userId, config, medium, isOwner = false }: ShelfBlockProps) {
  const meta = MEDIUM_META[medium];
  const viewMode = config.viewMode ?? (medium === "books" ? "spine" : medium === "comics" ? "grid" : "rack");
  const maxItems = config.maxItems ?? 12;
  const heading = config.heading ?? meta.label;
  const showPlayButton = config.showPlayButton ?? (medium === "music");

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Fetch creator's songs via getCreator
  const { data: creatorData, isLoading } = trpc.profile.getCreator.useQuery(
    { creatorId: userId },
    { enabled: !!userId }
  );

  const { state, addAndPlay, playQueueAt } = usePlayer();

  // Filter songs by medium
  const allSongs: CreatorSong[] = creatorData?.songs ?? [];
  const filteredSongs = allSongs
    .filter((s) => {
      if (medium === "music") return !s.contentType || s.contentType === "audio";
      if (medium === "books" || medium === "manuscripts") return s.contentType === "manuscript";
      if (medium === "comics") return s.contentType === "comic";
      return true;
    })
    .slice(0, maxItems);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
  };

  const buildTrack = (s: CreatorSong): Track => ({
    id: String(s.id),
    title: s.title,
    artist: s.displayName ?? "Unknown",
    genre: s.genre ?? "",
    audioUrl: s.fileUrl ?? undefined,
    artUrl: s.coverArtUrl ?? undefined,
    witnessId: s.witnessId ?? undefined,
    contentType: (s.contentType as Track["contentType"]) ?? "audio",
    creatorId: userId,
  });

  const handlePlay = (index: number) => {
    const playable = filteredSongs.filter((s) => s.fileUrl);
    const clicked = filteredSongs[index];
    if (!clicked?.fileUrl) return;

    const clickedPlayableIdx = playable.findIndex((s) => s.id === clicked.id);
    if (clickedPlayableIdx === -1) {
      addAndPlay(buildTrack(clicked));
    } else {
      playQueueAt(playable.map(buildTrack), clickedPlayableIdx, "CREATOR_PAGE");
    }
  };

  const Icon = meta.icon;
  const currentTrackId = state.tracks[state.currentIdx]?.id;

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-4 h-4 text-[#D4AF37]/60" />
          <span className="text-sm font-medium text-white/40">{heading}</span>
        </div>
        <div className="flex gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[120px] aspect-square rounded-sm bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (filteredSongs.length === 0) {
    if (!isOwner) return null;
    return (
      <div className="py-8 text-center">
        <Icon className="w-8 h-8 text-white/10 mx-auto mb-2" />
        <p className="text-sm text-white/30">No {heading.toLowerCase()} yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#D4AF37]/70" />
          <h3 className="text-sm font-semibold tracking-widest uppercase text-white/60"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em" }}>
            {heading}
          </h3>
          <span className="text-xs text-white/20 ml-1">({filteredSongs.length})</span>
        </div>
        {/* Scroll arrows for rack/grid/spine modes */}
        {viewMode !== "list" && (
          <div className="flex gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-20 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 disabled:opacity-20 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Shelf surface */}
      {viewMode === "list" ? (
        <div className="space-y-0.5">
          {filteredSongs.map((song, i) => (
            <ListItem
              key={song.id}
              song={song}
              index={i}
              isPlaying={currentTrackId === String(song.id) && state.isPlaying}
              onPlay={() => handlePlay(i)}
              showPlay={showPlayButton}
            />
          ))}
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto pb-3"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {filteredSongs.map((song, i) => {
              if (viewMode === "spine") {
                return (
                  <SpineItem
                    key={song.id}
                    song={song}
                    index={i}
                    onClick={() => handlePlay(i)}
                  />
                );
              }
              if (viewMode === "grid") {
                return (
                  <GridItem
                    key={song.id}
                    song={song}
                    ratio={meta.coverRatio}
                  />
                );
              }
              // Default: rack
              return (
                <RackItem
                  key={song.id}
                  song={song}
                  isPlaying={currentTrackId === String(song.id) && state.isPlaying}
                  onPlay={() => handlePlay(i)}
                />
              );
            })}
          </div>
          {/* Shelf plank shadow */}
          <div className="h-px w-full mt-1"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)" }} />
          <div className="h-1 w-full"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)" }} />
        </div>
      )}
    </div>
  );
}
