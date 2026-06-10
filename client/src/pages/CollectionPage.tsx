import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Play, GitFork, Heart, Copy, Check, Music2, Clock, Lock, Globe,
  ChevronLeft, ExternalLink, PlayCircle, Pause,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Track } from "@/contexts/PlayerContext";

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTotalRuntime(seconds: number): string {
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function CollectionPage() {
  const [, params] = useRoute("/collection/:slug");
  const slug = params?.slug ?? "";
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error, refetch } = trpc.collections.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const toggleFollow = trpc.collections.toggleFollow.useMutation({
    onSuccess: (res) => {
      toast.success(res.following ? "Following collection" : "Unfollowed collection");
      refetch();
    },
  });

  const forkMutation = trpc.collections.fork.useMutation({
    onSuccess: (res) => {
      toast.success("Collection forked!");
      navigate(`/collection/${res.slug}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const { playQueueAt, state: playerState, currentTrackId } = usePlayer();

  const handlePlayAll = () => {
    if (!data?.tracks?.length) return;
    type TrackItem = typeof data.tracks[number];
    const tracks: Track[] = data.tracks
      .filter((t: TrackItem) => t.song?.fileUrl)
      .map((t: TrackItem) => ({
        id: String(t.song!.id),
        title: t.song!.title,
        artist: t.creator?.artistHandle ?? t.creator?.name ?? "Unknown",
        genre: t.song!.genre ?? "",
        audioUrl: t.song!.fileUrl ?? undefined,
        artUrl: t.song!.coverArtUrl ?? undefined,
        witnessId: t.song!.witnessId ?? undefined,
        creatorHandle: t.creator?.artistHandle ?? t.creator?.name ?? undefined,
        creatorId: t.creator?.id,
      }));
    if (tracks.length === 0) return;
    playQueueAt(tracks, 0, "PLAYLIST");
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/collection/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading collection…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Music2 className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Collection not found.</p>
        <Button variant="outline" onClick={() => navigate(-1 as any)}>Go back</Button>
      </div>
    );
  }

  const { collection, owner, tracks, following } = data;
  const totalSeconds = tracks.reduce((acc: number, t: typeof tracks[number]) => acc + (t.song?.durationSeconds ?? 0), 0);
  const isOwner = user?.id === collection.ownerId;
  const ownerHandle = owner?.artistHandle ?? owner?.name ?? "Unknown";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Back nav ── */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* ── Hero ── */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          {/* Cover art */}
          <div className="w-full md:w-56 h-56 flex-shrink-0 rounded-xl overflow-hidden bg-card border border-border">
            {collection.coverArtUrl ? (
              <img
                src={collection.coverArtUrl}
                alt={collection.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-amber-600/10">
                <Music2 className="w-16 h-16 text-amber-600/50" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-mono text-amber-500 border-amber-500/40">
                {collection.wid}
              </Badge>
              {collection.isPublic ? (
                <Badge variant="secondary" className="text-xs gap-1"><Globe className="w-3 h-3" /> Public</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs gap-1"><Lock className="w-3 h-3" /> Private</Badge>
              )}
            </div>

            <h1 className="text-3xl font-bold mb-1">{collection.name}</h1>

            {/* Fork lineage */}
            {collection.forkedFromWid && (
              <p className="text-sm text-muted-foreground mb-2">
                Forked from{" "}
                <span className="text-amber-500 font-mono">{collection.forkedFromWid}</span>
                {collection.forkedFromOwnerName && (
                  <> · curated by <span className="font-medium">{collection.forkedFromOwnerName}</span></>
                )}
              </p>
            )}

            {/* Owner */}
            <Link href={`/creator/${owner?.id}`}>
              <div className="flex items-center gap-2 mb-3 group cursor-pointer w-fit">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={owner?.profilePhotoUrl ?? ""} />
                  <AvatarFallback className="text-xs">{ownerHandle[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  @{ownerHandle}
                </span>
              </div>
            </Link>

            {/* Description */}
            {collection.description && (
              <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{collection.description}</p>
            )}

            {/* Purpose */}
            {collection.purpose && (
              <blockquote className="border-l-2 border-amber-500 pl-3 text-sm italic text-muted-foreground mb-3">
                {collection.purpose}
              </blockquote>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
              <span className="flex items-center gap-1"><Music2 className="w-3.5 h-3.5" /> {collection.trackCount} tracks</span>
              {totalSeconds > 0 && (
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatTotalRuntime(totalSeconds)}</span>
              )}
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {collection.followerCount} followers</span>
              <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" /> {collection.forkCount} forks</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handlePlayAll}
                disabled={!tracks.some((t: typeof tracks[number]) => t.song?.fileUrl)}
                className="bg-amber-600 hover:bg-amber-500 text-black font-semibold gap-2"
              >
                <Play className="w-4 h-4" /> Play All
              </Button>

              {user && !isOwner && (
                <Button
                  variant="outline"
                  onClick={() => toggleFollow.mutate({ collectionId: collection.id })}
                  disabled={toggleFollow.isPending}
                  className={following ? "border-amber-500 text-amber-500" : ""}
                >
                  <Heart className={`w-4 h-4 mr-1 ${following ? "fill-amber-500 text-amber-500" : ""}`} />
                  {following ? "Following" : "Follow"}
                </Button>
              )}

              {user && !isOwner && collection.isPublic && (
                <Button
                  variant="outline"
                  onClick={() => forkMutation.mutate({ collectionId: collection.id })}
                  disabled={forkMutation.isPending}
                  className="gap-2"
                >
                  <GitFork className="w-4 h-4" /> Fork Collection
                </Button>
              )}

              <Button variant="outline" onClick={handleCopyLink} className="gap-2">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* ── Track List ── */}
        <div className="space-y-1 pb-24">
          {tracks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Music2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No tracks in this collection yet.</p>
              {isOwner && (
                <p className="text-sm mt-1">Add tracks from any song page using the "Add to Collection" button.</p>
              )}
            </div>
          ) : (
            tracks.map((item: typeof tracks[number], index: number) => {
              const song = item.song;
              const creator = item.creator;
              const isCurrentlyPlaying = currentTrackId === String(song?.id) && playerState.isPlaying;
              if (!song) return null;
              return (
                <div
                  key={item.track.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-card/60 transition-colors group cursor-pointer"
                  onClick={() => {
                    if (song.fileUrl) {
                      const t: Track = {
                        id: String(song.id),
                        title: song.title,
                        artist: creator?.artistHandle ?? creator?.name ?? "Unknown",
                        genre: song.genre ?? "",
                        audioUrl: song.fileUrl ?? undefined,
                        artUrl: song.coverArtUrl ?? undefined,
                        witnessId: song.witnessId ?? undefined,
                        creatorHandle: creator?.artistHandle ?? creator?.name ?? undefined,
                        creatorId: creator?.id,
                      };
                      playQueueAt([t], 0, "PLAYLIST");
                    }
                  }}
                >
                  {/* Index / play icon */}
                  <div className="w-7 text-center flex-shrink-0">
                    {isCurrentlyPlaying ? (
                      <Pause className="w-4 h-4 text-amber-500 mx-auto" />
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground group-hover:hidden">{index + 1}</span>
                        <PlayCircle className="w-4 h-4 text-amber-500 mx-auto hidden group-hover:block" />
                      </>
                    )}
                  </div>

                  {/* Cover art */}
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-card border border-border">
                    {song.coverArtUrl ? (
                      <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-card">
                        <Music2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Title + creator */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrentlyPlaying ? "text-amber-500" : ""}`}>
                      {song.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{creator?.artistHandle ?? creator?.name ?? "Unknown"}
                    </p>
                    {item.track.note && (
                      <p className="text-xs text-muted-foreground/70 italic truncate mt-0.5">"{item.track.note}"</p>
                    )}
                  </div>

                  {/* WID badge */}
                  {song.witnessId && (
                    <Badge variant="outline" className="text-xs font-mono text-amber-500/70 border-amber-500/20 hidden sm:flex">
                      {song.witnessId.slice(0, 18)}…
                    </Badge>
                  )}

                  {/* Duration */}
                  <span className="text-xs text-muted-foreground flex-shrink-0 w-10 text-right">
                    {formatDuration(song.durationSeconds)}
                  </span>

                  {/* External link */}
                  <Link href={`/song/${song.id}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
