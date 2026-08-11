import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const mainLayoutPath = path.resolve(process.cwd(), "client/src/components/layout/MainLayout.tsx");

describe("MainLayout Explore surface insulation", () => {
  it("keeps the marketplace drawer off the public Explore route", () => {
    const source = fs.readFileSync(mainLayoutPath, "utf8");

    expect(source).toContain('const isExploreSurface = location === "/explore" || location.startsWith("/explore?")');
    expect(source).toContain("{!isExploreSurface && <MarketplaceDrawer />}");
  });
});
