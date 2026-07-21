/**
 * @domain  The Creator → Identity → Handle Claim
 * @impl    React Page — First-time domain setup after OAuth login (Law VI)
 *
 * Shown when a creator logs in for the first time and has no artistHandle.
 * They claim their persistent domain: livingnexus.org/@handle
 * Once claimed, they are redirected to their domain /@handle.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AtSign, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,32}$/;

function getHandleError(value: string): string | null {
  if (!value) return null;
  if (value.length < 3) return "Handle must be at least 3 characters.";
  if (value.length > 32) return "Handle must be 32 characters or fewer.";
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Only letters, numbers, and underscores allowed.";
  return null;
}

export default function SetupDomainPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [handle, setHandle] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  // If user already has a handle, redirect to their domain immediately
  useEffect(() => {
    if (!authLoading && user?.artistHandle) {
      navigate(`/@${user.artistHandle}`, { replace: true });
    }
    if (!authLoading && !user) {
      window.location.href = getLoginUrl("/setup-domain");
    }
  }, [user, authLoading, navigate]);

  // Check handle availability with debounce
  useEffect(() => {
    if (!handle || !HANDLE_REGEX.test(handle)) {
      setAvailable(null);
      setCheckError(null);
      return;
    }
    setChecking(true);
    setAvailable(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-handle?handle=${encodeURIComponent(handle)}`);
        const data = await res.json();
        setAvailable(data.available);
        setCheckError(data.available ? null : "This handle is already taken.");
      } catch {
        setCheckError("Could not check availability.");
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [handle]);

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success(`Domain claimed — welcome to /@${handle}`);
      navigate(`/@${handle}`, { replace: true });
    },
    onError: (err) => {
      toast.error(err.message || "Could not claim handle. Please try again.");
    },
  });

  const handleError = getHandleError(handle);
  const canClaim = handle && !handleError && available === true && !updateProfile.isPending;

  function handleClaim() {
    if (!canClaim) return;
    updateProfile.mutate({ artistHandle: handle });
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ln-surface-void)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ln-gold)]" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Claim Your Domain — Living Nexus</title>
        <meta name="description" content="Claim your persistent creator domain on Living Nexus." />
      </Helmet>

      <div className="min-h-screen bg-[var(--ln-surface-void)] flex flex-col items-center justify-center px-4">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10"
            style={{ background: "radial-gradient(ellipse, var(--ln-gold) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
              style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-gold)" }}>
              <AtSign className="w-8 h-8 text-[var(--ln-gold)]" />
            </div>
            <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--ln-font-display)", color: "var(--ln-gold)" }}>
              Claim Your Domain
            </h1>
            <p className="text-[var(--ln-text-secondary)] leading-relaxed">
              Your domain is your persistent home on Living Nexus.<br />
              Everything you create lives here.
            </p>
          </div>

          {/* Domain preview */}
          <div className="rounded-xl p-4 mb-6 text-center"
            style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}>
            <span className="text-[var(--ln-text-muted)] text-sm">Your domain will be</span>
            <div className="mt-1 text-lg font-mono" style={{ color: "var(--ln-gold)" }}>
              livingnexus.org/<span className="opacity-60">@</span>
              <span className={handle && !handleError ? "text-[var(--ln-gold)]" : "text-[var(--ln-text-muted)]"}>
                {handle || "yourhandle"}
              </span>
            </div>
          </div>

          {/* Handle input */}
          <div className="space-y-3 mb-6">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ln-text-muted)] font-mono text-sm select-none">@</span>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="yourhandle"
                maxLength={32}
                className="pl-8 font-mono text-base"
                style={{
                  background: "var(--ln-surface-card)",
                  border: "1px solid var(--ln-border-subtle)",
                  color: "var(--ln-text-primary)",
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleClaim(); }}
                autoFocus
              />
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && <Loader2 className="w-4 h-4 animate-spin text-[var(--ln-text-muted)]" />}
                {!checking && available === true && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {!checking && available === false && <XCircle className="w-4 h-4 text-red-400" />}
              </div>
            </div>

            {/* Validation messages */}
            {handleError && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {handleError}
              </p>
            )}
            {!handleError && checkError && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {checkError}
              </p>
            )}
            {!handleError && available === true && (
              <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Available — this domain is yours to claim.
              </p>
            )}
          </div>

          {/* Rules */}
          <div className="rounded-lg p-4 mb-6 text-xs space-y-1.5"
            style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)", color: "var(--ln-text-muted)" }}>
            <p className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-[var(--ln-gold)] flex-shrink-0" /> 3–32 characters</p>
            <p className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-[var(--ln-gold)] flex-shrink-0" /> Letters, numbers, and underscores only</p>
            <p className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-[var(--ln-gold)] flex-shrink-0" /> Cannot be changed after claiming — choose carefully</p>
          </div>

          {/* Claim button */}
          <Button
            onClick={handleClaim}
            disabled={!canClaim}
            className="w-full h-12 text-base font-semibold gap-2"
            style={{
              background: canClaim ? "var(--ln-gold)" : "var(--ln-surface-panel)",
              color: canClaim ? "var(--ln-surface-void)" : "var(--ln-text-muted)",
              border: canClaim ? "none" : "1px solid var(--ln-border-subtle)",
              transition: "all 0.2s",
            }}
          >
            {updateProfile.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Claiming domain…</>
            ) : (
              <>Claim /@{handle || "yourhandle"} <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>

          <p className="text-center text-xs text-[var(--ln-text-muted)] mt-4">
            Your domain is permanent. It cannot be transferred or deleted.
          </p>
        </div>
      </div>
    </>
  );
}
