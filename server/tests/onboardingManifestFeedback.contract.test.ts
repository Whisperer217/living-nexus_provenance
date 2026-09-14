import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const manifestPath = path.resolve(process.cwd(), "client/src/pages/OnboardingManifest.tsx");

describe("OnboardingManifest save feedback contract", () => {
  it("validates before mutation and only advances after a confirmed save", () => {
    const source = fs.readFileSync(manifestPath, "utf8");

    expect(source).toContain("validateOnboardingStep({");
    expect(source).toContain("setValidationErrors(nextErrors)");
    expect(source).toContain("await saveStepMutation.mutateAsync");
    expect(source).toContain("setCompletedSteps(nextCompletedSteps)");
    expect(source.indexOf("await saveStepMutation.mutateAsync")).toBeLessThan(source.indexOf("setCompletedSteps(nextCompletedSteps)"));
    expect(source).toContain('toast.success("Onboarding progress saved"');
    expect(source).toContain('toast.error("Onboarding progress could not be saved"');
  });

  it("retains accessible inline errors and a truthful pending submit state", () => {
    const source = fs.readFileSync(manifestPath, "utf8");

    expect(source).toContain("<FieldError");
    expect(source).toContain('aria-invalid={Boolean(errors.domainName)}');
    expect(source).toContain('aria-invalid={Boolean(error)}');
    expect(source).toContain('disabled={isSaving}');
    expect(source).toContain("Saving progress…");
    expect(source).toContain("Saving your acceptance…");
  });
});
