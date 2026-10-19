import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, CircleAlert, CreditCard, Loader2, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

const GOLD = "var(--ln-gold)";
const PARCHMENT = "var(--ln-parchment)";
const SMOKE = "var(--ln-smoke)";
const PANEL = "var(--ln-surface-panel, rgba(20,18,14,0.92))";
const CARD = "var(--ln-surface-card, rgba(255,255,255,0.035))";
const BORDER = "1px solid rgba(196,154,40,0.24)";

type ConnectStatus = "not_connected" | "pending" | "restricted" | "enabled" | "error";

const STATUS_COPY: Record<ConnectStatus, { eyebrow: string; title: string; body: string; action: string; tone: string }> = {
  not_connected: {
    eyebrow: "Payout account",
    title: "Connect Stripe to receive gifts",
    body: "Stripe securely collects the details needed to send support to you. Living Nexus does not receive or store your bank or identity documents.",
    action: "Connect Stripe",
    tone: "var(--ln-gold)",
  },
  pending: {
    eyebrow: "Payout account",
    title: "Your Stripe setup is waiting",
    body: "Return to Stripe to finish the details required before gifts can be received.",
    action: "Continue setup",
    tone: "var(--ln-gold-hot, var(--ln-gold))",
  },
  restricted: {
    eyebrow: "Payout account",
    title: "Stripe needs one more review",
    body: "Stripe has requested additional details before it can enable payouts. Your Works and registry record are unaffected.",
    action: "Finish verification",
    tone: "#f0b86e",
  },
  enabled: {
    eyebrow: "Payout account",
    title: "Payouts are ready",
    body: "Eligible support through Living Nexus can now be directed to your connected Stripe account.",
    action: "Payouts ready",
    tone: "var(--ln-seal-bright, #74d18b)",
  },
  error: {
    eyebrow: "Payout account",
    title: "Payout status is temporarily unavailable",
    body: "Your connection was not changed. Refresh this page or return later before making any assumptions about readiness.",
    action: "Try again",
    tone: "#f0b86e",
  },
};

export default function PayoutsPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const statusQuery = trpc.tips.connectStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
  const connectMutation = trpc.tips.connectOnboarding.useMutation({
    onSuccess: (result) => {
      if (result.url) window.location.assign(result.url);
    },
    onError: (error) => toast.error(error.message || "Stripe onboarding could not be opened."),
  });

  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5" style={{ background: "var(--ln-void)", color: PARCHMENT }}>
        <section className="max-w-md rounded-2xl p-7 text-center" style={{ background: PANEL, border: BORDER }}>
          <WalletCards className="mx-auto mb-4" style={{ color: GOLD }} aria-hidden="true" />
          <h1 className="text-2xl mb-3" style={{ fontFamily: "var(--ln-font-display, 'Cinzel', serif)" }}>Creator Payouts</h1>
          <p className="text-sm mb-5" style={{ color: SMOKE }}>Sign in to connect Stripe and manage payout readiness.</p>
          <a href={getLoginUrl("/settings/payouts")} className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: GOLD, color: "var(--ln-coal)" }}>
            Sign in to continue
          </a>
        </section>
      </main>
    );
  }

  const status = (statusQuery.isError ? "error" : statusQuery.data?.status ?? "not_connected") as ConnectStatus;
  const copy = STATUS_COPY[status];
  const isBusy = statusQuery.isLoading || connectMutation.isPending;
  const isEnabled = status === "enabled";
  const requirements = statusQuery.data?.requirementsLabels ?? [];

  const handlePrimaryAction = () => {
    if (status === "error") {
      statusQuery.refetch();
      return;
    }
    if (isEnabled) return;
    connectMutation.mutate({ origin: window.location.origin });
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12" style={{ background: "var(--ln-void)", color: PARCHMENT }}>
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate("/settings/billing")}
          className="mb-7 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: SMOKE }}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Settings
        </button>

        <header className="mb-8 max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Creator settings</p>
          <h1 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--ln-font-display, 'Cinzel', serif)" }}>Creator Payouts</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed" style={{ color: SMOKE }}>
            Connect your Stripe account once. When Stripe marks it ready, fans can support your public Works through the existing Living Nexus support flow.
          </p>
        </header>

        <section className="rounded-2xl p-5 sm:p-7" style={{ background: PANEL, border: BORDER, boxShadow: "0 20px 60px rgba(0,0,0,0.22)" }} aria-labelledby="payout-status-title">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${copy.tone} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${copy.tone} 42%, transparent)` }}>
                {isEnabled ? <CheckCircle2 style={{ color: copy.tone }} aria-hidden="true" /> : <CreditCard style={{ color: copy.tone }} aria-hidden="true" />}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: copy.tone }}>{copy.eyebrow}</p>
                <h2 id="payout-status-title" className="mt-1 text-xl" style={{ fontFamily: "var(--ln-font-display, 'Cinzel', serif)" }}>{copy.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: SMOKE }}>{copy.body}</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handlePrimaryAction}
              disabled={isBusy || isEnabled}
              className="min-h-11 shrink-0 gap-2 font-semibold"
              style={{ background: isEnabled ? CARD : GOLD, color: isEnabled ? PARCHMENT : "var(--ln-coal)", border: isEnabled ? BORDER : "none" }}
            >
              {isBusy ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : status === "error" ? <RefreshCw size={16} aria-hidden="true" /> : isEnabled ? <CheckCircle2 size={16} aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}
              {connectMutation.isPending ? "Opening Stripe…" : copy.action}
            </Button>
          </div>

          {requirements.length > 0 && !isEnabled && (
            <div className="mt-6 rounded-xl p-4" style={{ background: CARD, border: "1px solid rgba(240,184,110,0.28)" }}>
              <div className="flex gap-2">
                <CircleAlert size={17} style={{ color: "#f0b86e" }} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold">Details Stripe may ask you to confirm</h3>
                  <ul className="mt-2 grid gap-1 text-sm" style={{ color: SMOKE }}>
                    {requirements.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl p-5 sm:p-6" style={{ background: CARD, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 shrink-0" style={{ color: GOLD }} aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold">What Living Nexus does—and does not—hold</h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: SMOKE }}>
                Stripe hosts identity, tax, and bank-detail collection. Living Nexus uses Stripe’s live readiness result to decide whether support can be routed to you. Connecting Stripe does not change your ownership, WID, provenance, or the publication state of any Work.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-7 flex flex-wrap gap-3 text-sm">
          <Link href="/settings/payment-methods" className="rounded-lg px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ color: GOLD }}>
            Other payment methods →
          </Link>
          <Link href="/profile?tab=overview" className="rounded-lg px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ color: GOLD }}>
            View support activity →
          </Link>
        </div>
      </div>
    </main>
  );
}
