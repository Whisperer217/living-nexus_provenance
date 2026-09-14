import { describe, expect, it } from "vitest";
import { validateOnboardingStep } from "../../client/src/lib/onboardingValidation";

const baseline = {
  domainName: "DocS",
  originStatement: "I create to preserve human testimony and creative lineage.",
  testimonyText: "This testimony is enough to satisfy the minimum requirement.",
  testimonyWid: "",
  selectedPackId: "starter",
};

describe("onboarding inline validation", () => {
  it("returns field-specific errors before a required step can submit", () => {
    expect(validateOnboardingStep({ ...baseline, step: "domain", domainName: "D" })).toEqual({
      domainName: "Enter at least two characters for your creator domain name.",
    });
    expect(validateOnboardingStep({ ...baseline, step: "presence", originStatement: "too short" })).toEqual({
      originStatement: "Your origin statement must be at least 20 characters.",
    });
    expect(validateOnboardingStep({ ...baseline, step: "testimony", testimonyText: "short", testimonyWid: "wid-invalid" })).toEqual({
      testimonyText: "Your testimony must be at least 10 characters, or choose Skip for now.",
      testimonyWid: "Use a WID in the form WID-MUS-XXXX-XXXX, or leave this optional field blank.",
    });
  });

  it("accepts valid user input and normalizes case only at the component boundary", () => {
    expect(validateOnboardingStep({ ...baseline, step: "testimony", testimonyWid: "WID-MUS-C1FCC012-70E4B7CC" })).toEqual({});
    expect(validateOnboardingStep({ ...baseline, step: "license", selectedPackId: "" })).toEqual({
      selectedPackId: "Choose an upload pack, or choose Skip for now.",
    });
  });
});
