/**
 * @domain   The Registry → Spatial Prototype → Fictional Fixture
 * @impl     Shared Type — Local-only mock registry used by the spatial dashboard prototype
 *
 * This module is the source of truth for the Spatial Registry mock.
 * The Three.js layer visualizes these relationships; it is not the registry.
 * Nothing here is connected to production data, auth, storage, or payments.
 */

export type SpatialRegistryNodeId =
  | "profile"
  | "work"
  | "edit"
  | "register"
  | "witness"
  | "lineage"
  | "player";

export type SpatialView = "overview" | SpatialRegistryNodeId;

export type SpatialRegistryNode = {
  id: SpatialRegistryNodeId;
  label: string;
  shortLabel: string;
  eyebrow: string;
  caption: string;
  form: string;
  language: string;
  position: [number, number, number];
  color: string;
  description: string;
};

export const ASSET = {
  portrait: "/prototype/spatial-registry/jake-portrait.png",
  cover: "/prototype/spatial-registry/yahweh-cover.png",
  nebula: "/prototype/spatial-registry/nexus-nebula.png",
  slimDoggy: "/prototype/spatial-registry/slim-doggy.png",
  lnNode: "/prototype/spatial-registry/ln-node-avatar.png",
  pathways: {
    work: "/prototype/spatial-registry/pathways/pathway-work-core.png",
    profile: "/prototype/spatial-registry/pathways/pathway-creator.png",
    edit: "/prototype/spatial-registry/pathways/pathway-edit.png",
    register: "/prototype/spatial-registry/pathways/pathway-register.png",
    witness: "/prototype/spatial-registry/pathways/pathway-witness.png",
    lineage: "/prototype/spatial-registry/pathways/pathway-lineage.png",
    player: "/prototype/spatial-registry/pathways/pathway-player.png",
  },
} as const;

export const DEFAULT_COVER_ART = ASSET.cover;

/** One visual language → six domains → one central work. */
export const VISUAL_LANGUAGE = {
  principle: "One visual language. Six domains. One central work.",
  palette: {
    void: "#0a0a0a",
    gold: "#d4af37",
    goldHot: "#f0d78a",
    cyan: "#4fc3f7",
    stone: "#c9b896",
  },
  materials: ["polished gold", "cyan emission", "void black", "crystal"],
} as const;

