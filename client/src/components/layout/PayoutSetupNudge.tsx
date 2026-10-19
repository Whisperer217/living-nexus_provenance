/* ===================================================================
   PayoutSetupNudge — site-wide, creator-only reminder to attach Stripe.
   - Reads the cached stripeAccountStatus from auth.me (no Stripe API call).
   - Shows only to signed-in creators who have registered works and have not
     finished Stripe Connect (not connected / pending / restricted).
   - One-tap CTA opens Stripe Connect onboarding in the same window.
   - Dismissible for 3 days so it stays noticeable without nagging.
=================================================================== */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DollarSign, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const DISMISS_KEY = "ln:payout-nudge-dismissed-at";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
// Routes that already own a payout CTA, or where a banner would interrupt checkout/admin work.
const HIDDEN_ROUTES = ["/dashboard", "/admin", "/checkout", "/stripe-connect", "/payouts", "/creator-payouts"];

type NudgeUser = { stripeAccountId?: string | null; stripeAccountStatus?: string | null } | null | undefined;

export function getPayoutNudgeState(user: NudgeUser): "none" | "not_connected" | "incomplete" {
  if (!user) return "none";
  if (!user.stripeAccountId) return "not_connected";
  if (user.stripeAccountStatus === "pending" || user.stripeAccountStatus === "restricted") return "incomplete";
  return "none";
}

export default function PayoutSetupNudge({ user, worksCount }: { user: NudgeUser; worksCount: number }) {
  const [location] = useLocation();
  const [dismissed, setDismissed] = useState(true); // default hidden until storage is read (avoids flash)

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      setDismissed(!!at && Date.now() - at < DISMISS_MS);
    } catch {
      setDismissed(false);
    }
  }, []);

  const connect = trpc.tips.connectOnboarding.useMutation({
    onSuccess: (d) => { if (d.url) window.location.href = d.url; },
    onError: (e) => toast.error(e.message),
  });

  const state = getPayoutNudgeState(user);
  const hiddenHere = HIDDEN_ROUTES.some((r) => location === r || location.startsWith(r + "/"));
  if (state === "none" || worksCount < 1 || dismissed || hiddenHere) return null;

  const incomplete = state === "incomplete";
  const headline = incomplete ? "Finish payout setup to receive tips" : "Turn on tips — connect Stripe to get paid";
  const detail = incomplete
    ? "Stripe still needs a few details. Fans can't tip your work until this is done."
    : "Fans can't tip your work yet. You keep 90%. Setup takes about 5 minutes.";
  const cta = incomplete ? "Finish setup" : "Connect Stripe";

  return (
    <div
      role="region"
      aria-label="Payout setup"
      data-testid="payout-setup-nudge"
      className="sticky top-0 flex items-center gap-3 px-3 sm:px-4 py-2.5"
      style={{
        zIndex: 30,
        background: "linear-gradient(90deg, rgba(196,154,40,0.96), rgba(212,175,55,0.96))",
        borderBottom: "1px solid rgba(0,0,0,0.35)",
      }}
    >
      <DollarSign className="w-5 h-5 flex-shrink-0" style={{ color: "#000" }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight truncate sm:whitespace-normal" style={{ color: "#000", fontFamily: "'Cinzel', serif" }}>
          {headline}
        </p>
        <p className="hidden sm:block text-xs leading-snug" style={{ color: "rgba(0,0,0,0.75)" }}>{detail}</p>
      </div>
      <button
        type="button"
        onClick={() => connect.mutate({ returnUrl: `${window.location.origin}/dashboard` })}
        disabled={connect.isPending}
        className="flex-shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold disabled:opacity-60"
        style={{ background: "#000", color: "var(--ln-gold, #C49A28)", minHeight: 40 }}
      >
        {connect.isPending ? "Opening Stripe…" : cta}
      </button>
      <button
        type="button"
        aria-label="Remind me later"
        title="Remind me in 3 days"
        onClick={() => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ } setDismissed(true); }}
        className="flex-shrink-0 flex items-center justify-center rounded-lg"
        style={{ minWidth: 40, minHeight: 40, color: "rgba(0,0,0,0.7)" }}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
