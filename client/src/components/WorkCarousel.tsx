/**
 * WorkCarousel — Shared horizontal-scroll carousel for all witnessed work types.
 * Usage: <WorkCarousel type="audio" title="Witnessed Voices" />
 *        <WorkCarousel type="manuscript" title="Witnessed Manuscripts" />
 *        <WorkCarousel type="lyrics" title="Witnessed Lyrics" />
 *        <WorkCarousel type="comic" title="Witnessed Comics" />
 */

import { useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CARD_PAN_W } from "@/lib/cardTokens";
import { Play, Pause, FileText, BookOpen, Layers, Music, ChevronRight } from "lucide-react";
import { MediaAsset } from "@/components/MediaAsset";
import { usePlayer } from "@/contexts/PlayerContext";
import { toast } from "sonner";

export type WorkType = "audio" | "lyrics" | "manuscript" | "comic";

const WID_TYPE_LABEL: Record<WorkType, string> = {
  audio: "WID-MUS",
  lyrics: "WID-LYR",
  manuscript: "WID-MAN",
  comic: "WID-COM",
};

const WID_TYPE_COLOR: Record<WorkType, string> = {
  audio: "#F5C451",
  lyrics: "#c084fc",
  manuscript: "#4ade80",
  comic: "#60a5fa",
};

const CONTENT_ICON: Record<WorkType, React.ElementType> = {
  audio: Music,
  lyrics: FileText,
  manuscript: BookOpen,
  comic: Layers,
};

interface WorkCarouselProps {
  type: WorkType;
  title: string;
  limit?: number;
  viewAllHref?: string;
}

export function WorkCarousel({ type, title, limit = 12, viewAllHref }: WorkCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addAndPlay, playQueueAt, currentTrackId, state: playerState } = usePlayer();

  const { data: works, isLoading } = trpc.songs.discover.useQuery(
    { contentType: type, limit, randomize: false },
    { refetchOnWindowFocus: false, staleTime: 120_000 }
  );

  const widLabel = WID_TYPE_LABEL[type];
  const widColor = WID_TYPE_COLOR[type];
  const Icon = CONTENT_ICON[type];

  const handlePlay = (item: any) => {
    if (type !== "audio") {
      // Non-audio: navigate to song detail page
      return;
    }
    if (!item.song.fileUrl) { toast.error("No audio file available"); return; }
    // Build a queue from all audio works in the carousel so the player auto-advances
    const audioWorks = (works ?? [])
      .filter((w: any) => !!w.song?.fileUrl)
      .map((w: any) => ({
        id: String(w.song.id),
        title: w.song.title,
        artist: w.creator?.artistHandle || w.creator?.name || "Unknown",
        genre: w.song.genre || "",
        audioUrl: w.song.fileUrl,
        artUrl: w.song.coverArtUrl || undefined,
        witnessId: w.song.witnessId || undefined,
        creatorId: w.creator?.id ?? undefined,
        coverPositionX: w.song.coverPositionX ?? 50,
        coverPositionY: w.song.coverPositionY ?? 50,
        visualReady: w.song.visualReady ?? false,
        autoVideoUrl: w.song.autoVideoUrl ?? undefined,
        creatorRole: w.creator?.role ?? undefined,
      }));
    const startIdx = Math.max(0, audioWorks.findIndex((w: any) => w.id === String(item.song.id)));
    if (audioWorks.length > 0) {
      playQueueAt(audioWorks, startIdx, "NONE");
    } else {
      // Fallback: single-track play (no queue available)
      addAndPlay({
        id: String(item.song.id),
        title: item.song.title,
        artist: item.creator?.artistHandle || item.creator?.name || "Unknown",
        genre: item.song.genre || "",
        audioUrl: item.song.fileUrl,
        artUrl: item.song.coverArtUrl || undefined,
        witnessId: item.song.witnessId || undefined,
        creatorId: item.creator?.id ?? undefined,
        coverPositionX: item.song.coverPositionX ?? 50,
        coverPositionY: item.song.coverPositionY ?? 50,
        visualReady: item.song.visualReady ?? false,
        autoVideoUrl: item.song.autoVideoUrl ?? undefined,
        creatorRole: item.creator?.role ?? undefined,
      });
    }
  };

  if (!isLoading && (!works || works.length === 0)) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: widColor }} />
          <h2 className="text-base font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#f5f0e8" }}>
            {title}
          </h2>
          <span
            className="font-mono text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: `${widColor}22`, color: widColor, border: `1px solid ${widColor}55` }}
          >
            {widLabel}
          </span>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="flex items-center gap-1 text-xs" style={{ color: widColor }}>
            View all <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 rounded-xl animate-pulse" style={{ width: CARD_PAN_W, height: 200, background: "var(--ln-coal)" }} />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {(works as any[]).map((item: any) => {
            const isActive = type === "audio" && currentTrackId === String(item.song.id);
            const isPlaying = isActive && playerState.isPlaying;
            const href = (type === "manuscript" || type === "comic") ? `/book/${item.song.id}` : `/song/${item.song.id}`;
            return (
              <div
                key={item.song.id}
                className={`flex-shrink-0 snap-start museum-card parchment-grain cursor-pointer group ${
                  isActive ? "museum-card--active" : ""
                }`}
                style={{ width: CARD_PAN_W }}
                onClick={() => type === "audio" ? handlePlay(item) : undefined}
              >
                {/* Cover / thumbnail */}
                <Link href={href}>
                  <div className="prov-card-img-wrap">
                    {item.song.coverArtUrl ? (
                      <MediaAsset
                        src={item.song.coverArtUrl}
                        alt={item.song.title}
                        mode="card"
                        aspectRatio={(item.song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "4:5"}
                        focalX={item.song.coverPositionX ?? 50}
                        focalY={item.song.coverPositionY ?? 50}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0f0d22" }}>
                        <Icon size={32} style={{ color: widColor + "66" }} />
                      </div>
                    )}
                    {/* Gradient overlay — always present per card standard */}
                    <div className="prov-card-gradient" />
                    {/* Play indicator for audio */}
                    {type === "audio" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          style={{ background: widColor }}>
                          {isPlaying ? (
                            <Pause className="w-4 h-4" style={{ color: "#0a0815" }} />
                          ) : (
                            <Play className="w-4 h-4 fill-current" style={{ color: "#0a0815" }} />
                          )}
                        </div>
                      </div>
                    )}
                    {/* WID type badge */}
                    {item.song.witnessId && (
                      <div className="absolute top-1.5 right-1.5">
                        <span
                          className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                          style={{ background: `${widColor}33`, color: widColor, border: `1px solid ${widColor}66` }}
                        >
                          {widLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                {/* Meta */}
                <div className="p-2.5">
                  <p className="text-[12px] font-semibold truncate" style={{ color: "#FFFFFF", fontFamily: "'Cinzel', serif" }}>{item.song.title}</p>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: "#7a7899" }}>
                    {item.creator?.artistHandle || item.creator?.name || "Unknown"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
