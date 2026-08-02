/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — WorkListRow
   Premium information-dense list row for the Cathedral Explore page.
   Every work is displayed with intention.
═══════════════════════════════════════════════════════════════════ */
import { useState, useCallback } from "react";
import { Play, Pause, Shield, BookOpen, ListPlus, Heart, Headphones, FileText, Image, Gamepad2, Code2, Music } from "lucide-react";
import { Link, useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLike } from "../hooks/useLike";
import { SupportCreatorDrawer, type SupportTarget } from "@/components/SupportCreatorDrawer";
import { AddToMyListModal } from "@/components/AddToMyListModal";


// ── Content type metadata ──────────────────────────────────────────
const CONTENT_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  audio:      { label: "Music",      icon: <Music className="w-3 h-3" />,     color: "text-emerald-400",  bgColor: "bg-emerald-400/10" },
  lyrics:     { label: "Lyrics",     icon: <FileText className="w-3 h-3" />,  color: "text-sky-400",      bgColor: "bg-sky-400/10" },
  manuscript: { label: "Book",       icon: <BookOpen className="w-3 h-3" />,  color: "text-amber-400",    bgColor: "bg-amber-400/10" },
  comic:      { label: "Doctrine",   icon: <BookOpen className="w-3 h-3" />,  color: "text-violet-400",   bgColor: "bg-violet-400/10" },
  image:      { label: "Visual",     icon: <Image className="w-3 h-3" />,     color: "text-rose-400",     bgColor: "bg-rose-400/10" },
  game:       { label: "Film",       icon: <Gamepad2 className="w-3 h-3" />,  color: "text-orange-400",   bgColor: "bg-orange-400/10" },
  gcode:      { label: "3D Object",  icon: <Code2 className="w-3 h-3" />,     color: "text-cyan-400",     bgColor: "bg-cyan-400/10" },
  "3dmodel":  { label: "3D Model",   icon: <Code2 className="w-3 h-3" />,     color: "text-cyan-400",     bgColor: "bg-cyan-400/10" },
};

