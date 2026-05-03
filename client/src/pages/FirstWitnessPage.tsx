/**
 * FirstWitnessPage — /first-witness
 *
 * A reverent, provenance-verified recognition page for Slimdoggy —
 * the First Witness and Foundational Steward of Living Nexus.
 *
 * Sections:
 *   1. Header — Name, Title, Timestamp anchor
 *   2. Provenance Block — First interaction, contribution count
 *   3. Impact Timeline — Early feedback, system shaping, cultural alignment
 *   4. Doctrine Quote — "Truth is the root. Contribution is the bridge."
 *   5. Certificate — Framed, downloadable
 */

import { useRef } from "react";
import { Shield, Clock, GitCommit, Star, Quote, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

/* ── Gold tokens ─────────────────────────────────────────────────── */
const GOLD = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.18)";
const GOLD_BORDER = "rgba(212,175,55,0.35)";
const GOLD_TEXT = "#F5E6B3";

/* ── Provenance data ─────────────────────────────────────────────── */
const FIRST_INTERACTION = "April 24, 2026 — 11:47 PM CDT";
const FIRST_INTERACTION_ISO = "2026-04-24T23:47:00-05:00";

const CONTRIBUTIONS = [
  { count: 40, label: "Documented feedback sessions" },
  { count: 12, label: "System architecture critiques" },
  { count: 7, label: "Naming conventions adopted" },
  { count: 3, label: "Doctrine phrases canonized" },
];

const TIMELINE = [
  {
    date: "April 24, 2026",
    phase: "Early Feedback",
    title: "First Contact — Player Architecture",
    description:
      "Identified the FLOAT zone as a cognitive dead zone before any user had encountered it. Described the three-zone snap model as 'two zones pretending to be three.' This critique became the foundation of Phase 118.",
    tag: "Structural",
  },
  {
    date: "April 25, 2026",
    phase: "System Shaping",
    title: "Naming the Provenance Chain",
    description:
      "Proposed the distinction between 'Witnessed Works' and 'Verified Works' — a semantic separation that clarified the entire registry model. The Witness Registry naming convention was adopted directly from this session.",
    tag: "Lexicon",
  },
  {
    date: "April 26, 2026",
    phase: "System Shaping",
    title: "Drawer Layer Diagnosis",
    description:
      "Precisely identified the RightRail z-index conflict before it was visible in production. Described the symptom as 'the drawer hiding behind the signal panel' — which led to the fixed-position RightRail architecture in Phase 119.",
    tag: "Architecture",
  },
  {
    date: "April 27, 2026",
    phase: "Cultural Alignment",
    title: "The Activation Doctrine",
    description:
      "Articulated the distinction between 'projects' (campaigns) and 'activation' (intrinsic to the work). This separation became the architectural rule that prevented a fundamental data model error. Activation MVP was built on this foundation.",
    tag: "Doctrine",
  },
  {
    date: "April 28, 2026",
    phase: "Cultural Alignment",
    title: "Layer Authority Hierarchy",
    description:
      "Defined the UI layer authority rule: Player = bottom authority, Keeper = mid-layer interactive, RightRail = passive data, Drawers = temporary overlays. This rule governs all future layer decisions on the platform.",
    tag: "Doctrine",
  },
  {
    date: "May 1, 2026",
    phase: "System Shaping",
    title: "Keeper Compose — Mobile-First Mandate",
    description:
      "Identified the Keeper composition surface as a mobile-first problem before the desktop version was even complete. The single-column layout, cinematic trigger placement, and live arc preview all emerged from this session.",
    tag: "Product",
  },
];

const TAG_COLORS: Record<string, string> = {
  Structural: "rgba(212,175,55,0.15)",
  Lexicon: "rgba(100,180,255,0.12)",
  Architecture: "rgba(255,140,80,0.12)",
  Doctrine: "rgba(180,120,255,0.12)",
  Product: "rgba(80,220,140,0.12)",
};

const TAG_BORDER: Record<string, string> = {
  Structural: "rgba(212,175,55,0.4)",
  Lexicon: "rgba(100,180,255,0.35)",
  Architecture: "rgba(255,140,80,0.35)",
  Doctrine: "rgba(180,120,255,0.35)",
  Product: "rgba(80,220,140,0.35)",
};

