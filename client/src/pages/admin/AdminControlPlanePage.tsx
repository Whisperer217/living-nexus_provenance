import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { type DashboardMenuItem } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  BadgeCheck,
  CircleAlert,
  Database,
  ExternalLink,
  FileText,
  HeartPulse,
  LockKeyhole,
  Network,
  Route,
  Server,
  ShieldCheck,
} from "lucide-react";

const CONTROL_PLANE_NAVIGATION: DashboardMenuItem[] = [
  { icon: Activity, label: "Overview", path: "#overview" },
  { icon: HeartPulse, label: "System Health", path: "#system-health" },
  { icon: Route, label: "Route Status", path: "#route-status" },
  { icon: Network, label: "Diagnostics", path: "#diagnostics" },
  { icon: FileText, label: "Action Log", path: "#audit-log" },
];

type AuditLogEntry = {
  id: number;
  adminId: number;
  adminName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: Date | string | null;
};

function formatTimestamp(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function humanize(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function StatusPill({ status }: { status: string }) {
  const caution = status === "degraded" || status === "unavailable";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]"
      style={{
        color: caution ? "var(--ln-gold-hot)" : "var(--ln-gold)",
        background: caution ? "color-mix(in srgb, var(--ln-gold) 12%, transparent)" : "color-mix(in srgb, var(--ln-gold) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)",
      }}
    >
      {caution ? <CircleAlert size={12} /> : <BadgeCheck size={12} />}
      {humanize(status)}
    </span>
  );
}

