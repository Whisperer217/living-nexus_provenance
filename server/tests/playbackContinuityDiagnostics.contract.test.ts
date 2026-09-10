import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("playback continuity diagnostics", () => {
  it("keeps diagnostics local, development-only, and explicitly opt-in", () => {
    const source = read("client/src/lib/playbackDiag.ts");

    expect(source).toContain('const ENABLED_KEY = "LN_DIAG_PLAYBACK"');
    expect(source).toContain("if (!import.meta.env.DEV || typeof window === \"undefined\") return;");
    expect(source).toContain('localStorage.getItem(ENABLED_KEY) !== "1"');
    expect(source).toContain("window.__LN_PLAYBACK_LOG");
    expect(source).toContain("window.__LN_PLAYBACK_AUDIO");
    expect(source).not.toContain("fetch(");
  });

  it("records player ownership and media events without adding another audio owner", () => {
    const player = read("client/src/contexts/PlayerContext.tsx");

    expect(player).toContain("let _globalAudio: HTMLAudioElement | null = null;");
    expect(player).toContain("PLAYER_PROVIDER_MOUNT");
    expect(player).toContain("PLAYER_PROVIDER_CLEANUP");
    expect(player).toContain("AUDIO_PLAY");
    expect(player).toContain("AUDIO_PAUSE");
    expect(player).toContain("AUDIO_ERROR");
    expect(player).toContain("AUDIO_EMPTIED");
    expect(player).toContain("DOCUMENT_PAGEHIDE_AUDIO_TEARDOWN");
    expect(player).toContain("DOCUMENT_VISIBILITY_CHANGE");
    expect(player).toContain("DOCUMENT_PAGEHIDE");
    expect(player).toContain("BACKGROUND_RECOVERY_ATTEMPT");
    expect(player).toContain("BACKGROUND_RECOVERY_SUCCESS");
    expect(player).toContain("BACKGROUND_RECOVERY_REJECTED");
    expect(player).toContain("BACKGROUND_AUDIO_PAUSE");
    expect(player).toContain("NETWORK_RECOVERY_SCHEDULED");
    expect(player).toContain("NETWORK_RECOVERY_TIMER_FIRED");
    expect(player).toContain("NETWORK_RECOVERY_CANCELLED");
    expect(player).toContain("NETWORK_RECOVERY_NATURAL");
    expect(player).toContain("networkRetryCanPlayHandlerRef");
    expect(player).toContain("NETWORK_RECOVERY_ATTEMPT");
    expect(player).toContain("NETWORK_RECOVERY_SUCCESS");
    expect(player).toContain("NETWORK_RECOVERY_EXHAUSTED");
    expect(player).toContain("NETWORK_RECOVERY_LOAD_TIMEOUT");
    expect(player).toContain("networkPlaybackIntentRef");
    expect(player).toContain("NETWORK_MEDIA_ERROR_CODE = 2");
    expect(player).toContain("NETWORK_RECOVERY_DELAYS_MS = [750, 2_000, 5_000]");
    expect(player).toContain("listenerPausedRef.current = true;");
    expect(player).toContain("document.hidden && backgroundPlaybackIntentRef.current");
    expect(player).toContain('if (name === "NotAllowedError")');
    expect(player).not.toContain("document.createElement(\"audio\")");
  });

  it("records every app-level forced-reload or redirect vector before it occurs", () => {
    const bootstrap = read("client/src/main.tsx");
    const app = read("client/src/App.tsx");
    const layout = read("client/src/components/layout/MainLayout.tsx");
    const pwaBanner = read("client/src/components/PWAInstallBanner.tsx");
    const boundary = read("client/src/components/ErrorBoundary.tsx");

    expect(bootstrap.indexOf("AUTH_REDIRECT_TO_LOGIN")).toBeLessThan(bootstrap.indexOf("window.location.href = getLoginUrl()"));
    expect(bootstrap.indexOf("SERVICE_WORKER_CONTROLLER_RELOAD")).toBeLessThan(bootstrap.indexOf("window.location.reload()"));
    const pullRefreshDiagnostic = layout.indexOf("PULL_TO_REFRESH_RELOAD");
    expect(pullRefreshDiagnostic).toBeGreaterThan(-1);
    expect(pullRefreshDiagnostic).toBeLessThan(layout.indexOf("window.location.reload()", pullRefreshDiagnostic));
    expect(pwaBanner.indexOf("PWA_UPDATE_RELOAD_CLICK")).toBeLessThan(pwaBanner.indexOf("window.location.reload()"));
    expect(boundary.indexOf("CHUNK_LOAD_AUTO_RELOAD")).toBeLessThan(boundary.indexOf("window.location.reload()"));
    expect(app).toContain('playbackDiag("ROUTE_CHANGE", { location })');
  });

  it("keeps a new service worker waiting during active listening until the listener chooses the update", () => {
    const worker = read("client/public/sw.js");
    const pwaBanner = read("client/src/components/PWAInstallBanner.tsx");
    const installStart = worker.indexOf('self.addEventListener("install"');
    const activateStart = worker.indexOf('self.addEventListener("activate"');
    const installHandler = worker.slice(installStart, activateStart);

    expect(installHandler).not.toContain("self.skipWaiting()");
    expect(worker).toContain('if (event.data?.type === "SKIP_WAITING") self.skipWaiting()');
    expect(pwaBanner).toContain("if (reg?.waiting)");
    expect(pwaBanner).toContain('reg.waiting.postMessage({ type: "SKIP_WAITING" })');
    expect(pwaBanner).toContain("PWA_UPDATE_RELOAD_CLICK");
  });
});
