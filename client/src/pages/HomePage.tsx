/**
 * Home — Orientation porch (§9 Surface map)
 * Process, PNA/avatars, limited showcase, Discord, CTAs.
 * Guests may see, listen, and support. Signed-in enter PNA / Register.
 * Typography uses theme classes (font-display / font-heading / font-body)
 * so cream and dark cascades stay legible.
 */

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import {
  ShieldCheck, Users, ExternalLink, Play, Music, Heart,
  Sparkles, Compass, Upload, Fingerprint,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { useHarmonic } from "@/contexts/HarmonicContext";
import TipModal from "@/components/TipModal";
import { SKIN_IMAGES } from "@/components/FloatingAvatar";
import { DiscordGlyph } from "@/components/icons/DiscordGlyph";
import {
  DISCORD_COMMUNITY_URL,
  LOOP_PRODUCT,
  PNA_PRODUCT,
} from "@/lib/loopProduct";

type ShowcaseTrack = {
  id: number;
  title: string;
  coverArtUrl: string | null;
  fileUrl: string | null;
  genre: string | null;
  witnessId: string | null;
  artistHandle: string | null;
  artistName: string;
  creatorId: number | undefined;
  tipsEnabled: boolean;
};

/** Map canonical FeedRow { song, creator } into porch showcase shape. */
function mapWitnessedVoice(row: any): ShowcaseTrack {
  const song = row?.song ?? row;
  const creator = row?.creator ?? null;
  return {
    id: song?.id as number,
    title: (song?.title as string) ?? "Untitled Work",
    coverArtUrl: (song?.coverArtUrl as string | null) ?? null,
    fileUrl: (song?.fileUrl as string | null) ?? null,
    genre: (song?.genre as string | null) ?? null,
    witnessId: (song?.witnessId as string | null) ?? null,
    artistHandle: (creator?.artistHandle as string | null) ?? null,
    artistName: (creator?.artistHandle || creator?.name || "Creator") as string,
    creatorId: (creator?.id as number | undefined) ?? (song?.userId as number | undefined),
    tipsEnabled: song?.tipsEnabled !== false,
  };
}

const PROCESS_STEPS = [
  {
    n: "01",
    title: "Capture",
    body: "Bring a track into the stewarded workspace.",
  },
  {
    n: "02",
    title: "Steward",
    body: "PNA modes guide intent — Guide, Witness, Compose, Registry, Archive.",
  },
  {
    n: "03",
    title: "Seal",
    body: "Mint a Witness ID. Optional diary seal (WID-CNV) for threads and notes.",
  },
  {
    n: "04",
    title: "Register",
    body: "Choose Draft or Published. The registry holds the chain of record.",
  },
  {
    n: "05",
    title: "Discover",
    body: "Explore finds songs and artists. Creators meet through attributed work.",
  },
];

const AVATAR_PREVIEWS = [
  { id: "hooded-scholar", name: "Hooded Scholar" },
  { id: "conductor", name: "The Conductor" },
  { id: "witness", name: "The Witness" },
  { id: "archivist", name: "The Archivist" },
  { id: "cipher", name: "The Cipher" },
] as const;

export default function HomePage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addAndPlay } = usePlayer();
  const { isPlaying, hue, harmonicSig } = useHarmonic();
  const [tipTarget, setTipTarget] = useState<Track | null>(null);

  const { data: countData } = trpc.songs.getWitnessedCount.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
  const { data: voices } = trpc.songs.getWitnessedVoices.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
  const { data: featuredCreators } = trpc.profile.featuredCreators.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    document.title = "Living Nexus — Provenance-first music for creators";
  }, []);

  const showcaseTracks = useMemo(
    () => (voices ?? []).map(mapWitnessedVoice).filter((v: ShowcaseTrack) => v.id != null).slice(0, 6),
    [voices],
  );
  const creators = useMemo(() => {
    const list = Array.isArray(featuredCreators) ? featuredCreators : [];
    return list.slice(0, 6);
  }, [featuredCreators]);

  const enterPnaHref = isAuthenticated ? "/pna" : getLoginUrl("/pna");
  const registerHref = isAuthenticated ? "/manifest" : getLoginUrl("/manifest");
  const enterPnaLabel = authLoading || isAuthenticated ? "ENTER PNA" : "SIGN IN · ENTER PNA";
  const closingPnaLabel = authLoading || isAuthenticated ? "PNA WORKSPACE" : "SIGN IN";

  const openTip = (v: ShowcaseTrack) => {
    setTipTarget({
      id: String(v.id),
      title: v.title,
      artist: v.artistName,
      genre: v.genre || "",
      artUrl: v.coverArtUrl || undefined,
      audioUrl: v.fileUrl || undefined,
      witnessId: v.witnessId || undefined,
      creatorHandle: v.artistHandle || undefined,
      creatorId: v.creatorId,
      tipsEnabled: v.tipsEnabled,
    });
  };

  return (
    <>
      <Helmet>
        <title>Living Nexus — Provenance-first music for creators</title>
        <meta
          name="description"
          content="Orientation to Living Nexus: Witness IDs, Provenance Nexus Avatar, Explore songs & artists, and a stewarded creator OS. Guests can listen and support."
        />
      </Helmet>

      <div
        className={`cosmic-bg min-h-screen ln-atmosphere ln-breath-shell ${isPlaying ? "ln-breath-edge--playing" : "ln-breath-edge"}`}
        style={{
          position: "relative",
          ["--ln-breath-hue" as string]: isPlaying ? hue.toFixed(1) : "43",
          ["--ln-breath-sat" as string]: isPlaying ? harmonicSig.saturation.toFixed(1) : "62",
        }}
      >
        <div className={`ln-breath-plane ${isPlaying ? "ln-breath-plane--playing" : ""}`} aria-hidden />

        {/* ── Porch hero ── */}
        <section className="relative px-6 pt-14 pb-12 md:pt-20 md:pb-16 overflow-hidden z-[1]">
          <div className="relative max-w-4xl mx-auto text-center">
            <p
              className="font-heading text-[10px] uppercase tracking-[0.28em] mb-4 ln-breath-reveal"
              style={{ color: "var(--ln-gold-hot, var(--ln-gold))" }}
            >
              {LOOP_PRODUCT.fullName}
            </p>
            <h1
              className="font-display mb-4 ln-breath-reveal ln-breath-reveal-d1"
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                color: "var(--ln-parchment)",
                letterSpacing: "0.06em",
                lineHeight: 1.15,
                textShadow: "0 2px 28px rgba(0,0,0,0.45)",
              }}
            >
              Provenance first.
              <br />
              Music that can prove its origin.
            </h1>
            <p
              className="font-body max-w-xl mx-auto mb-8 ln-breath-reveal ln-breath-reveal-d2"
              style={{
                fontSize: "1.15rem",
                color: "var(--ln-bone)",
                lineHeight: 1.7,
              }}
            >
              Home is the porch: learn the process, meet the {PNA_PRODUCT.name}, hear a few sealed works.
              Guests may listen and support. Creators enter the stewarded cockpit to register and seal.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 ln-breath-reveal ln-breath-reveal-d3">
              <a
                href={enterPnaHref}
                className="font-heading inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90"
                style={{
                  background: "var(--ln-gold-hot, var(--ln-gold))",
                  color: "var(--ln-void)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  textDecoration: "none",
                  boxShadow: "0 0 28px color-mix(in srgb, var(--ln-gold) 28%, transparent)",
                }}
              >
                <Sparkles size={14} />
                {enterPnaLabel}
              </a>
              <Link href="/explore">
                <span
                  className="font-heading inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--ln-parchment) 28%, transparent)",
                    color: "var(--ln-parchment)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    background: "color-mix(in srgb, var(--ln-void) 55%, transparent)",
                  }}
                >
                  <Compass size={14} style={{ color: "var(--ln-gold-hot, var(--ln-gold))" }} />
                  EXPLORE SONGS
                </span>
              </Link>
              <a
                href={registerHref}
                className="font-heading inline-flex items-center gap-2 px-5 py-2.5 rounded-xl"
                style={{
                  border: "1px solid color-mix(in srgb, var(--ln-gold) 45%, transparent)",
                  color: "var(--ln-gold-hot, var(--ln-gold))",
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  textDecoration: "none",
                }}
              >
                <Upload size={14} />
                REGISTER
              </a>
            </div>
            {(countData?.count ?? 0) > 0 && (
              <p
                className="font-heading mt-6 text-xs ln-breath-reveal ln-breath-reveal-d4"
                style={{ color: "var(--ln-smoke)" }}
              >
                <Fingerprint size={12} className="inline mr-1.5" style={{ color: "var(--ln-gold)" }} />
                {(countData?.count ?? 0).toLocaleString()} works witnessed
              </p>
            )}
          </div>
        </section>

        <div className="relative z-[1] px-6">
          <div className="ln-breath-accent-line max-w-5xl mx-auto" aria-hidden />
        </div>

        {/* ── Process flow ── */}
        <section className="relative z-[1] px-6 py-12" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
          <div className="max-w-5xl mx-auto">
            <p
              className="font-heading text-[10px] uppercase tracking-[0.22em] mb-2 text-center"
              style={{ color: "var(--ln-gold)" }}
            >
              The process
            </p>
            <h2
              className="font-heading text-center mb-10"
              style={{ fontSize: "1.35rem", color: "var(--ln-parchment)" }}
            >
              From capture to discovery
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {PROCESS_STEPS.map((step) => (
                <div
                  key={step.n}
                  className="rounded-2xl p-4"
                  style={{
                    background: "var(--ln-obsidian)",
                    border: "1px solid var(--ln-panel-border)",
                  }}
                >
                  <div
                    className="font-heading text-[10px] mb-3"
                    style={{ color: "var(--ln-gold)", letterSpacing: "0.14em" }}
                  >
                    {step.n}
                  </div>
                  <h3 className="font-heading mb-2" style={{ fontSize: "0.95rem", color: "var(--ln-parchment)" }}>
                    {step.title}
                  </h3>
                  <p className="font-body" style={{ fontSize: "0.95rem", color: "var(--ln-smoke)", lineHeight: 1.55 }}>
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PNA + avatars ── */}
        <section className="relative z-[1] px-6 py-12" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p
                className="font-heading text-[10px] uppercase tracking-[0.22em] mb-2"
                style={{ color: "var(--ln-gold)" }}
              >
                {PNA_PRODUCT.fullName}
              </p>
              <h2 className="font-heading mb-3" style={{ fontSize: "1.45rem", color: "var(--ln-parchment)" }}>
                A stewarded creator OS — not a bolted-on chatbot.
              </h2>
              <p className="font-body mb-5" style={{ fontSize: "1.1rem", color: "var(--ln-bone)", lineHeight: 1.7 }}>
                Chat that can route into register, seal diaries, bind music, and grow avatar identity.
                Skins, slots, and personality locks live in the PNA store — same structure as the avatars below.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={enterPnaHref}
                  className="font-heading inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--ln-gold) 16%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--ln-gold) 40%, transparent)",
                    color: "var(--ln-gold)",
                    fontSize: "0.6rem",
                    letterSpacing: "0.08em",
                    textDecoration: "none",
                  }}
                >
                  OPEN PNA
                </a>
                <Link href="/avatar-registry">
                  <span
                    className="font-heading inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer"
                    style={{
                      border: "1px solid var(--ln-panel-border)",
                      color: "var(--ln-parchment)",
                      fontSize: "0.6rem",
                      letterSpacing: "0.08em",
                    }}
                  >
                    PNA STORE
                  </span>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_PREVIEWS.map((skin) => (
                <div key={skin.id} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full aspect-[3/4] rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--ln-panel-border)", background: "var(--ln-void)" }}
                  >
                    <img src={SKIN_IMAGES[skin.id]} alt={skin.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-heading text-[9px] text-center" style={{ color: "var(--ln-smoke)" }}>
                    {skin.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Limited showcase — guests can play / support ── */}
        <section className="relative z-[1] px-6 py-12" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p
                  className="font-heading text-[10px] uppercase tracking-[0.22em] mb-1"
                  style={{ color: "var(--ln-gold)" }}
                >
                  Limited showcase
                </p>
                <h2 className="font-heading" style={{ fontSize: "1.25rem", color: "var(--ln-parchment)" }}>
                  Sealed works & creators
                </h2>
              </div>
              <Link href="/explore">
                <span className="font-heading text-xs cursor-pointer" style={{ color: "var(--ln-gold)" }}>
                  Full Explore →
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
              {showcaseTracks.map((v: ShowcaseTrack) => (
                <div key={v.id} className="text-left group">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      if (!v.fileUrl) return;
                      addAndPlay({
                        id: String(v.id),
                        title: v.title,
                        artist: v.artistName,
                        artUrl: v.coverArtUrl || undefined,
                        audioUrl: v.fileUrl,
                        witnessId: v.witnessId || undefined,
                        genre: v.genre || "",
                        creatorHandle: v.artistHandle || undefined,
                        creatorId: v.creatorId,
                        tipsEnabled: v.tipsEnabled,
                      });
                    }}
                  >
                    <div
                      className="aspect-square rounded-xl overflow-hidden mb-2 relative ln-breath-cover ln-breath-cover-alive"
                      style={{
                        background: "var(--ln-obsidian)",
                        border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                      }}
                    >
                      {v.coverArtUrl ? (
                        <img src={v.coverArtUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={20} style={{ color: "var(--ln-gold)", opacity: 0.5 }} />
                        </div>
                      )}
                      <div
                        className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "var(--ln-gold)", color: "var(--ln-void)" }}
                      >
                        <Play size={12} fill="currentColor" />
                      </div>
                    </div>
                    <div className="font-heading truncate text-xs" style={{ color: "var(--ln-parchment)" }}>
                      {v.title}
                    </div>
                    <div className="font-body truncate text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                      @{v.artistHandle || "creator"}
                    </div>
                  </button>
                  {v.tipsEnabled && (
                    <button
                      type="button"
                      className="font-heading mt-1.5 inline-flex items-center gap-1 text-[10px] hover:opacity-90"
                      style={{ color: "var(--ln-gold)" }}
                      onClick={() => openTip(v)}
                    >
                      <Heart size={10} /> Support
                    </button>
                  )}
                </div>
              ))}
              {showcaseTracks.length === 0 && (
                <p className="font-body col-span-full text-sm" style={{ color: "var(--ln-smoke)" }}>
                  Witnessed works will appear here as the registry grows.
                </p>
              )}
            </div>

            {creators.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {creators.map((c: any) => {
                  const handle = c.artistHandle || c.handle;
                  const href = handle ? `/creator/${handle}` : c.id ? `/creator/${c.id}` : "/explore";
                  return (
                    <Link key={c.id || handle} href={href}>
                      <span
                        className="font-body inline-flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer"
                        style={{
                          background: "var(--ln-obsidian)",
                          border: "1px solid var(--ln-panel-border)",
                          color: "var(--ln-parchment)",
                          fontSize: "0.75rem",
                        }}
                      >
                        <Users size={12} style={{ color: "var(--ln-gold)" }} />
                        @{handle || c.name || "creator"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Discord ── */}
        <section className="relative z-[1] px-6 py-12" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
          <div
            className="max-w-3xl mx-auto rounded-2xl p-6 md:p-8"
            style={{
              background: "var(--ln-obsidian)",
              border: "1px solid var(--ln-panel-border)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--ln-gold) 22%, transparent)", color: "var(--ln-gold)" }}
              >
                <DiscordGlyph size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-heading mb-1" style={{ fontSize: "1.1rem", color: "var(--ln-parchment)" }}>
                  Community on Discord
                </h2>
                <p className="font-body" style={{ fontSize: "1.05rem", color: "var(--ln-smoke)", lineHeight: 1.6 }}>
                  Creators, witnesses, and stewards — process talk, feedback, and releases.
                </p>
              </div>
              <a
                href={DISCORD_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading inline-flex items-center gap-2 px-4 py-2.5 rounded-lg flex-shrink-0"
                style={{
                  background: "var(--ln-gold)",
                  color: "var(--ln-void)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                }}
              >
                JOIN DISCORD
              </a>
            </div>

            <div
              data-testid="discord-community-panel"
              className="rounded-xl p-5 md:p-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
              style={{
                border: "1px solid color-mix(in srgb, var(--ln-gold) 25%, transparent)",
                background: "color-mix(in srgb, var(--ln-void) 84%, var(--ln-panel))",
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--ln-gold) 14%, transparent)", color: "var(--ln-gold)" }}
                >
                  <DiscordGlyph size={17} />
                </div>
                <div>
                  <p className="font-heading text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ln-gold)" }}>
                    Direct community access
                  </p>
                  <p className="font-body mt-1" style={{ color: "var(--ln-smoke)", fontSize: "0.95rem", lineHeight: 1.55 }}>
                    Discord opens directly in its own trusted surface—no embedded feed, no endless load state.
                  </p>
                </div>
              </div>
              <a
                href={DISCORD_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg shrink-0"
                style={{
                  border: "1px solid color-mix(in srgb, var(--ln-gold) 45%, transparent)",
                  color: "var(--ln-gold)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                }}
              >
                OPEN COMMUNITY
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* ── Closing CTAs ── */}
        <section className="relative z-[1] px-6 py-14 text-center" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
          <ShieldCheck className="mx-auto mb-4" size={28} style={{ color: "var(--ln-gold)" }} />
          <h2 className="font-heading mb-3" style={{ fontSize: "1.35rem", color: "var(--ln-parchment)" }}>
            Easy to start. Hard to fake. Optional to go deep.
          </h2>
          <p className="font-body max-w-md mx-auto mb-6" style={{ color: "var(--ln-smoke)", fontSize: "1.05rem" }}>
            Guests can see and support. Signing in unlocks register, seal, manage, and the full PNA cockpit.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/explore">
              <span
                className="font-heading px-4 py-2 rounded-lg cursor-pointer inline-block"
                style={{ border: "1px solid var(--ln-panel-border)", color: "var(--ln-parchment)", fontSize: "0.65rem" }}
              >
                EXPLORE
              </span>
            </Link>
            <a
              href={enterPnaHref}
              className="font-heading px-4 py-2 rounded-lg inline-block"
              style={{ background: "var(--ln-gold)", color: "var(--ln-void)", fontSize: "0.65rem", textDecoration: "none" }}
            >
              {closingPnaLabel}
            </a>
          </div>
        </section>

        {tipTarget && (
          <TipModal track={tipTarget} onClose={() => setTipTarget(null)} originRect={null} />
        )}
      </div>
    </>
  );
}
