import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    getProvenancePlayerTrackSourceById: vi.fn(),
    hasAmbiguousProvenancePlayerWids: vi.fn(),
  };
});

import { provenancePlayerMediaRouter } from "../routes/provenancePlayerMediaRoute";
import {
  getProvenancePlayerTrackSourceById,
  hasAmbiguousProvenancePlayerWids,
} from "../utils/db";

function eligibleSource(overrides: Record<string, unknown> = {}) {
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
      ...overrides,
    },
    creator: { artistHandle: "DocSMercer", name: "Doc Seraph Mercer" },
  };
}

let server: Server | undefined;
let origin = "";

beforeEach(async () => {
  vi.clearAllMocks();
  (hasAmbiguousProvenancePlayerWids as any).mockResolvedValue(false);
  const app = express();
  app.use(provenancePlayerMediaRouter);
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

describe("Provenance Player media gateway", () => {
  it("answers CORS preflight without consulting a Work or disclosing media", async () => {
    const response = await fetch(`${origin}/api/provenance-player/media/60001`, { method: "OPTIONS" });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getProvenancePlayerTrackSourceById).not.toHaveBeenCalled();
  });

  it("rechecks an eligible current Work and redirects only after a gateway authorization pass", async () => {
    (getProvenancePlayerTrackSourceById as any).mockResolvedValue(eligibleSource());

    const response = await fetch(`${origin}/api/provenance-player/media/60001`, { redirect: "manual" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://media.example.test/push-forward.mp3");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(hasAmbiguousProvenancePlayerWids).toHaveBeenCalledWith(["WID-MUS-PUSH-FORWARD"]);
  });

  it.each([
    ["an individually withdrawn Work", { externalDisplayRevokedAt: new Date() }],
    ["an ambiguous WID", null],
  ])("denies new companion fetches for %s", async (label, overrides) => {
    (getProvenancePlayerTrackSourceById as any).mockResolvedValue(eligibleSource(overrides ?? {}));
    if (label === "an ambiguous WID") (hasAmbiguousProvenancePlayerWids as any).mockResolvedValue(true);

    const response = await fetch(`${origin}/api/provenance-player/media/60001`, { redirect: "manual" });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Media unavailable" });
  });

  it("does not query or disclose a malformed Work identifier", async () => {
    const response = await fetch(`${origin}/api/provenance-player/media/not-a-work`, { redirect: "manual" });

    expect(response.status).toBe(404);
    expect(getProvenancePlayerTrackSourceById).not.toHaveBeenCalled();
  });
});
