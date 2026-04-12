/**
 * DashboardErrorCard
 * Shown when a dashboard data section fails to load.
 * Provides: Retry, Go to My Works, Report Issue — never a full crash.
 */
import { AlertTriangle, RefreshCw, Music, Flag } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

interface DashboardErrorCardProps {
  /** Human-readable label for the section that failed (e.g. "your songs") */
  section: string;
  /** The error object or message string */
  error: unknown;
  /** tRPC refetch function to retry the failed query */
  onRetry: () => void;
  /** Optional route identifier for server-side logging */
  route?: string;
}

export function DashboardErrorCard({ section, error, onRetry, route = "/dashboard" }: DashboardErrorCardProps) {
  const logError = trpc.system.logClientError.useMutation();

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Unknown error";

  // Log to server once on mount
  useEffect(() => {
    logError.mutate({ route, error: errorMessage, context: `section=${section}` });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-2xl p-6 flex flex-col items-center text-center gap-4"
      style={{
        background: "rgba(61, 36, 64, 0.35)",
        border: "1px solid oklch(0.65 0.18 25 / 0.3)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "oklch(0.65 0.18 25 / 0.12)" }}
      >
        <AlertTriangle size={22} style={{ color: "oklch(0.75 0.18 45)" }} />
      </div>

      <div>
        <p
          className="font-heading text-[15px] mb-1"
          style={{ color: "oklch(0.92 0.015 80)" }}
        >
          We couldn't load your dashboard right now
        </p>
        <p
          className="text-[12px] font-body"
          style={{ color: "oklch(0.58 0.03 280)" }}
        >
          There was a problem loading {section}. Your data is safe — this is a temporary issue.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {/* Retry */}
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-heading text-[12px] tracking-wide transition-all hover:brightness-110 active:scale-95"
          style={{
            background: "oklch(0.84 0.155 85)",
            color: "#E6CDAE",
          }}
        >
          <RefreshCw size={13} />
          Retry
        </button>

        {/* Go to My Works */}
        <Link href="/upload">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-heading text-[12px] tracking-wide transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "oklch(0.12 0.04 270 / 0.8)",
              border: "1px solid oklch(0.84 0.155 85 / 0.3)",
              color: "oklch(0.84 0.155 85)",
            }}
          >
            <Music size={13} />
            Go to My Works
          </button>
        </Link>

        {/* Report Issue */}
        <a
          href={`mailto:support@livingnexus.org?subject=Dashboard+Error&body=Section: ${encodeURIComponent(section)}%0AError: ${encodeURIComponent(errorMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-heading text-[12px] tracking-wide transition-all hover:brightness-110 active:scale-95"
            style={{
              background: "transparent",
              border: "1px solid oklch(0.65 0.18 25 / 0.4)",
              color: "oklch(0.65 0.18 25)",
            }}
          >
            <Flag size={13} />
            Report Issue
          </button>
        </a>
      </div>
    </div>
  );
}
