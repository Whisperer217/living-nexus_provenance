import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** When this key changes (e.g. route path), the boundary resets automatically */
  resetKey?: string;
  /** Called when the boundary catches — useful for logging */
  onError?: (error: Error, info: { componentStack: string }) => void;
  /** If true, renders a compact inline error card instead of full-screen */
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  /** Whether the user has expanded the full stack trace panel */
  expanded: boolean;
}

/**
 * Extract the first meaningful line from a component stack string.
 * Returns something like "in SongDetailPage (at App.tsx:176)"
 */
function firstComponentFrame(stack: string): string {
  const lines = stack.split("\n").map(l => l.trim()).filter(Boolean);
  // Skip blank / "at " lines that are just framework internals
  const frame = lines.find(l => l.startsWith("in ") || l.startsWith("at "));
  return frame ?? lines[0] ?? "";
}

/**
 * Produce a short, human-readable reason string from the caught error.
 * Shown in both dev and production so the team can triage without opening DevTools.
 */
function summariseError(error: Error | null, componentStack: string | null): string {
  if (!error) return "Unknown error.";
  const name = error.name ?? "Error";
  const msg = error.message ?? "";
  const frame = componentStack ? firstComponentFrame(componentStack) : "";
  const location = frame ? ` — ${frame}` : "";
  return `${name}: ${msg}${location}`;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null, expanded: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Always log to console — captured by .manus-logs/browserConsole.log
    console.error("[ErrorBoundary caught]", error.name, error.message);
    console.error("[ErrorBoundary stack]", error.stack);
    console.error("[ErrorBoundary component stack]", info.componentStack);
    this.setState({ componentStack: info.componentStack });
    this.props.onError?.(error, info);
    // Chunk-load failures happen when a stale service worker serves an old JS
    // bundle hash after a new deploy. Detect this pattern and auto-reload once
    // so the user never sees the crash screen — the fresh deploy will resolve it.
    const isChunkError =
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("Importing a module script failed") ||
      error.name === "ChunkLoadError";
    if (isChunkError) {
      const reloadKey = "_ln_chunk_reload";
      const alreadyReloaded = sessionStorage.getItem(reloadKey);
      if (!alreadyReloaded) {
        sessionStorage.setItem(reloadKey, "1");
        console.warn("[ErrorBoundary] Chunk load failure detected — reloading for fresh deploy");
        window.location.reload();
        return;
      } else {
        // Already reloaded once — clear the flag so future deploys work, then
        // show the normal error UI so the user can report a persistent issue.
        sessionStorage.removeItem(reloadKey);
      }
    }
  }

  /** Auto-reset when the route key changes — clears the error so the new page renders normally */
  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, componentStack: null, expanded: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, componentStack, expanded } = this.state;
    const summary = summariseError(error, componentStack);

    /* ── Compact inline variant ── */
    if (this.props.inline) {
      return (
        <div
          className="flex flex-col gap-3 p-5 rounded-xl"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                Something went wrong loading this section.
              </p>
              <p
                className="text-xs font-mono break-all leading-relaxed"
                style={{ color: "rgba(239,68,68,0.75)" }}
              >
                {summary}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null, componentStack: null, expanded: false })}
            className={cn(
              "self-start flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
              "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
            )}
          >
            <RotateCcw size={14} />
            Try again
          </button>
        </div>
      );
    }

    /* ── Full-page variant ── */
    return (
      <div
        className="flex items-center justify-center min-h-[60vh] p-8"
        style={{ background: "var(--ln-coal)" }}
      >
        <div
          className="flex flex-col w-full max-w-2xl rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{ borderBottom: "1px solid rgba(239,68,68,0.15)" }}
          >
            <AlertTriangle size={22} className="text-destructive flex-shrink-0" />
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "'Cinzel', serif", color: "rgba(255,255,255,0.9)" }}
            >
              Page crashed
            </h2>
          </div>

          {/* Diagnostic blurb — always visible, dev + production */}
          <div className="px-6 py-4">
            <p
              className="text-xs font-mono break-all leading-relaxed mb-1"
              style={{ color: "rgba(239,68,68,0.8)" }}
            >
              {summary}
            </p>
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              This crash has been logged. Use the buttons below to recover, or share the
              error text above with the development team.
            </p>
          </div>

          {/* Expandable full stack trace — always available, not just in dev */}
          {(error?.stack || componentStack) && (
            <div style={{ borderTop: "1px solid rgba(239,68,68,0.12)" }}>
              <button
                type="button"
                onClick={() => this.setState(s => ({ expanded: !s.expanded }))}
                className="w-full flex items-center justify-between px-6 py-3 text-xs transition-opacity hover:opacity-80"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                <span>Full stack trace</span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {expanded && (
                <div
                  className="px-6 pb-5 overflow-auto max-h-64"
                  style={{ borderTop: "1px solid rgba(239,68,68,0.08)" }}
                >
                  <pre
                    className="text-xs leading-relaxed whitespace-pre-wrap break-all pt-3"
                    style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}
                  >
                    {error?.stack ?? ""}
                    {componentStack ? `\n\nComponent tree:\n${componentStack}` : ""}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{ borderTop: "1px solid rgba(239,68,68,0.12)" }}
          >
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null, componentStack: null, expanded: false })}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={15} />
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                "hover:opacity-80 cursor-pointer"
              )}
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
