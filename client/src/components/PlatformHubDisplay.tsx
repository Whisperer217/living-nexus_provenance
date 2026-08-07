import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Play, BookOpen, Code, Music, Video, Mic, Globe, ChevronDown, ChevronUp } from "lucide-react";

// ─── Platform metadata ────────────────────────────────────────────────────────
const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  youtube:      { label: "YouTube",        color: "#FF0000", icon: "video" },
  substack:     { label: "Substack",       color: "#FF6719", icon: "book" },
  spotify:      { label: "Spotify",        color: "#1DB954", icon: "music" },
  soundcloud:   { label: "SoundCloud",     color: "#FF5500", icon: "music" },
  bandcamp:     { label: "Bandcamp",       color: "#1DA0C3", icon: "music" },
  distrokid:    { label: "DistroKid",      color: "#00D4FF", icon: "music" },
  orcid:        { label: "ORCID",          color: "#A6CE39", icon: "book" },
  figshare:     { label: "Figshare",       color: "#E5522B", icon: "book" },
  zenodo:       { label: "Zenodo",         color: "#024D9E", icon: "book" },
  researchgate: { label: "ResearchGate",   color: "#00CCBB", icon: "book" },
  academia:     { label: "Academia.edu",   color: "#41A85F", icon: "book" },
  github:       { label: "GitHub",         color: "#6E40C9", icon: "code" },
  instagram:    { label: "Instagram",      color: "#E1306C", icon: "globe" },
  twitter:      { label: "X / Twitter",    color: "#1DA1F2", icon: "globe" },
  linkedin:     { label: "LinkedIn",       color: "#0A66C2", icon: "globe" },
  patreon:      { label: "Patreon",        color: "#FF424D", icon: "globe" },
  kofi:         { label: "Ko-fi",          color: "#FF5E5B", icon: "globe" },
  tiktok:       { label: "TikTok",         color: "#69C9D0", icon: "video" },
  twitch:       { label: "Twitch",         color: "#9146FF", icon: "video" },
  discord:      { label: "Discord",        color: "#5865F2", icon: "globe" },
  apple_music:  { label: "Apple Music",    color: "#FC3C44", icon: "music" },
  website:      { label: "Website",        color: "#D4AF37", icon: "globe" },
  custom:       { label: "Link",           color: "#888888", icon: "globe" },
};

function PlatformIconEl({ type, color, size = 16 }: { type: string; color: string; size?: number }) {
  const meta = PLATFORM_META[type];
  const iconType = meta?.icon ?? "globe";
  const Icon = iconType === "video" ? Video : iconType === "book" ? BookOpen : iconType === "code" ? Code : iconType === "music" ? Music : Globe;
  return (
    <div
      className="flex items-center justify-center rounded-lg flex-shrink-0"
      style={{ width: size + 10, height: size + 10, background: color + "20", border: `1px solid ${color}44` }}
    >
      <Icon size={size} style={{ color }} />
    </div>
  );
}

// ─── RSS preview items ────────────────────────────────────────────────────────
interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  thumbnail?: string;
}

