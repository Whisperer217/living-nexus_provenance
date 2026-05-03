/**
 * ActivationPanel — Stage-Based Progression UI (v2 — Production Spec)
 *
 * Renders when a song has activationEnabled=true.
 * This is a PROGRESSION SYSTEM, not a donation UI.
 * Every element reinforces the narrative: idea → reality.
 */
import { useState } from "react";
import { Zap, CheckCircle2, Lock, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ActivationStage {
  id: string;
  label: string;
  description: string;
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

export function ActivationPanel({ songId, songTitle }: ActivationPanelProps) {
  const [showContributors, setShowContributors] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(10); // dollars
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
        // Post-Stripe success: invalidate so progress updates on return
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
  const totalFundingCents = activation.totalFundingCents ?? 0;
  const totalGoalCents = stages.reduce((sum, s) => sum + s.goalCents, 0);
  const overallProgress = totalGoalCents > 0 ? totalFundingCents / totalGoalCents : 0;

  // Find the active stage (first not yet reached)
  const activeStage = stages.find((s) => !s.reachedAt) ?? stages[stages.length - 1];

  const PRESET_AMOUNTS = [5, 10, 25, 50]; // dollars

  const finalAmountCents = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : selectedAmount * 100;

  const handleContribute = () => {
    if (!activeStage) return;
    if (finalAmountCents < 100) {
      toast.error("Minimum contribution is $1");
      return;
    }
    contribute.mutate({
      songId,
      stageId: activeStage.id,
      amountCents: finalAmountCents,
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
      {/* ── HEADER ── */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
          <h3
            className="text-base font-semibold"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}
          >
            Activate This Work
          </h3>
        </div>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Contributions move this work from creation → real-world release
        </p>
        <div
          className="text-[10px] mt-2 uppercase tracking-widest font-semibold"
          style={{ color: "var(--ln-gold)", opacity: 0.7 }}
        >
          Creator Commitment: Active
        </div>
      </div>

      {/* ── TOTAL PROGRESS BAR ── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          <span className="tabular-nums">{formatDollars(totalFundingCents)} raised</span>
          <span className="tabular-nums">Goal: {formatDollars(totalGoalCents)}</span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(overallProgress * 100, 100)}%`,
              background: "linear-gradient(90deg, #C49A28, #F0C040)",
            }}
          />
        </div>
        <div className="text-[10px] mt-1 text-right tabular-nums" style={{ color: "var(--ln-gold)" }}>
          {Math.round(overallProgress * 100)}% complete
        </div>
      </div>

      {/* ── STAGE CARDS ── */}
      <div className="px-5 pb-4 space-y-3">
        {stages.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--ln-smoke)" }}>
            No stages configured yet.
          </p>
        ) : (
          stages.map((stage) => {
            const reached = stage.reachedAt !== null;
            const isActive = stage.id === activeStage?.id;
            return (
              <div
                key={stage.id}
                className="p-3 rounded-xl transition-all"
                style={{
                  border: reached
                    ? "1px solid rgba(234,179,8,0.5)"
                    : isActive
                    ? "1px solid rgba(196,154,40,0.3)"
                    : "1px solid rgba(255,255,255,0.07)",
                  background: reached
                    ? "rgba(234,179,8,0.05)"
                    : isActive
                    ? "rgba(196,154,40,0.03)"
                    : "transparent",
                }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {reached ? (
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#4ade80" }} />
                      ) : isActive ? (
                        <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                      ) : (
                        <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                      )}
                      <span
                        className="text-sm font-semibold"
                        style={{
                          fontFamily: "'Cinzel', serif",
                          color: reached
                            ? "var(--ln-gold)"
                            : isActive
                            ? "var(--ln-parchment)"
                            : "rgba(255,255,255,0.35)",
                        }}
                      >
                        {stage.label}
                      </span>
                    </div>
                    {stage.description && (
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.4)", paddingLeft: "1.25rem" }}
                      >
                        {stage.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-right">
                    {reached ? (
                      <span style={{ color: "#4ade80" }}>✔ Reached</span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>
                        {isActive ? formatDollars(stage.goalCents) : "Locked"}
                      </span>
                    )}
                  </div>
                </div>
                {reached && stage.reachedAt && (
                  <p className="text-[10px] mt-1.5 pl-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Reached {new Date(stage.reachedAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── CONTRIBUTION SECTION ── */}
      {activeStage && (
        <div
          className="px-5 pb-5 pt-3"
          style={{ borderTop: "1px solid rgba(196,154,40,0.1)" }}
        >
          {/* 4-button preset grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                className="rounded-lg py-2 text-sm transition-all"
                style={{
                  background: selectedAmount === amt && !customAmount
                    ? "rgba(196,154,40,0.18)"
                    : "rgba(255,255,255,0.05)",
                  color: selectedAmount === amt && !customAmount
                    ? "var(--ln-gold)"
                    : "rgba(255,255,255,0.55)",
                  border: selectedAmount === amt && !customAmount
                    ? "1px solid rgba(196,154,40,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  fontWeight: 600,
                }}
              >
                ${amt}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative flex items-center mb-3">
            <span
              className="absolute left-3 text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              $
            </span>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
              className="w-full pl-7 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: customAmount ? "rgba(196,154,40,0.08)" : "rgba(255,255,255,0.04)",
                color: "var(--ln-parchment)",
                border: customAmount
                  ? "1px solid rgba(196,154,40,0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleContribute}
            disabled={contribute.isPending || finalAmountCents < 100}
            className="w-full rounded-xl py-3 font-semibold text-sm transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #C49A28, #F0C040)",
              color: "#1A1A1A",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.06em",
            }}
          >
            {contribute.isPending
              ? "Redirecting to payment…"
              : `Activate This Work${finalAmountCents >= 100 ? ` — ${formatDollars(finalAmountCents)}` : ""}`}
          </button>

          <p className="text-[10px] mt-2 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
            Powered by Stripe · Secure checkout
          </p>
        </div>
      )}

      {/* ── CONTRIBUTORS TOGGLE ── */}
      <button
        type="button"
        onClick={() => setShowContributors(!showContributors)}
        className="w-full flex items-center justify-between px-5 py-3 transition-opacity hover:opacity-80"
        style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Recent supporters
          </span>
        </div>
        {showContributors
          ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />}
      </button>

      {showContributors && (
        <div className="px-5 pb-4 space-y-2">
          {!contributions || contributions.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "rgba(255,255,255,0.25)" }}>
              Be the first to contribute.
            </p>
          ) : (
            contributions.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
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
