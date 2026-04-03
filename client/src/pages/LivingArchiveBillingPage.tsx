import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Archive, Zap, Crown, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, ArrowLeft, Layers, Calendar, Infinity
} from "lucide-react";
import { Link } from "wouter";

const QUARTERLY_PRICE = "$12.99";
const ANNUAL_PRICE = "$44.99";
const SLOTS_PER_PERIOD = 100;

export default function LivingArchiveBillingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const { data: archiveStatus, isLoading, refetch } = trpc.livingArchive.status.useQuery(undefined, {
    enabled: !!user,
  });

  const checkoutMutation = trpc.livingArchive.checkout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to checkout...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.livingArchive.cancel.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setCancelConfirm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCheckout = (plan: "quarterly" | "annual") => {
    checkoutMutation.mutate({ plan, origin: window.location.origin });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Please log in to manage your Living Archive.</p>
      </div>
    );
  }

  const slotsUsed = archiveStatus?.slotsUsed ?? 0;
  const slotsTotal = archiveStatus?.slotsTotal ?? 0;
  const slotPct = slotsTotal > 0 ? Math.round((slotsUsed / slotsTotal) * 100) : 0;
  const isNearLimit = slotPct >= 90;
  const isAtLimit = slotsUsed >= slotsTotal;
  const hasActiveSub = archiveStatus?.isActive ?? false;
  const plan = archiveStatus?.plan;
  const expiresAt = archiveStatus?.expiresAt ? new Date(archiveStatus.expiresAt) : null;
  const isFounderFree = archiveStatus?.isFounderFree ?? false;

  return (
    <div className="min-h-screen bg-[oklch(0.08_0.01_260)] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/archive">
          <button className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <Archive className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold tracking-wide">Living Archive</h1>
            <p className="text-xs text-white/50">Sustain the hosting of your immutable WID records</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Slot Counter */}
        <Card className="bg-[oklch(0.12_0.015_260)] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white/80 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Archive Slot Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-bold text-white">{slotsUsed}</span>
                    <span className="text-white/40 text-lg"> / {slotsTotal}</span>
                    <span className="text-white/50 text-sm ml-2">slots used</span>
                  </div>
                  <div className="text-right">
                    {isAtLimit ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                        <XCircle className="w-3 h-3" /> Archive Full
                      </Badge>
                    ) : isNearLimit ? (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                        <AlertTriangle className="w-3 h-3" /> {100 - slotPct}% remaining
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {slotsTotal - slotsUsed} slots free
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress
                  value={slotPct}
                  className="h-2 bg-white/10"
                  style={{
                    // Color the bar based on usage
                  }}
                />
                {isAtLimit && (
                  <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
                    Your archive is full. Subscribe to Living Archive to add 100 more slots per period. Your existing WIDs are permanent and unaffected.
                  </p>
                )}
                {isNearLimit && !isAtLimit && (
                  <p className="text-sm text-amber-400 bg-amber-500/10 rounded-lg px-4 py-3 border border-amber-500/20">
                    You're approaching your slot limit. Consider subscribing to Living Archive before you run out.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Current Subscription Status */}
        {hasActiveSub && (
          <Card className="bg-[oklch(0.12_0.015_260)] border-amber-500/30">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isFounderFree ? (
                    <Crown className="w-5 h-5 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <div>
                    <p className="font-semibold text-white">
                      {isFounderFree
                        ? "Founder Free Tier — Active"
                        : plan === "quarterly"
                        ? "Living Archive Quarterly — Active"
                        : "Living Archive Annual — Active"}
                    </p>
                    {expiresAt && !isFounderFree && (
                      <p className="text-xs text-white/50">
                        Renews {expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {isFounderFree && (
                      <p className="text-xs text-amber-400/70">Granted by the platform — no expiry</p>
                    )}
                  </div>
                </div>
                {!isFounderFree && archiveStatus?.stripeSubscriptionId && (
                  <div>
                    {cancelConfirm ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">Cancel at period end?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelMutation.mutate()}
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Confirm"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCancelConfirm(false)}>
                          Keep
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/40 hover:text-white/70 text-xs"
                        onClick={() => setCancelConfirm(true)}
                      >
                        Cancel subscription
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Cards */}
        {!hasActiveSub && (
          <>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Expand Your Archive</h2>
              <p className="text-white/50 max-w-lg mx-auto text-sm">
                Each period adds <strong className="text-amber-400">100 permanent slots</strong> to your archive.
                Slots accumulate — they never expire, even if you cancel.
                Your WIDs are immutable. Your hosting is sustained.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quarterly */}
              <Card className="bg-[oklch(0.12_0.015_260)] border-white/10 hover:border-amber-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-400" />
                      Quarterly
                    </CardTitle>
                    <Badge className="bg-white/10 text-white/60 border-white/10 text-xs">3 months</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <span className="text-4xl font-bold text-white">{QUARTERLY_PRICE}</span>
                    <span className="text-white/40 text-sm ml-1">/ quarter</span>
                  </div>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      +{SLOTS_PER_PERIOD} permanent archive slots
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      Slots accumulate each period
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      WIDs remain permanent if you cancel
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      Audio replacement generates new WID
                    </li>
                  </ul>
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                    onClick={() => handleCheckout("quarterly")}
                    disabled={checkoutMutation.isPending}
                  >
                    {checkoutMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Subscribe Quarterly
                  </Button>
                </CardContent>
              </Card>

              {/* Annual */}
              <Card className="bg-[oklch(0.12_0.015_260)] border-amber-500/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                  BEST VALUE
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Infinity className="w-5 h-5 text-amber-400" />
                      Annual
                    </CardTitle>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">12 months</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <span className="text-4xl font-bold text-white">{ANNUAL_PRICE}</span>
                    <span className="text-white/40 text-sm ml-1">/ year</span>
                    <span className="text-xs text-emerald-400 ml-2">~$3.75/mo</span>
                  </div>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      +{SLOTS_PER_PERIOD} permanent archive slots
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      Slots accumulate each year
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      WIDs remain permanent if you cancel
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      Save 71% vs quarterly billing
                    </li>
                  </ul>
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                    onClick={() => handleCheckout("annual")}
                    disabled={checkoutMutation.isPending}
                  >
                    {checkoutMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Crown className="w-4 h-4 mr-2" />
                    )}
                    Subscribe Annually
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Upgrade prompt when active but near limit */}
        {hasActiveSub && isNearLimit && (
          <Card className="bg-[oklch(0.12_0.015_260)] border-amber-500/30">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white text-sm">Running low on slots</p>
                    <p className="text-xs text-white/50">
                      Add another period now to ensure uninterrupted archiving.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold flex-shrink-0"
                  onClick={() => handleCheckout(plan === "annual" ? "annual" : "quarterly")}
                  disabled={checkoutMutation.isPending}
                >
                  Add Slots
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How slots work */}
        <div className="border border-white/10 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-white/80 text-sm uppercase tracking-wider">How Living Archive Slots Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/60">
            <div className="space-y-1">
              <p className="text-white/80 font-medium">Each upload = 1 slot</p>
              <p>Every file you witness into the archive consumes one slot and generates a permanent WID.</p>
            </div>
            <div className="space-y-1">
              <p className="text-white/80 font-medium">Audio swaps = new WID</p>
              <p>Replacing an audio file generates a new WID and consumes a slot. The original WID stays in the archive, immutable.</p>
            </div>
            <div className="space-y-1">
              <p className="text-white/80 font-medium">Slots are permanent</p>
              <p>Slots you've earned accumulate forever. Cancelling your subscription doesn't remove slots you've already received.</p>
            </div>
          </div>
        </div>

        {/* Test card note */}
        <p className="text-center text-xs text-white/30">
          Test payments: use card <code className="bg-white/5 px-1 rounded">4242 4242 4242 4242</code> with any future expiry and any CVC.
        </p>
      </div>
    </div>
  );
}
