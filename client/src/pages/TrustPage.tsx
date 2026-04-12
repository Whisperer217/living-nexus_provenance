/**
 * /trust — Living Nexus Platform Trust & Transparency Page
 * Public-facing. Shows the latest quarterly engineering audit summary,
 * artifact hash, and per-layer status grid.
 */
import { trpc } from "@/lib/trpc";
import { Shield, CheckCircle2, AlertTriangle, XCircle, Minus, Copy, ExternalLink, Lock, Eye } from "lucide-react";
import { toast } from "sonner";

const GOLD = "oklch(0.84 0.155 85)";
const BG = "oklch(0.06 0.015 280)";
const CARD = "oklch(0.80 0.05 75)";
const BORDER = "oklch(0.18 0.02 280)";
const TEXT = "#E2E8F0";
const SUBTEXT = "#94A3B8";
const GREEN = "oklch(0.65 0.18 145)";
const YELLOW = "oklch(0.78 0.18 85)";
const RED = "oklch(0.65 0.18 25)";

const LAYER_INFO: { key: string; label: string; description: string }[] = [
  { key: "layer2Status",  label: "Infrastructure & Hosting",    description: "Server uptime, CDN, redundancy, and deployment integrity" },
  { key: "layer3Status",  label: "Security & Access Control",   description: "TLS, headers, authentication gates, and privilege separation" },
  { key: "layer4Status",  label: "Data Integrity & Backups",    description: "Database backup cadence, restore testing, and data durability" },
  { key: "layer5Status",  label: "Code Quality & Lineage",      description: "Dependency audit, static analysis, and code provenance tracking" },
  { key: "layer6Status",  label: "Dependency Health",           description: "Third-party package vulnerability scan and update cadence" },
  { key: "layer7Status",  label: "Performance & Availability",  description: "TTFB, Core Web Vitals, and uptime SLA compliance" },
  { key: "layer8Status",  label: "Privacy & Compliance",        description: "GDPR data handling, deletion requests, and consent flows" },
  { key: "layer9Status",  label: "Identity & Authentication",   description: "OAuth integrity, session management, and identity isolation" },
  { key: "layer10Status", label: "Content Authenticity",        description: "WID fingerprinting, hash verification, and tamper detection" },
  { key: "layer11Status", label: "Observability & Logging",     description: "Audit trail completeness, event logging, and anomaly detection" },
  { key: "layer12Status", label: "Incident Response",           description: "Documented runbooks, breach notification plan, and drill history" },
  { key: "layer13Status", label: "Third-Party Integrations",    description: "Stripe, OAuth, and external API security posture" },
  { key: "layer14Status", label: "Creator Rights & Provenance", description: "WID chain integrity, lineage attribution, and rights portability" },
];

type LayerStatus = "pass" | "warning" | "fail" | "na" | null | undefined;

function StatusIcon({ status, size = 16 }: { status: LayerStatus; size?: number }) {
  if (!status || status === "na") return <Minus size={size} style={{ color: SUBTEXT }} />;
  if (status === "pass") return <CheckCircle2 size={size} style={{ color: GREEN }} />;
  if (status === "warning") return <AlertTriangle size={size} style={{ color: YELLOW }} />;
  return <XCircle size={size} style={{ color: RED }} />;
}

function OverallBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const config = {
    pass: { label: "AUDIT PASSED", color: GREEN, bg: "oklch(0.65 0.18 145 / 0.12)" },
    conditional_pass: { label: "CONDITIONAL PASS", color: YELLOW, bg: "oklch(0.78 0.18 85 / 0.12)" },
    fail: { label: "AUDIT FAILED", color: RED, bg: "oklch(0.65 0.18 25 / 0.12)" },
  }[status] ?? { label: status.toUpperCase(), color: SUBTEXT, bg: "transparent" };

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: config.bg, border: `1px solid ${config.color}`,
      borderRadius: 8, padding: "8px 16px",
    }}>
      <StatusIcon status={status as LayerStatus} size={18} />
      <span style={{ color: config.color, fontWeight: 800, fontSize: 14, letterSpacing: "0.1em" }}>{config.label}</span>
    </div>
  );
}

