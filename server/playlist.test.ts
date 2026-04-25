/**
 * Playlist tRPC procedure tests
 * Tests: playlist.check, playlist.add, playlist.remove, playlist.get
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock the DB helpers so tests don't need a real database ──────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    isInPlaylist: vi.fn(),
    addToPlaylist: vi.fn(),
    removeFromPlaylist: vi.fn(),
    getPlaylist: vi.fn(),
  };
});

import { isInPlaylist, addToPlaylist, removeFromPlaylist, getPlaylist } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 42): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { headers: {}, cookies: {} } as any,
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
  };
}

describe("playlist.check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns inPlaylist: true when song is in playlist", async () => {
    (isInPlaylist as any).mockResolvedValue(true);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.playlist.check({ songId: 1 });
    expect(result.inPlaylist).toBe(true);
    expect(isInPlaylist).toHaveBeenCalledWith(42, 1);
  });

  it("returns inPlaylist: false when song is not in playlist", async () => {
    (isInPlaylist as any).mockResolvedValue(false);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.playlist.check({ songId: 99 });
    expect(result.inPlaylist).toBe(false);
  });
});

describe("playlist.add", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns added: true when song is new to playlist", async () => {
    (addToPlaylist as any).mockResolvedValue({ added: true });
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.playlist.add({ songId: 5 });
    expect(result.added).toBe(true);
    expect(addToPlaylist).toHaveBeenCalledWith(42, 5);
  });

  it("returns added: false when song already in playlist (idempotent)", async () => {
    (addToPlaylist as any).mockResolvedValue({ added: false });
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.playlist.add({ songId: 5 });
    expect(result.added).toBe(false);
  });
});

describe("playlist.remove", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes song and returns removed: true", async () => {
    (removeFromPlaylist as any).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.playlist.remove({ songId: 7 });
    expect(result.removed).toBe(true);
    expect(removeFromPlaylist).toHaveBeenCalledWith(42, 7);
  });
});

describe("playlist.get", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when playlist is empty", async () => {
    (getPlaylist as any).mockResolvedValue([]);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.playlist.get();
    expect(result).toEqual([]);
    expect(getPlaylist).toHaveBeenCalledWith(42);
  });

  it("returns playlist items for the authenticated user", async () => {
    const mockItems = [
      {
        id: 1,
        position: 0,
        addedAt: new Date(),
        song: { id: 10, title: "Test Song", genre: "Gospel", fileUrl: "https://cdn.example.com/test.mp3",
          coverArtUrl: null, witnessId: "WID-TEST-001", durationSeconds: 180, playCount: 5, tipCount: 1, status: "Published" },
        creator: { id: 100, name: "Test Artist", artistHandle: "testartist", profilePhotoUrl: null, aiDisclosure: "original" },
      },
    ];
    (getPlaylist as any).mockResolvedValue(mockItems);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.playlist.get();
    expect(result).toHaveLength(1);
    expect(result[0].song.title).toBe("Test Song");
  });
});
