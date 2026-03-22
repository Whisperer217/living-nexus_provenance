import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Upload, Music, Video, DollarSign, Users, BookOpen, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CURRENT_VERSION = "v1.4.0"; // bump this string to re-trigger the popup for all users
const STORAGE_KEY = `living-nexus-whats-new-seen-${CURRENT_VERSION}`;

const UPDATES = [
  {
    version: "v1.4.0",
    date: "March 2026",
    label: "Latest",
    items: [
      { icon: Video, text: "Music video support — attach an MP4/MOV to any track. Each video gets its own Witness ID." },
      { icon: Shield, text: "Video WID protection — your video file is cryptographically hashed and timestamped alongside your audio." },
      { icon: BookOpen, text: "Archive lyrics editor — add or update lyrics on any track after upload, no re-upload needed." },
    ],
  },
  {
    version: "v1.3.0",
    date: "February 2026",
    label: null,
    items: [
      { icon: DollarSign, text: "Per-track download permissions — set Free, Tip-to-Download, or No Downloads per song." },
      { icon: Music, text: "Now Playing panel redesign — controls overlay the cover art, more room for lyrics below." },
      { icon: Users, text: "Listen Together rooms — play music live with fans in real time." },
    ],
  },
];

const HOW_TO_STEPS = [
  {
    step: "1",
    icon: Upload,
    title: "Upload your track",
    body: "Go to Upload in the sidebar. Add your audio file, cover art, lyrics, and optionally a music video. A Witness ID is generated automatically — this is your cryptographic proof of creation.",
  },
  {
    step: "2",
    icon: Shield,
    title: "Your WID is your proof",
    body: "The Witness ID (WID) is a SHA-256 hash of your file + your identity + a timestamp. It cannot be faked or backdated. Share it, print it, or use it to prove ownership if your music is ever used without permission.",
  },
  {
    step: "3",
    icon: DollarSign,
    title: "Get paid directly",
    body: "Enable tips on your profile via Dashboard → Connect Stripe. Fans tip you directly — you keep 90%, the platform keeps 10%. Set download permissions per track to offer free or tip-gated downloads.",
  },
  {
    step: "4",
    icon: Music,
    title: "Manage your archive",
    body: "Your Archive (sidebar) is your full catalog. Edit metadata, update lyrics, attach a music video, change track status (Published / Draft / Unlisted), or update download permissions at any time.",
  },
];

interface WhatsNewModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function WhatsNewModal({ forceOpen = false, onClose }: WhatsNewModalProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"updates" | "howto">("updates");

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Small delay so the page renders first
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [forceOpen]);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    onClose?.();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden rounded-2xl"
        style={{
          background: "oklch(0.09 0.02 270)",
          border: "1px solid oklch(0.84 0.155 85 / 0.2)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="relative px-6 pt-6 pb-4"
          style={{
            background: "linear-gradient(135deg, oklch(0.11 0.04 270), oklch(0.09 0.02 270))",
            borderBottom: "1px solid oklch(0.84 0.155 85 / 0.12)",
          }}
        >
          <div
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full"
            style={{
              background: "oklch(0.84 0.155 85 / 0.1)",
              border: "1px solid oklch(0.84 0.155 85 / 0.25)",
              color: "oklch(0.84 0.155 85)",
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {CURRENT_VERSION}
          </div>
          <DialogTitle
            className="text-xl font-bold"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}
          >
            What's New on Living Nexus
          </DialogTitle>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.03 280)" }}>
            Platform updates and a quick guide to get started.
          </p>
        </div>

        {/* Tab bar */}
        <div
          className="flex border-b"
          style={{ borderColor: "oklch(0.84 0.155 85 / 0.1)" }}
        >
          {(["updates", "howto"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-3 text-sm font-semibold transition-all"
              style={{
                color: tab === t ? "oklch(0.84 0.155 85)" : "oklch(0.45 0.03 280)",
                borderBottom: tab === t ? "2px solid oklch(0.84 0.155 85)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {t === "updates" ? "Recent Updates" : "How It Works"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6" style={{ maxHeight: "55vh" }}>
          {tab === "updates" && (
            <>
              {UPDATES.map((release) => (
                <div key={release.version}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs font-bold"
                      style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Orbitron', sans-serif" }}
                    >
                      {release.version}
                    </span>
                    <span className="text-xs" style={{ color: "oklch(0.45 0.03 280)" }}>{release.date}</span>
                    {release.label && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "oklch(0.84 0.155 85 / 0.15)", color: "oklch(0.84 0.155 85)" }}
                      >
                        {release.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {release.items.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                            style={{ background: "oklch(0.84 0.155 85 / 0.08)", border: "1px solid oklch(0.84 0.155 85 / 0.2)" }}
                          >
                            <Icon size={13} style={{ color: "oklch(0.84 0.155 85)" }} />
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: "oklch(0.70 0.03 280)" }}>
                            {item.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "howto" && (
            <div className="space-y-5">
              {HOW_TO_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="rounded-xl p-4 flex gap-4"
                    style={{ background: "oklch(0.11 0.02 270)", border: "1px solid oklch(0.84 0.155 85 / 0.08)" }}
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                      style={{
                        background: "oklch(0.84 0.155 85)",
                        color: "oklch(0.08 0.01 280)",
                        fontFamily: "'Orbitron', sans-serif",
                      }}
                    >
                      {step.step}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={13} style={{ color: "oklch(0.84 0.155 85)" }} />
                        <span className="text-sm font-bold" style={{ color: "oklch(0.88 0.03 85)" }}>
                          {step.title}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "oklch(0.60 0.03 280)" }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: "1px solid oklch(0.84 0.155 85 / 0.1)" }}
        >
          <Link href="/manifesto">
            <a
              onClick={handleClose}
              className="text-xs flex items-center gap-1 hover:underline"
              style={{ color: "oklch(0.55 0.04 280)" }}
            >
              Read the Manifesto <ChevronRight size={11} />
            </a>
          </Link>
          <Button
            onClick={handleClose}
            className="font-semibold text-sm px-6"
            style={{
              background: "linear-gradient(135deg, oklch(0.84 0.155 85), oklch(0.72 0.14 75))",
              color: "oklch(0.08 0.01 280)",
            }}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
