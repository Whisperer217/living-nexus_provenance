/**
 * ActivationPanel — Stage-Based Progression UI (v3 — Contributor Recognition)
 *
 * Phase 133 additions:
 *   - WitnessStrip: horizontal scroll of contributor avatars above stage bars
 *   - Stage Attribution: contributor names per reached stage
 *   - Contribution Feed: accordion list "Chain of Contribution"
 *
 * Design rule: Names > numbers. "Slimdoggy +4" not "5 contributors".
 */
import { useState } from "react";
import { Zap, CheckCircle2, Lock, ChevronDown, ChevronUp } from "lucide-react";
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

function formatContribution(c: RecentContributor): string {
  return `${c.name} — Activated Stage ${c.stageId} (${formatDollars(c.amountCents)})`;
}

function timeAgo(ts: string | Date): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Initials fallback for avatar */
function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/** Compact avatar circle */
function Avatar({ name, image, size = 32 }: { name: string; image: string | null; size?: number }) {
  return (
    <div
      className="rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center font-semibold"
      style={{
        width: size, height: size,
        background: image ? "transparent" : "rgba(196,154,40,0.18)",
        border: "1.5px solid rgba(196,154,40,0.35)",
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

/** WitnessStrip — horizontal scroll of contributor avatars */
function WitnessStrip({ contributors }: { contributors: RecentContributor[] }) {
  const visible = contributors.slice(0, 5);
  const overflow = contributors.length - 5;

  if (contributors.length === 0) {
    return (
      <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          Be the first to witness this work
        </p>
      </div>
    );
  }

  return (
    <div
      className="px-5 py-3"
      style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}
    >
      <p
        className="text-[10px] uppercase tracking-widest mb-2"
        style={{ color: "rgba(196,154,40,0.6)" }}
      >
        Witnessed By
      </p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {visible.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
            <Avatar name={c.name} image={c.image} size={36} />
            <span
              className="text-[9px] text-center max-w-[48px] truncate"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {c.name}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div
              className="rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                width: 36, height: 36,
                background: "rgba(196,154,40,0.1)",
                border: "1.5px solid rgba(196,154,40,0.25)",
                color: "rgba(196,154,40,0.7)",
              }}
            >
              +{overflow}
            </div>
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>more</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Stage Attribution — show contributor names per reached stage */
function StageAttribution({ stageId, contributors }: { stageId: string; contributors: RecentContributor[] }) {
  const stageContribs = contributors.filter(c => c.stageId === stageId);
  if (stageContribs.length === 0) return null;

  const first2 = stageContribs.slice(0, 2);
  const overflow = stageContribs.length - 2;

  return (
    <p className="text-[10px] mt-1 pl-5" style={{ color: "rgba(255,255,255,0.35)" }}>
      Witnessed by{" "}
      <span style={{ color: "rgba(196,154,40,0.7)" }}>
        {first2.map(c => c.name).join(" • ")}
        {overflow > 0 ? ` • +${overflow}` : ""}
      </span>
    </p>
  );
}

export function ActivationPanel({ songId, songTitle }: ActivationPanelProps) {
  const [showFeed, setShowFeed] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
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
  const overallProgress = totalGoalCents > 0 ? totalFundingCents / totalGoalCents : 0;

  const activeStage = stages.find((s) => !s.reachedAt) ?? stages[stages.length - 1];

  const PRESET_AMOUNTS = [5, 10, 25, 50];
  const finalAmountCents = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : selectedAmount * 100;

  const handleContribute = () => {
    if (!activeStage) return;
    if (finalAmountCents < 100) { toast.error("Minimum contribution is $1"); return; }
    contribute.mutate({ songId, stageId: activeStage.id, amountCents: finalAmountCents, origin: window.location.origin });
  };

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.35)" }}
    >
      {/* ── HEADER ── */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
          <h3 className="text-base font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
            Activate This Work
          </h3>
        </div>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Contributions move this work from creation → real-world release
        </p>
        <div className="text-[10px] mt-2 uppercase tracking-widest font-semibold" style={{ color: "var(--ln-gold)", opacity: 0.7 }}>
          Creator Commitment: Active
        </div>
      </div>

      {/* ── WITNESS STRIP ── */}
      <WitnessStrip contributors={recentContributors} />

      {/* ── TOTAL PROGRESS BAR ── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          <span className="tabular-nums">{formatDollars(totalFundingCents)} raised</span>
          <span className="tabular-nums">Goal: {formatDollars(totalGoalCents)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(overallProgress * 100, 100)}%`, background: "linear-gradient(90deg, #C49A28, #F0C040)" }}
          />
        </div>
        <div className="text-[10px] mt-1 text-right tabular-nums" style={{ color: "var(--ln-gold)" }}>
          {Math.round(overallProgress * 100)}% complete
        </div>
      </div>

      {/* ── STAGE CARDS ── */}
      <div className="px-5 pb-4 space-y-3">
        {stages.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--ln-smoke)" }}>No stages configured yet.</p>
        ) : (
          stages.map((stage) => {
            const reached = stage.reachedAt !== null;
            const isActive = stage.id === activeStage?.id;
            return (
              <div
                key={stage.id}
                className="p-3 rounded-xl transition-all"
                style={{
                  border: reached ? "1px solid rgba(234,179,8,0.5)" : isActive ? "1px solid rgba(196,154,40,0.3)" : "1px solid rgba(255,255,255,0.07)",
                  background: reached ? "rgba(234,179,8,0.05)" : isActive ? "rgba(196,154,40,0.03)" : "transparent",
                }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {reached
                        ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#4ade80" }} />
                        : isActive
                        ? <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                        : <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />}
                      <span
                        className="text-sm font-semibold"
                        style={{
                          fontFamily: "'Cinzel', serif",
                          color: reached ? "var(--ln-gold)" : isActive ? "var(--ln-parchment)" : "rgba(255,255,255,0.35)",
                        }}
                      >
                        {stage.label}
                      </span>
                    </div>
                    {stage.description && (
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)", paddingLeft: "1.25rem" }}>
                        {stage.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-right">
                    {reached
                      ? <span style={{ color: "#4ade80" }}>✔ Reached</span>
                      : <span style={{ color: "rgba(255,255,255,0.3)" }}>{isActive ? formatDollars(stage.goalCents) : "Locked"}</span>}
                  </div>
                </div>
                {/* Stage Attribution — names of who unlocked this stage */}
                {reached && (
                  <StageAttribution stageId={stage.id} contributors={recentContributors} />
                )}
                {reached && stage.reachedAt && (
                  <p className="text-[10px] mt-1 pl-5" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {new Date(stage.reachedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── CONTRIBUTION SECTION ── */}
      {activeStage && (
        <div className="px-5 pb-5 pt-3" style={{ borderTop: "1px solid rgba(196,154,40,0.1)" }}>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                className="rounded-lg py-2 text-sm transition-all"
                style={{
                  background: selectedAmount === amt && !customAmount ? "rgba(196,154,40,0.18)" : "rgba(255,255,255,0.05)",
                  color: selectedAmount === amt && !customAmount ? "var(--ln-gold)" : "rgba(255,255,255,0.55)",
                  border: selectedAmount === amt && !customAmount ? "1px solid rgba(196,154,40,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  fontWeight: 600,
                }}
              >
                ${amt}
              </button>
            ))}
          </div>
          <div className="relative flex items-center mb-3">
            <span className="absolute left-3 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>$</span>
            <input
              type="number" min="1" step="1" placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
              className="w-full pl-7 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: customAmount ? "rgba(196,154,40,0.08)" : "rgba(255,255,255,0.04)",
                color: "var(--ln-parchment)",
                border: customAmount ? "1px solid rgba(196,154,40,0.4)" : "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>
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

      {/* ── CHAIN OF CONTRIBUTION (accordion) ── */}
      <button
        type="button"
        onClick={() => setShowFeed(!showFeed)}
        className="w-full flex items-center justify-between px-5 py-3 transition-opacity hover:opacity-80"
        style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Cinzel', serif" }}>
            Chain of Contribution
          </span>
          {recentContributors.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(196,154,40,0.1)", color: "rgba(196,154,40,0.6)", border: "1px solid rgba(196,154,40,0.2)" }}
            >
              {recentContributors.length}
            </span>
          )}
        </div>
        {showFeed
          ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />}
      </button>

      {showFeed && (
        <div className="px-5 pb-4 space-y-2">
          {recentContributors.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "rgba(255,255,255,0.25)" }}>
              Be the first to witness this work
            </p>
          ) : (
            recentContributors.slice(0, 10).map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar name={c.name} image={c.image} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                    <span style={{ color: "rgba(196,154,40,0.8)", fontWeight: 600 }}>{c.name}</span>
                    {" — "}
                    {c.anonymous ? "Contributed anonymously" : `Activated Stage ${c.stageId} (${formatDollars(c.amountCents)})`}
                  </p>
                </div>
                <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {timeAgo(c.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
