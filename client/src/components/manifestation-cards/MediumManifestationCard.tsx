/**
 * MediumManifestationCard — Balanced discovery card.
 * Used for: trending, resonance surfaces, collaborative manifestations.
 * 
 * Default state: artwork-first with subtle creator sigil + medium icon.
 * Hover/tap: title, creator name, resonance, support icon emerge.
 */
import { useState } from "react";
import { Play, Pause, Heart, DollarSign, Shield } from "lucide-react";
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

export function MediumManifestationCard({ data, allData, dataIndex, onPlay }: Props) {
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
      className="relative group rounded-lg overflow-hidden cursor-pointer transition-all duration-400"
      style={{
        aspectRatio: "1/1",
        boxShadow: hovered
          ? "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(196,154,40,0.06)"
          : "0 2px 12px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(h => !h)}
    >
      {/* Artwork */}
      <div className="absolute inset-0">
        {data.coverArtUrl && !imgError ? (
          <img
            src={data.coverArtUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-600"
            style={{
              filter: "brightness(0.88)",
              transform: hovered ? "scale(1.04)" : "scale(1)",
              objectPosition: "center 20%",
            }}
            onError={() => setImgError(true)}
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(20,18,12,1), rgba(35,30,18,1))" }} />
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-400"
        style={{
          background: hovered
            ? "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)"
            : "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)",
        }}
      />

      {/* Default chrome — creator sigil */}
      {data.profilePhotoUrl && (
        <Link href={`/creator/${data.userId}`} className="absolute top-2 left-2 z-10">
          <img
            src={data.profilePhotoUrl}
            alt=""
            className="w-5 h-5 rounded-full object-cover ring-1 ring-[rgba(196,154,40,0.25)] transition-opacity duration-300"
            style={{ opacity: hovered ? 1 : 0.6 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </Link>
      )}

      {/* Medium icon */}
      <div className="absolute top-2 right-2 z-10 transition-opacity duration-300" style={{ opacity: hovered ? 0.3 : 0.5 }}>
        <CosmicMediumIcon medium={medium as any} size={13} />
      </div>

      {/* Play button */}
      {hasAudio && (
        <button
          onClick={handlePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full transition-all duration-300"
          style={{
            width: "44px",
            height: "44px",
            background: "rgba(0,0,0,0.5)",
            border: "1.5px solid rgba(196,154,40,0.6)",
            boxShadow: hovered ? "0 0 20px rgba(196,154,40,0.2)" : "0 0 8px rgba(196,154,40,0.1)",
            opacity: hovered ? 1 : 0.75,
            transform: hovered ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0.9)",
          }}
        >
          {isCurrentlyPlaying ? (
            <Pause size={16} fill="#C9A84C" style={{ color: "#C9A84C" }} />
          ) : (
            <Play size={16} fill="#C9A84C" style={{ color: "#C9A84C", marginLeft: "1px" }} />
          )}
        </button>
      )}

      {/* Hover reveal — metadata */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6 z-10 transition-all duration-400"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateY(0)" : "translateY(6px)",
        }}
      >
        <Link href={detailHref}>
          <h4 className="text-xs font-heading font-bold leading-tight truncate hover:underline decoration-[rgba(196,154,40,0.3)]"
            style={{ color: "#F5F5F5" }}>
            {data.title}
          </h4>
        </Link>
        <Link href={`/creator/${data.userId}`}>
          <p className="text-[10px] truncate mt-0.5 hover:underline decoration-[rgba(196,154,40,0.2)]"
            style={{ color: "rgba(196,154,40,0.7)" }}>
            {data.artistHandle ? `@${data.artistHandle}` : (data.artistName || "Unknown")}
          </p>
        </Link>
        <div className="flex items-center gap-2 mt-1.5">
          {(data.likeCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[8px]" style={{ color: "rgba(232,223,200,0.5)" }}>
              <Heart size={7} /> {data.likeCount}
            </span>
          )}
          {(data.totalFundingCents ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[8px]" style={{ color: "rgba(196,154,40,0.5)" }}>
              <DollarSign size={7} />
            </span>
          )}
          {data.wid && (
            <span className="flex items-center gap-0.5 text-[8px]" style={{ color: "rgba(196,154,40,0.4)" }}>
              <Shield size={7} />
            </span>
          )}
        </div>
      </div>

      {/* Default bottom — title peek */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-[5] transition-opacity duration-400"
        style={{ opacity: hovered ? 0 : 1 }}
      >
        <p className="text-[11px] font-heading font-bold truncate" style={{ color: "rgba(245,245,245,0.85)", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
          {data.title}
        </p>
      </div>
    </div>
  );
}
