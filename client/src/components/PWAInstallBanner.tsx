/**
 * PWAInstallBanner
 *
 * Handles two distinct PWA prompts:
 *
 * 1. Install prompt — listens for the browser's `beforeinstallprompt` event,
 *    which fires when Chrome determines the site meets PWA installability criteria
 *    (manifest linked, service worker registered, HTTPS). Shows a minimal
 *    bottom banner inviting the user to add Living Nexus to their home screen.
 *    Dismissed state is persisted in localStorage so it does not re-appear
 *    on every visit.
 *
 * 2. Update prompt — listens for the `sw-update-available` custom event
 *    dispatched by main.tsx when a new service worker is waiting. Shows a
 *    brief "Update available" bar with a Reload button.
 *
 * Design: dark coal background, gold accent, minimal — consistent with the
 * Living Nexus aesthetic. Appears at the bottom of the screen above the
 * GlobalPlayer mini bar (z-index 99990, just below the player).
 */

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DISMISSED_KEY = "ln-pwa-install-dismissed";
const DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < DISMISSED_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable — ignore
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  // ── Install prompt listener ──────────────────────────────────────────────
  useEffect(() => {
    if (wasDismissedRecently()) return;

    const handler = (e: Event) => {
      e.preventDefault(); // Suppress Chrome's default mini-infobar
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── SW update listener ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setShowUpdate(true);
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "dismissed") markDismissed();
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismissInstall = () => {
    markDismissed();
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleReload = () => {
    // Tell the waiting SW to take control immediately, then reload
    navigator.serviceWorker?.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
    window.location.reload();
  };

  // ── Update banner (higher priority — show above install banner) ──────────
  if (showUpdate) {
    return (
      <div
        className="fixed bottom-[72px] left-0 right-0 z-[99990] mx-4 mb-2 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-[#0d1117] px-4 py-3 shadow-lg"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <RefreshCw size={15} className="shrink-0" />
          <span>A new version of Living Nexus is available.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
          >
            Reload
          </button>
          <button
            onClick={() => setShowUpdate(false)}
            className="text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label="Dismiss update notice"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ── Install banner ────────────────────────────────────────────────────────
  if (!showInstall) return null;

  return (
    <div
      className="fixed bottom-[72px] left-0 right-0 z-[99990] mx-4 mb-2 flex items-center justify-between gap-3 rounded-xl border border-[#c9a84c]/20 bg-[#0d1117] px-4 py-3 shadow-lg"
      role="complementary"
      aria-label="Install Living Nexus"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#c9a84c]/10">
          <Download size={16} className="text-[#c9a84c]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Add to Home Screen</p>
          <p className="text-xs text-zinc-400 leading-tight truncate">
            Install Living Nexus for the full experience
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="rounded-lg bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          Install
        </button>
        <button
          onClick={handleDismissInstall}
          className="text-zinc-500 transition-colors hover:text-zinc-300"
          aria-label="Dismiss install prompt"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
