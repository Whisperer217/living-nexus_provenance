import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    addComment: vi.fn(),
    createEvent: vi.fn(),
    createNotification: vi.fn(),
    getCommentById: vi.fn(),
    getCommentsBySong: vi.fn(),
    getSongById: vi.fn(),
  };
});

import { commentsRouter } from "../routers/comments";
import {
  addComment,
  createEvent,
  createNotification,
  getCommentById,
  getCommentsBySong,
  getSongById,
} from "../utils/db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const publicWork = {
  id: 60001,
  title: "PUSH FORWARD",
  userId: 1,
  isPublic: true,
  status: "Published" as const,
  moderationStatus: "clear" as const,
};

function createAuthContext(userId = 42): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "comment-target-open-id",
    email: "listener@example.com",
    name: "Listener Name",
    artistHandle: "listenerHandle",
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

describe("comments target integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSongById as any).mockResolvedValue(publicWork);
    (getCommentById as any).mockResolvedValue({ id: 91, songId: publicWork.id });
    (addComment as any).mockResolvedValue({ id: 92, mentions: [] });
    (getCommentsBySong as any).mockResolvedValue([]);
  });

  it("writes a top-level Voice only after resolving its public canonical Work and uses server identity", async () => {
    const caller = commentsRouter.createCaller(createAuthContext());

    await expect(caller.add({ songId: publicWork.id, content: "A careful signal" }))
      .resolves.toMatchObject({ success: true, commentId: 92 });

    expect(getSongById).toHaveBeenCalledWith(publicWork.id);
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      workId: publicWork.id,
      actorName: "listenerHandle",
    }));
    expect(addComment).toHaveBeenCalledWith(expect.objectContaining({
      songId: publicWork.id,
      authorName: "listenerHandle",
    }));
  });

  it("rejects an unavailable Work before an event, comment, or notification write", async () => {
    (getSongById as any).mockResolvedValue(undefined);
    const caller = commentsRouter.createCaller(createAuthContext());

    await expect(caller.add({ songId: 999_999, content: "Should never persist" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(createEvent).not.toHaveBeenCalled();
    expect(addComment).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("rejects a cross-Work reply before a comment write", async () => {
    (getCommentById as any).mockResolvedValue({ id: 91, songId: 60002 });
    const caller = commentsRouter.createCaller(createAuthContext());

    await expect(caller.addReply({ songId: publicWork.id, parentId: 91, content: "Wrong target" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(addComment).not.toHaveBeenCalled();
  });

  it("lists Voices only after the Work passes the same public availability policy", async () => {
    (getSongById as any).mockResolvedValue({ ...publicWork, status: "Unlisted" });
    const caller = commentsRouter.createCaller(createAuthContext());

    await expect(caller.list({ songId: publicWork.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(getCommentsBySong).not.toHaveBeenCalled();
  });
});
