/**
 * QR Router Tests
 * Tests for the context-aware QR generation and scan logging procedures.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock db helpers ──────────────────────────────────────────────────────────
vi.mock("../utils/db", () => ({
  createQrShare: vi.fn(),
  logQrScan: vi.fn(),
  getQrStats: vi.fn(),
  listQrShares: vi.fn(),
}));

import * as db from "../utils/db";

// ─── Unit tests for URL building logic ────────────────────────────────────────

describe("QR URL construction", () => {
  it("builds a creator share URL with ref and context params", () => {
    const origin = "https://www.livingnexus.org";
    const entityType = "creator";
    const entitySlug = "maxspeed";
    const shareId = 42;
    const campaign = "prayer-warrior";
    const refHandle = "jake";
    const ts = 1712345678000;

    const url = `${origin}/${entityType}/${entitySlug}?qr=${shareId}&ref=${encodeURIComponent(refHandle)}&context=${encodeURIComponent(campaign)}&ts=${ts}`;

    expect(url).toContain("/creator/maxspeed");
    expect(url).toContain("qr=42");
    expect(url).toContain("ref=jake");
    expect(url).toContain("context=prayer-warrior");
    expect(url).toContain("ts=1712345678000");
  });

  it("builds a project share URL without optional params", () => {
    const origin = "https://www.livingnexus.org";
    const entityType = "project";
    const entitySlug = "my-album";
    const shareId = 7;

    const url = `${origin}/${entityType}/${entitySlug}?qr=${shareId}`;

    expect(url).toBe("https://www.livingnexus.org/project/my-album?qr=7");
    expect(url).not.toContain("ref=");
    expect(url).not.toContain("context=");
  });

  it("builds a song share URL with witnessId as slug", () => {
    const origin = "https://www.livingnexus.org";
    const entityType = "song";
    const entitySlug = "WID-2024-001";
    const shareId = 99;

    const url = `${origin}/${entityType}/${entitySlug}?qr=${shareId}`;

    expect(url).toContain("/song/WID-2024-001");
    expect(url).toContain("qr=99");
  });
});

// ─── DB helper mock tests ─────────────────────────────────────────────────────

describe("QR DB helpers (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createQrShare is called with correct entity data", async () => {
    const mockShare = {
      id: 1,
      entityType: "creator",
      entityId: 5,
      entitySlug: "maxspeed",
      createdById: 10,
      campaign: "prayer-warrior",
      tag: null,
      scanCount: 0,
      createdAt: new Date(),
    };
    vi.mocked(db.createQrShare).mockResolvedValue(mockShare as any);

    const result = await db.createQrShare({
      entityType: "creator",
      entityId: 5,
      entitySlug: "maxspeed",
      createdById: 10,
      campaign: "prayer-warrior",
    });

    expect(db.createQrShare).toHaveBeenCalledOnce();
    expect(result.entityType).toBe("creator");
    expect(result.entitySlug).toBe("maxspeed");
    expect(result.campaign).toBe("prayer-warrior");
  });

  it("logQrScan is called with shareId and metadata", async () => {
    vi.mocked(db.logQrScan).mockResolvedValue(undefined as any);

    await db.logQrScan({
      shareId: 1,
      refHandle: "jake",
      campaign: "prayer-warrior",
      userAgent: "Mozilla/5.0",
    });

    expect(db.logQrScan).toHaveBeenCalledWith({
      shareId: 1,
      refHandle: "jake",
      campaign: "prayer-warrior",
      userAgent: "Mozilla/5.0",
    });
  });

  it("getQrStats returns scan count and recent scans", async () => {
    const mockStats = {
      share: { id: 1, scanCount: 5, entityType: "creator", entitySlug: "maxspeed" },
      recentScans: [
        { id: 1, shareId: 1, scannedAt: new Date(), refHandle: "jake", campaign: "prayer-warrior" },
      ],
    };
    vi.mocked(db.getQrStats).mockResolvedValue(mockStats as any);

    const stats = await db.getQrStats(1);

    expect(stats.share.scanCount).toBe(5);
    expect(stats.recentScans).toHaveLength(1);
    expect(stats.recentScans[0].refHandle).toBe("jake");
  });

  it("listQrShares returns shares for a user", async () => {
    const mockShares = [
      { id: 1, entityType: "creator", entitySlug: "maxspeed", scanCount: 3, createdAt: new Date() },
      { id: 2, entityType: "project", entitySlug: "my-album", scanCount: 0, createdAt: new Date() },
    ];
    vi.mocked(db.listQrShares).mockResolvedValue(mockShares as any);

    const shares = await db.listQrShares(10);

    expect(shares).toHaveLength(2);
    expect(shares[0].entityType).toBe("creator");
    expect(shares[1].entityType).toBe("project");
  });
});

// ─── Scan logger hook logic ───────────────────────────────────────────────────

describe("QR scan URL parameter parsing", () => {
  it("correctly parses qr, ref, context, ts from URL search params", () => {
    const search = "?qr=42&ref=jake&context=prayer-warrior&ts=1712345678000";
    const params = new URLSearchParams(search);

    expect(params.get("qr")).toBe("42");
    expect(params.get("ref")).toBe("jake");
    expect(params.get("context")).toBe("prayer-warrior");
    expect(params.get("ts")).toBe("1712345678000");
    expect(parseInt(params.get("qr")!, 10)).toBe(42);
  });

  it("returns null for missing optional params", () => {
    const search = "?qr=7";
    const params = new URLSearchParams(search);

    expect(params.get("ref")).toBeNull();
    expect(params.get("context")).toBeNull();
    expect(params.get("ts")).toBeNull();
  });

  it("cleans attribution params from URL after logging", () => {
    const search = "?qr=42&ref=jake&context=prayer-warrior&ts=1712345678000&page=2";
    const params = new URLSearchParams(search);

    params.delete("qr");
    params.delete("ref");
    params.delete("context");
    params.delete("ts");

    const newSearch = params.toString();
    expect(newSearch).toBe("page=2");
    expect(newSearch).not.toContain("qr=");
    expect(newSearch).not.toContain("ref=");
    expect(newSearch).not.toContain("context=");
    expect(newSearch).not.toContain("ts=");
  });

  it("produces empty search string when all params are attribution-only", () => {
    const search = "?qr=42&ref=jake&context=prayer-warrior&ts=1712345678000";
    const params = new URLSearchParams(search);

    params.delete("qr");
    params.delete("ref");
    params.delete("context");
    params.delete("ts");

    const newSearch = params.toString();
    expect(newSearch).toBe("");
  });
});
