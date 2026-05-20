/**
 * ManifestationBundle — Bundled Manifestation Experiences
 * 
 * Groups related works (soundtrack + comic + testimony, song + lore + manuscript)
 * into a single discoverable unit. Transforms the platform from "media hosting"
 * into "world discovery."
 * 
 * Visual: A card that shows multiple stacked layers with the primary work on top,
 * revealing the bundle contents on hover/tap.
 */
import { useState, useRef } from "react";
import { Play, Layers, Music, BookOpen, FileText, Scroll } from "lucide-react";
import { Link } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import type { ManifestationData } from "./types";

export interface BundleData {
  id: string;
  title: string;
  description?: string;
  creatorName: string;
  creatorId?: number;
  profilePhotoUrl?: string;
  items: ManifestationData[];
}

const MEDIUM_ICONS: Record<string, typeof Music> = {
  audio: Music,
  comic: BookOpen,
  manuscript: FileText,
  lyrics: Scroll,
};

export function ManifestationBundle({ bundle }: { bundle: BundleData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, addAndPlay, currentTrackId } = usePlayer();

  const primaryItem = bundle.items[0];
  const secondaryItems = bundle.items.slice(1);

  if (!primaryItem) return null;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primaryItem.fileUrl) {
      addAndPlay({
        id: String(primaryItem.id),
        title: primaryItem.title,
        artist: primaryItem.artistName,
        artUrl: primaryItem.coverArtUrl || "",
        audioUrl: primaryItem.fileUrl,
        songId: primaryItem.id,
      } as any);
    }
  };

  const isCurrentlyPlaying = currentTrackId === String(primaryItem.id) && state.isPlaying;

  return (
    <div
      ref={containerRef}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500"
      style={{
        background: "linear-gradient(145deg, rgba(28,26,20,0.95), rgba(17,16,9,0.98))",
        border: "1px solid rgba(196,154,40,0.12)",
        boxShadow: isExpanded
          ? "0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(196,154,40,0.08)"
          : "0 4px 20px rgba(0,0,0,0.3)",
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Primary work — cover art */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {primaryItem.coverArtUrl ? (
          <img
            src={primaryItem.coverArtUrl}
            alt={primaryItem.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #1C1A14, #2A2520)" }} />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background: "linear-gradient(to top, rgba(17,16,9,0.95) 0%, rgba(17,16,9,0.4) 40%, transparent 70%)",
            opacity: isExpanded ? 1 : 0.8,
          }}
        />

        {/* Bundle indicator — stacked layers icon */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(196,154,40,0.2)" }}>
          <Layers size={12} style={{ color: "#C49A28" }} />
          <span className="text-[10px] font-heading tracking-wide" style={{ color: "#C49A28" }}>
            {bundle.items.length} works
          </span>
        </div>

        {/* Play button */}
        {primaryItem.fileUrl && (
          <button
            onClick={handlePlay}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              background: isCurrentlyPlaying
                ? "linear-gradient(135deg, #C49A28, #F5C451)"
                : "rgba(196,154,40,0.15)",
              border: "1px solid rgba(196,154,40,0.4)",
              boxShadow: "0 0 15px rgba(196,154,40,0.2)",
            }}
          >
            <Play size={16} fill={isCurrentlyPlaying ? "#0a0812" : "#C49A28"} style={{ color: isCurrentlyPlaying ? "#0a0812" : "#C49A28" }} />
          </button>
        )}

        {/* Primary info overlay */}
        <div className="absolute bottom-4 left-4 right-16">
          <p className="text-[10px] font-heading uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(196,154,40,0.6)" }}>
            Manifestation Bundle
          </p>
          <h3 className="font-heading text-[16px] font-bold leading-tight truncate" style={{ color: "#E8DFC8" }}>
            {bundle.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            {bundle.profilePhotoUrl && (
              <img src={bundle.profilePhotoUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
            )}
            <span className="text-[11px] font-body" style={{ color: "rgba(232,223,200,0.6)" }}>
              {bundle.creatorName}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded bundle contents */}
      <div
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{
          maxHeight: isExpanded ? `${secondaryItems.length * 56 + 16}px` : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="p-3 space-y-1">
          {secondaryItems.map((item) => {
            const Icon = MEDIUM_ICONS[item.medium || "audio"] || Music;
            return (
              <Link key={item.id} href={item.medium === "comic" ? `/book/${item.id}` : `/song/${item.id}`}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-[rgba(196,154,40,0.06)] cursor-pointer"
                  style={{ border: "1px solid transparent" }}
                >
                  {/* Thumbnail */}
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.1)" }}>
                    {item.coverArtUrl ? (
                      <img src={item.coverArtUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon size={14} style={{ color: "rgba(196,154,40,0.5)" }} />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-body truncate" style={{ color: "#E8DFC8" }}>
                      {item.title}
                    </p>
                    <p className="text-[10px] font-body" style={{ color: "rgba(107,101,85,0.8)" }}>
                      {item.medium || "audio"}
                    </p>
                  </div>
                  {/* Medium icon */}
                  <Icon size={12} style={{ color: "rgba(196,154,40,0.3)" }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
