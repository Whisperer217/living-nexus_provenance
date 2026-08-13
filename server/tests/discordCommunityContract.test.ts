import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Discord community release contract", () => {
  const chromeSurfaces = [
    "client/src/components/layout/LeftRail.tsx",
    "client/src/components/layout/MainLayout.tsx",
    "client/src/components/layout/TopBar.tsx",
    "client/src/pages/HomePage.tsx",
  ];

  it("centralizes the non-expiring invite", () => {
    const loopProduct = source("client/src/lib/loopProduct.ts");
    expect(loopProduct).toContain('export const DISCORD_COMMUNITY_URL = "https://discord.gg/dqCmTY5Ucb"');
    expect(loopProduct).not.toContain("ADF9dtVA");
    expect(loopProduct).not.toContain("GfyPrjzU6");
  });

  it("routes each community entry point through that shared constant", () => {
    for (const path of [
      "client/src/components/WelcomeModal.tsx",
      "client/src/components/layout/LeftRail.tsx",
      "client/src/components/layout/MainLayout.tsx",
      "client/src/components/layout/TopBar.tsx",
      "client/src/pages/AttributionPage.tsx",
      "client/src/pages/HomePage.tsx",
    ]) {
      const file = source(path);
      expect(file).toContain("DISCORD_COMMUNITY_URL");
      expect(file).not.toMatch(/discord\.gg\/(?:ADF9dtVA|GfyPrjzU6)/);
    }
  });

  it("uses cathedral tokens and the shared active Discord glyph on Loop chrome", () => {
    for (const path of chromeSurfaces) {
      const file = source(path);
      expect(file).toContain("var(--ln-gold)");
      for (const color of ["#5865F2", "#A5B4FC", "#8B9CF6", "#C7D2FE", "#1e1f22"]) {
        expect(file).not.toContain(color);
      }
    }

    expect(source("client/src/components/layout/LeftRail.tsx")).toContain(
      'from "@/components/icons/DiscordGlyph"',
    );
    for (const path of chromeSurfaces.slice(1, 3)) {
      expect(source(path)).toContain("SharedDiscordGlyph");
    }
  });
});
