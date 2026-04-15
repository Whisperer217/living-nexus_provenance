import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Heart, Shield, Wrench, Star, Users, Bug } from "lucide-react";
import { trpc } from "@/lib/trpc";

/* ─── Contributor Data ───────────────────────────────────────────────────────
   To add a contributor: append an entry to the relevant section below.
   Fields: handle (display name), role (what they did), note (optional quote
   or detail), since (when they joined the mission).
──────────────────────────────────────────────────────────────────────────── */

const QA_TESTERS = [
  {
    handle: "Slimdoggy",
    role: "Quality Assurance — Discord",
    note: "Found more bugs in two weeks than most paid QA teams catch in a quarter. Reported the AI Disclosure display bug, the Discover filter dead-end, the publisher metadata drop, the anonymous comment attribution error, and the duration timestamp on non-audio works — all unprompted, all precise, all actionable. This platform is sharper because of him.",
    since: "April 2026",
  },
  {
    handle: "thiiirdgenkill",
    role: "Quality Assurance — Discord",
    note: "First to catch the missing tip confirmation on the song page — reported it immediately after donating, which led to the in-page gold banner and the site-wide toast repositioning. Also the voice behind the undo button on the lyrics editor. Every request was precise, practical, and creator-first.",
    since: "April 2026",
  },
];

const EARLY_BELIEVERS = [
  {
    handle: "Doc Seraph Mercer",
    role: "Founder — BDDT Publishing / Living Nexus",
    note: "Combat medic. The platform exists because he recognized a problem that the technology industry had not named: the seven-step extraction — diagnosis, testimony, routing, stripping of context, compounding, monetization — the same mechanism whether the institution is a hospital, a pharmaceutical company, or an AI training pipeline. He built the counter-architecture before the legal community had articulated the problem. The Witness ID system, the HAAI declaration, the Sovereign Stamp — these are doctrine made code. The doctrine: truth enters through witnesses, survives through return, and collapses when systems sever it from its origin. Living Nexus is the system that cannot sever it.",
    since: "January 2026",
  },
];

const COMMUNITY_VOICES: { handle: string; role: string; note?: string; since: string }[] = [
  // Add community members here as the platform grows
];

