import { Link } from "wouter";
import { Shield, Music, Lock, Users, ChevronLeft, ExternalLink } from "lucide-react";

const TENETS = [
  {
    icon: Shield,
    title: "Your words are your property.",
    body: "Every lyric, every melody, every vocal performance carries the weight of the person who made it. Living Nexus does not own your music. Your label does not own your music. The algorithm does not own your music. You do. The moment you upload, a Witness ID — a cryptographic hash of your file, your identity, and the timestamp — is generated and permanently recorded. That hash is yours. It cannot be altered, transferred, or erased.",
  },
  {
    icon: Lock,
    title: "Provenance is protection.",
    body: "The music industry has spent decades separating creators from the proof of their creation. Contracts strip rights. Platforms strip metadata. AI companies strip context. Living Nexus does the opposite. Every track carries a chain of custody from the moment it enters the archive. If your music is ever used without permission — in a film, an ad, a training dataset — the Witness ID is the timestamp that proves you were first.",
  },
  {
    icon: Music,
    title: "The archive is not a streaming service.",
    body: "Spotify pays fractions of a cent per stream and calls it fair. We call it extraction. Living Nexus is an archive — a sovereign record of creation. Fans who love your work can tip you directly. Listeners who want to own it can download it. Supervisors who want to license it can negotiate directly with you. The platform takes 10%. You keep 90%. That is not a feature. That is a principle.",
  },
  {
    icon: Users,
    title: "Community over algorithm.",
    body: "No recommendation engine decides who gets heard. No engagement metric determines whose music surfaces. Living Nexus is a room where creators and listeners find each other honestly — through genre, through search, through word of mouth, through the Listen Together rooms where music plays live. The platform does not amplify the loudest. It protects the real.",
  },
];

const TIMELINE = [
  { date: "July 2025", event: "BDDT Publishing established — born from a personal reckoning. A combat medic watched his own testimony get trapped in the artificial realm and moved to protect it. The mission: help creators protect their work, AI-generated or straight real, on the way out." },
  { date: "December 2025", event: "Witness Identification born — first as a moral witness engine, then refined into a Witness ID system for creators. The core principle: protect the witness behind the system, not just the file." },
  { date: "December 2025", event: "Testimonial Completion doctrine published on Figshare — a combat medic's framework for healing thirteen-year wounds. This doctrine spawned the Sacred Witness Authority engine and the Epistemic Shock Index." },
  { date: "Early 2026", event: "Living Nexus activated — born directly from the Testimonial Completion doctrine. What began as a GitHub repository became a sovereign music archive: upload, witness, protect, get paid. Zero VC funding. Zero label partnerships. Creator-owned from day one." },
  { date: "March 2026", event: "Music video support added. Every video gets its own Witness ID alongside the audio. The archive grows." },
];

