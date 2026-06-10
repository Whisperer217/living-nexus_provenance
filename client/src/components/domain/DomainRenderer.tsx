/**
 * DomainRenderer — Public-facing creator domain page.
 *
 * Renders the creator's domain as a sequence of Manifestation Blocks in
 * creator-defined order. Falls back to DEFAULT_DOMAIN_LAYOUT for new creators.
 *
 * This is the "visitor view" — read-only. The DomainEditor handles mutations.
 */

import { trpc } from "@/lib/trpc";
import { DEFAULT_DOMAIN_LAYOUT, type DomainBlockRecord, type ShelfBlockConfig, type ProvenanceTrailBlockConfig, type CustomTextBlockConfig, type DividerBlockConfig, type DistributionLinksBlockConfig, type FeaturedWorkBlockConfig, type BioBlockConfig, type HeroBlockConfig } from "@shared/domainTypes";
import { ShelfBlock } from "./ShelfBlock";
import { Shield, ExternalLink, Music2, Clock, Layers, Hash, Library, GitFork, Heart, Play } from "lucide-react";
import { Link } from "wouter";
import { usePlayer, type Track } from "@/contexts/PlayerContext";

interface DomainRendererProps {
  userId: number;
  isOwner?: boolean;
}

// ── Helper: resolve blocks (use saved or default) ─────────────────────────────
function resolveBlocks(saved: DomainBlockRecord[]): typeof DEFAULT_DOMAIN_LAYOUT {
  if (saved.length > 0) {
    return saved
      .filter((b) => b.visible)
      .sort((a, b) => a.position - b.position)
      .map((b) => ({
        blockType: b.blockType,
        position: b.position,
        visible: b.visible,
        size: b.size,
        config: (b.config as Record<string, unknown>) ?? {},
      }));
  }
  return DEFAULT_DOMAIN_LAYOUT.filter((b) => b.visible);
}

