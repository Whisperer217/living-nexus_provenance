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

const GOLD = "oklch(0.84 0.155 85)";
const BG = "oklch(0.08 0.015 280)";
const CARD = "oklch(0.12 0.015 280)";
const BORDER = "oklch(0.2 0.02 280)";
const TEXT = "#E2E8F0";
const SUBTEXT = "#94A3B8";

export default function RedeemPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [redeemed, setRedeemed] = useState(false);
  const [slotsGranted, setSlotsGranted] = useState(0);

  const redeemMutation = trpc.promo.redeem.useMutation({
    onSuccess: (data) => {
      setRedeemed(true);
      setSlotsGranted(data.slotsGranted ?? 0);
      toast.success("Access granted! Your Creator License is now active.");
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
                style={{ background: "oklch(0.75 0.18 145 / 0.15)", border: "1px solid oklch(0.75 0.18 145 / 0.3)" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "oklch(0.75 0.18 145)" }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
                License Activated
              </h1>
              <p className="text-sm mb-2" style={{ color: SUBTEXT }}>
                Your Creator License is now active.
              </p>
              {slotsGranted > 0 && (
                <p className="text-sm mb-6" style={{ color: GOLD }}>
                  {slotsGranted} upload slots added to your account.
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
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
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
          ) : user?.licenseStatus === "licensed" ? (
            /* ── Already Licensed ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "oklch(0.75 0.18 145 / 0.15)", border: "1px solid oklch(0.75 0.18 145 / 0.3)" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "oklch(0.75 0.18 145)" }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
                Already Licensed
              </h1>
              <p className="text-sm mb-6" style={{ color: SUBTEXT }}>
                Your account already has an active Creator License.
              </p>
              <Button
                style={{ background: GOLD, color: BG }}
                onClick={() => navigate("/upload")}
              >
                Go to Upload <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            /* ── Redeem Form ── */
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}>
                  <Tag className="w-8 h-8" style={{ color: GOLD }} />
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
                  Redeem Access Code
                </h1>
                <p className="text-sm" style={{ color: SUBTEXT }}>
                  Enter your code below to activate a free Creator License and start uploading your music.
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
                    style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT, letterSpacing: "0.15em" }}
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

              <p className="text-center text-xs mt-6" style={{ color: "oklch(0.4 0.02 280)" }}>
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
              style={{ color: "oklch(0.4 0.02 280)" }}
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
