import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  lookupExistingWorkByFileHash,
  type DuplicateWorkLookupSource,
} from "../domains/registry/lookupExistingWorkByFileHash";

const helperPath = path.resolve(
  process.cwd(),
  "server/domains/registry/lookupExistingWorkByFileHash.ts"
);
const songsRouterPath = path.resolve(process.cwd(), "server/routers/songs.ts");
const knownCreatedAt = new Date("2026-08-17T12:00:00.000Z");

function sourceFor(
  match: Awaited<ReturnType<DuplicateWorkLookupSource["findByFileHash"]>>,
  creator: Awaited<ReturnType<DuplicateWorkLookupSource["getCreatorById"]>> = null
): DuplicateWorkLookupSource {
  return {
    findByFileHash: vi.fn().mockResolvedValue(match),
    getCreatorById: vi.fn().mockResolvedValue(creator),
  };
}

describe("lookupExistingWorkByFileHash", () => {
  it("preserves no-match behavior without loading a creator", async () => {
    const source = sourceFor(null);

    await expect(
      lookupExistingWorkByFileHash("a".repeat(64), 7, source)
    ).resolves.toEqual({ duplicate: false });
    expect(source.getCreatorById).not.toHaveBeenCalled();
  });

  it("preserves own-match values and owner visibility semantics", async () => {
    const source = sourceFor(
      {
        id: 42,
        title: "Owned record",
        witnessId: "WID-MUS-OWNED",
        userId: 7,
        createdAt: knownCreatedAt,
      },
      { artistHandle: "DocSMercer", name: "Doc Seraph Mercer" }
    );

    await expect(
      lookupExistingWorkByFileHash("b".repeat(64), 7, source)
    ).resolves.toEqual({
      duplicate: true,
      isOwnWork: true,
      existingTitle: "Owned record",
      existingWid: "WID-MUS-OWNED",
      existingCreator: "DocSMercer",
      existingCreatedAt: knownCreatedAt,
    });
  });

  it("preserves other-creator duplicate behavior and falls back to creator name", async () => {
    const source = sourceFor(
      {
        id: 43,
        title: "Other creator record",
        witnessId: null,
        userId: 9,
        createdAt: knownCreatedAt,
      },
      { artistHandle: null, name: "Other Creator" }
    );

    await expect(
      lookupExistingWorkByFileHash("c".repeat(64), 7, source)
    ).resolves.toEqual({
      duplicate: true,
      isOwnWork: false,
      existingTitle: "Other creator record",
      existingWid: null,
      existingCreator: "Other Creator",
      existingCreatedAt: knownCreatedAt,
    });
  });

  it("keeps authorization at the protected facade and supplies only ctx.user.id as requester identity", () => {
    const routerSource = fs.readFileSync(songsRouterPath, "utf8");
    const duplicateStart = routerSource.indexOf("checkDuplicate: protectedProcedure");
    const discoverStart = routerSource.indexOf("discover: publicProcedure", duplicateStart);
    const facade = routerSource.slice(duplicateStart, discoverStart);

    expect(facade).toContain("checkDuplicate: protectedProcedure");
    expect(facade).toContain("lookupExistingWorkByFileHash(input.fileHash, ctx.user.id)");
    expect(facade).not.toContain("input.requesterId");
  });

  it("keeps the helper read-only with no Work, WID, provenance, asset, payment, or Player writes", () => {
    const source = fs.readFileSync(helperPath, "utf8");

    expect(source).not.toMatch(
      /createSong|insertWid|addWorkEvent|storagePut|enqueueVisualJob|updateSong|recordPlay|Stripe/
    );
  });
});
