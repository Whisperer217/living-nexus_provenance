import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Search, Music, Users, Shield, ChevronRight, Star, MoreHorizontal } from "lucide-react";
import { MediaAsset } from "@/components/MediaAsset";
import { toast } from "sonner";
import { usePlayer } from "@/contexts/PlayerContext";
import { AddToMyListModal } from "@/components/AddToMyListModal";

const GENRE_ICONS: Record<string, string> = {
  "Gospel": "https://cdn.manus.space/icons/icon-cross.png",
  "Classical": "https://cdn.manus.space/icons/icon-lyre.png",
  "Rock": "https://cdn.manus.space/icons/icon-guitar.png",
  "Hip-Hop": "https://cdn.manus.space/icons/icon-eye.png",
  "Electronic": "https://cdn.manus.space/icons/icon-fire-lyre.png",
  "R&B": "https://cdn.manus.space/icons/icon-feather.png",
  "Ambient": "https://cdn.manus.space/icons/icon-book.png",
};

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | undefined>();
  const { addAndPlay, playQueueAt, playNext, openNowPlayingPanel, currentTrackId, state: playerState } = usePlayer();
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
      creatorId: creator?.id ?? undefined,
      coverPositionX: song.coverPositionX ?? 50,
      coverPositionY: song.coverPositionY ?? 50,
    });
    toast.success(`"${song.title}" plays next`);
    closeMenu();
  };

  const { data: songs, isLoading: songsLoading } = trpc.songs.discover.useQuery(
    { genre: activeGenre, search: search || undefined, limit: 24 },
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
    <div className="min-h-screen" style={{ background: "oklch(0.09 0.04 265)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.095 0.025 260) 0%, oklch(0.11 0.04 295) 50%, oklch(0.095 0.025 255) 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.75 0.18 85 / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.65 0.2 300 / 0.2) 0%, transparent 50%)" }} />
        {/* Radial depth: dark center bleeding to deep purple/blue edge */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 0%, oklch(0.09 0.04 265 / 0.3) 50%, oklch(0.07 0.08 290 / 0.6) 100%)" }} />
        <div className="relative container py-16 md:py-24">
          <div className="max-w-3xl">
            {/* Declaration */}
            <p className="text-xs font-mono tracking-[0.25em] uppercase mb-3" style={{ color: "oklch(0.84 0.155 85 / 0.75)" }}>
              Living Nexus is on fire for Jesus
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)", textShadow: "0 0 40px oklch(0.75 0.18 85 / 0.4)" }}>
              A cryptographic provenance layer<br className="hidden md:block" /> for creative works.
            </h1>
            <p className="text-sm font-mono tracking-[0.2em] uppercase mb-5" style={{ color: "oklch(0.84 0.155 85 / 0.6)" }}>#MainlyMusic</p>
            <p className="text-sm mb-8" style={{ color: "oklch(0.82 0.02 280)" }}>
              Every song on this platform carries a <strong style={{ color: "oklch(0.84 0.155 85)" }}>Witness ID</strong> — a cryptographic proof of creation that belongs to the artist, not the algorithm. Two layers of protection: individual WIDs for every track, and collective WID-ALB certificates for entire albums.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/upload">
                <Button size="lg" className="btn-gold-glow" style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.09 0.04 265)", fontFamily: "'Cinzel', serif", fontWeight: 700 }}>
                  Upload Your Music
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="outline" className="btn-violet-glow" style={{ borderColor: "oklch(0.84 0.155 85 / 0.55)", color: "#FFFFFF" }}>
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
            style={{ background: "oklch(0.115 0.055 278)", borderColor: "oklch(0.84 0.155 85 / 0.35)" }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: "oklch(0.84 0.155 85)" }} className="text-lg">✦</span>
              <div>
                <p className="font-bold text-sm" style={{ color: "oklch(0.84 0.155 85)" }}>Founder's Era — Genesis Day, March 2026</p>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.6 0.03 280)" }}>Keep the light on. Your name lives here forever.</p>
              </div>
            </div>
            <span className="text-xs font-mono tracking-wider hidden sm:block" style={{ color: "oklch(0.84 0.155 85)" }}>SUPPORT →</span>
          </div>
        </Link>
      </div>
      {/* ── Creator / Fan Value Split ───────────────────────────────────────────────── */}
      <div className="container py-10">
        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl">
          {/* For Creators */}
          <div className="rounded-xl border p-5" style={{ background: "oklch(0.115 0.055 278)", borderColor: "oklch(0.84 0.155 85 / 0.2)" }}>
            <p className="text-xs font-mono tracking-[0.2em] uppercase mb-4" style={{ color: "oklch(0.84 0.155 85)" }}>For Creators</p>
            <ul className="space-y-2">
              {["Upload your music. Get your WID.", "Keep 90% of every gift received.", "Own your catalog. Always.", "Batch upload entire albums at once."].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <Shield size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.84 0.155 85 / 0.6)" }} />
                  <span className="text-[13px]" style={{ color: "#E2E8F0" }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* For Fans */}
          <div className="rounded-xl border p-5" style={{ background: "oklch(0.115 0.055 278)", borderColor: "oklch(0.84 0.155 85 / 0.2)" }}>
            <p className="text-xs font-mono tracking-[0.2em] uppercase mb-4" style={{ color: "oklch(0.84 0.155 85)" }}>For Fans</p>
            <ul className="space-y-2">
              {["Discover real music from real people.", "Gift creators directly. 90% reaches them.", "Verify any track's origin with its WID.", "No algorithm. No ads. No noise."].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <Star size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.84 0.155 85 / 0.6)" }} />
                  <span className="text-[13px]" style={{ color: "#E2E8F0" }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="container py-10 space-y-12">
        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.55 0.04 280)" }} />
          <Input
            placeholder="Search songs, artists, genres..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.25 0.02 280)", color: "oklch(0.9 0.01 280)" }}
          />
        </div>

        {/* Genre Filter */}
        <div id="section-genres">
          <h2 className="text-sm font-mono tracking-widest uppercase mb-4" style={{ color: "oklch(0.80 0.04 280)" }}>Browse by Genre</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveGenre(undefined)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{ background: !activeGenre ? "oklch(0.84 0.155 85)" : "oklch(0.115 0.055 278)", color: !activeGenre ? "oklch(0.09 0.04 265)" : "#E2E8F0", border: `1px solid ${!activeGenre ? "oklch(0.84 0.155 85)" : "oklch(0.84 0.155 85 / 0.30)"}` }}
            >
              All
            </button>
            {Object.keys(GENRE_ICONS).map(genre => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre === activeGenre ? undefined : genre)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{ background: activeGenre === genre ? "oklch(0.84 0.155 85)" : "oklch(0.115 0.055 278)", color: activeGenre === genre ? "oklch(0.09 0.04 265)" : "#E2E8F0", border: `1px solid ${activeGenre === genre ? "oklch(0.84 0.155 85)" : "oklch(0.84 0.155 85 / 0.30)"}` }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Songs Grid */}
        <div id="section-new-releases">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
              {activeGenre ? `${activeGenre} Tracks` : "Latest Releases"}
            </h2>
            <Link href="/explore" className="flex items-center gap-1 text-sm" style={{ color: "oklch(0.84 0.155 85)" }}>
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {songsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl animate-pulse" style={{ background: "oklch(0.115 0.055 278)", height: 220 }} />
              ))}
            </div>
          ) : !songs?.length ? (
            <div className="text-center py-16" style={{ color: "oklch(0.5 0.03 280)" }}>
              <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No songs yet. Be the first to upload.</p>
              <Link href="/upload"><Button className="mt-4" style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.09 0.04 265)" }}>Upload Now</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {songs.map((item: any) => {
                const isActive = currentTrackId === String(item.song.id);
                return (
                <div
                  key={item.song.id}
                  onClick={() => handlePlay(item)}
                  onContextMenu={(e) => openMenu(e, item)}
                  className="group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    background: "oklch(0.115 0.055 278)",
                    border: `1px solid ${isActive ? "oklch(0.75 0.18 85 / 0.8)" : "oklch(0.2 0.015 280)"}`,
                    outline: isActive ? "2px solid oklch(0.75 0.18 85 / 0.6)" : "none",
                    outlineOffset: "1px"
                  }}
                >
                  <div className="relative overflow-hidden" style={{ height: "180px" }}>
                    <MediaAsset
                      src={item.song.coverArtUrl}
                      alt={item.song.title}
                      mode="card"
                      aspectRatio={(item.song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "1:1"}
                      focalX={item.song.coverPositionX ?? 50}
                      focalY={item.song.coverPositionY ?? 50}
                      className="absolute inset-0 w-full h-full"
                    />
                    {/* Dark overlay on hover */}
                    <div className={`absolute inset-0 transition-opacity duration-200 bg-black/50 ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`} />
                    {/* Play button / animated waveform */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isActive && playerState.isPlaying ? (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "oklch(0.84 0.155 85)" }}>
                          <div className="flex items-end gap-[2px] h-5">
                            {[1,2,3,4].map(i => (
                              <div key={i} className="w-[3px] rounded-full" style={{
                                background: "oklch(0.09 0.04 265)",
                                height: "40%",
                                animation: `waveBar 0.7s ease-in-out ${i * 0.12}s infinite alternate`
                              }} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`} style={{ background: "oklch(0.84 0.155 85)" }}>
                          <Play className="w-5 h-5 fill-current" style={{ color: "oklch(0.09 0.04 265)" }} />
                        </div>
                      )}
                    </div>
                    {item.song.witnessId && (
                      <div className="absolute top-2 right-2">
                        <Badge className="text-xs font-mono px-1 py-0 wid-glow" style={{ background: "oklch(0.84 0.155 85 / 0.20)", color: "oklch(0.84 0.155 85)", fontSize: "9px", border: "1px solid oklch(0.84 0.155 85 / 0.55)" }}>WID</Badge>
                      </div>
                    )}
                    {item.creator?.aiDisclosure && item.creator.aiDisclosure !== "original" && (
                      <div className="absolute top-2 left-2">
                        <Badge className="text-[8px] font-mono px-1 py-0" style={{
                          background: item.creator.aiDisclosure === "ai_generated" ? "oklch(0.55 0.18 25 / 0.9)" : "oklch(0.60 0.18 55 / 0.9)",
                          color: "white",
                        }}>
                          {item.creator.aiDisclosure === "ai_generated" ? "AI" : "AI+"}
                        </Badge>
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
              style={{ top: menuPos.y, left: menuPos.x, background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}
            >
              {menuSong.song.fileUrl && (
                <button onClick={handlePlayNextFromMenu} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.85 0.02 280)" }}>
                  <Play className="w-4 h-4 opacity-60" /> Play Next
                </button>
              )}
              <button onClick={() => setShowAddToList(true)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.85 0.02 280)" }}>
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
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/song/${menuSong.song.id}`); toast.success("Link copied!"); closeMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.85 0.02 280)" }}>
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

        {/* Creators Gallery */}
        <div>
          <div id="section-featured" className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Featured Creators</h2>
          </div>
          {creatorsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl animate-pulse" style={{ background: "oklch(0.115 0.055 278)", height: 140 }} />
              ))}
            </div>
          ) : !creators?.length ? (
            <div className="text-center py-10" style={{ color: "oklch(0.5 0.03 280)" }}>
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No creators yet. Sign in and upload to join the roster.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {creators.filter((c: any) => c.name && c.name.trim().length > 0).slice(0, 12).map((creator: any) => {
                const displayName = creator.artistHandle || creator.name || "Creator";
                const initial = displayName.charAt(0).toUpperCase();
                // Deterministic gradient color per creator based on id
                const hues = [30, 200, 280, 120, 340, 60];
                const hue = hues[creator.id % hues.length];
                return (
                  <Link key={creator.id} href={`/creator/${creator.id}`}>
                    <div className="rounded-xl p-4 text-center transition-all hover:scale-[1.03] cursor-pointer" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}>
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden flex items-center justify-center" style={{ background: creator.profilePhotoUrl ? undefined : `oklch(0.22 0.08 ${hue})`, border: "2px solid oklch(0.75 0.18 85 / 0.4)" }}>
                        {creator.profilePhotoUrl ? (
                          <img src={creator.profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" style={{ objectPosition: (creator as any).avatarObjectPosition ?? "50% 50%" }} />
                        ) : (
                          <span className="text-2xl font-bold" style={{ color: `oklch(0.85 0.18 ${hue})`, fontFamily: "'Cinzel', serif" }}>{initial}</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold truncate" style={{ color: "#FFFFFF", fontFamily: "'Cinzel', serif" }}>{displayName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>{(creator as any).publishedCount ?? 0} track{((creator as any).publishedCount ?? 0) !== 1 ? "s" : ""}</p>
                      {creator.licenseStatus === "licensed" && (
                        <Badge className="mt-1" style={{ background: "oklch(0.75 0.18 85 / 0.2)", color: "oklch(0.84 0.155 85)", fontSize: "9px" }}>Licensed</Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform Info */}
        <div className="grid md:grid-cols-3 gap-6 py-8 border-t" style={{ borderColor: "oklch(0.2 0.015 280)" }}>
          {[
            { icon: Shield, title: "Witness ID Provenance", desc: "Every upload generates a cryptographic Witness ID — your sovereign proof of creation, signed and timestamped." },
            { icon: Music, title: "Creator-Owned", desc: "You own your music. Platform takes 10% on tips only. No royalty splits, no hidden fees on your catalog." },
            { icon: Users, title: "Gift Directly", desc: "Fans gift creators directly via Stripe Connect. Funds route to your bank account with full identity verification." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl p-6" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}>
              <Icon className="w-6 h-6 mb-3" style={{ color: "oklch(0.84 0.155 85)" }} />
              <h3 className="font-semibold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>{title}</h3>
              <p className="text-sm" style={{ color: "#E2E8F0" }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="py-8 border-t text-center" style={{ borderColor: "oklch(0.2 0.015 280)" }}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-4">
            <Link href="/contributors" className="flex items-center gap-2 text-sm transition-all hover:opacity-100 opacity-60 hover:opacity-100" style={{ color: "#D4AF37" }}>
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
          <p className="text-xs" style={{ color: "oklch(0.4 0.03 280)" }}>
            Living Nexus — Sovereign music. Cryptographic provenance. Creator-owned. · Genesis Day March 20, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
