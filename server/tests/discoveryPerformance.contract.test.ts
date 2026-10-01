import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const explorePagePath = path.resolve(process.cwd(), "client/src/pages/ExplorePage.tsx");
const songsRouterPath = path.resolve(process.cwd(), "server/routers/songs.ts");

describe("discovery performance contract", () => {
  it("uses cursor pages for the complete Works index instead of requesting 700 records", () => {
    const source = fs.readFileSync(explorePagePath, "utf8");

    expect(source).toContain("discoverInfinite.useInfiniteQuery");
    expect(source).toContain("WORK_PAGE_SIZE");
    expect(source).toContain("getNextPageParam: (lastPage) => lastPage.nextCursor");
    expect(source).toContain("fetchNextPage");
    expect(source).not.toContain("const MAX_LIMIT = 700");
  });

  it("keeps the curated Explore payload bounded", () => {
    const source = fs.readFileSync(songsRouterPath, "utf8");

    expect(source).toContain("limit: z.number().int().min(8).max(24).optional()");
    expect(source).toContain("const sectionLimit = input?.limit ?? 16");
  });
});
