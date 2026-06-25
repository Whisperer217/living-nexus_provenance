/**
 * songs.discoverInfinite — cursor-based pagination contract tests
 *
 * Verifies:
 *   1. Returns { items, nextCursor } shape
 *   2. nextCursor is null when the feed is exhausted (fewer rows than limit)
 *   3. nextCursor advances by limit when more rows exist
 *   4. Respects the limit cap (max 60)
 *   5. Filters are forwarded to getPublicSongs
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";

// ── Mock getPublicSongs so no real DB calls are made ──────────────────────────
vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    getPublicSongs: vi.fn(),
  };
});

import { getPublicSongs } from "../utils/db";
const mockGetPublicSongs = getPublicSongs as ReturnType<typeof vi.fn>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

/** Build N fake song rows */
function makeSongs(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    song: { id: i + 1, title: `Track ${i + 1}`, isPublic: true, status: "Published" },
    creator: { id: 100, name: "Test Creator", artistHandle: "test" },
  }));
}

describe("songs.discoverInfinite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns items and a null nextCursor when feed is exhausted", async () => {
    // DB returns exactly `limit` rows — no extra row means no next page
    mockGetPublicSongs.mockResolvedValue(makeSongs(24));

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.songs.discoverInfinite({ limit: 24, cursor: 0 });

    expect(result.items).toHaveLength(24);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor = limit when more rows exist", async () => {
    // DB returns limit + 1 rows — the extra row signals hasMore = true
    mockGetPublicSongs.mockResolvedValue(makeSongs(25));

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.songs.discoverInfinite({ limit: 24, cursor: 0 });

    expect(result.items).toHaveLength(24); // extra row stripped
    expect(result.nextCursor).toBe(24);    // cursor advances by limit
  });

  it("advances cursor correctly on second page", async () => {
    mockGetPublicSongs.mockResolvedValue(makeSongs(25));

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.songs.discoverInfinite({ limit: 24, cursor: 24 });

    // Verify offset was forwarded to getPublicSongs
    expect(mockGetPublicSongs).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 24, limit: 25 })
    );
    expect(result.nextCursor).toBe(48);
  });

  it("returns null nextCursor on last partial page", async () => {
    // Only 10 rows remain — less than limit
    mockGetPublicSongs.mockResolvedValue(makeSongs(10));

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.songs.discoverInfinite({ limit: 24, cursor: 96 });

    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).toBeNull();
  });

  it("forwards genre and search filters to getPublicSongs", async () => {
    mockGetPublicSongs.mockResolvedValue([]);

    const caller = appRouter.createCaller(createPublicContext());
    await caller.songs.discoverInfinite({
      limit: 24,
      cursor: 0,
      genre: "Jazz",
      search: "midnight",
      contentType: "audio",
    });

    expect(mockGetPublicSongs).toHaveBeenCalledWith(
      expect.objectContaining({
        genre: "Jazz",
        search: "midnight",
        contentType: "audio",
      })
    );
  });

  it("rejects limit above 60", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.songs.discoverInfinite({ limit: 61 })
    ).rejects.toThrow();
  });

  it("uses default limit of 24 when none provided", async () => {
    mockGetPublicSongs.mockResolvedValue(makeSongs(10));

    const caller = appRouter.createCaller(createPublicContext());
    await caller.songs.discoverInfinite({});

    expect(mockGetPublicSongs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25 }) // default 24 + 1 extra probe
    );
  });
});
