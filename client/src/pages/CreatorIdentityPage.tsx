/**
 * CreatorIdentityPage — Public-facing Bio Page
 * 
 * Dual-layer identity architecture:
 * - Witness Identity Layer (human provenance layer)
 * - Distribution Identity Layer (industry-facing metadata)
 * 
 * Design direction: registry archive entry / museum placard / author provenance card
 * NOT a social media profile.
 */
import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Fingerprint, Shield, BookOpen, Music, Film, PenTool,
  Globe, ExternalLink, Crown, Sparkles, Archive, Scroll,
  ChevronRight, Copy, Check, MapPin
} from "lucide-react";
import { toast } from "sonner";

/* ─── Medium Icons ─────────────────────────────────────────────────────────── */
const MEDIUM_ICONS: Record<string, React.ReactNode> = {
  music: <Music className="w-3.5 h-3.5" />,
  books: <BookOpen className="w-3.5 h-3.5" />,
  comics: <PenTool className="w-3.5 h-3.5" />,
  manuscripts: <Scroll className="w-3.5 h-3.5" />,
  video: <Film className="w-3.5 h-3.5" />,
};

const MEDIUM_LABELS: Record<string, string> = {
  music: "Music",
  books: "Books",
  comics: "Comics",
  manuscripts: "Manuscripts",
  video: "Video",
};

/* ─── Section Divider ──────────────────────────────────────────────────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-6">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(196,154,40,0.3), transparent)" }} />
      <span
        className="text-[10px] font-heading tracking-[0.25em] uppercase select-none"
        style={{ color: "var(--ln-gold)", opacity: 0.7 }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(196,154,40,0.3), transparent)" }} />
    </div>
  );
}

/* ─── Identity Field ───────────────────────────────────────────────────────── */
function IdentityField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-heading tracking-[0.2em] uppercase" style={{ color: "var(--ln-iron)" }}>
        {label}
      </div>
      <p
        className={`text-[13px] leading-relaxed whitespace-pre-wrap ${mono ? "font-mono" : "font-body"}`}
        style={{ color: "var(--ln-parchment)" }}
      >
        {value}
      </p>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */
export default function CreatorIdentityPage() {
  const [, params] = useRoute("/identity/:id");
  const creatorId = params?.id ? parseInt(params.id, 10) : 0;
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: creator, isLoading } = trpc.profile.getById.useQuery(
    { userId: creatorId },
    { enabled: creatorId > 0 }
  );

  const { data: songCount } = trpc.songs.countByCreator.useQuery(
    { creatorId },
    { enabled: creatorId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void)" }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Fingerprint className="w-8 h-8" style={{ color: "var(--ln-gold)", opacity: 0.5 }} />
          <span className="text-[11px] font-heading tracking-widest" style={{ color: "var(--ln-iron)" }}>
            RESOLVING IDENTITY...
          </span>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void)" }}>
        <div className="text-center space-y-3">
          <Shield className="w-8 h-8 mx-auto" style={{ color: "var(--ln-iron)" }} />
          <p className="text-sm font-body" style={{ color: "var(--ln-smoke)" }}>Identity not found in the archive.</p>
          <Link href="/" className="text-xs font-heading tracking-widest" style={{ color: "var(--ln-gold)" }}>
            RETURN TO NEXUS
          </Link>
        </div>
      </div>
    );
  }

  const activeMediums = (creator.activeMediums as string[] | null) || [];
  const isOwner = user?.id === creator.id;
  const manifestationCount = songCount ?? creator.songSlotsUsed ?? 0;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/identity/${creator.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Identity link copied");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void)" }}>
      {/* ── Header Banner ── */}
      <div className="relative h-48 sm:h-64 overflow-hidden">
        {creator.bannerUrl ? (
          <img
            src={creator.bannerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `${creator.bannerPositionX ?? 50}% ${creator.bannerPositionY ?? 50}%` }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0a0906 0%, #1a1408 50%, #0a0906 100%)" }} />
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--ln-void) 0%, transparent 60%)" }} />
        {/* Gold border accent */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(196,154,40,0.4), transparent)" }} />
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-20 relative z-10 pb-20">

        {/* ── Identity Header ── */}
        <div className="flex items-end gap-4 sm:gap-6 mb-8">
          {/* Avatar / Sigil */}
          <div className="relative flex-shrink-0">
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden ring-2"
              style={{ boxShadow: "0 0 0 3px rgba(196,154,40,0.4)", background: "var(--ln-coal)" }}
            >
              {(creator.sigilUrl || creator.profilePhotoUrl) ? (
                <img
                  src={creator.sigilUrl || creator.profilePhotoUrl || ""}
                  alt={creator.name || "Creator"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Fingerprint className="w-10 h-10" style={{ color: "var(--ln-gold)", opacity: 0.4 }} />
                </div>
              )}
            </div>
            {/* WID badge */}
            {creator.founderWid && (
              <div
                className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider"
                style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.4)", color: "var(--ln-gold)" }}
              >
                WID
              </div>
            )}
          </div>

          {/* Name + Handle */}
          <div className="flex-1 min-w-0 pb-1">
            <h1
              className="text-2xl sm:text-4xl font-bold leading-tight truncate"
              style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
            >
              {creator.officialArtistName || creator.name || creator.artistHandle || "Unknown Creator"}
            </h1>
            {creator.artistHandle && (
              <p className="text-sm font-mono mt-0.5" style={{ color: "var(--ln-iron)" }}>
                @{creator.artistHandle}
              </p>
            )}
            {/* Role badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(creator as any).role === "founder" && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest"
                  style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }}
                >
                  <Crown className="w-3 h-3" /> FOUNDER
                </span>
              )}
              {creator.licenseStatus === "licensed" && (
                <span
                  className="text-[9px] px-2 py-0.5 rounded tracking-widest font-mono"
                  style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}
                >
                  LICENSED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Stats Strip ── */}
        <div
          className="flex items-center gap-6 px-5 py-3 rounded-xl mb-6"
          style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}
        >
          <div className="text-center">
            <div className="text-lg font-bold font-mono" style={{ color: "var(--ln-parchment)" }}>{manifestationCount}</div>
            <div className="text-[9px] font-heading tracking-widest" style={{ color: "var(--ln-iron)" }}>MANIFESTATIONS</div>
          </div>
          {activeMediums.length > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold font-mono" style={{ color: "var(--ln-parchment)" }}>{activeMediums.length}</div>
              <div className="text-[9px] font-heading tracking-widest" style={{ color: "var(--ln-iron)" }}>MEDIUMS</div>
            </div>
          )}
          <div className="flex-1" />
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all hover:opacity-80"
            style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Share"}
          </button>
          {isOwner && (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all hover:opacity-80"
              style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
            >
              Edit Identity <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* ── Active Mediums ── */}
        {activeMediums.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            {activeMediums.map((medium) => (
              <span
                key={medium}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body"
                style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)", color: "var(--ln-parchment)" }}
              >
                {MEDIUM_ICONS[medium] || <Sparkles className="w-3.5 h-3.5" />}
                {MEDIUM_LABELS[medium] || medium}
              </span>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* ── WITNESS IDENTITY LAYER ── */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        <SectionDivider label="Witness Identity" />

        <div
          className="rounded-2xl p-6 sm:p-8 space-y-6"
          style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}
        >
          {/* Bio / About */}
          {creator.bio && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-heading tracking-[0.2em] uppercase" style={{ color: "var(--ln-iron)" }}>
                ABOUT
              </div>
              <p className="text-[14px] leading-relaxed font-body" style={{ color: "var(--ln-parchment)" }}>
                {creator.bio}
              </p>
            </div>
          )}

          {/* Origin Statement */}
          <IdentityField label="ORIGIN STATEMENT" value={creator.originStatement} />

          {/* Creative Philosophy */}
          <IdentityField label="CREATIVE PHILOSOPHY" value={creator.creativePhilosophy} />

          {/* Creative Doctrine */}
          <IdentityField label="CREATIVE DOCTRINE" value={creator.creativeDoctrine} />

          {/* Archive Continuity */}
          <IdentityField label="ARCHIVE CONTINUITY" value={creator.archiveContinuity} />

          {/* Location */}
          {creator.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--ln-iron)" }} />
              <span className="text-[12px] font-body" style={{ color: "var(--ln-smoke)" }}>{creator.location}</span>
            </div>
          )}

          {/* WID Lineage */}
          {creator.founderWid && (
            <div className="space-y-1.5 pt-2">
              <div className="text-[10px] font-heading tracking-[0.2em] uppercase" style={{ color: "var(--ln-iron)" }}>
                WITNESS ID
              </div>
              <div
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-[12px]"
                style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                {creator.founderWid}
              </div>
            </div>
          )}

          {/* Empty state for own profile */}
          {isOwner && !creator.originStatement && !creator.creativePhilosophy && !creator.creativeDoctrine && (
            <div className="text-center py-8 space-y-3">
              <Archive className="w-8 h-8 mx-auto" style={{ color: "var(--ln-iron)", opacity: 0.4 }} />
              <p className="text-[12px] font-body" style={{ color: "var(--ln-smoke)" }}>
                Your witness identity is not yet established.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-body transition-all hover:opacity-80"
                style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
              >
                Establish Identity <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* ── DISTRIBUTION IDENTITY LAYER ── */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        <SectionDivider label="Distribution Identity" />

        <div
          className="rounded-2xl p-6 sm:p-8 space-y-5"
          style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}
        >
          {/* Official Artist Name */}
          {creator.officialArtistName && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-heading tracking-[0.2em] uppercase" style={{ color: "var(--ln-iron)" }}>
                OFFICIAL ARTIST NAME
              </div>
              <p className="text-[16px] font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                {creator.officialArtistName}
              </p>
              {creator.localizedName && (
                <p className="text-[12px] font-body" style={{ color: "var(--ln-smoke)" }}>
                  Also known as: {creator.localizedName}
                </p>
              )}
            </div>
          )}

          {/* Genre */}
          {creator.primaryGenre && (
            <IdentityField label="PRIMARY GENRE" value={creator.primaryGenre} />
          )}

          {/* Label */}
          {creator.labelName && (
            <IdentityField label="LABEL" value={creator.labelName} />
          )}

          {/* Producer Credits */}
          {creator.producerCredits && (
            <IdentityField label="PRODUCER / ENGINEER CREDITS" value={creator.producerCredits} />
          )}

          {/* DSP Profiles */}
          {(creator.dspSpotifyUrl || creator.dspAppleMusicUrl || creator.dspTikTokHandle) && (
            <div className="space-y-2">
              <div className="text-[10px] font-heading tracking-[0.2em] uppercase" style={{ color: "var(--ln-iron)" }}>
                EXISTING DSP PROFILES
              </div>
              <div className="flex flex-wrap gap-2">
                {creator.dspSpotifyUrl && (
                  <a
                    href={creator.dspSpotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all hover:opacity-80"
                    style={{ background: "rgba(30,215,96,0.08)", border: "1px solid rgba(30,215,96,0.2)", color: "#1ed760" }}
                  >
                    <Globe className="w-3 h-3" /> Spotify <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {creator.dspAppleMusicUrl && (
                  <a
                    href={creator.dspAppleMusicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all hover:opacity-80"
                    style={{ background: "rgba(252,60,68,0.08)", border: "1px solid rgba(252,60,68,0.2)", color: "#fc3c44" }}
                  >
                    <Globe className="w-3 h-3" /> Apple Music <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {creator.dspTikTokHandle && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ln-parchment)" }}
                  >
                    TikTok: @{creator.dspTikTokHandle}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Social / Web Links */}
          {(creator.website || creator.twitterHandle || creator.instagramHandle || creator.youtubeHandle) && (
            <div className="space-y-2">
              <div className="text-[10px] font-heading tracking-[0.2em] uppercase" style={{ color: "var(--ln-iron)" }}>
                WEB PRESENCE
              </div>
              <div className="flex flex-wrap gap-2">
                {creator.website && (
                  <a href={creator.website} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ln-parchment)" }}
                  >
                    <Globe className="w-3 h-3" /> Website <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {creator.twitterHandle && (
                  <a href={`https://twitter.com/${creator.twitterHandle}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ln-parchment)" }}
                  >
                    X / Twitter <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {creator.instagramHandle && (
                  <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ln-parchment)" }}
                  >
                    Instagram <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {creator.youtubeHandle && (
                  <a href={`https://youtube.com/@${creator.youtubeHandle}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ln-parchment)" }}
                  >
                    YouTube <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Empty state for own profile */}
          {isOwner && !creator.officialArtistName && !creator.dspSpotifyUrl && !creator.labelName && (
            <div className="text-center py-8 space-y-3">
              <Globe className="w-8 h-8 mx-auto" style={{ color: "var(--ln-iron)", opacity: 0.4 }} />
              <p className="text-[12px] font-body" style={{ color: "var(--ln-smoke)" }}>
                Your distribution identity is not yet configured.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-body transition-all hover:opacity-80"
                style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
              >
                Configure Distribution <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* ── View Full Profile Link ── */}
        <div className="text-center mt-8">
          <Link
            href={`/creator/${creator.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-heading tracking-widest transition-all hover:opacity-80"
            style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
          >
            VIEW FULL ARCHIVE <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ── Provenance Footer ── */}
        <div className="mt-12 text-center space-y-2">
          <div className="h-px mx-auto w-32" style={{ background: "linear-gradient(90deg, transparent, rgba(196,154,40,0.3), transparent)" }} />
          <p className="text-[10px] font-heading tracking-[0.2em]" style={{ color: "var(--ln-iron)" }}>
            LIVING NEXUS IDENTITY REGISTRY
          </p>
          <p className="text-[9px] font-body" style={{ color: "var(--ln-smoke)", opacity: 0.5 }}>
            Creator-owned. Provenance-backed. Permanently archived.
          </p>
        </div>
      </div>
    </div>
  );
}