function RssItemCard({ item, color }: { item: RssItem; color: string }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
      style={{ border: "1px solid rgba(255,255,255,0.05)" }}
    >
      {item.thumbnail && (
        <img src={item.thumbnail} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" style={{ border: `1px solid ${color}22` }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="line-clamp-2" style={{ fontSize: 12, color: "#E8DCC8", lineHeight: 1.4 }}>{item.title}</div>
        {item.pubDate && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {new Date(item.pubDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>
      <ExternalLink size={10} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0, marginTop: 2 }} />
    </a>
  );
}

// ─── Single platform panel ────────────────────────────────────────────────────
function PlatformPanel({ platform }: { platform: any }) {
  const meta = PLATFORM_META[platform.platformType] ?? { label: platform.platformType, color: "#888", icon: "globe" };
  const [expanded, setExpanded] = useState(true);

  let preview: { items: RssItem[]; fetchedAt?: string } | null = null;
  try {
    if (platform.cachedPreviewJson) preview = JSON.parse(platform.cachedPreviewJson);
  } catch { /* ignore */ }

  const hasPreview = preview && preview.items && preview.items.length > 0;

  // Spotify embed
  const isSpotify = platform.platformType === "spotify";
  const spotifyId = isSpotify ? platform.url.match(/artist\/([a-zA-Z0-9]+)/)?.[1] : null;

  // SoundCloud embed
  const isSoundCloud = platform.platformType === "soundcloud";

  // Bandcamp embed
  const isBandcamp = platform.platformType === "bandcamp";

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${meta.color}33`,
        boxShadow: `0 0 20px ${meta.color}08`,
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ borderBottom: expanded ? `1px solid ${meta.color}22` : "none" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <PlatformIconEl type={platform.platformType} color={meta.color} size={14} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E8DCC8" }}>
              {platform.displayName ?? meta.label}
            </div>
            {platform.description && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 1 }} className="line-clamp-1">{platform.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
            style={{ background: meta.color + "18", border: `1px solid ${meta.color}44`, color: meta.color }}
          >
            Visit <ExternalLink size={10} />
          </a>
          {expanded ? <ChevronUp size={14} style={{ color: "rgba(255,255,255,0.30)" }} /> : <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.30)" }} />}
        </div>
      </div>

      {/* Panel body */}
      {expanded && (
        <div className="p-4">
          {/* Spotify embed */}
          {isSpotify && spotifyId && (
            <iframe
              src={`https://open.spotify.com/embed/artist/${spotifyId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ borderRadius: 12 }}
            />
          )}

          {/* SoundCloud embed */}
          {isSoundCloud && (
            <iframe
              width="100%"
              height="166"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(platform.url)}&color=%23${meta.color.replace("#", "")}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
              style={{ borderRadius: 8 }}
            />
          )}

          {/* Bandcamp embed */}
          {isBandcamp && (
            <iframe
              style={{ border: 0, width: "100%", height: 120, borderRadius: 8 }}
              src={`https://bandcamp.com/EmbeddedPlayer/artist=0/size=large/bgcol=000000/linkcol=${meta.color.replace("#", "")}/transparent=true/`}
              seamless
            />
          )}

          {/* RSS preview items (YouTube, Substack, GitHub, Website) */}
          {hasPreview && !isSpotify && !isSoundCloud && !isBandcamp && (
            <div className="flex flex-col gap-2">
              {preview!.items.slice(0, 4).map((item, i) => (
                <RssItemCard key={i} item={item} color={meta.color} />
              ))}
              {preview!.fetchedAt && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", textAlign: "right", marginTop: 4 }}>
                  Updated {new Date(preview!.fetchedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Fallback: no preview, no embed — show a rich link card */}
          {!hasPreview && !isSpotify && !isSoundCloud && !isBandcamp && (
            <a
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              style={{ border: `1px solid ${meta.color}22` }}
            >
              <PlatformIconEl type={platform.platformType} color={meta.color} size={18} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, color: "#E8DCC8" }}>{platform.displayName ?? meta.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }} className="truncate">{platform.url}</div>
              </div>
              <ExternalLink size={14} style={{ color: meta.color, flexShrink: 0 }} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main display component ───────────────────────────────────────────────────
interface Props {
  userId: number;
  isOwner?: boolean;
  onEditClick?: () => void;
}

export function PlatformHubDisplay({ userId, isOwner, onEditClick }: Props) {
  const { data: platforms = [], isLoading } = trpc.platformHub.getByCreator.useQuery({ userId });

  if (isLoading) return null;
  if (platforms.length === 0 && !isOwner) return null;

  return (
    <section className="w-full">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: "0.18em", color: "rgba(212,175,55,0.70)" }}>
            PLATFORM HUB
          </h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {platforms.length === 0 ? "No platforms connected yet." : `${platforms.length} platform${platforms.length !== 1 ? "s" : ""} connected`}
          </p>
        </div>
        {isOwner && onEditClick && (
          <button
            onClick={onEditClick}
            className="px-3 py-1 rounded-lg text-xs"
            style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37" }}
          >
            Manage
          </button>
        )}
      </div>

      {/* Platform grid */}
      {platforms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {platforms.map((p: any) => (
            <PlatformPanel key={p.id} platform={p} />
          ))}
        </div>
      )}

      {/* Empty state for owner */}
      {platforms.length === 0 && isOwner && onEditClick && (
        <button
          onClick={onEditClick}
          className="w-full py-8 rounded-2xl text-center"
          style={{ border: "1px dashed rgba(212,175,55,0.20)", color: "rgba(255,255,255,0.30)", fontSize: 13 }}
        >
          + Connect your first platform (YouTube, Substack, ORCID, and more)
        </button>
      )}
    </section>
  );
}
