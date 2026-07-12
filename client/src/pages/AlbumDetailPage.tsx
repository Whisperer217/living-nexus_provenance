/**
 * AlbumDetailPage — public view of a WID-ALB collection.
 * Route: /album/:collectionWid
 *
 * Displays the album cover, metadata, and track list.
 * Supports Play All, per-track play, like, comment, and share.
 * Share on album header copies the album URL to clipboard.
 */
import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Track } from "@/contexts/PlayerContext";
import { Play, ChevronLeft, Music, Clock, Disc3, Share2, Heart, MessageSquare, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLike } from "@/hooks/useLike";
import { useAuth } from "@/_core/hooks/useAuth";
import { triggerTaggedDownload } from "@/lib/downloadTrack";

// ─── Per-track row with like / comment / share ─────────────────────────────

function TrackRow({
  track,
  idx,
  isActive,
  isPlaying,
  canPlay,
  onPlay,
  collectionWid,
  albumCoverArtUrl,
}: {
  track: any;
  idx: number;
  isActive: boolean;
  isPlaying: boolean;
  canPlay: boolean;
  onPlay: () => void;
  collectionWid: string;
  albumCoverArtUrl?: string | null;
}) {
  const { user } = useAuth();
  const { liked, toggle: toggleLike } = useLike(track.id);
  const { data: likeCountData } = trpc.songs.getLikeCount.useQuery(
    { songId: track.id },
    { enabled: !!track.id }
  );
  const likeCount = likeCountData?.count ?? 0;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = track.witnessId
      ? `https://www.livingnexus.org/share/${encodeURIComponent(track.witnessId)}`
      : `${window.location.origin}/song/${track.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(e);
  };

  return (
    <div
      key={track.id}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${canPlay ? "cursor-pointer hover:bg-white/5" : "opacity-40"}`}
      style={isActive ? { background: "rgba(196,154,40,0.08)" } : undefined}
      onClick={() => canPlay && onPlay()}
    >
      {/* Track number / playing indicator */}
      <div className="w-6 text-center flex-shrink-0">
        {isPlaying ? (
          <span className="inline-flex gap-0.5 items-end h-4">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-0.5 rounded-full animate-pulse"
                style={{ height: `${8 + i * 4}px`, background: "var(--ln-gold, #C49A28)", animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        ) : (
          <span className="text-xs" style={{ color: isActive ? "var(--ln-gold, #C49A28)" : "var(--ln-iron, #555570)" }}>
            {idx + 1}
          </span>
        )}
      </div>

      {/* Cover art thumbnail */}
      <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0"
        style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.1)" }}>
        {(track.coverArtUrl ?? albumCoverArtUrl) ? (
          <img
            src={track.coverArtUrl ?? albumCoverArtUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={12} style={{ color: "var(--ln-gold, #C49A28)", opacity: 0.4 }} />
          </div>
        )}
      </div>

      {/* Title + WID */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate"
          style={{ color: isActive ? "var(--ln-gold, #C49A28)" : "var(--ln-parchment, #F5EFD7)" }}>
          {track.title ?? "Untitled"}
        </p>
        {track.witnessId && (
          <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: "rgba(196,154,40,0.45)" }}>
            {track.witnessId}
          </p>
        )}
      </div>

      {/* Duration */}
      {track.durationSeconds && (
        <span className="hidden sm:block text-xs flex-shrink-0 w-10 text-right"
          style={{ color: "var(--ln-iron, #555570)" }}>
          {Math.floor(track.durationSeconds / 60)}:{String(track.durationSeconds % 60).padStart(2, "0")}
        </span>
      )}

      {/* Action icons — like / comment / share */}
      <div
        className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        {/* Like */}
        <button
          onClick={handleLike}
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-md transition-colors hover:bg-white/8"
          title={liked ? "Unlike" : "Like"}
        >
          <Heart
            size={13}
            fill={liked ? "currentColor" : "none"}
            style={{ color: liked ? "#F87171" : "var(--ln-smoke, #8a8a9a)" }}
          />
          {likeCount > 0 && (
            <span className="text-[10px]" style={{ color: "var(--ln-smoke, #8a8a9a)" }}>{likeCount}</span>
          )}
        </button>

        {/* Comment — links to song detail */}
        <Link href={`/song/${track.id}#comments`} onClick={e => e.stopPropagation()}>
          <button
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md transition-colors hover:bg-white/8"
            title="View comments"
          >
            <MessageSquare size={13} style={{ color: "var(--ln-smoke, #8a8a9a)" }} />
          </button>
        </Link>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-md transition-colors hover:bg-white/8"
          title="Copy link"
        >
          <Share2 size={13} style={{ color: "var(--ln-smoke, #8a8a9a)" }} />
        </button>

        {/* Download track (only if free) */}
        {track.downloadPermission === 'free' && track.fileUrl && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await triggerTaggedDownload(track.id);
              } catch {
                toast.error('Download failed.');
              }
            }}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md transition-colors hover:bg-white/8"
            title="Download track"
          >
            <Download size={13} style={{ color: "var(--ln-smoke, #8a8a9a)" }} />
          </button>
        )}

        {/* Song page link */}
        <Link href={`/song/${track.id}`} onClick={e => e.stopPropagation()}>
          <button
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-md transition-colors hover:bg-white/8"
            title="Open song page"
          >
            <ExternalLink size={13} style={{ color: "var(--ln-smoke, #8a8a9a)" }} />
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function AlbumDetailPage() {
  const [, params] = useRoute("/album/:collectionWid");
  const [, navigate] = useLocation();
  const collectionWid = params?.collectionWid ?? "";

  const { data, isLoading, error } = trpc.songs.getPublicAlbum.useQuery(
    { collectionWid },
    { enabled: !!collectionWid }
  );

  const { playQueueAt, state: playerState, currentTrackId } = usePlayer();

  const buildQueue = (): Track[] => {
    if (!data?.tracks?.length) return [];
    return data.tracks
      .filter((t: any) => t.fileUrl)
      .map((t: any) => ({
        id: String(t.id),
        title: t.title ?? "Untitled",
        artist: data.creator?.artistHandle ?? data.creator?.name ?? "Unknown",
        genre: t.genre ?? "",
        audioUrl: t.fileUrl ?? undefined,
        artUrl: t.coverArtUrl ?? data.collection.coverArtUrl ?? undefined,
        witnessId: t.witnessId ?? undefined,
        creatorHandle: data.creator?.artistHandle ?? data.creator?.name ?? undefined,
        creatorId: data.creator?.id,
      }));
  };

  const handlePlayAll = () => {
    const queue = buildQueue();
    if (!queue.length) return;
    playQueueAt(queue, 0, "PLAYLIST");
  };

  const handlePlayTrack = (index: number) => {
    const queue = buildQueue();
    if (!queue.length) return;
    playQueueAt(queue, index, "PLAYLIST");
  };

  const handleShareAlbum = () => {
    const url = data?.collection?.collectionWid
      ? `${window.location.origin}/album/${encodeURIComponent(data.collection.collectionWid)}`
      : window.location.href;
    navigator.clipboard.writeText(url).then(() => toast.success("Album link copied!"));
  };

  // ── Album download — uses per-track downloadPermission, no project gate ───────
  const [albumDownloading, setAlbumDownloading] = useState(false);

  // Tracks the user can download right now (free permission + has audio file)
  const freeDownloadTracks = (data?.tracks ?? []).filter(
    (t: any) => t.downloadPermission === 'free' && t.fileUrl
  );
  const hasFreeDownloads = freeDownloadTracks.length > 0;
  const allFree = hasFreeDownloads && freeDownloadTracks.length === (data?.tracks ?? []).filter((t: any) => t.fileUrl).length;

  const handleAlbumDownload = async () => {
    if (!hasFreeDownloads) {
      toast.error('No free downloads available for this album.');
      return;
    }
    setAlbumDownloading(true);
    toast.success(`Preparing album ZIP with ${freeDownloadTracks.length} track${freeDownloadTracks.length !== 1 ? 's' : ''}…`);
    try {
      // Single album ZIP endpoint — all free tracks bundled in track order
      const response = await fetch(`/api/download/album/${encodeURIComponent(collectionWid)}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error((err as any).error ?? 'Download failed');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      // Use filename from Content-Disposition header if available
      const cd = response.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename\*=UTF-8''([^;]+)/) ?? cd.match(/filename="([^"]+)"/);
      a.download = match ? decodeURIComponent(match[1]) : `${data?.collection?.name ?? 'album'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      toast.success('Album downloaded!');
    } catch (err: any) {
      toast.error((err as any)?.message ?? 'Download failed. Please try again.');
    } finally {
      setAlbumDownloading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void, #080d14)" }}>
        <div className="flex flex-col items-center gap-3">
          <Disc3 className="w-8 h-8 animate-spin" style={{ color: "var(--ln-gold, #C49A28)" }} />
          <p className="text-sm" style={{ color: "var(--ln-smoke, #8a8a9a)" }}>Loading album…</p>
        </div>
      </div>
    );
  }

  // ── Not Found ────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--ln-void, #080d14)" }}>
        <Music className="w-12 h-12 opacity-20" style={{ color: "var(--ln-smoke, #8a8a9a)" }} />
        <p className="text-base font-medium" style={{ color: "var(--ln-parchment, #F5EFD7)" }}>Album not found.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
          className="mt-2"
        >
          <ChevronLeft size={14} className="mr-1" /> Go back
        </Button>
      </div>
    );
  }

  const { collection, tracks, creator } = data;
  const playableTracks = tracks.filter((t: any) => t.fileUrl);
  const playableIndices = tracks.reduce((acc: number[], t: any, i: number) => {
    if (t.fileUrl) acc.push(i);
    return acc;
  }, []);

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--ln-void, #080d14)" }}>
      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b"
        style={{ background: "rgba(8,13,20,0.92)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "var(--ln-smoke, #8a8a9a)" }}
        >
          <ChevronLeft size={16} />
          Back
        </button>
      </div>

      {/* ── Album hero ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 px-4 sm:px-8 pt-8 pb-6"
        style={{ background: "linear-gradient(to bottom, rgba(196,154,40,0.06), transparent)" }}>
        {/* Cover art */}
        <div className="w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)" }}>
          {collection.coverArtUrl ? (
            <img
              src={collection.coverArtUrl}
              alt={collection.name}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${collection.coverPositionX ?? 50}% ${collection.coverPositionY ?? 50}%`,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-12 h-12 opacity-20" style={{ color: "var(--ln-gold, #C49A28)" }} />
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--ln-gold, #C49A28)", fontFamily: "'Cinzel', serif" }}>
            Album
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "var(--ln-parchment, #F5EFD7)", fontFamily: "'Cinzel', serif" }}>
            {collection.name}
          </h1>
          {creator && (
            <p className="text-sm" style={{ color: "var(--ln-smoke, #8a8a9a)" }}>
              {creator.artistHandle ?? creator.name}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs mt-1" style={{ color: "var(--ln-iron, #555570)" }}>
            <span>{tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
            {collection.collectionWid && (
              <span className="font-mono" style={{ color: "rgba(196,154,40,0.5)" }}>{collection.collectionWid}</span>
            )}
          </div>
          {collection.description && (
            <p className="text-sm mt-1 max-w-lg" style={{ color: "var(--ln-smoke, #8a8a9a)" }}>
              {collection.description}
            </p>
          )}

          {/* Play All + Download + Share Album */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {playableTracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: "var(--ln-gold, #C49A28)", color: "#0a0812", fontFamily: "'Cinzel', serif" }}
              >
                <Play size={16} fill="currentColor" />
                Play Album
              </button>
            )}
            {/* Download Album — always shown; downloads all free-permission tracks */}
            <button
              onClick={handleAlbumDownload}
              disabled={albumDownloading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all hover:opacity-80 active:scale-95 disabled:opacity-50"
              style={{ background: "rgba(196,154,40,0.10)", border: "1px solid rgba(196,154,40,0.28)", color: "var(--ln-gold, #C49A28)", fontFamily: "'Cinzel', serif" }}
              title={
                !hasFreeDownloads
                  ? 'No free downloads available for this album'
                  : allFree
                  ? 'Download all tracks'
                  : `Download ${freeDownloadTracks.length} of ${(data?.tracks ?? []).filter((t: any) => t.fileUrl).length} free tracks`
              }
            >
              <Download size={15} />
              {albumDownloading
                ? 'Downloading…'
                : !hasFreeDownloads
                ? 'Download Album'
                : allFree
                ? 'Download Album'
                : `Download (${freeDownloadTracks.length} free)`}
            </button>
            <button
              onClick={handleShareAlbum}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all hover:opacity-80 active:scale-95"
              style={{ background: "rgba(196,154,40,0.10)", border: "1px solid rgba(196,154,40,0.28)", color: "var(--ln-gold, #C49A28)", fontFamily: "'Cinzel', serif" }}
              title="Share this album"
            >
              <Share2 size={15} />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* ── Track list ────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8">
        {/* Header row */}
        <div className="flex items-center gap-3 px-3 pb-2 text-xs font-bold tracking-widest border-b mb-2"
          style={{ color: "var(--ln-iron, #555570)", borderColor: "rgba(255,255,255,0.06)", fontFamily: "'Cinzel', serif" }}>
          <span className="w-6 text-center">#</span>
          <span className="flex-1">TITLE</span>
          <span className="hidden sm:block w-10 text-right"><Clock size={12} /></span>
        </div>

        {tracks.length === 0 ? (
          <div className="py-12 text-center">
            <Music className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: "var(--ln-smoke, #8a8a9a)" }} />
            <p className="text-sm" style={{ color: "var(--ln-smoke, #8a8a9a)" }}>No tracks in this album.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {tracks.map((track: any, idx: number) => {
              const isActive = currentTrackId === String(track.id);
              const isPlaying = isActive && playerState.isPlaying;
              const playableIdx = playableIndices.indexOf(idx);
              const canPlay = !!track.fileUrl;

              return (
                <TrackRow
                  key={track.id}
                  track={track}
                  idx={idx}
                  isActive={isActive}
                  isPlaying={isPlaying}
                  canPlay={canPlay}
                  onPlay={() => handlePlayTrack(playableIdx)}
                  collectionWid={collectionWid}
                  albumCoverArtUrl={collection.coverArtUrl}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