// ── HeroBlock ─────────────────────────────────────────────────────────────────
function HeroBlock({ userId, config }: { userId: number; config: HeroBlockConfig }) {
  const { data: creatorData } = trpc.profile.getCreator.useQuery({ creatorId: userId });
  const creator = creatorData?.creator;

  if (!creator) return null;

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: 280 }}>
      {/* Background: banner or gradient */}
      {creator.bannerUrl ? (
        <img src={creator.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      ) : (
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)" }} />
      )}
      {/* Gold vignette overlay */}
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(212,175,55,0.06) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 py-12 gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2"
            style={{ borderColor: "rgba(212,175,55,0.4)", boxShadow: "0 0 24px rgba(212,175,55,0.15)" }}>
            {creator.avatarUrl ? (
              <img src={creator.avatarUrl} alt={creator.displayName ?? creator.username}
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#111111]">
                <span className="text-3xl font-bold text-[#D4AF37]/60"
                  style={{ fontFamily: "var(--font-display)" }}>
                  {(creator.displayName ?? creator.username ?? "?")[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {/* WID badge */}
          {creator.witnessId && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "#000", border: "1px solid rgba(212,175,55,0.5)" }}>
              <Shield className="w-3 h-3 text-[#D4AF37]" />
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <h1 className="text-3xl font-bold text-white"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
            {creator.displayName ?? creator.username}
          </h1>
          {creator.artistHandle && (
            <p className="text-sm text-[#D4AF37]/60 mt-0.5">@{creator.artistHandle}</p>
          )}
        </div>

        {/* Origin statement */}
        {config.showOriginStatement !== false && creator.bio && (
          <p className="max-w-xl text-sm text-white/50 leading-relaxed"
            style={{ fontFamily: "var(--font-body)" }}>
            {creator.bio}
          </p>
        )}

        {/* Active mediums */}
        {config.showActiveMediums !== false && creator.activeMediums && (
          <div className="flex flex-wrap gap-2 justify-center">
            {(creator.activeMediums as string[]).map((m: string) => (
              <span key={m} className="px-2 py-0.5 rounded text-[10px] tracking-widest uppercase text-white/40"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BioBlock ──────────────────────────────────────────────────────────────────
function BioBlock({ userId, config }: { userId: number; config: BioBlockConfig }) {
  const { data: creatorData } = trpc.profile.getCreator.useQuery({ creatorId: userId });
  const creator = creatorData?.creator;

  if (!creator) return null;

  const hasContent = creator.philosophy || creator.doctrine || creator.bio;
  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      {creator.bio && (
        <div>
          <h4 className="text-xs tracking-widest uppercase text-white/30 mb-2"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em" }}>
            About
          </h4>
          <p className="text-sm text-white/60 leading-relaxed">{creator.bio}</p>
        </div>
      )}
      {config.showPhilosophy && creator.philosophy && (
        <div>
          <h4 className="text-xs tracking-widest uppercase text-white/30 mb-2"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em" }}>
            Philosophy
          </h4>
          <p className="text-sm text-white/60 leading-relaxed italic">{creator.philosophy}</p>
        </div>
      )}
      {config.showDoctrine && creator.doctrine && (
        <div>
          <h4 className="text-xs tracking-widest uppercase text-white/30 mb-2"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em" }}>
            Doctrine
          </h4>
          <p className="text-sm text-white/60 leading-relaxed">{creator.doctrine}</p>
        </div>
      )}
    </div>
  );
}

// ── DistributionLinksBlock ────────────────────────────────────────────────────
function DistributionLinksBlock({ userId, config }: { userId: number; config: DistributionLinksBlockConfig }) {
  const { data: creatorData } = trpc.profile.getCreator.useQuery({ creatorId: userId });
  const creator = creatorData?.creator;

  const links: Array<{ label: string; url: string; icon?: string }> = [];

  if (config.showSpotify && creator?.spotifyUrl) links.push({ label: "Spotify", url: creator.spotifyUrl });
  if (config.showAppleMusic && creator?.appleMusicUrl) links.push({ label: "Apple Music", url: creator.appleMusicUrl });
  if (config.showBandcamp && creator?.bandcampUrl) links.push({ label: "Bandcamp", url: creator.bandcampUrl });
  if (config.showSoundCloud && creator?.soundcloudUrl) links.push({ label: "SoundCloud", url: creator.soundcloudUrl });
  if (config.showTidal && creator?.tidalUrl) links.push({ label: "Tidal", url: creator.tidalUrl });
  if (config.showYouTube && creator?.youtubeUrl) links.push({ label: "YouTube", url: creator.youtubeUrl });
  if (config.customLinks) links.push(...config.customLinks);

  if (links.length === 0) return null;

  return (
    <div>
      {config.heading && (
        <h3 className="text-xs tracking-widest uppercase text-white/30 mb-3"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em" }}>
          {config.heading}
        </h3>
      )}
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white/60 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ExternalLink className="w-3 h-3" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ── ProvenanceTrailBlock ──────────────────────────────────────────────────────
function ProvenanceTrailBlock({ userId, config }: { userId: number; config: ProvenanceTrailBlockConfig }) {
  const maxItems = config.maxItems ?? 10;
  const { data: versions = [] } = trpc.domain.getPublicVersionHistory.useQuery(
    { userId, limit: maxItems },
    { enabled: !!userId }
  );
  // events not used in this block — removed to avoid type error

  if (versions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#D4AF37]/60" />
        <h3 className="text-xs tracking-widest uppercase text-white/30"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em" }}>
          Domain History
        </h3>
      </div>
      <div className="space-y-2">
        {versions.map((v: any) => (
          <div key={v.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
              <Layers className="w-2.5 h-2.5 text-[#D4AF37]/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50">
                Domain v{v.versionNumber}
                {v.changeNote && <span className="text-white/30"> — {v.changeNote}</span>}
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">
                {new Date(v.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CustomTextBlock ───────────────────────────────────────────────────────────
function CustomTextBlock({ config }: { config: CustomTextBlockConfig }) {
  if (!config.content && !config.heading) return null;

  const alignClass = config.alignment === "center" ? "text-center" : config.alignment === "right" ? "text-right" : "text-left";

  return (
    <div className={alignClass}>
      {config.heading && (
        <h3 className="text-sm font-semibold text-white/70 mb-2"
          style={{ fontFamily: "var(--font-display)" }}>
          {config.heading}
        </h3>
      )}
      {config.content && (
        <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">{config.content}</p>
      )}
    </div>
  );
}

// ── DividerBlock ──────────────────────────────────────────────────────────────
function DividerBlock({ config }: { config: DividerBlockConfig }) {
  if (config.style === "space") return <div className="h-8" />;
  if (config.style === "ornament") {
    return (
      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.2))" }} />
        <Hash className="w-3 h-3 text-[#D4AF37]/30" />
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.2), transparent)" }} />
      </div>
    );
  }
  return (
    <div className="h-px w-full"
      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
  );
}

// ── FeaturedWorkBlock ─────────────────────────────────────────────────────────
function FeaturedWorkBlock({ userId, config }: { userId: number; config: FeaturedWorkBlockConfig }) {
  const { data: creatorData } = trpc.profile.getCreator.useQuery({ creatorId: userId });
  const songs = creatorData?.songs ?? [];

  const featured = config.songIds?.length
    ? songs.filter((s: any) => config.songIds!.includes(s.id)).slice(0, 6)
    : songs.slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <div>
      {config.heading && (
        <h3 className="text-xs tracking-widest uppercase text-white/30 mb-3"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em" }}>
          {config.heading}
        </h3>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {featured.map((song: any) => (
          <Link key={song.id} href={`/track/${song.id}`}>
            <div className="group relative aspect-square overflow-hidden rounded cursor-pointer"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
              {song.coverArtUrl ? (
                <img src={song.coverArtUrl} alt={song.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)" }}>
                  <Music2 className="w-8 h-8 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 60%)" }}>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs text-white font-medium truncate">{song.title}</p>
                </div>
              </div>
              {song.witnessId && (
                <div className="absolute top-1.5 right-1.5">
                  <Shield className="w-3 h-3 text-[#D4AF37]" />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── CollectionsShelfBlock ─────────────────────────────────────────────────────
function CollectionPlayButton({ collectionId, collectionName }: { collectionId: number; collectionName: string }) {
  const { playQueueAt } = usePlayer();
  const utils = trpc.useUtils();

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await utils.client.collections.getTracksById.query({ collectionId });
      if (!result?.length) return;
      const tracks: Track[] = result
        .filter((t: any) => t.song?.fileUrl)
        .map((t: any) => ({
          id: String(t.song.id),
          title: t.song.title,
          artist: t.creator?.artistHandle ?? t.creator?.name ?? "Unknown",
          genre: t.song.genre ?? "",
          audioUrl: t.song.fileUrl ?? undefined,
          artUrl: t.song.coverArtUrl ?? undefined,
          witnessId: t.song.witnessId ?? undefined,
          creatorHandle: t.creator?.artistHandle ?? t.creator?.name ?? undefined,
          creatorId: t.creator?.id,
        }));
      if (tracks.length > 0) playQueueAt(tracks, 0, "PLAYLIST");
    } catch {
      // silently ignore
    }
  };

  return (
    <button
      onClick={handlePlay}
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}
      title={`Play ${collectionName}`}
    >
      <Play className="w-3 h-3 text-[#D4AF37] ml-0.5" />
    </button>
  );
}

function CollectionsShelfBlock({ userId, isOwner }: { userId: number; isOwner: boolean }) {
  const { data: collections = [], isLoading } = trpc.collections.listByUser.useQuery(
    { userId },
    { enabled: !!userId }
  );

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded bg-white/5" />)}
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    if (!isOwner) return null;
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        <Library className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No public collections yet.</p>
        <p className="text-xs mt-1">Create your first Manifested Collection from any song page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-[#D4AF37]/60" />
          <h3 className="text-xs tracking-widest uppercase text-white/30"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.14em" }}>
            Collections
          </h3>
        </div>
        {isOwner && (
          <Link href="/playlists">
            <span className="text-[10px] text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors cursor-pointer">Manage</span>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(collections as any[]).map((col: any) => (
          <Link key={col.id} href={`/collection/${col.slug}`}>
            <div className="group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}>
              {/* Cover art */}
              <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
                {col.coverArtUrl
                  ? <img src={col.coverArtUrl} alt={col.name} className="w-full h-full object-cover" />
                  : <Library className="w-5 h-5 text-[#D4AF37]/40" />}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">{col.name}</p>
                {col.forkedFromWid && (
                  <p className="text-[10px] text-[#D4AF37]/50 flex items-center gap-1 mt-0.5">
                    <GitFork className="w-2.5 h-2.5" /> Forked
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                    <Music2 className="w-2.5 h-2.5" /> {col.trackCount ?? 0}
                  </span>
                  <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5" /> {col.followerCount ?? 0}
                  </span>
                  <span className="text-[9px] font-mono text-[#D4AF37]/30 truncate">{col.wid}</span>
                </div>
              </div>
              {/* Play button — appears on hover */}
              {(col.trackCount ?? 0) > 0 && (
                <CollectionPlayButton collectionId={col.id} collectionName={col.name} />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Block wrapper ─────────────────────────────────────────────────────────────
function BlockWrapper({ size, children }: { size: string; children: React.ReactNode }) {
  const paddingClass = size === "full" ? "px-0" : "px-4";
  return (
    <div className={`w-full ${paddingClass}`}>
      {children}
    </div>
  );
}

// ── Main DomainRenderer ───────────────────────────────────────────────────────
export function DomainRenderer({ userId, isOwner = false }: DomainRendererProps) {
  const { data: savedBlocks = [], isLoading } = trpc.domain.getLayout.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const blocks = resolveBlocks(savedBlocks as DomainBlockRecord[]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {blocks.map((block, i) => {
        const cfg = block.config ?? {};

        return (
          <BlockWrapper key={`${block.blockType}-${i}`} size={block.size}>
            {block.blockType === "hero" && (
              <HeroBlock userId={userId} config={cfg as HeroBlockConfig} />
            )}
            {block.blockType === "bio" && (
              <BioBlock userId={userId} config={cfg as BioBlockConfig} />
            )}
            {block.blockType === "shelf_music" && (
              <ShelfBlock userId={userId} config={cfg as ShelfBlockConfig} medium="music" isOwner={isOwner} />
            )}
            {block.blockType === "shelf_books" && (
              <ShelfBlock userId={userId} config={cfg as ShelfBlockConfig} medium="books" isOwner={isOwner} />
            )}
            {block.blockType === "shelf_comics" && (
              <ShelfBlock userId={userId} config={cfg as ShelfBlockConfig} medium="comics" isOwner={isOwner} />
            )}
            {block.blockType === "shelf_manuscripts" && (
              <ShelfBlock userId={userId} config={cfg as ShelfBlockConfig} medium="manuscripts" isOwner={isOwner} />
            )}
            {block.blockType === "shelf_artifacts" && (
              <ShelfBlock userId={userId} config={cfg as ShelfBlockConfig} medium="artifacts" isOwner={isOwner} />
            )}
            {block.blockType === "shelf_merch" && (
              <ShelfBlock userId={userId} config={cfg as ShelfBlockConfig} medium="merch" isOwner={isOwner} />
            )}
            {block.blockType === "featured_work" && (
              <FeaturedWorkBlock userId={userId} config={cfg as FeaturedWorkBlockConfig} />
            )}
            {block.blockType === "distribution_links" && (
              <DistributionLinksBlock userId={userId} config={cfg as DistributionLinksBlockConfig} />
            )}
            {block.blockType === "provenance_trail" && (
              <ProvenanceTrailBlock userId={userId} config={cfg as ProvenanceTrailBlockConfig} />
            )}
            {block.blockType === "custom_text" && (
              <CustomTextBlock config={cfg as CustomTextBlockConfig} />
            )}
            {block.blockType === "divider" && (
              <DividerBlock config={cfg as DividerBlockConfig} />
            )}
            {block.blockType === "field_notes" && (
              <div className="text-sm text-white/30 italic">Field Notes coming soon</div>
            )}
            {block.blockType === "shelf_collections" && (
              <CollectionsShelfBlock userId={userId} isOwner={isOwner} />
            )}
          </BlockWrapper>
        );
      })}
    </div>
  );
}
