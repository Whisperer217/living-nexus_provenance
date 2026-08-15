import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SPATIAL_REGISTRY_MOCK } from "../../client/src/lib/spatialRegistryMock";

describe("Spatial Registry Mock isolation", () => {
  it("uses the supplied fictional music work and complete provenance loop", () => {
    expect(SPATIAL_REGISTRY_MOCK.work).toMatchObject({
      title: "Yahweh Lights My Way",
      artist: "Weave & Breathe",
      wid: "LN-00017",
      status: "Registered",
    });

    expect(SPATIAL_REGISTRY_MOCK.nodes.map((node) => node.id)).toEqual([
      "profile",
      "work",
      "edit",
      "register",
      "witness",
      "lineage",
      "player",
    ]);
    expect(SPATIAL_REGISTRY_MOCK.edges).toContainEqual(["edit", "register"]);
    expect(SPATIAL_REGISTRY_MOCK.edges).toContainEqual(["register", "witness"]);
  });

  it("mounts on a dedicated prototype route and remains local-only", () => {
    const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/SpatialRegistryMockPage.tsx"), "utf8");

    expect(appSource).toContain('path="/prototype/spatial-registry"');
    expect(pageSource).toContain("SPATIAL_REGISTRY_MOCK");
    expect(pageSource).not.toContain("trpc.");
    expect(pageSource).not.toContain("useAuth(");
    expect(pageSource).not.toContain("usePlayer(");
  });
});
