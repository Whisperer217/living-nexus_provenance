import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("Discord community release contract", () => {
  it("centralizes the non-expiring invite in the Loop product contract", () => {
    const loopProduct = projectFile("client/src/lib/loopProduct.ts");

    expect(loopProduct).toContain(
      'export const DISCORD_COMMUNITY_URL = "https://discord.gg/dqCmTY5Ucb"',
    );
    expect(loopProduct).not.toContain("ADF9dtVA");
    expect(loopProduct).not.toContain("GfyPrjzU6");
  });

  it("routes every community entry point through the shared canonical constant", () => {
    const surfaces = [
      "client/src/components/WelcomeModal.tsx",
      "client/src/components/layout/LeftRail.tsx",
      "client/src/components/layout/MainLayout.tsx",
      "client/src/components/layout/TopBar.tsx",
      "client/src/pages/AttributionPage.tsx",
      "client/src/pages/HomePage.tsx",
    ];

    for (const surface of surfaces) {
      const source = projectFile(surface);
      expect(source).toContain("DISCORD_COMMUNITY_URL");
      expect(source).not.toMatch(/discord\.gg\/(?:ADF9dtVA|GfyPrjzU6)/);
    }
  });

  it("uses cathedral theme tokens rather than Discord brand hex values on Loop chrome", () => {
    const surfaces = [
      "client/src/components/layout/LeftRail.tsx",
      "client/src/components/layout/MainLayout.tsx",
      "client/src/components/layout/TopBar.tsx",
      "client/src/pages/HomePage.tsx",
    ];
    const prohibitedColors = ["#5865F2", "#A5B4FC", "#8B9CF6", "#C7D2FE", "#1e1f22"];

    for (const surface of surfaces) {
      const source = projectFile(surface);
      expect(source).toContain("var(--ln-gold)");
      for (const color of prohibitedColors) {
        expect(source).not.toContain(color);
      }
    }
  });
});
