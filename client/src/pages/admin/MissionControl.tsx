/**
 * @domain   Mission Control — Actionable Phase Ledger
 * @impl     Admin page: displays all development phases as cards with lock toggles,
 *           fire buttons, live status polling, and a history of dispatched tasks.
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Lock,
  Unlock,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Plus,
  Eye,
  EyeOff,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PhaseStatus = "locked" | "ready" | "dispatched" | "running" | "complete" | "error";

interface Phase {
  id: number;
  sortOrder: number;
  title: string;
  description: string | null;
  category: string;
  prompt: string;
  status: PhaseStatus;
  lockedReason: string | null;
  manusTaskId: string | null;
  manusProjectId: string | null;
  lastStatusMsg: string | null;
  createdAt: Date;
  updatedAt: Date;
  dispatchedAt: Date | null;
  completedAt: Date | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PhaseStatus, { label: string; color: string; icon: React.ReactNode }> = {
  locked:     { label: "Locked",     color: "bg-zinc-800 text-zinc-400 border-zinc-700",           icon: <Lock className="w-3 h-3" /> },
  ready:      { label: "Ready",      color: "bg-amber-950/60 text-amber-400 border-amber-800/60",  icon: <Zap className="w-3 h-3" /> },
  dispatched: { label: "Dispatched", color: "bg-blue-950/60 text-blue-400 border-blue-800/60",     icon: <Clock className="w-3 h-3" /> },
  running:    { label: "Running",    color: "bg-violet-950/60 text-violet-400 border-violet-800/60", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  complete:   { label: "Complete",   color: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60", icon: <CheckCircle2 className="w-3 h-3" /> },
  error:      { label: "Error",      color: "bg-red-950/60 text-red-400 border-red-800/60",        icon: <AlertCircle className="w-3 h-3" /> },
};

const CATEGORY_COLORS: Record<string, string> = {
  backend:  "text-cyan-400",
  frontend: "text-violet-400",
  infra:    "text-orange-400",
  design:   "text-pink-400",
  general:  "text-zinc-400",
};

// ─── Phase Card ───────────────────────────────────────────────────────────────

function PhaseCard({ phase, onRefresh }: { phase: Phase; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [polling, setPolling] = useState(false);

  const setLock = trpc.missionControl.setLock.useMutation({
    onSuccess: () => { toast.success("Phase updated"); onRefresh(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const [promptModal, setPromptModal] = useState<{ title: string; prompt: string } | null>(null);

  const dispatch = trpc.missionControl.dispatch.useMutation({
    onSuccess: (data) => {
      setPromptModal({ title: data.title, prompt: data.prompt });
      onRefresh();
    },
    onError: (e) => toast.error("Dispatch failed", { description: e.message }),
  });

  const pollStatus = trpc.missionControl.pollStatus.useMutation({
    onSuccess: (data) => {
      toast.success("Status updated", { description: `Agent: ${data.agentStatus}` });
      onRefresh();
    },
    onError: (e) => toast.error("Poll failed", { description: e.message }),
  });

  const markComplete = trpc.missionControl.markComplete.useMutation({
    onSuccess: () => { toast.success("Marked complete"); onRefresh(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const resetPhase = trpc.missionControl.resetPhase.useMutation({
    onSuccess: () => { toast.success("Phase reset to ready"); onRefresh(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const handlePoll = useCallback(async () => {
    setPolling(true);
    try { await pollStatus.mutateAsync({ id: phase.id }); }
    finally { setPolling(false); }
  }, [phase.id, pollStatus]);

  const cfg = STATUS_CONFIG[phase.status];
  const catColor = CATEGORY_COLORS[phase.category] ?? CATEGORY_COLORS.general;
  const isLocked = phase.status === "locked";
  const isReady = phase.status === "ready";
  const isActive = phase.status === "dispatched" || phase.status === "running";
  const isDone = phase.status === "complete";
  const isError = phase.status === "error";

  return (
    <>
    <div className={`
      relative rounded-xl border transition-all duration-200
      ${isDone ? "border-emerald-900/40 bg-emerald-950/10" :
        isActive ? "border-violet-800/40 bg-violet-950/10 shadow-lg shadow-violet-950/20" :
        isError ? "border-red-900/40 bg-red-950/10" :
        isLocked ? "border-zinc-800/60 bg-zinc-900/30 opacity-70" :
        "border-amber-900/40 bg-zinc-900/50 shadow-md shadow-amber-950/10"}
    `}>
      {/* Running pulse indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-violet-500 to-transparent animate-pulse" />
        </div>
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Sort order badge */}
          <span className="mt-0.5 text-xs font-mono text-zinc-600 w-6 shrink-0 text-right">
            {phase.sortOrder}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                {cfg.icon}
                {cfg.label}
              </span>
              {/* Category */}
              <span className={`text-xs font-mono uppercase tracking-wider ${catColor}`}>
                {phase.category}
              </span>
            </div>

            <h3 className={`mt-1.5 font-semibold text-sm leading-snug ${isDone ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
              {phase.title}
            </h3>

            {phase.description && (
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                {phase.description}
              </p>
            )}

            {phase.lockedReason && isLocked && (
              <p className="mt-1.5 text-xs text-amber-600/80 italic">
                Locked: {phase.lockedReason}
              </p>
            )}

            {/* Last status message */}
            {phase.lastStatusMsg && (isActive || isDone || isError) && (
              <p className="mt-2 text-xs text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2 font-mono leading-relaxed line-clamp-3">
                {phase.lastStatusMsg}
              </p>
            )}

            {/* Timestamps */}
            {(phase.dispatchedAt || phase.completedAt) && (
              <div className="mt-2 flex gap-3 text-xs text-zinc-600">
                {phase.dispatchedAt && (
                  <span>Fired: {new Date(phase.dispatchedAt).toLocaleString()}</span>
                )}
                {phase.completedAt && (
                  <span>Done: {new Date(phase.completedAt).toLocaleString()}</span>
                )}
              </div>
            )}

            {/* Manus task link */}
            {phase.manusTaskId && (
              <a
                href={`https://manus.im/task/${phase.manusTaskId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on Manus
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <TooltipProvider>
              {/* Expand/collapse prompt */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                    onClick={() => setExpanded(e => !e)}
                  >
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{expanded ? "Collapse" : "Expand"}</p>
                </TooltipContent>
              </Tooltip>

              {/* Lock / Unlock */}
              {!isActive && !isDone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${isLocked ? "text-amber-500 hover:text-amber-300" : "text-zinc-500 hover:text-zinc-300"}`}
                      onClick={() => setLock.mutate({ id: phase.id, locked: !isLocked })}
                      disabled={setLock.isPending}
                    >
                      {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{isLocked ? "Unlock phase" : "Lock phase"}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Poll status */}
              {isActive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-violet-400 hover:text-violet-200"
                      onClick={handlePoll}
                      disabled={polling}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${polling ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Poll Manus for status</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Mark complete (manual) */}
              {isActive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-emerald-500 hover:text-emerald-300"
                      onClick={() => markComplete.mutate({ id: phase.id })}
                      disabled={markComplete.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Mark complete</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Reset */}
              {(isDone || isError) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                      onClick={() => resetPhase.mutate({ id: phase.id })}
                      disabled={resetPhase.isPending}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Reset to ready</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* FIRE button */}
              {isReady && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="h-7 px-3 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs gap-1.5"
                      onClick={() => dispatch.mutate({ id: phase.id })}
                      disabled={dispatch.isPending}
                    >
                      {dispatch.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3" />
                      )}
                      FIRE
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Dispatch to Manus API</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        {/* Expanded: prompt preview */}
        {expanded && (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Embedded Prompt</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-zinc-500 hover:text-zinc-300 gap-1"
                onClick={() => setShowPrompt(p => !p)}
              >
                {showPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPrompt ? "Hide" : "Show"}
              </Button>
            </div>
            {showPrompt && (
              <pre className="text-xs text-zinc-400 bg-zinc-900 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap font-mono leading-relaxed border border-zinc-800">
                {phase.prompt}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Prompt copy modal — shown after Fire is clicked */}
    {promptModal && (
      <Dialog open={!!promptModal} onOpenChange={() => setPromptModal(null)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400" style={{ fontFamily: "Cinzel, serif" }}>
              ⚡ Phase Ready — Copy &amp; Paste
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Paste this prompt into the Manus chat to execute <strong className="text-zinc-300">{promptModal.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3">
            <pre className="text-xs text-zinc-300 bg-zinc-950 rounded-xl p-4 overflow-auto max-h-80 whitespace-pre-wrap font-mono leading-relaxed border border-zinc-800 select-all">
              {promptModal.prompt}
            </pre>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setPromptModal(null)}
              className="text-zinc-500"
            >
              Close
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 text-black font-bold gap-2"
              onClick={() => {
                navigator.clipboard.writeText(promptModal.prompt);
                toast.success("Prompt copied!", { description: "Paste it into the Manus chat now." });
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

// ─── Add Phase Dialog ─────────────────────────────────────────────────────────

function AddPhaseDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState("");

  const addPhase = trpc.missionControl.addPhase.useMutation({
    onSuccess: () => {
      toast.success("Phase added to ledger");
      setTitle(""); setDescription(""); setCategory("general"); setPrompt(""); setProjectId("");
      onAdded();
      onClose();
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-amber-400 font-cinzel">Add Phase to Ledger</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Define a new development phase with an embedded prompt that can be dispatched to Manus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-zinc-400 text-xs mb-1.5 block">Title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Follow System — Creator Follows"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Category</Label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 text-sm"
              >
                <option value="backend">backend</option>
                <option value="frontend">frontend</option>
                <option value="infra">infra</option>
                <option value="design">design</option>
                <option value="general">general</option>
              </select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Manus Project ID (optional)</Label>
              <Input
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                placeholder="proj_abc123..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Description</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short summary of what this phase accomplishes"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          <div>
            <Label className="text-zinc-400 text-xs mb-1.5 block">Embedded Prompt</Label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="The full prompt that will be sent to the Manus API when this phase is fired..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono text-xs min-h-48 resize-y"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button
            onClick={() => addPhase.mutate({ title, description, category, prompt, manusProjectId: projectId || undefined })}
            disabled={!title.trim() || !prompt.trim() || addPhase.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-black font-bold"
          >
            {addPhase.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Add to Ledger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MissionControl() {
  const [filter, setFilter] = useState<PhaseStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);

  const { data: phases, isLoading, refetch } = trpc.missionControl.listPhases.useQuery(undefined, {
    refetchInterval: 15_000, // auto-poll every 15s for running tasks
  });

  const filtered = (phases ?? []).filter((p: Phase) => filter === "all" || p.status === filter);

  const counts: Record<string, number> = {};
  for (const p of (phases ?? []) as Phase[]) {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
    counts.all = (counts.all ?? 0) + 1;
  }

  const FILTERS: Array<{ key: PhaseStatus | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "ready", label: "Ready" },
    { key: "running", label: "Running" },
    { key: "dispatched", label: "Dispatched" },
    { key: "complete", label: "Complete" },
    { key: "locked", label: "Locked" },
    { key: "error", label: "Error" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-400 tracking-wide" style={{ fontFamily: "Cinzel, serif" }}>
              Mission Control
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Actionable Phase Ledger — {counts.all ?? 0} phases total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-zinc-500 hover:text-zinc-300 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-black font-bold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Phase
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="max-w-4xl mx-auto px-6 pb-3 flex gap-1 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap
                ${filter === f.key
                  ? "bg-amber-600 text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}
              `}
            >
              {f.label}
              {counts[f.key] != null && (
                <span className={`ml-1.5 ${filter === f.key ? "text-black/70" : "text-zinc-600"}`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Phase list */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-zinc-600">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            Loading ledger...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-sm">No phases in this category.</p>
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="mt-2 text-xs text-amber-600 hover:text-amber-400">
                Show all phases
              </button>
            )}
          </div>
        ) : (
          filtered.map((phase: Phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              onRefresh={() => refetch()}
            />
          ))
        )}
      </div>

      {/* Stats footer */}
      {(phases?.length ?? 0) > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-8">
          <div className="border border-zinc-800 rounded-xl bg-zinc-900/40 p-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {(["locked", "ready", "dispatched", "running", "complete", "error"] as PhaseStatus[]).map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className="text-center">
                    <div className={`text-2xl font-bold font-mono ${
                      s === "complete" ? "text-emerald-400" :
                      s === "running" ? "text-violet-400" :
                      s === "ready" ? "text-amber-400" :
                      s === "error" ? "text-red-400" :
                      "text-zinc-500"
                    }`}>
                      {counts[s] ?? 0}
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5 capitalize">{s}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AddPhaseDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => refetch()}
      />
    </div>
  );
}
