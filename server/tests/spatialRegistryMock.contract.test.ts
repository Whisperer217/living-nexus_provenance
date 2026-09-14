import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SPATIAL_REGISTRY_STUDY } from "../../client/src/lib/spatialRegistryMock";

const pagePath = resolve(process.cwd(), "client/src/pages/SpatialRegistryMockPage.tsx");
const stylePath = resolve(process.cwd(), "client/src/pages/spatial-registry-mock.css");
const appPath = resolve(process.cwd(), "client/src/App.tsx");

describe("Spatial Registry visual study boundaries", () => {
  it("uses a neutral illustrative orientation map rather than fictional creator or record claims", () => {
    expect(SPATIAL_REGISTRY_STUDY.label).toBe("Illustrative spatial study");
    expect(SPATIAL_REGISTRY_STUDY.disclaimer).toContain("No creator, Work, WID, player, Registry, or AI context");
    expect(SPATIAL_REGISTRY_STUDY.nodes.map((node) => node.id)).toEqual([
      "creator",
      "work",
      "prepare",
      "register",
      "verify",
      "lineage",
      "listen",
    ]);
    expect(JSON.stringify(SPATIAL_REGISTRY_STUDY)).not.toMatch(/\b(?:WID|LN)-\d{4,}\b/);
    expect(JSON.stringify(SPATIAL_REGISTRY_STUDY)).not.toMatch(/Yahweh|Weave & Breathe|Jake|Orison/i);
    expect(SPATIAL_REGISTRY_STUDY.nodes.every((node) => !("status" in node || "wid" in node || "count" in node))).toBe(true);
  });

  it("stays on its dedicated prototype route with no Core, player, provider, Registry, or asset authority", () => {
    const pageSource = readFileSync(pagePath, "utf8");
    const appSource = readFileSync(appPath, "utf8");

    expect(appSource).toContain('path="/prototype/spatial-registry"');
    expect(pageSource).toContain("Illustrative spatial study");
    expect(pageSource).toContain("aria-pressed");
    expect(pageSource).toContain("This study changes orientation only");

    for (const prohibitedToken of [
      "trpc.",
      "useAuth(",
      "usePlayer(",
      "new Audio(",
      "<audio",
      "setInterval(",
      "fetch(",
      "FileReader",
      "SIMULATE",
      "Registration Created",
      "Witness recorded",
      "Cover Art Studio",
      "My AI",
      "/prototype/spatial-registry/",
    ]) {
      expect(pageSource).not.toContain(prohibitedToken);
    }
  });

  it("uses tokenized procedural geometry and gates nonessential motion by reduced-motion preference", () => {
    const styleSource = readFileSync(stylePath, "utf8");

    expect(styleSource).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(styleSource).toContain("spatial-study-pulse");
    expect(styleSource).toContain("spatial-study-turn");
    expect(styleSource).toContain("var(--ln-gold)");
    expect(styleSource).toContain("var(--ln-parchment)");
    expect(styleSource).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(styleSource).not.toContain("url(");
  });
});
