/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — HomePage v3
   Layout hierarchy:
     1. Hero — emotional headline + CTAs
     2. Founder's Era block
     3. WID Trust Layer — counter + Witnessed Voices (8 panels, 2×4 grid)
     4. Featured Creators — horizontal panning carousel
     5. Genre filters
     6. Discover Tracks — side-pane horizontal scroll (2 rows × 12)
     7. Trending Now — side-pane horizontal scroll (2 rows × 12)
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import TrackCard from "@/components/TrackCard";
import TipModal from "@/components/TipModal";
import { Sparkles, ShieldCheck, Upload, Compass, Star, Lock, Fingerprint, Shield, Users, Play } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { WIDPanel } from "@/components/WIDPanel";

/** Animated counter that counts up from 0 to `target` over ~1.2 s */
function AnimatedCounter({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const duration = 1200;
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);
  return <span>{display.toLocaleString()}</span>;
}

/** WID Trust Layer — animated counter + Witnessed Voices (8 panels, 2×4) */
function WIDTrustLayer() {
  const { data: countData } = trpc.songs.getWitnessedCount.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: voices } = trpc.songs.getWitnessedVoices.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const total = countData?.count ?? 0;

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      {/* ── Animated WID counter ── */}
      <div
        className="flex items-center gap-4 rounded-2xl px-5 py-4"
        style={{
          background: "oklch(0.10 0.04 270 / 0.7)",
          border: "1px solid oklch(0.65 0.2 300 / 0.2)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "oklch(0.65 0.2 300 / 0.12)", border: "1px solid oklch(0.65 0.2 300 / 0.3)" }}
        >
          <Shield size={18} style={{ color: "oklch(0.65 0.2 300)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-widest mb-0.5 font-heading" style={{ color: "oklch(0.55 0.03 280)" }}>
            Works Witnessed
          </p>
          <p className="font-display text-[22px] leading-none" style={{ color: "oklch(0.65 0.2 300)" }}>
            <AnimatedCounter target={total} />
            <span className="text-[14px] ml-1.5 font-body" style={{ color: "oklch(0.5 0.03 280)" }}>and counting</span>
          </p>
        </div>
        <Fingerprint size={28} style={{ color: "oklch(0.65 0.2 300 / 0.18)", flexShrink: 0 }} />
      </div>

      {/* ── Witnessed Voices — 2×4 grid (8 panels) ── */}
      {voices && voices.length > 0 && (
        <div>
          <h3 className="font-heading text-[11px] tracking-[0.18em] uppercase mb-3" style={{ color: "oklch(0.55 0.03 280)" }}>
            Witnessed Voices
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {voices.map((v: typeof voices[number]) => (
              <div
                key={v.songId}
                className="flex items-center gap-2.5 rounded-xl p-2.5"
                style={{
                  background: "oklch(0.10 0.03 270 / 0.6)",
                  border: "1px solid oklch(1 0 0 / 0.06)",
                }}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden"
                  style={{ border: "1px solid oklch(0.65 0.2 300 / 0.2)" }}
                >
                  {v.profilePhotoUrl
                    ? <img src={v.profilePhotoUrl} alt={v.userName ?? ""} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs" style={{ background: "oklch(0.65 0.2 300 / 0.15)", color: "oklch(0.65 0.2 300)" }}>
                        {(v.artistHandle || v.userName || "?")[0].toUpperCase()}
                      </div>
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-body truncate" style={{ color: "oklch(0.85 0.02 85)" }}>
                    {v.title}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "oklch(0.55 0.03 280)" }}>
                    {v.artistHandle || v.userName}
                  </p>
                  {v.witnessId && (
                    <WIDPanel
                      witnessId={v.witnessId}
                      songTitle={v.title ?? undefined}
                      creatorName={v.artistHandle || v.userName || undefined}
                      registeredAt={v.createdAt}
                      coverArtUrl={v.coverArtUrl ?? undefined}
                      compact
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Featured Creators — horizontal panning carousel */
function FeaturedCreatorsCarousel() {
  const { data: creators } = trpc.profile.featuredCreators.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  if (!creators || creators.length === 0) return null;

  return (
    <div className="px-6 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-[13px] tracking-[0.14em] uppercase" style={{ color: "rgba(255,255,255,0.65)" }}>
          <Users size={13} className="inline mr-1.5 mb-0.5" />
          Creators
        </h3>
        <Link href="/contributors">
          <span className="text-[12px] cursor-pointer hover:text-[#D4AF37] transition-colors font-body" style={{ color: "#A78BFA" }}>
            See all
          </span>
        </Link>
      </div>

      {/* Horizontal scroll container */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {creators.map((creator: typeof creators[number]) => (
          <Link key={creator.id} href={`/creator/${creator.id}`}>
            <div
              className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.03] active:scale-95"
              style={{
                width: "96px",
                background: "oklch(0.10 0.03 270 / 0.7)",
                border: "1px solid oklch(1 0 0 / 0.07)",
              }}
            >
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "2px solid oklch(0.84 0.155 85 / 0.25)" }}
              >
                {creator.profilePhotoUrl
                  ? <img src={creator.profilePhotoUrl} alt={creator.artistHandle || creator.name || ""} className="w-full h-full object-cover" />
                  : <div
                      className="w-full h-full flex items-center justify-center text-lg font-heading font-bold"
                      style={{ background: "linear-gradient(135deg, oklch(0.65 0.2 300 / 0.25), oklch(0.84 0.155 85 / 0.15))", color: "oklch(0.84 0.155 85)" }}
                    >
                      {(creator.artistHandle || creator.name || "?")[0].toUpperCase()}
                    </div>
                }
              </div>

              {/* Name */}
              <div className="w-full text-center">
                <p
                  className="text-[11px] font-heading truncate"
                  style={{ color: "oklch(0.90 0.01 80)" }}
                >
                  {creator.artistHandle || creator.name}
                </p>
                <p className="text-[10px] font-body mt-0.5" style={{ color: "oklch(0.50 0.03 280)" }}>
                  {(creator.publishedCount as number) || 0} track{(creator.publishedCount as number) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Side-pane horizontal scroll track grid — 2 rows × N cards */
function HorizontalTrackGrid({
  tracks,
  loading,
  onTip,
  emptyMessage = "No tracks yet",
}: {
  tracks: any[];
  loading?: boolean;
  onTip?: (index: number, rect: DOMRect) => void;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 rounded-2xl animate-pulse"
            style={{ width: "160px", height: "220px", background: "oklch(0.115 0.055 278)" }}
          />
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 rounded-2xl mb-4"
        style={{ background: "oklch(0.10 0.03 270 / 0.5)", border: "1px dashed oklch(1 0 0 / 0.08)" }}
      >
        <p className="font-heading text-[14px] mb-1" style={{ color: "oklch(0.55 0.03 280)" }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Split tracks into two rows of up to 12 each
  const row1 = tracks.slice(0, 12);
  const row2 = tracks.slice(12, 24);

  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <div
        className="flex gap-4 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {row1.map((track, idx) => (
          <div key={track.id} className="flex-shrink-0" style={{ width: "160px" }}>
            <TrackCard track={track} index={idx} onTip={onTip} />
          </div>
        ))}
      </div>

      {/* Row 2 — only shown if there are enough tracks */}
      {row2.length > 0 && (
        <div
          className="flex gap-4 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {row2.map((track, idx) => (
            <div key={track.id} className="flex-shrink-0" style={{ width: "160px" }}>
              <TrackCard track={track} index={12 + idx} onTip={onTip} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Trending horizontal scroll — 2 rows × 12 cards using TrackCard */
function TrendingHorizontalGrid({
  tracks,
  onTip,
}: {
  tracks: any[];
  onTip?: (index: number, rect: DOMRect) => void;
}) {
  if (tracks.length === 0) return null;

  const row1 = tracks.slice(0, 12);
  const row2 = tracks.slice(12, 24);

  return (
    <div className="space-y-4">
      <div
        className="flex gap-4 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {row1.map((track, idx) => (
          <div key={track.id} className="flex-shrink-0" style={{ width: "160px" }}>
            <TrackCard track={track} index={idx} onTip={onTip} />
          </div>
        ))}
      </div>
      {row2.length > 0 && (
        <div
          className="flex gap-4 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {row2.map((track, idx) => (
            <div key={track.id} className="flex-shrink-0" style={{ width: "160px" }}>
              <TrackCard track={track} index={12 + idx} onTip={onTip} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const GENRE_CARDS = [
  { label: "All",        icon: null,    color: "#A78BFA" },
  { label: "Ambient",    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-book_038e31c9.png",      color: "#7dd3fc" },
  { label: "Gospel",    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-cross_39407625.png",     color: "#fbbf24" },
  { label: "Jazz",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-lyre_40247746.png",      color: "#c4b5fd" },
  { label: "Electronic",icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-fire-lyre_42893087.png", color: "#f97316" },
  { label: "Hip-Hop",   icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-eye_0e10b572.png",      color: "#fb923c" },
  { label: "Rock",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-guitar_41a22a6e.png",    color: "#f87171" },
  { label: "R&B",       icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-feather_40dcaa6d.png",   color: "#a78bfa" },
  { label: "Metal",     icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-guitar_41a22a6e.png",    color: "#ef4444" },
];

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-hero-76TJneE6NXajYSDJWHEXPg.webp";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [activeGenre, setActiveGenre] = useState("All");
  const [tipTarget, setTipTarget] = useState<number | null>(null);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);

  const discoverInput = useMemo(() => ({
    genre: activeGenre === "All" ? undefined : activeGenre,
    limit: 24,
  }), [activeGenre]);

  const { data: discoverData, isLoading: discoverLoading } = trpc.songs.discover.useQuery(
    discoverInput,
    { staleTime: 30_000 }
  );

  const trendingInput = useMemo(() => ({ limit: 24 }), []);
  const { data: trendingRaw } = trpc.songs.trending.useQuery(
    trendingInput,
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  const mapSong = (s: any) => {
    const song = s.song ?? s;
    const creator = s.creator ?? null;
    return {
      id: song.id,
      title: song.title ?? "Untitled Work",
      artist: creator?.artistHandle || creator?.name || "Unknown Creator",
      artUrl: song.coverArtUrl ?? undefined,
      audioSrc: song.fileUrl ?? "",
      genre: song.genre ?? undefined,
      plays: song.playCount ?? 0,
      witnessId: song.witnessId ?? undefined,
      coverPositionX: song.coverPositionX ?? 50,
      coverPositionY: song.coverPositionY ?? 50,
      artAspectRatio: song.artAspectRatio ?? "1:1",
      userId: song.userId,
      artistHandle: creator?.artistHandle ?? undefined,
      profilePhotoUrl: creator?.profilePhotoUrl ?? undefined,
      creatorId: creator?.id ?? undefined,
    };
  };

  const tracks = useMemo(() => (discoverData ?? []).map(mapSong), [discoverData]);
  const trendingTracks = useMemo(() => (trendingRaw ?? []).map(mapSong), [trendingRaw]);

  const tipTrack = tipTarget !== null ? tracks[tipTarget] ?? trendingTracks[tipTarget] : null;
  const handleTip = (index: number, rect: DOMRect) => { setTipTarget(index); setTipRect(rect); };

  return (
    <div className="animate-fade-up cosmic-bg min-h-screen">

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: "420px" }}>
        <img
          src={HERO_IMG}
          alt="Living Nexus"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.06_0.025_255)] via-[oklch(0.07_0.025_255)]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.06_0.025_255)] via-[oklch(0.07_0.025_255)]/40 to-transparent" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 0%, oklch(0.09 0.04 265 / 0.35) 40%, oklch(0.07 0.08 290 / 0.65) 100%)" }} />

        <div className="relative z-10 flex flex-col justify-end px-6 pb-10 pt-16 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} className="text-[#D4AF37]" />
            <span className="text-[10px] font-heading tracking-[0.22em] uppercase text-[#D4AF37]">
              Living Nexus — Audio Provenance Platform
            </span>
          </div>

          <h1
            className="font-display leading-tight mb-3"
            style={{
              fontSize: "clamp(1.9rem, 5vw, 3rem)",
              color: "oklch(0.97 0.006 80)",
              textShadow: "0 2px 24px oklch(0 0 0 / 0.6)",
            }}
          >
            Your work deserves to be<br />
            <span style={{ color: "oklch(0.84 0.155 85)" }}>witnessed</span>, not lost.
          </h1>

          <p
            className="font-body text-[14px] mb-5 tracking-wide"
            style={{ color: "oklch(0.82 0.025 280)" }}
          >
            No algorithms. No ownership loss. Just creation, proven.
          </p>

          <div
            className="flex items-start gap-3 mb-7 p-3 rounded-xl max-w-lg"
            style={{
              background: "oklch(0.10 0.04 270 / 0.75)",
              border: "1px solid oklch(0.84 0.155 85 / 0.22)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Fingerprint size={16} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.84 0.155 85)" }} />
            <p className="text-[12px] font-body leading-relaxed" style={{ color: "oklch(0.75 0.025 280)" }}>
              Every upload receives a{" "}
              <span className="font-semibold" style={{ color: "oklch(0.84 0.155 85)" }}>Witness ID (WID)</span>
              {" "}— a cryptographic fingerprint that permanently records your authorship on the blockchain.
              No one can claim your work. No system can erase it.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={isAuthenticated ? "/upload" : getLoginUrl("/upload")}>
              <button
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-heading font-bold text-[13px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, oklch(0.84 0.155 85), oklch(0.72 0.18 75))",
                  color: "oklch(0.08 0.015 280)",
                  boxShadow: "0 4px 20px oklch(0.84 0.155 85 / 0.35)",
                }}
              >
                <Upload size={14} />
                Upload &amp; Witness Your Work
              </button>
            </Link>
            <Link href="/explore">
              <button
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-heading font-bold text-[13px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "oklch(0.12 0.04 270 / 0.85)",
                  border: "1px solid oklch(0.84 0.155 85 / 0.35)",
                  color: "oklch(0.84 0.155 85)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <Compass size={14} />
                Explore Witnessed Creations
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FOUNDER'S ERA
      ══════════════════════════════════════════════════════════════ */}
      <div className="px-6 pt-8 pb-2">
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, oklch(0.10 0.055 285), oklch(0.12 0.04 270))",
            border: "1px solid oklch(0.84 0.155 85 / 0.18)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 50% at 10% 50%, oklch(0.84 0.155 85 / 0.06) 0%, transparent 70%)" }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.84 0.155 85 / 0.12)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}
            >
              <Star size={22} style={{ color: "oklch(0.84 0.155 85)" }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-heading tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: "oklch(0.84 0.155 85 / 0.12)",
                    border: "1px solid oklch(0.84 0.155 85 / 0.3)",
                    color: "oklch(0.84 0.155 85)",
                  }}
                >
                  Founder's Era
                </span>
                <span className="text-[10px] font-body" style={{ color: "oklch(0.55 0.03 280)" }}>
                  Limited — Early Registry
                </span>
              </div>

              <h2
                className="font-heading text-[17px] mb-2 leading-snug"
                style={{ color: "oklch(0.95 0.012 80)" }}
              >
                Be among the first creators in the Witness Registry
              </h2>

              <p className="text-[13px] font-body leading-relaxed mb-4" style={{ color: "oklch(0.72 0.025 280)" }}>
                The Founder's Era marks the earliest entries in Living Nexus's permanent audio provenance
                registry. Creators who upload during this period are not just sharing music — they are
                establishing the first anchors of a cryptographically-verified creative record that cannot
                be altered, disputed, or erased.
              </p>

              <p className="text-[13px] font-body leading-relaxed mb-4" style={{ color: "oklch(0.72 0.025 280)" }}>
                In an era where AI systems train on uncredited work and platforms routinely strip creator
                metadata, a Founder's Era WID is a timestamped declaration of origin. It says:{" "}
                <em style={{ color: "oklch(0.84 0.155 85)" }}>
                  "I was here. This is mine. The record proves it."
                </em>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                {([
                  {
                    Icon: ShieldCheck,
                    title: "Immutable Proof",
                    desc: "Your WID is written to a permanent ledger. No platform, no algorithm, no third party can overwrite it.",
                  },
                  {
                    Icon: Lock,
                    title: "Ownership on Record",
                    desc: "Founding creators receive the earliest registry timestamps — the strongest possible claim to authorship.",
                  },
                  {
                    Icon: Star,
                    title: "Founding Status",
                    desc: "Founder's Era creators are permanently distinguished in the registry as the builders of this platform's provenance foundation.",
                  },
                ] as const).map(p => (
                  <div
                    key={p.title}
                    className="rounded-xl p-3"
                    style={{
                      background: "oklch(0.08 0.03 270 / 0.6)",
                      border: "1px solid oklch(1 0 0 / 0.06)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5" style={{ color: "oklch(0.84 0.155 85)" }}>
                      <p.Icon size={14} />
                      <span className="text-[11px] font-heading tracking-wide">{p.title}</span>
                    </div>
                    <p className="text-[11px] font-body leading-relaxed" style={{ color: "oklch(0.62 0.025 280)" }}>
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <Link href={isAuthenticated ? "/upload" : getLoginUrl("/upload")}>
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                    style={{
                      background: "oklch(0.84 0.155 85 / 0.12)",
                      border: "1px solid oklch(0.84 0.155 85 / 0.4)",
                      color: "oklch(0.84 0.155 85)",
                    }}
                  >
                    <Upload size={13} />
                    Claim Your Founder's Era WID
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TRUST LAYER — WID counter + Witnessed Voices (8 panels)
      ══════════════════════════════════════════════════════════════ */}
      <WIDTrustLayer />

      {/* ══════════════════════════════════════════════════════════════
          FEATURED CREATORS — horizontal panning carousel
      ══════════════════════════════════════════════════════════════ */}
      <FeaturedCreatorsCarousel />

      {/* ══════════════════════════════════════════════════════════════
          GENRE FILTERS + DISCOVER TRACKS (side-pane horizontal scroll)
      ══════════════════════════════════════════════════════════════ */}
      <div className="px-6 py-5">
        {/* Genre icon cards */}
        <div className="mb-7">
          <h2 className="font-heading text-[13px] tracking-[0.14em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>Browse Genres</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {GENRE_CARDS.map(g => (
              <button
                key={g.label}
                onClick={() => setActiveGenre(g.label)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border group
                  ${activeGenre === g.label
                    ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.07]"
                    : "border-white/[0.06] bg-[oklch(0.14_0.013_280)] hover:border-white/[0.14] hover:bg-white/[0.04]"
                  }`}
              >
                {g.icon ? (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={g.icon}
                      alt={g.label}
                      className={`w-full h-full object-contain transition-all duration-200
                        ${activeGenre === g.label ? "scale-110 drop-shadow-lg" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"}`}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(135deg, #D4AF37, #7C3AED)" }}>
                    <span className="text-[11px] font-heading font-bold text-black">ALL</span>
                  </div>
                )}
                <span
                  className="text-[10px] font-body truncate w-full text-center transition-colors"
                  style={{ color: activeGenre === g.label ? g.color : "rgba(255,255,255,0.75)" }}
                >
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Discover Tracks header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-[16px] tracking-wider text-white">
            {activeGenre === "All" ? "Discover Tracks" : activeGenre}
          </h2>
          <Link href="/explore">
            <span className="text-[12px] text-[#A78BFA] cursor-pointer hover:text-[#D4AF37] transition-colors font-body">
              See all
            </span>
          </Link>
        </div>

        {/* Discover — horizontal 2-row scroll */}
        <div className="mb-8">
          <HorizontalTrackGrid
            tracks={tracks}
            loading={discoverLoading}
            onTip={handleTip}
            emptyMessage="Be the first to upload a witnessed creation."
          />
        </div>

        {/* ── Trending section ── */}
        {trendingTracks.length > 0 && (
          <>
            <div className="gold-divider mb-6" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-[16px] tracking-wider text-white">Trending Now</h2>
              <span className="text-[10px] font-body uppercase tracking-widest" style={{ color: "oklch(0.55 0.03 280)" }}>By plays + likes + recency</span>
            </div>

            {/* Trending — horizontal 2-row scroll */}
            <div className="mb-8">
              <TrendingHorizontalGrid
                tracks={trendingTracks}
                onTip={handleTip}
              />
            </div>
          </>
        )}
      </div>

      {/* Tip modal */}
      {tipTarget !== null && (
        <TipModal track={tipTrack} onClose={() => { setTipTarget(null); setTipRect(null); }} originRect={tipRect} />
      )}
    </div>
  );
}
