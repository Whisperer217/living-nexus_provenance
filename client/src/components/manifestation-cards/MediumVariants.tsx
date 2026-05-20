/**
 * Medium-Specific Card Variants
 * 
 * Different media types visually behave differently:
 * - Music: waveform/atmosphere, quick interaction, play-forward
 * - Comics: cover-focused, issue styling, reading emphasis
 * - Books/Manuscripts: typography-driven, atmospheric archive styling
 * - Guides: portrait/sigil focus, character identity emphasis
 * - Lore/Archive: ancient/record aesthetic, provenance-forward
 */
import { useState } from "react";
import { Play, Pause, BookOpen, Scroll, Users, Shield, Fingerprint } from "lucide-react";
import { Link } from "wouter";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import type { ManifestationData, CardInteractionProps } from "./types";

interface VariantProps extends CardInteractionProps {
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

// ═══════════════════════════════════════════════════════════════════
// MUSIC CARD — waveform atmosphere, quick interaction
// ═══════════════════════════════════════════════════════════════════

export function MusicCard({ data, allData, dataIndex, onPlay }: VariantProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { state: playerState, currentTrackId, togglePlay, addAndPlay, playQueueAt } = usePlayer();
  const isCurrentlyPlaying = currentTrackId === String(data.id) && playerState.isPlaying;

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
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-400 group"
      style={{
        aspectRatio: "1/1",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Artwork */}
      <div className="absolute inset-0">
        {data.coverArtUrl && !imgError ? (
          <img src={data.coverArtUrl} alt="" className="w-full h-full object-cover transition-transform duration-600"
            style={{ filter: "brightness(0.85)", transform: hovered ? "scale(1.03)" : "scale(1)" }}
            onError={() => setImgError(true)} loading="lazy" draggable={false} />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #0a0a08, #1a1810)" }} />
        )}
      </div>

      {/* Waveform atmosphere overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] pointer-events-none transition-opacity duration-400"
        style={{ opacity: hovered ? 0.8 : 0.4 }}>
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
          <path d="M0,10 Q5,5 10,10 Q15,15 20,10 Q25,3 30,10 Q35,17 40,10 Q45,4 50,10 Q55,16 60,10 Q65,6 70,10 Q75,14 80,10 Q85,7 90,10 Q95,13 100,10"
            fill="none" stroke="rgba(196,154,40,0.3)" strokeWidth="0.5" />
          <path d="M0,10 Q10,2 20,10 Q30,18 40,10 Q50,1 60,10 Q70,19 80,10 Q90,3 100,10"
            fill="none" stroke="rgba(196,154,40,0.15)" strokeWidth="0.3" />
        </svg>
      </div>

      {/* Gradient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: hovered ? "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" : "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 35%)" }} />

      {/* Creator sigil */}
      {data.profilePhotoUrl && (
        <div className="absolute top-2 left-2 z-10">
          <img src={data.profilePhotoUrl} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-[rgba(196,154,40,0.2)]"
            style={{ opacity: hovered ? 1 : 0.6 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      {/* Play — sacred primary */}
      <button onClick={handlePlay}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full transition-all duration-300"
        style={{
          width: "44px", height: "44px",
          background: "rgba(0,0,0,0.5)", border: "1.5px solid rgba(196,154,40,0.6)",
          boxShadow: hovered ? "0 0 20px rgba(196,154,40,0.25)" : "0 0 8px rgba(196,154,40,0.1)",
          opacity: hovered ? 1 : 0.8,
        }}>
        {isCurrentlyPlaying ? <Pause size={16} fill="#C9A84C" style={{ color: "#C9A84C" }} /> : <Play size={16} fill="#C9A84C" style={{ color: "#C9A84C", marginLeft: "1px" }} />}
      </button>

      {/* Hover metadata */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 z-10 transition-all duration-400"
        style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(6px)" }}>
        <Link href={`/song/${data.id}`}>
          <p className="text-xs font-heading font-bold truncate" style={{ color: "#F5F5F5" }}>{data.title}</p>
        </Link>
        <Link href={`/creator/${data.userId}`}>
          <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(196,154,40,0.7)" }}>{data.artistName}</p>
        </Link>
      </div>

      {/* Default title */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-[5] transition-opacity duration-400" style={{ opacity: hovered ? 0 : 1 }}>
        <p className="text-[11px] font-heading font-bold truncate" style={{ color: "rgba(245,245,245,0.85)", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>{data.title}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMIC CARD — cover-focused, issue styling, reading emphasis
// ═══════════════════════════════════════════════════════════════════

export function ComicCard({ data }: VariantProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-400 group"
      style={{
        aspectRatio: "3/4",
        boxShadow: hovered
          ? "0 12px 40px rgba(0,0,0,0.6), -4px 0 20px rgba(0,0,0,0.3)"
          : "0 4px 16px rgba(0,0,0,0.4)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Cover art — full bleed, book-style */}
      <div className="absolute inset-0">
        {data.coverArtUrl && !imgError ? (
          <img src={data.coverArtUrl} alt="" className="w-full h-full object-cover"
            style={{ filter: "brightness(0.92)" }}
            onError={() => setImgError(true)} loading="lazy" draggable={false} />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(180deg, #1a1810, #0d0c08)" }} />
        )}
      </div>

      {/* Spine effect — left edge */}
      <div className="absolute top-0 left-0 bottom-0 w-[3px] z-20"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.6), transparent)" }} />

      {/* Gradient */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-400"
        style={{ background: hovered ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)" : "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 30%)" }} />

      {/* Reading CTA on hover */}
      {hovered && (
        <Link href={`/book/${data.id}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full mr-fade-in"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(196,154,40,0.5)" }}>
          <BookOpen size={13} style={{ color: "#C9A84C" }} />
          <span className="text-[10px] font-heading font-bold" style={{ color: "#C9A84C" }}>READ</span>
        </Link>
      )}

      {/* Creator sigil */}
      {data.profilePhotoUrl && (
        <div className="absolute top-2 left-2 z-10">
          <img src={data.profilePhotoUrl} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-[rgba(196,154,40,0.2)]"
            style={{ opacity: hovered ? 1 : 0.6 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      {/* Hover metadata */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 z-10 transition-all duration-400"
        style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(6px)" }}>
        <p className="text-xs font-heading font-bold truncate" style={{ color: "#F5F5F5" }}>{data.title}</p>
        <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(196,154,40,0.7)" }}>{data.artistName}</p>
      </div>

      {/* Default title */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-[5] transition-opacity duration-400" style={{ opacity: hovered ? 0 : 1 }}>
        <p className="text-[11px] font-heading font-bold truncate" style={{ color: "rgba(245,245,245,0.85)", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>{data.title}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MANUSCRIPT CARD — typography-driven, atmospheric archive styling
// ═══════════════════════════════════════════════════════════════════

export function ManuscriptCard({ data }: VariantProps) {
  const [hovered, setHovered] = useState(false);
  // Extract first line of text for preview
  const textPreview = (data.description || data.lyricsText || "").split("\n").filter(Boolean)[0]?.slice(0, 80);

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-400"
      style={{
        aspectRatio: "4/5",
        background: "linear-gradient(180deg, rgba(18,16,10,1), rgba(12,11,8,1))",
        border: hovered ? "1px solid rgba(196,154,40,0.2)" : "1px solid rgba(196,154,40,0.06)",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Parchment texture overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(196,154,40,0.03), transparent 70%)" }} />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-4 py-5 text-center">
        {/* Scroll icon */}
        <Scroll size={20} className="mb-3 transition-all duration-300" style={{ color: hovered ? "rgba(196,154,40,0.6)" : "rgba(196,154,40,0.25)" }} />

        {/* Title — typography-driven */}
        <Link href={`/book/${data.id}`}>
          <h4 className="font-heading font-bold text-sm leading-tight mb-2 transition-colors duration-300"
            style={{ color: hovered ? "#F5F5F5" : "rgba(232,223,200,0.7)", fontFamily: "'Georgia', serif" }}>
            {data.title}
          </h4>
        </Link>

        {/* Text preview */}
        {textPreview && (
          <p className="text-[9px] leading-relaxed italic transition-opacity duration-400 max-w-[85%]"
            style={{ color: "rgba(232,223,200,0.35)", opacity: hovered ? 0.7 : 0.4, fontFamily: "'Georgia', serif" }}>
            "{textPreview}..."
          </p>
        )}

        {/* Creator */}
        <Link href={`/creator/${data.userId}`} className="mt-3">
          <p className="text-[9px] font-heading tracking-wide transition-colors duration-300"
            style={{ color: hovered ? "rgba(196,154,40,0.7)" : "rgba(196,154,40,0.35)" }}>
            {data.artistName || "Unknown"}
          </p>
        </Link>

        {/* WID badge */}
        {data.wid && (
          <div className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.1)" }}>
            <Shield size={8} style={{ color: "rgba(196,154,40,0.4)" }} />
            <span className="text-[7px] font-heading font-bold tracking-widest" style={{ color: "rgba(196,154,40,0.4)" }}>WITNESSED</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GUIDE CARD — portrait/sigil focus, character identity emphasis
// ═══════════════════════════════════════════════════════════════════

export function GuideCard({ data }: VariantProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-400"
      style={{
        aspectRatio: "3/4",
        boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(196,154,40,0.05)" : "0 4px 16px rgba(0,0,0,0.4)",
        border: "1px solid",
        borderColor: hovered ? "rgba(196,154,40,0.2)" : "rgba(196,154,40,0.06)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Portrait artwork */}
      <div className="absolute inset-0">
        {data.coverArtUrl && !imgError ? (
          <img src={data.coverArtUrl} alt="" className="w-full h-full object-cover transition-transform duration-700"
            style={{ filter: "brightness(0.85) saturate(0.9)", transform: hovered ? "scale(1.02)" : "scale(1)" }}
            onError={() => setImgError(true)} loading="lazy" draggable={false} />
        ) : (
          <div className="w-full h-full" style={{ background: "radial-gradient(ellipse at center, #1a1810, #0a0908)" }} />
        )}
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />

      {/* Gradient */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-400"
        style={{ background: hovered ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)" : "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 30%)" }} />

      {/* Guide sigil — top center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 transition-all duration-300"
        style={{ opacity: hovered ? 1 : 0.5 }}>
        <Users size={14} style={{ color: "#C9A84C" }} />
      </div>

      {/* Hover metadata */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 z-10 text-center transition-all duration-400"
        style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(6px)" }}>
        <Link href={`/song/${data.id}`}>
          <p className="text-xs font-heading font-bold" style={{ color: "#F5F5F5" }}>{data.title}</p>
        </Link>
        <Link href={`/creator/${data.userId}`}>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(196,154,40,0.7)" }}>{data.artistName}</p>
        </Link>
      </div>

      {/* Default title */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-[5] text-center transition-opacity duration-400" style={{ opacity: hovered ? 0 : 1 }}>
        <p className="text-[11px] font-heading font-bold truncate" style={{ color: "rgba(245,245,245,0.85)", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>{data.title}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LORE CARD — ancient/record aesthetic, provenance-forward
// ═══════════════════════════════════════════════════════════════════

export function LoreCard({ data }: VariantProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-400"
      style={{
        aspectRatio: "1/1",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.3)",
        border: "1px solid",
        borderColor: hovered ? "rgba(196,154,40,0.2)" : "rgba(196,154,40,0.06)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Artwork with aged filter */}
      <div className="absolute inset-0">
        {data.coverArtUrl && !imgError ? (
          <img src={data.coverArtUrl} alt="" className="w-full h-full object-cover"
            style={{ filter: "brightness(0.75) sepia(0.15) saturate(0.8)" }}
            onError={() => setImgError(true)} loading="lazy" draggable={false} />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #12100a, #1a1610)" }} />
        )}
      </div>

      {/* Ancient texture overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 70%, rgba(196,154,40,0.04), transparent 60%)" }} />

      {/* Gradient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: hovered ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 75%)" : "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)" }} />

      {/* Provenance badge — always visible */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
        style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.15)" }}>
        <Fingerprint size={8} style={{ color: "rgba(196,154,40,0.6)" }} />
        <span className="text-[7px] font-heading font-bold tracking-widest" style={{ color: "rgba(196,154,40,0.5)" }}>LORE</span>
      </div>

      {/* Creator sigil */}
      {data.profilePhotoUrl && (
        <div className="absolute top-2 left-2 z-10">
          <img src={data.profilePhotoUrl} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-[rgba(196,154,40,0.2)]"
            style={{ opacity: hovered ? 1 : 0.5 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      {/* Hover metadata */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 z-10 transition-all duration-400"
        style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(6px)" }}>
        <Link href={`/song/${data.id}`}>
          <p className="text-xs font-heading font-bold truncate" style={{ color: "#F5F5F5" }}>{data.title}</p>
        </Link>
        <Link href={`/creator/${data.userId}`}>
          <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(196,154,40,0.7)" }}>{data.artistName}</p>
        </Link>
        {data.wid && (
          <div className="flex items-center gap-1 mt-1.5">
            <Shield size={8} style={{ color: "rgba(196,154,40,0.5)" }} />
            <span className="text-[8px] font-mono" style={{ color: "rgba(196,154,40,0.4)" }}>{data.wid.slice(0, 16)}…</span>
          </div>
        )}
      </div>

      {/* Default title */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-[5] transition-opacity duration-400" style={{ opacity: hovered ? 0 : 1 }}>
        <p className="text-[11px] font-heading font-bold truncate" style={{ color: "rgba(245,245,245,0.8)", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>{data.title}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SMART CARD — auto-selects the right variant based on medium type
// ═══════════════════════════════════════════════════════════════════

export function SmartManifestationCard(props: VariantProps) {
  const medium = props.data.contentType || props.data.medium || "audio";
  switch (medium) {
    case "comic": return <ComicCard {...props} />;
    case "manuscript": return <ManuscriptCard {...props} />;
    case "guide": return <GuideCard {...props} />;
    case "lore":
    case "archive": return <LoreCard {...props} />;
    default: return <MusicCard {...props} />;
  }
}
