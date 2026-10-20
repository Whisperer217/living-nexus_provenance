import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("listener-approved PWA update handshake", () => {
  const bootstrap = read("client/src/main.tsx");
  const banner = read("client/src/components/PWAInstallBanner.tsx");
  const events = read("client/src/lib/serviceWorkerUpdate.ts");
  const worker = read("client/public/sw.js");

  it("reloads after a controller change only when a listener explicitly accepted a waiting update", () => {
    expect(bootstrap).toContain("let listenerAcceptedUpdate = false;");
    expect(bootstrap).toContain("let updateActivationRequested = false;");
    expect(bootstrap).toContain("if (updateActivationRequested) return;");
    expect(bootstrap).toContain('registration.waiting.postMessage({ type: "SKIP_WAITING" })');
    expect(bootstrap).toContain("if (!listenerAcceptedUpdate)");
    expect(bootstrap).toContain("Controller changed without listener approval — no reload");
    expect(bootstrap).toContain('playbackDiag("SERVICE_WORKER_CONTROLLER_RELOAD")');
    expect(bootstrap).not.toContain("const hadController");
  });

  it("recognizes both already-waiting and newly-installed updates without automatic takeover", () => {
    expect(bootstrap).toContain("if (reg.waiting) announceUpdate()");
    expect(bootstrap).toContain('newWorker.state === "installed"');
    expect(bootstrap).toContain("announceUpdate();");
    const installBlock = worker.slice(
      worker.indexOf('self.addEventListener("install"'),
      worker.indexOf('self.addEventListener("activate"')
    );
    expect(installBlock).not.toContain("self.skipWaiting()");
    expect(worker).toContain('if (event.data?.type === "SKIP_WAITING") self.skipWaiting()');
  });

  it("shows an immediate, accessible activation state and keeps recovery visible on failure", () => {
    expect(events).toContain('SW_UPDATE_APPLY_EVENT = "ln-sw-apply-update"');
    expect(events).toContain('SW_UPDATE_APPLYING_EVENT = "ln-sw-update-applying"');
    expect(events).toContain('SW_UPDATE_FAILED_EVENT = "ln-sw-update-failed"');
    expect(banner).toContain('type UpdateState = "ready" | "activating" | "failed"');
    expect(banner).toContain("setUpdateState(\"activating\")");
    expect(banner).toContain("setUpdateState(\"failed\")");
    expect(banner).toContain('disabled={isActivating}');
    expect(banner).toContain('role="status"');
    expect(banner).toContain("Applying the update… playback will pause while the page refreshes.");
    expect(banner).toContain('updateState === "failed" ? "Retry" : "Reload"');
  });

  it("bounds activation failure and resets the request guard for a listener retry", () => {
    expect(bootstrap).toContain("const UPDATE_ACTIVATION_TIMEOUT_MS = 8_000;");
    expect(bootstrap).toContain('failListenerAcceptedUpdate("registration_unavailable")');
    expect(bootstrap).toContain('failListenerAcceptedUpdate("activation_timeout")');
    expect(bootstrap).toContain("updateActivationRequested = false;");
    expect(bootstrap).toContain("SW_UPDATE_FAILED_EVENT");
  });
});
