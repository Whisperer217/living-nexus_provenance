import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface LexiconEntry {
  standard: string;
  nexus: string;
  meaning: string;
  category: "identity" | "action" | "record" | "space" | "economy";
}

const LEXICON: LexiconEntry[] = [
  // Identity
  {
    standard: "Follow",
    nexus: "Witness",
    meaning: "To formally acknowledge a creator's existence and work. Not a passive subscription — an act of recognition.",
    category: "identity",
  },
  {
    standard: "Follower",
    nexus: "Witness",
    meaning: "Someone who has chosen to stand in acknowledgment of your creative record. They see you.",
    category: "identity",
  },
  {
    standard: "Profile",
    nexus: "Identity",
    meaning: "Your sovereign record on the platform. Not a social page — a provenance anchor.",
    category: "identity",
  },
  {
    standard: "Username / Handle",
    nexus: "WID Handle",
    meaning: "Your artist name tied to your Witness ID. The name that appears on every record you create.",
    category: "identity",
  },
  {
    standard: "Verified Badge",
    nexus: "WITNESSED",
    meaning: "Status shown when your work has been formally acknowledged by the network.",
    category: "identity",
  },
  {
    standard: "Bio",
    nexus: "Origin Statement",
    meaning: "Where you came from and what you carry. Not a marketing blurb — a declaration of origin.",
    category: "identity",
  },

  // Record
  {
    standard: "Song / Track",
    nexus: "Work",
    meaning: "Any creative artifact you upload and protect. Music, art, writing — it's all a Work.",
    category: "record",
  },
  {
    standard: "Upload",
    nexus: "Register",
    meaning: "To submit a Work to the Living Nexus provenance system and receive a Witness ID.",
    category: "record",
  },
  {
    standard: "Song ID / Track ID",
    nexus: "WID (Witness ID)",
    meaning: "A unique, timestamped identifier permanently tied to your Work. Proof of origin.",
    category: "record",
  },
  {
    standard: "Library / Catalog",
    nexus: "Archive (LNA)",
    meaning: "Your complete registered catalog on Living Nexus. Every Work you've ever submitted.",
    category: "record",
  },
  {
    standard: "Blog Post / Article",
    nexus: "Field Note",
    meaning: "A written entry in your doctrine layer. Journal, manifesto, update, or concept — your voice on record.",
    category: "record",
  },
  {
    standard: "Citation / Credit",
    nexus: "Reference",
    meaning: "Formally linking your Work to another creator's WID as a source of influence or derivation.",
    category: "record",
  },
  {
    standard: "Derivative / Remix",
    nexus: "Transformation",
    meaning: "A new Work that traces its lineage to an existing WID. The chain of origin stays intact.",
    category: "record",
  },
  {
    standard: "Copyright",
    nexus: "Creator License",
    meaning: "Your formal declaration of ownership, backed by the platform's provenance record.",
    category: "record",
  },

  // Action
  {
    standard: "Like / Heart",
    nexus: "Witness a Work",
    meaning: "To formally acknowledge a specific piece of creative work. Not a reaction — a record.",
    category: "action",
  },
  {
    standard: "Share",
    nexus: "Carry",
    meaning: "To take someone's Work into your own network. You carry it — and the origin comes with it.",
    category: "action",
  },
  {
    standard: "Comment",
    nexus: "Leave a Mark",
    meaning: "A timestamped response attached to a Work. Part of the record.",
    category: "action",
  },
  {
    standard: "Tip / Donate",
    nexus: "Honor",
    meaning: "A direct financial acknowledgment sent to a creator. Not charity — reciprocity.",
    category: "action",
  },
  {
    standard: "Queue a Song",
    nexus: "Host a Slot",
    meaning: "To pay $0.88 to place a Work in the live Sanctuary queue. You chose it. It plays for the room.",
    category: "action",
  },

  // Space
  {
    standard: "Live Room / Session",
    nexus: "Sanctuary",
    meaning: "A live, shared listening space. A room where music plays in real time for everyone present.",
    category: "space",
  },
  {
    standard: "Playlist",
    nexus: "Sanctuary Queue",
    meaning: "The live sequence of Works playing in a Sanctuary. Built by the community, one slot at a time.",
    category: "space",
  },
  {
    standard: "Feed / Discover",
    nexus: "Discover",
    meaning: "The public catalog of registered Works available to the entire network.",
    category: "space",
  },
  {
    standard: "Trending / Charts",
    nexus: "Explore",
    meaning: "Works gaining acknowledgment across the network. Signal without manipulation.",
    category: "space",
  },
  {
    standard: "Notifications",
    nexus: "Signals",
    meaning: "Real-time alerts when your Work is witnessed, honored, or referenced by the network.",
    category: "space",
  },

  // Economy
  {
    standard: "Monetization",
    nexus: "Reciprocity",
    meaning: "The return of value to a creator for what they've given. Not monetization — acknowledgment with weight.",
    category: "economy",
  },
  {
    standard: "Subscription / Membership",
    nexus: "Creator License",
    meaning: "Your formal standing on the platform. Proof that your catalog is protected and your identity is registered.",
    category: "economy",
  },
  {
    standard: "Platform Fee",
    nexus: "Covenant",
    meaning: "The agreement between creator and platform. Living Nexus keeps 10%. Creators keep 90%.",
    category: "economy",
  },
  {
    standard: "DOI (Digital Object Identifier)",
    nexus: "WID (Witness ID)",
    meaning: "Where a DOI identifies where something lives, a WID identifies who made it and when. Origin over location.",
    category: "economy",
  },
];

