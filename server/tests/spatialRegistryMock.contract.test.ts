/**
 * @domain   The Registry → Spatial Prototype → Isolation Contract
 * @impl     Test Suite — Ensures the spatial registry mock stays fictional and disconnected
 */

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
    expect(SPATIAL_REGISTRY_MOCK.creator).toMatchObject({
      name: "Jake",
      artistName: "Weave & Breathe",
      slotsRemaining: 9,
      registrationCapacity: 10,
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
    expect(SPATIAL_REGISTRY_MOCK.lineagePath).toEqual(["profile", "edit", "register", "witness"]);
    expect(SPATIAL_REGISTRY_MOCK.attribution.label).toBe("View Attribution");
  });

  it("mounts on a dedicated prototype route and remains local-only", () => {
    const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/SpatialRegistryMockPage.tsx"), "utf8");
    const sceneSource = readFileSync(resolve(process.cwd(), "client/src/components/spatial-registry/SpatialRegistryScene.tsx"), "utf8");
    const fixtureSource = readFileSync(resolve(process.cwd(), "client/src/lib/spatialRegistryMock.ts"), "utf8");

    expect(appSource).toContain('path="/prototype/spatial-registry"');
    expect(pageSource).toContain("SPATIAL_REGISTRY_MOCK");
    expect(pageSource).toContain("Cover Art Studio");
    expect(pageSource).toContain("My AI");
    expect(pageSource).toContain("View Attribution");
    expect(pageSource).toContain("Registration capacity");
    expect(sceneSource).toContain("three");
    expect(sceneSource).toContain("Visualization only");

    for (const source of [pageSource, sceneSource, fixtureSource]) {
      expect(source).not.toContain("trpc.");
      expect(source).not.toContain("useAuth(");
      expect(source).not.toContain("usePlayer(");
    }
  });
});
