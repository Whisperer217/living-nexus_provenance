/**
 * Slot Store — one-time slot packages (no subscriptions)
 * Route: /settings/billing
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Package, Star, ChevronRight, Info, CheckCircle2 } from "lucide-react";

const GOLD = "var(--ln-parchment)";
const SURFACE = "var(--ln-coal)";
const BORDER = "var(--ln-coal)";
const SUBTEXT = "var(--ln-smoke)";

const MICRO_PACKAGES = [
  { id: "micro_10",  slots: 10,  priceCents: 880,   label: "Micro 10" },
  { id: "micro_30",  slots: 30,  priceCents: 2640,  label: "Micro 30" },
  { id: "micro_50",  slots: 50,  priceCents: 4400,  label: "Micro 50" },
] as const;

const BULK_PACKAGES = [
  { id: "bulk_100", slots: 100, priceCents: 8800,  label: "Standard",  badge: null },
  { id: "bulk_300", slots: 300, priceCents: 26400, label: "Value",     badge: "Popular" },
  { id: "bulk_500", slots: 500, priceCents: 44000, label: "Pro",       badge: "Best Value" },
] as const;

type PackageId = typeof MICRO_PACKAGES[number]["id"] | typeof BULK_PACKAGES[number]["id"];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function LivingArchiveBillingPage() {
  const { isAuthenticated } = useAuth();
  const [purchasing, setPurchasing] = useState<PackageId | null>(null);

  const { data: archiveStatus, isLoading } = trpc.livingArchive.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const purchaseMutation = trpc.livingArchive.purchaseSlotPackage.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to secure checkout…");
        window.open(data.url, "_blank");
      }
      setPurchasing(null);
    },
    onError: (err) => {
      toast.error(err.message || "Checkout failed. Please try again.");
      setPurchasing(null);
    },
  });

  const handlePurchase = (packageId: PackageId) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase slots.");
      return;
    }
    setPurchasing(packageId);
    purchaseMutation.mutate({ packageId, origin: window.location.origin });
  };

  const slotsUsed = (archiveStatus as any)?.songSlotsUsed ?? (archiveStatus as any)?.slotsUsed ?? 0;
  const slotsTotal = (archiveStatus as any)?.songSlotsTotal ?? (archiveStatus as any)?.slotsTotal ?? 1;
  const licenseStatus = (archiveStatus as any)?.licenseStatus ?? "";
  const isFounder = licenseStatus === "founder" || licenseStatus === "founder_free";
  const pct = isFounder ? 100 : Math.min(100, Math.round((slotsUsed / Math.max(slotsTotal, 1)) * 100));

  return (
    <TooltipProvider>
      <div className="min-h-screen py-12 px-4" style={{ background: "var(--ln-coal)" }}>
        <div className="max-w-3xl mx-auto space-y-10">

          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} style={{ color: GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                Slot Store
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Buy Upload Slots</h1>
            <p className="mt-2 text-sm" style={{ color: SUBTEXT }}>
              One-time payments. No subscriptions. No monthly fees. Your WIDs are permanent forever.
            </p>
          </div>

          {/* Current usage */}
          {isAuthenticated && !isLoading && (
            <div className="rounded-xl p-5 border" style={{ background: SURFACE, borderColor: BORDER }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Your Slots</span>
                {isFounder ? (
                  <Badge style={{ background: GOLD, color: "#000" }}>Founder — Unlimited</Badge>
                ) : (
                  <span className="text-sm" style={{ color: SUBTEXT }}>
                    {slotsUsed} / {slotsTotal} used
                  </span>
                )}
              </div>
              {!isFounder && (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 90 ? "var(--ln-ember)" : GOLD,
                    }}
                  />
                </div>
              )}
              {isFounder && (
                <p className="text-xs" style={{ color: SUBTEXT }}>
                  You have unlimited upload slots as a Founder. No purchases needed.
                </p>
              )}
            </div>
          )}

          {/* Micro packages */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package size={15} style={{ color: GOLD }} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Micro Packages</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={13} style={{ color: SUBTEXT }} className="cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">
                    Perfect for occasional uploads or testing the platform. Each slot = one Witness ID registration.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MICRO_PACKAGES.map((pkg) => (
                <Card key={pkg.id} className="border" style={{ background: SURFACE, borderColor: BORDER }}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-base text-white">{pkg.slots} Slots</CardTitle>
                    <p className="text-2xl font-bold" style={{ color: GOLD }}>{formatPrice(pkg.priceCents)}</p>
                    <p className="text-xs" style={{ color: SUBTEXT }}>one-time</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={purchasing === pkg.id || isFounder}
                      onClick={() => handlePurchase(pkg.id)}
                      style={{ background: GOLD, color: "#000", fontWeight: 700 }}
                    >
                      {purchasing === pkg.id ? "Opening…" : "Buy Now"}
                      <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Bulk packages */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star size={15} style={{ color: GOLD }} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Bulk Packages</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BULK_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="border relative"
                  style={{
                    background: pkg.badge === "Popular" ? "rgba(44,52,56,0.6)" : SURFACE,
                    borderColor: pkg.badge ? GOLD : BORDER,
                  }}
                >
                  {pkg.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge style={{ background: GOLD, color: "#000", fontSize: "10px" }}>{pkg.badge}</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2 pt-5 px-4">
                    <CardTitle className="text-base text-white">{pkg.slots} Slots</CardTitle>
                    <p className="text-2xl font-bold" style={{ color: GOLD }}>{formatPrice(pkg.priceCents)}</p>
                    <p className="text-xs" style={{ color: SUBTEXT }}>one-time · {pkg.label}</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={purchasing === pkg.id || isFounder}
                      onClick={() => handlePurchase(pkg.id)}
                      style={{ background: GOLD, color: "#000", fontWeight: 700 }}
                    >
                      {purchasing === pkg.id ? "Opening…" : "Buy Now"}
                      <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* What you get */}
          <div className="rounded-xl p-6 border space-y-3" style={{ background: SURFACE, borderColor: BORDER }}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Every slot includes</h3>
            {[
              "Cryptographic Witness ID (WID) — permanent provenance record",
              "Immutable timestamp on the Living Nexus ledger",
              "Commercial license coverage via BDDT Publishing",
              "Slots never expire — buy once, use whenever",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ln-seal-bright)" }} />
                <span className="text-sm" style={{ color: SUBTEXT }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Founder upsell */}
          {!isFounder && (
            <div
              className="rounded-xl p-6 border text-center"
              style={{ background: "rgba(44,52,56,0.3)", borderColor: GOLD }}
            >
              <Star size={20} style={{ color: GOLD }} className="mx-auto mb-2" />
              <h3 className="font-bold text-white mb-1">Want unlimited slots forever?</h3>
              <p className="text-sm mb-4" style={{ color: SUBTEXT }}>
                Become a Founder for one flat payment — no slot counting, no renewals, ever.
              </p>
              <a href="/founders">
                <Button style={{ background: GOLD, color: "#000", fontWeight: 700 }}>
                  View Founder Access →
                </Button>
              </a>
            </div>
          )}

          {/* Fine print */}
          <p className="text-xs text-center" style={{ color: SUBTEXT }}>
            All purchases are one-time payments. Slots never expire. Your Witness IDs are permanent regardless of slot balance.
            Payments processed by Stripe. Test card: 4242 4242 4242 4242.
          </p>

        </div>
      </div>
    </TooltipProvider>
  );
}
