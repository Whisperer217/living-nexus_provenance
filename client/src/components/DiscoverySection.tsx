/**
 * DiscoverySection — Curated Manifestation Discovery Architecture
 * 
 * Replaces the uniform grid sections with a rhythmic, variable-size card flow:
 *   1. FEATURED REALMS — Large cinematic cards (curated/featured works)
 *   2. NEW ARRIVALS — Medium cards (recent uploads, rapid discovery)
 *   3. TRENDING THIS WEEK — Smart medium cards (auto-selects variant by medium)
 *   4. ACTIVE COLLABORATIONS — Micro cards (collaborative WIP, chains)
 *   5. HIDDEN REALMS — Micro cards (underground, experimental, low-play gems)
 * 
 * Design principles:
 *   - Surface simplicity, hidden depth
 *   - Breathable, intentional, modular, immersive, discoverable
 *   - NOT an endless algorithmic content dump
 *   - Spotify + Steam + Pinterest + Anytype atmosphere
 */
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { LargeManifestationCard } from "@/components/manifestation-cards/LargeManifestationCard";
import { MediumManifestationCard } from "@/components/manifestation-cards/MediumManifestationCard";
import { MicroManifestationCard } from "@/components/manifestation-cards/MicroManifestationCard";
import { SmartManifestationCard } from "@/components/manifestation-cards/MediumVariants";
import type { ManifestationData } from "@/components/manifestation-cards/types";
import { ManifestationReveal } from "@/components/ConstellationReveal";

