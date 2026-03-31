/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage
   Two modes: Infinite Scroll (offset pagination) + Randomize (seeded RAND)
   No algorithm. No "you might like." Just — here's what exists.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { Search, Music, Play, Shuffle, Infinity, MoreHorizontal } from "lucide-react";
import { MediaAsset } from "@/components/MediaAsset";
import { AddToMyListModal } from "@/components/AddToMyListModal";

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

type ExploreMode = "infinite" | "randomize";

export default function ExplorePage() {
  const { addAndPlay, playQueueAt, playNext, openNowPlayingPanel, currentTrackId, state: playerState } = usePlayer();
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [mode, setMode] = useState<ExploreMode>("infinite");

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

  // ── Infinite scroll — fetch one page at a time ────────────────────
  const { data: pageData, isLoading: pageLoading, isFetching: pageFetching } = trpc.songs.discover.useQuery(
    {
      genre: activeGenre === "All" ? undefined : activeGenre,
      search: query || undefined,
      limit: PAGE_SIZE,
      offset,
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

  // Reset on filter/mode change
  useEffect(() => {
    setOffset(0);
    setAllSongs([]);
    setHasMore(true);
    setIsFetchingMore(false);
    fetchedOffsetRef.current = -1;
  }, [activeGenre, query, mode]);

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
  const songs = mode === "infinite" ? allSongs : (randomData || []);
  const isLoading = mode === "infinite" ? (pageLoading && allSongs.length === 0) : randomLoading;

  // ── Track context menu state ──────────────────────────────────────
  const [menuSong, setMenuSong] = useState<any | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showAddToList, setShowAddToList] = useState(false);

  const openMenu = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 200);
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
          <p className="text-[12px] font-body mt-1" style={{ color: "#E2E8F0" }}>Every sound in the universe, at your fingertips</p>
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

        {/* Mode toggle + controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {/* Mode pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "oklch(0.14 0.013 280)", border: "1px solid oklch(0.22 0.04 270 / 40%)" }}>
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
              const song = item.song;
              const creator = item.creator;
              const isActive = currentTrackId === String(song.id);
              return (
                <div
                  key={song.id}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200
                    border bg-[oklch(0.115_0.055_278)]
                    ${isActive
                      ? "border-[#D4AF37]/40 shadow-[0_0_0_1px_rgba(232,197,71,0.2),0_8px_32px_rgba(0,0,0,0.6)]"
                      : "border-white/[0.06] hover:border-[#A78BFA]/30 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
                    }`}
                  onClick={() => handlePlay(item)}
                  onContextMenu={(e) => openMenu(e, item)}
                >
                  {/* Artwork — MRS card mode */}
                  <div className="relative overflow-hidden" style={{ height: "240px" }}>
                    <MediaAsset
                      src={song.coverArtUrl}
                      alt={song.title}
                      mode="card"
                      aspectRatio={(song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "1:1"}
                      focalX={song.coverPositionX ?? 50}
                      focalY={song.coverPositionY ?? 50}
                      className="absolute inset-0 w-full h-full"
                    />
                    <div className={`absolute inset-0 transition-opacity duration-200
                      bg-gradient-to-b from-transparent via-transparent to-black/70
                      ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    />
                    {isActive && playerState.isPlaying ? (
                      <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center z-10 bg-[#D4AF37]">
                        <div className="flex items-end gap-[2px] h-4">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="w-[3px] rounded-full bg-black"
                              style={{ height: "40%", animation: `waveBar 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center
                        transition-all duration-200 z-10
                        ${isActive ? "opacity-100 bg-[#D4AF37]" : "opacity-0 group-hover:opacity-100 bg-[#A78BFA]"}`}
                      >
                        <Play size={14} fill="currentColor" className="text-black ml-0.5" />
                      </div>
                    )}
                    {song.witnessId && (
                      <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded
                        bg-black/70 z-10 font-heading tracking-wider wid-glow"
                        style={{ color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.84 0.155 85 / 0.55)" }}>
                        WID
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <Link href={`/song/${song.id}`} onClick={e => e.stopPropagation()} className="flex-1 min-w-0">
                        <div className="text-[13px] font-heading text-white truncate tracking-wide hover:text-[#D4AF37] transition-colors">
                          {song.title}
                        </div>
                      </Link>
                      <button
                        onClick={(e) => openMenu(e, item)}
                        className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.08]"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: "#E2E8F0" }}>
                      <Link href={`/creator/${creator?.id}`} onClick={e => e.stopPropagation()}>
                        <span className="truncate hover:text-white/60 transition-colors">
                          {creator?.artistHandle || creator?.name || "Unknown"}
                        </span>
                      </Link>
                      {song.genre && (
                        <>
                          <span style={{ color: "rgba(255,255,255,0.35)" }}>·</span>
                          <span className="truncate" style={{ color: "oklch(0.84 0.155 85 / 0.80)" }}>{song.genre}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                      <span>▶ {song.playCount || 0}</span>
                      {song.tipCount > 0 && <span>💰 {song.tipCount}</span>}
                    </div>
                  </div>
                </div>
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
              style={{ top: menuPos.y, left: menuPos.x, background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}
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
                onClick={() => { setShowAddToList(true); }}
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
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.85 0.02 280)" }}>
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
        {showAddToList && menuSong && (
          <AddToMyListModal
            songId={menuSong.song.id}
            songTitle={menuSong.song.title}
            onClose={() => { setShowAddToList(false); closeMenu(); }}
          />
        )}

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
            <div className="text-5xl mb-4">🔮</div>
            <div className="font-heading text-[17px] text-white/50 mb-2">No tracks found</div>
            <div className="text-[13px] font-body">
              {query || activeGenre !== "All" ? "Try a different search term or genre" : "No songs uploaded yet — be the first!"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
