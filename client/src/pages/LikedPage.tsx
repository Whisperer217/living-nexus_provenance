/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Archive (Library) Page
   Suno-inspired tabbed library: Songs, Playlists, History
   Divine Noir aesthetic — Orbitron/Cinzel, gold/cyan palette
═══════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Music, Search, Play, Download, Share2, Trash2,
  Clock, Heart, Library, ListMusic, History,
  SlidersHorizontal, ArrowUpDown, Eye, EyeOff,
  Filter, ChevronRight, Headphones,
} from "lucide-react";
import { getLoginUrl } from "@/const";

const TABS = [
  { id: "songs", label: "Songs", icon: Music },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "history", label: "History", icon: History },
] as const;

type TabId = typeof TABS[number]["id"];
type SortKey = "newest" | "oldest" | "title" | "plays";

function SongRow({ song, onPlay, onDelete, isOwner }: { song: any; onPlay: () => void; onDelete?: () => void; isOwner?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const downloadMutation = trpc.songs.download.useMutation({
    onSuccess: (d: { url: string }) => { if (d.url) window.open(d.url, "_blank"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.04] relative"
      style={{ borderBottom: "1px solid oklch(0.15 0.01 280)" }}>
      {/* Cover */}
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer"
        style={{ background: "oklch(0.11 0.025 270)" }} onClick={onPlay}>
        {song.coverArtUrl
          ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
          : <Music className="w-5 h-5 opacity-30" style={{ color: "oklch(0.75 0.18 85)" }} />}
      </div>

      {/* Play overlay */}
      <button onClick={onPlay}
        className="absolute left-3 w-12 h-12 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "oklch(0 0 0 / 0.55)" }}>
        <Play className="w-4 h-4 ml-0.5" style={{ color: "oklch(0.95 0.01 85)" }} />
      </button>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <Link href={`/song/${song.id}`}>
          <p className="text-sm font-medium truncate cursor-pointer hover:underline"
            style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>
            {song.title}
          </p>
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {song.genre && <span className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>{song.genre}</span>}
          {song.bpm && <span className="text-xs" style={{ color: "oklch(0.4 0.03 280)" }}>{song.bpm} BPM</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 text-xs mr-2" style={{ color: "oklch(0.45 0.03 280)" }}>
        <span className="flex items-center gap-1"><Headphones className="w-3 h-3" />{song.playCount || 0}</span>
        {song.isPublic !== undefined && (
          <span className="flex items-center gap-1">
            {song.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {song.isPublic ? "Public" : "Private"}
          </span>
        )}
      </div>

      {/* Duration */}
      {song.durationSeconds && (
        <span className="text-xs hidden md:block" style={{ color: "oklch(0.45 0.03 280)" }}>
          {Math.floor(song.durationSeconds / 60)}:{String(song.durationSeconds % 60).padStart(2, "0")}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => downloadMutation.mutate({ songId: song.id })}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
          <Download className="w-3.5 h-3.5" style={{ color: "oklch(0.6 0.04 280)" }} />
        </button>
        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/song/${song.id}`); toast.success("Link copied!"); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
          <Share2 className="w-3.5 h-3.5" style={{ color: "oklch(0.6 0.04 280)" }} />
        </button>
        {isOwner && onDelete && (
          <button onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" style={{ color: "oklch(0.6 0.18 25)" }} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function LikedPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("songs");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [genreFilter, setGenreFilter] = useState<string>("");

  const { data: mySongs, refetch: refetchSongs } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: !!user,
  });

  const deleteMutation = trpc.songs.delete.useMutation({
    onSuccess: () => { refetchSongs(); toast.success("Song deleted"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const allGenres = useMemo(() => {
    if (!mySongs) return [];
    const genres = new Set(mySongs.map((s: any) => s.genre).filter(Boolean));
    return Array.from(genres) as string[];
  }, [mySongs]);

  const filteredSongs = useMemo(() => {
    if (!mySongs) return [];
    let songs = [...mySongs];
    if (search.trim()) {
      const q = search.toLowerCase();
      songs = songs.filter((s: any) => s.title.toLowerCase().includes(q) || (s.genre || "").toLowerCase().includes(q));
    }
    if (genreFilter) songs = songs.filter((s: any) => s.genre === genreFilter);
    switch (sortKey) {
      case "newest": songs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "oldest": songs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "title": songs.sort((a: any, b: any) => a.title.localeCompare(b.title)); break;
      case "plays": songs.sort((a: any, b: any) => (b.playCount || 0) - (a.playCount || 0)); break;
    }
    return songs;
  }, [mySongs, search, sortKey, genreFilter]);

  const handlePlay = (song: any) => {
    window.location.href = `/song/${song.id}`;
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.09 0.04 265)" }}>
      <div className="text-center space-y-4">
        <Library className="w-16 h-16 mx-auto opacity-20" style={{ color: "oklch(0.75 0.18 85)" }} />
        <p className="text-lg font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.8 0.02 85)" }}>Your Archive</p>
        <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>Sign in to access your music archive.</p>
        <Button onClick={() => window.location.href = getLoginUrl()} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
          Sign In
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-10" style={{ background: "oklch(0.09 0.04 265)" }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.75 0.18 85 / 0.2), oklch(0.65 0.2 300 / 0.2))", border: "1px solid oklch(0.75 0.18 85 / 0.3)" }}>
              <Library className="w-5 h-5" style={{ color: "oklch(0.75 0.18 85)" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>Archive</h1>
              <p className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>
                {mySongs?.length || 0} track{mySongs?.length !== 1 ? "s" : ""} in your collection
              </p>
            </div>
          </div>
          <Link href="/upload">
            <Button size="sm" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
              + Upload
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "oklch(0.10 0.055 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? "oklch(0.75 0.18 85 / 0.15)" : "transparent",
                  color: active ? "oklch(0.85 0.08 85)" : "oklch(0.5 0.03 280)",
                  border: active ? "1px solid oklch(0.75 0.18 85 / 0.3)" : "1px solid transparent",
                }}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Songs Tab */}
        {activeTab === "songs" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.45 0.03 280)" }} />
                <Input placeholder="Search your songs..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                  style={{ background: "oklch(0.10 0.055 280)", border: "1px solid oklch(0.2 0.015 280)", color: "oklch(0.85 0.02 280)" }} />
              </div>
              <div className="flex gap-2">
                {/* Sort */}
                <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: "oklch(0.10 0.055 280)", border: "1px solid oklch(0.2 0.015 280)", color: "oklch(0.7 0.04 280)" }}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="title">Title A–Z</option>
                  <option value="plays">Most Played</option>
                </select>
                {/* Genre filter */}
                {allGenres.length > 0 && (
                  <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ background: "oklch(0.10 0.055 280)", border: "1px solid oklch(0.2 0.015 280)", color: "oklch(0.7 0.04 280)" }}>
                    <option value="">All Genres</option>
                    {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Stats bar */}
            {mySongs && mySongs.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Plays", value: mySongs.reduce((acc: number, s: any) => acc + (s.playCount || 0), 0).toLocaleString(), icon: Headphones },
                  { label: "Public Tracks", value: mySongs.filter((s: any) => s.isPublic).length, icon: Eye },
                  { label: "Private Tracks", value: mySongs.filter((s: any) => !s.isPublic).length, icon: EyeOff },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: "oklch(0.10 0.055 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: "oklch(0.55 0.04 280)" }} />
                      <p className="text-lg font-bold" style={{ fontFamily: "'Orbitron', sans-serif", color: "oklch(0.85 0.08 85)" }}>{stat.value}</p>
                      <p className="text-xs" style={{ color: "oklch(0.45 0.03 280)" }}>{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Song list */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.10 0.055 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
              {filteredSongs.length === 0 ? (
                <div className="text-center py-16">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.75 0.18 85)" }} />
                  <p className="text-sm font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>
                    {search || genreFilter ? "No songs match your filters" : "No songs yet"}
                  </p>
                  {!search && !genreFilter && (
                    <Link href="/upload">
                      <Button size="sm" className="mt-4" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
                        Upload Your First Track
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "oklch(0.15 0.01 280)" }}>
                  {filteredSongs.map((song: any) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      onPlay={() => handlePlay(song)}
                      onDelete={() => {
                        if (confirm(`Delete "${song.title}"? This cannot be undone.`)) {
                          deleteMutation.mutate({ songId: song.id });
                        }
                      }}
                      isOwner
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Playlists Tab */}
        {activeTab === "playlists" && (
          <div className="rounded-2xl p-10 text-center" style={{ background: "oklch(0.10 0.055 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
            <ListMusic className="w-14 h-14 mx-auto mb-4 opacity-20" style={{ color: "oklch(0.65 0.2 300)" }} />
            <p className="text-base font-semibold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.8 0.02 85)" }}>Playlists</p>
            <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>
              Curated playlists and collections are coming soon. You'll be able to organize your tracks, share sets, and discover themed archives.
            </p>
            <Badge className="mt-4" style={{ background: "oklch(0.65 0.2 300 / 0.1)", color: "oklch(0.65 0.2 300)", border: "1px solid oklch(0.65 0.2 300 / 0.3)" }}>
              Coming Soon
            </Badge>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="rounded-2xl p-10 text-center" style={{ background: "oklch(0.10 0.055 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
            <History className="w-14 h-14 mx-auto mb-4 opacity-20" style={{ color: "oklch(0.75 0.18 85)" }} />
            <p className="text-base font-semibold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.8 0.02 85)" }}>Listening History</p>
            <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>
              Your play history will appear here — every track you've listened to, with timestamps and playback counts. This feature is coming soon.
            </p>
            <Badge className="mt-4" style={{ background: "oklch(0.75 0.18 85 / 0.1)", color: "oklch(0.75 0.18 85)", border: "1px solid oklch(0.75 0.18 85 / 0.3)" }}>
              Coming Soon
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