export const SPATIAL_REGISTRY_MOCK = {
  creator: {
    name: "Jake",
    artistName: "Weave & Breathe",
    registeredWorks: 7,
    witnessedWorks: 23,
    registrationCapacity: 10,
    slotsRemaining: 9,
    witnessActivity: 23,
    memberSince: "AUG 15, 2026",
    quote: "We don't chase algorithms. We establish truth. We leave a witness.",
    quoteAttribution: "Living Nexus Doctrine",
  },
  work: {
    title: "Yahweh Lights My Way",
    artist: "Weave & Breathe",
    version: "01",
    wid: "LN-00017",
    status: "Registered",
    registrationDate: "15 August 2026",
    registrationTime: "11:42 AM",
    duration: "04:12",
    durationSeconds: 252,
  },
  registrationEvent: {
    id: "REG-LN-00017-01",
    status: "COMPLETED",
    createdBy: "Jake / Weave & Breathe",
    date: "Aug 15, 2026 11:42 AM",
    copy: "The work enters the chamber. The WID appears. The record establishes. The seal closes.",
  },
  witnesses: [
    { name: "Living Nexus Node", at: "Aug 15, 2026 · 11:42 AM", avatar: ASSET.lnNode },
    { name: "Slim Doggy", at: "Aug 15, 2026 · 11:48 AM", avatar: ASSET.slimDoggy },
  ],
  versions: [
    { id: "01", label: "Version 01", caption: "Registered · Aug 15, 2026", state: "registered" },
    { id: "02", label: "Version 02", caption: "In formation", state: "forming" },
    { id: "03", label: "Version 03", caption: "Latent", state: "latent" },
  ],
  creatorWorks: [
    { title: "Yahweh Lights My Way", wid: "LN-00017", status: "Registered" },
    { title: "Field Hymn", wid: "—", status: "Working" },
    { title: "Quiet Path", wid: "—", status: "Sketch" },
  ],
  collaborators: [
    { name: "Living Nexus Node", role: "Registry witness" },
    { name: "Slim Doggy", role: "Attestation" },
  ],
  derivedArtifacts: [
    { title: "Cover art", kind: "image" },
    { title: "Registration seal", kind: "record" },
    { title: "Canonical stream", kind: "playback" },
  ],
  creatorStages: [
    { id: "identity", label: "Identity", caption: "Jake / Weave & Breathe" },
    { id: "works", label: "Works", caption: "7 registered" },
    { id: "attribution", label: "Attribution", caption: "External surface" },
    { id: "collaborators", label: "Collaborators", caption: "Witnesses of the domain" },
  ],
  lineageSequence: [
    { id: "creation", label: "Creation", caption: "Identity establishes the work" },
    { id: "edits", label: "Edits", caption: "Version 01 → 02 → 03" },
    { id: "registrations", label: "Registrations", caption: "WID LN-00017" },
    { id: "witnesses", label: "Witnesses", caption: "Attestation of the event" },
    { id: "derived", label: "Derived artifacts", caption: "Cover · Seal · Stream" },
  ],
  attribution: {
    label: "View Attribution",
    destinationHost: "weaveandbreathe.attribution",
    note: "Attribution lives on a separate creator surface. The registry keeps provenance.",
  },
  lineagePath: ["profile", "edit", "register", "witness"] satisfies SpatialRegistryNodeId[],
  registrationPath: ["profile", "work", "register"] satisfies SpatialRegistryNodeId[],
  nodes: [
    {
      id: "profile",
      label: "PROFILE",
      shortLabel: "CREATOR",
      eyebrow: "Creator identity",
      caption: "Jake / Weave & Breathe",
      form: "Avatar / crystalline form",
      language: "identity, authorship",
      position: [-4.4, 2.35, -0.55],
      color: "#c9b896",
      description: "A spatial portrait of the creator: identity, works, attribution, collaborators.",
    },
    {
      id: "work",
      label: "YAHWEH LIGHTS MY WAY",
      shortLabel: "WORK",
      eyebrow: "Registered work",
      caption: "WID: LN-00017",
      form: "Nested orbital nucleus",
      language: "the object everything connects to",
      position: [0, 0.55, 0],
      color: "#d4af37",
      description: "The central registered work. Every pathway is a way of approaching this object.",
    },
    {
      id: "edit",
      label: "EDIT",
      shortLabel: "EDIT",
      eyebrow: "Working version",
      caption: "Version 01 · Aug 15, 2026",
      form: "Fragmented / reforming artifact",
      language: "transformation, revision",
      position: [-3.7, -1.85, 0.85],
      color: "#8aa8b8",
      description: "Layers of the work. Version 01 → 02 → 03, the artifact reforming in space.",
    },
    {
      id: "register",
      label: "REGISTER",
      shortLabel: "REGISTER",
      eyebrow: "Provenance event",
      caption: "Aug 15, 2026 · 11:42 AM",
      form: "Golden geometric seal",
      language: "declaration, permanence",
      position: [4.15, 2.2, -0.45],
      color: "#d4af37",
      description: "A registration chamber. The WID appears, the record establishes, the seal closes.",
    },
    {
      id: "witness",
      label: "WITNESS",
      shortLabel: "WITNESS",
      eyebrow: "Attestation",
      caption: "2 Witnesses",
      form: "Luminous sphere / eye",
      language: "observation, attestation",
      position: [3.85, -1.85, 0.9],
      color: "#4fc3f7",
      description: "Witnesses appear as luminous points. Connection: Witness → Event → Work.",
    },
    {
      id: "lineage",
      label: "LINEAGE",
      shortLabel: "LINEAGE",
      eyebrow: "Visible relation",
      caption: "Trace the journey",
      form: "Orbital ring / constellation",
      language: "history, continuity",
      position: [0.15, 3.55, 0.35],
      color: "#d4af37",
      description: "Pull back and see creation → edits → registrations → witnesses → derived artifacts.",
    },
    {
      id: "player",
      label: "PLAYER",
      shortLabel: "PLAYER",
      eyebrow: "Canonical playback",
      caption: "Now Playing",
      form: "Resonant disc / sound field",
      language: "music, experience",
      position: [0.05, -3.25, 0.35],
      color: "#4fc3f7",
      description: "The registry itself resonates with playback. Not a visualizer pasted over the screen.",
    },
  ] satisfies SpatialRegistryNode[],
  edges: [
    ["work", "profile"],
    ["work", "edit"],
    ["work", "register"],
    ["work", "witness"],
    ["work", "lineage"],
    ["work", "player"],
    ["edit", "register"],
    ["register", "witness"],
  ] satisfies [SpatialRegistryNodeId, SpatialRegistryNodeId][],
} as const;

export const SPATIAL_REGISTRY_NODES_BY_ID = Object.fromEntries(
  SPATIAL_REGISTRY_MOCK.nodes.map((node) => [node.id, node]),
) as Record<SpatialRegistryNodeId, SpatialRegistryNode>;

export const CAMERA_PRESETS: Record<SpatialView, { position: [number, number, number]; target: [number, number, number] }> = {
  overview: { position: [0.2, 2.6, 11.6], target: [0, 0.4, 0] },
  work: { position: [0.35, 1.05, 5.2], target: [0, 0.55, 0] },
  profile: { position: [-1.8, 1.45, 4.6], target: [-1.4, 0.85, 0] },
  edit: { position: [2.4, 0.95, 5.1], target: [0.5, 0.55, -0.6] },
  register: { position: [0.1, 1.55, 6.4], target: [0, 0.7, 0] },
  witness: { position: [0.15, 3.6, 7.4], target: [0, 0.45, 0] },
  lineage: { position: [0.2, 10.2, 17.4], target: [0, 0.4, 0] },
  player: { position: [0.1, 3.1, 6.8], target: [0, -0.15, 0] },
};
