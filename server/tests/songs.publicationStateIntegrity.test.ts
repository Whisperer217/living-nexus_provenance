import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";

vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    updateSongMetadata: vi.fn().mockResolvedValue(undefined),
    updateSongStatus: vi.fn().mockResolvedValue(undefined),
  };
});

import {
  isPublicForSongStatus,
  updateSongMetadata,
  updateSongStatus,
} from "../utils/db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 42): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "publication-state-test-user",
    email: "publication-state@example.com",
    name: "Publication State Tester",
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

describe("songs publication-state integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps every lifecycle status to the established public-visibility invariant", () => {
    expect(isPublicForSongStatus("Draft")).toBe(false);
    expect(isPublicForSongStatus("Published")).toBe(true);
    expect(isPublicForSongStatus("Unlisted")).toBe(false);
    expect(isPublicForSongStatus("Deleted")).toBe(false);
  });

  it.each([
    ["Draft", "Published"],
    ["Published", "Unlisted"],
    ["Unlisted", "Published"],
  ] as const)("routes %s → %s through the dedicated status authority", async (_from, to) => {
    const caller = appRouter.createCaller(createAuthContext());

    await expect(caller.songs.updateStatus({ songId: 7, status: to })).resolves.toEqual({ success: true });

    expect(updateSongStatus).toHaveBeenCalledWith(7, 42, to);
    expect(updateSongMetadata).not.toHaveBeenCalled();
  });

  it.each([
    ["Draft", "draft metadata"],
    ["Published", "published metadata"],
  ] as const)("saves %s metadata without a lifecycle write", async (_status, caption) => {
    const caller = appRouter.createCaller(createAuthContext());

    await expect(caller.songs.updateMetadata({ songId: 7, caption })).resolves.toEqual({ success: true });

    expect(updateSongMetadata).toHaveBeenCalledWith(7, 42, expect.objectContaining({ caption }));
    expect(updateSongStatus).not.toHaveBeenCalled();
    expect((updateSongMetadata as ReturnType<typeof vi.fn>).mock.calls[0][2]).not.toHaveProperty("status");
  });

  it("rejects an attempted lifecycle status through ordinary metadata mutation", async () => {
    const caller = appRouter.createCaller(createAuthContext());

    await expect(
      caller.songs.updateMetadata({ songId: 7, status: "Published" } as never)
    ).rejects.toThrow();

    expect(updateSongMetadata).not.toHaveBeenCalled();
    expect(updateSongStatus).not.toHaveBeenCalled();
  });
});