function getTypeMeta(contentType?: string) {
  return CONTENT_TYPE_META[contentType ?? "audio"] ?? CONTENT_TYPE_META["audio"];
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(d?: Date | string | null): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Props ──────────────────────────────────────────────────────────
export interface WorkListRowItem {
  song: {
    id: number;
    title: string;
    genre?: string | null;
    contentType?: string;
    durationSeconds?: number | null;
    coverArtUrl?: string | null;
    witnessId?: string | null;
    playCount?: number | null;
    releaseDate?: Date | string | null;
    createdAt?: Date | string | null;
    fileUrl?: string | null;
    stripeAccountStatus?: string | null;
    status?: string;
  };
  creator?: {
    id: number;
    name?: string | null;
    artistHandle?: string | null;
    profilePhotoUrl?: string | null;
    stripeAccountStatus?: string | null;
  } | null;
}

interface Props {
  item: WorkListRowItem;
  index?: number;
  prefetchedLiked?: boolean;
  prefetchedLikeCount?: number;
}

// ── Component ──────────────────────────────────────────────────────
export function WorkListRow({ item, index, prefetchedLiked, prefetchedLikeCount }: Props) {
  const { song, creator } = item;
  const { addAndPlay, currentTrackId, state: playerState } = usePlayer();
  const [, navigate] = useLocation();
  const [showSupport, setShowSupport] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);
  const [hovered, setHovered] = useState(false);

  const songIdStr = String(song.id);
  const isPlaying = currentTrackId === songIdStr && playerState.isPlaying;
  const isActive = currentTrackId === songIdStr;
  const hasAudio = !!song.fileUrl && song.contentType === "audio";
  const typeMeta = getTypeMeta(song.contentType);

  const hasPrefetch = prefetchedLiked !== undefined;
  const { liked, toggle: toggleLike } = useLike(song.id, { skipQuery: hasPrefetch, initialLiked: prefetchedLiked });
  const likeCount = prefetchedLikeCount ?? 0;

  const artistName = creator?.artistHandle ? `@${creator.artistHandle}` : (creator?.name || "Unknown");
  const displayDate = song.releaseDate || song.createdAt;

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasAudio) { navigate(`/song/${song.id}`); return; }
    addAndPlay({
      id: String(song.id),
      title: song.title,
      artist: artistName,
      genre: song.genre ?? "",
      audioUrl: song.fileUrl!,
      artUrl: song.coverArtUrl ?? undefined,
      witnessId: song.witnessId ?? undefined,
    });
  }, [hasAudio, song, artistName, addAndPlay, navigate]);

  const handleRowClick = useCallback(() => {
    navigate(`/song/${song.id}`);
  }, [song.id, navigate]);

  const handleSupportClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSupport(true);
  }, []);

  const handleAddToListClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAddToListRect(e.currentTarget.getBoundingClientRect());
    setShowAddToList(true);
  }, []);

  const supportTarget: SupportTarget = {
    songId: song.id,
    songTitle: song.title,
    songWid: song.witnessId,
    creatorId: creator?.id ?? 0,
    creatorName: creator?.name ?? "Unknown",
    creatorHandle: creator?.artistHandle,
    coverArtUrl: song.coverArtUrl,
    contentType: song.contentType,
    stripeAccountStatus: creator?.stripeAccountStatus ?? song.stripeAccountStatus,
  };

  return (
    <>
      <div
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 border ${
          isActive
            ? "bg-[var(--gold)]/8 border-[var(--gold)]/20"
            : "border-transparent hover:bg-white/3 hover:border-white/8"
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleRowClick}
      >
        {/* Index / Play button */}
        <div className="w-8 flex-shrink-0 flex items-center justify-center">
          {hovered || isActive ? (
            <button
              onClick={handlePlay}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? "bg-[var(--gold)] text-black"
                  : "bg-white/10 text-[var(--stone-light)] hover:bg-[var(--gold)] hover:text-black"
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          ) : (
            <span className={`text-xs font-mono ${isActive ? "text-[var(--gold)]" : "text-[var(--stone-shadow)]"}`}>
              {index !== undefined ? String(index + 1).padStart(2, "0") : "—"}
            </span>
          )}
        </div>

        {/* Cover art */}
        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden border border-white/8">
          {song.coverArtUrl ? (
            <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[var(--void-4)] flex items-center justify-center">
              <Music className="w-4 h-4 text-[var(--stone-shadow)]" />
            </div>
          )}
        </div>

        {/* Title + creator */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate leading-tight ${isActive ? "text-[var(--gold)]" : "text-[var(--stone-light)] group-hover:text-white"}`}>
            {song.title}
          </p>
          <Link
            to={`/creator/${creator?.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-[var(--stone-shadow)] hover:text-[var(--gold)] transition-colors truncate block"
          >
            {artistName}
          </Link>
        </div>

        {/* Content type chip — hidden on mobile */}
        <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${typeMeta.bgColor} ${typeMeta.color}`}>
          {typeMeta.icon}
          <span>{typeMeta.label}</span>
        </div>

        {/* Genre — hidden on small screens */}
        <div className="hidden md:block w-24 flex-shrink-0">
          <span className="text-xs text-[var(--stone-shadow)] truncate block">{song.genre || "—"}</span>
        </div>

        {/* Duration — hidden on small screens */}
        <div className="hidden lg:block w-14 flex-shrink-0 text-right">
          <span className="text-xs text-[var(--stone-shadow)] font-mono">{formatDuration(song.durationSeconds)}</span>
        </div>

        {/* Date — hidden on small screens */}
        <div className="hidden xl:block w-28 flex-shrink-0 text-right">
          <span className="text-xs text-[var(--stone-shadow)]">{formatDate(displayDate)}</span>
        </div>

        {/* WID badge */}
        {song.witnessId ? (
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            <Shield className="w-3 h-3 text-[var(--gold)]" />
            <span className="text-[10px] font-mono text-[var(--gold)] hidden lg:inline">
              {song.witnessId.slice(0, 12)}…
            </span>
          </div>
        ) : (
          <div className="hidden sm:block w-4 flex-shrink-0" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Like */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleLike(); }}
            className={`p-1.5 rounded-lg transition-all ${liked ? "text-rose-400" : "text-[var(--stone-shadow)] hover:text-rose-400 opacity-0 group-hover:opacity-100"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
          </button>

          {/* Add to list */}
          <button
            onClick={handleAddToListClick}
            className="p-1.5 rounded-lg text-[var(--stone-shadow)] hover:text-[var(--stone-light)] transition-all opacity-0 group-hover:opacity-100"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>

          {/* Support */}
          <button
            onClick={handleSupportClick}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[var(--gold)] text-[10px] font-medium hover:bg-[var(--gold)]/20 transition-all opacity-0 group-hover:opacity-100"
          >
            <Headphones className="w-3 h-3" />
            Support
          </button>
        </div>
      </div>

      {/* Support drawer */}
      {showSupport && (
        <SupportCreatorDrawer
          target={supportTarget}
          onClose={() => setShowSupport(false)}
        />
      )}

      {/* Add to list modal */}
      {showAddToList && (
        <AddToMyListModal
          open={showAddToList}
          songId={song.id}
          songTitle={song.title}
          onClose={() => setShowAddToList(false)}
          originRect={addToListRect}
        />
      )}
    </>
  );
}
