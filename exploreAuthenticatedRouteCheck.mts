import { sdk } from "./server/_core/sdk";

const baseUrl = "https://3000-ifej0ibpeimtax2nnarhl-b14c6bc0.us2.manus.computer";
const origin = new URL(baseUrl).origin;
const openId = "JWw5hcQ8kTAsLfpBQ6HSZj";
const cookieName = "app_session_id";
const sessionToken = await sdk.createSessionToken(openId, { name: "Explore Stability Harness" });

const targetResponse = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
if (!targetResponse.ok) throw new Error(`Unable to create browser target: ${targetResponse.status}`);
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise<void>((resolve, reject) => {
  socket.addEventListener("open", () => resolve(), { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map<number, (message: any) => void>();
const errors: string[] = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    errors.push(message.params.args.map((arg: any) => arg.value ?? arg.description ?? "").join(" "));
  }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text ?? "runtime exception");
  const resolve = pending.get(message.id);
  if (resolve) {
    pending.delete(message.id);
    resolve(message);
  }
});

function cdp(method: string, params: Record<string, unknown> = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise<any>((resolve, reject) => {
    pending.set(id, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
  });
}

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Network.enable");
await cdp("Network.setCookie", {
  name: cookieName,
  value: sessionToken,
  url: origin,
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "None",
});
await cdp("Page.addScriptToEvaluateOnNewDocument", {
  source: "sessionStorage.setItem('ln_splash_seen_v4', '1'); localStorage.removeItem('manus-runtime-user-info');",
});
await cdp("Page.navigate", { url: `${baseUrl}/explore` });
await new Promise((resolve) => setTimeout(resolve, 8_000));

const evaluation = await cdp("Runtime.evaluate", {
  expression: `JSON.stringify({
    title: document.querySelector('h1')?.textContent ?? null,
    errorBoundary: document.body.innerText.includes('Something went wrong'),
    runtimeUser: localStorage.getItem('manus-runtime-user-info'),
    renderedText: document.body.innerText.includes('Explore'),
  })`,
  returnByValue: true,
});
const result = JSON.parse(evaluation.result.value);

await cdp("Network.deleteCookies", { name: cookieName, url: origin });
await cdp("Runtime.evaluate", { expression: "localStorage.removeItem('manus-runtime-user-info')" });
socket.close();

console.log(JSON.stringify({ result, errors }, null, 2));
if (
  !result.renderedText ||
  result.errorBoundary ||
  !result.runtimeUser?.includes(openId) ||
  errors.some((entry) => /Maximum update depth|useSyncExternalStore/i.test(entry))
) {
  throw new Error(`Authenticated Explore validation failed: ${JSON.stringify({ result, errors })}`);
}
