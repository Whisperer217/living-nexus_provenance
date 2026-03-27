/**
 * Living Nexus — CommunityToast
 * Displays a Discord-style "new member joined" notification in the
 * top-right corner. Stacks up to 3 toasts; older ones auto-dismiss.
 *
 * Usage: Mount <CommunityToastProvider /> once in App.tsx.
 * The provider listens to the SSE stream internally.
 */

import { useState, useCallback, useEffect } from "react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { Users } from "lucide-react";

type ToastEntry = {
  id: string;
  name: string;
  joinedAt: number;
};

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 6_000;

export function CommunityToastProvider() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((name: string, joinedAt: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => {
      const next = [...prev, { id, name, joinedAt }];
      // Keep only the latest MAX_TOASTS
      return next.slice(-MAX_TOASTS);
    });
    // Auto-dismiss after AUTO_DISMISS_MS
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  useCommunityEvents({
    onNewMember: ({ name, joinedAt }) => {
      addToast(name, joinedAt);
    },
  });

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Community notifications"
    >
      {toasts.map(toast => (
        <CommunityToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}

function CommunityToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  // Slide-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer select-none"
      style={{
        background: "oklch(0.14 0.06 268 / 0.96)",
        border: "1px solid oklch(0.82 0.155 175 / 0.30)",
        boxShadow: "0 4px 24px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(0.82 0.155 175 / 0.08)",
        backdropFilter: "blur(12px)",
        minWidth: "260px",
        maxWidth: "320px",
        transform: visible ? "translateX(0)" : "translateX(calc(100% + 1rem))",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
      }}
      onClick={() => onDismiss(toast.id)}
      title="Click to dismiss"
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: "oklch(0.82 0.155 175 / 0.15)",
          border: "1px solid oklch(0.82 0.155 175 / 0.3)",
        }}
      >
        <Users size={14} style={{ color: "oklch(0.82 0.155 175)" }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] font-semibold tracking-wide uppercase mb-0.5"
          style={{ color: "oklch(0.82 0.155 175)" }}
        >
          New Member
        </p>
        <p
          className="text-[13px] font-medium truncate"
          style={{ color: "oklch(0.92 0.01 270)" }}
        >
          <span style={{ color: "oklch(0.80 0.145 82)" }}>
            {toast.name}
          </span>{" "}
          just joined Living Nexus
        </p>
      </div>

      {/* Dismiss dot */}
      <div
        className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
        style={{ background: "oklch(0.82 0.155 175 / 0.5)" }}
      />
    </div>
  );
}
