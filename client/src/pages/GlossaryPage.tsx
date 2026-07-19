/*
  LIVING NEXUS — GlossaryPage
  ═══════════════════════════════════════════════════════════════════
  Full platform glossary for newcomers. Covers all Living Nexus
  concepts, HA AI terminology, WID/provenance system, community
  vocabulary, and platform features — in plain, accessible language.

  Route: /glossary
  ═══════════════════════════════════════════════════════════════════
*/
import { useState, useMemo } from "react";
import { Search, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlossaryTerm {
  term: string;
  definition: string;
  section: SectionKey;
  isCore?: boolean; // highlight foundational terms
}

type SectionKey =
  | "platform"
  | "identity"
  | "wid"
  | "haai"
  | "community"
  | "discovery"
  | "economy"
  | "features"
  | "doctrine";

// ─── Section Metadata ─────────────────────────────────────────────────────────
const SECTIONS: Record<SectionKey, { label: string; color: string; description: string }> = {
  platform: {
    label: "The Platform",
    color: "#C49A28",
    description: "What Living Nexus is and how it works at the highest level.",
  },
  identity: {
    label: "Identity & Authorship",
    color: "#7B9E87",
    description: "Who you are on the platform and how authorship is established.",
  },
  wid: {
    label: "The WID System",
    color: "#8B7EC8",
    description: "Witness IDs, provenance records, and cryptographic proof of origin.",
  },
  haai: {
    label: "HA AI — Human Authored, AI Assisted",
    color: "#C87B4A",
    description: "How Living Nexus classifies and protects works created with AI tools.",
  },
  community: {
    label: "Community & Recognition",
    color: "#4A9EC8",
    description: "How creators and listeners interact, acknowledge, and support each other.",
  },
  discovery: {
    label: "Discovery & Navigation",
    color: "#9EC84A",
    description: "How to find works, creators, and spaces on the platform.",
  },
  economy: {
    label: "Economy & Licensing",
    color: "#C84A7B",
    description: "How value flows between creators and their communities.",
  },
  features: {
    label: "Platform Features",
    color: "#4AC8C8",
    description: "Tools and capabilities built into Living Nexus.",
  },
  doctrine: {
    label: "Core Doctrine",
    color: "#C49A28",
    description: "The foundational principles that Living Nexus is built on.",
  },
};

// ─── Glossary Data ─────────────────────────────────────────────────────────────
const GLOSSARY: GlossaryTerm[] = [
  // ── Platform ──────────────────────────────────────────────────────────────
  {
    term: "Living Nexus",
    section: "platform",
    isCore: true,
    definition:
      "A creative provenance platform built for musicians, writers, artists, and creators. Living Nexus is not a streaming service or a social network. It is a system for registering, protecting, and preserving creative works — so that every work you create has a permanent, timestamped record of who made it, when, and why.",
  },
  {
    term: "Provenance",
    section: "platform",
    isCore: true,
    definition:
      "The documented history of where something came from. On Living Nexus, provenance means having proof — not just a claim — that you created a work. It answers the questions: Who made this? When was it made? What was the intent behind it? Provenance is the foundation of everything on this platform.",
  },
  {
    term: "The Archive (LNA)",
    section: "platform",
    definition:
      "Your complete catalog of registered works on the platform. Every piece you upload becomes part of your Archive — a permanent, searchable record of your creative output. LNA stands for Living Nexus Archive.",
  },
  {
    term: "The Cathedral",
    section: "platform",
    definition:
      "The design philosophy of Living Nexus. The platform is built with the same intentionality as a cathedral — every element has purpose, weight, and permanence. Nothing is decorative. Nothing is accidental.",
  },
  // ── Identity ──────────────────────────────────────────────────────────────
  {
    term: "Creator",
    section: "identity",
    isCore: true,
    definition:
      "Any person who registers and uploads original work to Living Nexus. Creators are the authors of record on the platform. The platform exists to serve creators — not to own, monetize, or exploit their work without their consent.",
  },
  {
    term: "Identity",
    section: "identity",
    definition:
      "Your sovereign record on Living Nexus. Not a social media profile — a provenance anchor. Your Identity contains your origin statement, your registered works, your Witness ID, and your creative record.",
  },
  {
    term: "WID Handle",
    section: "identity",
    definition:
      "Your artist name on Living Nexus, tied permanently to your Witness ID. Every work you register carries your WID Handle as the author of record.",
  },
  {
    term: "Origin Statement",
    section: "identity",
    definition:
      "A declaration of where you came from and what you carry as a creator. Not a marketing blurb — a statement of creative origin that becomes part of your provenance record.",
  },
  {
    term: "WITNESSED",
    section: "identity",
    definition:
      "The status a creator receives when their work has been formally acknowledged by the network. The equivalent of a verified badge, but earned through creative record — not follower count.",
  },
  {
    term: "Sovereign",
    section: "identity",
    definition:
      "Having full ownership and control over your creative work and identity on the platform. Living Nexus is built on the principle of creator sovereignty — you own what you make, and the platform exists to protect that ownership.",
  },
  // ── WID ───────────────────────────────────────────────────────────────────
  {
    term: "WID (Witness ID)",
    section: "wid",
    isCore: true,
    definition:
      "The most important concept on Living Nexus. A Witness ID is a unique, timestamped identifier permanently assigned to a creative work at the moment of registration. It is cryptographic proof of origin — not a claim, but a record. Every Work on Living Nexus has a WID.",
  },
  {
    term: "WID Document",
    section: "wid",
    definition:
      "The full provenance record attached to a Work's Witness ID. It contains: the work's hash (a digital fingerprint), the timestamp of registration, the creator's identity, the authorship declaration, any witness testimonies, and the chain of record. The WID Document is the legal and historical backbone of the work.",
  },
  {
    term: "Hash (Cryptographic Fingerprint)",
    section: "wid",
    definition:
      "A unique mathematical signature generated from the content of a file. If even one character of the file changes, the hash changes. Living Nexus generates a hash of every uploaded work at registration — this hash is stored in the WID and serves as proof that the work has not been altered since it was registered.",
  },
  {
    term: "Timestamp",
    section: "wid",
    definition:
      "The exact moment a Work was registered on Living Nexus, recorded permanently in the WID. The timestamp is the anchor of provenance — it establishes that this work existed, in this form, at this specific point in time.",
  },
  {
    term: "Chain of Record",
    section: "wid",
    definition:
      "The unbroken sequence of provenance events attached to a Work — registration, updates, witness testimonies, licensing events, and transformations. The Chain of Record is what makes provenance traceable over time.",
  },
  {
    term: "Provenance Event",
    section: "wid",
    definition:
      "Any significant action recorded in a Work's Chain of Record — registration, a witness testimony, a license grant, a transformation, or an update. Each event is timestamped and attributed.",
  },
  {
    term: "Register",
    section: "wid",
    definition:
      "The act of submitting a Work to the Living Nexus provenance system. When you register a Work, it receives a WID, a hash is generated, and a timestamp is recorded. Registration is the foundational act of provenance on this platform.",
  },
  {
    term: "Work",
    section: "wid",
    isCore: true,
    definition:
      "Any creative artifact registered on Living Nexus — music, lyrics, writing, visual art, video, or any other creative output. A Work is not just a file. It is a registered creative record with provenance attached.",
  },
  {
    term: "Expression Lineage",
    section: "wid",
    definition:
      "The traceable creative ancestry of a Work — all the Works, influences, and references that contributed to its existence. Expression Lineage is part of the provenance record and makes the creative chain visible.",
  },
  // ── HA AI ─────────────────────────────────────────────────────────────────
  {
    term: "HA AI",
    section: "haai",
    isCore: true,
    definition:
      "Human Authored, AI Assisted. A creative work classification indicating that a human being is the author of record — having supplied the intention, direction, judgment, and testimony that constitute authorship — while an AI system served as a rendering instrument under that human's direction.",
  },
  {
    term: "Human Authored",
    section: "haai",
    definition:
      "The first and primary designation in HA AI. The human is the author. Authorship is established not by who pressed a button, but by who carried the intention — who directed the work, made the creative decisions, and can testify to the chain of choices that produced this specific expression.",
  },
  {
    term: "AI Assisted",
    section: "haai",
    definition:
      "The secondary designation in HA AI. The AI served as an instrument — a tool that rendered the human's direction into a realized output. The AI contributed learned patterns from accumulated human creative heritage. It did not originate intent, select meaning, or bear creative responsibility.",
  },
  {
    term: "Rendering Instrument",
    section: "haai",
    definition:
      "The role of an AI system in an HA AI work. An instrument executes under the direction of the author. It does not author. A piano does not compose — the composer composes. An AI rendering instrument does not create — the human creates.",
  },
  {
    term: "Pathology of Emergence",
    section: "haai",
    isCore: true,
    definition:
      "The traceable sequence of human choices, corrections, constraints, and lived testimony that collapses an infinite possibility space into a single realized creative expression. The pathology of emergence is what makes this work unique — not the model that rendered it, but the specific human decisions that guided it into existence.",
  },
  {
    term: "Provenance Chain (HA AI)",
    section: "haai",
    definition:
      "The ordered record of creative causation for an HA AI work: Human experience → Human intent → Prompt → Model synthesis → Human judgment → Final work. Each link in the chain is a human act. The chain is what makes the work attributable to a specific person.",
  },
  {
    term: "Prompt",
    section: "haai",
    definition:
      "The act of direction. The human creator's translation of intention into language the AI instrument can receive. A prompt is not a request — it is a creative decision that establishes trajectory. The prompt is part of the provenance record.",
  },
  {
    term: "Model Synthesis",
    section: "haai",
    definition:
      "The probabilistic rendering performed by an AI system in response to human direction. Model synthesis produces output — it does not produce authorship. The model contributes learned patterns derived from accumulated human creative heritage.",
  },
  {
    term: "Creative Heritage",
    section: "haai",
    definition:
      "The accumulated body of human creative work from which AI models derive their learned patterns. Every AI model is built on the inheritance of thousands of musicians, writers, artists, and creators who came before. HA AI works acknowledge this lineage as part of their provenance.",
  },
  {
    term: "HAAI Declaration",
    section: "haai",
    definition:
      "The structured testimony a creator records when registering an HA AI work on Living Nexus. It captures six dimensions of creative direction: visual concept, style language, instrumentation, vocal conveyance, lyrical inspiration, and emotional tone — plus the origin story that anchors all of them. The HAAI Declaration becomes part of the Work's WID Document.",
  },
  {
    term: "AI Disclosure",
    section: "haai",
    definition:
      "The creator's formal statement of how AI was used in the creation of a work. Living Nexus supports multiple disclosure levels: fully human-created, HA AI (human authored, AI assisted), and AI-generated with human curation. Disclosure is not a penalty — it is part of honest provenance.",
  },
  // ── Community ─────────────────────────────────────────────────────────────
  {
    term: "Witness (verb)",
    section: "community",
    isCore: true,
    definition:
      "To formally acknowledge a creator's existence and work. On Living Nexus, witnessing is not passive scrolling — it is an act of recognition. When you witness a creator, you are saying: I see this work. I acknowledge it exists.",
  },
  {
    term: "Witness (noun)",
    section: "community",
    definition:
      "A person who has chosen to stand in acknowledgment of a creator's work. Not a follower — a witness. The distinction matters: followers consume; witnesses acknowledge.",
  },
  {
    term: "Witness Testimony",
    section: "community",
    definition:
      "A written statement from a community member attesting to the significance, authenticity, or impact of a Work. Witness testimonies become part of the Work's provenance record and contribute to its Chain of Record.",
  },
  {
    term: "Carry",
    section: "community",
    definition:
      "To share a Work with others in a way that extends its reach while preserving its provenance. When you carry a Work, you are not just sharing a link — you are extending the chain of acknowledgment.",
  },
  {
    term: "Leave a Mark",
    section: "community",
    definition:
      "To leave a meaningful response to a Work — not a like or a comment, but a testimony. Marks become part of the Work's record.",
  },
  {
    term: "Honor",
    section: "community",
    definition:
      "To support a creator financially through a direct contribution. The equivalent of a tip or donation — but framed as recognition of the work's value, not charity.",
  },
  {
    term: "Sanctuary",
    section: "community",
    definition:
      "A live listening or creative space on Living Nexus. Not a live stream — a gathering. Sanctuaries are intentional spaces for shared creative experience.",
  },
  {
    term: "Sanctuary Queue",
    section: "community",
    definition:
      "The ordered list of Works to be experienced in a Sanctuary session. Curated, not algorithmic.",
  },
  // ── Discovery ─────────────────────────────────────────────────────────────
  {
    term: "Discover",
    section: "discovery",
    definition:
      "The section of Living Nexus where you find new Works and creators. Not a trending chart — a curated space for genuine discovery.",
  },
  {
    term: "Explore",
    section: "discovery",
    definition:
      "The broader browsing experience — searching by genre, mood, creator, or provenance type.",
  },
  {
    term: "Signals",
    section: "discovery",
    definition:
      "Notifications and activity updates on Living Nexus. Not engagement metrics — meaningful signals that something has happened in your creative record or network.",
  },
  {
    term: "Field Note",
    section: "discovery",
    definition:
      "A written entry in a creator's doctrine layer — a journal post, manifesto, update, or concept note. Field Notes are part of a creator's public record, not just a blog.",
  },
  // ── Economy ───────────────────────────────────────────────────────────────
  {
    term: "Reciprocity",
    section: "economy",
    isCore: true,
    definition:
      "The economic philosophy of Living Nexus. Creators receive value in return for the value their work generates. Not monetization — reciprocity. The platform does not extract; it facilitates exchange.",
  },
  {
    term: "Creator License",
    section: "economy",
    definition:
      "The terms under which a creator makes their Work available for use by others. Living Nexus supports multiple license types — from full copyright to open use — all recorded in the WID Document.",
  },
  {
    term: "Covenant",
    section: "economy",
    definition:
      "A subscription or membership arrangement between a creator and their community. Not a paywall — a covenant. The community commits to supporting the creator's ongoing work.",
  },
  {
    term: "Transformation",
    section: "economy",
    definition:
      "A derivative work — a remix, cover, adaptation, or reinterpretation — that builds on an existing registered Work. Transformations must reference the original Work's WID and are registered as their own Works with their own provenance records.",
  },
  {
    term: "Reference",
    section: "economy",
    definition:
      "A formal citation of another Work's WID within your own Work's provenance record. References establish creative lineage — they show where your work came from and what it builds on.",
  },
  // ── Features ──────────────────────────────────────────────────────────────
  {
    term: "Cinematic Mode",
    section: "features",
    definition:
      "A full-screen immersive playback experience for registered Works. Cinematic Mode transforms the listening experience into a visual event — using the Work's cover art, AI-generated visuals, or a music video loop as the backdrop.",
  },
  {
    term: "Music Video Loop",
    section: "features",
    definition:
      "An AI-generated looping video created from a Work's cover art and metadata. The video is produced by the platform's AI pipeline — which reads the Work's title, genre, mood, lyrics, and description to generate a sequence of cinematic frames that reflect the Work's emotional arc.",
  },
  {
    term: "Tone Generator",
    section: "features",
    definition:
      "A tool that analyzes the sonic characteristics of an audio Work and produces a harmonic signature — a record of the Work's frequency profile, tonal qualities, and sonic fingerprint. The tone signature becomes part of the Work's provenance record.",
  },
  {
    term: "Sovereign Archive Export",
    section: "features",
    definition:
      "A feature that allows creators to download their complete creative record from Living Nexus — including the actual audio files, cover art, music videos, lyrics, tone signatures, WID documents, and metadata — organized in a structured folder per Work. Designed for migration, backup, and long-term preservation.",
  },
  {
    term: "Living Archive Subscription",
    section: "features",
    definition:
      "A premium tier that gives creators access to expanded storage, advanced provenance tools, and priority registration. The Living Archive is the creator's permanent home on the platform.",
  },
  {
    term: "Manifestation Studio",
    section: "features",
    definition:
      "A creative workspace within Living Nexus for developing and registering new Works across multiple formats — music, visual art, writing, and multimedia.",
  },
  {
    term: "WID Panel",
    section: "features",
    definition:
      "The provenance display panel on a Work's page, showing the full WID Document — hash, timestamp, witnesses, chain of record, and authorship declaration.",
  },
  // ── Doctrine ──────────────────────────────────────────────────────────────
  {
    term: "Words have power. Power has meaning.",
    section: "doctrine",
    isCore: true,
    definition:
      "The foundational doctrine of Living Nexus. Every registered Work is a word — a statement of existence. The platform exists to give that statement power, preserve its meaning, and protect its ability to reach and change witnesses. Full statement: \"Words have power. Power has meaning. Meaning is what changes the internal state of the witness.\"",
  },
  {
    term: "Truth enters through witnesses",
    section: "doctrine",
    isCore: true,
    definition:
      "The provenance doctrine. A Work without provenance is a truth severed from its origin. Living Nexus exists to prevent that severance — to keep every Work permanently connected to the human who made it, the moment it was made, and the intention behind it. Full statement: \"Truth enters through witnesses, survives through return, and collapses when systems sever it from its origin.\"",
  },
  {
    term: "Sovereignty",
    section: "doctrine",
    definition:
      "The principle that creators own their work, control how it is used, and have the right to take it with them. Living Nexus is built to serve creator sovereignty — not to create dependency, lock-in, or extraction.",
  },
  {
    term: "Testimony",
    section: "doctrine",
    isCore: true,
    definition:
      "The human creator's recorded account of the creative event — the origin, the intention, the choices made, and the meaning carried. Testimony is what transforms a generated output into a witnessed work. On Living Nexus, testimony is not optional — it is the core of provenance.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey | "all">("all");
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return GLOSSARY.filter((entry) => {
      const matchesSection = activeSection === "all" || entry.section === activeSection;
      const matchesSearch =
        !q ||
        entry.term.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q);
      return matchesSection && matchesSearch;
    });
  }, [search, activeSection]);

  const toggleTerm = (term: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  };

  const sectionKeys = Object.keys(SECTIONS) as SectionKey[];

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void)" }}>
      {/* ── Hero ── */}
      <div
        className="px-6 py-16 text-center border-b"
        style={{
          background: "linear-gradient(180deg, rgba(196,154,40,0.06) 0%, transparent 100%)",
          borderColor: "rgba(196,154,40,0.1)",
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="w-6 h-6" style={{ color: "var(--ln-gold)" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "var(--ln-gold)" }}
          >
            Platform Glossary
          </span>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold font-heading mb-4"
          style={{ color: "var(--ln-parchment)" }}
        >
          Understanding Living Nexus
        </h1>
        <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
          Every term, concept, and principle — explained in plain language. Start here if you're
          new to the platform.
        </p>
        {/* Search */}
        <div className="relative max-w-md mx-auto mt-8">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--ln-iron)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any term or concept…"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "rgba(44,52,56,0.8)",
              border: "1px solid rgba(196,154,40,0.25)",
              color: "var(--ln-parchment)",
            }}
          />
        </div>
        {/* Stats */}
        <p className="text-xs mt-4" style={{ color: "var(--ln-iron)" }}>
          {filtered.length} of {GLOSSARY.length} terms
          {search && ` matching "${search}"`}
        </p>
      </div>

      {/* ── Section Filter ── */}
      <div
        className="sticky top-0 z-10 px-4 py-3 border-b overflow-x-auto"
        style={{
          background: "rgba(10,12,14,0.95)",
          borderColor: "rgba(44,52,56,0.5)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex gap-2 min-w-max mx-auto max-w-5xl">
          <button
            onClick={() => setActiveSection("all")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            style={{
              background: activeSection === "all" ? "var(--ln-gold)" : "rgba(44,52,56,0.6)",
              color: activeSection === "all" ? "var(--ln-void)" : "var(--ln-smoke)",
              border: `1px solid ${activeSection === "all" ? "var(--ln-gold)" : "rgba(44,52,56,0.5)"}`,
            }}
          >
            All Terms
          </button>
          {sectionKeys.map((key) => {
            const s = SECTIONS[key];
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background: isActive ? `${s.color}22` : "rgba(44,52,56,0.4)",
                  color: isActive ? s.color : "var(--ln-smoke)",
                  border: `1px solid ${isActive ? s.color : "rgba(44,52,56,0.4)"}`,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
        {/* Group by section when showing all, or show flat list when filtered/searching */}
        {search || activeSection !== "all" ? (
          // ── Flat filtered list ──
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm" style={{ color: "var(--ln-iron)" }}>
                  No terms found for "{search}". Try a different word.
                </p>
              </div>
            ) : (
              filtered.map((entry) => (
                <TermCard
                  key={entry.term}
                  entry={entry}
                  isExpanded={expandedTerms.has(entry.term)}
                  onToggle={() => toggleTerm(entry.term)}
                  sectionColor={SECTIONS[entry.section].color}
                  showSectionBadge
                />
              ))
            )}
          </div>
        ) : (
          // ── Grouped by section ──
          sectionKeys.map((key) => {
            const s = SECTIONS[key];
            const terms = GLOSSARY.filter((e) => e.section === key);
            return (
              <section key={key}>
                {/* Section header */}
                <div className="flex items-start gap-3 mb-5">
                  <div
                    className="w-1 rounded-full flex-shrink-0 mt-1"
                    style={{ background: s.color, height: "2.5rem" }}
                  />
                  <div>
                    <h2
                      className="text-sm font-bold tracking-wider uppercase"
                      style={{ color: s.color }}
                    >
                      {s.label}
                    </h2>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--ln-iron)" }}>
                      {s.description}
                    </p>
                  </div>
                </div>
                {/* Terms */}
                <div className="space-y-2 ml-4">
                  {terms.map((entry) => (
                    <TermCard
                      key={entry.term}
                      entry={entry}
                      isExpanded={expandedTerms.has(entry.term)}
                      onToggle={() => toggleTerm(entry.term)}
                      sectionColor={s.color}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="border-t px-6 py-14 text-center"
        style={{ borderColor: "rgba(196,154,40,0.08)" }}
      >
        <div className="max-w-xl mx-auto">
          <p className="text-sm mb-2 font-semibold" style={{ color: "var(--ln-parchment)" }}>
            Ready to register your first Work?
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--ln-smoke)" }}>
            Every creator starts with a single registration. Your Witness ID is waiting.
          </p>
          <Link href="/upload">
            <button
              className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all hover:opacity-90"
              style={{ background: "var(--ln-gold)", color: "var(--ln-void)" }}
            >
              Register a Work →
            </button>
          </Link>
          <div
            className="mt-6 flex items-center justify-center gap-4 text-xs flex-wrap"
            style={{ color: "var(--ln-iron)" }}
          >
            <Link href="/lexicon" className="hover:underline" style={{ color: "var(--ln-iron)" }}>
              Platform Lexicon (Translation Guide)
            </Link>
            <span>·</span>
            <Link href="/doctrine/wid-spec" className="hover:underline" style={{ color: "var(--ln-iron)" }}>
              WID Specification
            </Link>
            <span>·</span>
            <Link href="/manifesto" className="hover:underline" style={{ color: "var(--ln-iron)" }}>
              Manifesto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TermCard ─────────────────────────────────────────────────────────────────
function TermCard({
  entry,
  isExpanded,
  onToggle,
  sectionColor,
  showSectionBadge = false,
}: {
  entry: GlossaryTerm;
  isExpanded: boolean;
  onToggle: () => void;
  sectionColor: string;
  showSectionBadge?: boolean;
}) {
  const isLong = entry.definition.length > 160;
  const preview = isLong && !isExpanded ? entry.definition.slice(0, 160) + "…" : entry.definition;

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: isExpanded ? "rgba(44,52,56,0.7)" : "rgba(44,52,56,0.4)",
        border: `1px solid ${isExpanded ? sectionColor + "44" : "rgba(44,52,56,0.5)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {entry.isCore && (
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
              style={{ background: sectionColor }}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="text-sm font-bold leading-snug"
                style={{ color: "var(--ln-parchment)" }}
              >
                {entry.term}
              </h3>
              {showSectionBadge && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    background: `${sectionColor}18`,
                    color: sectionColor,
                    border: `1px solid ${sectionColor}33`,
                  }}
                >
                  {SECTIONS[entry.section].label}
                </span>
              )}
              {entry.isCore && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    background: "rgba(196,154,40,0.1)",
                    color: "rgba(196,154,40,0.8)",
                    border: "1px solid rgba(196,154,40,0.2)",
                  }}
                >
                  Core
                </span>
              )}
            </div>
            <p
              className="text-sm leading-relaxed mt-1.5"
              style={{ color: "var(--ln-smoke)" }}
            >
              {preview}
            </p>
          </div>
        </div>
        {isLong && (
          <button
            onClick={onToggle}
            className="flex-shrink-0 mt-0.5"
            style={{ color: "var(--ln-iron)" }}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
