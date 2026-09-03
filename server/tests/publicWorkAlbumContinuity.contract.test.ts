import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("public Work → album continuity contract", () => {
  it("discloses only a public parent collection through the established read boundary", () => {
    const router = source("server/routers/songs.ts");

    expect(router).toContain("getCollectionForSong: publicProcedure");
    expect(router).toContain('if (!collection || collection.visibility !== "public") return null;');
    expect(router).toContain("collectionWid: collection.collectionWid");
    expect(router).toContain("trackCount: collection.trackCount");
  });

  it("renders a compact read-only album route from the public Work page", () => {
    const workPage = source("client/src/pages/loop/LoopWorkPage.tsx");

    expect(workPage).toContain("trpc.songs.getCollectionForSong.useQuery");
    expect(workPage).toContain("Part of album");
    expect(workPage).toContain("href={`/creator/${creator.artistHandle}/albums`}");
    expect(workPage).toContain("parentAlbum.collectionWid");
  });

  it("does not add a public collection mutation, Work update, WID, or provenance writer", () => {
    const workPage = source("client/src/pages/loop/LoopWorkPage.tsx");
    const lookup = source("server/routers/songs.ts").slice(
      source("server/routers/songs.ts").indexOf("getCollectionForSong: publicProcedure"),
      source("server/routers/songs.ts").indexOf("delete: protectedProcedure"),
    );

    expect(workPage).not.toContain("collectionStudio.");
    expect(lookup).not.toContain(".mutation(");
    expect(lookup).not.toContain("updateSong");
    expect(lookup).not.toContain("generateWID");
    expect(lookup).not.toContain("createWorkEvent");
  });
});
