/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage
   Two modes: Infinite Scroll (offset pagination) + Randomize (seeded RAND)
   No algorithm. No "you might like." Just — here's what exists.
═══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getCache, setCache, CACHE_KEYS, TTL, setExploreCache, getExploreCache } from "@/lib/lnxCache";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link, useLocation, useSearch } from "wouter";
import { Search, Music, Play, Shuffle, Infinity, TrendingUp, Heart, DollarSign, Shield, SkipForward, ListPlus, ExternalLink, Crown, Rocket, Users, Bell, Sparkles, BookOpen, LayoutGrid, List, Flame, Pause } from "lucide-react";
import { AiDisclosurePill } from "@/components/AiDisclosurePill";
import { MediaAsset } from "@/components/MediaAsset";
import { AddToMyListModal } from "@/components/AddToMyListModal";
import { useLike } from "@/hooks/useLike";
import TipModal from "@/components/TipModal";
import FeaturedProjectsCarousel from "@/components/FeaturedProjectsCarousel";
import { getContentTypeColors } from "@/lib/contentTypeColors";
import TrackCard from "@/components/TrackCard";
// Card width is responsive via CSS variable --card-pan-w
import { ShowcaseRow } from "@/components/ShowcaseRow";
import { StoreTrackCard } from "@/components/StoreTrackCard";
import { StoreCreatorCard } from "@/components/StoreCreatorCard";
import { CinematicComicReader } from "@/components/reader/CinematicComicReader";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";

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

/** Flat genre pill chips for the Explore header */
const GENRE_CHIPS = [
  { label: "All",         color: "#A78BFA" },
  { label: "Ambient",     color: "#7dd3fc" },
  { label: "Gospel",      color: "#fbbf24" },
  { label: "Jazz",        color: "#c4b5fd" },
  { label: "Electronic",  color: "#f97316" },
  { label: "Hip-Hop",     color: "#fb923c" },
  { label: "Rock",        color: "#f87171" },
  { label: "R&B",         color: "#a78bfa" },
  { label: "Metal",       color: "#f87171" },
  { label: "Classical",   color: "#86efac" },
  { label: "Pop",         color: "#f9a8d4" },
  { label: "Country",     color: "#fde68a" },
  { label: "Soul",        color: "#fdba74" },
];

/** Map a { song, creator } API row to the flat SongData shape StoreTrackCard expects */
function exploreMapToSongData(row: any) {
  const song = row.song ?? row;
  const creator = row.creator ?? null;
  return {
    id: typeof song.id === "string" ? parseInt(song.id, 10) : (song.id as number),
    title: song.title ?? "Untitled Work",
    coverArtUrl: song.coverArtUrl ?? null,
    artistName: creator?.artistHandle || creator?.name || "Unknown Creator",
    genre: song.genre ?? null,
    wid: song.witnessId ?? null,
    widShort: null,
    playCount: song.playCount ?? null,
    fileUrl: song.fileUrl ?? null,
    duration: song.durationSeconds ?? null,
    userId: song.userId ?? null,
    artistHandle: creator?.artistHandle ?? null,
    profilePhotoUrl: creator?.profilePhotoUrl ?? null,
    aiDisclosure: song.aiDisclosure ?? null,
    contentType: (song.contentType ?? "audio") as "audio" | "lyrics" | "manuscript" | "comic",
  };
}
const PAGE_SIZE = 24;

type ExploreMode = "infinite" | "randomize" | "trending" | "new";
type ContentType = "audio" | "lyrics" | "manuscript" | "comic" | "novel";
// "novel" is a UI alias — the server maps it to contentType=manuscript
const CONTENT_TABS: { id: ContentType; label: string; icon: string; color: string }[] = [
  { id: "audio",  label: "Music",           icon: "🎵", color: "var(--ln-gold)" },
  { id: "lyrics", label: "Lyrics",          icon: "✍️", color: "var(--ln-gold)" },
  { id: "novel",  label: "Comics & Novels", icon: "📚", color: "#A78BFA" },
];

// AiDisclosureBadge replaced by shared AiDisclosurePill component

