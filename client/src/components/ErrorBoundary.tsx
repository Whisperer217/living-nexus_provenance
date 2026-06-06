import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
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
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
    this.props.onError?.(error, info);
  }

  /** Auto-reset when the route key changes — clears the error so the new page renders normally */
  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.inline) {
        return (
          <div
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
          >
            <AlertTriangle size={24} className="text-destructive" />
            <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.7)" }}>
              Something went wrong loading this section.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={14} />
              Try again
            </button>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle size={48} className="text-destructive mb-6 flex-shrink-0" />
            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            {import.meta.env.DEV ? (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
                <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                  {this.state.error?.stack}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Something went wrong on this page. Try reloading — if the problem
                persists, please contact support.
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-muted text-muted-foreground hover:opacity-90 cursor-pointer"
                )}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
