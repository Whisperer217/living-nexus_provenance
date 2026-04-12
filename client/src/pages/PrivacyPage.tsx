import { ChevronLeft, Shield, Database, Server, Lock, Eye, UserCheck, AlertTriangle, Globe, Trash2, Mail, FileText, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-6 mb-4"
      style={{ background: "#2C3438", border: "1px solid rgba(230,205,174,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: "#CBB183" }}>{icon}</span>
        <h2 className="text-sm font-heading tracking-widest uppercase" style={{ color: "#CBB183" }}>
          {label}
        </h2>
      </div>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: "#DACAAA" }}>
        {children}
      </div>
    </div>
  );
}

// ── Highlight callout ────────────────────────────────────────────────────────
function Callout({ color, icon, title, children }: { color: "amber" | "green" | "blue" | "red"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const colors = {
    amber: { bg: "rgba(122,90,30,0.25)", border: "rgba(203,177,131,0.35)", text: "#E6CDAE" },
    green: { bg: "rgba(44,52,56,0.25)", border: "rgba(74,222,128,0.35)", text: "#4ADE80" },
    blue:  { bg: "rgba(44,52,56,0.25)", border: "rgba(56,189,248,0.35)", text: "#E6CDAE" },
    red:   { bg: "rgba(44,52,56,0.25)",  border: "rgba(239,68,68,0.35)",  text: "#EF4444"  },
  };
  const c = colors[color];
  return (
    <div className="rounded-lg p-4 mt-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0" style={{ color: c.text }}>{icon}</span>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: c.text }}>{title}</p>
          <div className="text-xs leading-relaxed" style={{ color: c.text, opacity: 0.85 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ── Processor table row ──────────────────────────────────────────────────────
function ProcessorRow({ name, purpose, dataShared, policy }: { name: string; purpose: string; dataShared: string; policy: string }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-lg text-xs"
      style={{ background: "#2C3438", border: "1px solid rgba(230,205,174,0.06)" }}
    >
      <div className="font-semibold" style={{ color: "#E6CDAE" }}>{name}</div>
      <div style={{ color: "#DACAAA" }}>{purpose}</div>
      <div style={{ color: "#DACAAA" }}>{dataShared}</div>
      <a href={policy} target="_blank" rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80 transition-opacity"
        style={{ color: "#38BDF8" }}>
        Privacy Policy ↗
      </a>
    </div>
  );
}

// ── Sovereign Migration Status Tracker (live from DB) ───────────────────────
function SovereignMigrationTracker() {
  const { data, isLoading } = trpc.onboarding.getSovereignMigrationStatus.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });

  const stage = data?.stage ?? "hosted";
  const notes = data?.notes;

  const stageIndex: Record<string, number> = { hosted: 0, migrating: 2, sovereign: 3 };
  const currentIndex = stageIndex[stage] ?? 0;

  const steps = [
    { label: "Hosted" },
    { label: "Planning" },
    { label: "Migrating" },
    { label: "Sovereign" },
  ];

  const stageBadgeStyle: Record<string, React.CSSProperties> = {
    hosted:    { background: "rgba(122,90,30,0.3)",  color: "#E6CDAE",  border: "1px solid rgba(203,177,131,0.3)" },
    migrating: { background: "rgba(44,52,56,0.3)", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.3)" },
    sovereign: { background: "rgba(44,52,56,0.3)", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.3)" },
  };

  const stageDescriptions: Record<string, string> = {
    hosted:    "Third-party hosted infrastructure (Manus platform). Planning phase begins when sovereign server infrastructure is procured.",
    migrating: "Migration in progress. Data is being transitioned to independently operated infrastructure.",
    sovereign: "Sovereign infrastructure active. Living Nexus operates on independently controlled servers.",
  };

  return (
    <div className="mt-5 rounded-xl p-4" style={{ background: "#2C3438)", border: "1px solid rgba(203,177,131,0.2)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "#CBB183" }}>Sovereign Migration Status</p>
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#3F4A50" }} />
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase" style={stageBadgeStyle[stage] ?? stageBadgeStyle.hosted}>
            {stage}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0 mb-3">
        {steps.map((step, i, arr) => {
          const done = i <= currentIndex;
          const current = i === currentIndex;
          return (
            <div key={step.label} className="flex items-center" style={{ flex: i < arr.length - 1 ? "1" : "none" }}>
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: done ? "#CBB183" : "#2C3438",
                    border: current ? "2px solid #E6CDAE" : done ? "none" : "1px solid #2C3438",
                    color: done ? "#2C3438)" : "#3F4A50",
                  }}>
                  {done ? "✓" : i + 1}
                </div>
                <span className="text-[9px] mt-1 whitespace-nowrap" style={{ color: done ? "#CBB183" : "#3F4A50" }}>{step.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className="flex-1 h-px mx-1 mb-3" style={{ background: done ? "rgba(203,177,131,0.4)" : "#C3AB7D" }} />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: "#3F4A50" }}>
        {stageDescriptions[stage]}
        {notes && <><br /><span className="italic">{notes}</span></>}
      </p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Back nav */}
      <Link href="/terms">
        <span className="inline-flex items-center gap-1.5 text-xs mb-6 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: "#3F4A50" }}>
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Terms of Service
        </span>
      </Link>

      {/* Header */}
      <div
        className="rounded-2xl p-8 mb-6"
        style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.15)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(203,177,131,0.12)", border: "1px solid rgba(203,177,131,0.22)" }}>
            <Shield className="w-5 h-5" style={{ color: "#E6CDAE" }} />
          </div>
          <div>
            <h1 className="text-xl font-heading tracking-widest uppercase" style={{ color: "#E6CDAE" }}>
              Privacy Policy
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#3F4A50" }}>
              Living Nexus · BDDT Publishing / Command Domains LLC · Version 1.0 · April 2026
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#DACAAA" }}>
          <p>
            This Privacy Policy describes how Living Nexus, operated by BDDT Publishing / Command Domains LLC
            ("we," "us," or "the platform"), collects, uses, stores, and protects information about creators and
            visitors who use the platform at livingnexus.org.
          </p>
          <p>
            We are a creator-first provenance platform. Our default posture is to collect the minimum data
            necessary to operate the registry, protect your authorship record, and facilitate the services you
            request. We do not sell your data. We do not train AI models on your creative work without explicit,
            informed, opt-in consent.
          </p>
        </div>

        <Callout color="amber" icon={<AlertTriangle className="w-3.5 h-3.5" />} title="Platform Infrastructure Limitation">
          Living Nexus currently operates within third-party hosting infrastructure (Manus platform). Until
          sovereign migration to independent infrastructure is complete, data residency and processing may be
          subject to the host platform's terms in addition to this policy. We disclose this constraint
          transparently rather than obscuring it in legal boilerplate.
        </Callout>

         {/* ── Sovereign Migration Status Tracker (live from DB) ── */}
        <SovereignMigrationTracker />
        <div className="mt-5 pt-4 flex flex-wrap gap-4" style={{ borderTop: "1px solid rgba(203,177,131,0.12)" }}>
          <Link href="/terms">
            <span className="inline-flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: "#CBB183" }}>
              <FileText className="w-3.5 h-3.5" />
              Terms of Service →
            </span>
          </Link>
          <Link href="/terms/compare">
            <span className="inline-flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: "#CBB183" }}>
              <Eye className="w-3.5 h-3.5" />
              Compare Platform TOS →
            </span>
          </Link>
        </div>
      </div>
      {/* Section 1 — Data We Collect */}
      <Section icon={<Database className="w-4 h-4" />} label="1. Data We Collect">
        <p>
          We collect only what is necessary to operate the registry and provide the services you request.
          The categories of data we collect are:
        </p>
        <div className="space-y-2 mt-2">
          {[
            { label: "Account Identity", detail: "Name, email address, and OAuth identifier provided at login via Manus OAuth (Google). We do not store your Google password." },
            { label: "Creator Profile", detail: "Artist handle, biography, location, website, social handles, profile photo, and banner image — all provided voluntarily by you." },
            { label: "Uploaded Works", detail: "Audio files, cover art, lyrics, manuscripts, and comic files you upload for registration. These are stored in S3 object storage and associated with your Witness ID record." },
            { label: "Witness ID Records", detail: "Cryptographic hash, timestamp, work metadata, and HAAI declaration fields (if you choose the Human-Authored via AI Instrument disclosure). These form your provenance record." },
            { label: "Payment Information", detail: "We do not store card numbers or payment credentials. Payment processing is handled entirely by Stripe. We store only Stripe customer IDs, subscription IDs, and payment intent IDs as references." },
            { label: "Usage Data", detail: "Page views, play counts, download counts, and interaction events (likes, reactions, comments) associated with your account. Used to operate the platform and display your dashboard analytics." },
            { label: "Technical Data", detail: "IP address, browser type, and session cookies necessary to authenticate your session and operate the platform securely. Not used for advertising profiling." },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-3" style={{ background: "#2C3438", border: "1px solid rgba(230,205,174,0.06)" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#E6CDAE" }}>{item.label}</p>
              <p className="text-xs" style={{ color: "#AA8E64" }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 2 — How We Use Your Data */}
      <Section icon={<Eye className="w-4 h-4" />} label="2. How We Use Your Data">
        <p>We use the data we collect for the following purposes only:</p>
        <ul className="space-y-1.5 mt-2 list-none">
          {[
            "Operating the Witness ID registry — generating, storing, and serving provenance certificates.",
            "Authenticating your session and protecting your account from unauthorized access.",
            "Processing payments and managing your subscription or slot purchases via Stripe.",
            "Displaying your creator profile, uploaded works, and analytics dashboard.",
            "Sending platform notifications (new comments, reactions, tips, system alerts) that you have opted into.",
            "Detecting and preventing abuse, fraud, or violations of the Terms of Service.",
            "Improving platform performance and reliability through aggregated, anonymized usage analytics.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#AA8E64" }}>
              <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "#CBB183", marginTop: "5px" }} />
              {item}
            </li>
          ))}
        </ul>
        <Callout color="green" icon={<Shield className="w-3.5 h-3.5" />} title="We Do Not">
          Sell your data to third parties. Use your creative works to train AI models without explicit opt-in
          consent. Share your personal information with advertisers. Build behavioral profiles for advertising
          targeting. Use your data for any purpose not listed above.
        </Callout>
      </Section>

      {/* Section 3 — AI Training Consent */}
      <Section icon={<Lock className="w-4 h-4" />} label="3. AI Training Consent">
        <p>
          Living Nexus operates a voluntary AI training consent system. Your creative works are <strong style={{ color: "#E6CDAE" }}>never</strong> used
          to train AI models by default. Consent is opt-in only, granular, and revocable.
        </p>
        <p>
          When you upload a work, you may choose one of three AI training consent levels: <em>No AI Training</em> (default),
          <em> Style Reference Only</em> (allows your work to inform stylistic outputs without direct reproduction),
          or <em>Full Training Consent</em> (allows use in model training datasets). You may change this setting
          at any time from your creator dashboard or the song detail page.
        </p>
        <Callout color="blue" icon={<UserCheck className="w-3.5 h-3.5" />} title="Your Consent Controls">
          Consent changes take effect immediately for future use. We do not retroactively apply new consent
          levels to uses that occurred before the change. If you revoke consent, your work is removed from
          any future training pipelines within 30 days.
        </Callout>
      </Section>

      {/* Section 4 — Data Residency */}
      <Section icon={<Globe className="w-4 h-4" />} label="4. Data Residency">
        <p>
          Living Nexus stores creator data in the following locations:
        </p>
        <div className="space-y-2 mt-2">
          {[
            { label: "Database", detail: "Creator accounts, Witness ID records, song metadata, comments, tips, and platform data are stored in a MySQL/TiDB database hosted by the Manus platform infrastructure (US region)." },
            { label: "File Storage", detail: "Audio files, cover art, lyrics, manuscripts, and comic uploads are stored in Amazon S3 (AWS) object storage via the Manus platform's preconfigured S3 bucket (US region)." },
            { label: "CDN", detail: "Profile photos, banners, and cover art are served via Amazon CloudFront CDN (d2xsxph8kpxj0f.cloudfront.net) for performance. Files are cached at edge nodes globally." },
            { label: "Payment Data", detail: "All payment and billing data is stored exclusively by Stripe, Inc. in their PCI-DSS compliant infrastructure. We store only Stripe resource IDs as references." },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-3" style={{ background: "#2C3438", border: "1px solid rgba(230,205,174,0.06)" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#E6CDAE" }}>{item.label}</p>
              <p className="text-xs" style={{ color: "#AA8E64" }}>{item.detail}</p>
            </div>
          ))}
        </div>
        <Callout color="amber" icon={<AlertTriangle className="w-3.5 h-3.5" />} title="Sovereign Migration Commitment">
          We are committed to migrating Living Nexus to fully sovereign, independently operated infrastructure.
          When migration is complete, this section will be updated to reflect the new data residency locations.
          Creators will be notified of any material changes to where their data is stored.
        </Callout>
      </Section>

      {/* Section 5 — Data Retention */}
      <Section icon={<Trash2 className="w-4 h-4" />} label="5. Data Retention">
        <p>We retain your data for as long as your account is active or as needed to provide services.</p>
        <div className="space-y-2 mt-2">
          {[
            { label: "Account Data", period: "Duration of account + 90 days after deletion request", detail: "Retained to allow account recovery and resolve any outstanding disputes." },
            { label: "Witness ID Records", period: "Indefinite (provenance records)", detail: "WID records are cryptographic provenance artifacts. The hash, timestamp, and metadata are retained permanently to preserve the integrity of the registry. Deleting your account removes your personal association but preserves the provenance record." },
            { label: "Uploaded Works", period: "Duration of account + 30 days after deletion", detail: "Audio, cover art, and document files are deleted from S3 within 30 days of account deletion unless they are referenced by an active WID record." },
            { label: "Payment Records", period: "7 years (legal/tax requirement)", detail: "Transaction records are retained for tax and legal compliance purposes. Card data is never stored by us." },
            { label: "Usage Logs", period: "90 days rolling", detail: "Access logs and usage analytics are retained for 90 days for security and performance monitoring, then deleted." },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-3" style={{ background: "#2C3438", border: "1px solid rgba(230,205,174,0.06)" }}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-xs font-semibold" style={{ color: "#E6CDAE" }}>{item.label}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(203,177,131,0.12)", color: "#CBB183" }}>{item.period}</span>
              </div>
              <p className="text-xs" style={{ color: "#AA8E64" }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6 — Third-Party Processors */}
      <Section icon={<Server className="w-4 h-4" />} label="6. Third-Party Data Processors">
        <p>
          We share data with the following third-party processors to operate the platform. We do not share
          data with any processor for advertising or profiling purposes.
        </p>
        <div className="space-y-2 mt-3">
          <div className="grid grid-cols-4 gap-2 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#3F4A50" }}>
            <span>Processor</span><span>Purpose</span><span>Data Shared</span><span>Policy</span>
          </div>
          <ProcessorRow
            name="Manus Platform"
            purpose="Hosting, database, S3 storage, OAuth, CDN"
            dataShared="All platform data (database, files, auth tokens)"
            policy="https://manus.im/privacy"
          />
          <ProcessorRow
            name="Stripe, Inc."
            purpose="Payment processing, subscriptions, creator payouts"
            dataShared="Name, email, Stripe customer ID, payment amounts"
            policy="https://stripe.com/privacy"
          />
          <ProcessorRow
            name="Amazon Web Services"
            purpose="S3 file storage, CloudFront CDN"
            dataShared="Uploaded files (audio, images, documents)"
            policy="https://aws.amazon.com/privacy/"
          />
          <ProcessorRow
            name="Google (OAuth)"
            purpose="Authentication via Google account"
            dataShared="Name, email, Google account ID (read-only)"
            policy="https://policies.google.com/privacy"
          />
          <ProcessorRow
            name="Sonauto"
            purpose="AI music transformation (opt-in feature)"
            dataShared="Audio file URL, transformation prompt (only when you use AI Transform)"
            policy="https://sonauto.ai/privacy"
          />
        </div>
      </Section>

      {/* Section 7 — Creator Data Rights */}
      <Section icon={<UserCheck className="w-4 h-4" />} label="7. Your Creator Data Rights">
        <p>
          You have the following rights with respect to your data on Living Nexus. To exercise any of these
          rights, contact us at the address in Section 9.
        </p>
        <div className="space-y-2 mt-2">
          {[
            { right: "Access", detail: "Request a copy of all personal data we hold about you, including your account data, uploaded works metadata, and WID records." },
            { right: "Correction", detail: "Request correction of inaccurate personal data. You can update most profile data directly from your settings page." },
            { right: "Deletion", detail: "Request deletion of your account and associated personal data. WID provenance records (hash + timestamp) are retained as part of the registry integrity, but your personal association is removed." },
            { right: "Data Portability", detail: "Request an export of your data in a machine-readable format (JSON). Includes your profile, song metadata, WID records, and HAAI declarations." },
            { right: "AI Consent Revocation", detail: "Revoke AI training consent for any or all of your works at any time from your creator dashboard. Changes take effect within 30 days." },
            { right: "Objection", detail: "Object to any processing of your data that you believe is not covered by this policy or your consent. We will investigate and respond within 30 days." },
          ].map(item => (
            <div key={item.right} className="rounded-lg p-3" style={{ background: "#2C3438", border: "1px solid rgba(230,205,174,0.06)" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#E6CDAE" }}>Right to {item.right}</p>
              <p className="text-xs" style={{ color: "#AA8E64" }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 8 — Cookies */}
      <Section icon={<Lock className="w-4 h-4" />} label="8. Cookies & Session Data">
        <p>
          Living Nexus uses a minimal set of cookies necessary to operate the platform. We do not use
          advertising cookies, tracking pixels, or third-party analytics cookies.
        </p>
        <div className="space-y-2 mt-2">
          {[
            { name: "Session Cookie", type: "Strictly Necessary", detail: "A signed JWT session cookie set after OAuth login. Required to authenticate your requests. Expires after 30 days of inactivity." },
            { name: "Analytics Cookie", type: "Performance (Anonymous)", detail: "A first-party analytics cookie that tracks page views and play counts in aggregate. No personal identifiers. Used to display your dashboard stats." },
          ].map(item => (
            <div key={item.name} className="rounded-lg p-3" style={{ background: "#2C3438", border: "1px solid rgba(230,205,174,0.06)" }}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-xs font-semibold" style={{ color: "#E6CDAE" }}>{item.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(203,177,131,0.12)", color: "#CBB183" }}>{item.type}</span>
              </div>
              <p className="text-xs" style={{ color: "#AA8E64" }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 9 — Contact */}
      <Section icon={<Mail className="w-4 h-4" />} label="9. Contact & Policy Updates">
        <p>
          For privacy requests, data export requests, or questions about this policy, contact BDDT Publishing /
          Command Domains LLC at:
        </p>
        <div className="rounded-lg p-4 mt-2" style={{ background: "#2C3438", border: "1px solid rgba(230,205,174,0.06)" }}>
          <p className="text-xs" style={{ color: "#DACAAA" }}>
            <strong style={{ color: "#E6CDAE" }}>BDDT Publishing / Command Domains LLC</strong><br />
            Website: <a href="https://blooddirtductape.com" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2" style={{ color: "#38BDF8" }}>blooddirtductape.com</a><br />
            Platform: <a href="https://livingnexus.org" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2" style={{ color: "#38BDF8" }}>livingnexus.org</a>
          </p>
        </div>
        <p className="mt-3">
          We will notify creators of any material changes to this Privacy Policy via the platform's WhatsNew
          modal and by updating the version date at the top of this page. Continued use of the platform after
          notification constitutes acceptance of the updated policy. For changes that materially reduce your
          rights, we will require explicit re-acknowledgment via the TOS acceptance flow.
        </p>
        <Callout color="green" icon={<Shield className="w-3.5 h-3.5" />} title="Our Commitment">
          This policy is written in plain language by design. If any section is unclear, contact us and we
          will clarify it — and update the policy to be clearer for everyone. Opacity is a tool of extraction.
          Clarity is a tool of protection.
        </Callout>
      </Section>

    </div>
  );
}
