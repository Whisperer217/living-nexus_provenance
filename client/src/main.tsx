import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LightsModeProvider } from "./contexts/LightsModeContext";
import { KeeperAttrsProvider } from "./contexts/KeeperAttrsContext";
import { PendingWorkProvider } from "./contexts/PendingWorkContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import { WSPProvider } from "./contexts/WSPContext";
import { RightRailProvider } from "./contexts/RightRailContext";
import { WorkEditorProvider } from "./contexts/WorkEditorContext";
import { UploadEngineProvider } from "./contexts/UploadEngineContext";
import { getLoginUrl } from "./const";
import { hadSession } from "./lib/sessionFlags";
import { playbackDiag } from "./lib/playbackDiag";
import {
  dispatchServiceWorkerUpdateEvent,
  SW_UPDATE_APPLY_EVENT,
  SW_UPDATE_APPLYING_EVENT,
  SW_UPDATE_AVAILABLE_EVENT,
  SW_UPDATE_FAILED_EVENT,
  type ServiceWorkerUpdateFailure,
} from "./lib/serviceWorkerUpdate";
import { shouldRenderVisualLab } from "./visual-safe/visualLabGate";
import "./index.css";

const shouldBootVisualLab = shouldRenderVisualLab({
  dev: import.meta.env.DEV,
  enabled: import.meta.env.VITE_LN_VISUAL_LAB,
  pathname: window.location.pathname,
});

if (shouldBootVisualLab) {
  void import("./visual-dev/VisualLabPage").then(({ VisualLabPage }) => {
    createRoot(document.getElementById("root")!).render(<VisualLabPage />);
  });
} else {
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

// ─── Session-Aware Auth Redirect ──────────────────────────────────────────────
// Living Nexus is a browse-first platform: guests must be able to explore all
// content without being redirected to OAuth login.
//
// Strategy: only redirect to login when the user HAD an active session that
// expired (i.e., they were previously authenticated in this browser tab).
// Never redirect a fresh guest visitor who has never logged in.
//
// Implementation:
//   • When auth.me resolves with a real user, useAuth calls markHadSession()
//     which writes 'ln-had-session=1' to sessionStorage. This flag persists
//     for the browser tab's lifetime.
//   • The redirect handler checks this flag before redirecting. If the flag is
//     absent, the 401 is treated as "expected guest 401" and ignored.
//   • auth.me 401s are always suppressed (they mean "no session", not expiry).
//
// This correctly handles:
//   ✓ Fresh guest visit → no redirect (flag absent)
//   ✓ Logged-in user whose session expires mid-use → redirect (flag present)
//   ✓ playback.getSettings, keeper.getProfile, etc. firing for guests → no redirect
//   ✓ Mutation 401s for guests (e.g. keeper.chat) → no redirect

/** True for queries that are expected to 401 for guests (auth.me = "no session"). */
const isGuestSafeQueryKey = (queryKey: readonly unknown[]): boolean => {
  const keyStr = JSON.stringify(queryKey);
  // tRPC batches queries as [["auth","me"], {...}] — match the procedure path
  return keyStr.includes('"auth"') && keyStr.includes('"me"');
};

const redirectToLoginIfUnauthorized = (
  error: unknown,
  queryKey?: readonly unknown[]
) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  // auth.me 401 always means "no session" — never redirect
  if (queryKey && isGuestSafeQueryKey(queryKey)) return;
  // Only redirect if this tab previously had an authenticated session.
  // A fresh guest visitor has never set the flag, so we skip the redirect.
  if (!hadSession()) return;
  playbackDiag("AUTH_REDIRECT_TO_LOGIN", { queryKey: queryKey ? JSON.stringify(queryKey) : null });
  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error, event.query.queryKey);
    // Suppress expected 401 noise (auth.me for guests, or any query for non-session tabs)
    const isExpectedGuestError =
      error instanceof TRPCClientError &&
      error.message === UNAUTHED_ERR_MSG &&
      (isGuestSafeQueryKey(event.query.queryKey) || !hadSession());
    if (!isExpectedGuestError) console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    // Suppress expected mutation 401 noise for guests
    const isExpectedGuestError =
      error instanceof TRPCClientError &&
      error.message === UNAUTHED_ERR_MSG &&
      !hadSession();
    if (!isExpectedGuestError) console.error("[API Mutation Error]", error);
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
  playbackDiag("GLOBAL_ERROR", { message: e.error?.message ?? e.message });
  console.error("[global-error]", e.error ?? e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  playbackDiag("GLOBAL_UNHANDLED_REJECTION", { message: e.reason instanceof Error ? e.reason.message : String(e.reason) });
  console.error("[global-unhandled-promise]", e.reason);
});

