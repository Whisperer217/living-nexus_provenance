import { describe, expect, it } from "vitest";
import {
  getVisionPromptErrorMessage,
  getVisionPromptLength,
  getVisionPromptLimitMessage,
  isVisionPromptOverLimit,
  VISION_PROMPT_MAX_LENGTH,
} from "../../client/src/lib/visionPrompt";

describe("Vision prompt boundary", () => {
  it("permits a prompt at the exact limit and preserves an over-limit draft for revision", () => {
    expect(getVisionPromptLength("x".repeat(VISION_PROMPT_MAX_LENGTH))).toBe(VISION_PROMPT_MAX_LENGTH);
    expect(isVisionPromptOverLimit("x".repeat(VISION_PROMPT_MAX_LENGTH))).toBe(false);
    expect(isVisionPromptOverLimit("x".repeat(VISION_PROMPT_MAX_LENGTH + 1))).toBe(true);
    expect(getVisionPromptLimitMessage("x".repeat(VISION_PROMPT_MAX_LENGTH + 1))).toContain("draft is still here");
  });

  it("translates a raw schema size failure into creator-safe retry guidance", () => {
    expect(getVisionPromptErrorMessage('{"code":"too_big","maximum":1000}')).toBe(
      "Vision prompts can be up to 1,000 characters. Your draft is still here; shorten it and try again.",
    );
  });
});
