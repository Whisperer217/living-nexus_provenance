import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type LogEntry = {
  id: number;
  stripeSessionId: string;
  paymentType: string;
  amountCents: number;
  currency: string;
  status: "ok" | "reconciled" | "skipped" | "failed";
  notes: string | null;
  checkedAt: Date;
  reconciledAt: Date | null;
};

const STATUS_COLORS: Record<string, string> = {
  ok: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  reconciled: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
  skipped: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const STATUS_ICONS: Record<string, string> = {
  ok: "✓",
  reconciled: "⚡",
  failed: "✗",
  skipped: "–",
};

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatPaymentType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PaymentIntegrityPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [isRunning, setIsRunning] = useState(false);

  const { data: stats, refetch: refetchStats } = trpc.paymentIntegrity.getStats.useQuery();
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.paymentIntegrity.getLogs.useQuery({ limit: 200 });
  const triggerRun = trpc.paymentIntegrity.triggerRun.useMutation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Access restricted to administrators.</div>
      </div>
    );
  }

  async function handleTriggerRun() {
    setIsRunning(true);
    toast.info("Running payment integrity check — this may take 10–30 seconds…");
    try {
      const result = await triggerRun.mutateAsync();
      toast.success(
        `Check complete: ${result.checked} sessions checked, ${result.reconciled} reconciled, ${result.failed} failed.`
      );
      refetchStats();
      refetchLogs();
    } catch (err: any) {
      toast.error(`Run failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }

  const reconciled = logs?.filter((l: LogEntry) => l.status === "reconciled") ?? [];
  const failed = logs?.filter((l: LogEntry) => l.status === "failed") ?? [];
  const ok = logs?.filter((l: LogEntry) => l.status === "ok") ?? [];
  const skipped = logs?.filter((l: LogEntry) => l.status === "skipped") ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
            >
              ← LN Command Center
            </button>
            <span className="text-zinc-700">|</span>
            <h1 className="text-base font-semibold text-zinc-100">
              💳 Payment Integrity Monitor
            </h1>
          </div>
          <Button
            type="button"
            onClick={handleTriggerRun}
            disabled={isRunning}
            className="bg-amber-600 hover:bg-amber-500 text-white text-sm h-8 px-4 disabled:opacity-50"
          >
            {isRunning ? "Running…" : "▶ Run Now"}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Checked", value: stats?.total ?? 0, color: "text-zinc-200" },
            { label: "Confirmed OK", value: stats?.ok ?? 0, color: "text-emerald-400" },
            { label: "Auto-Reconciled", value: stats?.reconciled ?? 0, color: "text-amber-400" },
            { label: "Failed", value: stats?.failed ?? 0, color: "text-red-400" },
            { label: "Skipped", value: stats?.skipped ?? 0, color: "text-zinc-500" },
          ].map((s) => (
            <Card key={s.label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reconciled alert */}
        {reconciled.length > 0 && (
          <Card className="bg-amber-950/30 border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-300 text-sm font-semibold">
                ⚡ {reconciled.length} Auto-Reconciled Payment{reconciled.length !== 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-200/70 text-xs mb-3">
                These sessions were completed in Stripe but were not credited to the database (missed webhook). The worker automatically applied the credit.
              </p>
              <div className="space-y-2">
                {reconciled.map((entry: LogEntry) => (
                  <div key={entry.id} className="flex items-center justify-between bg-amber-900/20 rounded px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-amber-400 font-mono shrink-0">⚡</span>
                      <span className="text-zinc-300 font-medium">{formatPaymentType(entry.paymentType)}</span>
                      <span className="text-zinc-500 font-mono truncate">{entry.stripeSessionId}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-amber-300 font-semibold">{formatAmount(entry.amountCents, entry.currency)}</span>
                      <span className="text-zinc-500">{new Date(entry.reconciledAt ?? entry.checkedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Failed alert */}
        {failed.length > 0 && (
          <Card className="bg-red-950/30 border-red-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-300 text-sm font-semibold">
                ✗ {failed.length} Failed Reconciliation{failed.length !== 1 ? "s" : ""} — Manual Review Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-200/70 text-xs mb-3">
                These sessions were detected as missing but the auto-reconciliation failed. Check the notes column and manually credit them via the admin panel.
              </p>
              <div className="space-y-2">
                {failed.map((entry: LogEntry) => (
                  <div key={entry.id} className="bg-red-900/20 rounded px-3 py-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300 font-medium">{formatPaymentType(entry.paymentType)}</span>
                      <span className="text-red-300 font-semibold">{formatAmount(entry.amountCents, entry.currency)}</span>
                    </div>
                    <div className="text-zinc-500 font-mono">{entry.stripeSessionId}</div>
                    {entry.notes && <div className="text-red-300/70">{entry.notes}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full log table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-zinc-200 text-sm font-semibold flex items-center justify-between">
              <span>Full Reconciliation Log</span>
              <span className="text-zinc-500 font-normal text-xs">{logs?.length ?? 0} entries</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="px-6 py-8 text-center text-zinc-500 text-sm animate-pulse">Loading log…</div>
            ) : !logs || logs.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-zinc-500 text-sm">No entries yet.</div>
                <div className="text-zinc-600 text-xs mt-1">Click "Run Now" to perform the first integrity check.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Type</th>
                      <th className="px-4 py-2 text-left font-medium">Amount</th>
                      <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Session ID</th>
                      <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Notes</th>
                      <th className="px-4 py-2 text-right font-medium">Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs as LogEntry[]).map((entry) => (
                      <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[entry.status] ?? ""}`}>
                            {STATUS_ICONS[entry.status]} {entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-300">{formatPaymentType(entry.paymentType)}</td>
                        <td className="px-4 py-2.5 text-zinc-200 font-medium tabular-nums">
                          {formatAmount(entry.amountCents, entry.currency)}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 font-mono hidden sm:table-cell max-w-[180px] truncate">
                          {entry.stripeSessionId}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 hidden md:table-cell max-w-[200px] truncate">
                          {entry.notes ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 text-right whitespace-nowrap">
                          {new Date(entry.checkedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-500 space-y-1.5">
            <p>Every <strong className="text-zinc-400">15 minutes</strong>, the worker polls Stripe for all completed checkout sessions in the last 24 hours.</p>
            <p>Each session is cross-checked against the database. If a session was paid but never credited (missed webhook, key mismatch, server restart), the worker <strong className="text-zinc-400">auto-reconciles</strong> it and notifies the owner.</p>
            <p>Sessions with unrecognised payment types are <strong className="text-zinc-400">flagged for manual review</strong> rather than auto-credited.</p>
            <p>The worker also runs once on server startup (30s delay) to catch any payments missed during the last deployment.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
