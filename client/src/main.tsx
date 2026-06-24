import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { LightsModeProvider } from "./contexts/LightsModeContext";
import { KeeperAttrsProvider } from "./contexts/KeeperAttrsContext";
import { WSPProvider } from "./contexts/WSPContext";
import { RightRailProvider } from "./contexts/RightRailContext";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 30s — prevents redundant refetches on tab focus / component remount
      staleTime: 30_000,
      // Keep unused query data in cache for 5 minutes
      gcTime: 5 * 60_000,
      // Don't retry on 4xx errors (auth failures, not found) — only retry on network errors
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError) {
          const status = error.data?.httpStatus;
          if (status && status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Global error capture — surfaces uncaught JS errors and unhandled promise rejections
// to the console so they appear in .manus-logs/browserConsole.log for debugging.
// These do NOT suppress the errors; they only ensure they are logged before React
// catches them (or before they silently disappear in production).
window.addEventListener("error", (e) => {
  console.error("[global-error]", e.error ?? e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[global-unhandled-promise]", e.reason);
});

// ─── Service Worker Registration ─────────────────────────────────────────────
// Registers sw.js for PWA offline support and install prompt eligibility.
// Only runs in production (or when explicitly enabled) to avoid caching
// during development. The SW is registered after the page loads to avoid
// competing with critical resource fetches.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[SW] Registered, scope:", reg.scope);
        // Listen for a new SW waiting — prompt user to reload for update
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New content available — the PWAInstallBanner will handle reload UX
              window.dispatchEvent(new CustomEvent("sw-update-available"));
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  });
}

// Phase 207: Remove server-injected witness/static body blocks before React mounts.
// These blocks are visible to crawlers and no-JS users (provenance proof layer).
// React replaces them with the full SPA experience.
document.getElementById("ln-witness-record")?.remove();
document.getElementById("ln-static-content")?.remove();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {/* LightsModeProvider must be inside QueryClientProvider so it can call trpc hooks */}
        <KeeperAttrsProvider>
          <WSPProvider>
            <RightRailProvider>
              <LightsModeProvider>
                <App />
              </LightsModeProvider>
            </RightRailProvider>
          </WSPProvider>
        </KeeperAttrsProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </HelmetProvider>
);
