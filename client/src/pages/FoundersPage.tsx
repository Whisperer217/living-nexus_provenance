import { Link } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { ChevronLeft, Crown, Shield, Star, Heart, ExternalLink, Zap } from "lucide-react";
import { foundersEraDaysRemaining } from "./FounderEraPage";

const GOLD = "#c9a84c";
const SUBTEXT = "#6b7280";

export default function FoundersPage() {
  const daysLeft = foundersEraDaysRemaining();
  const { user } = useAuth();
  const { data: founders, isLoading } = trpc.supporters.getFoundingCreators.useQuery();
  // Fetch live founder count + pricing via a lightweight query
  const { data: archivePackages } = trpc.livingArchive.listPackages.useQuery();
  const founderPackage = archivePackages?.find((p: any) => p.id === "founder_unlimited");
  const currentPrice = founderPackage?.priceCents ? `$${(founderPackage.priceCents / 100).toFixed(2)}` : "$88.88";

  const founderMutation = trpc.livingArchive.purchaseFounder.useMutation({
    onSuccess: (data: { url: string | null }) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.info("Redirecting to secure checkout...");
      }
    },
    onError: (e: { message: string }) => toast.error(e.message || "Checkout failed."),
  });

  const handleFounderPurchase = () => {
    if (!user) {
      window.location.href = getLoginUrl("/founders");
      return;
    }
    founderMutation.mutate({ origin: window.location.origin });
  };

  return (
    <div className="min-h-screen bg-[#080d14] text-white">
      {/* Back nav */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Link href="/">
          <button type="button" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors mb-8">
            <ChevronLeft size={16} />
            Back to Living Nexus
          </button>
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Crown size={16} style={{ color: GOLD }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              Founding Creators
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">The First Witnesses</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
            These creators registered their work on Living Nexus during the Founder's Era — Genesis Day,
            March 20, 2026. Their Witness IDs carry the earliest timestamps in the registry. The record
            of their authorship cannot be altered, disputed, or erased.
          </p>

          {daysLeft > 0 ? (
            <div className="inline-flex items-center gap-2 mt-4 bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-full px-4 py-2">
              <Star size={12} style={{ color: GOLD }} />
              <span className="text-[#c9a84c] font-bold text-sm">{daysLeft}</span>
              <span className="text-gray-400 text-xs">days remaining in Founder's Era</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 mt-4 bg-white/5 rounded-full px-4 py-2">
              <Shield size={12} className="text-gray-500" />
              <span className="text-gray-400 text-sm">Founder's Era — Sealed</span>
            </div>
          )}
        </div>

        {/* Attribution note */}
        <div
          className="rounded-xl p-4 mb-8 text-sm leading-relaxed"
          style={{
            background: "rgba(201,168,76,0.06)",
            border: "1px solid rgba(201,168,76,0.18)",
            color: "#9ca3af",
          }}
        >
          <span style={{ color: GOLD }} className="font-semibold">What Founding Creator status means: </span>
          Founding Creators are users who registered original works during the 90-day Founder's Era window.
          Their Witness IDs (WIDs) are the earliest entries in the Living Nexus provenance registry —
          establishing the first anchors of a cryptographically-verified creative record. This status is
          permanent and cannot be revoked or transferred.
        </div>

        {/* Founders list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !founders || founders.length === 0 ? (
          <div className="text-center py-16">
            <Crown size={32} className="mx-auto mb-4 opacity-20" style={{ color: GOLD }} />
            <p className="text-gray-500 text-sm mb-2">No Founding Creators registered yet.</p>
            <p className="text-gray-600 text-xs">Be the first to claim your place in the registry.</p>
            <Link href="/upload">
              <button
                className="mt-6 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
                style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)", color: GOLD }}
              >
                Register Your Work
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(founders as Array<{ id: number; name: string | null; artistHandle: string | null; profilePhotoUrl: string | null; createdAt: Date | null; widCount: number }>).map((f, idx) => (
              <Link
                key={f.id}
                href={`/creator/${f.id}`}
                className="block"
              >
                <div
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:brightness-110 cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {/* Rank */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      background: idx < 3 ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.06)",
                      color: idx < 3 ? GOLD : SUBTEXT,
                      border: idx < 3 ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Avatar */}
                  {f.profilePhotoUrl ? (
                    <img
                      src={f.profilePhotoUrl}
                      alt={f.artistHandle || f.name || "Founder"}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                      style={{ border: "2px solid rgba(201,168,76,0.35)" }}
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: "rgba(201,168,76,0.12)", color: GOLD, border: "2px solid rgba(201,168,76,0.25)" }}
                    >
                      {(f.artistHandle || f.name || "?")[0].toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white font-semibold text-sm truncate">
                        {f.artistHandle || f.name || "Anonymous Creator"}
                      </p>
                      <Crown size={11} style={{ color: GOLD }} className="flex-shrink-0" />
                    </div>
                    <p className="text-gray-500 text-xs">
                      Joined{" "}
                      {f.createdAt
                        ? new Date(f.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                        : "Founder's Era"}
                    </p>
                  </div>

                  {/* WID count + link */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {f.widCount > 0 && (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: "rgba(201,168,76,0.1)", color: GOLD, border: "1px solid rgba(201,168,76,0.25)" }}
                      >
                        <Shield size={10} />
                        {f.widCount} WID{f.widCount !== 1 ? "s" : ""}
                      </div>
                    )}
                    <ExternalLink size={14} className="text-gray-600" />
                  </div>
                </div>
              </Link>
             ))}
          </div>
        )}

        {/* Founder Unlimited Purchase CTA */}
        <div
          className="mt-12 rounded-2xl p-6 text-center"
          style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.35)" }}
        >
          <Crown size={24} className="mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-white font-bold text-base mb-1">Become a Founding Creator</p>
          <p className="text-gray-400 text-xs mb-2 max-w-xs mx-auto">
            One-time payment. Unlimited upload slots. Permanent Founder status. No renewals, ever.
          </p>
          <div className="mb-4">
            <span className="text-3xl font-bold" style={{ color: GOLD }}>{currentPrice}</span>
            <span className="text-gray-500 text-xs ml-2">one-time · unlimited forever</span>
          </div>
          <p className="text-gray-600 text-xs mb-4">
            Price increases to $288.88 after the first 10 Founders.
          </p>
          <button
            onClick={handleFounderPurchase}
            disabled={founderMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", color: "#080d14" }}
          >
            <Zap size={14} />
            {founderMutation.isPending ? "Opening checkout..." : `Claim Founder Access — ${currentPrice}`}
          </button>
          <div className="mt-4 pt-4 border-t border-white/5">
            <Link href="/founder-era">
              <button type="button" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs transition-colors">
                <Heart size={11} />
                Support the Founder's Era instead
              </button>
            </Link>
          </div>
        </div>

        {/* Footer doctrine */}
        <div className="mt-10 text-center border-t border-white/5 pt-8">
          <p className="text-gray-600 text-xs leading-relaxed max-w-xs mx-auto">
            Living Nexus is built to protect human creative origin. Sovereign. Witnessed. Permanent.
          </p>
        </div>
      </div>
    </div>
  );
}
