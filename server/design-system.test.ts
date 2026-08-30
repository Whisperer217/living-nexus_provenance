/**
 * Living Nexus Design System — Token Tests
 * ════════════════════════════════════════════════════════════════════
 * Validates that design token files export the expected shape and
 * that no token values are undefined or empty.
 * ════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";

// We test token values directly — pure JS objects, no DOM required.

// ── Token shape tests ─────────────────────────────────────────────────────────

describe("Design System Tokens — Shape", () => {
  it("COLOR_SURFACE has all required void steps", async () => {
    const { COLOR_SURFACE } = await import("../client/src/design-system/tokens");
    expect(COLOR_SURFACE).toHaveProperty("void");
    expect(COLOR_SURFACE).toHaveProperty("void2");
    expect(COLOR_SURFACE).toHaveProperty("void3");
    expect(COLOR_SURFACE).toHaveProperty("void4");
    expect(COLOR_SURFACE).toHaveProperty("void5");
    for (const [key, val] of Object.entries(COLOR_SURFACE)) {
      expect(typeof val, `COLOR_SURFACE.${key}`).toBe("string");
      expect((val as string).length, `COLOR_SURFACE.${key} must not be empty`).toBeGreaterThan(0);
    }
  });

  it("COLOR_GOLD has all required quartzite gold keys", async () => {
    const { COLOR_GOLD } = await import("../client/src/design-system/tokens");
    expect(COLOR_GOLD).toHaveProperty("base");
    expect(COLOR_GOLD).toHaveProperty("bright");
    expect(COLOR_GOLD).toHaveProperty("flame");
    expect(COLOR_GOLD).toHaveProperty("pearl");
    expect(COLOR_GOLD).toHaveProperty("dim");
    expect(COLOR_GOLD).toHaveProperty("ghost");
    for (const [key, val] of Object.entries(COLOR_GOLD)) {
      expect(typeof val, `COLOR_GOLD.${key}`).toBe("string");
      expect((val as string).length, `COLOR_GOLD.${key} must not be empty`).toBeGreaterThan(0);
    }
  });

  it("COLOR_TEXT has all required quartzite text keys", async () => {
    const { COLOR_TEXT } = await import("../client/src/design-system/tokens");
    expect(COLOR_TEXT).toHaveProperty("primary");
    expect(COLOR_TEXT).toHaveProperty("secondary");
    expect(COLOR_TEXT).toHaveProperty("muted");
    expect(COLOR_TEXT).toHaveProperty("disabled");
  });

  it("COLOR_STATUS has all required semantic status keys", async () => {
    const { COLOR_STATUS } = await import("../client/src/design-system/tokens");
    expect(COLOR_STATUS).toHaveProperty("green");
    expect(COLOR_STATUS).toHaveProperty("orange");
    expect(COLOR_STATUS).toHaveProperty("red");
  });

  it("COLOR_MEDIUM has all 6 creative mediums with required sub-keys", async () => {
    const { COLOR_MEDIUM } = await import("../client/src/design-system/tokens");
    const expectedMediums = ["audio", "lyrics", "manuscript", "comic", "game", "visual"] as const;
    for (const medium of expectedMediums) {
      expect(COLOR_MEDIUM, `COLOR_MEDIUM.${medium} must exist`).toHaveProperty(medium);
      const m = COLOR_MEDIUM[medium];
      expect(m).toHaveProperty("primary");
      expect(m).toHaveProperty("bg");
      expect(m).toHaveProperty("border");
      expect(m).toHaveProperty("glow");
    }
  });

  it("FONT_FAMILY has all required typefaces", async () => {
    const { FONT_FAMILY } = await import("../client/src/design-system/tokens");
    expect(FONT_FAMILY).toHaveProperty("display");
    expect(FONT_FAMILY).toHaveProperty("editorial");
    expect(FONT_FAMILY).toHaveProperty("body");
    expect(FONT_FAMILY).toHaveProperty("mono");
    expect(FONT_FAMILY.display).toContain("Cinzel");
    expect(FONT_FAMILY.body).toContain("DM Sans");
    expect(FONT_FAMILY.mono).toContain("Space Mono");
  });

  it("RADIUS has all required corner radii", async () => {
    const { RADIUS } = await import("../client/src/design-system/tokens");
    expect(RADIUS).toHaveProperty("none");
    expect(RADIUS).toHaveProperty("sm");
    expect(RADIUS).toHaveProperty("md");
    expect(RADIUS).toHaveProperty("lg");
    expect(RADIUS).toHaveProperty("xl");
    expect(RADIUS).toHaveProperty("pill");
  });

  it("SHADOW has all required elevation levels", async () => {
    const { SHADOW } = await import("../client/src/design-system/tokens");
    expect(SHADOW).toHaveProperty("sm");
    expect(SHADOW).toHaveProperty("md");
    expect(SHADOW).toHaveProperty("lg");
    expect(SHADOW).toHaveProperty("xl");
    expect(SHADOW).toHaveProperty("cardHover");
  });

  it("GLOW has all required glow treatments", async () => {
    const { GLOW } = await import("../client/src/design-system/tokens");
    expect(GLOW).toHaveProperty("gold");
    expect(GLOW).toHaveProperty("wid");
    expect(GLOW).toHaveProperty("player");
    expect(GLOW).toHaveProperty("btn");
    expect(GLOW).toHaveProperty("green");
  });

  it("BORDER has all required border treatments", async () => {
    const { BORDER } = await import("../client/src/design-system/tokens");
    expect(BORDER).toHaveProperty("gold");
    expect(BORDER).toHaveProperty("goldSubtle");
    expect(BORDER).toHaveProperty("goldActive");
    expect(BORDER).toHaveProperty("goldStrong");
    expect(BORDER).toHaveProperty("muted");
    expect(BORDER).toHaveProperty("input");
  });

  it("DURATION has all required timing values", async () => {
    const { DURATION } = await import("../client/src/design-system/tokens");
    expect(DURATION).toHaveProperty("instant");
    expect(DURATION).toHaveProperty("fast");
    expect(DURATION).toHaveProperty("normal");
    expect(DURATION).toHaveProperty("slow");
    expect(DURATION).toHaveProperty("deliberate");
    expect(DURATION).toHaveProperty("reverent");
  });

  it("Z_INDEX has all required stacking layers", async () => {
    const { Z_INDEX } = await import("../client/src/design-system/tokens");
    expect(Z_INDEX).toHaveProperty("base");
    expect(Z_INDEX).toHaveProperty("raised");
    expect(Z_INDEX).toHaveProperty("modal");
    expect(Z_INDEX).toHaveProperty("toast");
    expect(Z_INDEX).toHaveProperty("playerBar");
    // Z-index values must be ordered correctly
    expect(Z_INDEX.raised).toBeGreaterThan(Z_INDEX.base);
    expect(Z_INDEX.modal).toBeGreaterThan(Z_INDEX.raised);
    expect(Z_INDEX.toast).toBeGreaterThan(Z_INDEX.modal);
    expect(Z_INDEX.playerBar).toBeGreaterThan(Z_INDEX.toast);
  });

  it("LAYOUT has fixed layout dimensions", async () => {
    const { LAYOUT } = await import("../client/src/design-system/tokens");
    expect(LAYOUT).toHaveProperty("topbarH");
    expect(LAYOUT).toHaveProperty("leftrailW");
    expect(LAYOUT).toHaveProperty("drawerW");
    expect(LAYOUT).toHaveProperty("playerBarH");
    expect(LAYOUT).toHaveProperty("heroH");
  });

  it("BREAKPOINT has all required breakpoints", async () => {
    const { BREAKPOINT } = await import("../client/src/design-system/tokens");
    expect(BREAKPOINT).toHaveProperty("sm");
    expect(BREAKPOINT).toHaveProperty("md");
    expect(BREAKPOINT).toHaveProperty("lg");
    expect(BREAKPOINT).toHaveProperty("xl");
  });

  it("ANIMATION has all required named keyframes", async () => {
    const { ANIMATION } = await import("../client/src/design-system/tokens");
    expect(ANIMATION).toHaveProperty("fadeUp");
    expect(ANIMATION).toHaveProperty("goldShimmer");
    expect(ANIMATION).toHaveProperty("widPulse");
    expect(ANIMATION).toHaveProperty("waveBar");
    expect(ANIMATION).toHaveProperty("pulseDot");
  });

  it("ICON_SIZE has all required sizes", async () => {
    const { ICON_SIZE } = await import("../client/src/design-system/tokens");
    expect(ICON_SIZE).toHaveProperty("xs");
    expect(ICON_SIZE).toHaveProperty("sm");
    expect(ICON_SIZE).toHaveProperty("md");
    expect(ICON_SIZE).toHaveProperty("lg");
    expect(ICON_SIZE).toHaveProperty("xl");
    // All values must be positive numbers
    for (const [key, val] of Object.entries(ICON_SIZE)) {
      expect(typeof val, `ICON_SIZE.${key}`).toBe("number");
      expect(val as number, `ICON_SIZE.${key} must be positive`).toBeGreaterThan(0);
    }
  });

  it("CONTRAST has WCAG AA and AAA ratios", async () => {
    const { CONTRAST } = await import("../client/src/design-system/tokens");
    expect(CONTRAST).toHaveProperty("aa");
    expect(CONTRAST).toHaveProperty("aaLarge");
    expect(CONTRAST).toHaveProperty("aaa");
    expect(CONTRAST.aa).toBe(4.5);
    expect(CONTRAST.aaa).toBe(7);
    expect(CONTRAST.aaa).toBeGreaterThan(CONTRAST.aa);
  });
});

// ── Token value sanity checks ─────────────────────────────────────────────────

describe("Design System Token Values — Canonical", () => {
  it("void color is true black", async () => {
    const { COLOR_SURFACE } = await import("../client/src/design-system/tokens");
    expect(COLOR_SURFACE.void).toBe("#000000");
  });

  it("gold base is the canonical brand gold", async () => {
    const { COLOR_GOLD } = await import("../client/src/design-system/tokens");
    expect(COLOR_GOLD.base).toBe("#C49A28");
  });

  it("primary text is the canonical warm parchment white", async () => {
    const { COLOR_TEXT } = await import("../client/src/design-system/tokens");
    expect(COLOR_TEXT.primary).toBe("#EDE5D0");
  });

  it("playerBar Z-index is the highest layer", async () => {
    const { Z_INDEX } = await import("../client/src/design-system/tokens");
    const values = Object.values(Z_INDEX) as number[];
    expect(Z_INDEX.playerBar).toBe(Math.max(...values));
  });

  it("base Z-index is the lowest layer", async () => {
    const { Z_INDEX } = await import("../client/src/design-system/tokens");
    const values = Object.values(Z_INDEX) as number[];
    expect(Z_INDEX.base).toBe(Math.min(...values));
  });

  it("RADIUS.none is 0px", async () => {
    const { RADIUS } = await import("../client/src/design-system/tokens");
    expect(RADIUS.none).toBe("0px");
  });

  it("DURATION.instant is 0ms", async () => {
    const { DURATION } = await import("../client/src/design-system/tokens");
    expect(DURATION.instant).toBe("0ms");
  });

  it("FOCUS_RING uses gold color", async () => {
    const { FOCUS_RING } = await import("../client/src/design-system/tokens");
    expect(FOCUS_RING.standard).toContain("196,154,40");
  });

  it("COLOR_GOLD_ALPHA values are rgba strings", async () => {
    const { COLOR_GOLD_ALPHA } = await import("../client/src/design-system/tokens");
    for (const [key, val] of Object.entries(COLOR_GOLD_ALPHA)) {
      expect(val, `COLOR_GOLD_ALPHA.${key} must be rgba`).toMatch(/^rgba\(/);
    }
  });
});
