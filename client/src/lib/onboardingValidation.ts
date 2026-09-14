export type OnboardingStepId =
  | "covenant"
  | "identity"
  | "domain"
  | "presence"
  | "testimony"
  | "license"
  | "first_work";

export type OnboardingValidationErrors = Partial<
  Record<"domainName" | "originStatement" | "testimonyText" | "testimonyWid" | "selectedPackId", string>
>;

export function validateOnboardingStep(input: {
  step: OnboardingStepId;
  domainName: string;
  originStatement: string;
  testimonyText: string;
  testimonyWid: string;
  selectedPackId: string;
}): OnboardingValidationErrors {
  const errors: OnboardingValidationErrors = {};

  if (input.step === "domain" && input.domainName.trim().length < 2) {
    errors.domainName = "Enter at least two characters for your creator domain name.";
  }

  if (input.step === "presence" && input.originStatement.trim().length < 20) {
    errors.originStatement = "Your origin statement must be at least 20 characters.";
  }

  if (input.step === "testimony") {
    if (input.testimonyText.trim().length < 10) {
      errors.testimonyText = "Your testimony must be at least 10 characters, or choose Skip for now.";
    }
    if (input.testimonyWid.trim() && !/^WID-[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(input.testimonyWid.trim().toUpperCase())) {
      errors.testimonyWid = "Use a WID in the form WID-MUS-XXXX-XXXX, or leave this optional field blank.";
    }
  }

  if (input.step === "license" && !input.selectedPackId) {
    errors.selectedPackId = "Choose an upload pack, or choose Skip for now.";
  }

  return errors;
}
