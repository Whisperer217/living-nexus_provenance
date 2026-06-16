import { useRef, useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { Play, Pause, ChevronLeft, ChevronRight, Shield, Music, BookOpen, FileText, Film, Package, Layers, LayoutGrid, List, ChevronDown, ChevronUp as ChevronUpIcon, Clock, Headphones } from "lucide-react";
import { MediaAsset } from "@/components/MediaAsset";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ShelfTrack {
  id: number;
  title: string;
  genre?: string | null;
  coverArtUrl?: string | null;
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  artAspectRatio?: string | null;
  durationSeconds?: number | null;
  witnessId?: string | null;
  fileUrl?: string | null;
  aiConsent?: string | null;
  contentType?: string | null;
  trackOrder?: number | null;
  playCount?: number | null;
  composerNote?: string | null;
  downloadPermission?: string | null;
}

export interface ShelfAlbum {
  name: string;
  coverArtUrl?: string | null;
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  tracks: ShelfTrack[];
  medium?: "music" | "books" | "comics" | "manuscripts" | "artifacts" | "merch" | "video" | "other";
}

interface ManifestationShelfProps {
  album: ShelfAlbum;
  playingId: number | null;
  onPlayTrack: (track: ShelfTrack, albumTracks: ShelfTrack[]) => void;
  isOwner?: boolean;
  onDeleteTrack?: (id: number) => void;
}

// ─── Medium icon helper ───────────────────────────────────────────────────────
function MediumIcon({ medium, className }: { medium?: string; className?: string }) {
  const cls = className ?? "w-5 h-5";
  switch (medium) {
    case "books": return <BookOpen className={cls} style={{ color: "var(--ln-gold)" }} />;
    case "manuscripts": return <FileText className={cls} style={{ color: "var(--ln-gold)" }} />;
    case "comics": return <Layers className={cls} style={{ color: "var(--ln-gold)" }} />;
    case "video": return <Film className={cls} style={{ color: "var(--ln-gold)" }} />;
    case "artifacts": return <Package className={cls} style={{ color: "var(--ln-gold)" }} />;
    default: return <Music className={cls} style={{ color: "var(--ln-gold)" }} />;
  }
}

// ─── Track Card ───────────────────────────────────────────────────────────────
function TrackCard({
  track,
  isPlaying,
  onPlay,
}: {
  track: ShelfTrack;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const duration = track.durationSeconds
    ? `${Math.floor(track.durationSeconds / 60)}:${String(Math.round(track.durationSeconds % 60)).padStart(2, "0")}`
    : null;

  return (
    <div
      className="group relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        width: "160px",
        background: isPlaying ? "rgba(196,154,40,0.08)" : "var(--ln-coal)",
        border: isPlaying
          ? "1px solid rgba(196,154,40,0.6)"
          : "1px solid rgba(196,154,40,0.12)",
        boxShadow: isPlaying
          ? "0 0 16px rgba(196,154,40,0.2), 0 2px 8px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.3)",
      }}
      onClick={onPlay}
    >
      {/* Cover art */}
      <div className="relative w-full" style={{ paddingBottom: "100%" }}>
        <div className="absolute inset-0">
          {track.coverArtUrl ? (
            <MediaAsset
              src={track.coverArtUrl}
              alt={track.title}
              mode="card"
              aspectRatio={(track.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "1:1"}
              focalX={track.coverPositionX ?? 50}
              focalY={track.coverPositionY ?? 50}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(196,154,40,0.06)" }}
            >
              <MediumIcon medium={track.contentType ?? "music"} className="w-8 h-8 opacity-30" />
            </div>
          )}
          {/* Hover play overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
              style={{ background: "var(--ln-gold)" }}
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying
                ? <Pause className="w-4 h-4" style={{ color: "var(--ln-parchment)" }} />
                : <Play className="w-4 h-4 ml-0.5" style={{ color: "var(--ln-parchment)" }} />}
            </button>
          </div>
          {/* Duration badge */}
          {duration && (
            <div
              className="absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: "rgba(0,0,0,0.75)", color: "var(--ln-parchment)" }}
            >
              {duration}
            </div>
          )}
          {/* WID badge */}
          {track.witnessId && (
            <Link
              href={`/verify/${track.witnessId}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-mono tracking-widest wid-glow transition-opacity opacity-80 hover:opacity-100 z-10"
              style={{
                background: "rgba(0,0,0,0.75)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.5)",
              }}
            >
              <Shield size={7} /><span>WID</span>
            </Link>
          )}
          {/* AI OFF badge */}
          {track.aiConsent === "prohibited" && (
            <div
              className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(239,68,68,0.85)", color: "white" }}
            >
              AI OFF
            </div>
          )}
          {/* Playing indicator */}
          {isPlaying && (
            <div className="absolute top-1.5 right-1.5 flex gap-0.5 items-end h-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full"
                  style={{
                    height: `${6 + i * 2}px`,
                    background: "var(--ln-gold)",
                    animation: `pulse 2s cubic-bezier(0.4,0,0.6,1) infinite`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Track info */}
      <div className="p-2.5">
        <Link href={`/song/${track.id}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <p
            className="text-xs font-semibold truncate leading-tight hover:text-[#C49A28] transition-colors"
            style={{ fontFamily: "'Cinzel', serif", color: isPlaying ? "var(--ln-gold)" : "var(--ln-parchment)" }}
          >
            {track.title}
          </p>
        </Link>
        {track.genre && (
          <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--ln-smoke)" }}>
            {track.genre}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── List Row (compact track row for list view) ──────────────────────────────
function TrackListRow({
  track,
  index,
  isPlaying,
  onPlay,
}: {
  track: ShelfTrack;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const duration = track.durationSeconds
    ? `${Math.floor(track.durationSeconds / 60)}:${String(Math.round(track.durationSeconds % 60)).padStart(2, "0")}`
    : null;

  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all"
      style={{
        background: isPlaying ? "rgba(196,154,40,0.07)" : "transparent",
        borderLeft: isPlaying ? "2px solid var(--ln-gold)" : "2px solid transparent",
      }}
      onClick={onPlay}
    >
      {/* Index / playing indicator */}
      <div className="w-6 flex-shrink-0 flex items-center justify-center">
        {isPlaying ? (
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-0.5 rounded-full"
                style={{
                  height: `${4 + i * 2}px`,
                  background: "var(--ln-gold)",
                  animation: `pulse 2s cubic-bezier(0.4,0,0.6,1) infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            <span
              className="text-[10px] group-hover:hidden"
              style={{ color: "var(--ln-smoke)", fontFamily: "monospace" }}
            >
              {index + 1}
            </span>
            <Play
              className="w-3 h-3 hidden group-hover:block"
              style={{ color: "var(--ln-gold)" }}
            />
          </>
        )}
      </div>

      {/* Cover thumbnail */}
      <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0">
        {track.coverArtUrl ? (
          <img
            src={track.coverArtUrl}
            alt={track.title}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%` }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "rgba(196,154,40,0.08)" }}
          >
            <Music className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
          </div>
        )}
      </div>

      {/* Title — links to song page */}
      <Link
        href={`/song/${track.id}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="flex-1 min-w-0"
      >
        <span
          className="text-xs font-semibold truncate block hover:text-[#C49A28] transition-colors"
          style={{ fontFamily: "'Cinzel', serif", color: isPlaying ? "var(--ln-gold)" : "var(--ln-parchment)" }}
        >
          {track.title}
        </span>
      </Link>

      {/* Genre — hidden on very small screens */}
      {track.genre && (
        <span
          className="hidden sm:block text-[10px] flex-shrink-0 max-w-[80px] truncate"
          style={{ color: "var(--ln-smoke)" }}
        >
          {track.genre}
        </span>
      )}

      {/* Composer note indicator — tooltip on hover */}
      {track.composerNote && (
        <span
          className="hidden md:block text-[10px] flex-shrink-0 max-w-[60px] truncate"
          style={{ color: "rgba(196,154,40,0.55)" }}
          title={track.composerNote}
        >
          ♪ note
        </span>
      )}

      {/* Play count */}
      {(track.playCount ?? 0) > 0 && (
        <span
          className="hidden sm:flex items-center gap-0.5 text-[10px] flex-shrink-0"
          style={{ color: "var(--ln-smoke)" }}
        >
          <Headphones className="w-2.5 h-2.5" />
          {track.playCount}
        </span>
      )}

      {/* WID badge */}
      {track.witnessId && (
        <Link
          href={`/verify/${track.witnessId}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Shield className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(196,154,40,0.6)" }} aria-label={`WID: ${track.witnessId}`} />
        </Link>
      )}

      {/* Duration */}
      {duration && (
        <span
          className="text-[10px] flex-shrink-0 w-8 text-right"
          style={{ color: "var(--ln-smoke)", fontFamily: "monospace" }}
        >
          {duration}
        </span>
      )}
    </div>
  );
}

// ─── Manifestation Shelf ──────────────────────────────────────────────────────
export function ManifestationShelf({
  album,
  playingId,
  onPlayTrack,
  isOwner: _isOwner,
  onDeleteTrack: _onDeleteTrack,
}: ManifestationShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });
  // View mode: auto-default to list when there are many tracks
  const [viewMode, setViewMode] = useState<"carousel" | "list">(
    album.tracks.length >= 12 ? "list" : "carousel"
  );
  const LIST_INITIAL = 12;
  const [listExpanded, setListExpanded] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  };

  // Mouse drag scroll
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragStart.current.x;
    el.scrollLeft = dragStart.current.scrollLeft - dx;
  };
  const onMouseUp = () => {
    setIsDragging(false);
    const el = scrollRef.current;
    if (el) { el.style.cursor = "grab"; el.style.userSelect = ""; }
  };

  const albumCoverX = album.coverPositionX ?? 50;
  const albumCoverY = album.coverPositionY ?? 50;
  const trackCount = album.tracks.length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--ln-coal)",
        border: "1px solid rgba(196,154,40,0.14)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
      }}
    >
      {/* ── Album header ── */}
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.1)" }}
      >
        {/* Album cover */}
        <div
          className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
        >
          {album.coverArtUrl ? (
            <img
              src={album.coverArtUrl}
              alt={album.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: `${albumCoverX}% ${albumCoverY}%` }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "rgba(196,154,40,0.08)" }}
            >
              <MediumIcon medium={album.medium} className="w-7 h-7" />
            </div>
          )}
        </div>

        {/* Album meta */}
        <div className="flex-1 min-w-0">
          <p
            className="font-bold text-base truncate"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            {album.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>
            {trackCount} {trackCount === 1 ? "track" : "tracks"}
          </p>
        </div>

        {/* View toggle + scroll arrows */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* List / Carousel toggle */}
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: viewMode === "list" ? "rgba(196,154,40,0.18)" : "rgba(255,255,255,0.04)",
              color: viewMode === "list" ? "var(--ln-gold)" : "rgba(255,255,255,0.35)",
              border: `1px solid ${viewMode === "list" ? "rgba(196,154,40,0.4)" : "rgba(196,154,40,0.12)"}`,
            }}
            onClick={() => setViewMode("list")}
            aria-label="List view"
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: viewMode === "carousel" ? "rgba(196,154,40,0.18)" : "rgba(255,255,255,0.04)",
              color: viewMode === "carousel" ? "var(--ln-gold)" : "rgba(255,255,255,0.35)",
              border: `1px solid ${viewMode === "carousel" ? "rgba(196,154,40,0.4)" : "rgba(196,154,40,0.12)"}`,
            }}
            onClick={() => setViewMode("carousel")}
            aria-label="Carousel view"
            title="Carousel view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>

          {/* Scroll arrows — only in carousel mode on desktop */}
          {viewMode === "carousel" && (
            <>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: canScrollLeft ? "rgba(196,154,40,0.12)" : "rgba(255,255,255,0.03)",
                  color: canScrollLeft ? "var(--ln-gold)" : "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(196,154,40,0.15)",
                  cursor: canScrollLeft ? "pointer" : "default",
                }}
                onClick={() => scrollBy("left")}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: canScrollRight ? "rgba(196,154,40,0.12)" : "rgba(255,255,255,0.03)",
                  color: canScrollRight ? "var(--ln-gold)" : "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(196,154,40,0.15)",
                  cursor: canScrollRight ? "pointer" : "default",
                }}
                onClick={() => scrollBy("right")}
                disabled={!canScrollRight}
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── List view ── */}
      {viewMode === "list" && (
        <div className="px-3 py-3">
          {/* Column header */}
          <div
            className="flex items-center gap-3 px-3 pb-2 mb-1"
            style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}
          >
            <div className="w-7" />
            <div className="w-9" />
            <div className="flex-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ln-smoke)" }}>Title</div>
            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ln-smoke)" }} />
          </div>

          {/* Track rows */}
          {(listExpanded ? album.tracks : album.tracks.slice(0, LIST_INITIAL)).map((track, i) => (
            <TrackListRow
              key={track.id}
              track={track}
              index={i}
              isPlaying={playingId === track.id}
              onPlay={() => onPlayTrack(track, album.tracks)}
            />
          ))}

          {/* Show all / Collapse */}
          {trackCount > LIST_INITIAL && (
            <button
              className="w-full mt-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: "rgba(196,154,40,0.06)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.15)",
              }}
              onClick={() => setListExpanded(!listExpanded)}
            >
              {listExpanded ? (
                <><ChevronUpIcon className="w-3.5 h-3.5" /> Show less</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> Show all {trackCount} tracks</>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Carousel view ── */}
      {viewMode === "carousel" && (
        <>
          <div className="relative overflow-hidden">
            {/* Left fade */}
            {canScrollLeft && (
              <div
                className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right, var(--ln-coal), transparent)" }}
              />
            )}
            {/* Right fade */}
            {canScrollRight && (
              <div
                className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to left, var(--ln-coal), transparent)" }}
              />
            )}

            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto px-5 py-4 pb-5"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                cursor: "grab",
                WebkitOverflowScrolling: "touch",
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {album.tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isPlaying={playingId === track.id}
                  onPlay={() => onPlayTrack(track, album.tracks)}
                />
              ))}
            </div>
          </div>

          {/* Scroll indicator dots (mobile) */}
          {trackCount > 3 && (
            <div className="flex justify-center gap-1 pb-3 sm:hidden">
              <div
                className="h-0.5 rounded-full transition-all"
                style={{
                  width: canScrollLeft ? "8px" : "20px",
                  background: canScrollLeft ? "rgba(196,154,40,0.3)" : "var(--ln-gold)",
                }}
              />
              <div
                className="h-0.5 rounded-full transition-all"
                style={{
                  width: !canScrollLeft && !canScrollRight ? "20px" : "8px",
                  background: !canScrollLeft && !canScrollRight ? "var(--ln-gold)" : "rgba(196,154,40,0.3)",
                }}
              />
              <div
                className="h-0.5 rounded-full transition-all"
                style={{
                  width: canScrollRight ? "20px" : "8px",
                  background: canScrollRight ? "var(--ln-gold)" : "rgba(196,154,40,0.3)",
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Standalone Tracks Shelf ──────────────────────────────────────────────────
// Used for songs that don't belong to any album
export function StandaloneShelf({
  tracks,
  playingId,
  onPlayTrack,
}: {
  tracks: ShelfTrack[];
  playingId: number | null;
  onPlayTrack: (track: ShelfTrack, allTracks: ShelfTrack[]) => void;
}) {
  if (!tracks.length) return null;
  return (
    <ManifestationShelf
      album={{
        name: "Singles & Standalone Works",
        tracks,
        medium: "music",
      }}
      playingId={playingId}
      onPlayTrack={onPlayTrack}
    />
  );
}
