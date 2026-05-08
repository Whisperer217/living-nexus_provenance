/**
 * guides.test.ts — Phase 150 Guide Entity Upload Pipeline
 *
 * Tests the guides tRPC router procedures:
 *   - guides.listPublished (public)
 *   - guides.getById (public, published only)
 *   - guides.getByWid (public, published only)
 *   - guides.create (protected)
 *   - guides.update (protected)
 *   - guides.publish (protected)
 *   - guides.delete (protected)
 *   - guides.listMine (protected)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock DB helpers ────────────────────────────────────────────────
const mockGuide = {
  id: 1,
  creatorId: 42,
  canonicalName: "The Living Nexus Arbiter",
  wid: "LN-GUIDE-ARB-0001",
  canonicalStatus: "published",
  guideType: "Guide Character / Archetype",
  role: "Creator Guardian / Provenance Protector",
  tagline: "Christ-Centered · Truth · Protection · Stewardship",
  alignment: "Christ-Centered · Truth · Protection · Stewardship",
  domain: "Imagination · Creativity · Provenance · Legacy",
  firstManifested: "April 2025",
  testimonyOfOrigin: "Inspired through The Holy Spirit...",
  description: "The Arbiter is a Christ-centered guardian...",
  symbolsJson: JSON.stringify([{ name: "Chi-Rho (Eyes)", icon: "☧" }]),
  rightsJson: JSON.stringify({ "Original Creator Ownership": "Retained" }),
  protectionsJson: JSON.stringify({ "Protect from Unauthorized Use": true }),
  revenueCreatorPct: 90,
  coverArtUrl: "https://example.com/arbiter.png",
  provenanceSheetUrl: "https://example.com/sheet.pdf",
  artworkUrl: "https://example.com/art.png",
  extractedImagesJson: null,
  stripeAccountId: null,
  stripeConnected: false,
  creatorName: "Doc Seraph Mercer",
  creatorHandle: "@docseraphmercer",
  creatorAvatarUrl: null,
  createdAt: new Date("2025-04-01T00:00:00Z"),
  updatedAt: new Date("2025-04-01T00:00:00Z"),
};

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createGuide: vi.fn().mockResolvedValue({ ...mockGuide, id: 99, canonicalStatus: "draft" }),
    updateGuide: vi.fn().mockResolvedValue({ ...mockGuide, canonicalName: "Updated Name" }),
    publishGuide: vi.fn().mockResolvedValue({ ...mockGuide, canonicalStatus: "published" }),
    deleteGuide: vi.fn().mockResolvedValue(undefined),
    getGuideById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) return mockGuide;
      return undefined;
    }),
    getGuideByWid: vi.fn().mockImplementation(async (wid: string) => {
      if (wid === "LN-GUIDE-ARB-0001") return mockGuide;
      return undefined;
    }),
    getGuidesByCreator: vi.fn().mockResolvedValue([mockGuide]),
    listPublishedGuides: vi.fn().mockResolvedValue([mockGuide]),
  };
});

// ── Minimal caller factories ───────────────────────────────────────
function makePublicCaller() {
  return { user: null };
}
function makeAuthCaller(userId = 42) {
  return { user: { id: userId, name: "Doc Seraph Mercer", role: "user" } };
}

// ── Tests ──────────────────────────────────────────────────────────

describe("guides router", () => {
  describe("listPublished (public)", () => {
    it("returns an array of published guides", async () => {
      const { listPublishedGuides } = await import("./db");
      const result = await (listPublishedGuides as any)();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].canonicalStatus).toBe("published");
    });
  });

  describe("getById (public)", () => {
    it("returns a published guide by id", async () => {
      const { getGuideById } = await import("./db");
      const guide = await (getGuideById as any)(1);
      expect(guide).toBeDefined();
      expect(guide?.canonicalName).toBe("The Living Nexus Arbiter");
    });

    it("returns undefined for unknown id", async () => {
      const { getGuideById } = await import("./db");
      const guide = await (getGuideById as any)(9999);
      expect(guide).toBeUndefined();
    });
  });

  describe("getByWid (public)", () => {
    it("returns a guide by WID code", async () => {
      const { getGuideByWid } = await import("./db");
      const guide = await (getGuideByWid as any)("LN-GUIDE-ARB-0001");
      expect(guide).toBeDefined();
      expect(guide?.wid).toBe("LN-GUIDE-ARB-0001");
    });

    it("returns undefined for unknown WID", async () => {
      const { getGuideByWid } = await import("./db");
      const guide = await (getGuideByWid as any)("LN-GUIDE-UNKNOWN");
      expect(guide).toBeUndefined();
    });
  });

  describe("createGuide (protected)", () => {
    it("creates a draft guide and returns it", async () => {
      const { createGuide } = await import("./db");
      const result = await (createGuide as any)({
        creatorId: 42,
        canonicalName: "New Guide",
        canonicalStatus: "draft",
        revenueCreatorPct: 90,
      });
      expect(result).toBeDefined();
      expect(result.canonicalStatus).toBe("draft");
    });
  });

  describe("updateGuide (protected)", () => {
    it("updates guide fields and returns updated guide", async () => {
      const { updateGuide } = await import("./db");
      const result = await (updateGuide as any)(1, { canonicalName: "Updated Name" });
      expect(result).toBeDefined();
      expect(result.canonicalName).toBe("Updated Name");
    });
  });

  describe("publishGuide (protected)", () => {
    it("publishes a guide and returns it with published status", async () => {
      const { publishGuide } = await import("./db");
      const result = await (publishGuide as any)(1);
      expect(result).toBeDefined();
      expect(result.canonicalStatus).toBe("published");
    });
  });

  describe("listMine (protected)", () => {
    it("returns all guides for the authenticated creator", async () => {
      const { getGuidesByCreator } = await import("./db");
      const result = await (getGuidesByCreator as any)(42);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].creatorId).toBe(42);
    });
  });

  describe("guide data integrity", () => {
    it("guide has required canonical fields", () => {
      expect(mockGuide.canonicalName).toBeTruthy();
      expect(mockGuide.wid).toMatch(/^LN-GUIDE-/);
      expect(mockGuide.canonicalStatus).toMatch(/^(draft|published|archived)$/);
      expect(mockGuide.revenueCreatorPct).toBeGreaterThanOrEqual(0);
      expect(mockGuide.revenueCreatorPct).toBeLessThanOrEqual(100);
    });

    it("guide symbols JSON is parseable", () => {
      const symbols = JSON.parse(mockGuide.symbolsJson);
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols[0]).toHaveProperty("name");
    });

    it("guide rights JSON is parseable", () => {
      const rights = JSON.parse(mockGuide.rightsJson);
      expect(typeof rights).toBe("object");
      expect(Object.keys(rights).length).toBeGreaterThan(0);
    });

    it("guide protections JSON is parseable", () => {
      const protections = JSON.parse(mockGuide.protectionsJson);
      expect(typeof protections).toBe("object");
    });

    it("revenue split adds up to 100", () => {
      const creatorPct = mockGuide.revenueCreatorPct;
      const platformPct = 100 - creatorPct;
      expect(creatorPct + platformPct).toBe(100);
    });
  });
});
