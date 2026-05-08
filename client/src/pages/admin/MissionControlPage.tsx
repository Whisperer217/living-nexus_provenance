/**
 * /admin/mission-control — Layer 3 Processing Mission Control
 * Admin-only ops dashboard showing cloud worker health, job queue stats,
 * and recent processing jobs.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Activity, CheckCircle2, XCircle, Clock, Cpu, Server,
  RefreshCw, AlertTriangle, Zap, Database, BarChart3,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const GOLD = "var(--ln-gold)";
const SUBTEXT = "#94A3B8";
const GREEN = "#22C55E";
const RED = "#EF4444";
const YELLOW = "#F59E0B";
const BLUE = "#3B82F6";
const CARD_BG = "rgba(15,15,20,0.85)";
const BORDER_COLOR = "rgba(255,255,255,0.08)";

type JobStatus = "pending" | "claimed" | "completed" | "failed";
type JobType = "comic-processing" | "guide-extraction" | "notification-digest";

interface WorkerJob {
  id: number;
  jobType: JobType;
  status: JobStatus;
  payloadJson: unknown;
  resultJson: unknown;
  errorMessage: string | null;
  claimedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface JobStats {
  pending: number;
  claimed: number;
  completed: number;
  failed: number;
}

function StatusDot({ status }: { status: JobStatus }) {
  const color = status === "completed" ? GREEN
    : status === "failed" ? RED
    : status === "claimed" ? BLUE
    : YELLOW;
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

function JobTypeBadge({ type }: { type: JobType }) {
  const label = type === "comic-processing" ? "Comic"
    : type === "guide-extraction" ? "Guide"
    : "Notif";
  const color = type === "comic-processing" ? GOLD
    : type === "guide-extraction" ? "#A78BFA"
    : BLUE;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.05em",
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: "1px 6px",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flex: 1,
        minWidth: 140,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: SUBTEXT, marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function WorkerHealthCard() {
  const [health, setHealth] = useState<{
    status: string;
    mode: string;
    pollIntervalMs: number;
    backendUrl: string;
    uptime: number;
    lastPollAt: string | null;
    jobsProcessed: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      // The worker health is on the cloud computer's localhost — we can only
      // check it via the backend's /api/worker/health endpoint
      const res = await fetch("/api/worker/health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError("Could not reach worker health endpoint");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Server size={18} color={GOLD} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>Cloud Worker</span>
          <span style={{ fontSize: 11, color: SUBTEXT }}>34.148.133.162</span>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: SUBTEXT,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {error ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: RED, fontSize: 13 }}>
          <XCircle size={14} />
          {error}
        </div>
      ) : health ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: SUBTEXT, marginBottom: 4 }}>Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: health.status === "ok" ? GREEN : RED,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600 }}>
                {health.status === "ok" ? "Operational" : "Degraded"}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: SUBTEXT, marginBottom: 4 }}>Mode</div>
            <div style={{ fontSize: 13, color: "#E2E8F0" }}>{health.mode || "poll"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: SUBTEXT, marginBottom: 4 }}>Uptime</div>
            <div style={{ fontSize: 13, color: "#E2E8F0" }}>
              {Math.floor((health.uptime || 0) / 3600)}h {Math.floor(((health.uptime || 0) % 3600) / 60)}m
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: SUBTEXT, marginBottom: 4 }}>Poll Interval</div>
            <div style={{ fontSize: 13, color: "#E2E8F0" }}>{(health.pollIntervalMs || 10000) / 1000}s</div>
          </div>
        </div>
      ) : (
        <div style={{ color: SUBTEXT, fontSize: 13 }}>Loading…</div>
      )}
    </div>
  );
}

function JobRow({ job, expanded, onToggle }: { job: WorkerJob; expanded: boolean; onToggle: () => void }) {
  const ts = new Date(job.createdAt).toLocaleString();
  const payload = job.payloadJson as Record<string, unknown>;

  return (
    <div
      style={{
        borderBottom: `1px solid ${BORDER_COLOR}`,
        padding: "10px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <StatusDot status={job.status} />
        <span style={{ fontSize: 12, color: SUBTEXT, width: 32, flexShrink: 0 }}>#{job.id}</span>
        <JobTypeBadge type={job.jobType} />
        <span style={{ fontSize: 12, color: "#CBD5E1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {payload?.songId ? `Song ${payload.songId} · Page ${payload.pageIndex ?? "?"}` : payload?.guideId ? `Guide ${payload.guideId}` : JSON.stringify(payload).slice(0, 60)}
        </span>
        <span style={{ fontSize: 11, color: SUBTEXT, flexShrink: 0 }}>{ts}</span>
        {expanded ? <ChevronUp size={12} color={SUBTEXT} /> : <ChevronDown size={12} color={SUBTEXT} />}
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 8,
            marginLeft: 20,
            padding: 12,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            fontSize: 11,
            fontFamily: "monospace",
            color: "#94A3B8",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: GOLD }}>Status:</span> {job.status}
            {job.claimedAt && <span style={{ marginLeft: 12 }}><span style={{ color: GOLD }}>Claimed:</span> {new Date(job.claimedAt).toLocaleString()}</span>}
            {job.completedAt && <span style={{ marginLeft: 12 }}><span style={{ color: GOLD }}>Completed:</span> {new Date(job.completedAt).toLocaleString()}</span>}
          </div>
          {job.errorMessage && (
            <div style={{ color: RED, marginBottom: 6 }}>Error: {job.errorMessage}</div>
          )}
          <div><span style={{ color: GOLD }}>Payload:</span> {String(JSON.stringify(job.payloadJson, null, 2))}</div>
          {Boolean(job.resultJson) && (
            <div style={{ marginTop: 6 }}><span style={{ color: GOLD }}>Result:</span> {String(JSON.stringify(job.resultJson, null, 2))}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MissionControlPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.songs.getWorkerStats.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;
  if (user.role !== "admin") return null;

  const stats: JobStats = data?.stats ?? { pending: 0, claimed: 0, completed: 0, failed: 0 };
  const jobs: WorkerJob[] = (data?.recent ?? []) as WorkerJob[];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0A0A0F 0%, #0F0F1A 50%, #0A0A0F 100%)",
        color: "#E2E8F0",
        padding: "32px 24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <Cpu size={24} color={GOLD} />
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F8FAFC", margin: 0 }}>
                Mission Control
              </h1>
              <Badge
                style={{
                  background: `${GOLD}20`,
                  color: GOLD,
                  border: `1px solid ${GOLD}40`,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                LAYER 3
              </Badge>
            </div>
            <p style={{ fontSize: 13, color: SUBTEXT, margin: 0 }}>
              Cloud processing worker · Job queue · Provenance fingerprinting
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            style={{ borderColor: BORDER_COLOR, color: SUBTEXT, fontSize: 12 }}
          >
            <RefreshCw size={12} style={{ marginRight: 6 }} />
            Refresh
          </Button>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard label="Pending" value={stats.pending} color={YELLOW} icon={Clock} />
          <StatCard label="Processing" value={stats.claimed} color={BLUE} icon={Activity} />
          <StatCard label="Completed" value={stats.completed} color={GREEN} icon={CheckCircle2} />
          <StatCard label="Failed" value={stats.failed} color={RED} icon={XCircle} />
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20, alignItems: "start" }}>
          {/* Left: Worker health + system info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <WorkerHealthCard />

            {/* Architecture info */}
            <div
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Database size={16} color={GOLD} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>Architecture</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Backend", value: "Manus WebDev (Express)", color: BLUE },
                  { label: "Worker", value: "Node.js 22 · Ubuntu 24.04", color: GREEN },
                  { label: "Dispatch", value: "Poll-based (10s interval)", color: GOLD },
                  { label: "Auth", value: "HMAC-SHA256 signed", color: "#A78BFA" },
                  { label: "Image Processing", value: "Sharp + ImageMagick", color: YELLOW },
                  { label: "Fingerprinting", value: "SHA-256 per page", color: GREEN },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: SUBTEXT }}>{label}</span>
                    <span style={{ fontSize: 12, color, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue info */}
            <div
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <BarChart3 size={16} color={GOLD} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>Job Types</span>
              </div>
              {[
                { type: "comic-processing", label: "Comic Page Processing", desc: "WebP conversion + SHA-256 fingerprint" },
                { type: "guide-extraction", label: "Guide Entity Extraction", desc: "AI provenance sheet analysis" },
                { type: "notification-digest", label: "Notification Digest", desc: "Creator resonance summaries" },
              ].map(({ type, label, desc }) => (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <Zap size={12} color={GOLD} />
                    <span style={{ fontSize: 12, color: "#CBD5E1", fontWeight: 600 }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: SUBTEXT, marginLeft: 20 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Recent jobs */}
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={16} color={GOLD} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>Recent Jobs</span>
              </div>
              {isLoading && (
                <span style={{ fontSize: 11, color: SUBTEXT }}>Loading…</span>
              )}
            </div>

            {jobs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: SUBTEXT,
                  fontSize: 13,
                }}
              >
                <Clock size={32} color={SUBTEXT} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div>No jobs yet</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  Jobs appear here when creators dispatch comic pages or guide extractions
                </div>
              </div>
            ) : (
              <div>
                {jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    expanded={expandedJobId === job.id}
                    onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            padding: "16px 20px",
            background: CARD_BG,
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} color={YELLOW} />
            <span style={{ fontSize: 12, color: SUBTEXT }}>
              Worker polls backend every 10 seconds. Jobs are claimed atomically — no double-processing.
            </span>
          </div>
          <span style={{ fontSize: 11, color: SUBTEXT }}>
            Layer 3 · Cloud Computer 34.148.133.162
          </span>
        </div>
      </div>
    </div>
  );
}
