import { describe, expect, it } from "vitest";
import { parseVisualPreset, parseVisualPresetJson, serializeVisualPreset } from "./visualPresetCodec";

describe("Visual Lab preset codec", () => {
  it("round-trips only approved visual values", () => {
    const parsed = parseVisualPreset({
      version: 1,
      name: "Cathedral Review",
      tokens: { accentColor: "#C49A28", cardRadius: 16, transitionMs: 300 },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parseVisualPresetJson(serializeVisualPreset(parsed.preset))).toEqual(parsed);
  });

  it("rejects unsupported fields, executable CSS, and unknown token names", () => {
    expect(parseVisualPreset({ version: 1, name: "Unsafe", tokens: { accentColor: "var(--ln-gold)" } }).ok).toBe(false);
    expect(parseVisualPreset({ version: 1, name: "Unsafe", tokens: { unknown: "#C49A28" } }).ok).toBe(false);
    expect(parseVisualPreset({ version: 1, name: "Unsafe", tokens: {}, callback: "alert(1)" }).ok).toBe(false);
  });

  it("rejects invalid version, malformed JSON, and out-of-range numeric values", () => {
    expect(parseVisualPreset({ version: 2, name: "Wrong Version", tokens: {} }).ok).toBe(false);
    expect(parseVisualPreset({ version: 1, name: "Too Wide", tokens: { modalWidth: 900 } }).ok).toBe(false);
    expect(parseVisualPresetJson("{not json").ok).toBe(false);
  });
});
