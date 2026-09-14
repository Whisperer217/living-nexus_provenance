import { describe, expect, it } from "vitest";
import { serializeOnboardingProgressPatch } from "../domains/onboarding/progressSerialization";

describe("onboarding progress persistence", () => {
  it("serializes a UI completed-step array into one TiDB-safe JSON text value", () => {
    const patch = serializeOnboardingProgressPatch({
      currentStep: "identity",
      completedSteps: ["covenant", "identity"],
    });

    expect(patch).toEqual({
      currentStep: "identity",
      completedSteps: '["covenant","identity"]',
    });
    expect(typeof patch.completedSteps).toBe("string");
  });

  it("preserves already-persisted JSON text, null, and unrelated onboarding fields", () => {
    const completedText = '["covenant"]';
    const patch = serializeOnboardingProgressPatch({
      currentStep: "domain",
      completedSteps: completedText,
      domainSavedAt: new Date("2026-09-13T00:00:00.000Z"),
    });

    expect(patch.completedSteps).toBe(completedText);
    expect(patch.currentStep).toBe("domain");
    expect(patch.domainSavedAt).toEqual(new Date("2026-09-13T00:00:00.000Z"));
  });
});
