export const VISION_PROMPT_MAX_LENGTH = 1_000;

export function getVisionPromptLength(prompt: string) {
  return prompt.trim().length;
}

export function isVisionPromptOverLimit(prompt: string) {
  return getVisionPromptLength(prompt) > VISION_PROMPT_MAX_LENGTH;
}

export function getVisionPromptLimitMessage(prompt: string) {
  const overBy = getVisionPromptLength(prompt) - VISION_PROMPT_MAX_LENGTH;
  return `Vision prompts can be up to ${VISION_PROMPT_MAX_LENGTH.toLocaleString()} characters. Your draft is still here; shorten it by ${overBy.toLocaleString()} ${overBy === 1 ? "character" : "characters"} to generate privately.`;
}

export function getVisionPromptErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("too_big") || message.includes("<=1000") || message.includes("<= 1000")) {
    return "Vision prompts can be up to 1,000 characters. Your draft is still here; shorten it and try again.";
  }
  return message || "PNA is temporarily unavailable.";
}
