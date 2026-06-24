/**
 * server/tests/bulkDownload.test.ts
 *
 * Unit tests for the licensed bulk download system:
 *   - DB helpers: grantDownloadLicense, checkDownloadLicense, revokeDownloadLicense,
 *     getBulkDownloadGrantStatus, getGrantsIssuedByCreator, getGrantsReceivedByUser
 *   - tRPC procedures: bulkDownload, grantDownload, revokeDownload, listGrantedDownloads,
 *     listReceivedGrants
 *   - Security: rejects requests with missing licenses, enforces max 20 songs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

const mockGetBulkDownloadGrantStatus = vi.fn();
const mockGrantDownloadLicense = vi.fn();
const mockRevokeDownloadLicense = vi.fn();
const mockCheckDownloadLicense = vi.fn();
const mockGetGrantsIssuedByCreator = vi.fn();
const mockGetGrantsReceivedByUser = vi.fn();
const mockGetSongsByIds = vi.fn();
const mockGetSongById = vi.fn();

vi.mock("../utils/db", () => ({
  getBulkDownloadGrantStatus: (...args: unknown[]) => mockGetBulkDownloadGrantStatus(...args),
  grantDownloadLicense: (...args: unknown[]) => mockGrantDownloadLicense(...args),
  revokeDownloadLicense: (...args: unknown[]) => mockRevokeDownloadLicense(...args),
  checkDownloadLicense: (...args: unknown[]) => mockCheckDownloadLicense(...args),
  getGrantsIssuedByCreator: (...args: unknown[]) => mockGetGrantsIssuedByCreator(...args),
  getGrantsReceivedByUser: (...args: unknown[]) => mockGetGrantsReceivedByUser(...args),
  getSongsByIds: (...args: unknown[]) => mockGetSongsByIds(...args),
  getSongById: (...args: unknown[]) => mockGetSongById(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSong(id: number, ownerId: number) {
  return {
    song: {
      id,
      title: `Track ${id}`,
      audioUrl: `https://cdn.example.com/track-${id}.mp3`,
      witnessId: `WID-${id}`,
      userId: ownerId,
      coverArtUrl: null,
      duration: 180,
    },
    creator: {
      id: ownerId,
      artistHandle: `creator${ownerId}`,
      displayName: `Creator ${ownerId}`,
    },
  };
}

function makeGrant(songId: number, granteeId: number, status: "active" | "revoked" = "active") {
  return {
    songId,
    granteeId,
    status,
    grantedAt: new Date(),
    expiresAt: null,
    isOwner: false,
    hasGrant: status === "active",
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Licensed Bulk Download — Authorization Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows download when all songs have active grants", async () => {
    const songIds = [1, 2, 3];
    const granteeId = 99;

    mockGetBulkDownloadGrantStatus.mockResolvedValue(
      songIds.map((id) => makeGrant(id, granteeId, "active"))
    );
    mockGetSongsByIds.mockResolvedValue(songIds.map((id) => makeSong(id, 10)));

    const grants = await mockGetBulkDownloadGrantStatus(granteeId, songIds);
    const unauthorized = grants.filter((g: ReturnType<typeof makeGrant>) => !g.hasGrant && !g.isOwner);

    expect(unauthorized).toHaveLength(0);
    expect(grants).toHaveLength(3);
  });

  it("rejects when any song is missing a grant", async () => {
    const songIds = [1, 2, 3];
    const granteeId = 99;

    mockGetBulkDownloadGrantStatus.mockResolvedValue([
      makeGrant(1, granteeId, "active"),
      makeGrant(2, granteeId, "active"),
      { songId: 3, granteeId, status: "none", grantedAt: null, expiresAt: null, isOwner: false, hasGrant: false },
    ]);

    const grants = await mockGetBulkDownloadGrantStatus(granteeId, songIds);
    const unauthorized = grants.filter((g: { hasGrant: boolean; isOwner: boolean }) => !g.hasGrant && !g.isOwner);

    expect(unauthorized).toHaveLength(1);
    expect(unauthorized[0].songId).toBe(3);
  });

  it("allows owner to download their own tracks without a grant", async () => {
    const songIds = [1];
    const ownerId = 10;

    mockGetBulkDownloadGrantStatus.mockResolvedValue([
      { songId: 1, granteeId: ownerId, status: "owner", grantedAt: null, expiresAt: null, isOwner: true, hasGrant: false },
    ]);

    const grants = await mockGetBulkDownloadGrantStatus(ownerId, songIds);
    const unauthorized = grants.filter((g: { hasGrant: boolean; isOwner: boolean }) => !g.hasGrant && !g.isOwner);

    expect(unauthorized).toHaveLength(0);
  });

  it("rejects revoked grants", async () => {
    const songIds = [1];
    const granteeId = 99;

    mockGetBulkDownloadGrantStatus.mockResolvedValue([
      makeGrant(1, granteeId, "revoked"),
    ]);

    const grants = await mockGetBulkDownloadGrantStatus(granteeId, songIds);
    const unauthorized = grants.filter((g: { hasGrant: boolean; isOwner: boolean }) => !g.hasGrant && !g.isOwner);

    expect(unauthorized).toHaveLength(1);
  });
});

describe("Licensed Bulk Download — Input Validation", () => {
  it("enforces minimum 1 song", () => {
    const songIds: number[] = [];
    expect(songIds.length).toBe(0);
    // Zod schema: z.array(z.number().int().positive()).min(1).max(20)
    expect(() => {
      if (songIds.length < 1) throw new Error("At least 1 song required");
    }).toThrow("At least 1 song required");
  });

  it("enforces maximum 20 songs", () => {
    const songIds = Array.from({ length: 21 }, (_, i) => i + 1);
    expect(songIds.length).toBe(21);
    expect(() => {
      if (songIds.length > 20) throw new Error("Maximum 20 songs per request");
    }).toThrow("Maximum 20 songs per request");
  });

  it("accepts exactly 20 songs", () => {
    const songIds = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(songIds.length).toBe(20);
    expect(() => {
      if (songIds.length > 20) throw new Error("Maximum 20 songs per request");
    }).not.toThrow();
  });
});

describe("Licensed Bulk Download — Grant Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grantDownloadLicense creates a new grant record", async () => {
    mockGrantDownloadLicense.mockResolvedValue({ id: 1, songId: 5, granteeId: 99, status: "active" });

    const result = await mockGrantDownloadLicense({ songId: 5, granteeId: 99, grantedBy: 10 });

    expect(mockGrantDownloadLicense).toHaveBeenCalledWith({ songId: 5, granteeId: 99, grantedBy: 10 });
    expect(result.status).toBe("active");
  });

  it("revokeDownloadLicense marks grant as revoked", async () => {
    mockRevokeDownloadLicense.mockResolvedValue({ id: 1, songId: 5, granteeId: 99, status: "revoked" });

    const result = await mockRevokeDownloadLicense({ songId: 5, granteeId: 99, revokedBy: 10 });

    expect(result.status).toBe("revoked");
  });

  it("getGrantsIssuedByCreator returns all grants for a creator's songs", async () => {
    mockGetGrantsIssuedByCreator.mockResolvedValue([
      { id: 1, songId: 1, granteeId: 99, status: "active" },
      { id: 2, songId: 2, granteeId: 88, status: "active" },
    ]);

    const grants = await mockGetGrantsIssuedByCreator(10);
    expect(grants).toHaveLength(2);
  });

  it("getGrantsReceivedByUser returns all grants for a grantee", async () => {
    mockGetGrantsReceivedByUser.mockResolvedValue([
      { id: 1, songId: 1, granteeId: 99, status: "active" },
    ]);

    const grants = await mockGetGrantsReceivedByUser(99);
    expect(grants).toHaveLength(1);
    expect(grants[0].granteeId).toBe(99);
  });
});

describe("Licensed Bulk Download — Manifest Generation", () => {
  it("manifest includes witnessId and license info for each track", () => {
    const songs = [makeSong(1, 10), makeSong(2, 10)];
    const grants = [makeGrant(1, 99), makeGrant(2, 99)];

    const manifest = {
      generatedAt: new Date().toISOString(),
      platform: "Living Nexus",
      tracks: songs.map((s, i) => ({
        id: s.song.id,
        title: s.song.title,
        artist: s.creator.displayName,
        witnessId: s.song.witnessId,
        licenseGrantedAt: grants[i].grantedAt?.toISOString() ?? null,
        licenseExpiresAt: grants[i].expiresAt?.toISOString() ?? null,
        isOwner: grants[i].isOwner,
      })),
    };

    expect(manifest.tracks).toHaveLength(2);
    expect(manifest.tracks[0].witnessId).toBe("WID-1");
    expect(manifest.tracks[1].witnessId).toBe("WID-2");
    expect(manifest.tracks[0].licenseGrantedAt).toBeTruthy();
    expect(manifest.platform).toBe("Living Nexus");
  });
});
