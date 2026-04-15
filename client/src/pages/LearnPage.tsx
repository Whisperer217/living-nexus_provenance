/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — LearnPage (/learn)
   Unified knowledge hub: WID Specification + Lexicon in one place.
   Replaces separate /doctrine/wid-spec and /lexicon routes in the nav.
   Both pages remain accessible at their original URLs for deep links.
═══════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Link } from "wouter";
import {
  BookOpen, GitBranch, Shield, ShieldCheck, Globe, Fingerprint,
  ExternalLink, ChevronRight, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const WID_SPEC_PDF_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/WID_Public_Specification_v1.0_ff711e53.pdf";

// ── WID Spec data ──────────────────────────────────────────────────────────────
const WID_LAYERS = [
  {
    icon: BookOpen,
    title: "Concept Layer",
    description:
      "Plain-language definition of what WID is, what problem it solves, and what category it belongs to — without exposing internal mechanics.",
  },
  {
    icon: GitBranch,
    title: "Interface Layer",
    description:
      "Defines the Witness Input Set (what goes in) and the Witness Record outputs (what comes out), including the WID string, Harmonic Signature, and ECDSA certificate.",
  },
  {
    icon: Shield,
    title: "Behavior Layer",
    description:
      "The four guarantees: Immutability, Traceability, Attribution Binding, and Context Preservation. These are behavioral contracts, not implementation details.",
  },
  {
    icon: Globe,
    title: "Boundary Layer",
    description:
      "What WID explicitly does not do — protecting the system from misframing and preserving the integrity of its claims.",
  },
];

const INTEROP_ROWS = [
  { system: "U.S. Copyright Registration", relationship: "WID is a pre-legal provenance record; supports but does not replace copyright." },
  { system: "ISRC", relationship: "ISRC is assigned post-distribution; WID is assigned pre-distribution by the creator." },
  { system: "DOI (Figshare / Zenodo)", relationship: "DOI identifies where a thing lives; WID identifies who made it and when." },
  { system: "Blockchain NFT", relationship: "Platform-dependent token; WID is platform-independent and creator-held." },
];

// ── Lexicon data ───────────────────────────────────────────────────────────────
interface LexiconEntry {
  standard: string;
  nexus: string;
  meaning: string;
  category: "identity" | "action" | "record" | "space" | "economy";
}

const LEXICON: LexiconEntry[] = [
  { standard: "Follow", nexus: "Witness", meaning: "To formally acknowledge a creator's existence and work. Not a passive subscription — an act of recognition.", category: "identity" },
  { standard: "Follower", nexus: "Witness", meaning: "Someone who has chosen to stand in acknowledgment of your creative record. They see you.", category: "identity" },
  { standard: "Profile", nexus: "Identity", meaning: "Your sovereign record on the platform. Not a social page — a provenance anchor.", category: "identity" },
  { standard: "Username / Handle", nexus: "WID Handle", meaning: "Your artist name tied to your Witness ID. The name that appears on every record you create.", category: "identity" },
  { standard: "Verified Badge", nexus: "WITNESSED", meaning: "Status shown when your work has been formally acknowledged by the network.", category: "identity" },
  { standard: "Bio", nexus: "Origin Statement", meaning: "Where you came from and what you carry. Not a marketing blurb — a declaration of origin.", category: "identity" },
  { standard: "Upload", nexus: "Witness", meaning: "The act of submitting your work to the Living Nexus system for permanent provenance registration.", category: "action" },
  { standard: "Like", nexus: "Acknowledge", meaning: "To formally recognize a work. Acknowledgment is a provenance signal, not a popularity metric.", category: "action" },
  { standard: "Share", nexus: "Propagate", meaning: "To extend the reach of a witnessed record. Every propagation carries the original WID.", category: "action" },
  { standard: "Comment", nexus: "Signal", meaning: "A time-stamped response attached to a specific work record. Signals are part of the provenance trail.", category: "action" },
  { standard: "Track / Song", nexus: "Work", meaning: "Any creative output submitted to the system. A Work is the atomic unit of provenance.", category: "record" },
  { standard: "Playlist", nexus: "Collection", meaning: "A curated sequence of Works. Collections are versioned and creator-owned.", category: "record" },
  { standard: "Album", nexus: "Archive", meaning: "A grouped set of Works sharing a common origin, intent, or release context.", category: "record" },
  { standard: "Unique ID / Hash", nexus: "Witness ID (WID)", meaning: "A cryptographic fingerprint of a Work at the moment of creation. Immutable and creator-bound.", category: "record" },
  { standard: "Homepage / Feed", nexus: "Nexus", meaning: "The living intersection of all witnessed works and creators. Not a feed — a field of record.", category: "space" },
  { standard: "Platform", nexus: "Living Nexus", meaning: "The system that issues, stores, and verifies Witness IDs. A provenance infrastructure, not a social network.", category: "space" },
  { standard: "Tip / Donation", nexus: "Offering", meaning: "A voluntary transfer of value directly to a creator. Offerings are not platform-mediated — they are creator-to-creator.", category: "economy" },
  { standard: "Subscription", nexus: "Covenant", meaning: "A formal commitment between a creator and their witnesses. Not a billing cycle — a declared relationship.", category: "economy" },
  { standard: "Creator License", nexus: "Witness License", meaning: "The credential that activates full WID issuance rights. Proof of serious creative intent.", category: "economy" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  identity: { bg: "rgba(196,154,40,0.12)", text: "var(--ln-gold)", border: "rgba(196,154,40,0.26)" },
  action:   { bg: "rgba(58,138,86,0.15)", text: "var(--ln-seal-bright)", border: "rgba(58,138,86,0.3)" },
  record:   { bg: "rgba(196,154,40,0.08)",  text: "var(--ln-gold)",  border: "rgba(196,154,40,0.25)"  },
  space:    { bg: "rgba(58,138,86,0.15)", text: "var(--ln-seal-bright)", border: "rgba(58,138,86,0.3)" },
  economy:  { bg: "rgba(196,68,10,0.15)",  text: "var(--ln-ember)",  border: "rgba(196,68,10,0.3)"  },
};

// ── WID Spec section ───────────────────────────────────────────────────────────
function WIDSpecSection() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="p-6 border border-white/8"
        style={{ background: "var(--ln-coal)" }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.25)" }}>
            <Fingerprint className="w-6 h-6" style={{ color: "var(--ln-gold)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white/90 mb-1"
              style={{ fontFamily: "'Cinzel', serif" }}>
              Witness ID — Public Specification v1.0
            </h2>
            <p className="text-sm text-white/50 leading-relaxed">
              WID is a cryptographic provenance system for creative works. It generates an immutable, creator-bound fingerprint at the moment of creation — before distribution, before registration, before anything else.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href={WID_SPEC_PDF_URL} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-black font-semibold gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Download PDF Spec
                </Button>
              </a>
              <Link href="/verify">
                <Button size="sm" variant="outline" className="border-white/15 hover:border-amber-500/50 hover:text-amber-400 gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Verify a WID
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Layers */}
      <div>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">Specification Layers</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {WID_LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <div key={layer.title} className="p-4 border border-white/8"
                style={{ background: "var(--ln-coal)" }}>
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                  <div>
                    <p className="text-sm font-semibold text-white/85 mb-1">{layer.title}</p>
                    <p className="text-xs text-white/45 leading-relaxed">{layer.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interoperability */}
      <div>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">Interoperability</h3>
        <div className="rounded-xl border border-white/8 overflow-hidden"
          style={{ background: "var(--ln-coal)" }}>
          <div className="grid grid-cols-[1fr_2fr] text-xs font-semibold text-white/50 px-4 py-2 border-b border-white/8 uppercase tracking-wider">
            <span>System</span>
            <span>Relationship to WID</span>
          </div>
          {INTEROP_ROWS.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr] px-4 py-3 border-b border-white/5 last:border-0">
              <span className="text-sm text-white/70 font-medium">{row.system}</span>
              <span className="text-xs text-white/45 leading-relaxed">{row.relationship}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div
        className="rounded-xl px-4 py-3 flex items-start gap-2.5"
        style={{ background: "rgba(44,52,56,0.8)", border: "1px solid rgba(196,154,40,0.15)" }}
      >
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(232,223,200,0.6)" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--ln-iron)" }}>
          <strong style={{ color: "var(--ln-gold)" }}>Legal Notice:</strong> Witness IDs are cryptographic provenance records issued by Living Nexus (operated by BDDT Publishing, a DBA of Command Domains LLC). They preserve verifiable proof of authorship, creation date, and work integrity — supporting, but not replacing, official copyright registration. For legal copyright protection in the United States, visit{" "}
          <a href="https://www.copyright.gov/registration/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--ln-gold)" }}>copyright.gov/registration</a>.
        </p>
      </div>
    </div>
  );
}

