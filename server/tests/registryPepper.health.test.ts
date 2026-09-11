import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registryApiRouter } from "../routes/registryApiRoute";

describe("Registry credential pepper readiness", () => {
  it("confirms server-side digest readiness through a lightweight API endpoint without disclosing the secret", async () => {
    const app = express();
    app.use(registryApiRouter);

    const response = await request(app).get("/api/registry/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      apiVersion: "registry.v1",
      source: "living_nexus_registry",
      data: {
        status: "ok",
        credentialDigest: "ready",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(process.env.LN_REGISTRY_API_PEPPER ?? "not-present");
  });
});
