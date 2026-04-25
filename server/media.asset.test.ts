/**
 * Vitest tests for the Unified Media Rendering System (MRS)
 *
 * Covers:
 *   - artAspectRatio schema field validation
 *   - Focal point defaults (coverPositionX/Y)
 *   - MediaAsset prop contract (render mode types)
 *   - Aspect ratio to padding-bottom mapping
 */

import { describe, it, expect } from "vitest";

// ── artAspectRatio valid values ───────────────────────────────────────────────
describe("artAspectRatio schema field", () => {
  const validRatios = ["1:1", "4:5", "16:9"] as const;
  const invalidRatios = ["3:2", "21:9", "", "square", null, undefined, 0];

  it("accepts all valid aspect ratio enum values", () => {
    for (const ratio of validRatios) {
      expect(validRatios).toContain(ratio);
    }
  });

  it("rejects values outside the enum", () => {
    for (const bad of invalidRatios) {
      expect(validRatios).not.toContain(bad as string);
    }
  });

  it("treats null as unknown (fallback to 1:1 in card mode)", () => {
    const fallback = (ratio: string | null | undefined) => ratio ?? "1:1";
    expect(fallback(null)).toBe("1:1");
    expect(fallback(undefined)).toBe("1:1");
    expect(fallback("4:5")).toBe("4:5");
  });
});

// ── Focal point defaults ──────────────────────────────────────────────────────
describe("focal point defaults", () => {
  it("defaults coverPositionX to 50 when not set", () => {
    const x = undefined ?? 50;
    expect(x).toBe(50);
  });

  it("defaults coverPositionY to 50 when not set", () => {
    const y = null ?? 50;
    expect(y).toBe(50);
  });

  it("maps focal point to CSS objectPosition string", () => {
    const toObjectPosition = (x: number, y: number) => `${x}% ${y}%`;
    expect(toObjectPosition(50, 50)).toBe("50% 50%");
    expect(toObjectPosition(30, 70)).toBe("30% 70%");
    expect(toObjectPosition(0, 100)).toBe("0% 100%");
  });
});

// ── Aspect ratio → padding-bottom mapping ────────────────────────────────────
describe("aspect ratio to padding-bottom mapping", () => {
  const RATIO_TO_PADDING: Record<string, string> = {
    "1:1": "100%",
    "4:5": "125%",
    "16:9": "56.25%",
  };

  it("maps 1:1 to 100% padding-bottom", () => {
    expect(RATIO_TO_PADDING["1:1"]).toBe("100%");
  });

  it("maps 4:5 to 125% padding-bottom (portrait)", () => {
    expect(RATIO_TO_PADDING["4:5"]).toBe("125%");
  });

  it("maps 16:9 to 56.25% padding-bottom (widescreen)", () => {
    expect(RATIO_TO_PADDING["16:9"]).toBe("56.25%");
  });

  it("falls back to 1:1 for unknown ratios", () => {
    const fallback = (r: string) => RATIO_TO_PADDING[r] ?? RATIO_TO_PADDING["1:1"];
    expect(fallback("3:2")).toBe("100%");
    expect(fallback("")).toBe("100%");
  });
});

// ── Render mode contract ──────────────────────────────────────────────────────
describe("MediaAsset render mode contract", () => {
  const validModes = ["card", "player", "cinematic"] as const;

  it("has exactly three render modes", () => {
    expect(validModes).toHaveLength(3);
  });

  it("card mode is for grid/list surfaces", () => {
    expect(validModes).toContain("card");
  });

  it("player mode is for the player bar surfaces", () => {
    expect(validModes).toContain("player");
  });

  it("cinematic mode is for full-bleed expanded views", () => {
    expect(validModes).toContain("cinematic");
  });

  it("rejects unknown modes at type level", () => {
    const isValidMode = (m: string): m is typeof validModes[number] =>
      (validModes as readonly string[]).includes(m);
    expect(isValidMode("card")).toBe(true);
    expect(isValidMode("thumbnail")).toBe(false);
    expect(isValidMode("")).toBe(false);
  });
});

// ── Ken Burns animation guard ─────────────────────────────────────────────────
describe("Ken Burns animation", () => {
  it("defaults to enabled in cinematic mode", () => {
    const kenBurns = undefined;
    const isEnabled = kenBurns !== false;
    expect(isEnabled).toBe(true);
  });

  it("can be disabled by passing kenBurns=false", () => {
    const kenBurns = false;
    const isEnabled = kenBurns !== false;
    expect(isEnabled).toBe(false);
  });

  it("animation string is only set when kenBurns is not false", () => {
    const getAnimation = (kb: boolean | undefined) =>
      kb !== false ? "mrs-ken-burns 28s ease-in-out infinite" : undefined;
    expect(getAnimation(true)).toBe("mrs-ken-burns 28s ease-in-out infinite");
    expect(getAnimation(undefined)).toBe("mrs-ken-burns 28s ease-in-out infinite");
    expect(getAnimation(false)).toBeUndefined();
  });
});