/* ─── Section Component ──────────────────────────────────────────────────── */
function ContributorCard({
  handle,
  role,
  note,
  since,
}: {
  handle: string;
  role: string;
  note?: string;
  since: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const initial = handle.charAt(0).toUpperCase();
  return (
    <div
      className="rounded-xl p-5 transition-all"
      style={{
        background: "rgba(212,175,55,0.03)",
        border: "1px solid rgba(212,175,55,0.12)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar initial */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
          style={{ background: "rgba(212,175,55,0.12)", color: "#CBB183" }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-base font-semibold" style={{ color: "#DACAAA" }}>
              {handle}
            </span>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "#3F4A50" }}
            >
              Since {since}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
            {role}
          </p>
          {note && (
            <>
              {expanded ? (
                <p className="text-sm mt-3 leading-relaxed" style={{ color: "#94a3b8" }}>
                  {note}
                </p>
              ) : (
                <p
                  className="text-sm mt-3 leading-relaxed line-clamp-2"
                  style={{ color: "#94a3b8" }}
                >
                  {note}
                </p>
              )}
              {note.length > 120 && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="text-xs mt-1.5 hover:underline"
                  style={{ color: "#CBB183" }}
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  contributors,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  contributors: { handle: string; role: string; note?: string; since: string }[];
}) {
  if (contributors.length === 0) return null;
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={16} style={{ color: "#CBB183" }} />
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#CBB183" }}>
          {title}
        </h2>
      </div>
      <p className="text-xs mb-5" style={{ color: "#475569" }}>
        {subtitle}
      </p>
      <div className="flex flex-col gap-3">
        {contributors.map(c => (
          <ContributorCard key={c.handle} {...c} />
        ))}
      </div>
    </section>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────────────────────── */
export default function AttributionPage() {
  const { data: buildStats } = trpc.platform.getBuildStats.useQuery(undefined, {
    staleTime: Infinity,
  });
  return (
    <div className="min-h-screen" style={{ background: "#1A2226", color: "#e2e8f0" }}>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "180px", background: "linear-gradient(135deg, #1A2226 0%, #2C3438 60%, #1A2226 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(212,175,55,0.3) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(212,175,55,0.3) 40px)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={18} style={{ color: "#CBB183" }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: "#CBB183" }}>
              Living Nexus
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-heading font-bold"
            style={{ color: "#DACAAA", letterSpacing: "0.04em" }}
          >
            Attribution
          </h1>
          <p className="text-sm mt-2 max-w-md" style={{ color: "#64748b" }}>
            The people who showed up before the platform was ready.
          </p>
        </div>
      </div>

      {/* ── Back nav ────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Link href="/manifesto">
          <a className="inline-flex items-center gap-1.5 text-xs hover:underline" style={{ color: "#64748b" }}>
            <ChevronLeft size={13} /> Manifesto
          </a>
        </Link>
      </div>

      {/* ── Intro ───────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
          Living Nexus was not built in a lab or funded by a venture firm. It was built in the margins — between shifts, between deployments, between doubt and conviction. The people listed here gave something more valuable than money: they gave attention, feedback, and belief when the platform was still rough. This page is the record of that.
        </p>
        <p className="text-sm leading-relaxed mt-3" style={{ color: "#94a3b8" }}>
          In the spirit of the Witness ID system, provenance matters. These names are the provenance of the community.
        </p>
      </div>

      {/* ── Sections ────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-20">
        <Section
          icon={Wrench}
          title="Quality Assurance"
          subtitle="Community members who tested the platform rigorously and reported issues that made it better."
          contributors={QA_TESTERS}
        />

        {/* ── Bug-Kill Tracker ─────────────────────────────────────────────────────────────────────── */}
        {buildStats && (
          <div
            className="mb-12 rounded-xl p-5"
            style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.18)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Bug size={16} style={{ color: "#f87171" }} />
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#f87171" }}>
                Build Integrity
              </h2>
            </div>
            <p className="text-xs mb-4" style={{ color: "#475569" }}>
              Every bug reported by the QA team was triaged, reproduced, and resolved. This counter reflects the
              cumulative build health of the platform across all sprints.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm tracking-widest"
                style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}
                title={`${buildStats.bugsFixed} bugs squashed across ${buildStats.totalCommits} commits`}
              >
                <Bug size={13} />
                BUGS KILLED &middot; {buildStats.bugsFixed}
              </div>
              <span className="text-xs" style={{ color: "#475569" }}>
                across {buildStats.totalCommits} commits
              </span>
            </div>
          </div>
        )}
        <Section
          icon={Shield}
          title="Founders & Architects"
          subtitle="The people who built the foundation and defined the mission."
          contributors={EARLY_BELIEVERS}
        />
        <Section
          icon={Users}
          title="Community Voices"
          subtitle="Early members of the Living Nexus Discord who shaped the direction of the platform."
          contributors={COMMUNITY_VOICES}
        />

        {/* ── Call to action ─────────────────────────────────────────── */}
        <div
          className="mt-4 rounded-xl p-5 text-center"
          style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}
        >
          <Star size={16} className="mx-auto mb-2" style={{ color: "#CBB183" }} />
          <p className="text-sm font-semibold mb-1" style={{ color: "#DACAAA" }}>
            Want to be part of this?
          </p>
          <p className="text-xs mb-3" style={{ color: "#64748b" }}>
            Join the Living Nexus Discord. Test things. Break things. Tell us what you find. The platform gets better because real people use it and speak up.
          </p>
          <a
            href="https://discord.gg/ADF9dtVA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors"
            style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "#CBB183" }}
          >
            Join the Discord
          </a>
          <a
            href="mailto:Jacob@commanddomains.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-amber-700/40 text-amber-300/80 hover:text-amber-200 hover:border-amber-600/60 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Jacob@commanddomains.com
          </a>
        </div>
      </div>
    </div>
  );
}