/** Section header with atmospheric styling */
function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-[16px] sm:text-[18px] font-bold tracking-wide" style={{ color: "#E8DFC8" }}>
          {title}
        </h2>
        {href && (
          <Link href={href}>
            <ChevronRight size={16} className="transition-colors hover:text-[#C9A84C]" style={{ color: "rgba(196,154,40,0.4)" }} />
          </Link>
        )}
      </div>
      {subtitle && (
        <span className="text-[9px] font-heading uppercase tracking-[0.15em]" style={{ color: "rgba(107,101,85,0.7)" }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

/** Atmospheric divider between sections */
function SectionDivider() {
  return (
    <div className="py-6 flex items-center justify-center">
      <div className="w-16 h-[1px]" style={{ background: "linear-gradient(to right, transparent, rgba(196,154,40,0.2), transparent)" }} />
    </div>
  );
}

/** Map raw API song data to ManifestationData.
 *  The API returns { song: {...}, creator: {...}, likeCount } for trending,
 *  and flat song objects for discover. Handle both shapes.
 */
function mapToManifestation(raw: any): ManifestationData {
  // Detect nested vs flat structure
  const song = raw.song ?? raw;
  const creator = raw.creator ?? song.creator ?? {};
  const topLikeCount = raw.likeCount ?? song.likeCount;
  return {
    id: song.id,
    title: song.title || "Untitled",
    coverArtUrl: song.coverArtUrl,
    artistName: creator.artistHandle || creator.name || song.artistName || "Unknown",
    artistHandle: creator.artistHandle || song.artistHandle,
    profilePhotoUrl: creator.profilePhotoUrl || song.profilePhotoUrl,
    userId: song.userId || creator.id,
    genre: song.genre,
    wid: song.witnessId || song.wid,
    widShort: song.widShort,
    playCount: song.playCount,
    likeCount: topLikeCount,
    fileUrl: song.fileUrl,
    duration: song.durationSeconds || song.duration,
    aiDisclosure: song.aiDisclosure,
    contentType: song.contentType,
    description: song.description,
    lyricsText: song.lyricsText,
    totalFundingCents: song.totalFundingCents,
    tipCount: song.tipCount,
    medium: (song.contentType || "audio") as any,
    isCollaborative: (song.contributors?.length ?? 0) > 0,
  };
}

export function DiscoverySection() {
  // Fetch featured/curated works (top played — up to 6)
  const { data: featuredRaw } = trpc.songs.trending.useQuery(
    { limit: 6 },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // Fetch new arrivals (most recent)
  const { data: newArrivalsRaw } = trpc.songs.discover.useQuery(
    { limit: 8 },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // Fetch trending (by algorithm — separate call for different limit)
  const { data: trendingRaw } = trpc.songs.trending.useQuery(
    { limit: 12 },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // Fetch hidden realms (randomized older works — underground gems)
  const { data: hiddenRaw } = trpc.songs.discover.useQuery(
    { limit: 6, randomize: true },
    { staleTime: 120_000, refetchOnWindowFocus: false }
  );

  const featured = useMemo(() => (featuredRaw ?? []).map(mapToManifestation), [featuredRaw]);
  const newArrivals = useMemo(() => (newArrivalsRaw ?? []).map(mapToManifestation), [newArrivalsRaw]);
  const trending = useMemo(() => (trendingRaw ?? []).map(mapToManifestation), [trendingRaw]);
  const hidden = useMemo(() => (hiddenRaw ?? []).map(mapToManifestation), [hiddenRaw]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto lg:max-w-none">

      {/* ═══════════════════════════════════════════════════════════════
          1. FEATURED REALMS — Large cinematic cards
      ═══════════════════════════════════════════════════════════════ */}
      {featured.length > 0 && (
        <section>
          <SectionHeader title="Featured Realms" subtitle="Curated manifestations" href="/explore" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featured.slice(0, 2).map((item: ManifestationData, i: number) => (
              <ManifestationReveal key={item.id} index={i}>
                <LargeManifestationCard
                  data={item}
                  allData={featured}
                  dataIndex={i}
                />
              </ManifestationReveal>
            ))}
          </div>
          {/* Secondary featured — fill remaining slots (up to 4 more) */}
          {featured.length > 2 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {featured.slice(2, 6).map((item: ManifestationData, i: number) => (
                <MediumManifestationCard
                  key={item.id}
                  data={item}
                  allData={featured}
                  dataIndex={i + 2}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <SectionDivider />

      {/* ═══════════════════════════════════════════════════════════════
          2. NEW ARRIVALS — Medium cards, rapid discovery
      ═══════════════════════════════════════════════════════════════ */}
      {newArrivals.length > 0 && (
        <section>
          <SectionHeader title="New Arrivals" subtitle="Fresh manifestations" href="/explore?sort=newest" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {newArrivals.map((item: ManifestationData, i: number) => (
              <ManifestationReveal key={item.id} index={i}>
                <MediumManifestationCard
                  data={item}
                  allData={newArrivals}
                  dataIndex={i}
                />
              </ManifestationReveal>
            ))}
          </div>
        </section>
      )}

      <SectionDivider />

      {/* ═══════════════════════════════════════════════════════════════
          3. TRENDING THIS WEEK — Smart cards (auto-selects variant)
      ═══════════════════════════════════════════════════════════════ */}
      {trending.length > 0 && (
        <section>
          <SectionHeader title="Trending This Week" subtitle="Plays + likes + recency" href="/explore?sort=trending" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {trending.map((item: ManifestationData, i: number) => (
              <ManifestationReveal key={item.id} index={i}>
                <SmartManifestationCard
                  data={item}
                  allData={trending}
                  dataIndex={i}
                />
              </ManifestationReveal>
            ))}
          </div>
        </section>
      )}

      <SectionDivider />

      {/* ═══════════════════════════════════════════════════════════════
          4. HIDDEN REALMS — Micro cards, underground gems
      ═══════════════════════════════════════════════════════════════ */}
      {hidden.length > 0 && (
        <section>
          <SectionHeader title="Hidden Realms" subtitle="Underground · Experimental" href="/explore?sort=oldest" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {hidden.map((item: ManifestationData, i: number) => (
              <ManifestationReveal key={item.id} index={i}>
                <MicroManifestationCard
                  data={item}
                  allData={hidden}
                  dataIndex={i}
                />
              </ManifestationReveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
