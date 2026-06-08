import { Link } from "wouter";
import { ChevronLeft, Shield, ShieldCheck, Scale, BookOpen, ScrollText, AlertTriangle, Server } from "lucide-react";

const LAST_UPDATED = "April 2026";
const VERSION = "1.0";

export default function TermsPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ln-coal)", color: "var(--ln-parchment)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "rgba(44,52,56,0.95)", borderColor: "var(--ln-coal)", backdropFilter: "blur(12px)" }}
      >
        <Link href="/manifesto">
          <button
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "var(--ln-smoke)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Manifesto
          </button>
        </Link>
        <span style={{ color: "var(--ln-iron)" }}>·</span>
        <span className="text-xs font-mono tracking-widest" style={{ color: "var(--ln-smoke)" }}>
          TERMS OF SERVICE — v{VERSION}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-12">

        {/* Title block */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
            <span className="text-xs font-mono tracking-widest" style={{ color: "var(--ln-smoke)" }}>
              LIVING NEXUS / TERMS OF SERVICE
            </span>
          </div>
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ fontFamily: "'Orbitron', sans-serif", color: "var(--ln-parchment)" }}
          >
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Version {VERSION}
          </p>
        </div>

        {/* ── PREAMBLE ─────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div
            className="rounded-xl p-6 mb-8"
            style={{
              background: "var(--ln-coal)",
              border: "1px solid rgba(196,154,40,0.17)",
              boxShadow: "0 0 40px rgba(196,154,40,0.03)",
            }}
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
              <span
                className="text-[10px] font-mono tracking-widest font-bold"
                style={{ color: "var(--ln-gold)" }}
              >
                PREAMBLE — READ THIS FIRST
              </span>
            </div>

            <div className="space-y-5 text-sm leading-relaxed" style={{ color: "var(--ln-parchment)" }}>
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

            {/* Covenant + Compare links */}
            <div className="mt-6 pt-5 flex flex-wrap gap-4" style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}>
              <Link href="/manifesto">
                <span
                  className="inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  style={{ color: "var(--ln-gold)" }}
                >
                  <ScrollText className="w-3.5 h-3.5" />
                  Read the Living Nexus Covenant →
                </span>
              </Link>
              <Link href="/terms/compare">
                <span
                  className="inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  style={{ color: "var(--ln-gold)" }}
                >
                  <Scale className="w-3.5 h-3.5" />
                  Compare Platform TOS →
                </span>
              </Link>
              <Link href="/privacy">
                <span
                  className="inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  style={{ color: "var(--ln-gold)" }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Privacy Policy →
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

        <Section icon={<ShieldCheck className="w-4 h-4" />} label="2. Witness IDs — Scope and Limitations">
          <p>
            A Witness ID (WID) is a cryptographic provenance record issued by Living Nexus at the moment
            of upload. It preserves verifiable proof of authorship, creation date, and work integrity by
            generating a SHA-256 file hash, an ECDSA P-256 digital signature, and a harmonic frequency
            fingerprint derived from the content.
          </p>
          <p>
            <strong>Witness IDs support, but do not replace, official copyright registration.</strong> A WID
            establishes a timestamped record of prior creation that can support copyright registration
            applications, dispute resolution, licensing negotiations, and AI training consent documentation.
            However, a WID is not a substitute for registration with the U.S. Copyright Office or equivalent
            authority in your jurisdiction. For full legal copyright protection in the United States, creators
            are encouraged to register their works at{" "}
            <a
              href="https://www.copyright.gov/registration/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--ln-gold)" }}
            >
              copyright.gov/registration
            </a>
            .
          </p>
          <p>
            Living Nexus (operated by BDDT Publishing, a DBA of Command Domains LLC) issues WIDs as a
            provenance infrastructure service. We make no representations that a WID constitutes legal
            copyright, trademark, or patent protection, and we are not responsible for outcomes in legal
            proceedings that rely solely on a WID as evidence.
          </p>
        </Section>

        <Section icon={<Server className="w-4 h-4" />} label="3. Platform Infrastructure & Governing Terms">
          <div className="flex items-start gap-2 p-3 rounded-md border border-amber-500/30 bg-amber-500/5 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-200/80 text-sm leading-relaxed">
              <strong className="text-amber-300">Current Platform Limitation:</strong> Living Nexus currently
              operates within a third-party AI infrastructure and hosting environment. Until we complete
              migration to fully sovereign, self-hosted infrastructure, the governing terms of that host
              platform may take precedence over the terms stated here in areas of conflict.
            </p>
          </div>
          <p>
            Living Nexus is built on and delivered through an AI provenance generation platform operated by
            a third-party provider. As of the current version of these Terms, we do not have full control
            over the underlying infrastructure, data residency, or the host platform's own Terms of Service.
            The host platform's terms may differ from the protections described in this document — including,
            but not limited to, provisions regarding data use, AI training, content ownership, and service
            availability.
          </p>
          <p>
            We are transparent about this limitation because we believe creators deserve to know the full
            scope of the environment their work is registered in. We are actively working toward sovereign
            hosting — a migration to infrastructure fully owned and controlled by BDDT Publishing / Command
            Domains LLC — at which point these Terms will be the sole governing document without
            third-party override.
          </p>
          <p>
            Until that migration is complete, we encourage creators to review the host platform's Terms of
            Service independently. We will publish a public notice on this page and via platform notification
            when sovereign migration is achieved and these Terms become fully self-enforcing.
          </p>
        </Section>

        <Section icon={<Shield className="w-4 h-4" />} label="4. AI Training Consent">
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

        <Section icon={<Scale className="w-4 h-4" />} label="5. Platform Fees and Revenue">
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

        <Section icon={<Shield className="w-4 h-4" />} label="6. Conduct and Content Standards">
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

        <Section icon={<BookOpen className="w-4 h-4" />} label="7. Account Termination">
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

        <Section icon={<Scale className="w-4 h-4" />} label="8. Limitation of Liability">
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

        <Section icon={<Shield className="w-4 h-4" />} label="9. Governing Law">
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

        <Section icon={<BookOpen className="w-4 h-4" />} label="10. Changes to These Terms">
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
          style={{ borderTop: "1px solid #000000" }}
        >
          <p className="text-xs mb-4" style={{ color: "var(--ln-iron)" }}>
            Living Nexus is operated by Command Domains LLC · BDDT Publishing
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/manifesto">
              <span className="text-xs transition-colors cursor-pointer" style={{ color: "var(--ln-smoke)" }}>
                Manifesto
              </span>
            </Link>
            <span style={{ color: "var(--ln-iron)" }}>·</span>
            <Link href="/lexicon">
              <span className="text-xs transition-colors cursor-pointer" style={{ color: "var(--ln-smoke)" }}>
                Lexicon
              </span>
            </Link>
            <span style={{ color: "var(--ln-iron)" }}>·</span>
            <Link href="/">
              <span className="text-xs transition-colors cursor-pointer" style={{ color: "var(--ln-smoke)" }}>
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
        <span style={{ color: "var(--ln-gold)" }}>{icon}</span>
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--ln-parchment)" }}
        >
          {label}
        </h2>
      </div>
      <div
        className="space-y-4 text-sm leading-relaxed pl-6"
        style={{ color: "var(--ln-smoke)", borderLeft: "1px solid rgba(196,154,40,0.12)" }}
      >
        {children}
      </div>
    </section>
  );
}
