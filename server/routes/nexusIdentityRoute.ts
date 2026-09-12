import { Router } from "express";
import { sdk } from "../_core/sdk";
import {
  createNexusAssertion,
  getNexusAssertionJwks,
  getNexusAssertionReadiness,
  NEXUS_ASSERTION,
} from "../nexus/assertionService";

export const nexusIdentityRouter = Router();

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

nexusIdentityRouter.post("/api/nexus/v1/identity/assertion", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    const assertion = await createNexusAssertion(user);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ assertion, tokenType: "Bearer", expiresIn: NEXUS_ASSERTION.ttlSeconds });
  } catch {
    return res.status(401).json({ error: "NEXUS_ASSERTION_UNAUTHORIZED" });
  }
});
