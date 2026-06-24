import { Link } from "wouter";
import { Heart, Music, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { safeAudioUrl } from "@shared/const";

export default function LikedPage() {
  const { user, loading } = useAuth();
  const { playQueueAt, openNowPlayingPanel } = usePlayer();

  const { data: likedTracks, isLoading } = trpc.songs.getLiked.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--ln-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Heart className="w-10 h-10 opacity-30" style={{ color: "var(--ln-gold)" }} />
        <p className="text-base font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Liked Tracks</p>
        <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>Sign in to see the tracks you've saved</p>
        <a href={getLoginUrl("/liked")} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>Sign In</a>
      </div>
    );
  }

  // Build a Track array from liked songs for queue playback
  const buildTracks = (): Track[] =>
    (likedTracks ?? [])
      .filter((item: any) => !!item.song?.fileUrl)
      .map((item: any) => ({
        id: String(item.song.id),
        title: item.song.title,
        artist: item.creator?.artistHandle || item.creator?.name || "Unknown Artist",
        genre: item.song.genre || "",
        audioUrl: safeAudioUrl(item.song.fileUrl),
        artUrl: item.song.coverArtUrl || undefined,
        artType: "image" as const,
        witnessId: item.song.witnessId || undefined,
        aiDisclosure: item.creator?.aiDisclosure || undefined,
        creatorId: item.creator?.id ?? undefined,
        coverPositionX: item.song.coverPositionX ?? 50,
        coverPositionY: item.song.coverPositionY ?? 50,
        visualReady: item.song.visualReady ?? false,
        autoVideoUrl: item.song.autoVideoUrl ?? undefined,
        creatorRole: item.creator?.role ?? undefined,
      }));

  const handlePlay = (idx: number) => {
    const tracks = buildTracks();
    if (tracks.length === 0) return;
    const clampedIdx = Math.max(0, Math.min(idx, tracks.length - 1));
    playQueueAt(tracks, clampedIdx, "LIKED");
    openNowPlayingPanel();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)" }}>
          <Heart className="w-5 h-5" style={{ color: "var(--ln-gold)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Liked Tracks
          </h1>
          <p className="text-sm" style={{ color: "#E2E8F0" }}>
            Music you've saved from other creators
          </p>
        </div>
        {likedTracks && likedTracks.length > 0 && (
          <Badge className="ml-auto"
            style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}>
            {likedTracks.length} {likedTracks.length === 1 ? "track" : "tracks"}
          </Badge>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse"
              style={{ background: "var(--ln-coal)" }} />
          ))}
        </div>
      ) : !likedTracks || likedTracks.length === 0 ? (
        <div className="rounded-2xl p-16 text-center"
          style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
          <Heart className="w-14 h-14 mx-auto mb-4 opacity-20" style={{ color: "var(--ln-gold)" }} />
          <p className="text-base font-semibold mb-2"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            No liked tracks yet
          </p>
          <p className="text-sm mb-6" style={{ color: "#E2E8F0" }}>
            When you tap the heart on a track, it will appear here.
          </p>
          <Link href="/explore">
            <Button size="sm"
              style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
              Explore Tracks
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
          <div className="divide-y" style={{ borderColor: "var(--ln-coal)" }}>
            {likedTracks.map((item: any, idx: number) => {
              const song = item.song;
              const creator = item.creator;
              const likedAt = item.likedAt ? new Date(item.likedAt) : null;
              const playIdx = buildTracks().findIndex(t => t.id === String(song.id));

              return (
                <div key={song.id}
                  className="flex items-center gap-4 px-5 py-4 transition-colors group"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(44,52,56,0.5)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>

                  {/* Index */}
                  <span className="w-6 text-center text-sm font-mono shrink-0"
                    style={{ color: "var(--ln-smoke)" }}>
                    {idx + 1}
                  </span>

                  {/* Cover Art */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0"
                    style={{ background: "var(--ln-coal)" }}>
                    {song.coverArtUrl ? (
                      <img src={song.coverArtUrl} alt={song.title}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 opacity-30"
                          style={{ color: "var(--ln-gold)" }} />
                      </div>
                    )}
                  </div>

                  {/* Title + Creator */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm"
                      style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>
                      {song.title}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "#E2E8F0" }}>
                      {creator?.artistHandle || creator?.name || "Unknown Artist"}
                    </p>
                  </div>

                  {/* Genre */}
                  {song.genre && (
                    <Badge className="hidden sm:inline-flex shrink-0 text-xs"
                      style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}>
                      {song.genre}
                    </Badge>
                  )}

                  {/* Liked date */}
                  {likedAt && (
                    <span className="hidden md:block text-xs shrink-0"
                      style={{ color: "var(--ln-smoke)" }}>
                      {likedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {song.fileUrl && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handlePlay(playIdx >= 0 ? playIdx : 0)}
                        title="Play"
                        style={{ color: "var(--ln-gold)" }}>
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    <Link href={`/song/${song.id}`}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View track"
                        style={{ color: "#E2E8F0" }}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
