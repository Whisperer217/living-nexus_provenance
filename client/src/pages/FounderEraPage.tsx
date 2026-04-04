import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Shield, Star, Lock, ChevronLeft, Sparkles, Crown, Users } from "lucide-react";

// Genesis Day: March 20, 2026 — 90-day Founder's Era
const GENESIS_DATE = new Date("2026-03-20T00:00:00Z");
const ERA_DAYS = 90;

export function foundersEraDaysRemaining(): number {
  const now = new Date();
  const end = new Date(GENESIS_DATE.getTime() + ERA_DAYS * 24 * 60 * 60 * 1000);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

const TIERS = [
  {
    icon: "✦",
    label: "Supporter",
    threshold: "$1+",
    desc: "Your name on the Supporters Wall. Forever.",
    color: "text-[#c9a84c]",
  },
  {
    icon: "⟡",
    label: "Patron",
    threshold: "$25+",
    desc: "Gold border on your profile and tracks. Patron badge.",
    color: "text-[#c9a84c]",
  },
  {
    icon: "🔐",
    label: "Covenant Partner",
    threshold: "$100+",
    desc: "Permanent foundation recognition. Your name in the story of Living Nexus.",
    color: "text-white",
  },
];

const AMOUNTS = [1, 5, 10, 25, 100];

export default function FounderEraPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const daysLeft = foundersEraDaysRemaining();

  // Check for ?gift=success in URL
  const params = new URLSearchParams(window.location.search);
  const giftSuccess = params.get("gift") === "success";

  const { data: supporters, isLoading: supportersLoading } = trpc.supporters.getAll.useQuery();
  const { data: myStatus } = trpc.supporters.getMyStatus.useQuery(undefined, { enabled: !!user });

  const giftMutation = trpc.supporters.createPlatformGiftCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.info("Redirecting to secure checkout...");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Checkout failed. Please try again.");
    },
  });

  const handleGift = (amount: number) => {
    if (!user) {
      window.location.href = getLoginUrl("/founder-era");
      return;
    }
    giftMutation.mutate({ amountUsd: amount, origin: window.location.origin });
  };

  const handleCustomGift = () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount < 1) {
      toast.error("Minimum gift is $1");
      return;
    }
    handleGift(amount);
  };

  return (
    <div className="min-h-screen bg-[#080d14] text-white">
      {/* Back nav */}
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Living Nexus
          </button>
          <Link href="/founders">
            <button className="flex items-center gap-1.5 text-gray-500 hover:text-[#c9a84c] text-sm transition-colors">
              <Users size={14} />
              View Founding Creators
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-16">
        {/* Success state */}
        {giftSuccess && (
          <div className="mb-8 bg-[#c9a84c]/10 border border-[#c9a84c]/40 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">✦</div>
            <h2 className="text-[#c9a84c] font-bold text-xl mb-2">Welcome to the founding generation.</h2>
            <p className="text-gray-400 text-sm">
              Your gift has been received. Your name now lives in the story of Living Nexus.
              {myStatus && (
                <span className="block mt-1 text-[#c9a84c]">
                  You are a {myStatus.tier === "covenant" ? "Covenant Partner" : myStatus.tier === "patron" ? "Patron" : "Supporter"}.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown size={16} style={{ color: "#c9a84c" }} />
            <p className="text-[#c9a84c] text-xs uppercase tracking-widest">Living Nexus</p>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Founder's Era</h1>
          <p className="text-gray-400 text-sm max-w-xs mx-auto mb-4">
            Genesis Day — March 20, 2026
          </p>

          {daysLeft > 0 ? (
            <div className="inline-flex items-center gap-2 bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-full px-4 py-2">
              <span className="text-[#c9a84c] font-bold text-sm">{daysLeft}</span>
              <span className="text-gray-400 text-xs">days remaining</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
              <span className="text-gray-400 text-sm">Founder's Era — Sealed</span>
            </div>
          )}
        </div>

        {/* My status card */}
        {myStatus && (
          <div className="mb-8 bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-2xl p-5 flex items-center gap-4">
            <div className="text-2xl">
              {myStatus.tier === "covenant" ? "🔐" : myStatus.tier === "patron" ? "⟡" : "✦"}
            </div>
            <div>
              <p className="text-[#c9a84c] font-bold text-sm">
                {myStatus.tier === "covenant" ? "Covenant Partner" : myStatus.tier === "patron" ? "Patron" : "Supporter"}
              </p>
              <p className="text-gray-400 text-xs">
                Total gifted: ${myStatus.totalGifted.toFixed(2)} · Since{" "}
                {new Date(myStatus.firstGiftAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        )}

        {/* What you get */}
        <div className="bg-white/5 rounded-2xl p-6 mb-8">
          <p className="text-white font-bold text-sm mb-4">What founding supporters receive:</p>
          <div className="space-y-4">
            {TIERS.map((tier) => (
              <div key={tier.label} className="flex items-start gap-3">
                <span className="text-[#c9a84c] text-lg leading-none mt-0.5">{tier.icon}</span>
                <div>
                  <p className="text-white text-sm font-medium">
                    {tier.label} <span className="text-gray-500 font-normal">— {tier.threshold}</span>
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{tier.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gift amounts */}
        <div className="mb-8">
          <p className="text-gray-400 text-sm text-center mb-4">Choose your contribution:</p>
          <div className="flex gap-2 justify-center flex-wrap mb-4">
            {AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleGift(amount)}
                disabled={giftMutation.isPending}
                className="bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[#c9a84c] font-bold px-5 py-3 rounded-xl text-sm hover:bg-[#c9a84c]/20 transition-colors disabled:opacity-50"
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex gap-2 max-w-xs mx-auto">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="1"
                placeholder="Custom"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]/50"
              />
            </div>
            <button
              onClick={handleCustomGift}
              disabled={giftMutation.isPending || !customAmount}
              className="bg-[#c9a84c] text-black font-bold px-4 py-3 rounded-xl text-sm hover:bg-[#c9a84c]/90 transition-colors disabled:opacity-50"
            >
              {giftMutation.isPending ? "..." : "Give"}
            </button>
          </div>

          <p className="text-gray-600 text-xs text-center mt-4">
            In honor of PFC Miller. Living Nexus is on fire for Jesus. 🔐
          </p>
        </div>

        {/* Supporters Wall */}
        <div id="supporters">
          <h3 className="text-[#c9a84c] uppercase tracking-wider text-sm font-bold text-center mb-6">
            Those Who Kept The Light On
          </h3>

          {supportersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !supporters || supporters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm mb-2">Be the first to keep the light on.</p>
              <p className="text-gray-600 text-xs">🔐</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supporters.map((s: typeof supporters[0]) => (
                <Link
                  key={s.id}
                  to={`/creator/${s.userId}`}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition-colors"
                >
                  {s.avatarUrl ? (
                    <img
                      src={s.avatarUrl}
                      alt={s.name || "Supporter"}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#c9a84c]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#c9a84c] text-xs">✦</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {s.name || s.artistHandle || "Anonymous Supporter"}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Since{" "}
                      {new Date(s.firstGiftAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[#c9a84c] text-sm">
                      {s.tier === "covenant" ? "🔐" : s.tier === "patron" ? "⟡" : "✦"}
                    </span>
                    <span className="text-gray-500 text-xs">${s.totalGifted.toFixed(0)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer doctrine */}
        <div className="mt-12 text-center border-t border-white/5 pt-8">
          <p className="text-gray-600 text-xs leading-relaxed max-w-xs mx-auto">
            Living Nexus is built to protect human creative origin. Sovereign. Witnessed. Permanent.
            Every gift keeps the sanctuary running.
          </p>
        </div>
      </div>
    </div>
  );
}
