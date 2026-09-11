import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../registry/credentialService", () => ({
  authorizeRegistryCredential: vi.fn(async () => ({ ok: false, httpStatus: 401, reasonCode: "invalid_credential" })),
  authenticateRegistryCredential: vi.fn(async () => ({ ok: true, principal: { credentialId: 1, clientId: 1, ownerUserId: 1, keyId: "test", environment: "TEST", scopes: ["registry:search:read"], dailyLimit: 20 } })),
  consumeRegistryCredentialQuota: vi.fn(async (principal) => ({ ok: true, principal })),
  recordRegistryApiAuditEvent: vi.fn(async () => undefined),
}));

vi.mock("../registry/readService", () => ({
  registryCapabilities: () => ({ supported: ["public_registered_work"], notConnected: ["creator_testimony"] }),
  searchPublicRegistryWorks: vi.fn(async () => ({ items: [], nextCursor: null })),
  findPublicRegistryWork: vi.fn(async (wid: string) => wid === "WID-MUS-PUBLIC" ? ({
    wid,
    title: "Public Work",
    contentType: "audio",
    genre: null,
    registeredAt: new Date("2026-01-01T00:00:00.000Z"),
    creator: { handle: "publiccreator", name: "Public Creator" },
    canonicalUrl: "https://www.livingnexus.org/verify/WID-MUS-PUBLIC",
    verificationUrl: "https://www.livingnexus.org/verify/WID-MUS-PUBLIC",
  }) : null),
  getPublicRegistryCreator: vi.fn(),
  getPublicRegistryPermissions: vi.fn(),
  getPublicRegistryProvenance: vi.fn(),
  listPublicRegistryCreatorWorks: vi.fn(),
}));

import { registryApiRouter } from "../routes/registryApiRoute";

function app() {
  const instance = express();
  instance.use(registryApiRouter);
  return instance;
}

describe("Registry API R1b HTTP boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the standard envelope from the unauthenticated operational health route without secret material", async () => {
    const response = await request(app()).get("/api/registry/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ apiVersion: "registry.v1", source: "living_nexus_registry", data: { status: "ok", credentialDigest: "ready" } });
    expect(response.body.requestId).toMatch(/^req_/);
    expect(JSON.stringify(response.body)).not.toMatch(/pepper|secretHash|lnr_(live|test)_/i);
  });

  it("denies a protected search without a Registry v2 credential through a typed envelope", async () => {
    const response = await request(app()).get("/api/registry/v1/search?q=public");
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ apiVersion: "registry.v1", error: { code: "UNAUTHORIZED" } });
    expect(JSON.stringify(response.body)).not.toContain("public");
  });

  it("allows an anonymous canonical public Work projection while suppressing unknown or private records", async () => {
    const publicResponse = await request(app()).get("/api/registry/v1/works/WID-MUS-PUBLIC");
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.data).toMatchObject({ wid: "WID-MUS-PUBLIC", title: "Public Work" });
    expect(publicResponse.body.data).not.toHaveProperty("id");
    expect(publicResponse.body.data).not.toHaveProperty("fileUrl");

    const hiddenResponse = await request(app()).get("/api/registry/v1/works/WID-MUS-PRIVATE");
    expect(hiddenResponse.status).toBe(404);
    expect(hiddenResponse.body.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(hiddenResponse.body)).not.toContain("PRIVATE");
  });

  it("fails closed for every R1 mutation method", async () => {
    for (const method of ["post", "put", "patch", "delete"] as const) {
      const response = await request(app())[method]("/api/registry/v1/works/WID-MUS-PUBLIC");
      expect(response.status).toBe(405);
      expect(response.body.error.code).toBe("METHOD_NOT_ALLOWED");
    }
  });

  it("explicitly denies private, registration, and policy authority outside the service-key boundary", async () => {
    for (const path of ["/api/registry/v1/private/queue", "/api/registry/v1/registration", "/api/registry/v1/creators/example/testimony", "/api/registry/v1/policy"]) {
      const response = await request(app()).get(path).set("Authorization", "Bearer lnr_test_testtesttest_" + "0".repeat(64));
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("DELEGATED_AUTHORIZATION_REQUIRED");
    }
  });

  it("keeps the Nexus adapter server-only and requires a separate server-held credential", async () => {
    const adapter = await import("../registry/nexusRegistryAdapter");
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../registry/nexusRegistryAdapter.ts", import.meta.url), "utf8"));
    expect(adapter.getNexusRegistryAdapterConfig()).toBeNull();
    expect(source).toMatch(/LN_REGISTRY_API_KEY/);
    expect(source).not.toMatch(/VITE_|client\/src|window\./);
  });
});