// ── Lexicon section ─────────────────────────────────────────────────────────────────────────────────
function LexiconSection() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = ["all", "identity", "action", "record", "space", "economy"];

  const filtered = LEXICON.filter(entry => {
    const matchesSearch = !search.trim() ||
      entry.standard.toLowerCase().includes(search.toLowerCase()) ||
      entry.nexus.toLowerCase().includes(search.toLowerCase()) ||
      entry.meaning.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || entry.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="p-4 border border-white/8"
        style={{ background: "var(--ln-coal)" }}>
        <p className="text-sm text-white/55 leading-relaxed">
          Living Nexus uses a distinct vocabulary rooted in provenance, sovereignty, and creative record. These are not rebranded social media terms — each word carries a specific meaning within the system.
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            placeholder="Search terms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-sm"
          />
          {search && (
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/60"
              onClick={() => setSearch("")}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => {
            const colors = cat !== "all" ? CATEGORY_COLORS[cat] : null;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
                style={isActive && colors
                  ? { background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }
                  : isActive
                  ? { background: "rgba(196,154,40,0.12)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }
                  : { background: "var(--ln-coal)", color: "var(--ln-iron)", border: "1px solid #111009" }
                }
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-white/50">No terms match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, i) => {
            const colors = CATEGORY_COLORS[entry.category];
            return (
              <div key={i} className="p-4 border border-white/8 transition-colors hover:border-white/15"
                style={{ background: "var(--ln-coal)" }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-xs text-white/55 line-through">{entry.standard}</span>
                      <ChevronRight className="w-3 h-3 text-white/45 flex-shrink-0" />
                      <span className="text-sm font-semibold" style={{ color: "var(--ln-gold)" }}>
                        {entry.nexus}
                      </span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                        style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                      >
                        {entry.category}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{entry.meaning}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const [activeSection, setActiveSection] = useState<"wid-spec" | "lexicon">("wid-spec");

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-coal)" }}>
      <div className="container py-10 max-w-3xl mx-auto px-4"
        style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Learn
          </h1>
          <p className="text-sm text-white/40">
            The WID system, its specification, and the Living Nexus vocabulary.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: "var(--ln-coal)" }}>
          <button
            onClick={() => setActiveSection("wid-spec")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={activeSection === "wid-spec"
              ? { background: "var(--ln-gold)", color: "var(--ln-parchment)" }
              : { color: "var(--ln-smoke)" }}
          >
            <Fingerprint size={13} /> WID Specification
          </button>
          <button
            onClick={() => setActiveSection("lexicon")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={activeSection === "lexicon"
              ? { background: "var(--ln-gold)", color: "var(--ln-parchment)" }
              : { color: "var(--ln-smoke)" }}
          >
            <BookOpen size={13} /> Lexicon
          </button>
        </div>

        {/* Content */}
        {activeSection === "wid-spec" ? <WIDSpecSection /> : <LexiconSection />}
      </div>
    </div>
  );
}
