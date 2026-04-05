import { Link } from "wouter";
import { ChevronLeft, Shield, Scale, BookOpen, ScrollText } from "lucide-react";

const LAST_UPDATED = "April 2026";
const VERSION = "1.0";

export default function TermsPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.07 0.012 280)", color: "oklch(0.88 0.02 280)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "oklch(0.07 0.012 280 / 0.95)", borderColor: "oklch(0.18 0.02 280)", backdropFilter: "blur(12px)" }}
      >
        <Link href="/manifesto">
          <button
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "oklch(0.55 0.03 280)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Manifesto
          </button>
        </Link>
        <span style={{ color: "oklch(0.3 0.02 280)" }}>·</span>
        <span className="text-xs font-mono tracking-widest" style={{ color: "oklch(0.45 0.03 280)" }}>
          TERMS OF SERVICE — v{VERSION}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-12">

        {/* Title block */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4" style={{ color: "oklch(0.75 0.18 85)" }} />
            <span className="text-xs font-mono tracking-widest" style={{ color: "oklch(0.55 0.08 85)" }}>
              LIVING NEXUS / TERMS OF SERVICE
            </span>
          </div>
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ fontFamily: "'Orbitron', sans-serif", color: "oklch(0.92 0.04 280)" }}
          >
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: "oklch(0.45 0.03 280)" }}>
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Version {VERSION}
          </p>
        </div>

        {/* ── PREAMBLE ─────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div
            className="rounded-xl p-6 mb-8"
            style={{
              background: "oklch(0.1 0.015 280)",
              border: "1px solid oklch(0.75 0.18 85 / 0.2)",
              boxShadow: "0 0 40px oklch(0.75 0.18 85 / 0.04)",
            }}
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.75 0.18 85)" }} />
              <span
                className="text-[10px] font-mono tracking-widest font-bold"
                style={{ color: "oklch(0.65 0.12 85)" }}
              >
                PREAMBLE — READ THIS FIRST
              </span>
            </div>

            <div className="space-y-5 text-sm leading-relaxed" style={{ color: "oklch(0.78 0.025 280)" }}>
              <p>
                The terms that follow exist to protect creators — not the platform. Most terms of service
                are written as weapons against the people who sign them, stripping ownership, burying rights
                in language designed to confuse, and protecting corporate interests above human ones.
                That is not what this is.
              </p>
              <p>
                We are governed by the current state of the law and the highest order of the land. We submit
                to civil jurisdiction not because law is the highest authority, but because we are called to
                operate with integrity within the world as it is. At the same time, we acknowledge that
                conviction in creation — the understanding that human creative work carries inherent dignity
                because it comes from beings made in the image of God — surpasses any legal instrument.
              </p>
              <p>
                These terms exist to enforce that conviction, not replace it. Where law protects creators,
                we invoke it fully. Where it fails them, we have built the covenant above it to hold the line.
              </p>
            </div>

            {/* Covenant link */}
            <div className="mt-6 pt-5" style={{ borderTop: "1px solid oklch(0.75 0.18 85 / 0.12)" }}>
              <Link href="/manifesto">
                <span
                  className="inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  style={{ color: "oklch(0.65 0.12 85)" }}
                >
                  <ScrollText className="w-3.5 h-3.5" />
                  Read the Living Nexus Covenant →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION DIVIDER HELPER ───────────────────────────────────────── */}
        {/* Sections below follow the same pattern */}

        <Section icon={<BookOpen className="w-4 h-4" />} label="1. Ownership of Creative Work">
          <p>
            You own everything you create and register on Living Nexus. By uploading a work, you do not
            transfer, license, or assign any ownership rights to the platform. The Witness ID (WID) issued
            at registration is a timestamped cryptographic record of your claim — it belongs to you and
            travels with your work permanently.
          </p>
          <p>
            Living Nexus claims no rights to reproduce, distribute, sublicense, or monetize your work
            beyond what is strictly necessary to operate the platform (e.g., displaying cover art, streaming
            audio you have marked as public). You may remove your work at any time. Removal from public view
            does not erase the provenance record — the WID remains as proof of your prior claim.
          </p>
        </Section>

        <Section icon={<Shield className="w-4 h-4" />} label="2. AI Training Consent">
          <p>
            Your work will never be used to train, fine-tune, or improve any artificial intelligence model
            without your explicit, informed, and affirmative consent. The AI Training Consent field on every
            upload is binding. If you select "No AI Training," that instruction is recorded in your
            provenance entry and enforced at the platform level.
          </p>
          <p>
            We do not sell, license, or share creator data with AI companies. We do not aggregate anonymized
            creative output for model training. The covenant is not a checkbox — it is a commitment we are
            held to by the same declaration you sign.
          </p>
        </Section>

        <Section icon={<Scale className="w-4 h-4" />} label="3. Platform Fees and Revenue">
          <p>
            Living Nexus takes a 10% platform fee on direct creator-to-fan transactions (tips, downloads,
            licensing). This fee funds infrastructure, development, and the provenance registry. It is
            disclosed at every transaction point. There are no hidden fees, no retroactive rate changes
            without notice, and no revenue share on works you distribute outside this platform.
          </p>
          <p>
            Stripe processes all payments. Living Nexus does not store card numbers, CVV codes, or full
            payment details. Payout timing is governed by Stripe's standard settlement schedule.
          </p>
        </Section>

        <Section icon={<Shield className="w-4 h-4" />} label="4. Conduct and Content Standards">
          <p>
            Living Nexus is a creative provenance platform. Content that exploits, harms, or dehumanizes
            others has no place here. Works that violate applicable law — including copyright infringement,
            defamation, or content that sexualizes minors — will be removed and the account suspended.
          </p>
          <p>
            Moderation decisions are made by humans, not automated filters alone. Disputed removals may be
            appealed. The Covenant Doctrine governs edge cases where law is silent: if a work degrades the
            dignity of a human being made in the image of God, it does not belong on this platform regardless
            of its legal status.
          </p>
        </Section>

        <Section icon={<BookOpen className="w-4 h-4" />} label="5. Account Termination">
          <p>
            You may delete your account at any time. Upon deletion, your public profile and works are
            removed from the platform. Your provenance records (WIDs) are retained in the registry as
            immutable historical entries — this protects your prior claims even after departure.
          </p>
          <p>
            Living Nexus may suspend or terminate accounts that violate these terms. In cases of suspension,
            you will be notified and given an opportunity to respond before permanent action is taken, except
            where immediate removal is required by law or to protect other users.
          </p>
        </Section>

        <Section icon={<Scale className="w-4 h-4" />} label="6. Limitation of Liability">
          <p>
            Living Nexus is provided "as is." We do not guarantee uninterrupted service, and we are not
            liable for indirect, incidental, or consequential damages arising from your use of the platform.
            Our total liability to you for any claim shall not exceed the fees you paid to the platform in
            the 12 months preceding the claim.
          </p>
          <p>
            This limitation does not apply to gross negligence, willful misconduct, or violations of your
            intellectual property rights caused by the platform's own actions.
          </p>
        </Section>

        <Section icon={<Shield className="w-4 h-4" />} label="7. Governing Law">
          <p>
            These terms are governed by the laws of the United States and the state in which Command
            Domains LLC is registered. Disputes that cannot be resolved informally will be submitted to
            binding arbitration under the rules of the American Arbitration Association, except where
            prohibited by law.
          </p>
          <p>
            Nothing in these terms limits your rights under applicable consumer protection laws in your
            jurisdiction.
          </p>
        </Section>

        <Section icon={<BookOpen className="w-4 h-4" />} label="8. Changes to These Terms">
          <p>
            When these terms change materially, registered creators will be notified before the changes
            take effect. Continued use of the platform after the effective date constitutes acceptance.
            If you disagree with a change, you may close your account before it takes effect without
            penalty.
          </p>
          <p>
            The version number and last-updated date at the top of this page are authoritative. All prior
            versions are archived and available upon request.
          </p>
        </Section>

        {/* Footer */}
        <div
          className="mt-16 pt-8 text-center"
          style={{ borderTop: "1px solid oklch(0.18 0.02 280)" }}
        >
          <p className="text-xs mb-4" style={{ color: "oklch(0.4 0.02 280)" }}>
            Living Nexus is operated by Command Domains LLC · BDDT Publishing
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/manifesto">
              <span className="text-xs transition-colors cursor-pointer" style={{ color: "oklch(0.55 0.08 85)" }}>
                Manifesto
              </span>
            </Link>
            <span style={{ color: "oklch(0.3 0.02 280)" }}>·</span>
            <Link href="/lexicon">
              <span className="text-xs transition-colors cursor-pointer" style={{ color: "oklch(0.55 0.08 85)" }}>
                Lexicon
              </span>
            </Link>
            <span style={{ color: "oklch(0.3 0.02 280)" }}>·</span>
            <Link href="/">
              <span className="text-xs transition-colors cursor-pointer" style={{ color: "oklch(0.55 0.08 85)" }}>
                Home
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section helper ────────────────────────────────────────────────────────────
function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: "oklch(0.65 0.12 85)" }}>{icon}</span>
        <h2
          className="text-base font-semibold"
          style={{ color: "oklch(0.88 0.03 280)" }}
        >
          {label}
        </h2>
      </div>
      <div
        className="space-y-4 text-sm leading-relaxed pl-6"
        style={{ color: "oklch(0.65 0.04 65)", borderLeft: "1px solid oklch(0.2 0.015 280)" }}
      >
        {children}
      </div>
    </section>
  );
}
