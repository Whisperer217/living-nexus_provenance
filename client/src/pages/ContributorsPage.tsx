/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Founding Creators / Contributors Page
   Honors the five creators who built the platform from the ground up.
   Date: March 20, 2026
═══════════════════════════════════════════════════════════════════ */

import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Award, ExternalLink } from "lucide-react";

/* ── Founder data ─────────────────────────────────────────────── */
interface Founder {
  id: number;
  displayName: string;
  discordName?: string;
  emoji: string;
  tags: string[];
  gradient: [string, string];
  photoUrl?: string;
}

const FOUNDERS: Founder[] = [
  {
    id: 1,
    displayName: "Doc Seraph Mercer",
    emoji: "🎖️",
    tags: ["Founder", "Combat Medic", "Architect of the Witness"],
    gradient: ["#7C3AED", "#A78BFA"],
  },
  {
    id: 2,
    displayName: "Mannon The Conquerer",
    discordName: "Thiiirdgenkill",
    emoji: "👑",
    tags: ["Founding Creator", "First Witness", "Gospel Warrior", "Catalog Pioneer"],
    gradient: ["#B45309", "#F59E0B"],
  },
  {
    id: 3,
    displayName: "Greg Speed",
    discordName: "MaxSpeed",
    emoji: "🎵🔧",
    tags: ["Founding Creator", "First QA", "Jah Roots", "Bug Hunter"],
    gradient: ["#065F46", "#34D399"],
  },
  {
    id: 4,
    displayName: "Slimdoggy",
    emoji: "⚖️",
    tags: ["Founding Creator", "Legal Scout", "Community Researcher"],
    gradient: ["#1E3A5F", "#60A5FA"],
  },
  {
    id: 5,
    displayName: "Kensrue",
    discordName: "Randall Smith",
    emoji: "🙏",
    tags: ["Founding Creator", "Rock Witness", "Father", "First Prayer"],
    gradient: ["#7F1D1D", "#F87171"],
  },
];

/* ── Gradient letter avatar ───────────────────────────────────── */
function LetterAvatar({
  name,
  gradient,
  size = 80,
}: {
  name: string;
  gradient: [string, string];
  size?: number;
}) {
  const letter = name.charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-display font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        fontSize: size * 0.38,
        boxShadow: `0 0 24px ${gradient[1]}55, 0 0 48px ${gradient[0]}33`,
      }}
    >
      {letter}
    </div>
  );
}

