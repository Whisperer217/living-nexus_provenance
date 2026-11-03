import {
  BASE_VISUAL_TOKENS,
  VISUAL_PRESET_VERSION,
  VISUAL_TOKEN_DEFINITIONS,
  type VisualTokenKey,
  type VisualTokenValues,
} from "./visualTokenSchema";

export const VISUAL_PRESET_STORAGE_KEY = "ln-dev-visual-lab:presets:v1";
export const MAX_VISUAL_PRESET_BYTES = 32 * 1024;
export const MAX_VISUAL_PRESETS = 24;

export interface VisualPresetV1 {
  version: typeof VISUAL_PRESET_VERSION;
  name: string;
  tokens: VisualTokenValues;
}

export type PresetParseResult =
  | { ok: true; preset: VisualPresetV1 }
  | { ok: false; error: string };

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,'’&()_-]{0,47}$/;

export const INITIAL_VISUAL_PRESETS: VisualPresetV1[] = [
  { version: 1, name: "Current Production", tokens: { ...BASE_VISUAL_TOKENS } },
  { version: 1, name: "Dark Archive", tokens: { ...BASE_VISUAL_TOKENS, cardRadius: 8, spaceScale: 14, shadowOpacity: 0.42 } },
  { version: 1, name: "Gold Minimal", tokens: { ...BASE_VISUAL_TOKENS, accentColor: "#C49A28", cardRadius: 6, blur: 0, shadowOpacity: 0.2 } },
  { version: 1, name: "Cinematic", tokens: { ...BASE_VISUAL_TOKENS, accentColor: "#E8B840", cardRadius: 18, blur: 20, shadowOpacity: 0.5, transitionMs: 360 } },
  { version: 1, name: "Compact Desktop", tokens: { ...BASE_VISUAL_TOKENS, spaceScale: 10, sectionSpace: 24, cardWidth: 248, cardHeight: 292, navHeight: 48 } },
  { version: 1, name: "Mobile Dense", tokens: { ...BASE_VISUAL_TOKENS, spaceScale: 10, sectionSpace: 20, cardWidth: 236, cardHeight: 280, playerHeight: 56, bottomSheetRadius: 24 } },
  { version: 1, name: "Experimental", tokens: { ...BASE_VISUAL_TOKENS, accentColor: "#E8B840", cardRadius: 24, headingScale: 1.12, blur: 24, transitionMs: 480 } },
];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function validateName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return NAME_PATTERN.test(normalized) ? normalized : null;
}

function validateTokens(value: unknown): VisualTokenValues | null {
  if (!isPlainRecord(value)) return null;
  const tokens: VisualTokenValues = {};

  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey as VisualTokenKey;
    const definition = VISUAL_TOKEN_DEFINITIONS[key];
    if (!definition) return null;

    if (definition.kind === "color") {
      if (typeof rawValue !== "string" || !COLOR_PATTERN.test(rawValue)) return null;
      tokens[key] = rawValue.toUpperCase();
      continue;
    }

    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) return null;
    if (definition.min !== undefined && rawValue < definition.min) return null;
    if (definition.max !== undefined && rawValue > definition.max) return null;
    tokens[key] = rawValue;
  }

  return tokens;
}

export function parseVisualPreset(value: unknown): PresetParseResult {
  if (!isPlainRecord(value)) return { ok: false, error: "A Visual Lab preset must be an object." };
  const keys = Object.keys(value);
  if (keys.some((key) => key !== "version" && key !== "name" && key !== "tokens")) {
    return { ok: false, error: "The preset contains an unsupported field." };
  }
  if (value.version !== VISUAL_PRESET_VERSION) {
    return { ok: false, error: "The preset version is not supported." };
  }

  const name = validateName(value.name);
  if (!name) return { ok: false, error: "Use a concise preset name with letters, numbers, and standard punctuation." };

  const tokens = validateTokens(value.tokens);
  if (!tokens) return { ok: false, error: "The preset contains an unsafe or out-of-range visual value." };

  return { ok: true, preset: { version: VISUAL_PRESET_VERSION, name, tokens } };
}

export function parseVisualPresetJson(json: string): PresetParseResult {
  if (new TextEncoder().encode(json).byteLength > MAX_VISUAL_PRESET_BYTES) {
    return { ok: false, error: "The preset file exceeds the 32 KB Visual Lab limit." };
  }

  try {
    return parseVisualPreset(JSON.parse(json));
  } catch {
    return { ok: false, error: "The selected file is not valid JSON." };
  }
}

export function serializeVisualPreset(preset: VisualPresetV1): string {
  return `${JSON.stringify({ version: VISUAL_PRESET_VERSION, name: preset.name, tokens: preset.tokens }, null, 2)}\n`;
}

export function parseVisualPresetCollection(value: unknown): VisualPresetV1[] {
  if (!Array.isArray(value) || value.length > MAX_VISUAL_PRESETS) return [];
  const parsed = value.map(parseVisualPreset);
  return parsed.every((result) => result.ok)
    ? parsed.map((result) => (result as Extract<PresetParseResult, { ok: true }>).preset)
    : [];
}
