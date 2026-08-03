/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — SharedPlaylistPage  (/p/:slug)
   Public playlist view — shareable, no auth required.
   Cathedral aesthetic: dark, luminous, cinematic.
═══════════════════════════════════════════════════════════════════ */
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { Play, Music, Shield, ExternalLink, Clock, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Track = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  audioUrl: string;
  artUrl?: string;
  witnessId?: string;
  creatorHandle?: string;
  creatorId?: number;
  coverPositionX: number;
  coverPositionY: number;
  visualReady: boolean;
  autoVideoUrl?: string;
};

export default function SharedPlaylistPage() {
  const { slug } = useParams<{ slug: string }>();
  const { playQueueAt } = usePlayer();

  const { data, isLoading, error } = trpc.playlists.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug, retry: false }
  );

  function buildTracks(): Track[] {
    if (!data?.tracks) return [];
    return data.tracks
      .filter((t: any) => t.song?.fileUrl)
      .map((t: any) => ({
        id: String(t.song.id),
        title: t.song.title,
        artist: t.creator?.artistHandle || t.creator?.name || "Unknown",
        genre: t.song.genre || "",
        audioUrl: t.song.fileUrl!,
        artUrl: t.song.coverArtUrl || undefined,
        witnessId: t.song.witnessId || undefined,
        creatorHandle: t.creator?.id ? String(t.creator.id) : undefined,
        creatorId: t.creator?.id ?? undefined,
        coverPositionX: t.song.coverPositionX ?? 50,
        coverPositionY: t.song.coverPositionY ?? 50,
        visualReady: t.song.visualReady ?? false,
        autoVideoUrl: t.song.autoVideoUrl ?? undefined,
      }));
  }

  function handlePlayAll() {
    const tracks = buildTracks();
    if (tracks.length === 0) { toast.info("No playable tracks in this playlist"); return; }
    playQueueAt(tracks, 0, "PLAYLIST");
  }

  function handlePlayTrack(songId: number) {
    const tracks = buildTracks();
    const idx = tracks.findIndex(t => t.id === String(songId));
    if (idx < 0 || !tracks[idx]) { toast.info("Track not playable"); return; }
    playQueueAt(tracks, idx, "PLAYLIST");
  }

  function formatDuration(seconds?: number | null) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--gold)]/30 border-t-[var(--gold)] animate-spin mx-auto" />
          <p className="text-white/40 text-sm font-mono tracking-widest uppercase">Loading Playlist</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <ListMusic size={48} className="text-white/20 mx-auto" />
          <h1 className="text-2xl font-heading text-white">Playlist Not Found</h1>
          <p className="text-white/50 text-sm">This playlist may have been made private or the link is no longer valid.</p>
          <Link href="/">
            <Button variant="outline" className="border-white/20 text-white/70 hover:text-white">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { playlist, tracks, owner } = data;
  const playableTracks = tracks.filter((t: any) => t.song?.fileUrl);
  const totalDuration = tracks.reduce((acc: number, t: any) => acc + (t.song?.durationSeconds || 0), 0);

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/8 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-10">
          {/* LN Badge */}
          <div className="flex items-center gap-2 mb-8">
            <Link href="/">
              <span className="text-[var(--gold)] font-mono text-xs tracking-[0.3em] uppercase opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                Living Nexus
              </span>
            </Link>
            <span className="text-white/20">·</span>
            <span className="text-white/40 text-xs font-mono">Shared Playlist</span>
          </div>

          {/* Playlist header */}
          <div className="flex gap-6 items-start">
            {/* Cover art */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden bg-[var(--void-3)] border border-white/8 flex-shrink-0">
              {playlist.coverArtUrl ? (
                <img src={playlist.coverArtUrl} alt={playlist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ListMusic size={40} className="text-white/20" />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-[var(--gold)] uppercase tracking-widest mb-2">Playlist</p>
              <h1 className="text-3xl sm:text-4xl font-heading text-white leading-tight mb-2">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-white/50 text-sm mb-3 line-clamp-2">{playlist.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-white/40 font-mono mb-4">
                {owner && (
                  <Link href={`/creator/${owner.id}`}>
                    <span className="hover:text-white/70 transition-colors cursor-pointer">
                      {owner.artistHandle || owner.name}
                    </span>
                  </Link>
                )}
                <span>{tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
                {totalDuration > 0 && <span>{formatDuration(totalDuration)}</span>}
              </div>
              {playableTracks.length > 0 && (
                <Button
                  onClick={handlePlayAll}
                  className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black font-semibold px-6 gap-2"
                >
                  <Play size={16} fill="currentColor" />
                  Play All
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        {tracks.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Music size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">This playlist has no tracks yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/8">
            {tracks.map((t: any, i: number) => {
              const song = t.song;
              const creator = t.creator;
              if (!song) return null;
              const hasAudio = !!song.fileUrl;

              return (
                <div
                  key={t.pt.id}
                  className={`flex items-center gap-3 px-4 py-3 group transition-colors ${hasAudio ? "hover:bg-white/[0.03] cursor-pointer" : "opacity-50"}`}
                  onClick={() => hasAudio && handlePlayTrack(song.id)}
                >
                  {/* Index / play icon */}
                  <div className="w-7 text-center flex-shrink-0">
                    <span className="text-white/30 text-xs font-mono group-hover:hidden">{i + 1}</span>
                    {hasAudio && <Play size={14} className="text-[var(--gold)] hidden group-hover:block mx-auto" fill="currentColor" />}
                  </div>

                  {/* Cover art */}
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-[var(--void-3)] flex-shrink-0">
                    {song.coverArtUrl ? (
                      <img
                        src={song.coverArtUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music size={14} className="text-white/20" />
                      </div>
                    )}
                  </div>

                  {/* Title + artist */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{song.title}</p>
                    <p className="text-white/40 text-xs truncate">
                      {creator?.artistHandle || creator?.name || "Unknown Artist"}
                    </p>
                  </div>

                  {/* WID badge */}
                  {song.witnessId && (
                    <Link href={`/song/${song.id}`} onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--gold)]/10 border border-[var(--gold)]/20 hover:bg-[var(--gold)]/20 transition-colors">
                        <Shield size={10} className="text-[var(--gold)]" />
                        <span className="text-[var(--gold)] text-[10px] font-mono">WID</span>
                      </div>
                    </Link>
                  )}

                  {/* Duration */}
                  {song.durationSeconds && (
                    <div className="flex items-center gap-1 text-white/30 text-xs font-mono flex-shrink-0">
                      <Clock size={10} />
                      {formatDuration(song.durationSeconds)}
                    </div>
                  )}

                  {/* External link */}
                  <Link href={`/song/${song.id}`} onClick={e => e.stopPropagation()}>
                    <ExternalLink size={12} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
          <p className="text-white/20 text-xs font-mono">
            Shared via Living Nexus · Creator Provenance Platform
          </p>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs gap-1">
              <ExternalLink size={10} />
              Open Living Nexus
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
