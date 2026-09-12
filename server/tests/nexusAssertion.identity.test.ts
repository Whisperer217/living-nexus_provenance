import express from "express";
import request from "supertest";
import { generateKeyPairSync } from "node:crypto";
import { importJWK, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import {
  createNexusAssertion,
  getNexusAssertionJwks,
  NEXUS_ASSERTION,
  normalizeNexusAssertionPrivateKey,
} from "../nexus/assertionService";
import { nexusIdentityRouter } from "../routes/nexusIdentityRoute";

describe("Living Nexus Nexus assertion identity boundary", () => {
  it("accepts only an in-memory Base64 encoding of a valid PKCS#8 PEM and keeps malformed values unchanged", () => {
    const pem = generateKeyPairSync("ed25519").privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    expect(normalizeNexusAssertionPrivateKey(Buffer.from(pem, "utf8").toString("base64"))).toBe(pem.trim());
    expect(normalizeNexusAssertionPrivateKey("not-a-pem-value")).toBe("not-a-pem-value");
  });

  it("validates the supplied server-only Ed25519 key, publishes only public JWKS material, and signs the configured issuer/audience", async () => {
    const jwks = await getNexusAssertionJwks();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({ alg: "EdDSA", kid: NEXUS_ASSERTION.kid, use: "sig" });
    expect(JSON.stringify(jwks)).not.toContain("BEGIN PRIVATE KEY");
    expect((jwks.keys[0] as Record<string, unknown>).d).toBeUndefined();

    const publicKey = await importJWK(jwks.keys[0], "EdDSA");
    const assertion = await createNexusAssertion({ id: 42, openId: "ln-test-subject", name: "Test Witness" } as any);
    const verified = await jwtVerify(assertion, publicKey, {
      issuer: NEXUS_ASSERTION.issuer,
      audience: NEXUS_ASSERTION.audience,
    });
    expect(verified.payload.sub).toBe("ln-test-subject");
    expect(verified.payload.ln_user_id).toBe(42);
  });

  it("exposes identity metadata and JWKS without exposing an assertion private key", async () => {
    const app = express();
    app.use(nexusIdentityRouter);
    const [metadata, jwks] = await Promise.all([
      request(app).get("/api/nexus/v1/identity/metadata"),
      request(app).get("/.well-known/jwks.json"),
    ]);
    expect(metadata.status).toBe(200);
    expect(metadata.body).toMatchObject({ issuer: NEXUS_ASSERTION.issuer, audience: NEXUS_ASSERTION.audience, status: "ready" });
    expect(jwks.status).toBe(200);
    expect(JSON.stringify(jwks.body)).not.toContain(process.env.LN_NEXUS_ASSERTION_PRIVATE_KEY ?? "not-configured");
  });
});