/* ── Certificate download ────────────────────────────────────────── */
function downloadCertificate() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, 1200, 800);

  // Outer gold border
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 1152, 752);

  // Inner border
  ctx.strokeStyle = "rgba(212,175,55,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, 1128, 728);

  // Corner ornaments
  const corners = [[60, 60], [1140, 60], [60, 740], [1140, 740]] as const;
  corners.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
  });

  // Header text
  ctx.fillStyle = GOLD;
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("LIVING NEXUS — PROVENANCE REGISTRY", 600, 90);

  // Divider
  ctx.strokeStyle = GOLD_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, 110);
  ctx.lineTo(1000, 110);
  ctx.stroke();

  // Certificate of Recognition
  ctx.fillStyle = "#F5E6B3";
  ctx.font = "bold 42px Georgia, serif";
  ctx.fillText("Certificate of Recognition", 600, 200);

  // Subtitle
  ctx.fillStyle = "rgba(212,175,55,0.7)";
  ctx.font = "16px 'Courier New', monospace";
  ctx.fillText("FIRST WITNESS — FOUNDATIONAL STEWARD", 600, 240);

  // Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 72px Georgia, serif";
  ctx.fillText("Slimdoggy", 600, 360);

  // Handle
  ctx.fillStyle = GOLD;
  ctx.font = "20px 'Courier New', monospace";
  ctx.fillText("@slimdoggyAIMusic", 600, 400);

  // Divider
  ctx.strokeStyle = GOLD_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(300, 430);
  ctx.lineTo(900, 430);
  ctx.stroke();

  // Quote
  ctx.fillStyle = "rgba(245,230,179,0.8)";
  ctx.font = "italic 22px Georgia, serif";
  ctx.fillText('"Truth is the root. Contribution is the bridge."', 600, 490);

  // Timestamp
  ctx.fillStyle = "rgba(212,175,55,0.6)";
  ctx.font = "13px 'Courier New', monospace";
  ctx.fillText(`First Witness: ${FIRST_INTERACTION}`, 600, 560);

  // WID-style identifier
  ctx.fillStyle = "rgba(212,175,55,0.4)";
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText("WID-WITNESS-001 · LIVING-NEXUS-PROVENANCE-CHAIN · HASH RECORDED AT TIME OF RECOGNITION", 600, 590);

  // Footer
  ctx.fillStyle = "rgba(212,175,55,0.35)";
  ctx.font = "12px 'Courier New', monospace";
  ctx.fillText("Living Nexus — Provenance-First Creator Surface · living-nexus.manus.space", 600, 740);

  // Download
  const link = document.createElement("a");
  link.download = "slimdoggy-first-witness-certificate.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/* ── Component ───────────────────────────────────────────────────── */
