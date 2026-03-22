/**
 * WelcomeModal — shown once to new users on their first login.
 * Dismissed by clicking "Get Started", which calls onboarding.markWelcomeSeen
 * so it never shows again.
 */

import { useEffect, useState } from "react";
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

const DISCORD_URL = "https://discord.com/channels/1459384199025918073/1459384202792276084";

export default function WelcomeModal() {
  const { user, isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const markSeen = trpc.onboarding.markWelcomeSeen.useMutation();

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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent
        className="max-w-md w-full rounded-2xl border p-0 overflow-hidden"
        style={{ background: "oklch(0.10 0.015 280)", borderColor: "oklch(0.22 0.025 280)" }}
      >
        {/* Hidden accessibility description */}
        <DialogDescription className="sr-only">
          Welcome to Living Nexus — a brief introduction to the platform for new users.
        </DialogDescription>

        {/* Gold header band */}
        <div className="px-6 pt-6 pb-4 text-center" style={{ borderBottom: "1px solid oklch(0.22 0.025 280)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "oklch(0.84 0.155 85 / 0.15)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}>
            <Music2 className="w-7 h-7" style={{ color: "oklch(0.84 0.155 85)" }} />
          </div>
          <DialogTitle className="text-xl font-bold mb-1"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
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
              icon: <Shield className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.75 0.18 145)" }} />,
              title: "Your music, protected",
              desc: "Every track you upload receives a Witness ID (WID) — a cryptographic timestamp that proves you created it first.",
            },
            {
              icon: <Music2 className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.84 0.155 85)" }} />,
              title: "Upload and share",
              desc: "Add songs, attach lyrics, set AI consent, and share directly with your audience — no algorithm deciding who hears you.",
            },
            {
              icon: <Users className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.7 0.18 260)" }} />,
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
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 font-semibold"
            onClick={handleDismiss}
            style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}
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
              style={{ borderColor: "oklch(0.7 0.18 260 / 0.5)", color: "oklch(0.7 0.18 260)" }}
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
