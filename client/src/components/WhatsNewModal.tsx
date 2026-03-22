import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Shield, Upload, Music, Video, DollarSign, Users, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CURRENT_VERSION = "v1.4.0";
const STORAGE_KEY = `living-nexus-whats-new-seen-${CURRENT_VERSION}`;

const UPDATES = [
  {
    version: "v1.4.0",
    date: "March 2026",
    label: "Latest",
    items: [
      { icon: Video, text: "Music video support — attach an MP4/MOV to any track. Each video gets its own Witness ID." },
      { icon: Shield, text: "Video WID protection — your video is cryptographically hashed and timestamped alongside your audio." },
      { icon: BookOpen, text: "Archive lyrics editor — add or update lyrics on any track after upload, no re-upload needed." },
    ],
  },
  {
    version: "v1.3.0",
    date: "February 2026",
    label: null,
    items: [
      { icon: DollarSign, text: "Per-track download permissions — Free, Tip-to-Download, or No Downloads." },
      { icon: Music, text: "Now Playing redesign — controls overlay cover art, more room for lyrics." },
      { icon: Users, text: "Listen Together rooms — play music live with fans in real time." },
    ],
  },
];

const HOW_TO_STEPS = [
  {
    step: "1",
    icon: Upload,
    title: "Upload your track",
    body: "Add audio, cover art, lyrics, and optionally a music video. A Witness ID is generated automatically — your cryptographic proof of creation.",
  },
  {
    step: "2",
    icon: Shield,
    title: "Your WID is your proof",
    body: "SHA-256 hash of your file + identity + timestamp. Cannot be faked or backdated. Use it to prove ownership if your music is ever used without permission.",
  },
  {
    step: "3",
    icon: DollarSign,
    title: "Get paid directly",
    body: "Enable tips via Dashboard → Connect Stripe. Fans tip you directly — you keep 90%. Set download permissions per track.",
  },
  {
    step: "4",
    icon: Music,
    title: "Manage your archive",
    body: "Edit metadata, update lyrics, attach a video, change track status, or update download permissions at any time from Archive.",
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
    if (forceOpen) { setOpen(true); return; }
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
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
        className="flex flex-col p-0 overflow-hidden rounded-2xl w-[calc(100vw-32px)] max-w-md"
        style={{
          background: "oklch(0.09 0.02 270)",
          border: "1px solid oklch(0.84 0.155 85 / 0.2)",
          maxHeight: "min(88vh, 640px)",
        }}
      >
        {/* Header — compact on mobile */}
        <div
          className="flex-shrink-0 px-4 pt-4 pb-3"
          style={{
            background: "linear-gradient(135deg, oklch(0.11 0.04 270), oklch(0.09 0.02 270))",
            borderBottom: "1px solid oklch(0.84 0.155 85 / 0.12)",
          }}
        >
          <div
            className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mb-2 px-2.5 py-1 rounded-full"
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
            className="text-base font-bold leading-snug"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}
          >
            What's New on Living Nexus
          </DialogTitle>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.03 280)" }}>
            Platform updates and a quick guide to get started.
          </p>
        </div>

        {/* Tab bar */}
        <div
          className="flex-shrink-0 flex border-b"
          style={{ borderColor: "oklch(0.84 0.155 85 / 0.1)" }}
        >
          {(["updates", "howto"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={{
                color: tab === t ? "oklch(0.84 0.155 85)" : "oklch(0.42 0.03 280)",
                borderBottom: tab === t ? "2px solid oklch(0.84 0.155 85)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {t === "updates" ? "Recent Updates" : "How It Works"}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
          {tab === "updates" && UPDATES.map((release) => (
            <div key={release.version}>
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="text-[11px] font-bold"
                  style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Orbitron', sans-serif" }}
                >
                  {release.version}
                </span>
                <span className="text-[11px]" style={{ color: "oklch(0.42 0.03 280)" }}>{release.date}</span>
                {release.label && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "oklch(0.84 0.155 85 / 0.15)", color: "oklch(0.84 0.155 85)" }}
                  >
                    {release.label}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {release.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <div
                        className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5"
                        style={{ background: "oklch(0.84 0.155 85 / 0.08)", border: "1px solid oklch(0.84 0.155 85 / 0.2)" }}
                      >
                        <Icon size={11} style={{ color: "oklch(0.84 0.155 85)" }} />
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.66 0.03 280)" }}>
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {tab === "howto" && (
            <div className="space-y-3">
              {HOW_TO_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="rounded-xl p-3 flex gap-3"
                    style={{ background: "oklch(0.11 0.02 270)", border: "1px solid oklch(0.84 0.155 85 / 0.08)" }}
                  >
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
                      style={{
                        background: "oklch(0.84 0.155 85)",
                        color: "oklch(0.08 0.01 280)",
                        fontFamily: "'Orbitron', sans-serif",
                      }}
                    >
                      {step.step}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon size={11} style={{ color: "oklch(0.84 0.155 85)" }} />
                        <span className="text-xs font-bold" style={{ color: "oklch(0.88 0.03 85)" }}>
                          {step.title}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.56 0.03 280)" }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <div
          className="flex-shrink-0 px-4 py-3 flex items-center justify-between gap-3"
          style={{ borderTop: "1px solid oklch(0.84 0.155 85 / 0.1)" }}
        >
          <Link href="/manifesto">
            <a
              onClick={handleClose}
              className="text-[11px] flex items-center gap-1 hover:underline whitespace-nowrap"
              style={{ color: "oklch(0.50 0.04 280)" }}
            >
              Read the Manifesto <ChevronRight size={10} />
            </a>
          </Link>
          <Button
            onClick={handleClose}
            size="sm"
            className="font-semibold text-xs px-5 h-8 flex-shrink-0"
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
