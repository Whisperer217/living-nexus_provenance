import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";

vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    getPlaylistById: vi.fn(),
    getProvenancePlayerPlaylistTrackSources: vi.fn(),
    getCollectionByWid: vi.fn(),
    getProvenancePlayerAlbumTrackSources: vi.fn(),
    hasAmbiguousProvenancePlayerWids: vi.fn(),
  };
});

import {
  getPlaylistById,
  getProvenancePlayerPlaylistTrackSources,
  getCollectionByWid,
  getProvenancePlayerAlbumTrackSources,
  hasAmbiguousProvenancePlayerWids,
} from "../utils/db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function context(userId = 42): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "manifest-test-open-id",
    email: "manifest@example.test",
    name: "Manifest Test Creator",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: { headers: {}, cookies: {} } as any, res: { clearCookie: vi.fn(), cookie: vi.fn() } as any };
}

function source(id: number, witnessId: string) {
  return {
    song: {
      id,
      title: `Track ${id}`,
      contentType: "audio",
      status: "Published",
      isPublic: true,
      isFlagged: false,
      witnessId,
      fileUrl: `https://media.example.test/${id}.mp3`,
      coverArtUrl: `https://media.example.test/${id}.webp`,
      externalDisplayRevokedAt: null,
      participationMusic: "Human",
      participationLyrics: "Human",
      participationVoice: "None",
    },
    creator: { artistHandle: "manifestcreator", name: "Manifest Creator" },
  };
}

describe("Provenance Player export procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasAmbiguousProvenancePlayerWids as any).mockResolvedValue(false);
  });

  it("exports the owner playlist in returned membership order", async () => {
    (getPlaylistById as any).mockResolvedValue({ id: 7, ownerId: 42, coverArtUrl: null });
    const ordered = [source(9, "WID-MUS-NINE"), source(2, "WID-MUS-TWO")];
    (getProvenancePlayerPlaylistTrackSources as any).mockResolvedValue(ordered);

    const result = await appRouter.createCaller(context()).playlists.copyProvenancePlayerManifest({ id: 7 });

    expect(result.tracks.map(track => track.workId)).toEqual(["9", "2"]);
    expect(result.tracks.map(track => track.wid)).toEqual(["WID-MUS-NINE", "WID-MUS-TWO"]);
    expect(hasAmbiguousProvenancePlayerWids).toHaveBeenCalledWith(["WID-MUS-NINE", "WID-MUS-TWO"]);
  });

  it("does not disclose a non-owner playlist through manifest export", async () => {
    (getPlaylistById as any).mockResolvedValue({ id: 7, ownerId: 99, coverArtUrl: null });

    await expect(appRouter.createCaller(context()).playlists.copyProvenancePlayerManifest({ id: 7 }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "Manifest unavailable" });
    expect(getProvenancePlayerPlaylistTrackSources).not.toHaveBeenCalled();
  });

  it("rejects an entire owner playlist when its WID identities are ambiguous", async () => {
    (getPlaylistById as any).mockResolvedValue({ id: 7, ownerId: 42, coverArtUrl: null });
    (getProvenancePlayerPlaylistTrackSources as any).mockResolvedValue([source(9, "WID-MUS-DUPLICATE")]);
    (hasAmbiguousProvenancePlayerWids as any).mockResolvedValue(true);

    await expect(appRouter.createCaller(context()).playlists.copyProvenancePlayerManifest({ id: 7 }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "Manifest unavailable" });
  });

  it("exports only a public album owned by the requesting creator and preserves its track order", async () => {
    (getCollectionByWid as any).mockResolvedValue({
      id: 11,
      creatorId: 42,
      visibility: "public",
      name: "Ordered Album",
      coverArtUrl: "https://media.example.test/album.webp",
    });
    (getProvenancePlayerAlbumTrackSources as any).mockResolvedValue([source(4, "WID-MUS-FOUR"), source(1, "WID-MUS-ONE")]);

    const result = await appRouter.createCaller(context()).songs.copyProvenancePlayerAlbumManifest({ collectionWid: "WID-ALB-ORDERED" });

    expect(result.tracks.map(track => track.workId)).toEqual(["4", "1"]);
    expect(result.tracks.every(track => track.album === "Ordered Album")).toBe(true);
  });

  it("does not export a private or differently owned album", async () => {
    (getCollectionByWid as any).mockResolvedValue({ id: 11, creatorId: 99, visibility: "private" });

    await expect(appRouter.createCaller(context()).songs.copyProvenancePlayerAlbumManifest({ collectionWid: "WID-ALB-PRIVATE" }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "Manifest unavailable" });
    expect(getProvenancePlayerAlbumTrackSources).not.toHaveBeenCalled();
  });
});
