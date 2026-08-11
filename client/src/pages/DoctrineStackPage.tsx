/**
 * DoctrineStackPage — /doctrine
 * ─────────────────────────────────────────────────────────────────────────────
 * The Living Nexus Sovereignty Loop.
 *
 * Architecture:
 *   CREATOR → Identity → Provenance → Consent → Stewardship →
 *   Attribution → Value → CREATOR CREATES AGAIN → SOCIETY
 *   └── Society returns knowledge → Creator → loop strengthens
 *
 * Design doctrine:
 *   • The loop is the message. Every visual element reinforces the cycle.
 *   • Gold particles flow continuously along the loop path.
 *   • Each layer expands on hover/focus with its full doctrine text.
 *   • The return arrows (Value → Creator, Creator → Society) are animated
 *     with a persistent gold pulse to show the loop is alive.
 *   • No static diagram. This breathes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Shield, Fingerprint, FileCheck, Archive,
  Link2, Coins, RefreshCw, Globe, ArrowDown, ArrowUp,
  ChevronDown, ChevronRight,
} from "lucide-react";

// ─── Layer definitions ───────────────────────────────────────────────────────

const LAYERS = [
  {
    id: "identity",
    num: "01",
    label: "Identity",
    icon: Fingerprint,
    color: "rgba(196,154,40,1)",
    dimColor: "rgba(196,154,40,0.18)",
    tagline: "You are the origin.",
    doctrine: "Before a work can be protected, the creator must be known. Identity is not a username — it is the cryptographic anchor that ties every work to a living human being. On Living Nexus, your identity is your Witness ID root. Every upload, every signature, every act of creation flows from this anchor. No label, no platform, no algorithm can sever that chain.",
    returns: "Identity anchors every layer below it. Without it, provenance is anonymous. With it, the entire stack becomes sovereign.",
  },
  {
    id: "provenance",
    num: "02",
    label: "Provenance",
    icon: FileCheck,
    color: "rgba(196,154,40,0.92)",
    dimColor: "rgba(196,154,40,0.15)",
    tagline: "The record cannot lie.",
    doctrine: "Provenance is the unbroken chain from creation to now. The moment a work enters the Living Nexus registry, a cryptographic hash of the file, the creator's identity, and the timestamp is permanently recorded. This is the Origin Ledger. It cannot be altered. It cannot be erased. If your work is ever used without permission — in a film, an ad, a training dataset — the Witness ID is the timestamp that proves you were first.",
    returns: "Provenance feeds Consent. You cannot grant rights to what you cannot prove you own.",
  },
  {
    id: "consent",
    num: "03",
    label: "Consent",
    icon: Shield,
    color: "rgba(196,154,40,0.85)",
    dimColor: "rgba(196,154,40,0.13)",
    tagline: "Your rights, your terms.",
    doctrine: "Consent is the Rights Ledger — the explicit record of what you have permitted and what you have not. Living Nexus does not assume permission. Every use of a work requires a visible consent record. AI training, commercial licensing, sampling, adaptation — each requires a documented grant from the creator. Silence is not consent. Uploading is not consent. Only explicit, recorded permission counts.",
    returns: "Consent without Stewardship is a promise with no guardian. The next layer ensures the record is preserved.",
  },
  {
    id: "stewardship",
    num: "04",
    label: "Stewardship",
    icon: Archive,
    color: "rgba(196,154,40,0.78)",
    dimColor: "rgba(196,154,40,0.11)",
    tagline: "The archive is permanent.",
    doctrine: "Stewardship is Preservation and Integrity — the commitment that the record will outlast the platform, the label, the streaming service, and the algorithm. Living Nexus is not a streaming service. It is an archive. Files are stored with cryptographic integrity checks. Metadata is never stripped. The chain of custody is never broken. When a creator dies, their work does not disappear. The archive holds.",
    returns: "Stewardship enables Attribution. You cannot cite what you cannot find. You cannot find what was not preserved.",
  },
  {
    id: "attribution",
    num: "05",
    label: "Attribution",
    icon: Link2,
    color: "rgba(196,154,40,0.70)",
    dimColor: "rgba(196,154,40,0.09)",
    tagline: "Every influence is recorded.",
    doctrine: "Attribution is the Citation Graph — the living record of influence, derivation, and acknowledgment. When a creator builds on another's work, that relationship is recorded. When a researcher cites a work, the citation is permanent. When AI systems train on human creativity, the origin of that creativity is traceable. Attribution is not a courtesy. It is a structural requirement for a sovereign creative economy.",
    returns: "Attribution generates Value. A work that is cited, referenced, and built upon has compounding worth. The loop accelerates.",
  },
  {
    id: "value",
    num: "06",
    label: "Value",
    icon: Coins,
    color: "rgba(196,154,40,0.62)",
    dimColor: "rgba(196,154,40,0.08)",
    tagline: "Creation is compensated.",
    doctrine: "Value is Compensation and Participation — the economic layer that closes the loop. Fans tip directly. Listeners download. Supervisors license. AI systems that train on your work owe you a record and a payment. Living Nexus takes 10%. You keep 90%. That is not a feature. That is a principle. Value without the five layers above it is extraction. Value with them is sovereignty.",
    returns: "Value returns to the Creator — not as a fraction of a cent, but as a direct, recorded, sovereign payment. The Creator creates again. The loop strengthens.",
  },
];

// ─── Particle canvas ─────────────────────────────────────────────────────────

function LoopParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles flowing down the left spine and up the right return
    const particles: { x: number; y: number; progress: number; speed: number; opacity: number; side: "down" | "up" }[] = [];
    for (let i = 0; i < 28; i++) {
      particles.push({
        x: 0, y: 0,
        progress: Math.random(),
        speed: 0.0008 + Math.random() * 0.0012,
        opacity: 0.3 + Math.random() * 0.5,
        side: i < 14 ? "down" : "up",
      });
    }

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      const leftX = W * 0.5;
      const rightX = W * 0.5;

      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const t = p.progress;
        if (p.side === "down") {
          // flows top → bottom along center spine
          p.x = leftX + Math.sin(t * Math.PI * 4) * 3;
          p.y = t * H;
        } else {
          // flows bottom → top along right edge
          p.x = W * 0.82 + Math.sin(t * Math.PI * 3) * 2;
          p.y = (1 - t) * H;
        }

        const alpha = p.opacity * Math.sin(t * Math.PI);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,154,40,${alpha})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

// ─── Single layer card ────────────────────────────────────────────────────────

function LayerCard({
  layer,
  index,
  isLast,
  expanded,
  onToggle,
}: {
  layer: typeof LAYERS[0];
  index: number;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = layer.icon;
  const delay = index * 120;

  return (
    <div
      className="doctrine-layer relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Connector line from above */}
      {index > 0 && (
        <div className="flex flex-col items-center" style={{ height: 40 }}>
          <div
            className="w-px flex-1 doctrine-connector"
            style={{ background: `linear-gradient(to bottom, ${LAYERS[index - 1].color}, ${layer.color})` }}
          />
          <ArrowDown
            className="doctrine-arrow-down shrink-0"
            style={{ color: layer.color, width: 14, height: 14 }}
          />
        </div>
      )}

      {/* Card */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left doctrine-card group"
        style={{
          background: expanded
            ? `linear-gradient(135deg, rgba(10,8,6,0.98), rgba(20,16,8,0.98))`
            : "rgba(10,8,6,0.85)",
          border: expanded
            ? `1px solid ${layer.color}`
            : `1px solid ${layer.dimColor}`,
          borderRadius: "1rem",
          padding: "1.25rem 1.5rem",
          transition: "all 0.35s ease",
          boxShadow: expanded
            ? `0 0 40px ${layer.dimColor}, 0 8px 32px rgba(0,0,0,0.6)`
            : "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-4">
          {/* Number */}
          <span
            className="shrink-0 font-heading text-xs tracking-[0.2em]"
            style={{ color: layer.color, fontFamily: "'Cinzel', serif", opacity: 0.6, minWidth: 28 }}
          >
            {layer.num}
          </span>

          {/* Icon */}
          <div
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background: expanded ? layer.dimColor : "rgba(196,154,40,0.06)",
              border: `1px solid ${expanded ? layer.color : layer.dimColor}`,
              transition: "all 0.35s ease",
            }}
          >
            <Icon style={{ width: 18, height: 18, color: layer.color }} />
          </div>

          {/* Label + tagline */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-heading tracking-[0.12em] uppercase mb-0.5"
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "0.95rem",
                color: expanded ? "var(--ln-parchment)" : "var(--ln-bone)",
                transition: "color 0.3s ease",
              }}
            >
              {layer.label}
            </h3>
            <p
              className="text-xs"
              style={{ color: layer.color, opacity: 0.75, fontFamily: "'Cinzel', serif", letterSpacing: "0.05em" }}
            >
              {layer.tagline}
            </p>
          </div>

          {/* Expand chevron */}
          <div
            className="shrink-0 transition-transform duration-300"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", color: layer.color }}
          >
            <ChevronDown style={{ width: 16, height: 16 }} />
          </div>
        </div>

        {/* Expanded doctrine text */}
        {expanded && (
          <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${layer.dimColor}` }}>
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: "var(--ln-bone)", lineHeight: 1.75 }}
            >
              {layer.doctrine}
            </p>
            <div
              className="flex items-start gap-2 text-xs"
              style={{ color: layer.color, opacity: 0.7 }}
            >
              <ChevronRight className="shrink-0" style={{ width: 12, height: 12, marginTop: 2 }} />
              <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.04em", lineHeight: 1.6 }}>
                {layer.returns}
              </span>
            </div>
          </div>
        )}
      </button>

      {/* Return flow indicator after last layer */}
      {isLast && (
        <div className="flex flex-col items-center mt-1" style={{ height: 40 }}>
          <div
            className="w-px flex-1"
            style={{ background: "linear-gradient(to bottom, rgba(196,154,40,0.6), rgba(196,154,40,0.2))" }}
          />
          <ArrowDown
            className="shrink-0 doctrine-pulse-arrow"
            style={{ color: "rgba(196,154,40,0.8)", width: 14, height: 14 }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DoctrineStackPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loopVisible, setLoopVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoopVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ln-void)", color: "var(--ln-bone)" }}
    >
      {/* ── Ambient background ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(196,154,40,0.05) 0%, transparent 65%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Back nav ── */}
        <Link href="/manifesto">
          <button
            type="button"
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-all mb-10 group"
            style={{ color: "rgba(196,154,40,0.55)" }}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.04em", fontSize: "11px" }}>
              Manifesto
            </span>
          </button>
        </Link>

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5 text-[10px] tracking-[0.22em] uppercase"
            style={{
              background: "rgba(196,154,40,0.06)",
              border: "1px solid rgba(196,154,40,0.20)",
              color: "rgba(196,154,40,0.65)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <RefreshCw style={{ width: 10, height: 10 }} />
            Sovereignty Architecture
          </div>

          <h1
            className="font-heading mb-4"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "clamp(1.8rem, 5vw, 3rem)",
              color: "var(--ln-parchment)",
              letterSpacing: "0.04em",
              textShadow: "0 0 60px rgba(196,154,40,0.15)",
              lineHeight: 1.2,
            }}
          >
            The Living Nexus<br />
            <span style={{ color: "var(--ln-gold)" }}>Doctrine Stack</span>
          </h1>

          <p
            className="text-sm mx-auto"
            style={{
              color: "var(--ln-smoke)",
              maxWidth: 440,
              lineHeight: 1.75,
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.03em",
            }}
          >
            A self-reinforcing sovereignty loop. Every layer strengthens the one above it.
            Every return strengthens the Creator. The loop does not end.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
             THE LOOP
        ══════════════════════════════════════════════════════════════ */}
        <div
          className={`relative transition-all duration-700 ${loopVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >

          {/* ── CREATOR (top) ── */}
          <div className="flex flex-col items-center mb-2">
            <div
              className="doctrine-creator-node flex items-center justify-center gap-3 px-8 py-4 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(196,154,40,0.12), rgba(196,154,40,0.06))",
                border: "1.5px solid rgba(196,154,40,0.55)",
                boxShadow: "0 0 60px rgba(196,154,40,0.18), 0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  background: "rgba(196,154,40,0.15)",
                  border: "1px solid rgba(196,154,40,0.45)",
                }}
              >
                <Fingerprint style={{ width: 18, height: 18, color: "var(--ln-gold)" }} />
              </div>
              <div>
                <p
                  className="font-heading tracking-[0.18em] uppercase"
                  style={{ fontFamily: "'Cinzel', serif", fontSize: "1.05rem", color: "var(--ln-parchment)" }}
                >
                  Creator
                </p>
                <p
                  className="text-[10px] tracking-[0.12em]"
                  style={{ color: "rgba(196,154,40,0.65)", fontFamily: "'Cinzel', serif" }}
                >
                  Origin of all value
                </p>
              </div>
            </div>

            {/* Down arrow from Creator */}
            <div className="flex flex-col items-center" style={{ height: 44 }}>
              <div
                className="w-px flex-1"
                style={{ background: "linear-gradient(to bottom, rgba(196,154,40,0.6), rgba(196,154,40,0.35))" }}
              />
              <ArrowDown style={{ color: "rgba(196,154,40,0.7)", width: 14, height: 14 }} />
            </div>
          </div>

          {/* ── Six layers ── */}
          <div className="relative">
            {/* Particle canvas — flows alongside the layers */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" style={{ zIndex: 0 }}>
              <LoopParticles />
            </div>

            <div className="relative z-10">
              {LAYERS.map((layer, i) => (
                <LayerCard
                  key={layer.id}
                  layer={layer}
                  index={i}
                  isLast={i === LAYERS.length - 1}
                  expanded={expanded === layer.id}
                  onToggle={() => toggle(layer.id)}
                />
              ))}
            </div>
          </div>

          {/* ── CREATOR CREATES AGAIN (bottom of loop) ── */}
          <div className="flex flex-col items-center mt-2">
            <div
              className="doctrine-return-node flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl mb-2"
              style={{
                background: "linear-gradient(135deg, rgba(196,154,40,0.08), rgba(196,154,40,0.04))",
                border: "1px solid rgba(196,154,40,0.35)",
                boxShadow: "0 0 30px rgba(196,154,40,0.10)",
              }}
            >
              <RefreshCw
                className="doctrine-spin-slow"
                style={{ width: 18, height: 18, color: "rgba(196,154,40,0.85)" }}
              />
              <div>
                <p
                  className="font-heading tracking-[0.14em] uppercase"
                  style={{ fontFamily: "'Cinzel', serif", fontSize: "0.9rem", color: "var(--ln-parchment)" }}
                >
                  Creator Creates Again
                </p>
                <p
                  className="text-[10px] tracking-[0.1em]"
                  style={{ color: "rgba(196,154,40,0.55)", fontFamily: "'Cinzel', serif" }}
                >
                  Value returned — loop strengthens
                </p>
              </div>
            </div>

            {/* Return arrow — goes back up on the right */}
            <div
              className="w-full flex items-stretch gap-0 mt-2 mb-2"
              style={{ height: 56 }}
            >
              {/* Left: nothing */}
              <div className="flex-1" />

              {/* Center: down-and-around indicator */}
              <div className="flex flex-col items-center justify-center gap-1">
                <div
                  className="text-[9px] tracking-[0.18em] uppercase"
                  style={{ color: "rgba(196,154,40,0.40)", fontFamily: "'Cinzel', serif" }}
                >
                  &amp; to Society
                </div>
              </div>

              {/* Right: nothing */}
              <div className="flex-1" />
            </div>
          </div>

          {/* ── SOCIETY (receives knowledge) ── */}
          <div className="flex flex-col items-center">
            {/* Up arrow to Society */}
            <div className="flex flex-col items-center" style={{ height: 44 }}>
              <ArrowUp
                className="doctrine-pulse-arrow"
                style={{ color: "rgba(196,154,40,0.65)", width: 14, height: 14 }}
              />
              <div
                className="w-px flex-1"
                style={{ background: "linear-gradient(to top, rgba(196,154,40,0.5), rgba(196,154,40,0.2))" }}
              />
            </div>

            <div
              className="doctrine-society-node flex items-center justify-center gap-3 px-8 py-4 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(42,107,138,0.10), rgba(42,107,138,0.05))",
                border: "1px solid rgba(42,107,138,0.35)",
                boxShadow: "0 0 40px rgba(42,107,138,0.10)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  background: "rgba(42,107,138,0.12)",
                  border: "1px solid rgba(42,107,138,0.35)",
                }}
              >
                <Globe style={{ width: 18, height: 18, color: "var(--ln-witness-bright)" }} />
              </div>
              <div>
                <p
                  className="font-heading tracking-[0.18em] uppercase"
                  style={{ fontFamily: "'Cinzel', serif", fontSize: "1.05rem", color: "var(--ln-parchment)" }}
                >
                  Society
                </p>
                <p
                  className="text-[10px] tracking-[0.12em]"
                  style={{ color: "rgba(74,157,191,0.70)", fontFamily: "'Cinzel', serif" }}
                >
                  AI · Research · Education · Culture
                </p>
              </div>
            </div>

            {/* Knowledge returned arrow — feeds back to Creator */}
            <div className="flex flex-col items-center mt-4 mb-2" style={{ height: 44 }}>
              <div
                className="w-px flex-1"
                style={{ background: "linear-gradient(to bottom, rgba(42,107,138,0.4), rgba(196,154,40,0.3))" }}
              />
              <ArrowDown
                className="doctrine-pulse-arrow"
                style={{ color: "rgba(196,154,40,0.6)", width: 14, height: 14 }}
              />
            </div>

            {/* Knowledge returned label */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] tracking-[0.15em] uppercase mb-8"
              style={{
                background: "rgba(196,154,40,0.05)",
                border: "1px solid rgba(196,154,40,0.18)",
                color: "rgba(196,154,40,0.55)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              <RefreshCw style={{ width: 10, height: 10 }} />
              Knowledge returned to Creator — loop strengthens
            </div>
          </div>

          {/* ── Loop closure statement ── */}
          <div
            className="text-center px-6 py-8 rounded-2xl mt-4"
            style={{
              background: "linear-gradient(135deg, rgba(196,154,40,0.04), rgba(196,154,40,0.02))",
              border: "1px solid rgba(196,154,40,0.12)",
            }}
          >
            <p
              className="font-heading mb-3"
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "var(--ln-parchment)",
                letterSpacing: "0.04em",
                lineHeight: 1.5,
              }}
            >
              The loop does not end.
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--ln-smoke)", lineHeight: 1.75, maxWidth: 420, margin: "0 auto" }}
            >
              Every work that enters the registry strengthens the chain. Every citation adds a node.
              Every payment closes a loop. Every creator who creates again proves the architecture works.
              This is not a product. This is a sovereign system.
            </p>
          </div>

          {/* ── CTA row ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link href="/upload">
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 rounded-full font-heading tracking-widest text-sm transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "var(--ln-gold)",
                  color: "var(--ln-void)",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.08em",
                  boxShadow: "0 0 24px rgba(196,154,40,0.25)",
                }}
              >
                Enter the Registry
              </button>
            </Link>
            <Link href="/manifesto">
              <button
                type="button"
                className="flex items-center gap-2 px-6 py-3 rounded-full font-heading tracking-widest text-sm transition-all hover:opacity-80"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(196,154,40,0.30)",
                  color: "rgba(196,154,40,0.75)",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.08em",
                }}
              >
                Read the Manifesto
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
