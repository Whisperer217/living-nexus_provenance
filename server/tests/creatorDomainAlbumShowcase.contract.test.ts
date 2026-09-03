import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("creator-domain album showcase contracts", () => {
  it("reuses the existing collection route and presents Albums as a linked-track gateway", () => {
    const hub = read("client/src/components/CreatorDomainHub.tsx");
    expect(hub).toContain('href: (handle) => `/creator/${handle}/albums`');
    expect(hub).toContain("Linked tracks · WID-ALB collections");
    expect(hub).toContain("Open the album shelf to hear linked tracks in creator-defined order");
    expect(hub).toContain('isAlbumModule ? "col-span-2 lg:col-span-2"');
  });

  it("keeps visitor album projections public while owners retain their private management view", () => {
    const profile = read("server/routers/profile.ts");
    expect(profile).toContain("const isOwner = ctx.user?.id === creatorId");
    expect(profile).toContain("collection.visibility === 'public'");
    expect(profile).toContain("ctx.user?.id === creatorId");
    expect(profile).toContain("getCollectionsByCreator(creatorId)");
  });

  it("does not introduce a second album linkage or modify registry authority", () => {
    const hub = read("client/src/components/CreatorDomainHub.tsx");
    const profile = read("server/routers/profile.ts");
    const creatorHubProjection = profile.slice(
      profile.indexOf("creatorHub: publicProcedure"),
      profile.indexOf("getCreatorCollection: publicProcedure"),
    );
    expect(hub).not.toMatch(/generateWID|workEvents|setSongPublicationStatus/);
    expect(creatorHubProjection).not.toMatch(/generateWID|workEvents|setSongPublicationStatus|linkSongsToCollection/);
  });
});
