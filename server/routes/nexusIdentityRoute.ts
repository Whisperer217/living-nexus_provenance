import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { sdk } from "../_core/sdk";
import {
  createNexusAssertion,
  getNexusAssertionJwks,
  getNexusAssertionReadiness,
  NEXUS_ASSERTION,
} from "../nexus/assertionService";

export const nexusIdentityRouter = Router();

const NEXUS_ASSERTION_BROWSER_ORIGINS = new Set([
  "https://ai.livingnexus.org",
  "https://nexus-staging.35.196.142.88.nip.io",
]);

const NEXUS_ASSERTION_LAUNCH_ORIGINS = NEXUS_ASSERTION_BROWSER_ORIGINS;
const ASSERTION_LAUNCH_NONCE = /^[A-Za-z0-9_-]{24,128}$/;

function allowNexusAssertionBrowserOrigin(req: Request, res: Response): boolean {
  const origin = req.header("origin");
  if (!origin || !NEXUS_ASSERTION_BROWSER_ORIGINS.has(origin)) {
    res.status(403).json({ error: "NEXUS_ASSERTION_ORIGIN_DENIED" });
    return false;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  return true;
}

function getNexusAssertionLaunchOrigin(req: Request): string | null {
  const candidate = typeof req.query.returnOrigin === "string" ? req.query.returnOrigin : "";
  return NEXUS_ASSERTION_LAUNCH_ORIGINS.has(candidate) ? candidate : null;
}

function renderAssertionLaunchDocument(returnOrigin: string, nonce: string, assertion: string, expiresIn: number): string {
  const payload = JSON.stringify({
    type: "living-nexus:nexus-assertion",
    nonce,
    assertion,
    expiresIn,
  }).replace(/</g, "\\u003c");
  const target = JSON.stringify(returnOrigin).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Connecting Nexus</title></head><body><p>Connecting your signed Living Nexus session…</p><script>const target=${target};const payload=${payload};if(window.opener){window.opener.postMessage(payload,target)}window.close()</script></body></html>`;
}

nexusIdentityRouter.get("/.well-known/jwks.json", async (_req, res) => {
  try {
    const jwks = await getNexusAssertionJwks();
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).json(jwks);
  } catch {
    return res.status(503).json({ error: "NEXUS_ASSERTION_UNAVAILABLE" });
  }
});

nexusIdentityRouter.get("/api/nexus/v1/identity/metadata", async (_req, res) => {
  const readiness = await getNexusAssertionReadiness();
  return res.status(readiness === "ready" ? 200 : 503).json({
    issuer: NEXUS_ASSERTION.issuer,
    audience: NEXUS_ASSERTION.audience,
    jwksUri: `${NEXUS_ASSERTION.issuer}/.well-known/jwks.json`,
    assertionTtlSeconds: NEXUS_ASSERTION.ttlSeconds,
    status: readiness,
  });
});

nexusIdentityRouter.options("/api/nexus/v1/identity/assertion", (req, res) => {
  if (!allowNexusAssertionBrowserOrigin(req, res)) return;
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).end();
});

nexusIdentityRouter.post("/api/nexus/v1/identity/assertion", async (req, res) => {
  if (!allowNexusAssertionBrowserOrigin(req, res)) return;
  try {
    const user = await sdk.authenticateRequest(req);
    const assertion = await createNexusAssertion(user);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ assertion, tokenType: "Bearer", expiresIn: NEXUS_ASSERTION.ttlSeconds });
  } catch {
    return res.status(401).json({ error: "NEXUS_ASSERTION_UNAUTHORIZED" });
  }
});

nexusIdentityRouter.get("/api/nexus/v1/identity/launch", async (req, res) => {
  const returnOrigin = getNexusAssertionLaunchOrigin(req);
  const nonce = typeof req.query.nonce === "string" ? req.query.nonce : "";
  if (!returnOrigin || !ASSERTION_LAUNCH_NONCE.test(nonce)) {
    return res.status(400).json({ error: "NEXUS_ASSERTION_LAUNCH_INVALID" });
  }
  try {
    const user = await sdk.authenticateRequest(req);
    const assertion = await createNexusAssertion(user);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    return res.status(200).type("html").send(renderAssertionLaunchDocument(returnOrigin, nonce, assertion, NEXUS_ASSERTION.ttlSeconds));
  } catch {
    const failure = JSON.stringify({ type: "living-nexus:nexus-assertion", nonce, error: "NEXUS_ASSERTION_UNAUTHORIZED" });
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    return res.status(401).type("html").send(`<!doctype html><script>if(window.opener){window.opener.postMessage(${failure},${JSON.stringify(returnOrigin)})}window.close()</script>`);
  }
});
