import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const explorePagePath = path.resolve(process.cwd(), "client/src/pages/ExplorePage.tsx");
const mainLayoutPath = path.resolve(process.cwd(), "client/src/components/layout/MainLayout.tsx");

describe("Explore public-surface contract", () => {
  it("keeps Explore songs-and-artists only and free of store commerce CTAs", () => {
    const exploreSource = fs.readFileSync(explorePagePath, "utf8");
    const layoutSource = fs.readFileSync(mainLayoutPath, "utf8");

    expect(exploreSource).toContain('title: "Songs"');
    expect(exploreSource).toContain("Songs & artists");
    expect(exploreSource).not.toContain('title: "Books"');
    expect(exploreSource).not.toContain('title: "Film"');
    expect(exploreSource).not.toContain('title: "Doctrine"');
    expect(exploreSource).not.toContain("Open PNA Store");
    expect(exploreSource).not.toContain("SKINS & GUIDES LIVE IN PNA");
    expect(exploreSource).not.toContain("Keeper Skins");
    expect(layoutSource).not.toContain("<MarketplaceDrawer");
    expect(layoutSource).toContain("not Loop chrome");
  });
});
