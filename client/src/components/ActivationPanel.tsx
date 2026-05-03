/**
 * ActivationPanel — Stage-Based Funding Progress UI
 *
 * Renders when a song has activationEnabled=true.
 * Shows stage progress bars, total funding, recent contributors,
 * and a "Contribute" button that opens a Stripe Checkout session.
 */
import { useState } from "react";
import { Zap, CheckCircle2, Lock, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ActivationStage {
  id: string;
  label: string;
  goalCents: number;
  reachedAt: string | null;
}

interface ActivationPanelProps {
  songId: number;
  songTitle: string;
}

function formatDollars(cents: number): string {
  if (cents >= 100000) return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function StageBar({
  stage,
  cumulativeGoalCents,
  totalFundingCents,
  isActive,
}: {
  stage: ActivationStage;
  cumulativeGoalCents: number;
  totalFundingCents: number;
  isActive: boolean;
}) {
  const prevGoal = cumulativeGoalCents - stage.goalCents;
  const stageProgress = Math.min(
    Math.max(totalFundingCents - prevGoal, 0),
    stage.goalCents
  );
  const pct = Math.round((stageProgress / stage.goalCents) * 100);
  const isReached = !!stage.reachedAt;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: isReached
          ? "rgba(196,154,40,0.08)"
          : isActive
          ? "rgba(196,154,40,0.04)"
          : "rgba(255,255,255,0.02)",
        border: isReached
          ? "1px solid rgba(196,154,40,0.5)"
          : isActive
          ? "1px solid rgba(196,154,40,0.25)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isReached ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
          ) : isActive ? (
            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
          ) : (
            <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-iron)" }} />
          )}
          <span
            className="text-sm font-semibold"
            style={{
              fontFamily: "'Cinzel', serif",
              color: isReached ? "var(--ln-gold)" : isActive ? "var(--ln-parchment)" : "var(--ln-iron)",
              letterSpacing: "0.04em",
            }}
          >
            {stage.label}
          </span>
          {isReached && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(196,154,40,0.15)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.4)",
                letterSpacing: "0.08em",
              }}
            >
              REACHED
            </span>
          )}
        </div>
        <span className="text-xs tabular-nums" style={{ color: "var(--ln-smoke)" }}>
          {formatDollars(stageProgress)} / {formatDollars(stage.goalCents)}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isReached
              ? "linear-gradient(90deg, #C49A28, #F0C040)"
              : isActive
              ? "linear-gradient(90deg, rgba(196,154,40,0.6), rgba(196,154,40,0.9))"
              : "rgba(255,255,255,0.1)",
          }}
        />
      </div>

      {/* Reached timestamp */}
      {isReached && stage.reachedAt && (
        <p className="text-[10px] mt-1.5" style={{ color: "var(--ln-smoke)" }}>
          Reached {new Date(stage.reachedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

export function ActivationPanel({ songId, songTitle }: ActivationPanelProps) {
  const [showContributors, setShowContributors] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(1000); // cents — $10 default
  const [customAmount, setCustomAmount] = useState("");
  const utils = trpc.useUtils();

  const { data: activation, isLoading } = trpc.activation.getForSong.useQuery(
    { songId },
    { enabled: songId > 0 }
  );

  const { data: contributions } = trpc.activation.getContributions.useQuery(
    { songId, limit: 10 },
    { enabled: songId > 0 && showContributors }
  );

  const contribute = trpc.activation.contribute.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(`Contribution failed: ${err.message}`);
    },
  });

  if (isLoading) return null;
  if (!activation?.activationEnabled) return null;

  const stages: ActivationStage[] = activation.stages ?? [];
  const totalFundingCents = activation.totalFundingCents ?? 0;

  // Find the active stage (first not yet reached)
  let cumulative = 0;
  let activeStageId: string | null = null;
  for (const stage of stages) {
    cumulative += stage.goalCents;
    if (!stage.reachedAt) {
      activeStageId = stage.id;
      break;
    }
  }

  const activeStage = stages.find((s) => s.id === activeStageId) ?? stages[stages.length - 1];
  const overallGoalCents = stages.reduce((sum, s) => sum + s.goalCents, 0);
  const overallPct = overallGoalCents > 0 ? Math.round((totalFundingCents / overallGoalCents) * 100) : 0;

  const PRESET_AMOUNTS = [500, 1000, 2500, 5000]; // cents

  const finalAmount = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : selectedAmount;

  const handleContribute = () => {
    if (!activeStage) return;
    if (finalAmount < 100) {
      toast.error("Minimum contribution is $1");
      return;
    }
    contribute.mutate({
      songId,
      stageId: activeStage.id,
      amountCents: finalAmount,
      origin: window.location.origin,
    });
  };

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{
        background: "var(--ln-coal)",
        border: "1px solid rgba(196,154,40,0.35)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.15)" }}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" style={{ color: "var(--ln-gold)" }} />
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            Activation
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums" style={{ color: "var(--ln-smoke)" }}>
            {formatDollars(totalFundingCents)} raised
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: "rgba(196,154,40,0.12)",
              color: "var(--ln-gold)",
              border: "1px solid rgba(196,154,40,0.35)",
            }}
          >
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Stage list */}
      <div className="px-5 py-4 space-y-3">
        {stages.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--ln-smoke)" }}>
            No stages configured yet.
          </p>
        ) : (
          (() => {
            let cum = 0;
            return stages.map((stage) => {
              cum += stage.goalCents;
              return (
                <StageBar
                  key={stage.id}
                  stage={stage}
                  cumulativeGoalCents={cum}
                  totalFundingCents={totalFundingCents}
                  isActive={stage.id === activeStageId}
                />
              );
            });
          })()
        )}
      </div>

      {/* Contribute section */}
      {activeStage && (
        <div
          className="px-5 pb-5 pt-2"
          style={{ borderTop: "1px solid rgba(196,154,40,0.1)" }}
        >
          <p className="text-xs mb-3" style={{ color: "var(--ln-smoke)" }}>
            Support this work — contributions go directly toward reaching{" "}
            <span style={{ color: "var(--ln-gold)" }}>{activeStage.label}</span>.
          </p>

          {/* Amount presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: selectedAmount === amt && !customAmount
                    ? "rgba(196,154,40,0.2)"
                    : "rgba(255,255,255,0.04)",
                  color: selectedAmount === amt && !customAmount
                    ? "var(--ln-gold)"
                    : "var(--ln-smoke)",
                  border: selectedAmount === amt && !customAmount
                    ? "1px solid rgba(196,154,40,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {formatDollars(amt)}
              </button>
            ))}
            {/* Custom amount input */}
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-xs" style={{ color: "var(--ln-smoke)" }}>$</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Custom"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
                className="pl-6 pr-2 py-1.5 rounded-lg text-xs w-24 outline-none"
                style={{
                  background: customAmount ? "rgba(196,154,40,0.1)" : "rgba(255,255,255,0.04)",
                  color: "var(--ln-parchment)",
                  border: customAmount ? "1px solid rgba(196,154,40,0.4)" : "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>
          </div>

          <Button
            onClick={handleContribute}
            disabled={contribute.isPending || finalAmount < 100}
            className="w-full font-semibold tracking-wide"
            style={{
              background: "linear-gradient(135deg, #C49A28, #F0C040)",
              color: "#1A1A1A",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.08em",
            }}
          >
            {contribute.isPending
              ? "Redirecting to payment…"
              : `Contribute ${finalAmount >= 100 ? formatDollars(finalAmount) : ""}`}
          </Button>

          <p className="text-[10px] mt-2 text-center" style={{ color: "var(--ln-iron)" }}>
            Powered by Stripe · Secure checkout
          </p>
        </div>
      )}

      {/* Contributors toggle */}
      <button
        type="button"
        onClick={() => setShowContributors(!showContributors)}
        className="w-full flex items-center justify-between px-5 py-3 transition-opacity hover:opacity-80"
        style={{ borderTop: "1px solid rgba(196,154,40,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: "var(--ln-smoke)" }} />
          <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>
            Recent supporters
          </span>
        </div>
        {showContributors
          ? <ChevronUp className="w-4 h-4" style={{ color: "var(--ln-iron)" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "var(--ln-iron)" }} />}
      </button>

      {showContributors && (
        <div className="px-5 pb-4 space-y-2">
          {!contributions || contributions.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "var(--ln-iron)" }}>
              Be the first to contribute.
            </p>
          ) : (
            contributions.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                  {c.anonymous ? "Anonymous" : (c.contributorName || "Supporter")}
                </span>
                <span className="text-xs tabular-nums" style={{ color: "var(--ln-gold)" }}>
                  {formatDollars(c.amountCents)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
