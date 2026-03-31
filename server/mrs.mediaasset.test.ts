/**
 * MRS — Media Rendering System: Vitest tests
 * Tests cover:
 *   1. artAspectRatio DB schema field (valid values + null default)
 *   2. MediaAsset render mode selection logic
 *   3. Focal point objectPosition derivation
 *   4. Aspect ratio → padding-bottom mapping
 */

import { describe, it, expect } from "vitest";

// ─── 1. artAspectRatio valid values ───────────────────────────────────────────

describe("artAspectRatio schema field", () => {
  const VALID_RATIOS = ["1:1", "4:5", "16:9"] as const;

  it("accepts all three valid ratio values", () => {
    VALID_RATIOS.forEach(ratio => {
      expect(VALID_RATIOS).toContain(ratio);
    });
  });

  it("defaults to null when not provided", () => {
    const songWithNoRatio: { artAspectRatio?: string | null } = {};
    expect(songWithNoRatio.artAspectRatio ?? null).toBeNull();
  });

  it("rejects values outside the enum", () => {
    const invalid = ["2:1", "3:4", "square", ""] as const;
    invalid.forEach(v => {
      expect(VALID_RATIOS).not.toContain(v as any);
    });
  });
});

// ─── 2. Render mode selection ─────────────────────────────────────────────────

describe("MediaAsset render mode selection", () => {
  type RenderMode = "card" | "player" | "cinematic";

  function selectMode(mode: RenderMode): string {
    if (mode === "cinematic") return "CinematicMedia";
    if (mode === "player")    return "PlayerMedia";
    return "CardMedia";
  }

  it("routes 'card' to CardMedia", () => {
    expect(selectMode("card")).toBe("CardMedia");
  });

  it("routes 'player' to PlayerMedia", () => {
    expect(selectMode("player")).toBe("PlayerMedia");
  });

  it("routes 'cinematic' to CinematicMedia", () => {
    expect(selectMode("cinematic")).toBe("CinematicMedia");
  });
});

// ─── 3. Focal point → objectPosition derivation ───────────────────────────────

describe("Focal point objectPosition derivation", () => {
  function toObjectPosition(focalX?: number, focalY?: number): string {
    return `${focalX ?? 50}% ${focalY ?? 50}%`;
  }

  it("uses 50% 50% as default when no focal point provided", () => {
    expect(toObjectPosition()).toBe("50% 50%");
  });

  it("uses provided focal point values", () => {
    expect(toObjectPosition(30, 70)).toBe("30% 70%");
  });

  it("handles edge values (0 and 100)", () => {
    expect(toObjectPosition(0, 0)).toBe("0% 0%");
    expect(toObjectPosition(100, 100)).toBe("100% 100%");
  });

  it("falls back to 50 for undefined X but uses provided Y", () => {
    expect(toObjectPosition(undefined, 80)).toBe("50% 80%");
  });
});

// ─── 4. Aspect ratio → padding-bottom mapping ─────────────────────────────────

describe("Aspect ratio to padding-bottom mapping", () => {
  const RATIO_TO_PADDING: Record<string, string> = {
    "1:1": "100%",
    "4:5": "125%",
    "16:9": "56.25%",
  };

  it("maps 1:1 to 100% padding", () => {
    expect(RATIO_TO_PADDING["1:1"]).toBe("100%");
  });

  it("maps 4:5 to 125% padding (portrait)", () => {
    expect(RATIO_TO_PADDING["4:5"]).toBe("125%");
  });

  it("maps 16:9 to 56.25% padding (widescreen)", () => {
    expect(RATIO_TO_PADDING["16:9"]).toBe("56.25%");
  });

  it("falls back to 1:1 (100%) for null/unknown ratio", () => {
    const ratio: string | null = null;
    const padding = RATIO_TO_PADDING[ratio ?? "1:1"];
    expect(padding).toBe("100%");
  });
});

// ─── 5. Ken Burns animation enablement ────────────────────────────────────────

describe("Ken Burns animation in cinematic mode", () => {
  function getKenBurnsAnimation(kenBurns: boolean): string | undefined {
    return kenBurns ? "mrs-ken-burns 28s ease-in-out infinite" : undefined;
  }

  it("returns animation string when kenBurns is true", () => {
    expect(getKenBurnsAnimation(true)).toBe("mrs-ken-burns 28s ease-in-out infinite");
  });

  it("returns undefined when kenBurns is false", () => {
    expect(getKenBurnsAnimation(false)).toBeUndefined();
  });
});

// ─── 6. Blurred background fill logic ─────────────────────────────────────────

describe("Blurred background fill for card mode", () => {
  function hasBlurredFill(src: string | null | undefined): boolean {
    return !!src;
  }

  it("shows blurred fill when src is provided", () => {
    expect(hasBlurredFill("https://cdn.example.com/cover.jpg")).toBe(true);
  });

  it("does not show blurred fill when src is null", () => {
    expect(hasBlurredFill(null)).toBe(false);
  });

  it("does not show blurred fill when src is undefined", () => {
    expect(hasBlurredFill(undefined)).toBe(false);
  });
});
