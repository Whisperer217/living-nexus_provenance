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
        background: "rgba(63, 74, 80, 0.35)",
        border: "1px solid rgba(239,68,68,0.28)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.12)" }}
      >
        <AlertTriangle size={22} style={{ color: "#E6CDAE" }} />
      </div>

      <div>
        <p
          className="font-heading text-[15px] mb-1"
          style={{ color: "#E6CDAE" }}
        >
          We couldn't load your dashboard right now
        </p>
        <p
          className="text-[12px] font-body"
          style={{ color: "#AA8E64" }}
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
            background: "#CBB183",
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
              background: "rgba(44,52,56,0.8)",
              border: "1px solid rgba(203,177,131,0.28)",
              color: "#CBB183",
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
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#EF4444",
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
