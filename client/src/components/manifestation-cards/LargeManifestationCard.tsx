/**
 * LargeManifestationCard — Cinematic, emotion-first presentation.
 * Used for: featured manifestations, realm spotlights, comics, soundtrack launches, creator showcases.
 * 
 * Default state: artwork-first, minimal chrome (creator sigil + medium icon + resonance glow).
 * Hover/tap state: metadata softly emerges (title, creator, resonance, support, witness).
 */
import { useState, useRef } from "react";
import { Play, Pause, Heart, DollarSign, Shield, Users } from "lucide-react";
import { Link } from "wouter";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { CosmicMediumIcon } from "@/components/CosmicMediumIcon";
import type { ManifestationData, CardInteractionProps } from "./types";

interface Props extends CardInteractionProps {
  data: ManifestationData;
  /** Queue context for continuous playback */
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

export function LargeManifestationCard({ data, allData, dataIndex, onPlay, onTip }: Props) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { state: playerState, currentTrackId, togglePlay, addAndPlay, playQueueAt } = usePlayer();
  const isCurrentlyPlaying = currentTrackId === String(data.id) && playerState.isPlaying;
  const medium = data.contentType || data.medium || "audio";
  const hasAudio = !!data.fileUrl;
  const resonance = (data.likeCount ?? 0) + (data.playCount ?? 0);

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

  return (
    <div
      ref={cardRef}
      className="relative group rounded-xl overflow-hidden cursor-pointer transition-all duration-500"
      style={{
        aspectRatio: "16/9",
        minHeight: "280px",
        boxShadow: hovered
          ? "0 16px 64px rgba(0,0,0,0.6), 0 0 40px rgba(196,154,40,0.08)"
          : "0 4px 24px rgba(0,0,0,0.4)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
    >
      {/* Layer 1: Full-bleed artwork */}
      <div className="absolute inset-0">
        {data.coverArtUrl && !imgError ? (
          <img
            src={data.coverArtUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700"
            style={{
              filter: "brightness(0.85)",
              transform: hovered ? "scale(1.03)" : "scale(1)",
              objectPosition: "center 20%",
            }}
            onError={() => setImgError(true)}
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(20,18,12,1), rgba(40,35,20,1))" }} />
        )}
      </div>

      {/* Layer 2: Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: hovered
            ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)"
            : "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)",
        }}
      />

      {/* Layer 3: Default state — minimal chrome */}
      {/* Creator sigil (always visible) */}
      {data.profilePhotoUrl && (
        <Link href={`/creator/${data.userId}`} className="absolute top-3 left-3 z-10">
          <img
            src={data.profilePhotoUrl}
            alt=""
            className="w-7 h-7 rounded-full object-cover ring-1 ring-[rgba(196,154,40,0.3)] transition-all duration-300"
            style={{ opacity: hovered ? 1 : 0.7 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </Link>
      )}

      {/* Medium icon (always visible, top-right) */}
      <div className="absolute top-3 right-3 z-10 transition-opacity duration-300" style={{ opacity: hovered ? 0.4 : 0.6 }}>
        <CosmicMediumIcon medium={medium as any} size={16} />
      </div>

      {/* Resonance glow indicator (always visible if high resonance) */}
      {resonance > 50 && (
        <div className="absolute top-3 left-12 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(196,154,40,0.1)", opacity: hovered ? 0 : 0.7, transition: "opacity 0.3s" }}>
          <Heart size={8} style={{ color: "#C9A84C", fill: "#C9A84C" }} />
          <span className="text-[8px] font-heading font-bold" style={{ color: "#C9A84C" }}>{resonance}</span>
        </div>
      )}

      {/* Collaborative marker */}
      {data.isCollaborative && (
        <div className="absolute top-3 left-12 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(196,154,40,0.12)", opacity: 0.7 }}>
          <Users size={8} style={{ color: "#C9A84C" }} />
        </div>
      )}

      {/* Layer 4: PLAY — sacred primary interaction (always visible for audio) */}
      {hasAudio && (
        <button
          onClick={handlePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full transition-all duration-300"
          style={{
            width: hovered ? "64px" : "56px",
            height: hovered ? "64px" : "56px",
            background: "rgba(0,0,0,0.5)",
            border: "2px solid rgba(196,154,40,0.7)",
            boxShadow: hovered
              ? "0 0 30px rgba(196,154,40,0.3), inset 0 0 15px rgba(196,154,40,0.1)"
              : "0 0 15px rgba(196,154,40,0.15)",
            opacity: hovered ? 1 : 0.85,
          }}
        >
          {isCurrentlyPlaying ? (
            <Pause size={22} fill="#C9A84C" style={{ color: "#C9A84C" }} />
          ) : (
            <Play size={22} fill="#C9A84C" style={{ color: "#C9A84C", marginLeft: "2px" }} />
          )}
        </button>
      )}

      {/* Layer 5: Hover/tap reveal — metadata emerges */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-10 transition-all duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {/* Title */}
        <Link href={medium === "comic" ? `/book/${data.id}` : `/song/${data.id}`}>
          <h3 className="text-base font-heading font-bold leading-tight mb-1 hover:underline decoration-[rgba(196,154,40,0.4)]"
            style={{ color: "#F5F5F5" }}>
            {data.title}
          </h3>
        </Link>
        {/* Creator name */}
        <Link href={`/creator/${data.userId}`}>
          <p className="text-xs hover:underline decoration-[rgba(196,154,40,0.3)]"
            style={{ color: "rgba(196,154,40,0.8)" }}>
            {data.artistName || "Unknown Creator"}
          </p>
        </Link>
        {/* Metadata row */}
        <div className="flex items-center gap-3 mt-2">
          {data.playCount != null && data.playCount > 0 && (
            <span className="text-[9px] font-heading" style={{ color: "rgba(232,223,200,0.5)" }}>
              {data.playCount.toLocaleString()} plays
            </span>
          )}
          {(data.likeCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] font-heading" style={{ color: "rgba(232,223,200,0.5)" }}>
              <Heart size={8} /> {data.likeCount}
            </span>
          )}
          {(data.totalFundingCents ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] font-heading" style={{ color: "rgba(196,154,40,0.6)" }}>
              <DollarSign size={8} /> {((data.totalFundingCents ?? 0) / 100).toFixed(0)}
            </span>
          )}
          {data.wid && (
            <Link href={`/verify/${data.wid}`} className="flex items-center gap-0.5 text-[9px] font-heading" style={{ color: "rgba(196,154,40,0.5)" }}>
              <Shield size={8} /> WID
            </Link>
          )}
        </div>
      </div>

      {/* Default state bottom — title peek (subtle, always visible) */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-[5] transition-opacity duration-500"
        style={{ opacity: hovered ? 0 : 1 }}
      >
        <p className="text-sm font-heading font-bold truncate" style={{ color: "rgba(245,245,245,0.9)", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
          {data.title}
        </p>
      </div>
    </div>
  );
}
