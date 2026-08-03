/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Home v2 (Cathedral Door)

   The homepage is NOT a redirect. It is the cathedral door.
   It orients every visitor — logged in or not — to the two primary
   surfaces of Living Nexus:

   1. THE GUIDE — Pre-Creation Declaration. Establish intent BEFORE
      you generate. The Guide WID is your timestamped creative claim.

   2. THE REGISTRY — The authoritative public record. Verify any WID.
      Confirm authorship. Confirm provenance.

   Below the hero: the provenance chain is shown as a living diagram.
   Below that: the four pillars (Preserve · Attribute · Discover · Support).

   DOCTRINE: No auto-redirect for logged-in users. The homepage
   orients. The creator decides where to go next.
═══════════════════════════════════════════════════════════════════ */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { BookOpen, Shield, ArrowRight, Fingerprint, Archive, Compass } from "lucide-react";

// ─── Provenance chain step ────────────────────────────────────────────────────
function ChainStep({
  step,
  label,
  sub,
  wid,
  accent,
}: {
  step: number;
  label: string;
  sub: string;
  wid?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0" style={{ flex: "1 1 0" }}>
      <div
        className="flex items-center justify-center rounded-full text-xs font-bold mb-1"
        style={{
          width: 28,
          height: 28,
          background: accent ? `${accent}22` : "rgba(212,175,55,0.12)",
          border: `1px solid ${accent ?? "rgba(212,175,55,0.35)"}`,
          color: accent ?? "#D4AF37",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {step}
      </div>
      <div
        className="text-center font-semibold text-xs leading-tight"
        style={{ color: "#E8DCC8", fontFamily: "'EB Garamond', serif", fontSize: 13 }}
      >
        {label}
      </div>
      {wid && (
        <div
          className="text-center"
          style={{
            fontSize: 9,
            fontFamily: "'DM Mono', monospace",
            color: accent ?? "#D4AF37",
            letterSpacing: "0.06em",
            background: "rgba(212,175,55,0.07)",
            padding: "2px 6px",
            borderRadius: 4,
            border: `1px solid ${accent ? accent + "44" : "rgba(212,175,55,0.20)"}`,
          }}
        >
          {wid}
        </div>
      )}
      <div
        className="text-center"
        style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}
      >
        {sub}
      </div>
    </div>
  );
}

function ChainArrow() {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{ color: "rgba(212,175,55,0.30)", paddingTop: 8 }}
    >
      <ArrowRight size={14} />
    </div>
  );
}

