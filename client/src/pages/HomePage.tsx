/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — HomePage
   Messaging hierarchy v2:
     1. Emotional headline  — "Your work deserves to be witnessed, not lost"
     2. Micro-support line  — "No algorithms. No ownership loss. Just creation, proven."
     3. Technical subtext   — Witness ID / cryptographic explanation
     4. CTA pair            — Upload & Witness / Explore Witnessed Creations
     5. Founder's Era block — significance of early registry participation
     6. Genre filters + track grid (unchanged)
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import TrackCard from "@/components/TrackCard";
import TipModal from "@/components/TipModal";
import { Sparkles, ShieldCheck, Upload, Compass, Star, Lock, Fingerprint, Shield } from "lucide-react";
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
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);
  return <span>{display.toLocaleString()}</span>;
}

/** WID Trust Layer — animated counter + Witnessed Voices strip */
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

      {/* ── Witnessed Voices ── */}
      {voices && voices.length > 0 && (
        <div>
          <h3 className="font-heading text-[11px] tracking-[0.18em] uppercase mb-3" style={{ color: "oklch(0.55 0.03 280)" }}>
            Witnessed Voices
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
  const { state, addAndPlay, openNowPlayingPanel } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [activeGenre, setActiveGenre] = useState("All");
  const [tipTarget, setTipTarget] = useState<number | null>(null);

  // Stable query input — avoids infinite re-render from new object on every render
  const discoverInput = useMemo(() => ({
    genre: activeGenre === "All" ? undefined : activeGenre,
    limit: 48,
  }), [activeGenre]);

  const { data: discoverData, isLoading: discoverLoading } = trpc.songs.discover.useQuery(
    discoverInput,
    { staleTime: 30_000 }
  );

  const { data: trendingRaw } = trpc.songs.trending.useQuery(
    { limit: 5 },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // Map server songs to the Track shape expected by TrackCard / PlayerContext
  // getPublicSongs returns { song: {...}, creator: {...} } nested shape
  const tracks = useMemo(() => {
    if (!discoverData) return [];
    return discoverData.map((s: any) => {
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
    });
  }, [discoverData]);

  const trendingTracks = useMemo(() => {
    if (!trendingRaw) return [];
    return trendingRaw.map((s: any) => {
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
    });
  }, [trendingRaw]);

  const tipTrack = tipTarget !== null ? tracks[tipTarget] : null;

  return (
    <div className="animate-fade-up cosmic-bg min-h-screen">

      {/* ══════════════════════════════════════════════════════════════
          HERO — Emotional-first messaging hierarchy
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: "420px" }}>
        {/* Background image */}
        <img
          src={HERO_IMG}
          alt="Living Nexus"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.06_0.025_255)] via-[oklch(0.07_0.025_255)]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.06_0.025_255)] via-[oklch(0.07_0.025_255)]/40 to-transparent" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 0%, oklch(0.09 0.04 265 / 0.35) 40%, oklch(0.07 0.08 290 / 0.65) 100%)" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end px-6 pb-10 pt-16 max-w-3xl">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} className="text-[#D4AF37]" />
            <span className="text-[10px] font-heading tracking-[0.22em] uppercase text-[#D4AF37]">
              Living Nexus — Audio Provenance Platform
            </span>
          </div>

          {/* ① Emotional headline — primary message */}
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

          {/* ② Micro-support line — philosophical anchor */}
          <p
            className="font-body text-[14px] mb-5 tracking-wide"
            style={{ color: "oklch(0.82 0.025 280)" }}
          >
            No algorithms. No ownership loss. Just creation, proven.
          </p>

          {/* ③ Technical subtext — Witness ID explanation */}
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

          {/* ④ CTA pair */}
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
          FOUNDER'S ERA — Expanded significance block
      ══════════════════════════════════════════════════════════════ */}
      <div className="px-6 pt-8 pb-2">
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, oklch(0.10 0.055 285), oklch(0.12 0.04 270))",
            border: "1px solid oklch(0.84 0.155 85 / 0.18)",
          }}
        >
          {/* Subtle radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 50% at 10% 50%, oklch(0.84 0.155 85 / 0.06) 0%, transparent 70%)" }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
            {/* Icon */}
            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.84 0.155 85 / 0.12)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}
            >
              <Star size={22} style={{ color: "oklch(0.84 0.155 85)" }} />
            </div>

            {/* Text */}
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

              {/* Three pillars */}
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

              {/* CTA */}
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
          TRUST LAYER — WID counter + Witnessed Voices
      ══════════════════════════════════════════════════════════════ */}
      <WIDTrustLayer />

      <div className="px-6 py-5">
        {/* ── Genre icon cards ── */}
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

        {/* ── Featured section ── */}
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

        {/* ── Track grid ── */}
        {discoverLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl animate-pulse" style={{ background: "oklch(0.115 0.055 278)" }} />
            ))}
          </div>
        ) : tracks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5 mb-8">
            {tracks.map((track: typeof tracks[number], idx: number) => (
              <TrackCard
                key={track.id}
                track={track}
                index={idx}
                onTip={setTipTarget}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl mb-8"
            style={{ background: "oklch(0.10 0.03 270 / 0.5)", border: "1px dashed oklch(1 0 0 / 0.08)" }}
          >
            <p className="font-heading text-[14px] mb-1" style={{ color: "oklch(0.55 0.03 280)" }}>
              No tracks yet
            </p>
            <p className="text-[12px] font-body" style={{ color: "oklch(0.42 0.02 280)" }}>
              Be the first to upload a witnessed creation.
            </p>
          </div>
        )}

        {/* ── Trending section ── */}
        {trendingTracks.length > 0 && (
          <>
            <div className="gold-divider mb-6" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-[16px] tracking-wider text-white">Trending Now</h2>
              <span className="text-[10px] font-body uppercase tracking-widest" style={{ color: "oklch(0.55 0.03 280)" }}>By plays + likes + recency</span>
            </div>
            <div className="space-y-2">
              {trendingTracks.map((track, i) => {
                const isActive = state.tracks[state.currentIdx]?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group
                      ${isActive ? "bg-white/[0.06] border border-[#D4AF37]/20" : "hover:bg-white/[0.03] border border-transparent"}`}
                    onClick={() => { addAndPlay(track); openNowPlayingPanel(); }}
                  >
                    <span className="text-[13px] font-heading text-white/60 w-5 text-center">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
                      style={{ background: "oklch(0.16 0.02 280)" }}>
                      {track.artUrl
                        ? <img src={track.artUrl} alt={track.title} className="w-full h-full object-cover" style={{ objectPosition: `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%` }} />
                        : <div className="w-full h-full flex items-center justify-center text-white/60 text-lg">🎵</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-body text-white truncate">{track.title}</div>
                      <div className="text-[11px] truncate" style={{ color: "#E2E8F0" }}>{track.artist}</div>
                    </div>
                    <div className="text-[11px] font-body hidden sm:block" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {(track.plays || 0).toLocaleString()} plays
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Tip modal */}
      {tipTarget !== null && (
        <TipModal track={tipTrack} onClose={() => setTipTarget(null)} />
      )}
    </div>
  );
}
