/**
 * MicroManifestationCard — Compact rapid-discovery card.
 * Used for: underground uploads, drafts, quick resonance chains, active collaborations.
 * 
 * Horizontal layout: small artwork + title + creator + play.
 * Minimal footprint, high density, fast scanning.
 */
import { useState } from "react";
import { Play, Pause, Shield } from "lucide-react";
import { Link } from "wouter";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { CosmicMediumIcon } from "@/components/CosmicMediumIcon";
import type { ManifestationData, CardInteractionProps } from "./types";

interface Props extends CardInteractionProps {
  data: ManifestationData;
  allData?: ManifestationData[];
  dataIndex?: number;
}

function toTrack(d: ManifestationData): Track {
  return {
    id: String(d.id),
    title: d.title,
    artist: d.artistName || "Unknown",
    genre: d.genre || "",
    audioUrl: d.fileUrl || undefined,
    artUrl: d.coverArtUrl || undefined,
    witnessId: d.wid || d.widShort || undefined,
    creatorHandle: d.artistHandle || undefined,
    creatorId: d.userId || undefined,
    aiDisclosure: (d.aiDisclosure as Track["aiDisclosure"]) || undefined,
    contentType: (d.contentType as Track["contentType"]) || "audio",
  };
}

export function MicroManifestationCard({ data, allData, dataIndex, onPlay }: Props) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { state: playerState, currentTrackId, togglePlay, addAndPlay, playQueueAt } = usePlayer();
  const isCurrentlyPlaying = currentTrackId === String(data.id) && playerState.isPlaying;
  const medium = data.contentType || data.medium || "audio";
  const hasAudio = !!data.fileUrl;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentlyPlaying) { togglePlay(); return; }
    if (onPlay) { onPlay(data); return; }
    if (allData && dataIndex !== undefined) {
      playQueueAt(allData.map(toTrack), dataIndex);
    } else {
      addAndPlay(toTrack(data));
    }
  };

  const detailHref = medium === "comic" ? `/book/${data.id}` : `/song/${data.id}`;

  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-300 group"
      style={{
        background: hovered ? "rgba(196,154,40,0.04)" : "transparent",
        border: "1px solid",
        borderColor: hovered ? "rgba(196,154,40,0.12)" : "rgba(196,154,40,0.04)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Compact artwork */}
      <div className="relative flex-shrink-0 w-10 h-10 rounded-md overflow-hidden">
        {data.coverArtUrl && !imgError ? (
          <img
            src={data.coverArtUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.9)" }}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(20,18,12,1), rgba(35,30,18,1))" }} />
        )}
        {/* Play overlay on hover */}
        {hasAudio && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
            style={{
              background: "rgba(0,0,0,0.4)",
              opacity: hovered ? 1 : 0,
            }}
          >
            {isCurrentlyPlaying ? (
              <Pause size={12} fill="#C9A84C" style={{ color: "#C9A84C" }} />
            ) : (
              <Play size={12} fill="#C9A84C" style={{ color: "#C9A84C", marginLeft: "1px" }} />
            )}
          </button>
        )}
        {/* Medium icon badge */}
        <div className="absolute bottom-0.5 right-0.5">
          <CosmicMediumIcon medium={medium as any} size={8} />
        </div>
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <Link href={detailHref}>
          <p className="text-[11px] font-heading font-bold truncate leading-tight hover:underline decoration-[rgba(196,154,40,0.3)]"
            style={{ color: hovered ? "#F5F5F5" : "rgba(232,223,200,0.8)" }}>
            {data.title}
          </p>
        </Link>
        <Link href={`/creator/${data.userId}`}>
          <p className="text-[9px] truncate mt-0.5 hover:underline decoration-[rgba(196,154,40,0.2)]"
            style={{ color: "rgba(196,154,40,0.55)" }}>
            {data.artistHandle ? `@${data.artistHandle}` : (data.artistName || "Unknown")}
          </p>
        </Link>
      </div>

      {/* Right side — WID badge + play count */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {data.wid && (
          <Shield size={9} style={{ color: "rgba(196,154,40,0.35)" }} />
        )}
        {data.playCount != null && data.playCount > 0 && (
          <span className="text-[8px] font-heading" style={{ color: "rgba(232,223,200,0.3)" }}>
            {data.playCount > 999 ? `${(data.playCount / 1000).toFixed(1)}k` : data.playCount}
          </span>
        )}
      </div>
    </div>
  );
}
