/**
 * imagegen.sparse.test.ts — Regression test for Phase 210 bug fix
 *
 * Bug: When a creator uploads to REF slot 2 or 3 (skipping earlier slots),
 * the referenceImages array becomes sparse. The `.map(r => r.url)` call
 * produces undefined entries for empty holes, and Zod's z.string().url()
 * rejects undefined immediately, causing image generation to fail before
 * the request reaches the server.
 *
 * Fix: Filter out falsy entries with `.filter((u): u is string => !!u)`
 * and pad arrays with empty entries instead of creating sparse holes.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Zod schema (mirrors server/routers.ts guides.generateImage input) ──────────

const generateImageInputSchema = z.object({
  prompt: z.string().min(1).max(3000),
  guideId: z.number().optional(),
  styleContext: z.string().max(500).optional(),
  referenceImageUrl: z.string().url().optional(),
  referenceImageUrls: z.array(z.string().url()).max(4).optional(),
});

// ── Utility: simulate the fixed client-side mapping ────────────────────────────

function buildReferenceImageUrls(
  referenceImages: Array<{ url: string; preview: string } | undefined>
): string[] {
  // Fixed version: filter out undefined/falsy entries
  return referenceImages
    .map(r => r?.url)
    .filter((u): u is string => !!u);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("guides.generateImage — referenceImageUrls sparse array regression", () => {
  it("passes validation with an empty referenceImages array", () => {
    const referenceImages: Array<{ url: string; preview: string }> = [];
    const urls = buildReferenceImageUrls(referenceImages);
    const result = generateImageInputSchema.safeParse({
      prompt: "dark warrior digital art",
      referenceImageUrls: urls,
    });
    expect(result.success).toBe(true);
    expect(urls).toHaveLength(0);
  });

  it("passes validation with all 4 slots filled", () => {
    const referenceImages = [
      { url: "https://example.com/ref1.png", preview: "p1" },
      { url: "https://example.com/ref2.png", preview: "p2" },
      { url: "https://example.com/ref3.png", preview: "p3" },
      { url: "https://example.com/ref4.png", preview: "p4" },
    ];
    const urls = buildReferenceImageUrls(referenceImages);
    const result = generateImageInputSchema.safeParse({
      prompt: "dark warrior digital art",
      referenceImageUrls: urls,
    });
    expect(result.success).toBe(true);
    expect(urls).toHaveLength(4);
  });

  it("passes validation when only slot 3 is filled (sparse array scenario)", () => {
    // Simulate: user uploads to slot 3 (index 2) without filling slots 1 and 2
    // Old bug: updated[2] = {...} on empty array creates holes → undefined entries
    // Fix: padding with empty entries + filter ensures no undefined values
    const sparseArray: Array<{ url: string; preview: string }> = [];
    // Simulate the OLD buggy behavior (direct index assignment)
    const buggyArray = [...sparseArray] as Array<{ url: string; preview: string } | undefined>;
    buggyArray[2] = { url: "https://example.com/ref3.png", preview: "p3" };
    const buggyUrls = buggyArray.map(r => r?.url).filter((u): u is string => !!u);

    // After fix: filter removes the undefined holes
    const result = generateImageInputSchema.safeParse({
      prompt: "dark warrior digital art",
      referenceImageUrls: buggyUrls,
    });
    expect(result.success).toBe(true);
    expect(buggyUrls).toHaveLength(1);
    expect(buggyUrls[0]).toBe("https://example.com/ref3.png");
  });

  it("fails validation (as expected) when undefined sneaks into array WITHOUT the fix", () => {
    // Confirm the OLD behavior was indeed broken
    const sparseArray: Array<{ url: string; preview: string } | undefined> = [];
    sparseArray[2] = { url: "https://example.com/ref3.png", preview: "p3" };
    // OLD: no filter — undefined entries pass through
    const brokenUrls = sparseArray.map(r => r?.url);

    const result = generateImageInputSchema.safeParse({
      prompt: "dark warrior digital art",
      referenceImageUrls: brokenUrls,
    });
    // This SHOULD fail — confirming the bug existed
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join("."));
      expect(paths).toContain("referenceImageUrls.0");
    }
  });

  it("passes validation with only slot 1 filled (normal case)", () => {
    const referenceImages = [
      { url: "https://example.com/ref1.png", preview: "p1" },
    ];
    const urls = buildReferenceImageUrls(referenceImages);
    const result = generateImageInputSchema.safeParse({
      prompt: "dark warrior digital art",
      referenceImageUrls: urls,
    });
    expect(result.success).toBe(true);
    expect(urls).toHaveLength(1);
  });

  it("accepts prompts up to 3000 characters (raised from 1000)", () => {
    const longPrompt = "A ".repeat(1000).trim(); // ~2000 chars
    const result = generateImageInputSchema.safeParse({ prompt: longPrompt });
    expect(result.success).toBe(true);

    // The exact prompt thiiirdgenkill used (1541 chars) must pass
    const thiiirdgenkillPrompt = `A vast cosmic archive suspended between reality and dream. At the center stands a lone observer on a circular stone platform floating in an endless sea of stars. Instead of constellations, the sky is woven from hundreds of thousands of glowing witness threads, each thread connecting distant memories, stories, creations, and lives.\n\nEvery connection forms living geometric structures resembling celestial circuitry, ancient roots, and galaxies simultaneously. Some threads lead to forgotten books, others to music, inventions, artwork, acts of kindness, and lost civilizations. The observer holds a luminous compass forged from sunlight and moonlight, not pointing north but pointing toward truth and origin.\n\nStyle: late-1990s to early-2000s anime film, hand-painted backgrounds, Makoto Shinkai-inspired lighting, extraordinary atmospheric perspective, celestial fantasy, intricate details, volumetric god rays, cinematic scale, masterpiece quality, emotional storytelling, ultra-detailed, dreamlike yet believable.`;
    expect(thiiirdgenkillPrompt.length).toBeGreaterThan(1000);
    const result2 = generateImageInputSchema.safeParse({ prompt: thiiirdgenkillPrompt });
    expect(result2.success).toBe(true);
  });

  it("filters out empty-string URLs introduced by padding", () => {
    // Simulate the padded array: slots 0 and 1 are empty strings, slot 2 is real
    const paddedArray = [
      { url: "", preview: "" },
      { url: "", preview: "" },
      { url: "https://example.com/ref3.png", preview: "p3" },
    ];
    const urls = buildReferenceImageUrls(paddedArray);
    // Empty strings are falsy → filtered out
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe("https://example.com/ref3.png");

    const result = generateImageInputSchema.safeParse({
      prompt: "dark warrior digital art",
      referenceImageUrls: urls,
    });
    expect(result.success).toBe(true);
  });
});
