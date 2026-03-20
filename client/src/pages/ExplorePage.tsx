/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage
   Divine Noir: Full exploration grid with search
   Loads real DB songs via tRPC; uses addAndPlay() for global player
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { Search, Music, Play } from "lucide-react";

const GENRE_CARDS = [
  { label: "All",        icon: null,    color: "#A78BFA" },
  { label: "Ambient",    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-book_038e31c9.png",      color: "#7dd3fc" },
  { label: "Gospel",    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-cross_39407625.png",     color: "#fbbf24" },
  { label: "Jazz",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-lyre_40247746.png",      color: "#c4b5fd" },
  { label: "Electronic",icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-fire-lyre_42893087.png", color: "#f97316" },
  { label: "Hip-Hop",   icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-eye_0e10b572.png",      color: "#fb923c" },
  { label: "Rock",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-guitar_41a22a6e.png",    color: "#f87171" },
  { label: "R&B",       icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-feather_40dcaa6d.png",   color: "#a78bfa" },
];

const DISCOVER_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-discover-4BDchKkmG3vEtUQgZzwK6E.webp";

export default function ExplorePage() {
  const { addAndPlay, playQueueAt, currentTrackId, state: playerState } = usePlayer();
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");

  const { data: songsData, isLoading } = trpc.songs.discover.useQuery(
    { genre: activeGenre === "All" ? undefined : activeGenre, search: query || undefined, limit: 48 },
    { refetchOnWindowFocus: false }
  );
  const playMutation = trpc.songs.play.useMutation();

  const songs = songsData || [];

  const handlePlay = (item: any) => {
    const song = item.song;
    const creator = item.creator;
    if (!song.fileUrl) { toast.error("No audio file available for this track"); return; }
    if (songs.length > 0) {
      const queue = songs
        .filter(s => !!s.song.fileUrl)
        .map(s => ({
          id: String(s.song.id),
          title: s.song.title,
          artist: s.creator?.artistHandle || s.creator?.name || "Unknown",
          genre: s.song.genre || "",
          audioUrl: s.song.fileUrl!,
          artUrl: s.song.coverArtUrl || undefined,
          witnessId: s.song.witnessId || undefined,
          aiDisclosure: s.creator?.aiDisclosure || undefined,
        }));
      const startIdx = queue.findIndex(t => t.id === String(song.id));
      playQueueAt(queue, startIdx >= 0 ? startIdx : 0);
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
      });
    }
    playMutation.mutate({ songId: song.id });
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="relative h-[160px] overflow-hidden">
        <img src={DISCOVER_IMG} alt="Explore" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_280)] via-[oklch(0.08_0.01_280)/50] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <h1 className="font-heading text-2xl text-white/90 tracking-wider">Explore the Cosmos</h1>
          <p className="text-[12px] text-white/40 font-body mt-1">Every sound in the universe, at your fingertips</p>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            placeholder="Search tracks, artists, genres…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13.5px] font-body text-white/80
              bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
              focus:border-[#A78BFA]/50 transition-colors placeholder:text-white/20
              max-w-[480px]"
          />
        </div>

        {/* Genre icon cards */}
        <div className="mb-6">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {GENRE_CARDS.map(g => (
              <button
                key={g.label}
                onClick={() => setActiveGenre(g.label)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border group
                  ${activeGenre === g.label
                    ? "border-[#E8C547]/40 bg-[#E8C547]/[0.07]"
                    : "border-white/[0.06] bg-[oklch(0.14_0.013_280)] hover:border-white/[0.14] hover:bg-white/[0.04]"
                  }`}
              >
                {g.icon ? (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={g.icon}
                      alt={g.label}
                      className={`w-full h-full object-contain transition-all duration-200
                        ${activeGenre === g.label ? "scale-110" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"}`}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(135deg, #E8C547, #7C3AED)" }}>
                    <span className="text-[11px] font-heading font-bold text-black">ALL</span>
                  </div>
                )}
                <span
                  className="text-[10px] font-body truncate w-full text-center transition-colors"
                  style={{ color: activeGenre === g.label ? g.color : "rgba(255,255,255,0.4)" }}
                >
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-body text-white/40">
            {isLoading ? "Loading…" : `${songs.length} ${songs.length === 1 ? "track" : "tracks"} found`}
          </span>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/[0.06] bg-[oklch(0.14_0.013_280)] animate-pulse">
                <div className="aspect-square bg-white/[0.04]" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {songs.map((item: any) => {
              const song = item.song;
              const creator = item.creator;
              const isActive = currentTrackId === String(song.id);
              return (
                <div
                  key={song.id}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200
                    border bg-[oklch(0.14_0.013_280)]
                    ${isActive
                      ? "border-[#E8C547]/40 shadow-[0_0_0_1px_rgba(232,197,71,0.2),0_8px_32px_rgba(0,0,0,0.6)]"
                      : "border-white/[0.06] hover:border-[#A78BFA]/30 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
                    }`}
                  onClick={() => handlePlay(item)}
                >
                  {/* Artwork */}
                  <div className="aspect-square relative overflow-hidden" style={{ background: "oklch(0.15 0.05 275)" }}>
                    {song.coverArtUrl ? (
                      <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-10 h-10 opacity-20" style={{ color: "#E8C547" }} />
                      </div>
                    )}
                    {/* Overlay */}
                    <div className={`absolute inset-0 transition-opacity duration-200
                      bg-gradient-to-b from-transparent via-transparent to-black/70
                      ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    />
                    {/* Play button / Active waveform */}
                    {isActive && playerState.isPlaying ? (
                      <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center z-10 bg-[#E8C547]">
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
                        ${isActive ? "opacity-100 bg-[#E8C547]" : "opacity-0 group-hover:opacity-100 bg-[#A78BFA]"}`}
                      >
                        <Play size={14} fill="currentColor" className="text-black ml-0.5" />
                      </div>
                    )}
                    {/* Witness badge */}
                    {song.witnessId && (
                      <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded
                        bg-black/70 text-[#E8C547] border border-[#E8C547]/30 z-10 font-heading tracking-wider">
                        WID
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <Link href={`/song/${song.id}`} onClick={e => e.stopPropagation()}>
                      <div className="text-[13px] font-heading text-white/90 truncate mb-1 tracking-wide hover:text-[#E8C547] transition-colors">
                        {song.title}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 text-[11px] text-white/35">
                      <Link href={`/creator/${creator?.id}`} onClick={e => e.stopPropagation()}>
                        <span className="truncate hover:text-white/60 transition-colors">
                          {creator?.artistHandle || creator?.name || "Unknown"}
                        </span>
                      </Link>
                      {song.genre && (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="truncate">{song.genre}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-white/25">
                      <span>▶ {song.playCount || 0}</span>
                      {song.tipCount > 0 && <span>💰 {song.tipCount}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && songs.length === 0 && (
          <div className="text-center py-20 text-white/30">
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
