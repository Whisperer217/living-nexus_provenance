/**
 * @domain   The Registry → Spatial Prototype → Isolation Contract
 * @impl     Test Suite — Ensures the spatial registry mock stays fictional and disconnected
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ASSET, INTERACTION_DOCTRINE, SPATIAL_REGISTRY_MOCK, VISUAL_LANGUAGE } from "../../client/src/lib/spatialRegistryMock";

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
    expect(SPATIAL_REGISTRY_MOCK.lineageSequence.map((step) => step.id)).toEqual([
      "creation",
      "edits",
      "registrations",
      "witnesses",
      "derived",
    ]);
    expect(SPATIAL_REGISTRY_MOCK.versions.map((version) => version.id)).toEqual(["01", "02", "03"]);
    expect(SPATIAL_REGISTRY_MOCK.derivedArtifacts.map((artifact) => artifact.title)).toEqual([
      "Cover art",
      "Registration seal",
      "Canonical stream",
    ]);
    expect(SPATIAL_REGISTRY_MOCK.collaborators.map((person) => person.name)).toEqual([
      "Living Nexus Node",
      "Slim Doggy",
    ]);
    expect(Object.keys(ASSET.pathways)).toEqual([
      "work",
      "profile",
      "edit",
      "register",
      "witness",
      "lineage",
      "player",
    ]);
    expect(INTERACTION_DOCTRINE.standard).toContain("Nothing exists merely for decoration");
    expect(INTERACTION_DOCTRINE.loop).toEqual(["Profile", "Edit", "Register", "Witness"]);
    expect(INTERACTION_DOCTRINE.grammar.map((row) => row.act)).toContain("Load into Player");
    expect(VISUAL_LANGUAGE.accents.creator).toContain("violet");
    expect(SPATIAL_REGISTRY_MOCK.nodes.find((node) => node.id === "profile")?.color).toBe("#c77dff");
    expect(SPATIAL_REGISTRY_MOCK.nodes.find((node) => node.id === "edit")?.color).toBe("#29b6f6");
    expect(SPATIAL_REGISTRY_MOCK.exploreArtifacts.map((artifact) => artifact.id)).toContain("yahweh");
    expect(SPATIAL_REGISTRY_MOCK.exploreArtifacts.find((artifact) => artifact.id === "yahweh")).toMatchObject({
      title: "Yahweh Lights My Way",
      wid: "LN-00017",
      medium: "music",
      witnessed: true,
    });
    expect(SPATIAL_REGISTRY_MOCK.exploreArtifacts.some((artifact) => artifact.medium === "image")).toBe(true);
  });

  it("mounts on a dedicated prototype route and remains local-only", () => {
    const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/SpatialRegistryMockPage.tsx"), "utf8");
    const sceneSource = readFileSync(resolve(process.cwd(), "client/src/components/spatial-registry/SpatialRegistryScene.tsx"), "utf8");
    const fixtureSource = readFileSync(resolve(process.cwd(), "client/src/lib/spatialRegistryMock.ts"), "utf8");

    expect(appSource).toContain('path="/prototype/spatial-registry"');
    expect(pageSource).toContain("SPATIAL_REGISTRY_MOCK");
    expect(pageSource).toContain("Return to constellation");
    expect(pageSource).toContain("INTERACTION_DOCTRINE");
    expect(sceneSource).toContain("Law VII");
    const lawSource = readFileSync(resolve(process.cwd(), "ARCHITECTURAL_LAWS.md"), "utf8");
    expect(lawSource).toContain("Law VII — Intentional Representation");
    expect(pageSource).toContain("Cover Art Studio");
    expect(pageSource).toContain("My AI");
    expect(pageSource).toContain("View Attribution");
    expect(pageSource).toContain("Grab a work");
    expect(pageSource).toContain("WITNESSED");
    expect(pageSource).toContain("Drag a local file");
    expect(sceneSource).toContain("Drop a registered work");
    expect(sceneSource).toContain("makeArtifactObject");
    expect(sceneSource).toContain("three");
    expect(sceneSource).toContain("Visualization only");
    expect(sceneSource).toContain("cyber-celestial");

    for (const source of [pageSource, sceneSource, fixtureSource]) {
      expect(source).not.toContain("trpc.");
      expect(source).not.toContain("useAuth(");
      expect(source).not.toContain("usePlayer(");
    }
  });
});