/** ExploreCard — mirrors TrackCard architecture exactly */
function ExploreCard({
  item, isActive, isPlaying, onPlay, onTip, prefetchedLiked, prefetchedLikeCount, onOpenReader,
}: {
  item: any;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (item: any) => void;
  onTip: (item: any, rect: DOMRect) => void;
  prefetchedLiked?: boolean;
  prefetchedLikeCount?: number;
  onOpenReader?: (song: any) => void;
}) {
  const { song, creator } = item;
  const { playNext } = usePlayer();
  const [, navigate] = useLocation();
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);
  const [hovered, setHovered] = useState(false);
  // Skip individual queries when bulk prefetch data is available
  const hasPrefetch = prefetchedLiked !== undefined;
  const { liked, toggle: toggleLike } = useLike(song.id, { skipQuery: hasPrefetch, initialLiked: prefetchedLiked });
  const likeCount = prefetchedLikeCount ?? 0;
  const artistName = creator?.artistHandle ? `@${creator.artistHandle}` : (creator?.name || "Unknown");
  // Non-audio types navigate to song detail page instead of playing audio
  const isNonAudio = song.contentType === "manuscript" || song.contentType === "comic";
  const isComic = song.contentType === "comic";
  const isHot = (song.playCount ?? 0) >= 50;
  const ctColors = getContentTypeColors(song.contentType ?? "audio");
  const hasAudio = !!song.fileUrl && !isNonAudio;
  const hasWid = !!song.witnessId;

  const handleCardClick = () => {
    if (isComic && onOpenReader) { onOpenReader(song); return; }
    if (isNonAudio) { navigate(`/book/${song.id}`); } else { onPlay(item); }
  };

  const plays = song.playCount && song.playCount > 0
    ? song.playCount >= 1000 ? `${(song.playCount / 1000).toFixed(1)}k` : String(song.playCount)
    : null;

  return (
    <>
    <div
      className={`group relative cursor-pointer witness-card${isActive ? ' sacred-active' : ''}`}
      style={{ aspectRatio: "2/3" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCardClick}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Card frame — sg-corner-frame + sanctuary glow when active */}
      <div
        className={`absolute inset-0 rounded-2xl overflow-hidden sg-corner-frame`}
        style={{
          border: isActive
            ? "1px solid rgba(196,154,40,0.68)"
            : hovered
              ? "1px solid rgba(196,154,40,0.38)"
              : `1px solid ${ctColors.dim}`,
          boxShadow: isActive
            ? "0 0 0 2px rgba(196,154,40,0.18), 0 8px 48px rgba(0,0,0,0.75), 0 0 40px rgba(196,154,40,0.22)"
            : hovered
              ? "0 16px 64px rgba(0,0,0,0.82), 0 0 0 1px rgba(196,154,40,0.28), 0 0 32px rgba(196,154,40,0.14)"
              : "0 4px 24px rgba(0,0,0,0.58)",
          transform: hovered && !isActive ? "translateY(-6px) scale(1.022)" : isActive ? "translateY(-2px) scale(1.008)" : "translateY(0) scale(1)",
          transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease, border-color 0.32s ease",
        }}
      >
        {/* LAYER 1: Artwork — full-bleed, or missing-art sanctuary */}
        {song.coverArtUrl ? (
          <MediaAsset
            src={song.coverArtUrl}
            alt={song.title}
            mode="card"
            aspectRatio={(song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "4:5"}
            focalX={song.coverPositionX ?? 50}
            focalY={song.coverPositionY ?? 50}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: hovered ? "brightness(0.75) saturate(1.10)" : "brightness(0.84) saturate(1.05)",
              transition: "filter 0.32s ease",
            }}
          />
        ) : (
          /* Missing Art Sanctuary — relic rings, void breathe */
          <div
            className="absolute inset-0 missing-art-void flex flex-col items-center justify-center gap-3"
            style={{
              background: "linear-gradient(160deg, #120e1c 0%, #0a0812 40%, #08060f 100%)",
            }}
          >
            <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
              <div className="absolute inset-0 rounded-full relic-ring-outer" style={{ border: "1px solid rgba(196,154,40,0.22)" }} />
              <div className="absolute inset-[10px] rounded-full relic-ring-inner" style={{ border: "1px solid rgba(196,154,40,0.14)" }} />
              <Music className="relic-icon" style={{ width: 22, height: 22, color: "rgba(196,154,40,0.38)" }} />
            </div>
            <span className="text-[9px] font-heading tracking-[0.18em] uppercase" style={{ color: "rgba(196,154,40,0.30)" }}>No Art Yet</span>
          </div>
        )}

        {/* LAYER 2: Gradient scrim — deeper cinematic bottom fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 20%, rgba(0,0,0,0.38) 46%, rgba(0,0,0,0.10) 64%, transparent 80%)",
          }}
        />

        {/* LAYER 3: WID seal — top-right, architectural badge */}
        {hasWid && (
          <Link
            href={`/verify/${song.witnessId}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(196,154,40,0.15)",
              border: "1px solid rgba(196,154,40,0.60)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 12px rgba(196,154,40,0.22), 0 0 0 1px rgba(196,154,40,0.08), inset 0 1px 0 rgba(255,220,100,0.24)",
            }}
          >
            <Shield size={8} style={{ color: "#D4A843", filter: "drop-shadow(0 0 3px rgba(196,154,40,0.60))" }} />
            <span className="font-heading text-[8px] tracking-[0.22em] uppercase" style={{ color: "#D4A843", textShadow: "0 0 10px rgba(196,154,40,0.55)" }}>
              WID
            </span>
          </Link>
        )}

        {/* Hot badge — top-left */}
        {isHot && (
          <div
            className="absolute top-2.5 left-2.5 z-20 flex items-center gap-0.5 px-2 py-0.5 rounded-full"
            style={{
              background: "linear-gradient(90deg, rgba(122,90,30,0.92), rgba(196,154,40,0.75))",
              backdropFilter: "blur(4px)",
            }}
          >
            <Crown size={8} style={{ color: "var(--ln-coal)" }} />
            <span className="text-[8px] font-heading font-bold tracking-widest" style={{ color: "var(--ln-coal)" }}>
              {(song.playCount ?? 0) >= 1000
                ? `${Math.floor((song.playCount ?? 0) / 1000)}K`
                : `${song.playCount}`}
            </span>
          </div>
        )}

        {/* Now playing badge — sacred live wave */}
        {isActive && (
          <div
            className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full font-bold tracking-wider"
            style={{
              background: "rgba(196,154,40,0.22)",
              border: "1px solid rgba(196,154,40,0.58)",
              color: "#C9A84C",
              fontFamily: "'Cinzel', serif",
              backdropFilter: "blur(6px)",
              boxShadow: "0 0 10px rgba(196,154,40,0.22)",
            }}
          >
            <div className="live-wave scale-75"><span /><span /><span /></div>
            LIVE
          </div>
        )}

        {/* AI disclosure — top-right when no WID */}
        {!hasWid && creator?.aiDisclosure && (
          <div className="absolute top-2 right-2 z-10">
            <AiDisclosurePill value={creator.aiDisclosure as any} size="compact" />
          </div>
        )}

        {/* LAYER 4: Play/action button — centered, hidden at rest */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            opacity: hovered || isActive ? 1 : 0,
            transition: "opacity 0.22s ease",
          }}
        >
          {isComic ? (
            <div
              className="pointer-events-auto flex items-center justify-center rounded-full"
              style={{
                width: "52px", height: "52px",
                background: "rgba(74,222,128,0.18)",
                border: "1.5px solid rgba(74,222,128,0.60)",
                backdropFilter: "blur(4px)",
                boxShadow: "0 0 20px rgba(74,222,128,0.25)",
              }}
            >
              <BookOpen size={18} className="text-green-400" />
            </div>
          ) : isNonAudio ? (
            <div
              className="pointer-events-auto flex items-center justify-center rounded-full"
              style={{
                width: "52px", height: "52px",
                background: "rgba(167,139,250,0.18)",
                border: "1.5px solid rgba(167,139,250,0.60)",
                backdropFilter: "blur(4px)",
                boxShadow: "0 0 20px rgba(167,139,250,0.25)",
              }}
            >
              <ExternalLink size={18} className="text-purple-400" />
            </div>
          ) : hasAudio ? (
            <div
              className="pointer-events-auto flex items-center justify-center rounded-full"
              style={{
                width: "52px", height: "52px",
                background: isActive ? "rgba(196,154,40,0.22)" : "rgba(0,0,0,0.45)",
                border: isActive ? "1.5px solid rgba(196,154,40,0.95)" : "1.5px solid rgba(196,154,40,0.75)",
                boxShadow: isActive
                  ? "0 0 0 7px rgba(196,154,40,0.08), 0 0 28px rgba(196,154,40,0.38), inset 0 1px 0 rgba(255,220,100,0.18)"
                  : "0 0 0 6px rgba(196,154,40,0.06), 0 0 20px rgba(196,154,40,0.26), inset 0 1px 0 rgba(255,220,100,0.12)",
                backdropFilter: "blur(6px)",
                animation: isActive && isPlaying ? "pulse-gold 1.8s ease-in-out infinite" : "none",
              }}
            >
              {isActive && isPlaying
                ? <div className="live-wave scale-75"><span /><span /><span /><span /><span /></div>
                : <Play size={18} fill="currentColor" className="ml-0.5" style={{ color: "#C9A84C" }} />
              }
            </div>
          ) : null}
        </div>

        {/* LAYERS 5+6+7: Bottom content stack */}
        <div className="absolute inset-x-0 bottom-0 p-3 z-10">
          {/* Content type chip — minimal */}
          <div className="mb-1">
            <span
              className="text-[8px] font-heading tracking-[0.16em] uppercase px-1.5 py-0.5 rounded-full"
              style={{ background: ctColors.chipBg, color: ctColors.text, border: `1px solid ${ctColors.chipBorder}` }}
            >
              {ctColors.label}
            </span>
          </div>

          {/* Work title — dominant */}
          <p
            className="font-heading leading-tight line-clamp-2 mb-1"
            style={{
              fontSize: "0.90rem",
              color: "rgba(252,248,240,1)",
              letterSpacing: "0.025em",
              textShadow: "0 1px 8px rgba(0,0,0,1), 0 2px 24px rgba(0,0,0,0.92), 0 0 40px rgba(0,0,0,0.65), 0 0 60px rgba(196,154,40,0.08)",
            }}
          >
            {song.title}
          </p>

          {/* Creator + resonance row */}
          <div className="flex items-center justify-between gap-1">
            <span
              className="truncate"
              style={{
                fontSize: "10px",
                color: "rgba(220,200,140,0.58)",
                fontFamily: "'Cinzel', serif",
                letterSpacing: "0.04em",
                textShadow: "0 1px 8px rgba(0,0,0,0.98)",
              }}
            >
              {artistName}
            </span>
            {plays && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Flame size={9} style={{ color: "rgba(220,180,80,0.45)" }} />
                <span style={{ fontSize: "10px", color: "rgba(220,180,80,0.45)", fontVariantNumeric: "tabular-nums" }}>{plays}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action strip — appears on hover, bottom overlay */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-end gap-1 px-2 pb-1"
          style={{
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s ease",
            background: "linear-gradient(to top, rgba(0,0,0,0.70) 0%, transparent 100%)",
            paddingTop: "24px",
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); toggleLike(e); }}
            className={`flex items-center gap-0.5 p-1 rounded transition-colors ${liked ? "text-pink-400" : "text-white/60 hover:text-pink-400"}`}
            title={liked ? "Unlike" : "Like"}
          >
            <Heart size={11} fill={liked ? "currentColor" : "none"} />
            {likeCount > 0 && <span className="text-[10px] tabular-nums">{likeCount >= 1000 ? `${(likeCount/1000).toFixed(1)}k` : likeCount}</span>}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onTip(item, (e.currentTarget as HTMLButtonElement).getBoundingClientRect()); }}
            className="p-1 text-white/60 hover:text-[#C49A28] transition-colors rounded"
            title="Send a gift"
          >
            <DollarSign size={11} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              playNext({
                id: String(song.id), title: song.title, artist: artistName,
                genre: song.genre || "", audioUrl: song.fileUrl || undefined,
                artUrl: song.coverArtUrl || undefined, witnessId: song.witnessId || undefined,
                creatorId: creator?.id ?? undefined,
                coverPositionX: song.coverPositionX ?? 50, coverPositionY: song.coverPositionY ?? 50,
                visualReady: song.visualReady ?? false, autoVideoUrl: song.autoVideoUrl ?? undefined,
                creatorRole: song.creator?.role ?? undefined,
              });
              toast.success(`"${song.title}" plays next`);
            }}
            className="p-1 text-white/60 hover:text-[#C49A28] transition-colors rounded"
            title="Play next"
          >
            <SkipForward size={11} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setShowAddToList(true); }}
            className="p-1 text-white/60 hover:text-[#C49A28] transition-colors rounded"
            title="Add to my list"
          >
            <ListPlus size={11} />
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
  const { addAndPlay, playQueueAt, playNext, togglePlay, openNowPlayingPanel, currentTrackId, state: playerState } = usePlayer();
  const search = useSearch();
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [mode, setMode] = useState<ExploreMode>(() => {
    const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const s = p.get("sort");
    const m = p.get("mode");
    if (s === "new" || m === "new") return "new";
    if (s === "trending" || m === "trending") return "trending";
    return "infinite";
  });
  // "store" = StoreTrackCard shelf rows; "classic" = creator-grouped pan-rows
  const [viewMode, setViewMode] = useState<"store" | "classic">("store");
  const [contentType, setContentType] = useState<ContentType | undefined>(() => {
    const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const m = p.get("medium");
    const mediumMap: Record<string, ContentType> = {
      music: "audio", lyrics: "lyrics", manuscripts: "manuscript", comics: "comic",
    };
    if (m && mediumMap[m]) return mediumMap[m];
    // When navigating to /explore?sort=new or /explore with no medium param,
    // do NOT default to "audio" — return undefined to show all content types.
    // Only restore the cached tab when the user is on the plain /explore page.
    const sort = p.get("sort");
    if (!m && !sort) return (getCache<string>(CACHE_KEYS.EXPLORE_TAB) as ContentType) ?? "audio";
    return undefined;
  });

  // Detect filter=creators from URL
  const filterParam = new URLSearchParams(search).get("filter");
  const isCreatorsMode = filterParam === "creators";

  // All Creators query — only fetched when filter=creators
  const { data: allCreatorsData, isLoading: creatorsLoading } = trpc.profile.allCreators.useQuery(
    undefined,
    { enabled: isCreatorsMode, staleTime: 120_000, refetchOnWindowFocus: false }
  );

  // Sync mode/contentType when URL search params change (e.g. ContextDrawer deep links)
  useEffect(() => {
    const p = new URLSearchParams(search);
    const s = p.get("sort");
    if (s === "new") setMode("new");
    else if (s === "trending") setMode("trending");
    else {
      // No sort param — reset to infinite so navigating from /explore?sort=new to
      // /explore?medium=music (via the Explore drawer) shows the full infinite feed.
      setMode("infinite");
    }
    const m = p.get("medium");
    const mediumMap: Record<string, ContentType> = {
      music: "audio", lyrics: "lyrics", manuscripts: "manuscript", comics: "comic",
    };
    if (m && mediumMap[m]) setContentType(mediumMap[m]);
    else if (!m) setContentType(undefined); // clear medium filter when not present
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Infinite scroll state — useInfiniteQuery (cursor-based) ─────────────
  const loaderRef = useRef<HTMLDivElement>(null);

  // Randomize state
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [isShuffling, setIsShuffling] = useState(false);

  // Tip/gift modal state
  const [tipItem, setTipItem] = useState<any | null>(null);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);

  // Inline comic reader state
  const [readerSong, setReaderSong] = useState<any | null>(null);
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

  // Map UI "novel" alias → server "written" content type (matches both manuscript AND comic)
  const serverContentType = contentType === "novel" ? "written" : contentType;

  // New This Week query
  const { data: newThisWeekData, isLoading: newThisWeekLoading } = trpc.songs.newThisWeek.useQuery(
    { genre: activeGenre === "All" ? undefined : activeGenre, limit: 500, contentType: serverContentType },
    { enabled: mode === "new", refetchOnWindowFocus: false, staleTime: 30_000 }
  );

  // Trending query — respects the active content-type chip
  const { data: trendingData, isLoading: trendingLoading } = trpc.songs.trending.useQuery(
    { genre: activeGenre === "All" ? undefined : activeGenre, limit: 500, contentType: serverContentType },
    { enabled: mode === "trending", refetchOnWindowFocus: false, staleTime: 60_000 }
  );

  // ── Infinite scroll — useInfiniteQuery (cursor-based) ───────────────────
  const {
    data: infiniteData,
    isLoading: pageLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = trpc.songs.discoverInfinite.useInfiniteQuery(
    {
      limit: PAGE_SIZE,
      genre: activeGenre === "All" ? undefined : activeGenre,
      search: query || undefined,
      contentType: serverContentType,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: mode === "infinite",
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      initialCursor: 0,
    }
  );

  // Flatten pages into a single array — memoised to avoid re-renders
  const allSongs = useMemo(() => {
    const flat = (infiniteData?.pages ?? []).flatMap((p) => p.items);
    // Deduplicate by song ID — offset drift (e.g. new uploads between pages) can
    // cause the same song to appear in two pages, producing duplicate React keys.
    const seen = new Set<number>();
    return flat.filter((item) => {
      const id = item.song.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [infiniteData]);
  const hasMore = !!hasNextPage;
  const isFetchingMore = isFetchingNextPage;

  // IntersectionObserver — triggers fetchNextPage when sentinel enters viewport
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isFetchingMore && mode === "infinite") {
        fetchNextPage();
      }
    },
    [hasMore, isFetchingMore, mode, fetchNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { rootMargin: "400px" });
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [handleObserver]);

  // ── Randomize query ───────────────────────────────────────────────
  const { data: randomData, isLoading: randomLoading } = trpc.songs.discover.useQuery(
    {
      genre: activeGenre === "All" ? undefined : activeGenre,
      search: query || undefined,
      limit: 500,
      randomize: true,
      seed,
      contentType: serverContentType,
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

  // ── Lazy bulk-like: only fetch statuses for visible creator rows ────────────
  // Each creator row registers itself via a ref callback; when it enters the
  // viewport the row's song IDs are added to visibleSongIds.
  const [visibleSongIds, setVisibleSongIds] = useState<Set<number>>(new Set());
  const rowObserverRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    rowObserverRef.current = new IntersectionObserver(
      (entries) => {
        const added: number[] = [];
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const ids = (entry.target as HTMLElement).dataset.songIds;
            if (ids) ids.split(",").forEach(id => added.push(Number(id)));
          }
        });
        if (added.length > 0) {
          setVisibleSongIds(prev => {
            const next = new Set(prev);
            added.forEach(id => next.add(id));
            return next;
          });
        }
      },
      { rootMargin: "200px" }
    );
    return () => rowObserverRef.current?.disconnect();
  }, []);
  // Reset visible IDs when the filter/mode changes.
  // NOTE: Do NOT use [songs] here — songs is a new array reference every render
  // and would cause an infinite setState → re-render loop.
  useEffect(() => { setVisibleSongIds(new Set()); }, [mode, activeGenre, query, contentType, seed]);
  const visibleIdArray = useMemo(() => Array.from(visibleSongIds).slice(0, 500), [visibleSongIds]);
  const { data: bulkLikeData } = trpc.songs.getBulkLikeStatuses.useQuery(
    { songIds: visibleIdArray },
    { enabled: visibleIdArray.length > 0, staleTime: 30_000 }
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

  // ── Group songs by creator for pan-row display ──────────────────
  const creatorGroups = useMemo(() => {
    const map = new Map<number, { creator: any; items: any[] }>();
    for (const item of songs) {
      const cid: number = item.creator?.id ?? 0;
      if (!map.has(cid)) map.set(cid, { creator: item.creator, items: [] });
      map.get(cid)!.items.push(item);
    }
    return Array.from(map.values());
  }, [songs]);

  /** Convert an explore item to a Track shape for TrackCard / PlayerContext */
  const itemToTrack = (s: any) => ({
    id: String(s.song.id),
    title: s.song.title,
    artist: s.creator?.artistHandle || s.creator?.name || "Unknown",
    genre: s.song.genre || "",
    audioUrl: s.song.fileUrl || undefined,
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
    contentType: s.song.contentType ?? "audio",
  });

  const handlePlay = (item: any) => {
    const song = item.song;
    const creator = item.creator;
    if (!song.fileUrl) { toast.error("No audio file available for this track"); return; }
    // If this track is already active, toggle play/pause instead of restarting the queue
    if (currentTrackId === String(song.id)) {
      togglePlay();
      return;
    }
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

  // Pull-to-refresh — invalidates all explore queries
  const utils = trpc.useUtils();
  const { pullProgress, isRefreshing, indicatorY } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        utils.songs.trending.invalidate(),
        utils.songs.discover.invalidate(),
        utils.songs.discoverInfinite.invalidate(),
        utils.songs.newThisWeek.invalidate(),
        utils.profile.allCreators.invalidate(),
      ]);
    },
  });

  return (
    <div className="animate-fade-up">
      <PullToRefreshIndicator
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
        indicatorY={indicatorY}
      />
      {/* ── Compact Explore Header ─────────────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: "120px" }}>
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663123503966/KJZjjmwzpNKiuBIL.png"
          alt="Explore hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "saturate(1.2) contrast(1.08)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,10,30,0.88) 0%, rgba(30,16,40,0.55) 50%, transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,12,28,0.92) 0%, rgba(14,12,28,0.25) 50%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 px-6 pb-4 pt-3">
          <p className="text-[9px] mb-0.5 font-mono tracking-[0.22em] uppercase" style={{ color: "var(--ln-gold)" }}>Living Nexus</p>
          <h1 className="text-xl font-bold font-heading" style={{ color: "var(--ln-parchment)", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>Explore the Cosmos</h1>
        </div>
      </div>

      <div className="px-6 py-5 overflow-hidden">
        {/* Search */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/65" />
          <input
            type="text"
            placeholder="Search tracks, artists, genres…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13.5px] font-body text-white/80
              bg-[#000000] border border-white/[0.08] outline-none
              focus:border-[#A78BFA]/50 transition-colors placeholder:text-white/60
              max-w-[480px]"
          />
        </div>

        {/* Content-type tab bar */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px solid rgba(44,52,56,0.4)" }}>
          {CONTENT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setContentType(tab.id); setCache(CACHE_KEYS.EXPLORE_TAB, tab.id, TTL.UI_STATE); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-heading font-bold tracking-wide transition-all"
              style={contentType === tab.id
                ? { background: "var(--ln-coal)", color: tab.color, boxShadow: `0 0 12px ${tab.color}33` }
                : { color: "var(--ln-iron)" }
              }
            >
              <span className="text-[13px] leading-none">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Genre pill chips — horizontal scroll */}
        <div className="mb-5 -mx-6 px-6">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {GENRE_CHIPS.map(g => {
              const isActive = activeGenre === g.label;
              return (
                <button
                  key={g.label}
                  onClick={() => setActiveGenre(g.label)}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-heading font-semibold tracking-wide transition-all"
                  style={isActive ? {
                    background: `${g.color}22`,
                    border: `1px solid ${g.color}88`,
                    color: g.color,
                    boxShadow: `0 0 10px ${g.color}33`,
                  } : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.60)",
                  }}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Featured Projects ── */}
        {featuredProjects && featuredProjects.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rocket size={15} style={{ color: "var(--ln-gold)" }} />
                <h2 className="font-heading text-[13px] tracking-widest uppercase" style={{ color: "var(--ln-gold)" }}>Featured Projects</h2>
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
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px solid rgba(44,52,56,0.4)" }}>
            <button
              onClick={() => setMode("infinite")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                mode === "infinite" ? "" : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "infinite" ? { background: "var(--ln-coal)", color: "var(--ln-gold)" } : {}}
            >
              <Infinity size={12} />
              Infinite
            </button>
            <button
              onClick={() => setMode("randomize")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                mode === "randomize" ? "" : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "randomize" ? { background: "var(--ln-coal)", color: "var(--ln-gold)" } : {}}
            >
              <Shuffle size={12} />
              Randomize
            </button>
            <button
              onClick={() => setMode("trending")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                mode === "trending" ? "" : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "trending" ? { background: "var(--ln-coal)", color: "#fb923c" } : {}}
            >
              <TrendingUp size={12} />
              Trending
            </button>
            <button
              onClick={() => setMode("new")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                mode === "new" ? "" : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "new" ? { background: "var(--ln-coal)", color: "var(--ln-seal-bright)" } : {}}
            >
              <Sparkles size={12} />
              New
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Store / Classic view toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "var(--ln-coal)", border: "1px solid rgba(44,52,56,0.4)" }}>
              <button
                onClick={() => setViewMode("store")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all"
                style={viewMode === "store" ? { background: "rgba(196,154,40,0.15)", color: "#C49A28" } : { color: "rgba(255,255,255,0.40)" }}
                title="Store view"
              >
                <LayoutGrid size={12} />
              </button>
              <button
                onClick={() => setViewMode("classic")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all"
                style={viewMode === "classic" ? { background: "rgba(196,154,40,0.15)", color: "#C49A28" } : { color: "rgba(255,255,255,0.40)" }}
                title="Classic view"
              >
                <List size={12} />
              </button>
            </div>
            <span className="text-[12px] font-body" style={{ color: "rgba(255,255,255,0.45)" }}>
              {isLoading ? "Loading…" : `${songs.length} track${songs.length === 1 ? "" : "s"}`}
            </span>
            {mode === "randomize" && (
              <button
                onClick={handleRandomize}
                disabled={isShuffling || randomLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: "rgba(196,154,40,0.08)",
                  border: "1px solid rgba(196,154,40,0.3)",
                  color: "var(--ln-gold)",
                }}
              >
                <Shuffle size={14} className={isShuffling ? "animate-spin" : ""} style={{ animationDuration: "0.4s" }} />
                {isShuffling ? "Shuffling…" : "Shuffle Again"}
              </button>
            )}
          </div>
        </div>

        {/* Loading skeleton — pan-row style */}
        {!isCreatorsMode && isLoading && (
          <div className="space-y-7">
            {Array.from({ length: 3 }).map((_, gi) => (
              <div key={gi}>
                <div className="flex items-center gap-3 mb-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/[0.08] flex-shrink-0" />
                  <div className="h-3 bg-white/[0.06] rounded w-32" />
                </div>
                <div className="museum-pan-row -mx-6 px-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 rounded-xl overflow-hidden border border-white/[0.06] bg-[#000000] animate-pulse" style={{ width: "var(--card-pan-w)" }}>
                      <div className="bg-white/[0.04]" style={{ height: "200px" }} />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                        <div className="h-2.5 bg-white/[0.04] rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ALL CREATORS MODE ─────────────────────────────────────────────────────── */}
        {isCreatorsMode && (
          <div>
            {creatorsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.10)" }}>
                    <div className="h-24" style={{ background: "rgba(255,255,255,0.04)" }} />
                    <div className="p-4 space-y-2">
                      <div className="w-12 h-12 rounded-full -mt-8 mb-2" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-3 rounded w-3/4" style={{ background: "rgba(255,255,255,0.06)" }} />
                      <div className="h-2.5 rounded w-1/2" style={{ background: "rgba(255,255,255,0.04)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : !allCreatorsData || allCreatorsData.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🌌</div>
                <div className="font-heading text-[17px] mb-2" style={{ color: "rgba(255,255,255,0.50)" }}>No creators yet</div>
                <div className="text-[13px] font-body" style={{ color: "rgba(255,255,255,0.35)" }}>Be the first to register your work on Living Nexus.</div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ln-gold)" }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span className="font-heading text-[13px] tracking-widest uppercase" style={{ color: "var(--ln-gold)" }}>All Creators</span>
                  <span className="text-[11px] font-body ml-1" style={{ color: "rgba(255,255,255,0.35)" }}>{allCreatorsData.length} registered</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {allCreatorsData.map((creator: any) => (
                    <StoreCreatorCard key={creator.id} creator={creator} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STORE VIEW ───────────────────────────────────────────────────────────────── */}
        {!isCreatorsMode && !isLoading && songs.length > 0 && viewMode === "store" && (
          <div className="-mx-6">
            {/* Group by genre for store rows */}
            {(() => {
              const storeSongs = songs.map(exploreMapToSongData);
              // If a genre is selected, show one row; otherwise group by genre
              if (activeGenre !== "All") {
                return (
                  <ShowcaseRow
                    title={activeGenre}
                    seeAllHref={`/explore?genre=${encodeURIComponent(activeGenre)}`}
                    className="px-6"
                  >
                    {storeSongs.map((song: ReturnType<typeof exploreMapToSongData>, idx: number) => (
                      <StoreTrackCard key={song.id} song={song} size="md" allSongs={storeSongs} songIndex={idx} />
                    ))}
                  </ShowcaseRow>
                );
              }
              // Group by genre
              const genreMap = new Map<string, ReturnType<typeof exploreMapToSongData>[]>();
              for (const s of storeSongs) {
                const g = s.genre || "Other";
                if (!genreMap.has(g)) genreMap.set(g, []);
                genreMap.get(g)!.push(s);
              }
              // Also show an "All" row with first 20 tracks
              const rows: React.ReactElement[] = [];
              if (storeSongs.length > 0) {
                const topSlice = storeSongs.slice(0, 20);
                rows.push(
                  <ShowcaseRow key="__all" title={mode === "trending" ? "Trending" : mode === "new" ? "New This Week" : "All Tracks"} seeAllHref="/explore" className="px-6">
                    {topSlice.map((song: ReturnType<typeof exploreMapToSongData>, idx: number) => (
                      // Namespace key with row context to prevent collision with genre rows
                      <StoreTrackCard key={`__all-${song.id}`} song={song} size="md" allSongs={topSlice} songIndex={idx} isNew={mode === "new"} />
                    ))}
                  </ShowcaseRow>
                );
              }
              genreMap.forEach((genreSongs, genre) => {
                if (genreSongs.length < 3) return; // skip tiny rows
                // Sanitize genre for use in key (remove spaces/special chars)
                const genreKey = genre.replace(/[^a-zA-Z0-9]/g, "_");
                rows.push(
                  <ShowcaseRow key={genre} title={genre} seeAllHref={`/explore?genre=${encodeURIComponent(genre)}`} className="px-6">
                    {genreSongs.map((song: ReturnType<typeof exploreMapToSongData>, idx: number) => (
                      // Namespace key with genre to prevent collision with __all row
                      <StoreTrackCard key={`${genreKey}-${song.id}`} song={song} size="md" allSongs={genreSongs} songIndex={idx} isNew={mode === "new"} />
                    ))}
                  </ShowcaseRow>
                );
              });
              return rows;
            })()}
          </div>
        )}

        {/* ── CLASSIC VIEW ──────────────────────────────────────────────────────────────── */}
        {/* Creator-grouped pan-rows — infinite mode only */}
        {!isCreatorsMode && !isLoading && songs.length > 0 && viewMode === "classic" && mode === "infinite" && (
          <div
            className="space-y-8"
            style={isShuffling ? { opacity: 0.5, transition: "opacity 0.2s" } : { opacity: 1, transition: "opacity 0.3s" }}
          >
            {creatorGroups.map(({ creator, items }) => {
              const artistName = creator?.artistHandle || creator?.name || "Unknown";
              const initial = artistName.charAt(0).toUpperCase();
              const creatorQueue = items
                .filter((s: any) => !!s.song.fileUrl)
                .map(itemToTrack);
              const handleCreatorPlay = (item: any) => {
                // ExploreCard passes { song, creator } — convert to track for queue
                const track = itemToTrack(item);
                const startIdx = creatorQueue.findIndex((t: any) => t.id === track.id);
                if (creatorQueue.length > 0) {
                  playQueueAt(creatorQueue, startIdx >= 0 ? startIdx : 0, "EXPLORE");
                } else {
                  addAndPlay(track);
                }
                openNowPlayingPanel();
              };
              return (
                <div
                  key={creator?.id ?? artistName}
                  data-song-ids={items.map((i: any) => i.song.id).join(",")}
                  ref={(el) => {
                    if (el && rowObserverRef.current) rowObserverRef.current.observe(el);
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)", color: "#fff" }}
                      >
                        {initial}
                      </div>
                      {creator?.id ? (
                        <Link
                          href={`/creator/${creator.id}#works`}
                          className="font-heading text-[13px] tracking-wide hover:text-[#C49A28] transition-colors"
                          style={{ color: "var(--ln-parchment)" }}
                        >
                          {artistName}
                        </Link>
                      ) : (
                        <span className="font-heading text-[13px] tracking-wide" style={{ color: "var(--ln-parchment)" }}>{artistName}</span>
                      )}
                      <span className="text-[10px] font-body" style={{ color: "rgba(255,255,255,0.30)" }}>
                        {items.length} track{items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {creator?.id && (
                      <Link
                        href={`/creator/${creator.id}#works`}
                        className="text-[11px] font-body transition-colors hover:text-[#C49A28]"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        View all →
                      </Link>
                    )}
                  </div>
                  <div className="museum-pan-row -mx-6 px-6">
                    {items.map((item: any, idx: number) => {
                      const likeEntry = (likeMap as any)[item.song.id];
                      const isItemActive = currentTrackId === String(item.song.id);
                      const isItemPlaying = isItemActive && playerState.isPlaying;
                      return (
                        <div key={item.song.id} className="flex-shrink-0" style={{ width: "var(--card-pan-w)" }}>
                          <ExploreCard
                            item={item}
                            isActive={isItemActive}
                            isPlaying={isItemPlaying}
                            onPlay={handleCreatorPlay}
                            onTip={(_item: any, rect: DOMRect) => {
                              setTipItem(item);
                              setTipRect(rect);
                            }}
                            prefetchedLiked={likeEntry?.liked}
                            prefetchedLikeCount={likeEntry?.count}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Flat grid — randomize / trending / new modes: all tracks across all creators (classic view only) */}
        {!isCreatorsMode && !isLoading && songs.length > 0 && viewMode === "classic" && mode !== "infinite" && (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(min(var(--card-pan-w), 100%), 1fr))",
              opacity: isShuffling ? 0.5 : 1,
              transition: "opacity 0.3s",
            }}
          >
            {songs.map((item: any, idx: number) => {
              const likeEntry = (likeMap as any)[item.song.id];
              const isItemActive = currentTrackId === String(item.song.id);
              const isItemPlaying = isItemActive && playerState.isPlaying;
              return (
                <ExploreCard
                  key={item.song.id}
                  item={item}
                  isActive={isItemActive}
                  isPlaying={isItemPlaying}
                  onPlay={handlePlay}
                  onTip={(_item: any, rect: DOMRect) => {
                    setTipItem(item);
                    setTipRect(rect);
                  }}
                  prefetchedLiked={likeEntry?.liked}
                  prefetchedLikeCount={likeEntry?.count}
                />
              );
            })}
          </div>
        )}
        {/* Infinite scroll sentinel — only rendered in infinite mode */}
        {!isCreatorsMode && mode === "infinite" && !isLoading && (
          <div ref={loaderRef} className="py-12 flex flex-col items-center gap-3">
            {isFetchingMore && (
              <div className="flex flex-col items-center gap-3">
                {/* Cinematic loading ring */}
                <div className="relative w-10 h-10">
                  <div
                    className="absolute inset-0 rounded-full animate-spin"
                    style={{
                      border: "2px solid rgba(196,154,40,0.12)",
                      borderTopColor: "rgba(196,154,40,0.80)",
                      animationDuration: "0.9s",
                    }}
                  />
                  <div
                    className="absolute inset-[5px] rounded-full animate-spin"
                    style={{
                      border: "1px solid rgba(196,154,40,0.06)",
                      borderTopColor: "rgba(196,154,40,0.35)",
                      animationDuration: "1.4s",
                      animationDirection: "reverse",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-mono tracking-[0.18em] uppercase"
                  style={{ color: "rgba(196,154,40,0.55)" }}
                >
                  Summoning more works…
                </span>
              </div>
            )}
            {!hasMore && songs.length > 0 && (
              <div className="flex flex-col items-center gap-2 py-4">
                <div
                  className="w-16 h-px"
                  style={{ background: "linear-gradient(to right, transparent, rgba(196,154,40,0.35), transparent)" }}
                />
                <p
                  className="text-[10px] font-mono tracking-[0.22em] uppercase text-center"
                  style={{ color: "rgba(196,154,40,0.40)" }}
                >
                  ❖ All works witnessed ❖
                </p>
                <div
                  className="w-16 h-px"
                  style={{ background: "linear-gradient(to right, transparent, rgba(196,154,40,0.35), transparent)" }}
                />
              </div>
            )}
          </div>
        )}

        {/* Track context menu */}
        {menuSong && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div
              className="fixed z-50 min-w-[190px] rounded-xl overflow-hidden shadow-2xl py-1"
              style={{ top: menuPos.y, left: menuPos.x, background: "var(--ln-coal)", border: "1px solid #C3AB7D" }}
            >
              {menuSong.song.fileUrl && (
                <button
                  onClick={handlePlayNextFromMenu}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
                  style={{ color: "var(--ln-parchment)" }}
                >
                  <Play className="w-4 h-4 opacity-60" /> Play Next
                </button>
              )}
              <button
                onClick={e => { setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setShowAddToList(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
                style={{ color: "var(--ln-parchment)" }}
              >
                <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Add to My List
              </button>
              <div className="my-1 border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }} />
              <Link href={`/song/${menuSong.song.id}`} onClick={closeMenu}>
                <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
                  <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Song Page
                </button>
              </Link>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/song/${menuSong.song.id}`); toast.success("Link copied!"); closeMenu(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
                style={{ color: "var(--ln-parchment)" }}
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
        {!isCreatorsMode && !isLoading && songs.length === 0 && (
          <div className="text-center py-20 text-white/70">
            {mode === "new" ? (
              <>
                <div className="text-5xl mb-4">🌱</div>
                <div className="font-heading text-[17px] text-white/50 mb-2">Nothing new yet</div>
                <div className="text-[13px] font-body text-white/40 max-w-xs mx-auto">
                  No recent works found. Check back soon — or be the first to drop something new.
                </div>
                <button
                  className="mt-5 text-xs px-4 py-2 rounded-full transition-colors"
                  style={{ background: "var(--ln-coal)", color: "var(--ln-seal-bright)", border: "1px solid rgba(74,222,128,0.28)" }}
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
                  {query || activeGenre !== "All" ? "Try a different search term or genre" : "No songs registered yet — be the first!"}
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
      {/* Inline comic reader — launched when user clicks a comic card */}
      {readerSong && (() => {
        let pages: { imageUrl: string; caption?: string; pageNumber: number }[] = [];
        try { pages = JSON.parse(readerSong.pagesJson || "[]"); } catch { /* ignore */ }
        return (
          <div className="fixed inset-0 z-[500] bg-black">
            <CinematicComicReader
              pages={pages}
              title={readerSong.title}
              onClose={() => setReaderSong(null)}
            />
          </div>
        );
      })()}
    </div>
  );
}
