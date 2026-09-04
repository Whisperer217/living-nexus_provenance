import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const explorePagePath = path.resolve(process.cwd(), "client/src/pages/ExplorePage.tsx");
const mainLayoutPath = path.resolve(process.cwd(), "client/src/components/layout/MainLayout.tsx");

describe("Explore public-surface contract", () => {
  it("keeps Explore songs-and-artists only and free of store commerce CTAs", () => {
    const exploreSource = fs.readFileSync(explorePagePath, "utf8");
    const layoutSource = fs.readFileSync(mainLayoutPath, "utf8");

    expect(exploreSource).toContain('type ViewMode = "list" | "creators"');
    expect(exploreSource).toContain('viewMode === "list"');
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

  it("uses a bounded normal-scale discovery plane with readable showcase cards", () => {
    const exploreSource = fs.readFileSync(explorePagePath, "utf8");

    expect(exploreSource).toContain("max-w-[1360px]");
    expect(exploreSource).toContain('clamp(2.25rem,1.8rem + 2vw,3.25rem)');
    expect(exploreSource).toContain("xl:w-[12rem]");
    expect(exploreSource).toContain("text-sm font-medium leading-tight");
  });
});
