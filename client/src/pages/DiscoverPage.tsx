import { useState, useRef } from "react";
import React from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Search, Music, Users, Shield, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/contexts/PlayerContext";

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
  const { addAndPlay, currentTrackId, state: playerState } = usePlayer();

  const { data: songs, isLoading: songsLoading } = trpc.songs.discover.useQuery(
    { genre: activeGenre, search: search || undefined, limit: 24 },
    { refetchOnWindowFocus: false }
  );
  const { data: creators, isLoading: creatorsLoading } = trpc.profile.allCreators.useQuery(undefined, { refetchOnWindowFocus: false });
  const playMutation = trpc.songs.play.useMutation();

  const handlePlay = (song: any) => {
    if (!song.song.fileUrl) { toast.error("No audio file available"); return; }
    addAndPlay({
      id: String(song.song.id),
      title: song.song.title,
      artist: song.creator?.artistHandle || song.creator?.name || "Unknown",
      genre: song.song.genre || "",
      audioUrl: song.song.fileUrl,
      artUrl: song.song.coverArtUrl || undefined,
      witnessId: song.song.witnessId || undefined,
    });
    playMutation.mutate({ songId: song.song.id });
  };

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.08 0.015 280)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.10 0.02 280) 0%, oklch(0.12 0.04 300) 50%, oklch(0.10 0.02 260) 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.75 0.18 85 / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.65 0.2 300 / 0.2) 0%, transparent 50%)" }} />
        <div className="relative container py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: "oklch(0.75 0.18 85)" }} />
              <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "oklch(0.75 0.18 85)" }}>Command Domains LLC · BDDT Publishing</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)", textShadow: "0 0 40px oklch(0.75 0.18 85 / 0.4)" }}>
              Living Nexus
            </h1>
            <p className="text-lg md:text-xl mb-2" style={{ color: "oklch(0.75 0.06 280)" }}>
              Sovereign music. Cryptographic provenance. Creator-owned.
            </p>
            <p className="text-sm mb-8" style={{ color: "oklch(0.55 0.04 280)" }}>
              Every song on this platform carries a Witness ID — a cryptographic proof of creation that belongs to the artist, not the algorithm.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/upload">
                <Button size="lg" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                  Upload Your Music
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="outline" style={{ borderColor: "oklch(0.75 0.18 85 / 0.4)", color: "oklch(0.85 0.06 280)" }}>
                  Explore All Tracks
                </Button>
              </Link>
            </div>
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
            style={{ background: "oklch(0.12 0.015 280)", border: "1px solid oklch(0.25 0.02 280)", color: "oklch(0.9 0.01 280)" }}
          />
        </div>

        {/* Genre Filter */}
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase mb-4" style={{ color: "oklch(0.55 0.04 280)" }}>Browse by Genre</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveGenre(undefined)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{ background: !activeGenre ? "oklch(0.75 0.18 85)" : "oklch(0.14 0.015 280)", color: !activeGenre ? "oklch(0.08 0.015 280)" : "oklch(0.7 0.04 280)", border: "1px solid oklch(0.25 0.02 280)" }}
            >
              All
            </button>
            {Object.keys(GENRE_ICONS).map(genre => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre === activeGenre ? undefined : genre)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{ background: activeGenre === genre ? "oklch(0.75 0.18 85)" : "oklch(0.14 0.015 280)", color: activeGenre === genre ? "oklch(0.08 0.015 280)" : "oklch(0.7 0.04 280)", border: `1px solid ${activeGenre === genre ? "oklch(0.75 0.18 85)" : "oklch(0.25 0.02 280)"}` }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Songs Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
              {activeGenre ? `${activeGenre} Tracks` : "Latest Releases"}
            </h2>
            <Link href="/explore" className="flex items-center gap-1 text-sm" style={{ color: "oklch(0.75 0.18 85)" }}>
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {songsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl animate-pulse" style={{ background: "oklch(0.12 0.015 280)", height: 220 }} />
              ))}
            </div>
          ) : !songs?.length ? (
            <div className="text-center py-16" style={{ color: "oklch(0.5 0.03 280)" }}>
              <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No songs yet. Be the first to upload.</p>
              <Link href="/upload"><Button className="mt-4" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>Upload Now</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {songs.map((item) => {
                const isActive = currentTrackId === String(item.song.id);
                return (
                <div
                  key={item.song.id}
                  onClick={() => handlePlay(item)}
                  className="group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    background: "oklch(0.12 0.015 280)",
                    border: `1px solid ${isActive ? "oklch(0.75 0.18 85 / 0.8)" : "oklch(0.2 0.015 280)"}`,
                    outline: isActive ? "2px solid oklch(0.75 0.18 85 / 0.6)" : "none",
                    outlineOffset: "1px"
                  }}
                >
                  <div className="relative aspect-square" style={{ background: item.song.coverArtUrl ? undefined : "linear-gradient(135deg, oklch(0.15 0.03 280), oklch(0.20 0.05 300))" }}>
                    {item.song.coverArtUrl ? (
                      <img src={item.song.coverArtUrl} alt={item.song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-10 h-10 opacity-30" style={{ color: "oklch(0.75 0.18 85)" }} />
                      </div>
                    )}
                    {/* Dark overlay on hover */}
                    <div className={`absolute inset-0 transition-opacity duration-200 bg-black/50 ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`} />
                    {/* Play button / animated waveform */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isActive && playerState.isPlaying ? (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "oklch(0.75 0.18 85)" }}>
                          <div className="flex items-end gap-[2px] h-5">
                            {[1,2,3,4].map(i => (
                              <div key={i} className="w-[3px] rounded-full" style={{
                                background: "oklch(0.08 0.015 280)",
                                height: "40%",
                                animation: `waveBar 0.7s ease-in-out ${i * 0.12}s infinite alternate`
                              }} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`} style={{ background: "oklch(0.75 0.18 85)" }}>
                          <Play className="w-5 h-5 fill-current" style={{ color: "oklch(0.08 0.015 280)" }} />
                        </div>
                      )}
                    </div>
                    {item.song.witnessId && (
                      <div className="absolute top-2 right-2">
                        <Badge className="text-xs font-mono px-1 py-0" style={{ background: "oklch(0.65 0.2 300 / 0.9)", color: "white", fontSize: "9px" }}>WID</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <Link href={`/song/${item.song.id}`}>
                      <p className="font-semibold text-sm truncate hover:underline" style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>{item.song.title}</p>
                    </Link>
                    <Link href={`/creator/${item.creator?.id}`}>
                      <p className="text-xs truncate mt-0.5 hover:underline" style={{ color: "oklch(0.6 0.04 280)" }}>{item.creator?.artistHandle || item.creator?.name || "Unknown"}</p>
                    </Link>
                    {item.song.genre && <Badge variant="outline" className="mt-1 text-xs" style={{ borderColor: "oklch(0.3 0.02 280)", color: "oklch(0.6 0.04 280)" }}>{item.song.genre}</Badge>}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Creators Gallery */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Featured Creators</h2>
          </div>
          {creatorsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl animate-pulse" style={{ background: "oklch(0.12 0.015 280)", height: 140 }} />
              ))}
            </div>
          ) : !creators?.length ? (
            <div className="text-center py-10" style={{ color: "oklch(0.5 0.03 280)" }}>
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No creators yet. Sign in and upload to join the roster.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {creators.slice(0, 12).map((creator) => (
                <Link key={creator.id} href={`/creator/${creator.id}`}>
                  <div className="rounded-xl p-4 text-center transition-all hover:scale-[1.03] cursor-pointer" style={{ background: "oklch(0.12 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
                    <div className="w-14 h-14 rounded-full mx-auto mb-2 overflow-hidden flex items-center justify-center" style={{ background: "oklch(0.18 0.025 280)", border: "2px solid oklch(0.75 0.18 85 / 0.3)" }}>
                      {creator.profilePhotoUrl ? (
                        <img src={creator.profilePhotoUrl} alt={creator.name || ""} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold" style={{ color: "oklch(0.75 0.18 85)", fontFamily: "'Cinzel', serif" }}>{(creator.artistHandle || creator.name || "?")[0].toUpperCase()}</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold truncate" style={{ color: "oklch(0.85 0.02 85)", fontFamily: "'Cinzel', serif" }}>{creator.artistHandle || creator.name || "Creator"}</p>
                    {creator.licenseStatus === "licensed" && (
                      <Badge className="mt-1 text-xs" style={{ background: "oklch(0.75 0.18 85 / 0.2)", color: "oklch(0.75 0.18 85)", fontSize: "9px" }}>Licensed</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Platform Info */}
        <div className="grid md:grid-cols-3 gap-6 py-8 border-t" style={{ borderColor: "oklch(0.2 0.015 280)" }}>
          {[
            { icon: Shield, title: "Witness ID Provenance", desc: "Every upload generates a cryptographic Witness ID — your sovereign proof of creation, signed and timestamped." },
            { icon: Music, title: "Creator-Owned", desc: "You own your music. Platform takes 10% on tips only. No royalty splits, no hidden fees on your catalog." },
            { icon: Users, title: "Tip Directly", desc: "Fans tip creators directly via Stripe Connect. Funds route to your bank account with full identity verification." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl p-6" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
              <Icon className="w-6 h-6 mb-3" style={{ color: "oklch(0.75 0.18 85)" }} />
              <h3 className="font-semibold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>{title}</h3>
              <p className="text-sm" style={{ color: "oklch(0.6 0.04 280)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
