/**
 * Slot Store — one-time slot packages (no subscriptions)
 * Route: /settings/billing
 * Restyled Phase 196: Full platform gold/black design system
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Package, Star, ChevronRight, Info, CheckCircle2, Shield } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD       = "#C49A28";
const GOLD_HOT   = "#E8B840";
const GOLD_DIM   = "#8B6914";
const PARCHMENT  = "#E8DFC8";
const SMOKE      = "#6B6555";
const IRON       = "#1C1A14";
const COAL       = "#000000";
const GOLD_BORDER = `1px solid rgba(196,154,40,0.28)`;
const GOLD_GLOW   = "0 0 24px rgba(196,154,40,0.18)";

const MICRO_PACKAGES = [
  { id: "micro_10",  slots: 10,  priceCents: 880,   perSlot: 88  },
  { id: "micro_30",  slots: 30,  priceCents: 2640,  perSlot: 88  },
  { id: "micro_50",  slots: 50,  priceCents: 4400,  perSlot: 88  },
] as const;

const BULK_PACKAGES = [
  { id: "bulk_100", slots: 100, priceCents: 8800,  badge: null,         label: "Standard" },
  { id: "bulk_300", slots: 300, priceCents: 26400, badge: "Popular",    label: "Value"    },
  { id: "bulk_500", slots: 500, priceCents: 44000, badge: "Best Value", label: "Pro"      },
] as const;

type PackageId = typeof MICRO_PACKAGES[number]["id"] | typeof BULK_PACKAGES[number]["id"];

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Micro card ─────────────────────────────────────────────────────────────────
function MicroCard({
  pkg, purchasing, isFounder, onBuy,
}: {
  pkg: typeof MICRO_PACKAGES[number];
  purchasing: PackageId | null;
  isFounder: boolean;
  onBuy: (id: PackageId) => void;
}) {
  const busy = purchasing === pkg.id;
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
      style={{
        background: IRON,
        border: GOLD_BORDER,
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
      }}
    >
      <div>
        <p
          className="text-2xl font-bold leading-none mb-0.5"
          style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT, letterSpacing: "0.04em" }}
        >
          {pkg.slots} <span className="text-base font-medium" style={{ color: GOLD_DIM }}>Slots</span>
        </p>
        <p className="text-3xl font-bold mt-2" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>
          {fmt(pkg.priceCents)}
        </p>
        <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: SMOKE }}>
          one-time · {fmt(pkg.perSlot)}/slot
        </p>
      </div>
      <button
        disabled={busy || isFounder}
        onClick={() => onBuy(pkg.id)}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
        style={{
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_HOT} 100%)`,
          color: COAL,
          boxShadow: GOLD_GLOW,
          fontFamily: "'Cinzel', serif",
        }}
      >
        {busy ? "Opening…" : "Buy Now"} <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ── Bulk card ──────────────────────────────────────────────────────────────────
function BulkCard({
  pkg, purchasing, isFounder, onBuy,
}: {
  pkg: typeof BULK_PACKAGES[number];
  purchasing: PackageId | null;
  isFounder: boolean;
  onBuy: (id: PackageId) => void;
}) {
  const busy = purchasing === pkg.id;
  const featured = !!pkg.badge;
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 relative transition-all"
      style={{
        background: featured ? "rgba(28,26,20,0.9)" : IRON,
        border: featured ? `1px solid rgba(196,154,40,0.55)` : GOLD_BORDER,
        boxShadow: featured ? `0 0 32px rgba(196,154,40,0.12), 0 2px 16px rgba(0,0,0,0.6)` : "0 2px 12px rgba(0,0,0,0.5)",
      }}
    >
      {pkg.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: GOLD, color: COAL, fontFamily: "'Cinzel', serif", boxShadow: GOLD_GLOW }}
          >
            {pkg.badge}
          </span>
        </div>
      )}
      <div className={featured ? "mt-2" : ""}>
        <p
          className="text-2xl font-bold leading-none mb-0.5"
          style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT, letterSpacing: "0.04em" }}
        >
          {pkg.slots} <span className="text-base font-medium" style={{ color: GOLD_DIM }}>Slots</span>
        </p>
        <p className="text-3xl font-bold mt-2" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>
          {fmt(pkg.priceCents)}
        </p>
        <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: SMOKE }}>
          one-time · {pkg.label}
        </p>
      </div>
      <button
        disabled={busy || isFounder}
        onClick={() => onBuy(pkg.id)}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
        style={{
          background: featured
            ? `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_HOT} 100%)`
            : `rgba(196,154,40,0.10)`,
          color: featured ? COAL : GOLD,
          border: featured ? "none" : `1px solid rgba(196,154,40,0.35)`,
          boxShadow: featured ? GOLD_GLOW : "none",
          fontFamily: "'Cinzel', serif",
        }}
      >
        {busy ? "Opening…" : "Buy Now"} <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
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

  const slotsUsed  = (archiveStatus as any)?.songSlotsUsed  ?? (archiveStatus as any)?.slotsUsed  ?? 0;
  const slotsTotal = (archiveStatus as any)?.songSlotsTotal ?? (archiveStatus as any)?.slotsTotal ?? 1;
  const licenseStatus = (archiveStatus as any)?.licenseStatus ?? "";
  const isFounder = licenseStatus === "founder" || licenseStatus === "founder_free";
  const pct = isFounder ? 100 : Math.min(100, Math.round((slotsUsed / Math.max(slotsTotal, 1)) * 100));

  return (
    <TooltipProvider>
      <div className="min-h-screen py-12 px-4" style={{ background: COAL }}>
        <div className="max-w-3xl mx-auto space-y-12">

          {/* ── Page header ── */}
          <div>
            {/* Overline */}
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} style={{ color: GOLD }} />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM }}
              >
                Slot Store
              </span>
            </div>
            {/* Title */}
            <h1
              className="text-4xl font-bold leading-tight mb-3"
              style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT, letterSpacing: "0.06em" }}
            >
              Buy Upload Slots
            </h1>
            {/* Subtitle */}
            <p
              className="text-base leading-relaxed max-w-xl"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: SMOKE, fontSize: "17px" }}
            >
              One-time payments. No subscriptions. No monthly fees.
              Your WIDs are permanent forever.
            </p>
            {/* Gold rule */}
            <div className="mt-5 h-px w-16" style={{ background: `linear-gradient(90deg, ${GOLD} 0%, transparent 100%)` }} />
          </div>

          {/* ── Current usage ── */}
          {isAuthenticated && !isLoading && (
            <div
              className="rounded-2xl p-6"
              style={{ background: IRON, border: GOLD_BORDER, boxShadow: "0 2px 16px rgba(0,0,0,0.5)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[13px] font-bold uppercase tracking-widest"
                  style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT }}
                >
                  Your Slots
                </span>
                {isFounder ? (
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: GOLD, color: COAL, fontFamily: "'Cinzel', serif" }}
                  >
                    Founder — Unlimited
                  </span>
                ) : (
                  <span className="text-sm tabular-nums" style={{ color: SMOKE }}>
                    {slotsUsed} / {slotsTotal} used
                  </span>
                )}
              </div>
              {!isFounder && (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(196,154,40,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 90
                        ? "linear-gradient(90deg, #C84B31 0%, #E85D3A 100%)"
                        : `linear-gradient(90deg, ${GOLD} 0%, ${GOLD_HOT} 100%)`,
                      boxShadow: `0 0 8px rgba(196,154,40,0.4)`,
                    }}
                  />
                </div>
              )}
              {isFounder && (
                <p className="text-sm mt-2" style={{ fontFamily: "'Cormorant Garamond', serif", color: SMOKE, fontSize: "15px" }}>
                  You have unlimited upload slots as a Founder. No purchases needed.
                </p>
              )}
            </div>
          )}

          {/* ── Micro packages ── */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Package size={14} style={{ color: GOLD }} />
              <h2
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM }}
              >
                Micro Packages
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={12} style={{ color: SMOKE }} className="cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">
                    Perfect for occasional uploads. Each slot = one Witness ID registration.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {MICRO_PACKAGES.map((pkg) => (
                <MicroCard
                  key={pkg.id}
                  pkg={pkg}
                  purchasing={purchasing}
                  isFounder={isFounder}
                  onBuy={handlePurchase}
                />
              ))}
            </div>
          </section>

          {/* ── Bulk packages ── */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Star size={14} style={{ color: GOLD }} />
              <h2
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM }}
              >
                Bulk Packages
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {BULK_PACKAGES.map((pkg) => (
                <BulkCard
                  key={pkg.id}
                  pkg={pkg}
                  purchasing={purchasing}
                  isFounder={isFounder}
                  onBuy={handlePurchase}
                />
              ))}
            </div>
          </section>

          {/* ── What you get ── */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ background: IRON, border: GOLD_BORDER }}
          >
            <h3
              className="text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM }}
            >
              Every Slot Includes
            </h3>
            {[
              "Cryptographic Witness ID (WID) — permanent provenance record",
              "Immutable timestamp on the Living Nexus ledger",
              "Commercial license coverage via BDDT Publishing",
              "Slots never expire — buy once, use whenever",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#4ade80" }} />
                <span
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: SMOKE, fontSize: "15px" }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* ── Founder upsell ── */}
          {!isFounder && (
            <div
              className="rounded-2xl p-7 text-center"
              style={{
                background: "rgba(28,26,20,0.6)",
                border: `1px solid rgba(196,154,40,0.45)`,
                boxShadow: `0 0 40px rgba(196,154,40,0.08)`,
              }}
            >
              <Shield size={22} style={{ color: GOLD }} className="mx-auto mb-3" />
              <h3
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT, letterSpacing: "0.05em" }}
              >
                Want Unlimited Slots Forever?
              </h3>
              <p
                className="text-base mb-6 max-w-sm mx-auto"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: SMOKE, fontSize: "16px", lineHeight: 1.6 }}
              >
                Become a Founder for one flat payment — no slot counting, no renewals, ever.
              </p>
              <a href="/founders">
                <button
                  className="px-7 py-3 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_HOT} 100%)`,
                    color: COAL,
                    fontFamily: "'Cinzel', serif",
                    boxShadow: GOLD_GLOW,
                  }}
                >
                  View Founder Access →
                </button>
              </a>
            </div>
          )}

          {/* ── Fine print ── */}
          <p
            className="text-xs text-center"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: SMOKE, fontSize: "13px" }}
          >
            All purchases are one-time payments. Slots never expire. Your Witness IDs are permanent
            regardless of slot balance. Payments processed by Stripe.
          </p>

        </div>
      </div>
    </TooltipProvider>
  );
}
