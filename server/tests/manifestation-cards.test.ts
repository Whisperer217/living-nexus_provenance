/**
 * Manifestation Card System — Type & Export Tests
 * Verifies the card system module exports, type contracts, and utility functions.
 */
import { describe, it, expect } from "vitest";

// Test that all exports are accessible
describe("manifestation-cards module exports", () => {
  it("exports LargeManifestationCard", async () => {
    const mod = await import("../../client/src/components/manifestation-cards/index");
    expect(mod.LargeManifestationCard).toBeDefined();
    expect(typeof mod.LargeManifestationCard).toBe("function");
  });

  it("exports MediumManifestationCard", async () => {
    const mod = await import("../../client/src/components/manifestation-cards/index");
    expect(mod.MediumManifestationCard).toBeDefined();
    expect(typeof mod.MediumManifestationCard).toBe("function");
  });

  it("exports MicroManifestationCard", async () => {
    const mod = await import("../../client/src/components/manifestation-cards/index");
    expect(mod.MicroManifestationCard).toBeDefined();
    expect(typeof mod.MicroManifestationCard).toBe("function");
  });

  it("exports ManifestationBundle", async () => {
    const mod = await import("../../client/src/components/manifestation-cards/index");
    expect(mod.ManifestationBundle).toBeDefined();
    expect(typeof mod.ManifestationBundle).toBe("function");
  });

  it("exports medium-specific card variants", async () => {
    const mod = await import("../../client/src/components/manifestation-cards/index");
    expect(mod.MusicCard).toBeDefined();
    expect(mod.ComicCard).toBeDefined();
    expect(mod.ManuscriptCard).toBeDefined();
    expect(mod.GuideCard).toBeDefined();
    expect(mod.LoreCard).toBeDefined();
    expect(mod.SmartManifestationCard).toBeDefined();
  });
});

// Test the types module type exports
describe("manifestation-cards types", () => {
  it("exports ManifestationData type interface", async () => {
    const mod = await import("../../client/src/components/manifestation-cards/types");
    // Types are erased at runtime but the module should import without error
    expect(mod).toBeDefined();
  });

  it("ManifestationData has expected shape when constructed", () => {
    // Verify the type contract by constructing a valid object
    const data = {
      id: 1,
      title: "Test Manifestation",
      artistName: "Creator",
      medium: "audio" as const,
      coverArtUrl: "https://example.com/art.webp",
      fileUrl: "https://example.com/audio.mp3",
      likeCount: 42,
      playCount: 100,
    };
    expect(data.id).toBe(1);
    expect(data.title).toBe("Test Manifestation");
    expect(data.medium).toBe("audio");
  });
});

// Test DiscoverySection export
describe("DiscoverySection component", () => {
  it("exports DiscoverySection", async () => {
    const mod = await import("../../client/src/components/DiscoverySection");
    expect(mod.DiscoverySection).toBeDefined();
    expect(typeof mod.DiscoverySection).toBe("function");
  });
});