/* ── Founder card ─────────────────────────────────────────────── */
function FounderCard({
  founder,
  creators,
}: {
  founder: Founder;
  creators: Array<{ id: number; name: string | null }>;
}) {
  const [, navigate] = useLocation();

  const matchedCreator = creators.find((c) =>
    c.name?.toLowerCase().includes(founder.displayName.split(" ")[0].toLowerCase())
  );

  const handleViewProfile = () => {
    if (matchedCreator?.id) {
      navigate(`/creator/${matchedCreator.id}`);
    }
  };

  return (
    <article
      className="relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.13 0.018 280) 0%, oklch(0.10 0.012 280) 100%)",
        border: "1px solid oklch(1 0 0 / 0.08)",
        boxShadow: "0 4px 24px oklch(0 0 0 / 0.4)",
      }}
    >
      {/* Gold top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
        }}
      />

      {/* Card body */}
      <div className="p-6 flex flex-col gap-0 flex-1">

        {/* ── Founding Creator badge — in flow, top of card ── */}
        <div className="mb-4">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
            style={{
              background: "oklch(0.75 0.18 85 / 0.15)",
              border: "1px solid #D4AF37",
              color: "#D4AF37",
              boxShadow: "0 0 10px #D4AF3755, 0 0 20px #D4AF3722",
            }}
          >
            <Award size={10} />
            Founding Creator
          </span>
        </div>

        {/* ── Avatar + identity block ── */}
        <div className="flex items-start gap-4 mb-5">
          {founder.photoUrl ? (
            <img
              src={founder.photoUrl}
              alt={founder.displayName}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0 mt-0.5"
              style={{ boxShadow: `0 0 20px ${founder.gradient[1]}44` }}
            />
          ) : (
            <div className="flex-shrink-0 mt-0.5">
              <LetterAvatar name={founder.displayName} gradient={founder.gradient} size={64} />
            </div>
          )}
          <div className="min-w-0 flex flex-col gap-1">
            {/* Name on its own line */}
            <h3 className="font-display text-base leading-snug text-white break-words">
              {founder.displayName}
            </h3>
            {/* Emoji on its own line */}
            <p className="text-base leading-none" role="img" aria-label="emoji">
              {founder.emoji}
            </p>
            {/* Discord name on its own line */}
            {founder.discordName && (
              <p className="text-xs leading-snug" style={{ color: "oklch(0.65 0.06 280)" }}>
                ({founder.discordName})
              </p>
            )}
            {/* Date on its own line */}
            <p
              className="text-[10px] tracking-widest uppercase leading-snug"
              style={{ color: "oklch(0.45 0.04 280)" }}
            >
              March 20, 2026
            </p>
          </div>
        </div>

        {/* ── Contribution tags ── */}
        <div className="flex flex-wrap gap-2 mb-5">
          {founder.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-[11px] font-medium leading-none"
              style={{
                background: "oklch(1 0 0 / 0.06)",
                border: "1px solid oklch(1 0 0 / 0.12)",
                color: "oklch(0.82 0.04 280)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* ── View Profile button ── */}
        <div className="mt-auto pt-4">
          <button
            onClick={handleViewProfile}
            disabled={!matchedCreator?.id}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: matchedCreator?.id
                ? "oklch(0.75 0.18 85 / 0.12)"
                : "oklch(1 0 0 / 0.05)",
              border: `1px solid ${matchedCreator?.id ? "#D4AF3766" : "oklch(1 0 0 / 0.08)"}`,
              color: matchedCreator?.id ? "#D4AF37" : "oklch(0.6 0.04 280)",
            }}
          >
            <ExternalLink size={13} />
            View Creator Profile
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function ContributorsPage() {
  const { data: creatorsRaw } = trpc.profile.allCreators.useQuery(undefined, {
    staleTime: 60_000,
  });
  const creators: Array<{ id: number; name: string | null }> = creatorsRaw ?? [];

  return (
    <div
      className="min-h-full w-full"
      style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* ── Hero header ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.14 0.04 290) 0%, oklch(0.09 0.02 280) 100%)",
          borderBottom: "1px solid oklch(1 0 0 / 0.07)",
        }}
      >
        {/* Decorative gold glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, #D4AF3715 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
          {/* Date badge */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span
              className="px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase"
              style={{
                background: "oklch(0.75 0.18 85 / 0.12)",
                border: "1px solid #D4AF37",
                color: "#D4AF37",
                boxShadow: "0 0 16px #D4AF3733",
              }}
            >
              <Award size={11} className="inline mr-1.5 -mt-0.5" />
              March 20, 2026 · Genesis Day
            </span>
          </div>

          <h1
            className="font-display text-4xl sm:text-5xl md:text-6xl mb-6 leading-tight"
            style={{
              background: "linear-gradient(135deg, #FFFFFF 30%, #D4AF37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Founding Creators
          </h1>

          <blockquote
            className="max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed font-body italic"
            style={{ color: "oklch(0.78 0.04 280)" }}
          >
            "These are the ones who showed up first. Before the platform was finished.
            Before the world knew. They came anyway."
          </blockquote>

          <div className="mt-8 flex items-center justify-center gap-3">
            <div
              className="h-px w-16"
              style={{ background: "linear-gradient(90deg, transparent, #D4AF37)" }}
            />
            <span className="text-[#D4AF37] text-lg">✦</span>
            <div
              className="h-px w-16"
              style={{ background: "linear-gradient(90deg, #D4AF37, transparent)" }}
            />
          </div>
        </div>
      </div>

      {/* ── Founders grid ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FOUNDERS.map((founder) => (
            <FounderCard key={founder.id} founder={founder} creators={creators} />
          ))}
        </div>

        {/* ── Footer inscription ── */}
        <div className="mt-16 text-center">
          <div className="inline-block">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-px w-24"
                style={{
                  background: "linear-gradient(90deg, transparent, #D4AF3755)",
                }}
              />
              <span style={{ color: "#D4AF37", opacity: 0.6 }}>✦</span>
              <div
                className="h-px w-24"
                style={{
                  background: "linear-gradient(90deg, #D4AF3755, transparent)",
                }}
              />
            </div>
            <p
              className="text-sm font-body italic"
              style={{ color: "oklch(0.5 0.04 280)" }}
            >
              Living Nexus — Sovereign music. Cryptographic provenance. Creator-owned.
            </p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.4 0.03 280)" }}>
              Genesis Day · March 20, 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
