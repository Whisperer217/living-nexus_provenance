/**
 * WelcomeModal — shown once to new users on their first login.
 * Dismissed by clicking "Get Started", which calls onboarding.markWelcomeSeen
 * so it never shows again.
 *
 * If the user is a Founder's Era supporter, shows a special recognition modal.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Music2, Shield, Users } from "lucide-react";

const DISCORD_URL = "https://discord.gg/ADF9dtVA";

const TIER_LABEL: Record<string, string> = {
  covenant: "Covenant Partner",
  patron: "Patron",
  supporter: "Supporter",
};

const TIER_ICON: Record<string, string> = {
  covenant: "🔐",
  patron: "⟡",
  supporter: "✦",
};

export default function WelcomeModal() {
  const { user, isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const markSeen = trpc.onboarding.markWelcomeSeen.useMutation();
  const { data: supporterStatus } = trpc.supporters.getMyStatus.useQuery(undefined, {
    enabled: !!user && !(user as any).hasSeenWelcome,
  });

  // Open the modal once we know the user hasn't seen it yet
  useEffect(() => {
    if (!loading && isAuthenticated && user && !(user as any).hasSeenWelcome) {
      setOpen(true);
    }
  }, [loading, isAuthenticated, user]);

  function handleDismiss() {
    setOpen(false);
    markSeen.mutate();
  }

  if (!open) return null;

  const isFounder = !!supporterStatus;
  const tier = supporterStatus?.tier ?? "supporter";

  // ── Founder recognition modal ─────────────────────────────────────────────
  if (isFounder) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
        <DialogContent
          className="max-w-md w-full rounded-2xl border p-0 overflow-hidden"
          style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.3)" }}
        >
          <DialogDescription className="sr-only">
            Welcome back, Founder's Era supporter.
          </DialogDescription>

          {/* Gold header band */}
          <div className="px-6 pt-6 pb-4 text-center" style={{ borderBottom: "1px solid rgba(196,154,40,0.15)" }}>
            <div className="text-4xl mb-3">{TIER_ICON[tier]}</div>
            <DialogTitle className="text-xl font-bold mb-1"
              style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              Welcome back, {TIER_LABEL[tier]}.
            </DialogTitle>
            <p className="text-sm" style={{ color: "var(--ln-gold)" }}>
              You kept the light on.
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5 text-center">
            <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
              Your name is written in the story of Living Nexus. The sanctuary stands because you were here in the founding generation.
            </p>
            {supporterStatus && (
              <p className="text-xs mt-3" style={{ color: "rgba(232,223,200,0.6)" }}>
                Total gifted: ${supporterStatus.totalGifted.toFixed(2)}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 font-semibold"
              onClick={handleDismiss}
              style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
            >
              Enter the Sanctuary
            </Button>
            <Link href="/founders" className="flex-1" onClick={handleDismiss}>
              <Button
                variant="outline"
                className="w-full"
                style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
              >
                View Supporters Wall
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Standard new-user welcome modal ──────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent
        className="max-w-md w-full rounded-2xl border p-0 overflow-hidden"
        style={{ background: "var(--ln-coal)", borderColor: "var(--ln-coal)" }}
      >
        {/* Hidden accessibility description */}
        <DialogDescription className="sr-only">
          Welcome to Living Nexus — a brief introduction to the platform for new users.
        </DialogDescription>

        {/* Gold header band */}
        <div className="px-6 pt-6 pb-4 text-center" style={{ borderBottom: "1px solid #111009" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.25)" }}>
            <Music2 className="w-7 h-7" style={{ color: "var(--ln-gold)" }} />
          </div>
          <DialogTitle className="text-xl font-bold mb-1"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Welcome to Living Nexus
          </DialogTitle>
          <p className="text-sm" style={{ color: "#94A3B8" }}>
            Sovereign music. Verified by witnesses.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {[
            {
              icon: <Shield className="w-5 h-5 flex-shrink-0" style={{ color: "var(--ln-seal-bright)" }} />,
              title: "Your music, protected",
              desc: "Every track you upload receives a Witness ID (WID) — a cryptographic timestamp that proves you created it first. WIDs support, but do not replace, official copyright registration.",
            },
            {
              icon: <Music2 className="w-5 h-5 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />,
              title: "Upload and share",
              desc: "Add songs, attach lyrics, set AI consent, and share directly with your audience — no algorithm deciding who hears you.",
            },
            {
              icon: <Users className="w-5 h-5 flex-shrink-0" style={{ color: "#38BDF8" }} />,
              title: "Join the community",
              desc: "Connect with other independent artists, get feedback, and stay updated on new features in our Discord.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3 items-start">
              <div className="mt-0.5">{icon}</div>
              <div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: "#E2E8F0" }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{desc}</div>
              </div>
            </div>
          ))}

          {/* Founder's Era CTA for new users */}
          <div className="rounded-xl border px-4 py-3 mt-2" style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.2)" }}>
            <p className="text-xs font-bold mb-0.5" style={{ color: "var(--ln-gold)" }}>✦ Founder's Era — Genesis Day, March 2026</p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Support the platform during its founding 90 days. Your name lives here forever.{" "}
              <Link href="/founders" onClick={handleDismiss} className="underline" style={{ color: "var(--ln-gold)" }}>
                Learn more →
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 font-semibold"
            onClick={handleDismiss}
            style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
          >
            Get Started
          </Button>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
            onClick={handleDismiss}
          >
            <Button
              variant="outline"
              className="w-full gap-2"
              style={{ borderColor: "rgba(56,189,248,0.5)", color: "#38BDF8" }}
            >
              <ExternalLink className="w-4 h-4" />
              Join Discord
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
