import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canExportPlayerSubmission,
  estimateMusicBytes,
} from "../../shared/playerCollections";
const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("../utils/db", () => ({ getDb }));
import { playerCollectionsRouter } from "../routers/playerCollections";
const caller = (user: any = null) =>
  playerCollectionsRouter.createCaller({ user, req: {}, res: {} } as any);
function mockDatabase(resultSets: any[][]) {
  let index = 0;
  const chain: any = {};
  for (const method of [
    "select",
    "from",
    "where",
    "innerJoin",
    "orderBy",
    "for",
  ])
    chain[method] = vi.fn(() => chain);
  chain.limit = vi.fn(async () => resultSets[index++] ?? []);
  return chain;
}
beforeEach(() => vi.clearAllMocks());
describe("player submission permission boundary", () => {
  const approved = {
    status: "selected",
    publicConsent: true,
    terms: "50 units; creator receives agreed payment",
    acceptedTerms: "50 units; creator receives agreed payment",
    sourceHash: "abc",
    currentHash: "abc",
  };
  it("exports only selected, expressly accepted, unchanged recordings", () => {
    expect(canExportPlayerSubmission(approved)).toBe(true);
    expect(
      canExportPlayerSubmission({ ...approved, status: "submitted" })
    ).toBe(false);
    expect(
      canExportPlayerSubmission({ ...approved, publicConsent: false })
    ).toBe(false);
    expect(canExportPlayerSubmission({ ...approved, terms: "new terms" })).toBe(
      false
    );
    expect(
      canExportPlayerSubmission({ ...approved, currentHash: "replacement" })
    ).toBe(false);
    expect(
      canExportPlayerSubmission({
        ...approved,
        sourceHash: null,
        currentHash: null,
      })
    ).toBe(false);
  });
  it("calculates a labeled estimate rather than filling all device storage", () => {
    expect(estimateMusicBytes(50)).toBe(480_000_000);
    expect(estimateMusicBytes(-1)).toBe(0);
  });
  it("requires authentication for submissions and curator authority for export", async () => {
    await expect(
      caller().submit({
        editionId: 1,
        songId: 2,
        kind: "music",
        audienceNotes: "Family",
        publicConsent: true,
        displayTermsVersion: "player-display-v1",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller({ id: 1, role: "user" }).exportManifest({ editionId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getDb).not.toHaveBeenCalled();
  });
  it("rejects submission without explicit display consent", async () => {
    await expect(
      caller({ id: 1, role: "user" }).submit({
        editionId: 1,
        songId: 2,
        kind: "music",
        audienceNotes: "Family",
        publicConsent: false as any,
        displayTermsVersion: "player-display-v1",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getDb).not.toHaveBeenCalled();
  });
  it("rejects a work the caller does not own without inserting anything", async () => {
    const db = mockDatabase([[{ id: 1, status: "open" }], []]);
    getDb.mockResolvedValue(db);
    await expect(
      caller({ id: 1, role: "user" }).submit({
        editionId: 1,
        songId: 2,
        kind: "music",
        audienceNotes: "Family",
        publicConsent: true,
        displayTermsVersion: "player-display-v1",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("rejects duplicate submissions", async () => {
    const db = mockDatabase([
      [{ id: 1, status: "open" }],
      [
        {
          id: 2,
          userId: 1,
          status: "Published",
          contentType: "audio",
          fileUrl: "https://media.example/audio.mp3",
        },
      ],
      [{ id: 9 }],
    ]);
    getDb.mockResolvedValue(db);
    await expect(
      caller({ id: 1, role: "user" }).submit({
        editionId: 1,
        songId: 2,
        kind: "music",
        audienceNotes: "Family",
        publicConsent: true,
        displayTermsVersion: "player-display-v1",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("returns a recoverable error when managed storage is unavailable", async () => {
    getDb.mockResolvedValue(null);
    await expect(caller().editions()).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });
});
