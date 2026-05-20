/**
 * Medium Adapter Registry — Pluggable Rendering Engines
 * ───────────────────────────────────────────────────────
 * Each medium type registers an adapter that defines:
 * - Layout behavior (how content fills the canvas)
 * - Interaction density (how much UI chrome is appropriate)
 * - Default viewing modes (which mode to start in)
 * - Pacing logic (how traversal speed/rhythm works)
 * - Supported viewing modes (which modes are available)
 * 
 * All adapters inherit shared systems (atmosphere, provenance,
 * sync, identity, navigation) without reimplementation.
 * 
 * The registry is extensible — new medium types can be added
 * without modifying the core ManifestationReader.
 */

import type { ViewingMode } from "../useManifestationReader";

// ── Adapter Configuration Types ──────────────────────────────────────────────

export type InteractionDensity = "minimal" | "low" | "moderate" | "high";

export type PacingProfile = {
  /** Average time per unit in ms (for auto-advance, if enabled) */
  averageDwell: number;
  /** Whether pacing adapts to content complexity */
  adaptive: boolean;
  /** Transition style between units */
  transitionStyle: "cut" | "fade" | "slide" | "zoom" | "cinematic" | "dissolve";
  /** Transition duration in ms */
  transitionDuration: number;
  /** Whether to pause at boundaries (chapter starts, etc.) */
  pauseAtBoundaries: boolean;
};

export type LayoutBehavior = {
  /** How content fills the canvas */
  fillMode: "contain" | "cover" | "fit-width" | "fit-height" | "natural";
  /** Maximum content width as fraction of viewport */
  maxWidthFraction: number;
  /** Whether content should be centered */
  centered: boolean;
  /** Padding around content (in rem) */
  padding: number;
  /** Whether spread mode is meaningful for this medium */
  supportsSpread: boolean;
  /** Whether guided/panel mode is meaningful */
  supportsGuided: boolean;
  /** Aspect ratio hint (null = natural) */
  aspectRatio: string | null;
};

export type AtmosphereDefaults = {
  /** Default mood profile ID */
  defaultMood: string;
  /** Whether atmosphere responds to content (page-specific moods) */
  contentResponsive: boolean;
  /** Ambient intensity default */
  defaultIntensity: number;
};

export type MediumAdapter = {
  /** Unique medium type identifier */
  type: string;
  /** Human-readable label */
  label: string;
  /** Default viewing mode when entering this medium */
  defaultMode: ViewingMode;
  /** Supported viewing modes (ordered by relevance) */
  supportedModes: ViewingMode[];
  /** Layout behavior configuration */
  layout: LayoutBehavior;
  /** Interaction density level */
  interactionDensity: InteractionDensity;
  /** Pacing profile */
  pacing: PacingProfile;
  /** Atmosphere defaults */
  atmosphere: AtmosphereDefaults;
  /** Navigation unit semantics */
  primaryUnit: string;
  /** Secondary unit (if applicable) */
  secondaryUnit?: string;
  /** Whether this medium supports soundtrack sync */
  supportsSoundtrackSync: boolean;
  /** Whether this medium has panel/region data */
  hasPanelData: boolean;
  /** Custom CSS class to apply to the canvas container */
  canvasClassName?: string;
};

// ── Built-in Adapters ────────────────────────────────────────────────────────

const comicAdapter: MediumAdapter = {
  type: "comic",
  label: "Comic / Graphic Novel",
  defaultMode: "standard",
  supportedModes: ["standard", "spread", "guided", "overview"],
  layout: {
    fillMode: "contain",
    maxWidthFraction: 0.85,
    centered: true,
    padding: 0,
    supportsSpread: true,
    supportsGuided: true,
    aspectRatio: null,
  },
  interactionDensity: "low",
  pacing: {
    averageDwell: 8000,
    adaptive: true,
    transitionStyle: "cinematic",
    transitionDuration: 600,
    pauseAtBoundaries: true,
  },
  atmosphere: {
    defaultMood: "sacred",
    contentResponsive: true,
    defaultIntensity: 0.9,
  },
  primaryUnit: "page",
  secondaryUnit: "panel",
  supportsSoundtrackSync: true,
  hasPanelData: true,
};

const manuscriptAdapter: MediumAdapter = {
  type: "manuscript",
  label: "Manuscript / Written Work",
  defaultMode: "standard",
  supportedModes: ["standard", "overview"],
  layout: {
    fillMode: "fit-width",
    maxWidthFraction: 0.65,
    centered: true,
    padding: 2,
    supportsSpread: false,
    supportsGuided: false,
    aspectRatio: null,
  },
  interactionDensity: "minimal",
  pacing: {
    averageDwell: 30000,
    adaptive: false,
    transitionStyle: "fade",
    transitionDuration: 400,
    pauseAtBoundaries: true,
  },
  atmosphere: {
    defaultMood: "void",
    contentResponsive: false,
    defaultIntensity: 0.7,
  },
  primaryUnit: "chapter",
  secondaryUnit: "section",
  supportsSoundtrackSync: false,
  hasPanelData: false,
};

