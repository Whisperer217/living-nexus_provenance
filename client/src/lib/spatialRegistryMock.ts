export type SpatialRegistryNodeId =
  | "creator"
  | "work"
  | "prepare"
  | "register"
  | "verify"
  | "lineage"
  | "listen";

export type SpatialRegistryNode = {
  id: SpatialRegistryNodeId;
  label: string;
  eyebrow: string;
  description: string;
  position: { x: number; y: number };
};

/**
 * An intentionally noncanonical orientation map. It holds no creator, Work,
 * WID, player, Registry, or provider state and must remain presentation-only.
 */
export const SPATIAL_REGISTRY_STUDY = {
  label: "Illustrative spatial study",
  disclaimer: "No creator, Work, WID, player, Registry, or AI context is read or created here.",
  nodes: [
    {
      id: "creator",
      label: "CREATOR",
      eyebrow: "A distinct domain",
      description: "A creator’s identity belongs to the creator. A future visual surface may only display a governed Core projection.",
      position: { x: 20, y: 31 },
    },
    {
      id: "work",
      label: "WORK",
      eyebrow: "The orienting object",
      description: "A creative object is not assumed to be registered, public, playable, or available to AI. This study draws no conclusion about any actual Work.",
      position: { x: 50, y: 46 },
    },
    {
      id: "prepare",
      label: "PREPARE",
      eyebrow: "Creator-held details",
      description: "Preparation is a private, creator-directed act. It can lead to a governed Register flow, but it neither issues a record nor changes a Work here.",
      position: { x: 28, y: 73 },
    },
    {
      id: "register",
      label: "REGISTER",
      eyebrow: "A governed pathway",
      description: "Registration is a separate consequential process. It occurs only in the canonical flow after deliberate creator confirmation, never from this visual study.",
      position: { x: 76, y: 30 },
    },
    {
      id: "verify",
      label: "VERIFY",
      eyebrow: "Read an existing proof",
      description: "Verification can read an existing proof through a governed surface. A typed label or a visual node is not proof and does not establish a seal.",
      position: { x: 80, y: 68 },
    },
    {
      id: "lineage",
      label: "LINEAGE",
      eyebrow: "Declared relations only",
      description: "Lineage is shown only when declared records establish a relation. It is not inferred from appearance, listening, a filename, or a client-side graph.",
      position: { x: 49, y: 14 },
    },
    {
      id: "listen",
      label: "LISTEN",
      eyebrow: "One canonical player",
      description: "Listening belongs to the existing Living Nexus player when a real Work is deliberately selected. Playback never becomes AI context by itself.",
      position: { x: 67, y: 82 },
    },
  ] satisfies SpatialRegistryNode[],
  edges: [
    ["creator", "work"],
    ["work", "prepare"],
    ["prepare", "register"],
    ["register", "verify"],
    ["work", "lineage"],
    ["work", "listen"],
  ] satisfies [SpatialRegistryNodeId, SpatialRegistryNodeId][],
} as const;
