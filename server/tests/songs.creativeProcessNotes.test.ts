import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";

vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    getSongById: vi.fn(),
    updateSongMetadata: vi.fn().mockResolvedValue(undefined),
    addWorkEvent: vi.fn().mockResolvedValue(undefined),
  };
});

import { addWorkEvent, getSongById, updateSongMetadata } from "../utils/db";

const creator = {
  id: 42, openId: "creator-process-test", email: "creator@example.com", name: "Creator",
  loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
} as NonNullable<TrpcContext["user"]>;

function caller() {
  return appRouter.createCaller({ user: creator, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext);
}

describe("creator process notes lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSongById).mockResolvedValue({
      id: 7, userId: creator.id, witnessId: "WID-MUS-EXAMPLE", creativeProcessNotes: "Original instrumentation",
      releaseDate: null, creatorReleaseDate: null,
    } as any);
  });

  it("preserves an existing note when other Work metadata is edited", async () => {
    await expect(caller().songs.updateMetadata({ songId: 7, title: "Revised title" })).resolves.toEqual({ success: true });
    expect(updateSongMetadata).toHaveBeenCalledWith(7, 42, expect.not.objectContaining({ creativeProcessNotes: expect.anything() }));
    expect(addWorkEvent).not.toHaveBeenCalled();
  });

  it("keeps long-form creator text intact while the revision event omits it", async () => {
    const notes = "Style prompt: warm analog texture\nInstrumentation: strings, piano\nProduction notes: leave room for the vocal";
    await expect(caller().songs.updateMetadata({ songId: 7, creativeProcessNotes: notes })).resolves.toEqual({ success: true });
    expect(updateSongMetadata).toHaveBeenCalledWith(7, 42, expect.objectContaining({ creativeProcessNotes: notes }));
    expect(addWorkEvent).toHaveBeenCalledWith(expect.objectContaining({
      songId: 7, eventType: "creator_process_notes_revised", actorId: 42,
      eventData: expect.objectContaining({ previousPresent: true, currentPresent: true }),
    }));
    expect(JSON.stringify(vi.mocked(addWorkEvent).mock.calls)).not.toContain(notes);
  });

  it("allows deliberate clearing without rewriting the WID", async () => {
    await caller().songs.updateMetadata({ songId: 7, creativeProcessNotes: null });
    expect(updateSongMetadata).toHaveBeenCalledWith(7, 42, expect.objectContaining({ creativeProcessNotes: null }));
    expect(addWorkEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventData: expect.objectContaining({ witnessId: "WID-MUS-EXAMPLE", currentPresent: false }),
    }));
  });
});
