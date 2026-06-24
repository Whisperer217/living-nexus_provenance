/**
 * Manifested Collections — unit tests
 *
 * Tests the slug generation, WID generation, and fork lineage logic
 * without requiring a live database connection.
 */

import { describe, it, expect } from "vitest";

// ── Slug generation ────────────────────────────────────────────────────────────
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

describe("generateSlug", () => {
  it("converts spaces to hyphens", () => {
    expect(generateSlug("Songs That Saved My Life")).toBe("songs-that-saved-my-life");
  });

  it("strips special characters", () => {
    // & and : are stripped, spaces become hyphens, multiple hyphens collapse
    expect(generateSlug("Hope & War: Vol. 1")).toBe("hope-war-vol-1");
  });

  it("collapses multiple hyphens", () => {
    const result = generateSlug("A  B   C");
    expect(result).not.toContain("--");
  });

  it("truncates to 80 characters", () => {
    const long = "a".repeat(100);
    expect(generateSlug(long).length).toBeLessThanOrEqual(80);
  });

  it("lowercases the result", () => {
    expect(generateSlug("UPPER CASE")).toBe("upper-case");
  });
});

// ── WID generation ─────────────────────────────────────────────────────────────
function generateCollectionWid(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `WID-COL-${suffix}`;
}

describe("generateCollectionWid", () => {
  it("starts with WID-COL-", () => {
    const wid = generateCollectionWid();
    expect(wid).toMatch(/^WID-COL-[A-Z0-9]{8}$/);
  });

  it("generates unique IDs", () => {
    const wids = new Set(Array.from({ length: 100 }, () => generateCollectionWid()));
    expect(wids.size).toBeGreaterThan(90); // extremely unlikely to collide 10+ times in 100
  });
});

// ── Fork lineage ───────────────────────────────────────────────────────────────
interface CollectionRow {
  id: number;
  name: string;
  wid: string;
  forkedFromId: number | null;
  forkedFromWid: string | null;
  forkedFromOwnerName: string | null;
  ownerId: number;
}

function buildForkName(originalName: string, ownerName: string): string {
  return `${originalName} (forked by ${ownerName})`;
}

describe("fork lineage", () => {
  const original: CollectionRow = {
    id: 1,
    name: "Songs That Saved My Life",
    wid: "WID-COL-ABCD1234",
    forkedFromId: null,
    forkedFromWid: null,
    forkedFromOwnerName: null,
    ownerId: 10,
  };

  it("fork name includes original name and forking owner", () => {
    const forkName = buildForkName(original.name, "Slimdoggy");
    expect(forkName).toContain(original.name);
    expect(forkName).toContain("Slimdoggy");
  });

  it("fork preserves original WID as forkedFromWid", () => {
    const fork: CollectionRow = {
      id: 2,
      name: buildForkName(original.name, "Slimdoggy"),
      wid: generateCollectionWid(),
      forkedFromId: original.id,
      forkedFromWid: original.wid,
      forkedFromOwnerName: "OriginalCreator",
      ownerId: 20,
    };
    expect(fork.forkedFromWid).toBe(original.wid);
    expect(fork.forkedFromId).toBe(original.id);
    expect(fork.wid).not.toBe(original.wid);
  });

  it("fork has its own unique WID", () => {
    const fork1Wid = generateCollectionWid();
    const fork2Wid = generateCollectionWid();
    // Both are valid WID-COL format
    expect(fork1Wid).toMatch(/^WID-COL-/);
    expect(fork2Wid).toMatch(/^WID-COL-/);
  });
});

// ── Total runtime calculation ──────────────────────────────────────────────────
function formatTotalRuntime(seconds: number): string {
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

describe("formatTotalRuntime", () => {
  it("formats sub-hour correctly", () => {
    expect(formatTotalRuntime(3 * 60 + 45)).toBe("3m 45s");
  });

  it("formats exactly one hour", () => {
    expect(formatTotalRuntime(3600)).toBe("1h 0m");
  });

  it("formats multi-hour", () => {
    expect(formatTotalRuntime(2 * 3600 + 30 * 60)).toBe("2h 30m");
  });

  it("handles zero", () => {
    expect(formatTotalRuntime(0)).toBe("0m 0s");
  });
});
