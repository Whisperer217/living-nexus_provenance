import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Search, Music, Users, Shield, ChevronRight, Star, MoreHorizontal, FileText, BookOpen, Layers } from "lucide-react";
import { WorkCarousel } from "@/components/WorkCarousel";
import { MediaAsset } from "@/components/MediaAsset";
import { AiDisclosurePill } from "@/components/AiDisclosurePill";
import { toast } from "sonner";
import { usePlayer } from "@/contexts/PlayerContext";
import { AddToMyListModal } from "@/components/AddToMyListModal";

// Extended genre categories with WID type indicators
const MUSIC_GENRES = ["Gospel", "Classical", "Rock", "Hip-Hop", "Electronic", "R&B", "Ambient"];
const MANUSCRIPT_CATEGORIES = ["Doctrine", "Policy", "Narrative"];
const LYRICS_CATEGORIES = ["Worship", "Spoken", "Poetic"];

const GENRE_ICONS: Record<string, string> = {
  "Gospel": "https://cdn.manus.space/icons/icon-cross.png",
  "Classical": "https://cdn.manus.space/icons/icon-lyre.png",
  "Rock": "https://cdn.manus.space/icons/icon-guitar.png",
  "Hip-Hop": "https://cdn.manus.space/icons/icon-eye.png",
  "Electronic": "https://cdn.manus.space/icons/icon-fire-lyre.png",
  "R&B": "https://cdn.manus.space/icons/icon-feather.png",
  "Ambient": "https://cdn.manus.space/icons/icon-book.png",
};

type ContentType = "audio" | "lyrics" | "manuscript" | "comic";

