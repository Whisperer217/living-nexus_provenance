import { describe, expect, it } from "vitest";
import { harmonicSignatureFromAccents, normalizeIsrc, validateIsrc } from "@shared/loopRegistration";

describe("harmonicSignatureFromAccents", () => {
  it("preserves the deterministic three-slot signature for valid tone accents", () => {
    expect(harmonicSignatureFromAccents(["#C49A28", "#EDE5D0", "#F5CC5A"])).toEqual([
      137,
      194,
      250,
    ]);
  });

  it("keeps Draft and Publish submissions safe when a restored tone profile is incomplete", () => {
    expect(harmonicSignatureFromAccents(["#C49A28", undefined, null])).toEqual([
      137,
      165,
      220,
    ]);
    expect(harmonicSignatureFromAccents(undefined)).toEqual([110, 165, 220]);
  });

  it("normalizes display-form ISRCs and rejects malformed recording identifiers", () => {
    expect(normalizeIsrc("us-abc-24-12345")).toBe("USABC2412345");
    expect(validateIsrc("US-ABC-24-12345")).toBeNull();
    expect(validateIsrc("USABC2412345")).toBeNull();
    expect(validateIsrc("")).toBeNull();
    expect(validateIsrc("WID-MUS-NOT-AN-ISRC")).toContain("ISRC must contain 12 characters");
  });
});