function Panel({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-2xl p-5 sm:p-6"
      style={{
        background: "var(--ln-panel)",
        border: "1px solid color-mix(in srgb, var(--ln-gold) 22%, transparent)",
      }}
    >
      <p
        className="text-[11px] uppercase tracking-[0.20em]"
        style={{ color: "var(--ln-gold-dim)", fontFamily: "var(--font-display)" }}
      >
        {eyebrow}
      </p>
      <h2
        className="mt-2 text-2xl sm:text-3xl"
        style={{ color: "var(--ln-parchment)", fontFamily: "var(--font-editorial)" }}
      >
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AdminControlPlanePage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const overview = trpc.adminControlPlane.getOverview.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30_000,
  });
  const routeStatus = trpc.adminControlPlane.getRouteStatus.useQuery(undefined, { enabled: isAdmin });
  const diagnostics = trpc.adminControlPlane.getDiagnostics.useQuery(undefined, { enabled: isAdmin });
  const auditLog = trpc.adminControlPlane.getAuditLog.useQuery({ limit: 25 }, { enabled: isAdmin });

  if (loading) {
    return <div className="min-h-screen" style={{ background: "var(--ln-void)" }} />;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--ln-void)" }}>
        <div
          className="max-w-md rounded-2xl p-7 text-center"
          style={{ background: "var(--ln-panel)", border: "1px solid color-mix(in srgb, var(--ln-gold) 22%, transparent)" }}
        >
          <LockKeyhole className="mx-auto" size={28} style={{ color: "var(--ln-gold)" }} />
          <p className="mt-4 text-xs uppercase tracking-[0.20em]" style={{ color: "var(--ln-gold-dim)", fontFamily: "var(--font-display)" }}>
            Protected Surface
          </p>
          <h1 className="mt-2 text-3xl" style={{ color: "var(--ln-parchment)", fontFamily: "var(--font-editorial)" }}>
            Control Plane access denied
          </h1>
          <p className="mt-3 text-sm leading-6" style={{ color: "var(--ln-bone)" }}>
            This stewardship surface requires an authenticated Living Nexus administrator.
          </p>
          <a className="mt-6 inline-flex text-sm underline underline-offset-4" style={{ color: "var(--ln-gold)" }} href="/">
            Return to Living Nexus
          </a>
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout title="Control Plane" menuItems={CONTROL_PLANE_NAVIGATION}>
      <div className="mx-auto max-w-6xl space-y-5 pb-12" style={{ color: "var(--ln-bone)" }}>
        <section id="overview" className="scroll-mt-6 rounded-2xl p-6 sm:p-8" style={{ background: "var(--ln-void)", border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)" }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--ln-gold-dim)", fontFamily: "var(--font-display)" }}>
                Protected Administrative Surface
              </p>
              <h1 className="mt-3 text-3xl sm:text-4xl" style={{ color: "var(--ln-parchment)", fontFamily: "var(--font-display)" }}>
                Living Nexus Control Plane
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--ln-bone)" }}>
                Read-only platform stewardship: operational health, declared route contracts, bounded diagnostics, and administrative action history.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ln-smoke)" }}>
              <ShieldCheck size={16} style={{ color: "var(--ln-gold)" }} />
              Server-authorized administrator access
            </div>
          </div>
        </section>

        <Panel id="system-health" eyebrow="01 · Read Only" title="System Health">
          {overview.isLoading ? (
            <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>Reading bounded health signals…</p>
          ) : overview.isError ? (
            <p className="text-sm" style={{ color: "var(--ln-gold-hot)" }}>Health signals are temporarily unavailable. No administrative action has been taken.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <HealthCard icon={Server} label="Application" status={overview.data?.application.status ?? "unavailable"} detail={`Uptime ${overview.data?.application.uptimeSeconds ?? 0}s`} />
                <HealthCard icon={Database} label="Database" status={overview.data?.database.status ?? "unavailable"} detail="Read-only reachability probe" />
                <HealthCard icon={HeartPulse} label="Worker" status={overview.data?.worker.status ?? "unavailable"} detail="Use diagnostics for detail" />
              </div>
              <p className="mt-4 text-xs" style={{ color: "var(--ln-smoke)" }}>
                Last checked: {formatTimestamp(overview.data?.checkedAt)}. This view exposes no credentials, environment values, raw logs, or worker commands.
              </p>
            </>
          )}
        </Panel>

        <Panel id="route-status" eyebrow="02 · Fixed Manifest" title="Route Status">
          <p className="mb-4 text-sm leading-6" style={{ color: "var(--ln-smoke)" }}>
            These are server-owned route declarations with expected response contracts. This view accepts no host, URL, query, or outbound target input.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead style={{ color: "var(--ln-smoke)" }}>
                <tr className="border-b" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 16%, transparent)" }}>
                  <th className="px-3 py-3 font-medium">Surface</th>
                  <th className="px-3 py-3 font-medium">Route</th>
                  <th className="px-3 py-3 font-medium">Expected</th>
                  <th className="px-3 py-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {routeStatus.data?.routes.map(route => (
                  <tr key={route.path} className="border-b" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 10%, transparent)" }}>
                    <td className="px-3 py-3" style={{ color: "var(--ln-bone)" }}>{route.label}</td>
                    <td className="px-3 py-3 font-mono text-xs" style={{ color: "var(--ln-parchment)" }}>{route.path}</td>
                    <td className="px-3 py-3" style={{ color: "var(--ln-bone)" }}>HTTP {route.expectedStatus}</td>
                    <td className="px-3 py-3"><StatusPill status={route.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--ln-smoke)" }}>
            Verification mode: {humanize(routeStatus.data?.verification)} · declared {formatTimestamp(routeStatus.data?.checkedAt)}.
          </p>
        </Panel>

        <Panel id="diagnostics" eyebrow="03 · Bounded Links" title="Diagnostics">
          <div className="grid gap-3 sm:grid-cols-2">
            {diagnostics.data?.map(diagnostic => (
              <a
                key={diagnostic.id}
                className="group rounded-xl p-4 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ln-gold)]"
                href={diagnostic.href}
                style={{ background: "color-mix(in srgb, var(--ln-void) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--ln-gold) 16%, transparent)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 style={{ color: "var(--ln-parchment)", fontFamily: "var(--font-editorial)", fontSize: "var(--text-h4)" }}>{diagnostic.label}</h3>
                    <p className="mt-1 text-sm leading-6" style={{ color: "var(--ln-smoke)" }}>{diagnostic.description}</p>
                  </div>
                  <ExternalLink size={16} className="shrink-0" style={{ color: "var(--ln-gold)" }} />
                </div>
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--ln-smoke)" }}>
            Links open existing bounded diagnostics. This Control Plane does not trigger, retry, requeue, restart, or repair any process.
          </p>
        </Panel>

        <Panel id="audit-log" eyebrow="04 · Read Only" title="Administrative Action Log">
          <p className="mb-4 text-sm leading-6" style={{ color: "var(--ln-smoke)" }}>
            The latest {auditLog.data?.limit ?? 25} existing action records are displayed without unbounded detail payloads.
          </p>
          {auditLog.isLoading ? (
            <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>Reading action history…</p>
          ) : auditLog.isError ? (
            <p className="text-sm" style={{ color: "var(--ln-gold-hot)" }}>Action history is temporarily unavailable.</p>
          ) : auditLog.data?.entries.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead style={{ color: "var(--ln-smoke)" }}>
                  <tr className="border-b" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 16%, transparent)" }}>
                    <th className="px-3 py-3 font-medium">When</th>
                    <th className="px-3 py-3 font-medium">Actor</th>
                    <th className="px-3 py-3 font-medium">Action</th>
                    <th className="px-3 py-3 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.data.entries.map((entry: AuditLogEntry) => (
                    <tr key={entry.id} className="border-b" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 10%, transparent)" }}>
                      <td className="px-3 py-3 text-xs" style={{ color: "var(--ln-smoke)" }}>{formatTimestamp(entry.createdAt)}</td>
                      <td className="px-3 py-3" style={{ color: "var(--ln-bone)" }}>{entry.adminName ?? `Admin #${entry.adminId}`}</td>
                      <td className="px-3 py-3" style={{ color: "var(--ln-parchment)" }}>{humanize(entry.action)}</td>
                      <td className="px-3 py-3" style={{ color: "var(--ln-smoke)" }}>{entry.targetType ? `${humanize(entry.targetType)}${entry.targetId ? ` · ${entry.targetId}` : ""}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>No administrative action records are available.</p>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
}

function HealthCard({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: typeof Server;
  label: string;
  status: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "color-mix(in srgb, var(--ln-void) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--ln-gold) 16%, transparent)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: "var(--ln-gold)" }} />
          <span className="text-sm" style={{ color: "var(--ln-bone)" }}>{label}</span>
        </div>
        <StatusPill status={status} />
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--ln-smoke)" }}>{detail}</p>
    </div>
  );
}