const TYPE_PARAM_MAP: Record<string, ContentType> = {
  music: "audio",
  audio: "audio",
  lyrics: "lyrics",
  manuscripts: "manuscript",
  manuscript: "manuscript",
  comics: "comic",
  comic: "comic",
};

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | undefined>();
  const [activeContentType, setActiveContentType] = useState<ContentType | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const param = new URLSearchParams(window.location.search).get("type");
    return param ? (TYPE_PARAM_MAP[param.toLowerCase()] ?? undefined) : undefined;
  });

  // Sync activeContentType when the URL ?type= param changes (e.g. browser back/forward)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("type");
    setActiveContentType(param ? (TYPE_PARAM_MAP[param.toLowerCase()] ?? undefined) : undefined);
  }, [typeof window !== "undefined" ? window.location.search : ""]);
  const { addAndPlay, playQueueAt, playNext, openNowPlayingPanel, currentTrackId, state: playerState } = usePlayer();
  const [menuSong, setMenuSong] = useState<any | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);

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

  const { data: songs, isLoading: songsLoading } = trpc.songs.discover.useQuery(
    { genre: activeGenre, search: search || undefined, limit: 24, contentType: activeContentType },
    { refetchOnWindowFocus: false }
  );
  const { data: creators, isLoading: creatorsLoading } = trpc.profile.allCreators.useQuery(undefined, { refetchOnWindowFocus: false });
  const playMutation = trpc.songs.play.useMutation();

  const handlePlay = (clickedSong: any) => {
    if (!clickedSong.song.fileUrl) { toast.error("No audio file available"); return; }
    if (songs && songs.length > 0) {
      // Build full queue from current filtered results and play from the clicked track
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
          creatorId: s.creator?.id ?? undefined,
          coverPositionX: s.song.coverPositionX ?? 50,
          coverPositionY: s.song.coverPositionY ?? 50,
          visualReady: s.song.visualReady ?? false,
          autoVideoUrl: s.song.autoVideoUrl ?? undefined,
          creatorRole: s.creator?.role ?? undefined,
        }));
      const startIdx = queue.findIndex((t: any) => t.id === String(clickedSong.song.id));
      playQueueAt(queue, startIdx >= 0 ? startIdx : 0, "HOME");
    } else {
      addAndPlay({
        id: String(clickedSong.song.id),
        title: clickedSong.song.title,
        artist: clickedSong.creator?.artistHandle || clickedSong.creator?.name || "Unknown",
        genre: clickedSong.song.genre || "",
        audioUrl: clickedSong.song.fileUrl,
        artUrl: clickedSong.song.coverArtUrl || undefined,
        witnessId: clickedSong.song.witnessId || undefined,
        aiDisclosure: clickedSong.creator?.aiDisclosure || undefined,
        creatorId: clickedSong.creator?.id ?? undefined,
        coverPositionX: clickedSong.song.coverPositionX ?? 50,
        coverPositionY: clickedSong.song.coverPositionY ?? 50,
      });
    }
    playMutation.mutate({ songId: clickedSong.song.id });
    openNowPlayingPanel();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-coal)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--ln-coal) 0%, #111009 50%, #111009 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(196,154,40,0.25) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(196,154,40,0.15) 0%, transparent 50%)" }} />
        {/* Radial depth: dark center bleeding to deep purple/blue edge */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 0%, rgba(44,52,56,0.3) 50%, rgba(44,52,56,0.6) 100%)" }} />
        <div className="relative container py-16 md:py-24">
          <div className="max-w-3xl">
            {/* Declaration */}
            <p className="text-xs font-mono tracking-[0.25em] uppercase mb-3" style={{ color: "rgba(230,205,174,0.75)" }}>
              Living Nexus is on fire for Jesus
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)", textShadow: "0 0 40px rgba(196,154,40,0.3)" }}>
              A cryptographic provenance layer<br className="hidden md:block" /> for creative works.
            </h1>
            <p className="text-sm font-mono tracking-[0.2em] uppercase mb-5" style={{ color: "rgba(196,154,40,0.5)" }}>#MainlyMusic</p>
            <p className="text-sm mb-8" style={{ color: "var(--ln-parchment)" }}>
              Every song on this platform carries a <strong style={{ color: "var(--ln-gold)" }}>Witness ID</strong> — a cryptographic proof of creation that belongs to the artist, not the algorithm. Two layers of protection: individual WIDs for every track, and collective WID-ALB certificates for entire albums.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/upload">
                <Button size="lg" className="btn-gold-glow" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)", fontFamily: "'Cinzel', serif", fontWeight: 700 }}>
                  Upload Your Music
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="outline" className="btn-violet-glow" style={{ borderColor: "rgba(230,205,174,0.55)", color: "#FFFFFF" }}>
                  Explore All Tracks
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* ── Founder's Era Banner ─────────────────────────────────────────────── */}
      <div className="container pt-8 pb-2">
        <Link href="/founders">
          <div
            className="flex items-center justify-between rounded-xl border px-5 py-4 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.3)" }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--ln-gold)" }} className="text-lg">✦</span>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--ln-gold)" }}>Founder's Era — Genesis Day, March 2026</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>Keep the light on. Your name lives here forever.</p>
              </div>
            </div>
            <span className="text-xs font-mono tracking-wider hidden sm:block" style={{ color: "var(--ln-gold)" }}>SUPPORT →</span>
          </div>
        </Link>
      </div>
      {/* ── Creator / Fan Value Split ───────────────────────────────────────────────── */}
      <div className="container py-10">
        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl">
          {/* For Creators */}
          <div className="rounded-xl border p-5" style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.15)" }}>
            <p className="text-xs font-mono tracking-[0.2em] uppercase mb-4" style={{ color: "var(--ln-gold)" }}>For Creators</p>
            <ul className="space-y-2">
              {["Upload your music. Get your WID.", "Keep 90% of every gift received.", "Own your catalog. Always.", "Batch upload entire albums at once."].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <Shield size={12} className="flex-shrink-0 mt-0.5" style={{ color: "rgba(196,154,40,0.5)" }} />
                  <span className="text-[13px]" style={{ color: "#E2E8F0" }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* For Fans */}
          <div className="rounded-xl border p-5" style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.15)" }}>
            <p className="text-xs font-mono tracking-[0.2em] uppercase mb-4" style={{ color: "var(--ln-gold)" }}>For Fans</p>
            <ul className="space-y-2">
              {["Discover real music from real people.", "Gift creators directly. 90% reaches them.", "Verify any track's origin with its WID.", "No algorithm. No ads. No noise."].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <Star size={12} className="flex-shrink-0 mt-0.5" style={{ color: "rgba(196,154,40,0.5)" }} />
                  <span className="text-[13px]" style={{ color: "#E2E8F0" }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Creation Type Overview ─────────────────────────────────────────── */}
      <div className="container pt-8 pb-0">
        <div className="mb-2">
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-3" style={{ color: "rgba(196,154,40,0.4)" }}>CREATION TYPE OVERVIEW</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { type: "audio" as const, label: "Music", icon: Music, widLabel: "WID-MUS", color: "var(--ln-gold)", href: "/discover?type=music" },
            { type: "lyrics" as const, label: "Lyrics", icon: FileText, widLabel: "WID-LYR", color: "var(--ln-gold)", href: "/discover?type=lyrics" },
            { type: "manuscript" as const, label: "Manuscripts", icon: BookOpen, widLabel: "WID-MAN", color: "var(--ln-seal-bright)", href: "/discover?type=manuscripts" },
            { type: "comic" as const, label: "Comics", icon: Layers, widLabel: "WID-COM", color: "#38BDF8", href: "/discover?type=comics" },
          ].map(({ type: ct, label, icon: Icon, widLabel, color, href }) => {
            const { data: countData } = trpc.songs.getCountsByContentType.useQuery(undefined, { staleTime: 300_000 });
            const count = countData ? (countData as any)[ct] ?? 0 : null;
            const isActive = activeContentType === ct;
            return (
              <Link key={ct} href={href}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  // Toggle: clicking the active type clears the filter
                  setActiveContentType(prev => prev === ct ? undefined : ct);
                  window.history.pushState({}, "", isActive ? "/discover" : href);
                  // Scroll to the results section
                  setTimeout(() => document.getElementById("section-new-releases")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                }}
              >
                <div
                  className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] hover:opacity-90"
                  style={{
                    background: isActive ? `${color}18` : "var(--ln-coal)",
                    border: `1px solid ${isActive ? color : color + "33"}`,
                    boxShadow: isActive ? `0 0 14px ${color}22` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={18} style={{ color }} />
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>{widLabel}</span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: isActive ? color : "#FFFFFF", fontFamily: "'Cinzel', serif" }}>{label}</p>
                  {count !== null && (
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--ln-iron)" }}>{count.toLocaleString()} witnessed</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="container py-10 space-y-12">
        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ln-iron)" }} />
          <Input
            placeholder="Search songs, artists, genres..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", color: "var(--ln-parchment)" }}
          />
        </div>

        {/* ── Witnessed Voices (Music) ── */}
        <WorkCarousel type="audio" title="Witnessed Voices" viewAllHref="/explore" />

        {/* ── Witnessed Manuscripts ── */}
        <WorkCarousel type="manuscript" title="Witnessed Manuscripts" viewAllHref="/explore?type=manuscript" />

        {/* ── Witnessed Lyrics ── */}
        <WorkCarousel type="lyrics" title="Witnessed Lyrics" viewAllHref="/explore?type=lyrics" />

        {/* ── Witnessed Comics ── */}
        <WorkCarousel type="comic" title="Witnessed Comics" viewAllHref="/explore?type=comic" />

        {/* Genre Filter — extended with non-music categories */}
        <div id="section-genres">
          <h2 className="text-sm font-mono tracking-widest uppercase mb-4" style={{ color: "var(--ln-parchment)" }}>Browse by Genre</h2>

          {/* Music genres */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Music size={11} style={{ color: "var(--ln-gold)" }} />
              <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.5)" }}>WID-MUS</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveGenre(undefined)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{ background: !activeGenre ? "var(--ln-gold)" : "var(--ln-coal)", color: !activeGenre ? "var(--ln-coal)" : "#E2E8F0", border: `1px solid ${!activeGenre ? "var(--ln-gold)" : "rgba(196,154,40,0.2)"}` }}
              >
                All Music
              </button>
              {MUSIC_GENRES.map(genre => (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(genre === activeGenre ? undefined : genre)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{ background: activeGenre === genre ? "var(--ln-gold)" : "var(--ln-coal)", color: activeGenre === genre ? "var(--ln-coal)" : "#E2E8F0", border: `1px solid ${activeGenre === genre ? "var(--ln-gold)" : "rgba(196,154,40,0.2)"}` }}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Manuscript categories */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={11} style={{ color: "var(--ln-seal-bright)" }} />
              <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: "rgba(74,222,128,0.7)" }}>WID-MAN</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MANUSCRIPT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toast.info(`Filtering by ${cat} coming soon`)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{ background: "var(--ln-coal)", color: "#E2E8F0", border: "1px solid rgba(74,222,128,0.28)" }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Lyrics categories */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={11} style={{ color: "var(--ln-gold)" }} />
              <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.6)" }}>WID-LYR</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LYRICS_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toast.info(`Filtering by ${cat} coming soon`)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{ background: "var(--ln-coal)", color: "#E2E8F0", border: "1px solid rgba(196,154,40,0.26)" }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Songs Grid */}
        <div id="section-new-releases">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              {activeGenre
                ? `${activeGenre} ${activeContentType === "manuscript" ? "Manuscripts" : activeContentType === "comic" ? "Comics" : activeContentType === "lyrics" ? "Lyrics" : "Tracks"}`
                : activeContentType === "manuscript" ? "Witnessed Manuscripts"
                : activeContentType === "comic" ? "Witnessed Comics"
                : activeContentType === "lyrics" ? "Witnessed Lyrics"
                : "Latest Releases"}
            </h2>
            <Link href="/explore" className="flex items-center gap-1 text-sm" style={{ color: "var(--ln-gold)" }}>
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {songsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl animate-pulse" style={{ background: "var(--ln-coal)", height: 220 }} />
              ))}
            </div>
          ) : !songs?.length ? (
            <div className="text-center py-16" style={{ color: "var(--ln-smoke)" }}>
              <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No songs yet. Be the first to upload.</p>
              <Link href="/upload"><Button className="mt-4" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>Upload Now</Button></Link>
            </div>
          ) : (
            <div className="museum-grid">
              {songs.map((item: any) => {
                const isActive = currentTrackId === String(item.song.id);
                return (
                <div
                  key={item.song.id}
                  onClick={() => handlePlay(item)}
                  onContextMenu={(e) => openMenu(e, item)}
                  className={`group museum-card parchment-grain cursor-pointer ${
                    isActive ? "museum-card--active" : ""
                  }`}
                  style={isActive ? undefined : { borderColor: "rgba(196,154,40,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(196,154,40,0.15)" }}
                >
                  <div className="prov-card-img-wrap">
                    <MediaAsset
                      src={item.song.coverArtUrl}
                      alt={item.song.title}
                      mode="card"
                      aspectRatio={(item.song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "4:5"}
                      focalX={item.song.coverPositionX ?? 50}
                      focalY={item.song.coverPositionY ?? 50}
                    />
                    {/* Dark overlay on hover */}
                    <div className={`absolute inset-0 transition-opacity duration-200 bg-black/50 ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`} />
                    {/* Play button / animated waveform */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isActive && playerState.isPlaying ? (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--ln-gold)" }}>
                          <div className="flex items-end gap-[2px] h-5">
                            {[1,2,3,4].map(i => (
                              <div key={i} className="w-[3px] rounded-full" style={{
                                background: "var(--ln-coal)",
                                height: "40%",
                                animation: `waveBar 0.7s ease-in-out ${i * 0.12}s infinite alternate`
                              }} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`} style={{ background: "var(--ln-gold)" }}>
                          <Play className="w-5 h-5 fill-current" style={{ color: "var(--ln-coal)" }} />
                        </div>
                      )}
                    </div>
                    {item.song.witnessId && (
                      <Link
                        href={`/verify/${item.song.witnessId}`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="absolute top-2 right-2"
                      >
                        <Badge className="text-xs font-mono px-1 py-0 wid-glow cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "rgba(196,154,40,0.12)", color: "var(--ln-gold)", fontSize: "9px", border: "1px solid rgba(196,154,40,0.5)" }}>WID</Badge>
                      </Link>
                    )}
                    {item.creator?.aiDisclosure && (
                      <div className="absolute top-2 left-2">
                        <AiDisclosurePill value={item.creator.aiDisclosure as any} size="compact" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <Link href={`/song/${item.song.id}`} className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                        <p className="font-semibold text-sm truncate hover:underline" style={{ color: "#FFFFFF", fontFamily: "'Cinzel', serif" }}>{item.song.title}</p>
                      </Link>
                      <button
                        onClick={(e) => openMenu(e, item)}
                        className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.08]"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                    <Link href={`/creator/${item.creator?.id}`}>
                      <p className="text-xs truncate mt-0.5 hover:underline" style={{ color: "#E2E8F0" }}>{item.creator?.artistHandle || item.creator?.name || "Unknown"}</p>
                    </Link>
                    {item.song.genre && <span className="genre-pill mt-1 inline-block">{item.song.genre}</span>}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Track context menu */}
        {menuSong && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div
              className="fixed z-50 min-w-[190px] rounded-xl overflow-hidden shadow-2xl py-1"
              style={{ top: menuPos.y, left: menuPos.x, background: "var(--ln-coal)", border: "1px solid #C3AB7D" }}
            >
              {menuSong.song.fileUrl && (
                <button type="button" onClick={handlePlayNextFromMenu} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
                  <Play className="w-4 h-4 opacity-60" /> Play Next
                </button>
              )}
              <button type="button" onClick={e => { setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setShowAddToList(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
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
              <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/song/${menuSong.song.id}`); toast.success("Link copied!"); closeMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
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

        {/* ── Discover Works (manuscripts + comics) ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Discover Works</h2>
          </div>
          <div className="space-y-6">
            <WorkCarousel type="manuscript" title="Manuscripts" viewAllHref="/explore?type=manuscript" />
            <WorkCarousel type="comic" title="Comics" viewAllHref="/explore?type=comic" />
          </div>
        </div>

        {/* Creators Gallery — horizontal scroll with snap */}
        <div>
          <div id="section-featured" className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Featured Creators</h2>
          </div>
          {creatorsLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 rounded-xl animate-pulse" style={{ width: 120, height: 160, background: "var(--ln-coal)" }} />
              ))}
            </div>
          ) : !creators?.length ? (
            <div className="text-center py-10" style={{ color: "var(--ln-smoke)" }}>
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No creators yet. Sign in and upload to join the roster.</p>
            </div>
          ) : (
            <div
              className="museum-pan-row"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {creators.filter((c: any) => c.name && c.name.trim().length > 0).slice(0, 24).map((creator: any) => {
                const displayName = creator.artistHandle || creator.name || "Creator";
                const initial = displayName.charAt(0).toUpperCase();
                // Deterministic gradient color per creator based on id
                const hues = [30, 200, 280, 120, 340, 60];
                const hue = hues[creator.id % hues.length];
                return (
                  <Link key={creator.id} href={`/creator/${creator.id}`} className="flex-shrink-0 snap-start">
                    <div className="rounded-xl p-4 text-center transition-all hover:scale-[1.03] cursor-pointer" style={{ width: 120, background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden flex items-center justify-center" style={{ background: creator.profilePhotoUrl ? undefined : `#1C1A14`, border: "2px solid rgba(196,154,40,0.3)" }}>
                        {creator.profilePhotoUrl ? (
                          <img src={creator.profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" style={{ objectPosition: (creator as any).avatarObjectPosition ?? "50% 50%" }} />
                        ) : (
                          <span className="text-2xl font-bold" style={{ color: `#1C1A14`, fontFamily: "'Cinzel', serif" }}>{initial}</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold truncate" style={{ color: "#FFFFFF", fontFamily: "'Cinzel', serif" }}>{displayName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>{(creator as any).publishedCount ?? 0} track{((creator as any).publishedCount ?? 0) !== 1 ? "s" : ""}</p>
                      {creator.licenseStatus === "licensed" && (
                        <Badge className="mt-1" style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)", fontSize: "9px" }}>Licensed</Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform Info */}
        <div className="grid md:grid-cols-3 gap-6 py-8 border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }}>
          {[
            { icon: Shield, title: "Witness ID Provenance", desc: "Every upload generates a cryptographic Witness ID — your sovereign proof of creation, signed and timestamped." },
            { icon: Music, title: "Creator-Owned", desc: "You own your music. Platform takes 10% on tips only. No royalty splits, no hidden fees on your catalog." },
            { icon: Users, title: "Gift Directly", desc: "Fans gift creators directly via Stripe Connect. Funds route to your bank account with full identity verification." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl p-6" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
              <Icon className="w-6 h-6 mb-3" style={{ color: "var(--ln-gold)" }} />
              <h3 className="font-semibold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>{title}</h3>
              <p className="text-sm" style={{ color: "#E2E8F0" }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="py-8 border-t text-center" style={{ borderColor: "rgba(196,154,40,0.12)" }}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-4">
            <Link href="/contributors" className="flex items-center gap-2 text-sm transition-all hover:opacity-100 opacity-60 hover:opacity-100" style={{ color: "var(--ln-gold)" }}>
              <Star size={14} />
              Founding Creators
            </Link>
            <Link href="/explore" className="text-sm opacity-50 hover:opacity-80 transition-all" style={{ color: "#E2E8F0" }}>
              Explore All Tracks
            </Link>
            <Link href="/upload" className="text-sm opacity-50 hover:opacity-80 transition-all" style={{ color: "#E2E8F0" }}>
              Upload Your Music
            </Link>
          </div>
          <p className="text-xs" style={{ color: "var(--ln-iron)" }}>
            Living Nexus — Sovereign music. Cryptographic provenance. Creator-owned. · Genesis Day March 20, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
