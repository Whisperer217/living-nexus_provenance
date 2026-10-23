import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    getProvenancePlayerCatalogCandidates: vi.fn(),
    getAmbiguousProvenancePlayerWids: vi.fn(),
  };
});

import { publicApiRouter } from "../routes/publicApiRoute";
import {
  getAmbiguousProvenancePlayerWids,
  getProvenancePlayerCatalogCandidates,
} from "../utils/db";

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    song: {
      id: 60001,
      title: "Push Forward",
      contentType: "audio",
      status: "Published",
      isPublic: true,
      isFlagged: false,
      witnessId: "WID-MUS-PUSH-FORWARD",
      fileUrl: "https://media.example.test/push-forward.mp3",
      coverArtUrl: "https://media.example.test/push-forward.webp",
      externalDisplayRevokedAt: null,
      participationMusic: "Both",
      participationLyrics: "Human",
      participationVoice: "None",
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      ...overrides,
    },
    creator: { id: 1, artistHandle: "DocSMercer", name: "Doc Seraph Mercer" },
  };
}

let server: Server | undefined;
let origin = "";

beforeEach(async () => {
  vi.clearAllMocks();
  (getAmbiguousProvenancePlayerWids as any).mockResolvedValue(new Set());
  const app = express();
  app.use(publicApiRouter);
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server address unavailable");
  origin = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  server = undefined;
});

describe("Portable Witness discovery catalog HTTP boundary", () => {
  it("returns an adapter-eligible, no-store, gateway-only page with bounded pagination", async () => {
    (getProvenancePlayerCatalogCandidates as any).mockResolvedValue([
      candidate(),
      candidate({ id: 60002, title: "Second Witness", witnessId: "WID-MUS-SECOND" }),
    ]);

    const response = await fetch(`${origin}/api/v1/provenance-player/catalog?limit=1&offset=8`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = await response.json();
    expect(body).toMatchObject({
      schema: "living-nexus-provenance-catalog/1",
      offset: 8,
      limit: 1,
      nextOffset: 9,
      items: [{
        workId: "60001",
        wid: "WID-MUS-PUSH-FORWARD",
        audioUrl: "https://www.livingnexus.org/api/provenance-player/media/60001",
      }],
    });
    expect(body.items).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("media.example.test/push-forward.mp3");
    expect(getProvenancePlayerCatalogCandidates).toHaveBeenCalledWith({ offset: 8, limit: 6 });
    expect(getAmbiguousProvenancePlayerWids).toHaveBeenCalledWith(["WID-MUS-PUSH-FORWARD", "WID-MUS-SECOND"]);
  });

  it("rejects malformed paging values into bounded safe defaults", async () => {
    (getProvenancePlayerCatalogCandidates as any).mockResolvedValue([]);
    const response = await fetch(`${origin}/api/v1/provenance-player/catalog?limit=-99&offset=not-a-number`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ offset: 0, limit: 50, nextOffset: null, items: [] });
    expect(getProvenancePlayerCatalogCandidates).toHaveBeenCalledWith({ offset: 0, limit: 251 });
  });

  it("leaves the legacy generic catalog and raw legacy stream endpoint unmodified", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../routes/publicApiRoute.ts", import.meta.url), "utf8"));
    expect(source).toContain('publicApiRouter.get("/api/v1/catalog"');
    expect(source).toContain('publicApiRouter.get("/api/v1/stream/:id"');
    expect(source).toContain("res.redirect(302, record.song.fileUrl)");
    expect(source).toContain('publicApiRouter.get("/api/v1/provenance-player/catalog"');
  });
});