export default function ManifestoPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.07 0.015 270)", color: "oklch(0.92 0.02 85)" }}
    >
      {/* Back nav */}
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-sm mb-10 transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.55 0.04 280)" }}>
            <ChevronLeft size={14} /> Back to Living Nexus
          </a>
        </Link>
      </div>

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, oklch(0.10 0.04 270) 0%, oklch(0.07 0.015 270) 100%)",
          borderBottom: "1px solid oklch(0.84 0.155 85 / 0.12)",
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.84 0.155 85 / 0.06) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full"
            style={{
              background: "oklch(0.84 0.155 85 / 0.08)",
              border: "1px solid oklch(0.84 0.155 85 / 0.25)",
              color: "oklch(0.84 0.155 85)",
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            BDDT Publishing · Est. July 2025
          </div>
          <h1
            className="text-5xl sm:text-6xl font-black mb-6 leading-tight"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.97 0.03 85)" }}
          >
            The Living Nexus<br />Manifesto
          </h1>
          <p
            className="text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: "oklch(0.65 0.04 280)", fontFamily: "'Inter', sans-serif" }}
          >
            Sovereign music. Cryptographic provenance. Creator-owned, fan-supported, algorithm-free.
            This is what we believe and why we built it.
          </p>
        </div>
      </div>

      {/* Opening declaration */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <blockquote
          className="text-xl sm:text-2xl leading-relaxed font-medium italic mb-16 pl-6"
          style={{
            borderLeft: "3px solid oklch(0.84 0.155 85)",
            color: "oklch(0.82 0.04 85)",
            fontFamily: "'Cinzel', serif",
          }}
        >
          "Truth enters through witnesses, survives through return, and collapses when systems sever it from its origin."
        </blockquote>

        <p className="text-base leading-relaxed mb-6" style={{ color: "oklch(0.72 0.03 280)" }}>
          Music has always been testimony. A song is a witness statement — to love, to loss, to faith, to survival. For most of recorded history, the people who created that testimony were the last to benefit from it. Labels owned the masters. Platforms owned the metadata. Algorithms owned the audience relationship. Creators owned nothing but the memory of making it.
        </p>
        <p className="text-base leading-relaxed mb-16" style={{ color: "oklch(0.72 0.03 280)" }}>
          Living Nexus was built to change that arithmetic. Not by disrupting the industry — by stepping outside it entirely. This is an archive, not a label. A provenance registry, not a streaming service. A direct payment rail between creators and the people who value their work, not a royalty pool managed by intermediaries who take the majority before passing on the remainder.
        </p>

        {/* Tenets */}
        <div className="space-y-12 mb-16">
          {TENETS.map((tenet, i) => {
            const Icon = tenet.icon;
            return (
              <div key={i} className="flex gap-5">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1"
                  style={{ background: "oklch(0.84 0.155 85 / 0.10)", border: "1px solid oklch(0.84 0.155 85 / 0.25)" }}
                >
                  <Icon size={18} style={{ color: "oklch(0.84 0.155 85)" }} />
                </div>
                <div>
                  <h2
                    className="text-lg font-bold mb-3"
                    style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.92 0.03 85)" }}
                  >
                    {tenet.title}
                  </h2>
                  <p className="text-base leading-relaxed" style={{ color: "oklch(0.68 0.03 280)" }}>
                    {tenet.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div
          className="h-px w-full mb-16"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.84 0.155 85 / 0.3), transparent)" }}
        />

        {/* Origin timeline */}
        <h2
          className="text-2xl font-bold mb-8"
          style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.92 0.03 85)" }}
        >
          How We Got Here
        </h2>
        <div className="space-y-6 mb-16">
          {TIMELINE.map((item, i) => (
            <div key={i} className="flex gap-5">
              <div
                className="flex-shrink-0 text-xs font-bold pt-0.5 w-24"
                style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Orbitron', sans-serif" }}
              >
                {item.date}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(0.65 0.03 280)" }}>
                {item.event}
              </p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          className="h-px w-full mb-16"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.84 0.155 85 / 0.3), transparent)" }}
        />

        {/* Closing */}
        <div
          className="rounded-2xl p-8 mb-16 text-center"
          style={{
            background: "oklch(0.10 0.03 270)",
            border: "1px solid oklch(0.84 0.155 85 / 0.15)",
          }}
        >
          <h2
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.92 0.03 85)" }}
          >
            This is not a platform feature.<br />This is a position.
          </h2>
          <p className="text-base leading-relaxed mb-6 max-w-lg mx-auto" style={{ color: "oklch(0.65 0.03 280)" }}>
            We are not neutral. We believe creators deserve proof of what they made, payment for what they share, and protection from systems that profit from their work without their consent. If you make music, your words have power. Power has meaning. Meaning is what changes the internal state of the witness.
          </p>
          <p
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Orbitron', sans-serif" }}
          >
            — BDDT Publishing · Est. July 2025
          </p>
        </div>

        {/* PFC Miller dedication */}
        <div
          className="rounded-2xl px-8 py-10 mb-16 text-center"
          style={{
            background: "oklch(0.085 0.025 270)",
            border: "1px solid oklch(0.84 0.155 85 / 0.10)",
          }}
        >
          <div
            className="w-px h-10 mx-auto mb-6"
            style={{ background: "linear-gradient(180deg, transparent, oklch(0.84 0.155 85 / 0.5))" }}
          />
          <p
            className="text-base leading-relaxed italic"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.72 0.04 85)" }}
          >
            This platform exists in honor of PFC Miller.
          </p>
          <p
            className="text-base leading-relaxed italic mt-2"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.72 0.04 85)" }}
          >
            His loss became the doctrine. His memory is the first witness.
          </p>
          <div
            className="w-px h-10 mx-auto mt-6"
            style={{ background: "linear-gradient(180deg, oklch(0.84 0.155 85 / 0.5), transparent)" }}
          />
        </div>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pb-20">
          <Link href="/upload">
            <a
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, oklch(0.84 0.155 85), oklch(0.72 0.14 75))",
                color: "oklch(0.08 0.01 280)",
              }}
            >
              <Music size={14} /> Upload Your Music
            </a>
          </Link>
          <Link href="/verify">
            <a
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
              style={{
                background: "transparent",
                border: "1px solid oklch(0.84 0.155 85 / 0.35)",
                color: "oklch(0.84 0.155 85)",
              }}
            >
              <Shield size={14} /> Verify a Witness ID
            </a>
          </Link>
          <a
            href="https://figshare.com/articles/preprint/Music_Under_Testimony_A_Framework_for_Preserving_Witness_Authority_in_AI-Generated_Musical_Works_v1_0/31047298"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
            style={{
              background: "transparent",
              border: "1px solid oklch(0.55 0.04 280 / 0.4)",
              color: "oklch(0.55 0.04 280)",
            }}
          >
            <ExternalLink size={14} /> Read the Doctrine
          </a>
        </div>
      </div>
    </div>
  );
}
