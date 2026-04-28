import { Link } from "wouter";
import { Play, Shield } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Track } from "@/contexts/PlayerContext";

interface SongData {
  id: number;
  title: string;
  coverArtUrl?: string | null;
  artistName?: string | null;
  genre?: string | null;
  wid?: string | null;
  widShort?: string | null;
  playCount?: number | null;
  fileUrl?: string | null;
  duration?: number | null;
  userId?: number | null;
  artistHandle?: string | null;
  profilePhotoUrl?: string | null;
  aiDisclosure?: string | null;
  contentType?: string | null;
}

interface StoreTrackCardProps {
  song: SongData;
  size?: "sm" | "md" | "lg";
  allSongs?: SongData[];
  songIndex?: number;
}

function toTrack(s: SongData): Track {
  return {
    id: String(s.id),
    title: s.title,
    artist: s.artistName || "Unknown",
    genre: s.genre || "",
    audioUrl: s.fileUrl || undefined,
    artUrl: s.coverArtUrl || undefined,
    witnessId: s.wid || s.widShort || undefined,
    creatorHandle: s.artistHandle || undefined,
    creatorId: s.userId || undefined,
    aiDisclosure: (s.aiDisclosure as Track["aiDisclosure"]) || undefined,
    contentType: (s.contentType as Track["contentType"]) || "audio",
  };
}

export function StoreTrackCard({ song, size = "md", allSongs, songIndex }: StoreTrackCardProps) {
  const { state, playQueueAt, addAndPlay } = usePlayer();
  const currentTrack = state.tracks[state.currentIdx];
  const isCurrentlyPlaying = currentTrack?.id === String(song.id) && state.isPlaying;

  const heightClass = size === "sm" ? "h-48" : size === "lg" ? "h-80" : "h-64";
  const widthClass = size === "sm" ? "w-36" : size === "lg" ? "w-56" : "w-48";

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!song.fileUrl) return;
    if (allSongs && songIndex !== undefined) {
      playQueueAt(allSongs.map(toTrack), songIndex, "HOME");
    } else {
      addAndPlay(toTrack(song));
    }
  };

  return (
    <Link href={`/song/${song.id}`}>
      <div
        className={`relative ${widthClass} ${heightClass} flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group transition-transform duration-200 hover:scale-[1.03] hover:shadow-2xl`}
      >
        {/* Cover Art */}
        <div className="absolute inset-0">
          {song.coverArtUrl ? (
            <img
              src={song.coverArtUrl}
              alt={song.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Play className="w-8 h-8 text-white/40" />
              </div>
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Play button overlay */}
        {song.fileUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handlePlay}
              className="w-12 h-12 rounded-full bg-[#C9A84C]/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-[#C9A84C] transition-colors"
            >
              <Play className="w-5 h-5 text-black fill-black ml-0.5" />
            </button>
          </div>
        )}

        {/* Currently playing bars */}
        {isCurrentlyPlaying && (
          <div className="absolute top-2 right-2 flex gap-0.5 items-end h-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-0.5 bg-[#C9A84C] rounded-full animate-pulse"
                style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {(song.wid || song.widShort) && (
            <div className="flex items-center gap-1 mb-1.5">
              <Shield className="w-2.5 h-2.5 text-[#C9A84C]" />
              <span className="text-[9px] font-mono text-[#C9A84C]/80 tracking-wider uppercase">WID</span>
            </div>
          )}
          <p className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-1">{song.title}</p>
          <div className="flex items-center gap-1.5">
            {song.profilePhotoUrl ? (
              <img src={song.profilePhotoUrl} alt={song.artistName || ""} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
            )}
            <span className="text-white/60 text-xs truncate">{song.artistName || "Unknown Artist"}</span>
          </div>
          {song.genre && (
            <span className="inline-block mt-1.5 text-[10px] text-white/40 bg-white/10 rounded px-1.5 py-0.5 truncate max-w-full">
              {song.genre.split(",")[0].trim()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
