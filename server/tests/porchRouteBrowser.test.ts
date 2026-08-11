import { describe, expect, it } from "vitest";

const previewUrl = process.env.LIVING_NEXUS_BROWSER_BASE_URL;
const browserTest = previewUrl ? it : it.skip;

type CdpMessage = {
  id?: number;
  method?: string;
  params?: { type?: string; args?: Array<{ value?: string; description?: string }> };
  result?: unknown;
  error?: { message?: string };
};

function connect(url: string) {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
}

describe("Porch public route browser contract", () => {
  browserTest("renders the Porch, insulates Explore, redirects commerce, and returns guest Provenance sign-in to PNA", async () => {
    const targetResponse = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
    expect(targetResponse.ok).toBe(true);
    const target = await targetResponse.json() as { webSocketDebuggerUrl: string };
    const socket = await connect(target.webSocketDebuggerUrl);
    let nextId = 0;
    const pending = new Map<number, (message: CdpMessage) => void>();
    const errors: string[] = [];

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as CdpMessage;
      if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
        errors.push(message.params.args?.map((argument) => argument.value ?? argument.description ?? "").join(" ") ?? "");
      }
      if (message.id !== undefined) pending.get(message.id)?.(message);
    });

    const cdp = <T>(method: string, params: Record<string, unknown> = {}) => new Promise<T>((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, (message) => {
        pending.delete(id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result as T);
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const route = async (path: string) => {
      await cdp("Page.navigate", { url: `${previewUrl}${path}` });
      await wait(2200);
      const evaluation = await cdp<{ result: { value: string } }>("Runtime.evaluate", {
        expression: "JSON.stringify({ path: location.pathname, text: document.body.innerText })",
        returnByValue: true,
      });
      return JSON.parse(evaluation.result.value) as { path: string; text: string };
    };

    try {
      await cdp("Page.enable");
      await cdp("Runtime.enable");
      await cdp("Page.addScriptToEvaluateOnNewDocument", { source: "sessionStorage.setItem('ln_splash_seen_v4', '1');" });

      const home = await route("/");
      const explore = await route("/explore");
      const marketplace = await route("/marketplace");
      const store = await route("/store");
      await route("/");
      const click = await cdp<{ result: { value: string } }>("Runtime.evaluate", {
        expression: `(() => {
          const button = [...document.querySelectorAll('button')].find((node) => (node.getAttribute('title') || '').includes('Provenance Nexus Avatar'));
          if (!button) return JSON.stringify({ found: false });
          button.click();
          return JSON.stringify({ found: true });
        })()`,
        returnByValue: true,
      });
      await wait(900);
      const href = await cdp<{ result: { value: string } }>("Runtime.evaluate", { expression: "location.href", returnByValue: true });
      const signInUrl = new URL(href.result.value);
      const statePayload = signInUrl.searchParams.get("state");
      const state = statePayload ? JSON.parse(Buffer.from(statePayload, "base64url").toString("utf8")) as { returnPath?: string } : null;

      expect(home.text).toMatch(/Home is the porch|Music that can prove its origin|EXPLORE SONGS/);
      expect(explore.text).toMatch(/Explore|Songs|artists|Music/i);
      expect(explore.text).toMatch(/Creator|Songs/);
      expect(explore.text).not.toMatch(/MARKETPLACE|Creator-anchored goods|Keeper Skins|Open PNA Store|Grand Hall of Human Creative Contribution/);
      expect(explore.text).not.toMatch(/\bBooks\b|\bFilm\b|\bDoctrine\b/);
      expect(marketplace.path).toBe("/avatar-registry");
      expect(store.path).toBe("/avatar-registry");
      expect(JSON.parse(click.result.value)).toEqual({ found: true });
      expect(signInUrl.hostname).toBe("manus.im");
      expect(signInUrl.pathname).toBe("/app-auth");
      expect(state?.returnPath).toBe("/pna");
      expect(errors).toEqual([]);
    } finally {
      socket.close();
    }
  }, 30_000);
});
