export const VISUAL_PRESET_VERSION = 1 as const;

export type VisualTokenKind = "color" | "number";
export type VisualTokenGroup = "color" | "shape" | "spacing" | "type" | "component" | "effect";

export interface VisualTokenDefinition {
  cssVariable: `--${string}`;
  kind: VisualTokenKind;
  label: string;
  group: VisualTokenGroup;
  fallbackVariable?: `--${string}`;
  min?: number;
  max?: number;
  step?: number;
  unit?: "px" | "ms";
}

export const VISUAL_TOKEN_DEFINITIONS = {
  pageColor: { cssVariable: "--ln-vl-page", kind: "color", label: "Page background", group: "color", fallbackVariable: "--ln-void" },
  surfaceColor: { cssVariable: "--ln-vl-surface", kind: "color", label: "Surface", group: "color", fallbackVariable: "--ln-coal" },
  cardColor: { cssVariable: "--ln-vl-card", kind: "color", label: "Card surface", group: "color", fallbackVariable: "--ln-iron" },
  textColor: { cssVariable: "--ln-vl-text", kind: "color", label: "Primary text", group: "color", fallbackVariable: "--ln-parchment" },
  mutedTextColor: { cssVariable: "--ln-vl-muted", kind: "color", label: "Secondary text", group: "color", fallbackVariable: "--ln-smoke" },
  accentColor: { cssVariable: "--ln-vl-accent", kind: "color", label: "Primary accent", group: "color", fallbackVariable: "--ln-gold" },
  borderColor: { cssVariable: "--ln-vl-border", kind: "color", label: "Border", group: "color", fallbackVariable: "--ln-ash" },
  cardRadius: { cssVariable: "--ln-vl-card-radius", kind: "number", label: "Card radius", group: "shape", min: 0, max: 32, step: 1, unit: "px" },
  buttonRadius: { cssVariable: "--ln-vl-button-radius", kind: "number", label: "Button radius", group: "shape", min: 0, max: 32, step: 1, unit: "px" },
  borderWidth: { cssVariable: "--ln-vl-border-width", kind: "number", label: "Border width", group: "shape", min: 0, max: 4, step: 1, unit: "px" },
  spaceScale: { cssVariable: "--ln-vl-space", kind: "number", label: "Component spacing", group: "spacing", min: 4, max: 48, step: 1, unit: "px" },
  sectionSpace: { cssVariable: "--ln-vl-section-space", kind: "number", label: "Section spacing", group: "spacing", min: 12, max: 96, step: 2, unit: "px" },
  bodyScale: { cssVariable: "--ln-vl-body-scale", kind: "number", label: "Body scale", group: "type", min: 0.85, max: 1.25, step: 0.01 },
  headingScale: { cssVariable: "--ln-vl-heading-scale", kind: "number", label: "Heading scale", group: "type", min: 0.8, max: 1.5, step: 0.01 },
  lineHeight: { cssVariable: "--ln-vl-line-height", kind: "number", label: "Body line height", group: "type", min: 1.2, max: 2, step: 0.05 },
  cardWidth: { cssVariable: "--ln-vl-card-width", kind: "number", label: "Card width", group: "component", min: 180, max: 460, step: 4, unit: "px" },
  cardHeight: { cssVariable: "--ln-vl-card-height", kind: "number", label: "Card height", group: "component", min: 180, max: 520, step: 4, unit: "px" },
  navHeight: { cssVariable: "--ln-vl-nav-height", kind: "number", label: "Nav height", group: "component", min: 44, max: 96, step: 2, unit: "px" },
  playerHeight: { cssVariable: "--ln-vl-player-height", kind: "number", label: "Player height", group: "component", min: 48, max: 128, step: 2, unit: "px" },
  modalWidth: { cssVariable: "--ln-vl-modal-width", kind: "number", label: "Modal width", group: "component", min: 280, max: 760, step: 4, unit: "px" },
  bottomSheetRadius: { cssVariable: "--ln-vl-sheet-radius", kind: "number", label: "Bottom-sheet radius", group: "component", min: 0, max: 36, step: 1, unit: "px" },
  shadowOpacity: { cssVariable: "--ln-vl-shadow-alpha", kind: "number", label: "Shadow intensity", group: "effect", min: 0, max: 0.8, step: 0.01 },
  blur: { cssVariable: "--ln-vl-blur", kind: "number", label: "Ambient blur", group: "effect", min: 0, max: 32, step: 1, unit: "px" },
  transitionMs: { cssVariable: "--ln-vl-transition", kind: "number", label: "Transition speed", group: "effect", min: 0, max: 1000, step: 5, unit: "ms" },
} as const satisfies Record<string, VisualTokenDefinition>;

export type VisualTokenKey = keyof typeof VISUAL_TOKEN_DEFINITIONS;
export type VisualTokenValues = Partial<Record<VisualTokenKey, string | number>>;
export type PreviewStyle = Record<`--${string}`, string>;

export const VISUAL_TOKEN_GROUPS: Array<{ id: VisualTokenGroup; label: string }> = [
  { id: "color", label: "Colors" },
  { id: "shape", label: "Borders & Shape" },
  { id: "spacing", label: "Spacing" },
  { id: "type", label: "Typography" },
  { id: "component", label: "Components" },
  { id: "effect", label: "Shadows & Effects" },
];

export const BASE_VISUAL_TOKENS: VisualTokenValues = {
  cardRadius: 12,
  buttonRadius: 8,
  borderWidth: 1,
  spaceScale: 16,
  sectionSpace: 36,
  bodyScale: 1,
  headingScale: 1,
  lineHeight: 1.65,
  cardWidth: 292,
  cardHeight: 336,
  navHeight: 56,
  playerHeight: 64,
  modalWidth: 480,
  bottomSheetRadius: 20,
  shadowOpacity: 0.32,
  blur: 12,
  transitionMs: 220,
};

export function visualTokensToPreviewStyle(tokens: VisualTokenValues): PreviewStyle {
  const style: PreviewStyle = {};

  for (const [rawKey, value] of Object.entries(tokens)) {
    if (value === undefined) continue;
    const key = rawKey as VisualTokenKey;
    const definition = VISUAL_TOKEN_DEFINITIONS[key];
    if (!definition) continue;
    style[definition.cssVariable] = definition.kind === "color"
      ? String(value)
      : `${value}${"unit" in definition ? definition.unit ?? "" : ""}`;
  }

  return style;
}
