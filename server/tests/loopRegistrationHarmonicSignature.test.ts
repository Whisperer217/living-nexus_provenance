import { describe, expect, it } from "vitest";
import { harmonicSignatureFromAccents } from "@shared/loopRegistration";

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
});
