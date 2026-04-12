/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage
   Two modes: Infinite Scroll (offset pagination) + Randomize (seeded RAND)
   No algorithm. No "you might like." Just — here's what exists.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getCache, setCache, CACHE_KEYS, TTL, setExploreCache, getExploreCache } from "@/lib/lnxCache";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { Search, Music, Play, Shuffle, Infinity, TrendingUp, Heart, DollarSign, Shield, SkipForward, ListPlus, ExternalLink, Crown, Rocket, Users, Bell, Sparkles } from "lucide-react";
import { AiDisclosurePill } from "@/components/AiDisclosurePill";
import { MediaAsset } from "@/components/MediaAsset";
import { AddToMyListModal } from "@/components/AddToMyListModal";
import { useLike } from "@/hooks/useLike";
import TipModal from "@/components/TipModal";
import FeaturedProjectsCarousel from "@/components/FeaturedProjectsCarousel";

const GENRE_CARDS = [
  { label: "All",        icon: null,    color: "#A78BFA" },
  { label: "Ambient",    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-book_038e31c9.png",      color: "#7dd3fc" },
  { label: "Gospel",    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-cross_39407625.png",     color: "#fbbf24" },
  { label: "Jazz",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-lyre_40247746.png",      color: "#c4b5fd" },
  { label: "Electronic",icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-fire-lyre_42893087.png", color: "#f97316" },
  { label: "Hip-Hop",   icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-eye_0e10b572.png",      color: "#fb923c" },
  { label: "Rock",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-guitar_41a22a6e.png",    color: "#f87171" },
  { label: "R&B",       icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-feather_40dcaa6d.png",   color: "#a78bfa" },
  { label: "Metal",     icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-guitar_41a22a6e.png",    color: "#f87171" },
];

const DISCOVER_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-discover-4BDchKkmG3vEtUQgZzwK6E.webp";
const PAGE_SIZE = 24;

type ExploreMode = "infinite" | "randomize" | "trending" | "new";
type ContentType = "audio" | "lyrics" | "manuscript" | "comic";

const CONTENT_TABS: { id: ContentType; label: string; icon: string; color: string }[] = [
  { id: "audio",      label: "Music",       icon: "🎵", color: "oklch(0.65 0.2 300)" },
  { id: "lyrics",     label: "Lyrics",      icon: "✍️", color: "oklch(0.75 0.18 85)" },
  { id: "manuscript", label: "Manuscripts", icon: "📖", color: "oklch(0.65 0.18 145)" },
  { id: "comic",      label: "Comics",      icon: "🎨", color: "oklch(0.65 0.18 25)" },
];

// AiDisclosureBadge replaced by shared AiDisclosurePill component

/** ExploreCard — mirrors TrackCard architecture exactly */
function ExploreCard({
  item, isActive, isPlaying, onPlay, onTip, prefetchedLiked, prefetchedLikeCount,
}: {
  item: any;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (item: any) => void;
  onTip: (item: any, rect: DOMRect) => void;
  prefetchedLiked?: boolean;
  prefetchedLikeCount?: number;
}) {
  const { song, creator } = item;
  const { playNext } = usePlayer();
  const [, navigate] = useLocation();
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);
  // Skip individual queries when bulk prefetch data is available
  const hasPrefetch = prefetchedLiked !== undefined;
  const { liked, toggle: toggleLike } = useLike(song.id, { skipQuery: hasPrefetch, initialLiked: prefetchedLiked });
  const likeCount = prefetchedLikeCount ?? 0;
  const artistName = creator?.artistHandle || creator?.name || "Unknown";
  // Non-audio types navigate to song detail page instead of playing audio
  const isNonAudio = song.contentType === "manuscript" || song.contentType === "comic";
  const isHot = (song.playCount ?? 0) >= 50;
  const handleCardClick = () => {
    if (isNonAudio) { navigate(`/song/${song.id}`); } else { onPlay(item); }
  };

  return (
    <>
    <div
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200
        border bg-[oklch(0.148_0.032_50)] track-card-glow parchment-grain
        ${isActive && !isNonAudio
          ? "border-[#E8A830]/40 shadow-[0_0_0_1px_rgba(232,197,71,0.2),0_8px_32px_rgba(0,0,0,0.5),0_0_24px_oklch(0.82_0.14_85_/_0.12)]"
          : isHot
            ? "gold-banner"
            : "border-[oklch(0.28_0.04_60/0.25)] hover:border-[oklch(0.55_0.10_72/0.40)]"
        }`}
      onClick={handleCardClick}
      onContextMenu={e => { e.preventDefault(); }}
    >
      {/* ── Zone 1: Cover Art ── */}
      <div
        className="prov-card-img-wrap cursor-pointer"
        onClick={e => { e.stopPropagation(); handleCardClick(); }}
      >
        <MediaAsset
          src={song.coverArtUrl}
          alt={song.title}
          mode="card"
          aspectRatio={(song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "4:5"}
          focalX={song.coverPositionX ?? 50}
          focalY={song.coverPositionY ?? 50}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {/* Overlay gradient — always present per card standard */}
        <div className="prov-card-gradient" />
        {/* Play / wave / read button */}
        <div className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-200 z-10
          ${isNonAudio
            ? "opacity-0 group-hover:opacity-100 bg-[oklch(0.65_0.18_145)]"
            : isActive ? "opacity-100 bg-[#D4AF37]" : "opacity-0 group-hover:opacity-100 bg-[#A78BFA]"}`}
        >
          {isNonAudio
            ? <ExternalLink size={14} className="text-white" />
            : isActive && isPlaying
              ? <div className="live-wave scale-75"><span /><span /><span /><span /><span /></div>
              : <Play size={14} fill="currentColor" className="text-black ml-0.5" />
          }
        </div>
        {/* 🔥 Hot badge — top-left ribbon for 50+ plays */}
        {isHot && (
          <div className="absolute top-0 left-0 z-20 flex items-center gap-0.5 px-2 py-0.5"
            style={{
              background: "linear-gradient(90deg, oklch(0.55 0.14 60 / 0.92), oklch(0.80 0.17 80 / 0.88))",
              borderBottomRightRadius: "8px",
              borderTopLeftRadius: "inherit",
            }}
          >
            <Crown size={9} style={{ color: "#2D1B2E" }} />
            <span className="text-[8px] font-heading font-bold tracking-widest" style={{ color: "#2D1B2E" }}>
              {(song.playCount ?? 0) >= 1000
                ? `${Math.floor((song.playCount ?? 0) / 1000)}K PLAYS`
                : `${song.playCount} PLAYS`}
            </span>
          </div>
        )}

        {/* WID badge — clickable → /verify/:witnessId */}
        {song.witnessId && (
          <Link
            href={`/verify/${song.witnessId}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="absolute bottom-2 left-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10 font-heading tracking-wider wid-glow wid-origin-glow transition-opacity opacity-90 hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.72)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.84 0.155 85 / 0.55)" }}
            title={`Verified Witness ID: ${song.witnessId}`}
          >
            <Shield size={8} /><span>WID</span>
          </Link>
        )}
        {/* AI disclosure badge — top-right */}
        {creator?.aiDisclosure && (
          <div className="absolute top-2 right-2 z-10">
            <AiDisclosurePill value={creator.aiDisclosure as any} size="compact" />
          </div>
        )}
      </div>

      {/* ── Info panel ── */}
      <div className="p-3">
        {/* Song title → song detail page */}
        <Link
          href={`/song/${song.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="block text-[13px] font-heading text-white/90 truncate mb-1 tracking-wide hover:text-[#D4AF37] transition-colors cursor-pointer"
          title={`Open ${song.title}`}
        >
          {song.title}
        </Link>

        {/* Artist row — avatar initial + name → creator profile */}
        <div className="flex items-center gap-2 text-[11px] text-white/75 mb-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
            bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white flex-shrink-0">
            {artistName.charAt(0).toUpperCase()}
          </div>
          {creator?.id ? (
            <Link
              href={`/creator/${creator.id}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="truncate hover:text-[#D4AF37] transition-colors cursor-pointer"
              title={`View ${artistName}'s profile`}
            >
              {artistName}
            </Link>
          ) : (
            <span className="truncate">{artistName}</span>
          )}
        </div>

        {/* Genre pills — own row, never competes with actions */}
        {song.genre && (
          <div className="flex flex-wrap gap-1 mb-2">
            {(song.genre as string).split(/[,/|]+/).map((t: string) => t.trim()).filter(Boolean).slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-full font-body leading-tight"
                style={{ background: "oklch(0.18 0.04 275)", color: "oklch(0.68 0.06 280)", border: "1px solid oklch(0.28 0.04 275)" }}
              >
                {tag}
              </span>
            ))}
            {(song.genre as string).split(/[,/|]+/).filter((t: string) => t.trim()).length > 3 && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-body leading-tight"
                style={{ background: "oklch(0.16 0.03 275)", color: "oklch(0.50 0.04 280)", border: "1px solid oklch(0.24 0.03 275)" }}
              >
                +{(song.genre as string).split(/[,/|]+/).filter((t: string) => t.trim()).length - 3}
              </span>
            )}
          </div>
        )}
        {/* Actions row — always on its own line, never contested */}
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Heart / like */}
            <button
              onClick={e => { e.stopPropagation(); toggleLike(e); }}
              className={`flex items-center gap-0.5 p-1 transition-colors ${liked ? "text-pink-400" : "text-white/70 hover:text-pink-400"}`}
              title={liked ? "Unlike" : "Like"}
            >
              <Heart size={12} fill={liked ? "currentColor" : "none"} />
              {likeCount > 0 && (
                <span className="text-[10px] leading-none font-medium tabular-nums">
                  {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
                </span>
              )}
            </button>
            {/* Gift */}
            <button
              onClick={e => { e.stopPropagation(); onTip(item, (e.currentTarget as HTMLButtonElement).getBoundingClientRect()); }}
               className="p-1 text-white/70 hover:text-[#D4AF37] transition-colors"
               title="Send a gift"
            >
              <DollarSign size={12} />
            </button>
            {/* Play next */}
            <button
              onClick={e => {
                e.stopPropagation();
                playNext({
                  id: String(song.id),
                  title: song.title,
                  artist: artistName,
                  genre: song.genre || "",
                  audioUrl: song.fileUrl || undefined,
                  artUrl: song.coverArtUrl || undefined,
                  witnessId: song.witnessId || undefined,
                  creatorId: creator?.id ?? undefined,
                  coverPositionX: song.coverPositionX ?? 50,
                  coverPositionY: song.coverPositionY ?? 50,
                  visualReady: song.visualReady ?? false,
                  autoVideoUrl: song.autoVideoUrl ?? undefined,
                  creatorRole: song.creator?.role ?? undefined,
                });
                toast.success(`"${song.title}" plays next`);
              }}
              className="p-1 text-white/70 hover:text-[#D4AF37] transition-colors"
              title="Play next"
            >
              <SkipForward size={12} />
            </button>
            {/* Add to list */}
            <button
              onClick={e => { e.stopPropagation(); setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setShowAddToList(true); }}
              className="p-1 text-white/70 hover:text-[#D4AF37] transition-colors"
              title="Add to my list"
            >
              <ListPlus size={12} />
            </button>
            {/* Open song page */}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
              className="p-1 text-white/70 hover:text-[#A78BFA] transition-colors"
              title="Open song page"
            >
              <ExternalLink size={12} />
            </button>
          </div>
      </div>
    </div>
    <AddToMyListModal
      open={showAddToList}
      songId={song.id}
      songTitle={song.title}
      onClose={() => setShowAddToList(false)}
      originRect={addToListRect}
    />
    </>
  );
}

export default function ExplorePage() {
  const { addAndPlay, playQueueAt, playNext, openNowPlayingPanel, currentTrackId, state: playerState } = usePlayer();
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [mode, setMode] = useState<ExploreMode>("infinite");
  const [contentType, setContentType] = useState<ContentType>(
    () => (getCache<string>(CACHE_KEYS.EXPLORE_TAB) as ContentType) ?? "audio"
  );

  // Infinite scroll state — accumulate pages client-side
  const [offset, setOffset] = useState(0);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  // Track which offset we've already fetched to avoid double-fetching
  const fetchedOffsetRef = useRef<number>(-1);

  // Randomize state
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [isShuffling, setIsShuffling] = useState(false);

  // Tip/gift modal state
  const [tipItem, setTipItem] = useState<any | null>(null);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);
  const tipTrack = tipItem ? {
    id: String(tipItem.song.id),
    title: tipItem.song.title,
    artist: tipItem.creator?.artistHandle || tipItem.creator?.name || "Unknown",
    genre: tipItem.song.genre || "",
    artUrl: tipItem.song.coverArtUrl || undefined,
    coverPositionX: tipItem.song.coverPositionX ?? 50,
    coverPositionY: tipItem.song.coverPositionY ?? 50,
  } : null;

  // Featured projects query
  const { data: featuredProjects } = trpc.projects.listPublic.useQuery(
    { limit: 6 },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // New This Week query
  const { data: newThisWeekData, isLoading: newThisWeekLoading } = trpc.songs.newThisWeek.useQuery(
    { genre: activeGenre === "All" ? undefined : activeGenre, limit: 48, contentType },
    { enabled: mode === "new", refetchOnWindowFocus: false, staleTime: 120_000 }
  );

  // Trending query
  const { data: trendingData, isLoading: trendingLoading } = trpc.songs.trending.useQuery(
    { genre: activeGenre === "All" ? undefined : activeGenre, limit: 50 },
    { enabled: mode === "trending", refetchOnWindowFocus: false, staleTime: 120_000 }
  );

  // ── Infinite scroll — fetch one page at a time ────────────────────
  const { data: pageData, isLoading: pageLoading, isFetching: pageFetching } = trpc.songs.discover.useQuery(
    {
      genre: activeGenre === "All" ? undefined : activeGenre,
      search: query || undefined,
      limit: PAGE_SIZE,
      offset,
      contentType,
    },
    {
      enabled: mode === "infinite",
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    }
  );

  // Append new page to accumulated list — only when offset changes
  useEffect(() => {
    if (mode !== "infinite" || !pageData || pageFetching) return;
    if (fetchedOffsetRef.current === offset) return; // already processed this offset
    fetchedOffsetRef.current = offset;

    const newBatch = pageData as any[];
    if (newBatch.length === 0) {
      setHasMore(false);
    } else {
      setAllSongs(prev => {
        // Deduplicate by song id
        const existingIds = new Set(prev.map((s: any) => s.song.id));
        const fresh = newBatch.filter((s: any) => !existingIds.has(s.song.id));
        return [...prev, ...fresh];
      });
      if (newBatch.length < PAGE_SIZE) setHasMore(false);
    }
    setIsFetchingMore(false);
  }, [pageData, pageFetching, mode, offset]);

  // Reset on filter/mode/contentType change
  useEffect(() => {
    setOffset(0);
    setAllSongs([]);
    setHasMore(true);
    setIsFetchingMore(false);
    fetchedOffsetRef.current = -1;
  }, [activeGenre, query, mode, contentType]);

  // IntersectionObserver — only fires when not already loading
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (
      target.isIntersecting &&
      hasMore &&
      !pageLoading &&
      !pageFetching &&
      !isFetchingMore &&
      mode === "infinite"
    ) {
      setIsFetchingMore(true);
      setOffset(prev => prev + PAGE_SIZE);
    }
  }, [hasMore, pageLoading, pageFetching, isFetchingMore, mode]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { rootMargin: "300px" });
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [handleObserver]);

  // ── Randomize query ───────────────────────────────────────────────
  const { data: randomData, isLoading: randomLoading } = trpc.songs.discover.useQuery(
    {
      genre: activeGenre === "All" ? undefined : activeGenre,
      search: query || undefined,
      limit: PAGE_SIZE,
      randomize: true,
      seed,
      contentType,
    },
    {
      enabled: mode === "randomize",
      refetchOnWindowFocus: false,
    }
  );

  const handleRandomize = useCallback(() => {
    setIsShuffling(true);
    setSeed(Math.floor(Math.random() * 1_000_000));
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setIsShuffling(false), 500);
  }, []);

  // Active songs list
  const songs = mode === "infinite" ? allSongs : mode === "trending" ? (trendingData || []) : mode === "new" ? (newThisWeekData || []) : (randomData || []);
  const isLoading = mode === "infinite" ? (pageLoading && allSongs.length === 0) : mode === "trending" ? trendingLoading : mode === "new" ? newThisWeekLoading : randomLoading;

  // Bulk like status — one query for all visible songs instead of per-card queries
  const songIds = useMemo(() => songs.map((s: any) => s.song.id as number), [songs]);
  const { data: bulkLikeData } = trpc.songs.getBulkLikeStatuses.useQuery(
    { songIds },
    { enabled: songIds.length > 0, staleTime: 30_000 }
  );
  const likeMap = bulkLikeData ?? {};

  // ── Track context menu state ──────────────────────────────────────
  const [menuSong, setMenuSong] = useState<any | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);

  const openMenu = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 200;
    const menuHeight = 180;
    const btn = e.currentTarget as HTMLElement;
    // If triggered from a small button (three-dot), anchor below it
    // If triggered from right-click on card div, use cursor position
    const isSmallButton = btn.tagName === 'BUTTON' && btn.offsetWidth < 60;
    let x: number, y: number;
    if (isSmallButton) {
      const rect = btn.getBoundingClientRect();
      x = rect.left;
      y = rect.bottom + 4;
    } else {
      x = e.clientX;
      y = e.clientY + 4;
    }
    // Flip left if near right edge, flip up if near bottom
    if (x + menuWidth > window.innerWidth - 8) {
      x = isSmallButton
        ? (e.currentTarget as HTMLElement).getBoundingClientRect().right - menuWidth
        : e.clientX - menuWidth;
    }
    if (y + menuHeight > window.innerHeight - 8) {
      y = isSmallButton
        ? (e.currentTarget as HTMLElement).getBoundingClientRect().top - menuHeight - 4
        : e.clientY - menuHeight;
    }
    x = Math.max(8, x);
    y = Math.max(8, y);
    setMenuSong(item);
    setMenuPos({ x, y });
  };

  const closeMenu = () => setMenuSong(null);

  const handlePlayNextFromMenu = () => {
    if (!menuSong) return;
    const { song, creator } = menuSong;
    playNext({
      id: String(song.id),
      title: song.title,
      artist: creator?.artistHandle || creator?.name || "Unknown",
      genre: song.genre || "",
      audioUrl: song.fileUrl || undefined,
      artUrl: song.coverArtUrl || undefined,
      witnessId: song.witnessId || undefined,
      creatorHandle: creator?.id ? String(creator.id) : undefined,
      creatorId: creator?.id ?? undefined,
      coverPositionX: song.coverPositionX ?? 50,
      coverPositionY: song.coverPositionY ?? 50,
      visualReady: song.visualReady ?? false,
      autoVideoUrl: song.autoVideoUrl ?? undefined,
      creatorRole: song.creator?.role ?? undefined,
    });
    toast.success(`"${song.title}" plays next`);
    closeMenu();
  };

  const handlePlay = (item: any) => {
    const song = item.song;
    const creator = item.creator;
    if (!song.fileUrl) { toast.error("No audio file available for this track"); return; }
    if (songs.length > 0) {
      const queue = songs
        .filter((s: any) => !!s.song.fileUrl)
        .map((s: any) => ({
          id: String(s.song.id),
          title: s.song.title,
          artist: s.creator?.artistHandle || s.creator?.name || "Unknown",
          genre: s.song.genre || "",
          audioUrl: s.song.fileUrl!,
          artUrl: s.song.coverArtUrl || undefined,
          witnessId: s.song.witnessId || undefined,
          aiDisclosure: s.creator?.aiDisclosure || undefined,
          creatorHandle: s.creator?.id ? String(s.creator.id) : undefined,
          creatorId: s.creator?.id ?? undefined,
          coverPositionX: s.song.coverPositionX ?? 50,
          coverPositionY: s.song.coverPositionY ?? 50,
          visualReady: s.song.visualReady ?? false,
          autoVideoUrl: s.song.autoVideoUrl ?? undefined,
          creatorRole: s.creator?.role ?? undefined,
        }));
      const startIdx = queue.findIndex((t: any) => t.id === String(song.id));
      playQueueAt(queue, startIdx >= 0 ? startIdx : 0, "EXPLORE");
    } else {
      addAndPlay({
        id: String(song.id),
        title: song.title,
        artist: creator?.artistHandle || creator?.name || "Unknown",
        genre: song.genre || "",
        audioUrl: song.fileUrl,
        artUrl: song.coverArtUrl || undefined,
        witnessId: song.witnessId || undefined,
        aiDisclosure: creator?.aiDisclosure || undefined,
        creatorId: creator?.id ?? undefined,
        coverPositionX: song.coverPositionX ?? 50,
        coverPositionY: song.coverPositionY ?? 50,
        visualReady: song.visualReady ?? false,
        autoVideoUrl: song.autoVideoUrl ?? undefined,
        creatorRole: song.creator?.role ?? undefined,
      });
    }
    openNowPlayingPanel();
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="relative h-[160px] overflow-hidden">
        <img src={DISCOVER_IMG} alt="Explore" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_280)] via-[oklch(0.08_0.01_280)/50] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <h1 className="font-heading text-2xl text-white tracking-wider">Explore the Cosmos</h1>
          <p className="text-[12px] font-body mt-1" style={{ color: "#E2E8F0" }}>Music, lyrics, manuscripts, comics — every witnessed work, at your fingertips</p>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Search */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/65" />
          <input
            type="text"
            placeholder="Search tracks, artists, genres…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13.5px] font-body text-white/80
              bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
              focus:border-[#A78BFA]/50 transition-colors placeholder:text-white/60
              max-w-[480px]"
          />
        </div>

        {/* Content-type tab bar */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "oklch(0.12 0.02 280)", border: "1px solid oklch(0.22 0.04 270 / 40%)" }}>
          {CONTENT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setContentType(tab.id); setCache(CACHE_KEYS.EXPLORE_TAB, tab.id, TTL.UI_STATE); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-heading font-bold tracking-wide transition-all"
              style={contentType === tab.id
                ? { background: "oklch(0.18 0.04 270)", color: tab.color, boxShadow: `0 0 12px ${tab.color}33` }
                : { color: "oklch(0.45 0.02 280)" }
              }
            >
              <span className="text-[13px] leading-none">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Genre icon cards */}
        <div className="mb-5">
          <div className="grid grid-cols-4 sm:grid-cols-9 gap-2">
            {GENRE_CARDS.map(g => (
              <button
                key={g.label}
                onClick={() => setActiveGenre(g.label)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border group
                  ${activeGenre === g.label
                    ? "border-[#D4AF37]/60 bg-[#D4AF37]/[0.10]"
                    : "border-white/[0.12] bg-[oklch(0.115_0.055_278)] hover:border-[#D4AF37]/40 hover:bg-white/[0.06]"
                  }`}
              >
                {g.icon ? (
                  <div className="w-9 h-9 flex items-center justify-center">
                    <img
                      src={g.icon}
                      alt={g.label}
                      className={`w-full h-full object-contain transition-all duration-200
                        ${activeGenre === g.label ? "scale-110" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"}`}
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(135deg, #D4AF37, #7C3AED)" }}>
                    <span className="text-[10px] font-heading font-bold text-black">ALL</span>
                  </div>
                )}
                <span
                  className="text-[10px] font-body truncate w-full text-center transition-colors"
                  style={{ color: activeGenre === g.label ? g.color : "rgba(255,255,255,0.75)" }}
                >
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Featured Projects ── */}
        {featuredProjects && featuredProjects.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rocket size={15} style={{ color: "oklch(0.80 0.145 82)" }} />
                <h2 className="font-heading text-[13px] tracking-widest uppercase" style={{ color: "oklch(0.80 0.145 82)" }}>Featured Projects</h2>
              </div>
              <Link href="/projects" className="text-[11px] font-body text-white/40 hover:text-white/70 transition-colors">
                View all →
              </Link>
            </div>
            <FeaturedProjectsCarousel projects={featuredProjects as any[]} />
          </div>
        )}

        {/* Mode toggle + controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {/* Mode pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "oklch(0.148 0.025 52)", border: "1px solid oklch(0.22 0.04 270 / 40%)" }}>
            <button
              onClick={() => setMode("infinite")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                mode === "infinite" ? "" : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "infinite" ? { background: "oklch(0.22 0.04 270)", color: "oklch(0.80 0.145 82)" } : {}}
            >
              <Infinity size={12} />
              Infinite
            </button>
            <button
              onClick={() => setMode("randomize")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                mode === "randomize" ? "" : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "randomize" ? { background: "oklch(0.22 0.04 270)", color: "oklch(0.80 0.145 82)" } : {}}
            >
              <Shuffle size={12} />
              Randomize
            </button>
            <button
              onClick={() => setMode("trending")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                mode === "trending" ? "" : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "trending" ? { background: "oklch(0.22 0.04 270)", color: "#fb923c" } : {}}
            >
              <TrendingUp size={12} />
              Trending
            </button>
            <button
              onClick={() => setMode("new")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                mode === "new" ? "" : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "new" ? { background: "oklch(0.22 0.04 270)", color: "oklch(0.75 0.18 145)" } : {}}
            >
              <Sparkles size={12} />
              New
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-body" style={{ color: "rgba(255,255,255,0.45)" }}>
              {isLoading ? "Loading…" : `${songs.length} track${songs.length === 1 ? "" : "s"}`}
            </span>
            {mode === "randomize" && (
              <button
                onClick={handleRandomize}
                disabled={isShuffling || randomLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: "oklch(0.80 0.145 82 / 0.12)",
                  border: "1px solid oklch(0.80 0.145 82 / 0.35)",
                  color: "oklch(0.80 0.145 82)",
                }}
              >
                <Shuffle size={14} className={isShuffling ? "animate-spin" : ""} style={{ animationDuration: "0.4s" }} />
                {isShuffling ? "Shuffling…" : "Shuffle Again"}
              </button>
            )}
          </div>
        </div>

        {/* Loading skeleton — first page only */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/[0.06] bg-[oklch(0.14_0.013_280)] animate-pulse">
                <div className="bg-white/[0.04]" style={{ height: "240px" }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!isLoading && songs.length > 0 && (
          <div
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5"
            style={isShuffling ? { opacity: 0.5, transition: "opacity 0.2s" } : { opacity: 1, transition: "opacity 0.3s" }}
          >
            {songs.map((item: any) => {
              const likeEntry = (likeMap as any)[item.song.id];
              return (
                <ExploreCard
                  key={item.song.id}
                  item={item}
                  isActive={currentTrackId === String(item.song.id)}
                  isPlaying={playerState.isPlaying}
                  onPlay={handlePlay}
                  onTip={(item, rect) => { setTipItem(item); setTipRect(rect); }}
                  prefetchedLiked={likeEntry?.liked}
                  prefetchedLikeCount={likeEntry?.count}
                />
              );
            })}
          </div>
        )}

        {/* Infinite scroll sentinel — only rendered in infinite mode */}
        {mode === "infinite" && !isLoading && (
          <div ref={loaderRef} className="py-8 flex justify-center">
            {(isFetchingMore || pageFetching) && hasMore && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-[#D4AF37] animate-spin" />
                Loading more…
              </div>
            )}
            {!hasMore && songs.length > 0 && (
              <p className="text-[11px] font-body text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                ✦ You've reached the end of the cosmos ✦
              </p>
            )}
          </div>
        )}

        {/* Track context menu */}
        {menuSong && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div
              className="fixed z-50 min-w-[190px] rounded-xl overflow-hidden shadow-2xl py-1"
              style={{ top: menuPos.y, left: menuPos.x, background: "oklch(0.14 0.015 280)", border: "1px solid #5C3530" }}
            >
              {menuSong.song.fileUrl && (
                <button
                  onClick={handlePlayNextFromMenu}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
                  style={{ color: "oklch(0.85 0.02 280)" }}
                >
                  <Play className="w-4 h-4 opacity-60" /> Play Next
                </button>
              )}
              <button
                onClick={e => { setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setShowAddToList(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
                style={{ color: "oklch(0.85 0.02 280)" }}
              >
                <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Add to My List
              </button>
              <div className="my-1 border-t" style={{ borderColor: "oklch(0.2 0.015 280)" }} />
              <Link href={`/song/${menuSong.song.id}`} onClick={closeMenu}>
                <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.85 0.02 280)" }}>
                  <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Song Page
                </button>
              </Link>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/song/${menuSong.song.id}`); toast.success("Link copied!"); closeMenu(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
                style={{ color: "oklch(0.85 0.02 280)" }}
              >
                <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
            </div>
          </>
        )}
        <AddToMyListModal
          open={!!(showAddToList && menuSong)}
          songId={menuSong?.song.id ?? 0}
          songTitle={menuSong?.song.title ?? ""}
          onClose={() => { setShowAddToList(false); closeMenu(); }}
          originRect={addToListRect}
        />

        {/* Randomize end note */}
        {mode === "randomize" && !randomLoading && songs.length > 0 && (
          <div className="py-8 text-center">
            <p className="text-[11px] font-body" style={{ color: "rgba(255,255,255,0.30)" }}>
              🎲 {PAGE_SIZE} tracks drawn at random · No algorithm · No "you might like"
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && songs.length === 0 && (
          <div className="text-center py-20 text-white/70">
            {mode === "new" ? (
              <>
                <div className="text-5xl mb-4">🌱</div>
                <div className="font-heading text-[17px] text-white/50 mb-2">Nothing new this week</div>
                <div className="text-[13px] font-body text-white/40 max-w-xs mx-auto">
                  No tracks were published in the last 7 days. Check back soon — or be the first to drop something new.
                </div>
                <button
                  className="mt-5 text-xs px-4 py-2 rounded-full transition-colors"
                  style={{ background: "oklch(0.18 0.03 270)", color: "oklch(0.75 0.18 145)", border: "1px solid oklch(0.75 0.18 145 / 0.3)" }}
                  onClick={() => setMode("trending")}
                >
                  Browse Trending instead
                </button>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">🔮</div>
                <div className="font-heading text-[17px] text-white/50 mb-2">No tracks found</div>
                <div className="text-[13px] font-body">
                  {query || activeGenre !== "All" ? "Try a different search term or genre" : "No songs uploaded yet — be the first!"}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* Gift modal */}
      {tipItem && (
        <TipModal track={tipTrack as any} onClose={() => { setTipItem(null); setTipRect(null); }} originRect={tipRect} />
      )}
    </div>
  );
}
