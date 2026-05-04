/**
 * ActivationPanel — Stage-Based Progression UI (v4 — Two-Column Layout)
 *
 * Phase 134 layout:
 *   LEFT column  → Witnessed By (avatar strip + names + stage labels)
 *   RIGHT column → Activation Progress (stage dots + progress bar + contribution input)
 *   FULL WIDTH   → Chain of Contribution feed (accordion, below grid)
 *
 * Design rule: Names > numbers. "Slimdoggy +4" not "5 contributors".
 * Reference: ChatGPTImageMay3,2026,10_39_28PM.png
 */
import { useState } from "react";
import { Zap, CheckCircle2, Lock, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ActivationStage {
  id: string;
  label: string;
  description: string;
  goalCents: number;
  reachedAt: string | null;
}

interface RecentContributor {
  userId: number | null;
  name: string;
  image: string | null;
  stageId: string;
  amountCents: number;
  createdAt: string | Date;
  anonymous: boolean;
}

interface ActivationPanelProps {
  songId: number;
  songTitle: string;
}

function formatDollars(cents: number): string {
  if (cents >= 100000) return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function timeAgo(ts: string | Date): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function Avatar({ name, image, size = 32 }: { name: string; image: string | null; size?: number }) {
  return (
    <div
      className="rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center font-semibold"
      style={{
        width: size, height: size,
        background: image ? "transparent" : "rgba(196,154,40,0.18)",
        border: "2px solid rgba(196,154,40,0.4)",
        fontSize: size * 0.35,
        color: "rgba(196,154,40,0.9)",
      }}
    >
      {image
        ? <img src={image} alt={name} className="w-full h-full object-cover" />
        : initials(name)}
    </div>
  );
}

/** LEFT COLUMN — Witnessed By strip with avatar circles, names, and stage labels */
function WitnessedByColumn({ contributors }: { contributors: RecentContributor[] }) {
  const visible = contributors.slice(0, 4);
  const overflow = contributors.length - 4;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(196,154,40,0.7)" }} />
        <span
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: "rgba(196,154,40,0.7)" }}
        >
          Witnessed By
        </span>
        {contributors.length > 0 && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "rgba(196,154,40,0.08)", color: "rgba(196,154,40,0.5)", border: "1px solid rgba(196,154,40,0.15)" }}
          >
            View all ({contributors.length})
          </span>
        )}
      </div>

      {contributors.length === 0 ? (
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Be the first to witness this work
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((c, i) => {
            // Find the highest stage this contributor reached
            const stageLabel = c.stageId ? `Stage ${c.stageId}` : null;
            return (
              <div key={i} className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <Avatar name={c.name} image={c.image} size={40} />
                  {/* Online dot */}
                  <div
                    className="absolute bottom-0 right-0 rounded-full"
                    style={{
                      width: 10, height: 10,
                      background: "#4ade80",
                      border: "2px solid rgba(12,10,6,0.9)",
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {c.name}
                  </p>
                  {stageLabel && (
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: "rgba(196,154,40,0.75)" }}
                    >
                      {stageLabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {overflow > 0 && (
            <div className="flex items-center gap-2.5">
              <div
                className="rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{
                  width: 40, height: 40,
                  background: "rgba(196,154,40,0.08)",
                  border: "2px solid rgba(196,154,40,0.2)",
                  color: "rgba(196,154,40,0.6)",
                }}
              >
                +{overflow}
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                More Witnesses
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** RIGHT COLUMN — Activation Progress: stage dots + progress bar + contribution input */
function ActivationProgressColumn({
  stages,
  totalFundingCents,
  totalGoalCents,
  activeStage,
  recentContributors,
  onContribute,
  isPending,
}: {
  stages: ActivationStage[];
  totalFundingCents: number;
  totalGoalCents: number;
  activeStage: ActivationStage | undefined;
  recentContributors: RecentContributor[];
  onContribute: (amountCents: number) => void;
  isPending: boolean;
}) {
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const PRESET_AMOUNTS = [5, 10, 25, 50];
  const finalAmountCents = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : selectedAmount * 100;

  const overallProgress = totalGoalCents > 0 ? totalFundingCents / totalGoalCents : 0;
  const currentStageIdx = stages.findIndex(s => !s.reachedAt);

  // Find the stage that was most recently unlocked
  const latestUnlocked = stages.filter(s => s.reachedAt).slice(-1)[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: "rgba(196,154,40,0.7)" }}
        >
          Activation Progress
        </span>
        {latestUnlocked && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              background: "rgba(74,222,128,0.08)",
              border: "1px solid rgba(74,222,128,0.25)",
              color: "rgba(74,222,128,0.8)",
            }}
          >
            <CheckCircle2 className="w-2.5 h-2.5" />
            {latestUnlocked.label} Unlocked!
          </span>
        )}
      </div>

      {/* Stage dots row — matches reference image style */}
      <div className="flex items-center gap-1">
        {stages.map((stage, i) => {
          const reached = stage.reachedAt !== null;
          const isActive = i === currentStageIdx;
          const isLocked = !reached && !isActive;
          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage node */}
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="flex items-center justify-center rounded-full font-bold transition-all"
                  style={{
                    width: isActive ? 36 : 28,
                    height: isActive ? 36 : 28,
                    background: reached
                      ? "rgba(74,222,128,0.15)"
                      : isActive
                      ? "rgba(196,154,40,0.2)"
                      : "rgba(255,255,255,0.04)",
                    border: reached
                      ? "2px solid rgba(74,222,128,0.6)"
                      : isActive
                      ? "2px solid rgba(196,154,40,0.7)"
                      : "2px solid rgba(255,255,255,0.12)",
                    color: reached
                      ? "rgba(74,222,128,0.9)"
                      : isActive
                      ? "rgba(196,154,40,0.95)"
                      : "rgba(255,255,255,0.2)",
                    fontSize: isActive ? 14 : 11,
                  }}
                >
                  {reached ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isActive ? (
                    <Zap className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-2.5 h-2.5" />
                  )}
                </div>
                <span
                  className="text-[9px] text-center uppercase tracking-wide"
                  style={{
                    color: reached
                      ? "rgba(74,222,128,0.7)"
                      : isActive
                      ? "rgba(196,154,40,0.8)"
                      : "rgba(255,255,255,0.2)",
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  {stage.label}
                </span>
                <span
                  className="text-[9px] tabular-nums"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  {formatDollars(stage.goalCents)}
                </span>
              </div>
              {/* Connector line between stages */}
              {i < stages.length - 1 && (
                <div
                  className="h-px flex-1 mx-1"
                  style={{
                    background: reached
                      ? "rgba(74,222,128,0.4)"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span className="tabular-nums">{formatDollars(totalFundingCents)} raised</span>
          <span className="tabular-nums">Goal: {formatDollars(totalGoalCents)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(overallProgress * 100, 100)}%`,
              background: "linear-gradient(90deg, #C49A28, #F0C040)",
            }}
          />
        </div>
      </div>

      {/* Stage attribution — who unlocked the active stage */}
      {activeStage && recentContributors.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {recentContributors.slice(0, 3).map((c, i) => (
              <Avatar key={i} name={c.name} image={c.image} size={18} />
            ))}
          </div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Witnessed by{" "}
            <span style={{ color: "rgba(196,154,40,0.75)", fontWeight: 600 }}>
              {recentContributors.slice(0, 2).map(c => c.name).join(", ")}
              {recentContributors.length > 2 ? `, +${recentContributors.length - 2} others` : ""}
            </span>
          </p>
        </div>
      )}

      {/* Contribution input */}
      {activeStage && (
        <div className="pt-3" style={{ borderTop: "1px solid rgba(196,154,40,0.1)" }}>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                className="rounded-lg py-1.5 text-xs transition-all"
                style={{
                  background: selectedAmount === amt && !customAmount ? "rgba(196,154,40,0.18)" : "rgba(255,255,255,0.05)",
                  color: selectedAmount === amt && !customAmount ? "var(--ln-gold)" : "rgba(255,255,255,0.5)",
                  border: selectedAmount === amt && !customAmount ? "1px solid rgba(196,154,40,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  fontWeight: 600,
                }}
              >
                ${amt}
              </button>
            ))}
          </div>
          <div className="relative flex items-center mb-2">
            <span className="absolute left-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>$</span>
            <input
              type="number" min="1" step="1" placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
              className="w-full pl-6 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{
                background: customAmount ? "rgba(196,154,40,0.08)" : "rgba(255,255,255,0.04)",
                color: "var(--ln-parchment)",
                border: customAmount ? "1px solid rgba(196,154,40,0.4)" : "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => onContribute(finalAmountCents)}
            disabled={isPending || finalAmountCents < 100}
            className="w-full rounded-xl py-2.5 font-semibold text-sm transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #C49A28, #F0C040)",
              color: "#1A1A1A",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.06em",
            }}
          >
            {isPending
              ? "Redirecting…"
              : `Activate${finalAmountCents >= 100 ? ` — ${formatDollars(finalAmountCents)}` : " This Work"}`}
          </button>
          <p className="text-[10px] mt-1.5 text-center" style={{ color: "rgba(255,255,255,0.18)" }}>
            Powered by Stripe · Secure checkout
          </p>
        </div>
      )}
    </div>
  );
}

/** FULL-WIDTH — Chain of Contribution feed (accordion) */
function ContributionFeed({ contributors }: { contributors: RecentContributor[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderTop: "1px solid rgba(196,154,40,0.1)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 transition-opacity hover:opacity-80"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Cinzel', serif" }}>
            Chain of Contribution
          </span>
          {contributors.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(196,154,40,0.1)", color: "rgba(196,154,40,0.6)", border: "1px solid rgba(196,154,40,0.2)" }}
            >
              {contributors.length}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          {contributors.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "rgba(255,255,255,0.25)" }}>
              Be the first to witness this work
            </p>
          ) : (
            contributors.slice(0, 10).map((c, i) => {
              // Build action text matching reference image
              const actionText = c.anonymous
                ? "Contributed anonymously"
                : c.amountCents > 0
                ? `Activated Stage ${c.stageId} with ${formatDollars(c.amountCents)}`
                : `Witnessed this work`;
              return (
                <div key={i} className="flex items-center gap-3">
                  <Avatar name={c.name} image={c.image} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                      <span style={{ color: "rgba(196,154,40,0.85)", fontWeight: 600 }}>{c.name}</span>
                      {"  "}
                      <span>{actionText}</span>
                    </p>
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {timeAgo(c.createdAt)}
                  </span>
                </div>
              );
            })
          )}
          {contributors.length > 0 && (
            <button
              type="button"
              className="w-full text-center text-xs py-2 rounded-lg transition-all hover:opacity-80"
              style={{
                background: "rgba(196,154,40,0.04)",
                border: "1px solid rgba(196,154,40,0.12)",
                color: "rgba(196,154,40,0.55)",
              }}
            >
              View all activity →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ActivationPanel({ songId, songTitle }: ActivationPanelProps) {
  const utils = trpc.useUtils();

  const { data: activation, isLoading } = trpc.activation.getForSong.useQuery(
    { songId },
    { enabled: songId > 0 }
  );

  const contribute = trpc.activation.contribute.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        utils.activation.getForSong.invalidate({ songId });
        toast.success("Contribution recorded — updating progress");
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(`Contribution failed: ${err.message}`);
    },
  });

  if (isLoading) return null;
  if (!activation?.activationEnabled) return null;

  const stages: ActivationStage[] = (activation.stages ?? []).map((s: any) => ({
    ...s,
    description: s.description ?? "",
  }));
  const recentContributors: RecentContributor[] = (activation as any).recentContributors ?? [];
  const totalFundingCents = activation.totalFundingCents ?? 0;
  const totalGoalCents = stages.reduce((sum, s) => sum + s.goalCents, 0);
  const activeStage = stages.find((s) => !s.reachedAt) ?? stages[stages.length - 1];

  const handleContribute = (amountCents: number) => {
    if (!activeStage) return;
    if (amountCents < 100) { toast.error("Minimum contribution is $1"); return; }
    contribute.mutate({ songId, stageId: activeStage.id, amountCents, origin: window.location.origin });
  };

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.35)" }}
    >
      {/* ── HEADER ── */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
          <h3 className="text-base font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
            Activate This Work
          </h3>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Contributions move this work from creation → real-world release
        </p>
      </div>

      {/* ── TWO-COLUMN GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0" style={{ borderBottom: "1px solid rgba(196,154,40,0.1)" }}>
        {/* LEFT — Witnessed By */}
        <div
          className="px-5 py-4"
          style={{ borderRight: "1px solid rgba(196,154,40,0.08)" }}
        >
          <WitnessedByColumn contributors={recentContributors} />
        </div>

        {/* RIGHT — Activation Progress */}
        <div className="px-5 py-4">
          <ActivationProgressColumn
            stages={stages}
            totalFundingCents={totalFundingCents}
            totalGoalCents={totalGoalCents}
            activeStage={activeStage}
            recentContributors={recentContributors}
            onContribute={handleContribute}
            isPending={contribute.isPending}
          />
        </div>
      </div>

      {/* ── CHAIN OF CONTRIBUTION (full-width accordion) ── */}
      <ContributionFeed contributors={recentContributors} />
    </div>
  );
}
