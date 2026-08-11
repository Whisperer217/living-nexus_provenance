import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const mainLayoutPath = path.resolve(process.cwd(), "client/src/components/layout/MainLayout.tsx");
const playlistDrawerPath = path.resolve(process.cwd(), "client/src/components/player/PlaylistDrawer.tsx");

describe("MainLayout Loop surface insulation", () => {
  it("keeps marketplace chrome off Loop layouts and routes SHOP to PNA Store", () => {
    const layoutSource = fs.readFileSync(mainLayoutPath, "utf8");
    const playlistSource = fs.readFileSync(playlistDrawerPath, "utf8");

    expect(layoutSource).not.toContain("<MarketplaceDrawer");
    expect(layoutSource).not.toContain('isExploreSurface');
    expect(playlistSource).toContain('window.location.href = "/avatar-registry"');
    expect(playlistSource).not.toContain('ln:open-shop');
  });
});
