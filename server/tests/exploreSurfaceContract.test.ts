import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const explorePagePath = path.resolve(process.cwd(), "client/src/pages/ExplorePage.tsx");
const mainLayoutPath = path.resolve(process.cwd(), "client/src/components/layout/MainLayout.tsx");

describe("Explore public-surface contract", () => {
  it("keeps music and creator discovery free of store, skins, and guides calls to action", () => {
    const exploreSource = fs.readFileSync(explorePagePath, "utf8");
    const layoutSource = fs.readFileSync(mainLayoutPath, "utf8");

    expect(exploreSource).toContain("SUPPLEMENTAL_SECTIONS.map(section");
    expect(exploreSource).not.toContain("Open PNA Store");
    expect(exploreSource).not.toContain("SKINS & GUIDES LIVE IN PNA");
    expect(layoutSource).toContain("{!isExploreSurface && <MarketplaceDrawer />}");
  });
});