const childrensAdapter: MediumAdapter = {
  type: "childrens",
  label: "Children's Book",
  defaultMode: "standard",
  supportedModes: ["standard", "spread", "guided", "overview"],
  layout: {
    fillMode: "contain",
    maxWidthFraction: 0.9,
    centered: true,
    padding: 0,
    supportsSpread: true,
    supportsGuided: true,
    aspectRatio: "4/3",
  },
  interactionDensity: "low",
  pacing: {
    averageDwell: 12000,
    adaptive: false,
    transitionStyle: "slide",
    transitionDuration: 800,
    pauseAtBoundaries: false,
  },
  atmosphere: {
    defaultMood: "ethereal",
    contentResponsive: true,
    defaultIntensity: 0.6,
  },
  primaryUnit: "page",
  supportsSoundtrackSync: true,
  hasPanelData: false,
};

const loreAdapter: MediumAdapter = {
  type: "lore",
  label: "Lore Archive",
  defaultMode: "overview",
  supportedModes: ["standard", "overview"],
  layout: {
    fillMode: "fit-width",
    maxWidthFraction: 0.7,
    centered: true,
    padding: 1.5,
    supportsSpread: false,
    supportsGuided: false,
    aspectRatio: null,
  },
  interactionDensity: "moderate",
  pacing: {
    averageDwell: 20000,
    adaptive: true,
    transitionStyle: "dissolve",
    transitionDuration: 500,
    pauseAtBoundaries: true,
  },
  atmosphere: {
    defaultMood: "desolation",
    contentResponsive: true,
    defaultIntensity: 0.85,
  },
  primaryUnit: "entry",
  supportsSoundtrackSync: false,
  hasPanelData: false,
};

const videoAdapter: MediumAdapter = {
  type: "video",
  label: "Video / Motion",
  defaultMode: "standard",
  supportedModes: ["standard", "overview"],
  layout: {
    fillMode: "contain",
    maxWidthFraction: 0.95,
    centered: true,
    padding: 0,
    supportsSpread: false,
    supportsGuided: false,
    aspectRatio: "16/9",
  },
  interactionDensity: "minimal",
  pacing: {
    averageDwell: 0, // continuous
    adaptive: false,
    transitionStyle: "cut",
    transitionDuration: 0,
    pauseAtBoundaries: false,
  },
  atmosphere: {
    defaultMood: "void",
    contentResponsive: false,
    defaultIntensity: 0.5,
  },
  primaryUnit: "timestamp",
  supportsSoundtrackSync: false, // video has its own audio
  hasPanelData: false,
};

const guideAdapter: MediumAdapter = {
  type: "guide",
  label: "Guide / Testimony",
  defaultMode: "standard",
  supportedModes: ["standard", "overview"],
  layout: {
    fillMode: "fit-width",
    maxWidthFraction: 0.7,
    centered: true,
    padding: 2,
    supportsSpread: false,
    supportsGuided: false,
    aspectRatio: null,
  },
  interactionDensity: "moderate",
  pacing: {
    averageDwell: 25000,
    adaptive: true,
    transitionStyle: "fade",
    transitionDuration: 600,
    pauseAtBoundaries: true,
  },
  atmosphere: {
    defaultMood: "sacred",
    contentResponsive: false,
    defaultIntensity: 0.8,
  },
  primaryUnit: "section",
  supportsSoundtrackSync: true,
  hasPanelData: false,
};

// ── Registry ─────────────────────────────────────────────────────────────────

const ADAPTER_REGISTRY = new Map<string, MediumAdapter>([
  ["comic", comicAdapter],
  ["manuscript", manuscriptAdapter],
  ["childrens", childrensAdapter],
  ["lore", loreAdapter],
  ["video", videoAdapter],
  ["guide", guideAdapter],
]);

/**
 * Get the adapter for a specific medium type.
 * Falls back to comic adapter if type is unknown.
 */
export function getAdapter(mediumType: string): MediumAdapter {
  return ADAPTER_REGISTRY.get(mediumType) ?? comicAdapter;
}

/**
 * Register a custom adapter for a new medium type.
 * Allows future extensibility without modifying core code.
 */
export function registerAdapter(adapter: MediumAdapter): void {
  ADAPTER_REGISTRY.set(adapter.type, adapter);
}

/**
 * Get all registered adapter types.
 */
export function getRegisteredTypes(): string[] {
  return Array.from(ADAPTER_REGISTRY.keys());
}

/**
 * Check if a medium type has a registered adapter.
 */
export function hasAdapter(mediumType: string): boolean {
  return ADAPTER_REGISTRY.has(mediumType);
}

export type { MediumAdapter as MediumAdapterType };
export { ADAPTER_REGISTRY };