// ─── Service Worker Registration ─────────────────────────────────────────────
// Registers sw.js for PWA offline support and install prompt eligibility.
// Only runs in production (or when explicitly enabled) to avoid caching
// during development. The SW is registered after the page loads to avoid
// competing with critical resource fetches.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const UPDATE_ACTIVATION_TIMEOUT_MS = 8_000;
    let activeController = navigator.serviceWorker.controller;
    let listenerAcceptedUpdate = false;
    let updateActivationRequested = false;
    let activationTimeout: number | null = null;

    const clearActivationTimeout = () => {
      if (activationTimeout !== null) {
        window.clearTimeout(activationTimeout);
        activationTimeout = null;
      }
    };

    const failListenerAcceptedUpdate = (reason: ServiceWorkerUpdateFailure) => {
      clearActivationTimeout();
      listenerAcceptedUpdate = false;
      updateActivationRequested = false;
      playbackDiag("SERVICE_WORKER_UPDATE_FAILED", { reason });
      dispatchServiceWorkerUpdateEvent(SW_UPDATE_FAILED_EVENT, reason);
    };

    const announceUpdate = () => {
      if (!navigator.serviceWorker.controller) return;
      dispatchServiceWorkerUpdateEvent(SW_UPDATE_AVAILABLE_EVENT);
    };

    const applyWaitingUpdate = async () => {
      if (updateActivationRequested) return;

      updateActivationRequested = true;
      dispatchServiceWorkerUpdateEvent(SW_UPDATE_APPLYING_EVENT);
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration?.waiting) {
          failListenerAcceptedUpdate("registration_unavailable");
          return;
        }

        listenerAcceptedUpdate = true;
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        activationTimeout = window.setTimeout(() => {
          if (listenerAcceptedUpdate) failListenerAcceptedUpdate("activation_timeout");
        }, UPDATE_ACTIVATION_TIMEOUT_MS);
      } catch {
        failListenerAcceptedUpdate("registration_unavailable");
      }
    };

    window.addEventListener(SW_UPDATE_APPLY_EVENT, () => {
      void applyWaitingUpdate();
    });

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[SW] Registered, scope:", reg.scope);
        // A tab can open while an update is already waiting. Do not require a
        // new updatefound event to give the listener the approved-update action.
        if (reg.waiting) announceUpdate();
        // Listen for a new SW waiting — prompt user to reload for update.
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              announceUpdate();
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      const nextController = navigator.serviceWorker.controller;
      const controllerChanged = nextController !== activeController;
      activeController = nextController;

      if (!listenerAcceptedUpdate) {
        // Initial clients.claim() and other unrequested controller changes must
        // never reload a listening page.
        console.log("[SW] Controller changed without listener approval — no reload");
        return;
      }

      clearActivationTimeout();
      listenerAcceptedUpdate = false;
      updateActivationRequested = false;
      if (!controllerChanged) {
        dispatchServiceWorkerUpdateEvent(SW_UPDATE_FAILED_EVENT, "activation_timeout");
        return;
      }

      // A listener-approved waiting worker took over. Reload exactly once so
      // fresh chunk hashes are fetched under the new controller.
      playbackDiag("SERVICE_WORKER_CONTROLLER_RELOAD");
      console.log("[SW] Controller changed after update — reloading for fresh chunks");
      window.location.reload();
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
        {/* ThemeProvider owns data-theme; LightsMode adapts profile lights toggle */}
        <ThemeProvider defaultTheme="cathedral-dark">
          <KeeperAttrsProvider>
            <WSPProvider>
              <RightRailProvider>
                <LightsModeProvider>
                  {/* PlayerProvider must wrap WorkEditorProvider — CreativeDrawer calls usePlayer */}
                  <PlayerProvider>
                    <WorkEditorProvider>
                      <UploadEngineProvider>
                        <PendingWorkProvider>
                          <App />
                        </PendingWorkProvider>
                      </UploadEngineProvider>
                    </WorkEditorProvider>
                  </PlayerProvider>
                </LightsModeProvider>
              </RightRailProvider>
            </WSPProvider>
          </KeeperAttrsProvider>
        </ThemeProvider>
      </QueryClientProvider>
      </trpc.Provider>
  </HelmetProvider>
);
}
