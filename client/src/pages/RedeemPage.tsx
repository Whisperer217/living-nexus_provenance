/**
 * /redeem — Promo Code Redemption
 * Users enter a promo code to activate a free Creator License.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Tag, CheckCircle2, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const GOLD = "var(--ln-gold)";
const BG = "var(--ln-parchment)";
const CARD = "var(--ln-coal)";
const BORDER = "var(--ln-coal)";
const TEXT = "#E2E8F0";
const SUBTEXT = "#94A3B8";

export default function RedeemPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [redeemed, setRedeemed] = useState(false);
  const [slotsGranted, setSlotsGranted] = useState(0);
  const [totalSlots, setTotalSlots] = useState(0);
  const [wasAlreadyLicensed, setWasAlreadyLicensed] = useState(false);

  const redeemMutation = trpc.promo.redeem.useMutation({
    onSuccess: (data) => {
      setRedeemed(true);
      setSlotsGranted(data.slotsGranted ?? 0);
      setTotalSlots(data.totalSlots ?? data.slotsGranted ?? 0);
      setWasAlreadyLicensed(user?.licenseStatus === "licensed");
      const msg = user?.licenseStatus === "licensed"
        ? `${data.slotsGranted} slots added to your account!`
        : "Access granted! Your Creator License is now active.";
      toast.success(msg);
    },
    onError: (e) => {
      toast.error(e.message || "Invalid or expired code. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    redeemMutation.mutate({ code: code.trim().toUpperCase() });
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="rounded-2xl border p-8" style={{ background: CARD, borderColor: BORDER }}>

          {redeemed ? (
            /* ── Success State ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(58,138,86,0.15)", border: "1px solid rgba(74,222,128,0.28)" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "var(--ln-seal-bright)" }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                {wasAlreadyLicensed ? "Slots Added" : "License Activated"}
              </h1>
              <p className="text-sm mb-2" style={{ color: SUBTEXT }}>
                {wasAlreadyLicensed
                  ? `${slotsGranted} upload slots have been added to your archive.`
                  : "Your Creator License is now active."}
              </p>
              {totalSlots > 0 && (
                <p className="text-sm mb-6 font-semibold" style={{ color: GOLD }}>
                  Total slots: {totalSlots}
                </p>
              )}
              <div className="flex flex-col gap-3">
                <Button
                  style={{ background: GOLD, color: BG }}
                  onClick={() => navigate("/upload")}
                >
                  Start Uploading <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  style={{ borderColor: BORDER, color: SUBTEXT }}
                  onClick={() => navigate("/")}
                >
                  Back to Home
                </Button>
              </div>
            </div>
          ) : !isAuthenticated ? (
            /* ── Not Logged In ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}>
                <Shield className="w-8 h-8" style={{ color: GOLD }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Sign In Required
              </h1>
              <p className="text-sm mb-6" style={{ color: SUBTEXT }}>
                You need to be signed in to redeem an access code.
              </p>
              <Button
                style={{ background: GOLD, color: BG }}
                onClick={() => window.location.href = getLoginUrl("/redeem")}
              >
                Sign In to Continue
              </Button>
            </div>
          ) : (
            /* ── Redeem Form ── */
            <>
              {/* Licensed user banner */}
              {user?.licenseStatus === "licensed" && (
                <div className="rounded-xl p-3 mb-6 flex items-center gap-3"
                  style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-seal-bright)" }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--ln-seal-bright)" }}>Creator License Active</p>
                    <p className="text-xs" style={{ color: SUBTEXT }}>
                      {user.songSlotsTotal ?? 0} slots in your archive. Redeem a slot pack code to add more.
                    </p>
                  </div>
                </div>
              )}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}>
                  <Tag className="w-8 h-8" style={{ color: GOLD }} />
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                  {user?.licenseStatus === "licensed" ? "Redeem Slot Pack" : "Redeem Access Code"}
                </h1>
                <p className="text-sm" style={{ color: SUBTEXT }}>
                  {user?.licenseStatus === "licensed"
                    ? "Enter a slot pack code to add more upload slots to your archive."
                    : "Enter your code below to activate a free Creator License and start uploading your music."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: SUBTEXT }}>
                    Access Code
                  </label>
                  <Input
                    placeholder="e.g. BDDT-FREE"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="text-center text-lg font-mono tracking-widest uppercase"
                    style={{ background: "var(--ln-coal)", borderColor: BORDER, color: TEXT, letterSpacing: "0.15em" }}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  style={{ background: GOLD, color: BG }}
                  disabled={!code.trim() || redeemMutation.isPending}
                >
                  {redeemMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying…</>
                    : <>Activate License <ArrowRight className="w-4 h-4 ml-2" /></>
                  }
                </Button>
              </form>

              <p className="text-center text-xs mt-6" style={{ color: "var(--ln-iron)" }}>
                Don't have a code?{" "}
                <button
                  className="underline hover:opacity-80 transition-opacity"
                  style={{ color: GOLD }}
                  onClick={() => navigate("/license")}
                >
                  View licensing options
                </button>
              </p>
            </>
          )}
        </div>

        {/* Back link */}
        {!redeemed && (
          <div className="text-center mt-4">
            <button
              className="text-xs hover:opacity-80 transition-opacity"
              style={{ color: "var(--ln-iron)" }}
              onClick={() => navigate("/")}
            >
              ← Back to Living Nexus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
