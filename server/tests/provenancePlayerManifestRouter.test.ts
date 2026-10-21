import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";
import { collectionWidFromCollectiveHash, computeCollectionCollectiveHash } from "../domains/collections/collectionCompositionSeal";

vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    getPlaylistById: vi.fn(),
    getProvenancePlayerPlaylistTrackSources: vi.fn(),
    getCollectionByWid: vi.fn(),
    getProvenancePlayerAlbumTrackSources: vi.fn(),
    getProvenancePlayerTrackSourceById: vi.fn(),
    hasAmbiguousProvenancePlayerWids: vi.fn(),
  };
});

import {
  getPlaylistById,
  getProvenancePlayerPlaylistTrackSources,
  getCollectionByWid,
  getProvenancePlayerAlbumTrackSources,
  getProvenancePlayerTrackSourceById,
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
      userId: 42,
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
    creator: { id: 42, artistHandle: "manifestcreator", name: "Manifest Creator" },
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

  it("exports a valid name-only Creator rather than treating a null handle as absent attribution", async () => {
    (getPlaylistById as any).mockResolvedValue({ id: 7, ownerId: 42, coverArtUrl: null });
    const namedCreator = source(9, "WID-MUS-NAMED-CREATOR");
    namedCreator.creator = { id: 6330001, artistHandle: null, name: "MAKER & THE MaiTRIX" };
    (getProvenancePlayerPlaylistTrackSources as any).mockResolvedValue([namedCreator]);

    const result = await appRouter.createCaller(context()).playlists.copyProvenancePlayerManifest({ id: 7 });

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]?.creator).toBe("MAKER & THE MaiTRIX");
  });

  it("rejects the entire owner playlist when a Creator record is genuinely absent", async () => {
    (getPlaylistById as any).mockResolvedValue({ id: 7, ownerId: 42, coverArtUrl: null });
    const missingCreator = source(9, "WID-MUS-NO-CREATOR");
    missingCreator.creator = null;
    (getProvenancePlayerPlaylistTrackSources as any).mockResolvedValue([missingCreator]);

    await expect(appRouter.createCaller(context()).playlists.copyProvenancePlayerManifest({ id: 7 }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "Manifest unavailable" });
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
    const orderedSources = [source(4, "WID-MUS-FOUR"), source(1, "WID-MUS-ONE")];
    const collectiveHash = computeCollectionCollectiveHash(orderedSources.map((row) => row.song.witnessId));
    (getCollectionByWid as any).mockResolvedValue({
      id: 11,
      creatorId: 42,
      visibility: "public",
      name: "Ordered Album",
      coverArtUrl: "https://media.example.test/album.webp",
      collectiveHash,
      collectionWid: collectionWidFromCollectiveHash(collectiveHash),
      trackCount: orderedSources.length,
    });
    (getProvenancePlayerAlbumTrackSources as any).mockResolvedValue(orderedSources);

    const result = await appRouter.createCaller(context()).songs.copyProvenancePlayerAlbumManifest({ collectionWid: "WID-ALB-ORDERED" });

    expect(result.tracks.map(track => track.workId)).toEqual(["4", "1"]);
    expect(result.tracks.every(track => track.album === "Ordered Album")).toBe(true);
  });

  it("does not export a current album manifest when its stored WID-ALB origin membership is stale", async () => {
    const orderedSources = [source(4, "WID-MUS-FOUR"), source(1, "WID-MUS-ONE")];
    const collectiveHash = computeCollectionCollectiveHash(["WID-MUS-FOUR", "WID-MUS-THREE"]);
    (getCollectionByWid as any).mockResolvedValue({
      id: 11,
      creatorId: 42,
      visibility: "public",
      name: "Stale Album",
      collectiveHash,
      collectionWid: collectionWidFromCollectiveHash(collectiveHash),
      trackCount: orderedSources.length,
    });
    (getProvenancePlayerAlbumTrackSources as any).mockResolvedValue(orderedSources);

    await expect(appRouter.createCaller(context()).songs.copyProvenancePlayerAlbumManifest({ collectionWid: "WID-ALB-STALE" }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "Manifest unavailable" });
    expect(hasAmbiguousProvenancePlayerWids).not.toHaveBeenCalled();
  });

  it("does not export a private or differently owned album", async () => {
    (getCollectionByWid as any).mockResolvedValue({ id: 11, creatorId: 99, visibility: "private" });

    await expect(appRouter.createCaller(context()).songs.copyProvenancePlayerAlbumManifest({ collectionWid: "WID-ALB-PRIVATE" }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "Manifest unavailable" });
    expect(getProvenancePlayerAlbumTrackSources).not.toHaveBeenCalled();
  });

  it("exports one eligible Work only for its current creator through the same gateway-only manifest adapter", async () => {
    const work = source(60001, "WID-MUS-PUSH-FORWARD");
    (getProvenancePlayerTrackSourceById as any).mockResolvedValue(work);

    const result = await appRouter.createCaller(context()).songs.copyProvenancePlayerWorkManifest({ songId: 60001 });

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]).toMatchObject({
      title: "Track 60001",
      workId: "60001",
      wid: "WID-MUS-PUSH-FORWARD",
      audioUrl: "https://www.livingnexus.org/api/provenance-player/media/60001",
    });
    expect(JSON.stringify(result)).not.toContain("https://media.example.test/60001.mp3");
    expect(hasAmbiguousProvenancePlayerWids).toHaveBeenCalledWith(["WID-MUS-PUSH-FORWARD"]);
  });

  it("does not disclose a non-owner Work manifest", async () => {
    const work = source(60001, "WID-MUS-OTHER-CREATOR");
    work.song.userId = 99;
    (getProvenancePlayerTrackSourceById as any).mockResolvedValue(work);

    await expect(appRouter.createCaller(context()).songs.copyProvenancePlayerWorkManifest({ songId: 60001 }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "Manifest unavailable" });
    expect(hasAmbiguousProvenancePlayerWids).not.toHaveBeenCalled();
  });

  it("rejects an individual Work whose canonical WID is ambiguous", async () => {
    (getProvenancePlayerTrackSourceById as any).mockResolvedValue(source(60001, "WID-MUS-DUPLICATE"));
    (hasAmbiguousProvenancePlayerWids as any).mockResolvedValue(true);

    await expect(appRouter.createCaller(context()).songs.copyProvenancePlayerWorkManifest({ songId: 60001 }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "Manifest unavailable" });
  });
});