function LayerCard({ info, status }: { info: typeof LAYER_INFO[0]; status: LayerStatus }) {
  const color = !status || status === "na" ? SUBTEXT
    : status === "pass" ? GREEN
    : status === "warning" ? YELLOW
    : RED;

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
      padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <div style={{ marginTop: 2 }}>
        <StatusIcon status={status} size={15} />
      </div>
      <div>
        <div style={{ color: TEXT, fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{info.label}</div>
        <div style={{ color: SUBTEXT, fontSize: 12, lineHeight: 1.5 }}>{info.description}</div>
      </div>
      <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
        {!status || status === "na" ? "N/A" : status === "pass" ? "PASS" : status === "warning" ? "WARN" : "FAIL"}
      </div>
    </div>
  );
}

export default function TrustPage() {
  const { data: audit, isLoading } = trpc.audit.getLatest.useQuery();

  const passCount = LAYER_INFO.filter(l => (audit as any)?.[l.key] === "pass").length;
  const warnCount = LAYER_INFO.filter(l => (audit as any)?.[l.key] === "warning").length;
  const failCount = LAYER_INFO.filter(l => (audit as any)?.[l.key] === "fail").length;

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(180deg, oklch(0.10 0.025 280) 0%, ${BG} 100%)`,
        borderBottom: `1px solid ${BORDER}`,
        padding: "60px 24px 48px",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `oklch(0.84 0.155 85 / 0.12)`,
            border: `2px solid ${GOLD}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={28} style={{ color: GOLD }} />
          </div>
        </div>
        <h1 style={{ color: TEXT, fontWeight: 800, fontSize: 32, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          Platform Trust & Transparency
        </h1>
        <p style={{ color: SUBTEXT, fontSize: 16, maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Living Nexus publishes quarterly engineering audit results so creators can verify
          that the platform holding their provenance records is itself trustworthy.
        </p>

        {/* Two trust pillars */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 16px" }}>
            <Lock size={14} style={{ color: GOLD }} />
            <span style={{ color: TEXT, fontSize: 13 }}>Identity-locked provenance</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 16px" }}>
            <Eye size={14} style={{ color: GOLD }} />
            <span style={{ color: TEXT, fontSize: 13 }}>Open audit results</span>
          </div>
        </div>

        {/* Latest audit overall status */}
        {!isLoading && audit && <OverallBadge status={audit.overallStatus} />}
        {!isLoading && !audit && (
          <div style={{ color: SUBTEXT, fontSize: 14 }}>No audit records published yet.</div>
        )}
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
        {isLoading && (
          <div style={{ textAlign: "center", color: SUBTEXT, padding: 60 }}>Loading audit data…</div>
        )}

        {!isLoading && audit && (
          <>
            {/* Audit meta */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ color: SUBTEXT, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>AUDIT VERSION</div>
                  <div style={{ color: GOLD, fontWeight: 700, fontSize: 15 }}>{audit.auditVersion}</div>
                </div>
                <div>
                  <div style={{ color: SUBTEXT, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>DATE</div>
                  <div style={{ color: TEXT, fontSize: 14 }}>
                    {new Date(audit.auditDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                </div>
                <div>
                  <div style={{ color: SUBTEXT, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>AUDITOR</div>
                  <div style={{ color: TEXT, fontSize: 14 }}>{audit.auditorName}</div>
                </div>
                <div>
                  <div style={{ color: SUBTEXT, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>LAYERS</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: GREEN, fontWeight: 700, fontSize: 14 }}>{passCount}✓</span>
                    {warnCount > 0 && <span style={{ color: YELLOW, fontWeight: 700, fontSize: 14 }}>{warnCount}⚠</span>}
                    {failCount > 0 && <span style={{ color: RED, fontWeight: 700, fontSize: 14 }}>{failCount}✗</span>}
                  </div>
                </div>
              </div>

              {/* Artifact hash */}
              <div style={{ background: BG, borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <Shield size={13} style={{ color: GOLD }} />
                <span style={{ color: SUBTEXT, fontSize: 12, whiteSpace: "nowrap" }}>Artifact SHA-256:</span>
                <code style={{ color: GOLD, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", flex: 1 }}>
                  {audit.artifactHash}
                </code>
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4 }}
                  onClick={() => { navigator.clipboard.writeText(audit.artifactHash ?? ""); toast.success("Hash copied to clipboard"); }}
                  title="Copy hash"
                >
                  <Copy size={13} style={{ color: SUBTEXT }} />
                </button>
                {audit.reportUrl && (
                  <a
                    href={audit.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: GOLD, fontSize: 12, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
                  >
                    <ExternalLink size={12} /> Full Report
                  </a>
                )}
              </div>
            </div>

            {/* Public summary */}
            {audit.publicSummary && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
                <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>AUDIT SUMMARY</div>
                <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{audit.publicSummary}</p>
              </div>
            )}

            {/* Layer grid */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: TEXT, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>14-Layer Audit Results</div>
              <div style={{ color: SUBTEXT, fontSize: 13, marginBottom: 20 }}>
                Each layer maps to a domain of platform trustworthiness as defined by the Web Provenance Audit Framework.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {LAYER_INFO.map(info => (
                  <LayerCard
                    key={info.key}
                    info={info}
                    status={(audit as any)[info.key] as LayerStatus}
                  />
                ))}
              </div>
            </div>

            {/* Verification note */}
            <div style={{ marginTop: 32, padding: 20, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
              <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>HOW TO VERIFY</div>
              <p style={{ color: SUBTEXT, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                The artifact hash above is a SHA-256 fingerprint of the full audit report document. To independently verify,
                download the full report and run <code style={{ background: BG, padding: "1px 5px", borderRadius: 3, color: GOLD }}>sha256sum report.md</code> —
                the output must match the hash shown here. Audits are conducted quarterly and published within 7 days of completion.
              </p>
            </div>
          </>
        )}

        {!isLoading && !audit && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Shield size={40} style={{ color: SUBTEXT, margin: "0 auto 16px", display: "block" }} />
            <div style={{ color: TEXT, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>First Audit Pending</div>
            <div style={{ color: SUBTEXT, fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
              The first quarterly audit is being prepared. Results will be published here once completed and signed.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
