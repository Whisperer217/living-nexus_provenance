import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Shield, AlertTriangle, CheckCircle, XCircle, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const REASON_LABELS: Record<string, string> = {
  dehumanization: "Dehumanization",
  csam: "Child Exploitation",
  facilitates_harm: "Facilitates Harm",
  harassment: "Harassment",
  spam: "Spam",
  other: "Other",
};

const REASON_SEVERITY: Record<string, "critical" | "high" | "medium" | "low"> = {
  csam: "critical",
  dehumanization: "critical",
  facilitates_harm: "high",
  harassment: "medium",
  spam: "low",
  other: "medium",
};

const SEVERITY_COLORS = {
  critical: "bg-red-900/80 text-red-200 border-red-700",
  high: "bg-orange-900/60 text-orange-200 border-orange-700",
  medium: "bg-yellow-900/40 text-yellow-200 border-yellow-700",
  low: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

export default function ModerationQueuePage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed_ok" | "removed_violation" | "escalated" | "all">("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});

  const { data: flags = [], refetch } = trpc.moderation.listFlags.useQuery({ status: statusFilter });
  const { data: stats = [] } = trpc.moderation.stats.useQuery();

  const resolveMutation = trpc.moderation.resolveFlag.useMutation({
    onSuccess: (_, vars) => {
      const action = vars.resolution === "reviewed_ok" ? "Cleared" : vars.resolution === "removed_violation" ? "Removed" : "Escalated";
      toast.success(`${action} — flag resolved.`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center text-zinc-500">
          <Shield className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
          <p>Admin access required</p>
        </div>
      </div>
    );
  }

  const statMap = Object.fromEntries(stats.map((s: { status: string; total: number }) => [s.status, s.total]));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-serif text-amber-400 tracking-wide">Covenant Moderation</h1>
            <p className="text-xs text-zinc-500">Living Nexus Content Review Queue</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Pending", key: "pending", color: "text-yellow-400" },
            { label: "Cleared", key: "reviewed_ok", color: "text-green-400" },
            { label: "Removed", key: "removed_violation", color: "text-red-400" },
            { label: "Escalated", key: "escalated", color: "text-orange-400" },
          ].map(({ label, key, color }) => (
            <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{statMap[key] ?? 0}</div>
              <div className="text-xs text-zinc-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Filter:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-zinc-200 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="pending" className="text-zinc-200 focus:bg-zinc-800">Pending Review</SelectItem>
              <SelectItem value="reviewed_ok" className="text-zinc-200 focus:bg-zinc-800">Cleared</SelectItem>
              <SelectItem value="removed_violation" className="text-zinc-200 focus:bg-zinc-800">Removed</SelectItem>
              <SelectItem value="escalated" className="text-zinc-200 focus:bg-zinc-800">Escalated</SelectItem>
              <SelectItem value="all" className="text-zinc-200 focus:bg-zinc-800">All Flags</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-zinc-600">{flags.length} result{flags.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Flag list */}
        {flags.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm">No flags in this queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag: {
              id: number;
              workId: number;
              workType: string;
              workTitle: string | null;
              reporterId: number;
              reporterName: string;
              reason: string;
              details: string | null;
              status: string;
              adminNote: string | null;
              createdAt: Date;
              resolvedAt: Date | null;
            }) => {
              const severity = REASON_SEVERITY[flag.reason] ?? "medium";
              const isExpanded = expandedId === flag.id;
              return (
                <div
                  key={flag.id}
                  className={`bg-zinc-900 border rounded-lg overflow-hidden transition-all ${
                    severity === "critical" ? "border-red-800/60" : "border-zinc-800"
                  }`}
                >
                  {/* Summary row */}
                  <button
                    className="w-full text-left p-4 flex items-center gap-4"
                    onClick={() => setExpandedId(isExpanded ? null : flag.id)}
                  >
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${severity === "critical" ? "text-red-400" : "text-yellow-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded border ${SEVERITY_COLORS[severity]}`}>
                          {REASON_LABELS[flag.reason] ?? flag.reason}
                        </span>
                        <span className="text-xs text-zinc-500 capitalize">{flag.workType}</span>
                        {flag.workTitle && (
                          <span className="text-xs text-zinc-400 truncate max-w-xs">"{flag.workTitle}"</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">
                        Reported by {flag.reporterName} · {new Date(flag.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${
                        flag.status === "pending" ? "border-yellow-700 text-yellow-400" :
                        flag.status === "reviewed_ok" ? "border-green-700 text-green-400" :
                        flag.status === "removed_violation" ? "border-red-700 text-red-400" :
                        "border-orange-700 text-orange-400"
                      }`}>
                        {flag.status.replace("_", " ")}
                      </Badge>
                      <ChevronUp className={`w-4 h-4 text-zinc-600 transition-transform ${isExpanded ? "" : "rotate-180"}`} />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 p-4 space-y-4">
                      {flag.details && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Reporter's details</p>
                          <p className="text-sm text-zinc-300 bg-zinc-950/60 rounded p-3">{flag.details}</p>
                        </div>
                      )}

                      {flag.adminNote && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Admin note</p>
                          <p className="text-sm text-zinc-400 italic">{flag.adminNote}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Work ID: {flag.workId}</p>
                      </div>

                      {flag.status === "pending" && (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Admin note (optional — will be stored with this flag)"
                            value={adminNotes[flag.id] ?? ""}
                            onChange={(e) => setAdminNotes(prev => ({ ...prev, [flag.id]: e.target.value }))}
                            className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none text-sm"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => resolveMutation.mutate({
                                flagId: flag.id,
                                resolution: "reviewed_ok",
                                adminNote: adminNotes[flag.id],
                              })}
                              disabled={resolveMutation.isPending}
                              className="bg-green-900/60 hover:bg-green-800 text-green-100 border border-green-800 gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Clear — No Violation
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => resolveMutation.mutate({
                                flagId: flag.id,
                                resolution: "removed_violation",
                                adminNote: adminNotes[flag.id],
                              })}
                              disabled={resolveMutation.isPending}
                              className="bg-red-900/60 hover:bg-red-800 text-red-100 border border-red-800 gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Remove — Covenant Violation
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveMutation.mutate({
                                flagId: flag.id,
                                resolution: "escalated",
                                adminNote: adminNotes[flag.id],
                              })}
                              disabled={resolveMutation.isPending}
                              className="border-orange-800 text-orange-400 hover:bg-orange-900/30"
                            >
                              Escalate
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
