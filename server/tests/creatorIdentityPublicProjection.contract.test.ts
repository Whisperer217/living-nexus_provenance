import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/CreatorIdentityPage.tsx"), "utf8");

describe("Creator Identity public projection migration", () => {
  it("uses the canonical public DTO route and public Work count", () => {
    expect(page).toContain("trpc.profile.getPublicById.useQuery");
    expect(page).not.toContain("trpc.profile.getById.useQuery");
    expect(page).toContain("const manifestationCount = creator.publishedWorkCount;");
    expect(page).not.toContain("trpc.songs.countByCreator.useQuery");
  });

  it("does not render account roles, licensing, or slot state", () => {
    expect(page).not.toContain("creator.songSlotsUsed");
    expect(page).not.toContain("creator.licenseStatus");
    expect(page).not.toContain("creator as any).role");
    expect(page).not.toContain("Crown,");
  });
});
