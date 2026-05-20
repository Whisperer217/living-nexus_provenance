/**
 * Physical Distribution Export — Unit Tests
 * Tests the admin-only physical export endpoint behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getSongsByIds: vi.fn(),
}));

// Mock the sdk module
vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

import { getSongsByIds } from "./db";
import { sdk } from "./_core/sdk";

describe("Physical Export Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/admin/physical-export", () => {
    it("rejects unauthenticated requests", async () => {
      const { physicalExportRouter } = await import("./physicalExport");
      const express = await import("express");
      const request = (await import("supertest")).default;

      const app = express.default();
      app.use(express.default.json());
      app.use(physicalExportRouter);

      (sdk.authenticateRequest as any).mockRejectedValue(new Error("No session"));

      const res = await request(app)
        .post("/api/admin/physical-export")
        .send({ songIds: [1, 2, 3] });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Sign in");
    });

    it("rejects non-admin users", async () => {
      const { physicalExportRouter } = await import("./physicalExport");
      const express = await import("express");
      const request = (await import("supertest")).default;

      const app = express.default();
      app.use(express.default.json());
      app.use(physicalExportRouter);

      (sdk.authenticateRequest as any).mockResolvedValue({ id: 1, role: "user", name: "Test" });

      const res = await request(app)
        .post("/api/admin/physical-export")
        .send({ songIds: [1, 2, 3] });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Admin");
    });

    it("rejects empty songIds", async () => {
      const { physicalExportRouter } = await import("./physicalExport");
      const express = await import("express");
      const request = (await import("supertest")).default;

      const app = express.default();
      app.use(express.default.json());
      app.use(physicalExportRouter);

      (sdk.authenticateRequest as any).mockResolvedValue({ id: 1, role: "admin", name: "Admin" });

      const res = await request(app)
        .post("/api/admin/physical-export")
        .send({ songIds: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("songIds");
    });

    it("rejects more than 200 songs", async () => {
      const { physicalExportRouter } = await import("./physicalExport");
      const express = await import("express");
      const request = (await import("supertest")).default;

      const app = express.default();
      app.use(express.default.json());
      app.use(physicalExportRouter);

      (sdk.authenticateRequest as any).mockResolvedValue({ id: 1, role: "admin", name: "Admin" });

      const ids = Array.from({ length: 201 }, (_, i) => i + 1);
      const res = await request(app)
        .post("/api/admin/physical-export")
        .send({ songIds: ids });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("200");
    });

    it("returns 404 when no songs found for given IDs", async () => {
      const { physicalExportRouter } = await import("./physicalExport");
      const express = await import("express");
      const request = (await import("supertest")).default;

      const app = express.default();
      app.use(express.default.json());
      app.use(physicalExportRouter);

      (sdk.authenticateRequest as any).mockResolvedValue({ id: 1, role: "admin", name: "Admin" });
      (getSongsByIds as any).mockResolvedValue([]);

      const res = await request(app)
        .post("/api/admin/physical-export")
        .send({ songIds: [999] });

      expect(res.status).toBe(404);
    });

    it("returns a ZIP file for valid admin request with songs", async () => {
      const { physicalExportRouter } = await import("./physicalExport");
      const express = await import("express");
      const request = (await import("supertest")).default;

      const app = express.default();
      app.use(express.default.json());
      app.use(physicalExportRouter);

      (sdk.authenticateRequest as any).mockResolvedValue({ id: 1, role: "admin", name: "Admin" });
      (getSongsByIds as any).mockResolvedValue([
        {
          song: {
            id: 1,
            title: "Test Song",
            witnessId: "WID-MUS-AAAA1111-BBBB2222",
            genre: "Rock",
            fileUrl: null, // No audio — won't crash, just skips
            coverArtUrl: null,
            durationSeconds: 180,
            createdAt: new Date("2024-01-01"),
            albumName: null,
            aiConsent: "prohibited",
            aiDisclosure: "original",
            certificateUrl: null,
          },
          creator: {
            id: 2,
            name: "Doc Seraph",
            artistHandle: "HlkngMniacNrdWrmngr",
            profilePhotoUrl: null,
          },
        },
      ]);

      const res = await request(app)
        .post("/api/admin/physical-export")
        .send({ songIds: [1] });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/zip");
      expect(res.headers["content-disposition"]).toContain("LivingNexus_Physical");
      // ZIP binary content returned — check content-length header
      const contentLength = parseInt(res.headers["content-length"] || "0", 10);
      expect(contentLength).toBeGreaterThan(0);
    });
  });

  describe("GET /api/admin/physical-export/songs", () => {
    it("rejects unauthenticated requests", async () => {
      const { physicalExportRouter } = await import("./physicalExport");
      const express = await import("express");
      const request = (await import("supertest")).default;

      const app = express.default();
      app.use(physicalExportRouter);

      (sdk.authenticateRequest as any).mockRejectedValue(new Error("No session"));

      const res = await request(app).get("/api/admin/physical-export/songs");

      expect(res.status).toBe(401);
    });

    it("returns songs list for admin", async () => {
      const { physicalExportRouter } = await import("./physicalExport");
      const express = await import("express");
      const request = (await import("supertest")).default;

      const app = express.default();
      app.use(physicalExportRouter);

      (sdk.authenticateRequest as any).mockResolvedValue({ id: 1, role: "admin", name: "Admin" });
      (getSongsByIds as any).mockResolvedValue([
        { song: { id: 1, title: "Song A" }, creator: { id: 2, name: "Artist" } },
      ]);

      const res = await request(app).get("/api/admin/physical-export/songs?search=test&limit=50");

      expect(res.status).toBe(200);
      expect(res.body.songs).toHaveLength(1);
      expect(res.body.songs[0].song.title).toBe("Song A");
    });
  });
});