// ─── Pillar card ──────────────────────────────────────────────────────────────
function Pillar({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 p-4 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(212,175,55,0.10)",
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg mb-1"
        style={{
          width: 36,
          height: 36,
          background: "rgba(212,175,55,0.10)",
          border: "1px solid rgba(212,175,55,0.20)",
        }}
      >
        <Icon size={16} style={{ color: "#D4AF37" }} />
      </div>
      <div
        className="font-semibold tracking-wide"
        style={{ color: "#D4AF37", fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: "0.12em" }}
      >
        {title}
      </div>
      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ln-obsidian)" }}
      >
        <div className="ln-hash animate-pulse" style={{ color: "rgba(212,175,55,0.5)" }}>
          Initializing ledger…
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--ln-obsidian)", color: "var(--ln-parchment)" }}
    >
      {/* ── Top identity bar ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "rgba(212,175,55,0.10)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border flex items-center justify-center"
            style={{ borderColor: "rgba(212,175,55,0.40)", boxShadow: "0 0 12px rgba(212,175,55,0.15)" }}
          >
            <Fingerprint size={14} style={{ color: "#D4AF37" }} />
          </div>
          <span
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "rgba(212,175,55,0.80)",
            }}
          >
            LIVING NEXUS
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.50)" }}>
                Welcome back, {user.name ?? user.openId}
              </span>
              <Link href="/explore">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gold/30 text-gold/80 hover:bg-gold/10"
                  style={{
                    borderColor: "rgba(212,175,55,0.30)",
                    color: "rgba(212,175,55,0.80)",
                    fontSize: 11,
                    height: 30,
                  }}
                >
                  Explore
                </Button>
              </Link>
            </>
          ) : (
            <a href={getLoginUrl()}>
              <Button
                size="sm"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  border: "1px solid rgba(212,175,55,0.35)",
                  color: "#D4AF37",
                  fontSize: 11,
                  height: 30,
                }}
              >
                Sign In
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-5xl mx-auto w-full">

        {/* Wordmark */}
        <div className="text-center mb-3">
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 10,
              letterSpacing: "0.30em",
              color: "rgba(212,175,55,0.55)",
              marginBottom: 12,
            }}
          >
            THE LIVING REGISTRY OF HUMAN CREATIVE CONTRIBUTION
          </div>
          <h1
            style={{
              fontFamily: "'EB Garamond', serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "#E8DCC8",
              marginBottom: 16,
            }}
          >
            Every creator deserves attribution.<br />
            Every work deserves provenance.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.50)",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Living Nexus issues cryptographic Witness IDs to creative works — establishing
            authorship, intent, and provenance before any platform can claim otherwise.
          </p>
        </div>

        {/* ── Two-column primary CTAs ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl mt-12 mb-12">

          {/* Left: The Guide */}
          <div
            className="flex flex-col gap-4 p-6 rounded-2xl relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)",
              border: "1px solid rgba(212,175,55,0.25)",
              boxShadow: "0 0 40px rgba(212,175,55,0.06)",
            }}
          >
            {/* Accent glow top-right */}
            <div
              className="absolute top-0 right-0 rounded-full pointer-events-none"
              style={{
                width: 120,
                height: 120,
                background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)",
                transform: "translate(30%, -30%)",
              }}
            />

            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 44,
                  height: 44,
                  background: "rgba(212,175,55,0.14)",
                  border: "1px solid rgba(212,175,55,0.30)",
                }}
              >
                <BookOpen size={20} style={{ color: "#D4AF37" }} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 10,
                    letterSpacing: "0.20em",
                    color: "rgba(212,175,55,0.65)",
                    marginBottom: 2,
                  }}
                >
                  STEP ONE
                </div>
                <div
                  style={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: 20,
                    color: "#E8DCC8",
                    lineHeight: 1.1,
                  }}
                >
                  Establish Your Intent
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              Before you open Suno, Udio, or any generation tool — declare your creative
              vision here. Your Guide WID is a timestamped Pre-Creation Declaration that
              proves the human intent behind the work.
            </p>

            <div
              className="text-xs rounded-lg p-3"
              style={{
                background: "rgba(212,175,55,0.06)",
                border: "1px solid rgba(212,175,55,0.15)",
                color: "rgba(212,175,55,0.70)",
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.04em",
              }}
            >
              LN-GUIDE-* → Pre-Creation Declaration WID
            </div>

            {user ? (
              <Link href="/guides/upload">
                <Button
                  className="w-full"
                  style={{
                    background: "#D4AF37",
                    color: "#0A0806",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    height: 42,
                  }}
                >
                  Create a Guide
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl("/guides/upload")} className="w-full">
                <Button
                  className="w-full"
                  style={{
                    background: "#D4AF37",
                    color: "#0A0806",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    height: 42,
                  }}
                >
                  Create a Guide
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </a>
            )}

            <Link href="/guides">
              <button
                style={{
                  fontSize: 11,
                  color: "rgba(212,175,55,0.55)",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(212,175,55,0.25)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Browse the Guide Directory →
              </button>
            </Link>
          </div>

          {/* Right: The Registry */}
          <div
            className="flex flex-col gap-4 p-6 rounded-2xl relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.02) 100%)",
              border: "1px solid rgba(124,58,237,0.20)",
              boxShadow: "0 0 40px rgba(124,58,237,0.04)",
            }}
          >
            {/* Accent glow top-right */}
            <div
              className="absolute top-0 right-0 rounded-full pointer-events-none"
              style={{
                width: 120,
                height: 120,
                background: "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)",
                transform: "translate(30%, -30%)",
              }}
            />

            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 44,
                  height: 44,
                  background: "rgba(124,58,237,0.14)",
                  border: "1px solid rgba(124,58,237,0.30)",
                }}
              >
                <Shield size={20} style={{ color: "#7C3AED" }} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 10,
                    letterSpacing: "0.20em",
                    color: "rgba(124,58,237,0.75)",
                    marginBottom: 2,
                  }}
                >
                  THE REGISTRY
                </div>
                <div
                  style={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: 20,
                    color: "#E8DCC8",
                    lineHeight: 1.1,
                  }}
                >
                  Verify a Work
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              The Witness Registry is the authoritative public record. Enter any WID to
              confirm authorship, view the provenance chain, and verify the ECDSA
              signature that anchors the work to its creator.
            </p>

            <div
              className="text-xs rounded-lg p-3"
              style={{
                background: "rgba(124,58,237,0.06)",
                border: "1px solid rgba(124,58,237,0.15)",
                color: "rgba(124,58,237,0.80)",
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.04em",
              }}
            >
              WID-MUS-* · WID-LYR-* · WID-MAN-* → Witnessed Works
            </div>

            <Link href="/verify">
              <Button
                className="w-full"
                style={{
                  background: "rgba(124,58,237,0.18)",
                  border: "1px solid rgba(124,58,237,0.40)",
                  color: "#A78BFA",
                  fontFamily: "'Cinzel', serif",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  height: 42,
                }}
              >
                Verify a WID
                <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>

            <Link href="/witness-registry">
              <button
                style={{
                  fontSize: 11,
                  color: "rgba(124,58,237,0.60)",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(124,58,237,0.25)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Browse the full Registry →
              </button>
            </Link>
          </div>
        </div>

        {/* ── Provenance chain diagram ────────────────────────────────── */}
        <div
          className="w-full max-w-3xl rounded-2xl p-5 mb-12"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(212,175,55,0.08)",
          }}
        >
          <div
            className="text-center mb-4"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 9,
              letterSpacing: "0.25em",
              color: "rgba(212,175,55,0.45)",
            }}
          >
            THE PROVENANCE CHAIN
          </div>
          <div className="flex items-start gap-1 overflow-x-auto pb-2">
            <ChainStep
              step={1}
              label="Intent"
              sub="Human vision before creation"
              wid="LN-GUIDE-*"
              accent="#D4AF37"
            />
            <ChainArrow />
            <ChainStep
              step={2}
              label="Create"
              sub="Use Suno, Udio, or any tool"
              accent="rgba(255,255,255,0.35)"
            />
            <ChainArrow />
            <ChainStep
              step={3}
              label="Transform"
              sub="Human direction & curation"
              accent="rgba(255,255,255,0.35)"
            />
            <ChainArrow />
            <ChainStep
              step={4}
              label="Register"
              sub="Upload with authorship declaration"
              wid="WID-MUS-*"
              accent="#D4AF37"
            />
            <ChainArrow />
            <ChainStep
              step={5}
              label="Witness"
              sub="ECDSA signed, Registry anchored"
              accent="#7C3AED"
            />
            <ChainArrow />
            <ChainStep
              step={6}
              label="Legacy"
              sub="Permanent attribution record"
              accent="#059669"
            />
          </div>
          <p
            className="text-center mt-4"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", lineHeight: 1.5 }}
          >
            The Guide WID (Step 1) links to the Work WID (Step 4) — creating an unbroken
            chain from human intent to registered artifact.
          </p>
        </div>

        {/* ── Four pillars ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl mb-12">
          <Pillar
            icon={Archive}
            title="PRESERVE"
            body="Every work survives. Cryptographic anchoring ensures nothing is lost."
          />
          <Pillar
            icon={Fingerprint}
            title="ATTRIBUTE"
            body="Every creator is visible. Authorship is declared, signed, and permanent."
          />
          <Pillar
            icon={Compass}
            title="DISCOVER"
            body="Every contribution can be found. The Registry is public and searchable."
          />
          <Pillar
            icon={Shield}
            title="SUPPORT"
            body="Every creator can be sustained. Direct patronage, licensing, and commerce."
          />
        </div>

        {/* ── Secondary actions ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <>
              <Link href="/manifest">
                <Button
                  variant="outline"
                  style={{
                    borderColor: "rgba(212,175,55,0.25)",
                    color: "rgba(212,175,55,0.70)",
                    fontSize: 12,
                    height: 36,
                  }}
                >
                  Register a Work
                </Button>
              </Link>
              <Link href="/explore">
                <Button
                  variant="outline"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.50)",
                    fontSize: 12,
                    height: 36,
                  }}
                >
                  Explore the Registry
                </Button>
              </Link>
              <Link href="/archive">
                <Button
                  variant="outline"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.50)",
                    fontSize: 12,
                    height: 36,
                  }}
                >
                  My Archive
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/explore">
                <Button
                  variant="outline"
                  style={{
                    borderColor: "rgba(212,175,55,0.25)",
                    color: "rgba(212,175,55,0.70)",
                    fontSize: 12,
                    height: 36,
                  }}
                >
                  Explore the Registry
                </Button>
              </Link>
              <Link href="/doctrine">
                <Button
                  variant="outline"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.50)",
                    fontSize: 12,
                    height: 36,
                  }}
                >
                  Read the Doctrine
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-6 px-6 py-4 border-t"
        style={{ borderColor: "rgba(212,175,55,0.08)" }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.10em",
            color: "rgba(255,255,255,0.20)",
          }}
        >
          ECDSA P-256 · SHA-256 · Append-Only · 17 U.S.C. § 1202(c)(7)
        </span>
      </div>
    </div>
  );
}
