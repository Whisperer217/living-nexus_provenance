/**
 * /admin/audit — Platform Engineering Audit Log
 * Admin-only page. Lists all quarterly audit records and allows creating/editing entries.
 * Each entry maps to the 14-layer Web Provenance Audit Framework.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Plus, CheckCircle2, AlertTriangle, XCircle,
  Minus, ChevronDown, ChevronUp, ExternalLink, Copy, RefreshCw,
} from "lucide-react";

const GOLD = "oklch(0.84 0.155 85)";
const BG = "#E6CDAE";
const CARD = "oklch(0.12 0.015 280)";
const BORDER = "oklch(0.2 0.02 280)";
const TEXT = "#E2E8F0";
const SUBTEXT = "#94A3B8";
const GREEN = "oklch(0.65 0.18 145)";
const YELLOW = "oklch(0.78 0.18 85)";
const RED = "oklch(0.65 0.18 25)";

const LAYER_LABELS: Record<string, string> = {
  layer2Status: "L2 — Infrastructure & Hosting",
  layer3Status: "L3 — Security & Access Control",
  layer4Status: "L4 — Data Integrity & Backups",
  layer5Status: "L5 — Code Quality & Lineage",
  layer6Status: "L6 — Dependency Health",
  layer7Status: "L7 — Performance & Availability",
  layer8Status: "L8 — Privacy & Compliance",
  layer9Status: "L9 — Identity & Authentication",
  layer10Status: "L10 — Content Authenticity",
  layer11Status: "L11 — Observability & Logging",
  layer12Status: "L12 — Incident Response",
  layer13Status: "L13 — Third-Party Integrations",
  layer14Status: "L14 — Creator Rights & Provenance",
};

type LayerStatus = "pass" | "warning" | "fail" | "na";
type OverallStatus = "pass" | "conditional_pass" | "fail";

function StatusIcon({ status }: { status: LayerStatus | OverallStatus | null | undefined }) {
  if (!status || status === "na") return <Minus size={14} style={{ color: SUBTEXT }} />;
  if (status === "pass") return <CheckCircle2 size={14} style={{ color: GREEN }} />;
  if (status === "warning" || status === "conditional_pass") return <AlertTriangle size={14} style={{ color: YELLOW }} />;
  return <XCircle size={14} style={{ color: RED }} />;
}

function StatusBadge({ status }: { status: LayerStatus | OverallStatus | null | undefined }) {
  const label = status === "conditional_pass" ? "CONDITIONAL" : (status ?? "N/A").toUpperCase();
  const color = !status || status === "na" ? SUBTEXT
    : status === "pass" ? GREEN
    : status === "warning" || status === "conditional_pass" ? YELLOW
    : RED;
  return (
    <span style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>{label}</span>
  );
}

function AuditCard({ log, onEdit }: { log: any; onEdit: (log: any) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
      {/* Header row */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <StatusIcon status={log.overallStatus} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>{log.auditVersion}</span>
            <StatusBadge status={log.overallStatus} />
          </div>
          <div style={{ color: SUBTEXT, fontSize: 12, marginTop: 2 }}>
            {new Date(log.auditDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {" · "}Auditor: {log.auditorName}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button
            size="sm"
            variant="outline"
            style={{ fontSize: 12, height: 28, padding: "0 10px", borderColor: BORDER, color: GOLD }}
            onClick={e => { e.stopPropagation(); onEdit(log); }}
          >
            Edit
          </Button>
          {expanded ? <ChevronUp size={16} style={{ color: SUBTEXT }} /> : <ChevronDown size={16} style={{ color: SUBTEXT }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 18px" }}>
          {/* Artifact hash */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Shield size={13} style={{ color: GOLD }} />
            <span style={{ color: SUBTEXT, fontSize: 12 }}>Artifact SHA-256:</span>
            <code style={{ color: GOLD, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{log.artifactHash}</code>
            <button
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
              onClick={() => { navigator.clipboard.writeText(log.artifactHash); toast.success("Hash copied"); }}
            >
              <Copy size={12} style={{ color: SUBTEXT }} />
            </button>
            {log.reportUrl && (
              <a href={log.reportUrl} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontSize: 12, display: "flex", alignItems: "center", gap: 3 }}>
                <ExternalLink size={12} /> View Report
              </a>
            )}
          </div>

          {/* Layer grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
            {Object.entries(LAYER_LABELS).map(([key, label]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: BG, borderRadius: 6 }}>
                <StatusIcon status={log[key]} />
                <span style={{ color: TEXT, fontSize: 12 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Public summary */}
          {log.publicSummary && (
            <div style={{ background: BG, borderRadius: 6, padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>PUBLIC SUMMARY</div>
              <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.6 }}>{log.publicSummary}</div>
            </div>
          )}

          {/* Internal notes */}
          {log.internalNotes && (
            <div style={{ background: BG, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ color: SUBTEXT, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>INTERNAL NOTES</div>
              <div style={{ color: SUBTEXT, fontSize: 13, lineHeight: 1.6 }}>{log.internalNotes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS: { value: LayerStatus; label: string }[] = [
  { value: "pass", label: "✅ Pass" },
  { value: "warning", label: "⚠️ Warning" },
  { value: "fail", label: "❌ Fail" },
  { value: "na", label: "— N/A" },
];

function AuditForm({ initial, onClose }: { initial?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    auditVersion: initial?.auditVersion ?? "",
    auditDate: initial?.auditDate ? new Date(initial.auditDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    auditorName: initial?.auditorName ?? "Manus AI",
    overallStatus: (initial?.overallStatus ?? "pass") as OverallStatus,
    artifactHash: initial?.artifactHash ?? "",
    reportUrl: initial?.reportUrl ?? "",
    publicSummary: initial?.publicSummary ?? "",
    internalNotes: initial?.internalNotes ?? "",
    layer2Status: (initial?.layer2Status ?? "na") as LayerStatus,
    layer3Status: (initial?.layer3Status ?? "na") as LayerStatus,
    layer4Status: (initial?.layer4Status ?? "na") as LayerStatus,
    layer5Status: (initial?.layer5Status ?? "na") as LayerStatus,
    layer6Status: (initial?.layer6Status ?? "na") as LayerStatus,
    layer7Status: (initial?.layer7Status ?? "na") as LayerStatus,
    layer8Status: (initial?.layer8Status ?? "na") as LayerStatus,
    layer9Status: (initial?.layer9Status ?? "na") as LayerStatus,
    layer10Status: (initial?.layer10Status ?? "na") as LayerStatus,
    layer11Status: (initial?.layer11Status ?? "na") as LayerStatus,
    layer12Status: (initial?.layer12Status ?? "na") as LayerStatus,
    layer13Status: (initial?.layer13Status ?? "na") as LayerStatus,
    layer14Status: (initial?.layer14Status ?? "na") as LayerStatus,
  });

  const createMut = trpc.audit.create.useMutation({
    onSuccess: () => { utils.audit.getAll.invalidate(); toast.success("Audit log created"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.audit.update.useMutation({
    onSuccess: () => { utils.audit.getAll.invalidate(); toast.success("Audit log updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const inputStyle = {
    background: BG, border: `1px solid ${BORDER}`, borderRadius: 6,
    color: TEXT, fontSize: 13, padding: "7px 10px", width: "100%", outline: "none",
  };
  const labelStyle = { color: SUBTEXT, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4, display: "block" };

  const handleSubmit = () => {
    const payload = {
      ...form,
      auditDate: new Date(form.auditDate),
      reportUrl: form.reportUrl || undefined,
      publicSummary: form.publicSummary || undefined,
      internalNotes: form.internalNotes || undefined,
    };
    if (initial?.id) {
      updateMut.mutate({ id: initial.id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
        {initial ? "Edit Audit Entry" : "New Audit Entry"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>AUDIT VERSION</label>
          <input style={inputStyle} value={form.auditVersion} onChange={e => setForm(f => ({ ...f, auditVersion: e.target.value }))} placeholder="Q1-2026" />
        </div>
        <div>
          <label style={labelStyle}>AUDIT DATE</label>
          <input type="date" style={inputStyle} value={form.auditDate} onChange={e => setForm(f => ({ ...f, auditDate: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>AUDITOR</label>
          <input style={inputStyle} value={form.auditorName} onChange={e => setForm(f => ({ ...f, auditorName: e.target.value }))} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>OVERALL STATUS</label>
          <select style={inputStyle} value={form.overallStatus} onChange={e => setForm(f => ({ ...f, overallStatus: e.target.value as OverallStatus }))}>
            <option value="pass">✅ Pass</option>
            <option value="conditional_pass">⚠️ Conditional Pass</option>
            <option value="fail">❌ Fail</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>ARTIFACT SHA-256</label>
          <input style={inputStyle} value={form.artifactHash} onChange={e => setForm(f => ({ ...f, artifactHash: e.target.value }))} placeholder="sha256:..." />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>REPORT URL (optional)</label>
        <input style={inputStyle} value={form.reportUrl} onChange={e => setForm(f => ({ ...f, reportUrl: e.target.value }))} placeholder="https://..." />
      </div>

      {/* Layer statuses */}
      <div style={{ color: SUBTEXT, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 8 }}>LAYER STATUSES</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {Object.entries(LAYER_LABELS).map(([key, label]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: TEXT, fontSize: 12, flex: 1 }}>{label}</span>
            <select
              style={{ ...inputStyle, width: 110, padding: "4px 6px" }}
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>PUBLIC SUMMARY</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          value={form.publicSummary}
          onChange={e => setForm(f => ({ ...f, publicSummary: e.target.value }))}
          placeholder="Summary shown on the public /trust page..."
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>INTERNAL NOTES (admin only)</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          value={form.internalNotes}
          onChange={e => setForm(f => ({ ...f, internalNotes: e.target.value }))}
          placeholder="Internal notes, remediation actions, follow-ups..."
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Button
          onClick={handleSubmit}
          disabled={createMut.isPending || updateMut.isPending}
          style={{ background: GOLD, color: "#0a0a0a", fontWeight: 700 }}
        >
          {createMut.isPending || updateMut.isPending ? "Saving..." : initial ? "Update Entry" : "Create Entry"}
        </Button>
        <Button variant="outline" onClick={onClose} style={{ borderColor: BORDER, color: TEXT }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const { data: logs, isLoading: logsLoading, refetch } = trpc.audit.getAll.useQuery(undefined, { retry: false });

  if (authLoading) return <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: SUBTEXT }}>Loading…</div></div>;
  if (user?.role !== "admin") {
    navigate("/");
    return null;
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Shield size={22} style={{ color: GOLD }} />
        <div>
          <div style={{ color: TEXT, fontWeight: 800, fontSize: 20 }}>Platform Audit Log</div>
          <div style={{ color: SUBTEXT, fontSize: 13 }}>Quarterly engineering audit records — 14-layer Web Provenance Audit Framework</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button
            size="sm"
            variant="outline"
            style={{ borderColor: BORDER, color: SUBTEXT }}
            onClick={() => refetch()}
          >
            <RefreshCw size={14} />
          </Button>
          <Button
            size="sm"
            style={{ background: GOLD, color: "#0a0a0a", fontWeight: 700 }}
            onClick={() => { setEditTarget(null); setShowForm(true); }}
          >
            <Plus size={14} style={{ marginRight: 4 }} /> New Audit
          </Button>
        </div>
      </div>

      {/* Form */}
      {(showForm || editTarget) && (
        <AuditForm
          initial={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Audit list */}
      {logsLoading ? (
        <div style={{ color: SUBTEXT, textAlign: "center", padding: 40 }}>Loading audit logs…</div>
      ) : !logs || logs.length === 0 ? (
        <div style={{ color: SUBTEXT, textAlign: "center", padding: 40 }}>
          No audit records yet. Click "New Audit" to create the first entry.
        </div>
      ) : (
        (logs as any[]).map((log: any) => (
          <AuditCard
            key={log.id}
            log={log}
            onEdit={(l) => { setEditTarget(l); setShowForm(false); }}
          />
        ))
      )}
    </div>
  );
}
