/**
 * Self-Improvement Worker Admin UI
 *
 * Allows admins to:
 *  - Trigger a manual scan run
 *  - View run history with status, stats, and summary
 *  - Drill into a run to see all findings
 *  - Revert any applied fix with one click
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ─── Types ────────────────────────────────────────────────────────────────────

type Run = {
  id: number;
  triggeredBy: string;
  status: string;
  filesScanned: number | null;
  findingsCount: number | null;
  fixesApplied: number | null;
  fixesFailed: number | null;
  testsPassedBefore: number | null;
  testsPassedAfter: number | null;
  analysisSummary: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
};

type Finding = {
  id: number;
  severity: string;
  category: string;
  filePath: string;
  lineStart: number | null;
  lineEnd: number | null;
  title: string;
  description: string;
  fixStatus: string;
  fixDiff: string | null;
  fixError: string | null;
  originalContent: string | null;
  fixedAt: Date | null;
  createdAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(s: string) {
  switch (s) {
    case "critical": return "bg-red-600 text-white";
    case "high": return "bg-orange-500 text-white";
    case "medium": return "bg-yellow-500 text-black";
    case "low": return "bg-blue-500 text-white";
    default: return "bg-gray-500 text-white";
  }
}

function fixStatusColor(s: string) {
  switch (s) {
    case "applied": return "bg-green-600 text-white";
    case "pending": return "bg-yellow-500 text-black";
    case "failed": return "bg-red-600 text-white";
    case "reverted": return "bg-gray-500 text-white";
    case "skipped": return "bg-gray-400 text-white";
    default: return "bg-gray-400 text-white";
  }
}

function runStatusColor(s: string) {
  switch (s) {
    case "completed": return "bg-green-600 text-white";
    case "running": return "bg-blue-500 text-white animate-pulse";
    case "failed": return "bg-red-600 text-white";
    default: return "bg-gray-500 text-white";
  }
}

function formatDuration(start: Date, end: Date | null) {
  if (!end) return "running…";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// ─── Finding Row ──────────────────────────────────────────────────────────────

function FindingRow({ finding, onRevert }: { finding: Finding; onRevert: (id: number) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-white/5 transition-colors">
          <TableCell>
            <Badge className={`text-xs ${severityColor(finding.severity)}`}>
              {finding.severity}
            </Badge>
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">{finding.category}</TableCell>
          <TableCell className="font-medium text-sm">{finding.title}</TableCell>
          <TableCell className="text-xs font-mono text-muted-foreground">
            {finding.filePath}{finding.lineStart ? `:${finding.lineStart}` : ""}
          </TableCell>
          <TableCell>
            <Badge className={`text-xs ${fixStatusColor(finding.fixStatus)}`}>
              {finding.fixStatus}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            {finding.fixStatus === "applied" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={(e) => { e.stopPropagation(); onRevert(finding.id); }}
              >
                Revert
              </Button>
            )}
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <TableRow>
          <TableCell colSpan={6} className="bg-black/20 p-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{finding.description}</p>
              {finding.fixDiff && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Applied Diff</p>
                  <pre className="text-xs bg-black/40 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {finding.fixDiff}
                  </pre>
                </div>
              )}
              {finding.fixError && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1">Fix Error</p>
                  <p className="text-xs text-red-300 font-mono">{finding.fixError}</p>
                </div>
              )}
              {finding.fixedAt && (
                <p className="text-xs text-muted-foreground">
                  Fixed at: {new Date(finding.fixedAt).toLocaleString()}
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Run Detail Panel ─────────────────────────────────────────────────────────

function RunDetail({ runId, onClose }: { runId: number; onClose: () => void }) {
  const utils = trpc.useUtils();

  const { data: run, isLoading: runLoading } = trpc.worker.getRunById.useQuery({ id: runId });
  const { data: findings, isLoading: findingsLoading } = trpc.worker.getFindingsByRun.useQuery({ runId });

  const revertMutation = trpc.worker.revertFinding.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Fix reverted — the change has been undone in the source file.");
        utils.worker.getFindingsByRun.invalidate({ runId });
      } else {
        toast.error(`Revert failed: ${result.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Revert failed: ${err.message}`);
    },
  });

  if (runLoading || findingsLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">
        Loading run details…
      </div>
    );
  }

  if (!run) return null;

  const grouped = {
    critical: findings?.filter((f: Finding) => f.severity === "critical") ?? [],
    high: findings?.filter((f: Finding) => f.severity === "high") ?? [],
    medium: findings?.filter((f: Finding) => f.severity === "medium") ?? [],
    low: findings?.filter((f: Finding) => f.severity === "low") ?? [],
    info: findings?.filter((f: Finding) => f.severity === "info") ?? [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Run #{run.id}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(run.startedAt).toLocaleString()} · {formatDuration(run.startedAt, run.completedAt)} ·{" "}
            <Badge className={`text-xs ${runStatusColor(run.status)}`}>{run.status}</Badge>
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>← Back to runs</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Files Scanned", value: run.filesScanned ?? "—" },
          { label: "Findings", value: run.findingsCount ?? "—" },
          { label: "Auto-Fixed", value: run.fixesApplied ?? "—" },
          { label: "Failed Fixes", value: run.fixesFailed ?? "—" },
        ].map(stat => (
          <Card key={stat.label} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test results */}
      {run.testsPassedBefore != null && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Tests Before</p>
              <p className="text-lg font-bold text-green-400">{run.testsPassedBefore} passing</p>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div>
              <p className="text-xs text-muted-foreground">Tests After</p>
              <p className={`text-lg font-bold ${(run.testsPassedAfter ?? 0) >= (run.testsPassedBefore ?? 0) ? "text-green-400" : "text-red-400"}`}>
                {run.testsPassedAfter ?? "—"} passing
              </p>
            </div>
            {run.analysisSummary && (
              <div className="ml-4 flex-1">
                <p className="text-xs text-muted-foreground mb-1">Summary</p>
                <pre className="text-xs text-foreground whitespace-pre-wrap">{run.analysisSummary}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {run.errorMessage && (
        <Card className="bg-red-950/30 border-red-800/30">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-red-400 mb-1">Error</p>
            <p className="text-sm text-red-300 font-mono">{run.errorMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Findings table */}
      {findings && findings.length > 0 ? (
        <div className="space-y-4">
          {(["critical", "high", "medium", "low", "info"] as const).map(sev => {
            const group = grouped[sev];
            if (group.length === 0) return null;
            return (
              <div key={sev}>
                <h3 className="text-sm font-semibold capitalize mb-2 flex items-center gap-2">
                  <Badge className={`text-xs ${severityColor(sev)}`}>{sev}</Badge>
                  <span className="text-muted-foreground">{group.length} finding{group.length !== 1 ? "s" : ""}</span>
                </h3>
                <div className="rounded-lg border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-xs w-20">Severity</TableHead>
                        <TableHead className="text-xs w-28">Category</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">File</TableHead>
                        <TableHead className="text-xs w-24">Status</TableHead>
                        <TableHead className="text-xs w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.map((f: Finding) => (
                        <FindingRow
                          key={f.id}
                          finding={f}
                          onRevert={(id) => revertMutation.mutate({ findingId: id })}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No findings recorded for this run.</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SelfImprovementPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  const { data: runs, isLoading: runsLoading, refetch } = trpc.worker.getRuns.useQuery({ limit: 20 });

  const triggerMutation = trpc.worker.triggerRun.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      // Poll for updates
      setTimeout(() => refetch(), 3000);
      setTimeout(() => refetch(), 10000);
      setTimeout(() => refetch(), 30000);
    },
    onError: (err) => {
      toast.error(`Failed to start run: ${err.message}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold">Access Denied</p>
          <p className="text-muted-foreground text-sm">Admin access required.</p>
          <Button type="button" variant="outline" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Self-Improvement Worker</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Autonomous codebase auditor — scans source files nightly at 2:00 AM, applies safe fixes, and logs everything for review.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {triggerMutation.isPending ? "Starting…" : "▶ Run Now"}
          </Button>
        </div>

        <Separator className="mb-8 opacity-20" />

        {/* Detail view or run list */}
        {selectedRunId ? (
          <RunDetail runId={selectedRunId} onClose={() => setSelectedRunId(null)} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Run History</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => refetch()} className="text-xs text-muted-foreground">
                ↻ Refresh
              </Button>
            </div>

            {runsLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse text-sm">Loading runs…</div>
            ) : !runs || runs.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <p className="text-4xl mb-4">🤖</p>
                  <p className="text-lg font-semibold mb-2">No runs yet</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    The worker runs automatically every night at 2:00 AM.<br />
                    Click <strong>Run Now</strong> to trigger an immediate scan.
                  </p>
                  <Button
                    type="button"
                    onClick={() => triggerMutation.mutate()}
                    disabled={triggerMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {triggerMutation.isPending ? "Starting…" : "▶ Run First Scan"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-xs w-16">ID</TableHead>
                      <TableHead className="text-xs">Started</TableHead>
                      <TableHead className="text-xs w-24">Status</TableHead>
                      <TableHead className="text-xs w-20">Trigger</TableHead>
                      <TableHead className="text-xs w-20">Files</TableHead>
                      <TableHead className="text-xs w-24">Findings</TableHead>
                      <TableHead className="text-xs w-24">Fixed</TableHead>
                      <TableHead className="text-xs w-20">Duration</TableHead>
                      <TableHead className="text-xs w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run: Run) => (
                      <TableRow
                        key={run.id}
                        className="cursor-pointer hover:bg-white/5 transition-colors border-white/10"
                        onClick={() => setSelectedRunId(run.id)}
                      >
                        <TableCell className="text-xs font-mono text-muted-foreground">#{run.id}</TableCell>
                        <TableCell className="text-xs">{new Date(run.startedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${runStatusColor(run.status)}`}>{run.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">{run.triggeredBy}</TableCell>
                        <TableCell className="text-xs">{run.filesScanned ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {run.findingsCount != null ? (
                            <span className={run.findingsCount > 0 ? "text-yellow-400" : "text-green-400"}>
                              {run.findingsCount}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {run.fixesApplied != null ? (
                            <span className="text-green-400">{run.fixesApplied} applied</span>
                          ) : "—"}
                          {run.fixesFailed != null && run.fixesFailed > 0 && (
                            <span className="text-red-400 ml-1">/ {run.fixesFailed} failed</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDuration(run.startedAt, run.completedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="ghost" size="sm" className="text-xs h-6 px-2">
                            View →
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* How it works */}
            <Card className="bg-white/5 border-white/10 mt-8">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>1. <strong className="text-foreground">Scan</strong> — Reads all TypeScript/TSX source files in batches of 5.</p>
                <p>2. <strong className="text-foreground">Analyse</strong> — Sends each batch to the LLM with a structured prompt. Returns findings with severity, category, file location, and fix instructions.</p>
                <p>3. <strong className="text-foreground">Auto-fix</strong> — Applies safe, text-substitution fixes (dead code, accessibility, maintainability). Runs TypeScript type-check after each fix.</p>
                <p>4. <strong className="text-foreground">Verify</strong> — Runs the full test suite after all fixes. If tests regress, all changes are reverted automatically.</p>
                <p>5. <strong className="text-foreground">Log</strong> — Records every finding and fix to the database. Security, correctness, and architectural issues are logged as <em>pending</em> for human review.</p>
                <p className="pt-2 text-indigo-400">You can revert any applied fix from the findings table. The original snippet is stored and the file is patched back.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
