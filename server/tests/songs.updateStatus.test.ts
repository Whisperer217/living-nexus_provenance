import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";

// Mock the db module so no real DB calls are made
vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    updateSongStatus: vi.fn().mockResolvedValue(undefined),
  };
});

import { updateSongStatus } from "../utils/db";

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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("songs.updateStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateSongStatus with correct args and returns success", async () => {
    const ctx = createAuthContext(42);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.songs.updateStatus({ songId: 7, status: "Draft" });

    expect(result).toEqual({ success: true });
    expect(updateSongStatus).toHaveBeenCalledOnce();
    expect(updateSongStatus).toHaveBeenCalledWith(7, 42, "Draft");
  });

  it("accepts all four valid status values", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const statuses = ["Draft", "Published", "Unlisted", "Deleted"] as const;

    for (const status of statuses) {
      await expect(caller.songs.updateStatus({ songId: 1, status })).resolves.toEqual({ success: true });
    }
    expect(updateSongStatus).toHaveBeenCalledTimes(4);
  });

  it("rejects an invalid status value", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.songs.updateStatus({ songId: 1, status: "Archived" as any })
    ).rejects.toThrow();
  });
});