const CATEGORY_LABELS: Record<LexiconEntry["category"], string> = {
  identity: "Identity",
  action: "Action",
  record: "Record",
  space: "Space",
  economy: "Economy",
};

const CATEGORY_COLORS: Record<LexiconEntry["category"], string> = {
  identity: "oklch(0.75 0.18 85)",    // gold
  action: "oklch(0.65 0.15 200)",     // teal
  record: "oklch(0.65 0.12 280)",     // indigo
  space: "oklch(0.65 0.14 320)",      // violet
  economy: "oklch(0.65 0.14 150)",    // sage
};

export default function LexiconPage() {
  const categories: LexiconEntry["category"][] = ["identity", "record", "action", "space", "economy"];

  return (
    <div className="min-h-screen" style={{ background: "#DACAAA" }}>
      {/* ── Header ── */}
      <div
        className="relative px-6 py-16 text-center border-b"
        style={{ borderColor: "oklch(0.75 0.18 85 / 0.15)" }}
      >
        {/* subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(oklch(0.75 0.18 85) 1px, transparent 1px), linear-gradient(90deg, oklch(0.75 0.18 85) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase mb-6"
            style={{ background: "oklch(0.75 0.18 85 / 0.12)", color: "oklch(0.75 0.18 85)", border: "1px solid oklch(0.75 0.18 85 / 0.25)" }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Platform Language
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.92 0.04 85)" }}
          >
            The Living Nexus Lexicon
          </h1>
          <p className="text-base leading-relaxed max-w-xl mx-auto" style={{ color: "oklch(0.6 0.04 280)" }}>
            This platform speaks a different language. Not because it's trying to be different — but because the words we use shape what we believe about creation, identity, and value. Here is the legend.
          </p>
        </div>
      </div>

      {/* ── Intro quote ── */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-4">
        <blockquote
          className="text-center text-lg italic leading-relaxed"
          style={{ color: "oklch(0.7 0.06 280)", borderLeft: "none" }}
        >
          "Words have power. Power has meaning. Meaning is what changes the internal state of the witness."
        </blockquote>
        <p className="text-center text-xs mt-2" style={{ color: "oklch(0.45 0.04 280)" }}>— Command Domains LLC</p>
      </div>

      {/* ── Term sections by category ── */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {categories.map((cat) => {
          const entries = LEXICON.filter((e) => e.category === cat);
          const color = CATEGORY_COLORS[cat];
          return (
            <section key={cat}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-2 h-6 rounded-full"
                  style={{ background: color }}
                />
                <h2
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color }}
                >
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="flex-1 h-px" style={{ background: `${color}22` }} />
              </div>

              {/* Term cards */}
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.nexus}
                    className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4"
                    style={{
                      background: "oklch(0.12 0.03 280 / 0.6)",
                      border: "1px solid oklch(0.2 0.04 280 / 0.5)",
                    }}
                  >
                    {/* Standard → Nexus */}
                    <div className="flex items-center gap-3 min-w-0 sm:w-72 flex-shrink-0">
                      <div className="text-center">
                        <p
                          className="text-xs font-medium tracking-wide uppercase mb-0.5"
                          style={{ color: "oklch(0.45 0.04 280)" }}
                        >
                          Elsewhere
                        </p>
                        <p
                          className="text-sm font-semibold line-through"
                          style={{ color: "oklch(0.5 0.04 280)", textDecorationColor: "oklch(0.5 0.04 280 / 0.5)" }}
                        >
                          {entry.standard}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.4 0.04 280)" }} />
                      <div className="text-center">
                        <p
                          className="text-xs font-medium tracking-wide uppercase mb-0.5"
                          style={{ color }}
                        >
                          Here
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "oklch(0.92 0.04 85)" }}
                        >
                          {entry.nexus}
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div
                      className="hidden sm:block w-px self-stretch"
                      style={{ background: "oklch(0.2 0.04 280 / 0.5)" }}
                    />

                    {/* Meaning */}
                    <p
                      className="text-sm leading-relaxed flex-1"
                      style={{ color: "oklch(0.65 0.04 280)" }}
                    >
                      {entry.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Footer CTA ── */}
      <div
        className="border-t px-6 py-16 text-center"
        style={{ borderColor: "oklch(0.75 0.18 85 / 0.15)" }}
      >
        <div className="max-w-xl mx-auto">
          <p className="text-base mb-6" style={{ color: "oklch(0.6 0.04 280)" }}>
            Ready to register your first Work and receive your Witness ID?
          </p>
          <Link href="/upload">
            <button
              className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all hover:opacity-90"
              style={{
                background: "oklch(0.75 0.18 85)",
                color: "#1E1020",
              }}
            >
              Register a Work →
            </button>
          </Link>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs" style={{ color: "oklch(0.4 0.04 280)" }}>
            <Link href="/doctrine/wid-spec" className="hover:underline" style={{ color: "oklch(0.55 0.06 280)" }}>
              Read the WID Specification
            </Link>
            <span>·</span>
            <Link href="/manifesto" className="hover:underline" style={{ color: "oklch(0.55 0.06 280)" }}>
              Read the Manifesto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