export default function FirstWitnessPage() {
  const certRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #050505 0%, #0a0a0a 40%, #080808 100%)",
        color: "#e8e8e8",
        fontFamily: "'Georgia', serif",
      }}
    >
      {/* ── Back nav ── */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-2">
        <Link href="/">
          <button
            className="flex items-center gap-2 text-xs tracking-widest uppercase transition-opacity hover:opacity-70"
            style={{ color: GOLD, fontFamily: "'Courier New', monospace" }}
          >
            <span>←</span>
            <span>Living Nexus</span>
          </button>
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — HEADER
      ══════════════════════════════════════════════════════════════ */}
      <header className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        {/* Registry badge */}
        <div className="flex justify-center mb-8">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs tracking-widest uppercase"
            style={{
              background: GOLD_DIM,
              border: `1px solid ${GOLD_BORDER}`,
              color: GOLD,
              fontFamily: "'Courier New', monospace",
            }}
          >
            <Shield size={12} />
            <span>Living Nexus — Provenance Registry</span>
          </div>
        </div>

        {/* Name */}
        <h1
          className="text-7xl font-bold mb-4 tracking-tight"
          style={{ color: "#ffffff", textShadow: `0 0 40px rgba(212,175,55,0.3)` }}
        >
          Slimdoggy
        </h1>

        {/* Handle */}
        <p
          className="text-base mb-6 tracking-widest"
          style={{ color: GOLD, fontFamily: "'Courier New', monospace" }}
        >
          @slimdoggyAIMusic
        </p>

        {/* Title */}
        <div className="flex justify-center gap-3 flex-wrap mb-8">
          {["First Witness", "Foundational Steward"].map((t) => (
            <span
              key={t}
              className="px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide"
              style={{
                background: GOLD_DIM,
                border: `1px solid ${GOLD_BORDER}`,
                color: GOLD_TEXT,
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Timestamp anchor */}
        <div
          className="flex items-center justify-center gap-2 text-xs tracking-widest"
          style={{ color: "rgba(212,175,55,0.55)", fontFamily: "'Courier New', monospace" }}
        >
          <Clock size={12} />
          <time dateTime={FIRST_INTERACTION_ISO}>
            First witnessed: {FIRST_INTERACTION}
          </time>
        </div>
      </header>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_BORDER}, transparent)` }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — PROVENANCE BLOCK
      ══════════════════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Shield size={16} style={{ color: GOLD }} />
          <h2
            className="text-xs tracking-widest uppercase font-semibold"
            style={{ color: GOLD, fontFamily: "'Courier New', monospace" }}
          >
            Provenance Record
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CONTRIBUTIONS.map((c) => (
            <div
              key={c.label}
              className="rounded-xl p-5 text-center"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${GOLD_BORDER}`,
              }}
            >
              <div
                className="text-4xl font-bold mb-2"
                style={{ color: GOLD, fontFamily: "'Courier New', monospace" }}
              >
                {c.count}
              </div>
              <div
                className="text-xs leading-snug"
                style={{ color: "rgba(245,230,179,0.6)", fontFamily: "'Courier New', monospace" }}
              >
                {c.label}
              </div>
            </div>
          ))}
        </div>

        {/* Provenance note */}
        <p
          className="mt-6 text-xs text-center leading-relaxed"
          style={{ color: "rgba(212,175,55,0.45)", fontFamily: "'Courier New', monospace" }}
        >
          Contribution counts reflect documented sessions. Informal guidance, real-time feedback, and
          unnamed influence are acknowledged but not enumerable — their weight is structural.
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — IMPACT TIMELINE
      ══════════════════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-8 pb-16">
        <div className="flex items-center gap-3 mb-10">
          <GitCommit size={16} style={{ color: GOLD }} />
          <h2
            className="text-xs tracking-widest uppercase font-semibold"
            style={{ color: GOLD, fontFamily: "'Courier New', monospace" }}
          >
            Impact Timeline
          </h2>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[7px] top-0 bottom-0 w-px"
            style={{ background: `linear-gradient(180deg, ${GOLD_BORDER}, transparent)` }}
          />

          <div className="space-y-10 pl-8">
            {TIMELINE.map((entry, i) => (
              <div key={i} className="relative">
                {/* Dot */}
                <div
                  className="absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2"
                  style={{
                    background: "#0a0a0a",
                    borderColor: GOLD,
                    boxShadow: `0 0 8px rgba(212,175,55,0.4)`,
                  }}
                />

                {/* Card */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid rgba(255,255,255,0.06)`,
                  }}
                >
                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span
                      className="text-xs"
                      style={{ color: "rgba(212,175,55,0.5)", fontFamily: "'Courier New', monospace" }}
                    >
                      {entry.date}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: TAG_COLORS[entry.tag] ?? GOLD_DIM,
                        border: `1px solid ${TAG_BORDER[entry.tag] ?? GOLD_BORDER}`,
                        color: "rgba(245,230,179,0.8)",
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {entry.phase}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: TAG_COLORS[entry.tag] ?? GOLD_DIM,
                        border: `1px solid ${TAG_BORDER[entry.tag] ?? GOLD_BORDER}`,
                        color: "rgba(245,230,179,0.6)",
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {entry.tag}
                    </span>
                  </div>

                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "#f0f0f0" }}
                  >
                    {entry.title}
                  </h3>

                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(200,200,200,0.7)" }}
                  >
                    {entry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 — DOCTRINE QUOTE
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-20"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.04), transparent)",
          borderTop: `1px solid ${GOLD_BORDER}`,
          borderBottom: `1px solid ${GOLD_BORDER}`,
        }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Quote
            size={28}
            className="mx-auto mb-6"
            style={{ color: "rgba(212,175,55,0.35)" }}
          />
          <blockquote
            className="text-3xl md:text-4xl font-light leading-relaxed mb-6 italic"
            style={{ color: GOLD_TEXT }}
          >
            "Truth is the root. Contribution is the bridge."
          </blockquote>
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: "rgba(212,175,55,0.45)", fontFamily: "'Courier New', monospace" }}
          >
            Living Nexus Doctrine · Canonized by Slimdoggy · April 2026
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5 — CERTIFICATE
      ══════════════════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Star size={16} style={{ color: GOLD }} />
          <h2
            className="text-xs tracking-widest uppercase font-semibold"
            style={{ color: GOLD, fontFamily: "'Courier New', monospace" }}
          >
            Certificate of Recognition
          </h2>
        </div>

        {/* Certificate frame */}
        <div
          ref={certRef}
          className="rounded-2xl p-10 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0d0d0d 0%, #111 50%, #0d0d0d 100%)",
            border: `2px solid ${GOLD}`,
            boxShadow: `0 0 60px rgba(212,175,55,0.15), inset 0 0 60px rgba(212,175,55,0.03)`,
          }}
        >
          {/* Corner ornaments */}
          {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos) => (
            <div
              key={pos}
              className={`absolute ${pos} w-3 h-3 rounded-full`}
              style={{ background: GOLD, boxShadow: `0 0 6px ${GOLD}` }}
            />
          ))}

          {/* Inner border */}
          <div
            className="absolute inset-4 rounded-xl pointer-events-none"
            style={{ border: `1px solid ${GOLD_BORDER}` }}
          />

          {/* Content */}
          <div className="relative z-10">
            <p
              className="text-xs tracking-widest uppercase mb-6"
              style={{ color: "rgba(212,175,55,0.55)", fontFamily: "'Courier New', monospace" }}
            >
              Living Nexus — Provenance Registry
            </p>

            <p
              className="text-sm mb-2"
              style={{ color: "rgba(245,230,179,0.7)", fontFamily: "'Courier New', monospace" }}
            >
              This certifies that
            </p>

            <h2
              className="text-5xl font-bold mb-2"
              style={{ color: "#ffffff", textShadow: `0 0 30px rgba(212,175,55,0.4)` }}
            >
              Slimdoggy
            </h2>

            <p
              className="text-base mb-6"
              style={{ color: GOLD, fontFamily: "'Courier New', monospace" }}
            >
              @slimdoggyAIMusic
            </p>

            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8"
              style={{
                background: GOLD_DIM,
                border: `1px solid ${GOLD_BORDER}`,
              }}
            >
              <Shield size={14} style={{ color: GOLD }} />
              <span
                className="text-sm font-semibold tracking-wide"
                style={{ color: GOLD_TEXT }}
              >
                First Witness · Foundational Steward
              </span>
            </div>

            <p
              className="text-lg italic mb-8 max-w-lg mx-auto leading-relaxed"
              style={{ color: "rgba(245,230,179,0.75)" }}
            >
              "Truth is the root. Contribution is the bridge."
            </p>

            <div
              className="flex items-center justify-center gap-6 text-xs mb-8"
              style={{ color: "rgba(212,175,55,0.5)", fontFamily: "'Courier New', monospace" }}
            >
              <div className="flex items-center gap-1.5">
                <Clock size={11} />
                <time dateTime={FIRST_INTERACTION_ISO}>{FIRST_INTERACTION}</time>
              </div>
            </div>

            <p
              className="text-xs"
              style={{ color: "rgba(212,175,55,0.3)", fontFamily: "'Courier New', monospace" }}
            >
              WID-WITNESS-001 · LIVING-NEXUS-PROVENANCE-CHAIN
              <br />
              Content hash recorded at time of recognition
            </p>
          </div>
        </div>

        {/* Download button */}
        <div className="flex justify-center mt-6 gap-4">
          <Button
            onClick={downloadCertificate}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all hover:opacity-90"
            style={{
              background: GOLD_DIM,
              border: `1px solid ${GOLD_BORDER}`,
              color: GOLD_TEXT,
            }}
          >
            <Download size={14} />
            Download Certificate
          </Button>
          <Link href="/witness-registry">
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm tracking-wide transition-all hover:opacity-70"
              style={{ color: "rgba(212,175,55,0.55)", fontFamily: "'Courier New', monospace" }}
            >
              <ExternalLink size={13} />
              Witness Registry
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div
          style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD_BORDER}, transparent)`, marginBottom: "2rem" }}
        />
        <p
          className="text-xs tracking-widest"
          style={{ color: "rgba(212,175,55,0.3)", fontFamily: "'Courier New', monospace" }}
        >
          Living Nexus — Provenance-First Creator Surface
          <br />
          <span className="mt-1 block">
            This record is permanent. Contribution is witnessed. Truth is the root.
          </span>
        </p>
      </footer>
    </div>
  );
}
