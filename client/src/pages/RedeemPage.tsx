/**
 * /redeem — Promo Code Redemption
 * Restyled Phase 196: Full platform gold/black design system
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Tag, CheckCircle2, ArrowRight, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD       = "#C49A28";
const GOLD_HOT   = "#E8B840";
const GOLD_DIM   = "#8B6914";
const PARCHMENT  = "#E8DFC8";
const SMOKE      = "#6B6555";
const IRON       = "#1C1A14";
const COAL       = "#000000";
const GOLD_GLOW  = "0 0 24px rgba(196,154,40,0.18)";
const GOLD_BORDER = `1px solid rgba(196,154,40,0.28)`;

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: COAL }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: COAL }}
    >
      <div className="w-full max-w-md">

        {/* ── Wordmark / overline ── */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles size={12} style={{ color: GOLD_DIM }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM }}
            >
              Living Nexus
            </span>
            <Sparkles size={12} style={{ color: GOLD_DIM }} />
          </div>
        </div>

        {/* ── Card ── */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: IRON,
            border: GOLD_BORDER,
            boxShadow: `0 4px 40px rgba(0,0,0,0.7), ${GOLD_GLOW}`,
          }}
        >

          {redeemed ? (
            /* ── Success State ── */
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(58,138,86,0.12)", border: "1px solid rgba(74,222,128,0.30)" }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: "#4ade80" }} />
              </div>
              <h1
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT, letterSpacing: "0.06em" }}
              >
                {wasAlreadyLicensed ? "Slots Added" : "License Activated"}
              </h1>
              <p
                className="text-base mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: SMOKE, fontSize: "16px" }}
              >
                {wasAlreadyLicensed
                  ? `${slotsGranted} upload slots have been added to your archive.`
                  : "Your Creator License is now active."}
              </p>
              {totalSlots > 0 && (
                <p
                  className="text-base mb-7 font-semibold"
                  style={{ fontFamily: "'Cinzel', serif", color: GOLD }}
                >
                  Total slots: {totalSlots}
                </p>
              )}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate("/upload")}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_HOT} 100%)`,
                    color: COAL,
                    fontFamily: "'Cinzel', serif",
                    boxShadow: GOLD_GLOW,
                  }}
                >
                  Start Uploading <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all hover:bg-white/5 active:scale-95"
                  style={{
                    background: "transparent",
                    border: GOLD_BORDER,
                    color: SMOKE,
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  Back to Home
                </button>
              </div>
            </div>

          ) : !isAuthenticated ? (
            /* ── Not Logged In ── */
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(196,154,40,0.08)", border: `1px solid rgba(196,154,40,0.25)` }}
              >
                <Shield className="w-8 h-8" style={{ color: GOLD }} />
              </div>
              <h1
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT, letterSpacing: "0.06em" }}
              >
                Sign In Required
              </h1>
              <p
                className="text-base mb-7"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: SMOKE, fontSize: "16px" }}
              >
                You need to be signed in to redeem an access code.
              </p>
              <button
                onClick={() => window.location.href = getLoginUrl("/redeem")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_HOT} 100%)`,
                  color: COAL,
                  fontFamily: "'Cinzel', serif",
                  boxShadow: GOLD_GLOW,
                }}
              >
                Sign In to Continue
              </button>
            </div>

          ) : (
            /* ── Redeem Form ── */
            <>
              {/* Licensed user banner */}
              {user?.licenseStatus === "licensed" && (
                <div
                  className="rounded-xl p-3 mb-7 flex items-center gap-3"
                  style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.22)" }}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#4ade80" }} />
                  <div>
                    <p
                      className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ fontFamily: "'Cinzel', serif", color: "#4ade80" }}
                    >
                      Creator License Active
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: SMOKE }}>
                      {user.songSlotsTotal ?? 0} slots in your archive. Redeem a slot pack code to add more.
                    </p>
                  </div>
                </div>
              )}

              {/* Icon + title */}
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "rgba(196,154,40,0.08)", border: `1px solid rgba(196,154,40,0.25)` }}
                >
                  <Tag className="w-8 h-8" style={{ color: GOLD }} />
                </div>
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT, letterSpacing: "0.06em" }}
                >
                  {user?.licenseStatus === "licensed" ? "Redeem Slot Pack" : "Redeem Access Code"}
                </h1>
                <p
                  className="text-base"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: SMOKE, fontSize: "16px", lineHeight: 1.6 }}
                >
                  {user?.licenseStatus === "licensed"
                    ? "Enter a slot pack code to add more upload slots to your archive."
                    : "Enter your code below to activate a free Creator License and start uploading your music."}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 block"
                    style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM }}
                  >
                    Access Code
                  </label>
                  <input
                    placeholder="e.g. BDDT-FREE"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="w-full text-center text-xl font-mono tracking-[0.18em] uppercase rounded-xl px-4 py-3 outline-none transition-all focus:ring-2"
                    style={{
                      background: COAL,
                      border: `1px solid rgba(196,154,40,0.30)`,
                      color: PARCHMENT,
                      fontFamily: "'Cinzel', serif",
                      // @ts-ignore
                      "--tw-ring-color": "rgba(196,154,40,0.4)",
                    }}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!code.trim() || redeemMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_HOT} 100%)`,
                    color: COAL,
                    fontFamily: "'Cinzel', serif",
                    boxShadow: GOLD_GLOW,
                  }}
                >
                  {redeemMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                    : <>Activate License <ArrowRight size={15} /></>
                  }
                </button>
              </form>

              <p className="text-center text-xs mt-6" style={{ color: SMOKE }}>
                Don't have a code?{" "}
                <button
                  className="underline hover:opacity-80 transition-opacity"
                  style={{ color: GOLD }}
                  onClick={() => navigate("/pricing")}
                >
                  View licensing options
                </button>
              </p>
            </>
          )}
        </div>

        {/* Back link */}
        {!redeemed && (
          <div className="text-center mt-5">
            <button
              className="text-xs hover:opacity-80 transition-opacity"
              style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM, letterSpacing: "0.08em" }}
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
