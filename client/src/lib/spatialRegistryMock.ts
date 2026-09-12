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

export type SpatialView = "overview" | "explore" | SpatialRegistryNodeId;

export type WorkMedium = "music" | "image" | "video" | "document" | "code";

export const ARTIFACT_FORMS: Record<WorkMedium, { object: string; verb: string }> = {
  music: { object: "record / disc", verb: "play" },
  image: { object: "canvas / frame", verb: "view" },
  video: { object: "film reel", verb: "watch" },
  document: { object: "folio", verb: "read" },
  code: { object: "module / crystalline artifact", verb: "run" },
};

/** Same grab. The destination is the meaning. */
export type DropIntent = "experience" | "declare" | "not-registered" | "already-declared" | "wrong-medium" | null;

export function isPlayable(artifact: SpatialArtifact) {
  return artifact.medium === "music" && artifact.status === "Registered";
}

export function isDeclarable(artifact: SpatialArtifact) {
  return artifact.status !== "Registered";
}

export function nextRegistrationWid(artifacts: readonly Pick<SpatialArtifact, "wid">[]) {
  const used = new Set(artifacts.map((item) => item.wid).filter((wid): wid is string => Boolean(wid)));
  let n = 18;
  while (used.has(`LN-${String(n).padStart(5, "0")}`)) n += 1;
  return `LN-${String(n).padStart(5, "0")}`;
}

export function resolveDropIntent(
  artifact: SpatialArtifact,
  nearPlayer: boolean,
  nearRegister: boolean,
): DropIntent {
  if (nearPlayer) {
    if (isPlayable(artifact)) return "experience";
    if (artifact.medium !== "music") return "wrong-medium";
    return "not-registered";
  }
  if (nearRegister) {
    if (isDeclarable(artifact)) return "declare";
    return "already-declared";
  }
  return null;
}

export type SpatialArtifact = {
  id: string;
  title: string;
  artist: string;
  wid: string | null;
  status: "Registered" | "Working" | "Sketch";
  witnessed: boolean;
  medium: WorkMedium;
  cover: string;
  duration: string;
  durationSeconds: number;
  position: [number, number, number];
};

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

/** Shared nebula and wireframe language, with a distinct accent per pathway. */
export const VISUAL_LANGUAGE = {
  principle: "One visual language. Six domains. One central work.",
  style: "cyber-celestial wireframe",
  palette: {
    void: "#0a0a0a",
    gold: "#d4af37",
    champagne: "#e8d5a3",
    electric: "#29b6f6",
    teal: "#4dd0e1",
    violet: "#c77dff",
  },
  accents: {
    work: "gold geodesic",
    creator: "violet / magenta",
    edit: "electric blue",
    register: "gold / champagne",
    witness: "cyan / teal",
    lineage: "gold / champagne",
    player: "electric blue",
  },
  materials: ["thin wireframe", "emissive glow", "holographic panes", "dark nebula"],
} as const;

/** Law VII — bound into the spatial prototype so the visualization cannot drift into decoration. */
export const INTERACTION_DOCTRINE = {
  standard:
    "Nothing exists merely for decoration. Every object, movement, transition, relationship, and control must communicate the state, history, ownership, or experience of a registered work.",
  want: "Oh. I understand what I'm looking at.",
  refuse: "Whoa, cool Three.js.",
  loop: ["Profile", "Edit", "Register", "Witness"],
  grammar: [
    { act: "Drag a work", means: "You are moving an artifact." },
    { act: "Drop into Register", means: "You are declaring it." },
    { act: "Witness appears", means: "Someone attested to that event." },
    { act: "Follow lineage", means: "You are traversing history." },
    { act: "Load into Player", means: "You are experiencing the registered artifact." },
    { act: "Work revolves", means: "It is active / in playback." },
    { act: "Camera approaches", means: "You are entering that record." },
    { act: "Camera pulls back", means: "You are seeing the larger lineage." },
    { act: "Connection illuminates", means: "A relationship is being revealed." },
    { act: "A version branches", means: "The work changed without erasing its history." },
  ],
  state: [
    { state: "Sketch", means: "Incomplete. Carry it to Register to declare it." },
    { state: "Working", means: "In formation. Not yet a sealed record." },
    { state: "Registered", means: "Declared. Carry it to Player to experience it." },
    { state: "Witnessed", means: "Someone attested. The mark is that fact." },
  ],
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
  exploreArtifacts: [
    {
      id: "yahweh",
      title: "Yahweh Lights My Way",
      artist: "Weave & Breathe",
      wid: "LN-00017",
      status: "Registered",
      witnessed: true,
      medium: "music",
      cover: ASSET.cover,
      duration: "04:12",
      durationSeconds: 252,
      position: [0, 0.9, 0.35],
    },
    {
      id: "field-hymn",
      title: "Field Hymn",
      artist: "Weave & Breathe",
      wid: null,
      status: "Working",
      witnessed: false,
      medium: "music",
      cover: ASSET.nebula,
      duration: "03:40",
      durationSeconds: 220,
      position: [-2.45, 1.2, -0.55],
    },
    {
      id: "quiet-path",
      title: "Quiet Path",
      artist: "Weave & Breathe",
      wid: null,
      status: "Sketch",
      witnessed: false,
      medium: "music",
      cover: ASSET.pathways.player,
      duration: "02:18",
      durationSeconds: 138,
      position: [2.35, 1.05, -0.4],
    },
    {
      id: "night-window",
      title: "Night Window",
      artist: "Weave & Breathe",
      wid: "LN-00011",
      status: "Registered",
      witnessed: true,
      medium: "image",
      cover: ASSET.pathways.work,
      duration: "",
      durationSeconds: 0,
      position: [-1.7, -0.15, -1.35],
    },
    {
      id: "doctrine-folio",
      title: "Living Record",
      artist: "Weave & Breathe",
      wid: null,
      status: "Sketch",
      witnessed: false,
      medium: "document",
      cover: ASSET.pathways.register,
      duration: "",
      durationSeconds: 0,
      position: [1.75, -0.1, -1.25],
    },
  ] satisfies SpatialArtifact[],
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
      form: "Violet octahedron / wireframe bust",
      language: "identity, origin, authorship",
      position: [-4.4, 2.35, -0.55],
      color: "#c77dff",
      description: "A spatial portrait of the creator: identity, works, attribution, collaborators.",
    },
    {
      id: "work",
      label: "YAHWEH LIGHTS MY WAY",
      shortLabel: "WORK",
      eyebrow: "Registered work",
      caption: "WID: LN-00017",
      form: "Cover inside a golden geodesic",
      language: "the gravitational core everything connects to",
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
      form: "Electric-blue pyramid / fragments",
      language: "transformation, revision, craft",
      position: [-3.7, -1.85, 0.85],
      color: "#29b6f6",
      description: "Layers of the work. Version 01 → 02 → 03, the artifact reforming in space.",
    },
    {
      id: "register",
      label: "REGISTER",
      shortLabel: "REGISTER",
      eyebrow: "Provenance event",
      caption: "Aug 15, 2026 · 11:42 AM",
      form: "Nested golden wireframe cubes",
      language: "declaration, permanence, proof",
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
      form: "Teal ocular sphere / silhouette nodes",
      language: "observation, attestation, truth",
      position: [3.85, -1.85, 0.9],
      color: "#4dd0e1",
      description: "Witnesses appear as luminous points. Connection: Witness → Event → Work.",
    },
    {
      id: "lineage",
      label: "LINEAGE",
      shortLabel: "LINEAGE",
      eyebrow: "Visible relation",
      caption: "Trace the journey",
      form: "Gold orbital constellation",
      language: "history, continuity, connection",
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
      form: "Waveform / resonant disc",
      language: "experience, playback, resonance",
      position: [0.05, -3.25, 0.35],
      color: "#29b6f6",
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
  explore: { position: [0.15, 3.05, 9.2], target: [0, 0.15, 0.55] },
  work: { position: [0.35, 1.05, 5.2], target: [0, 0.55, 0] },
  profile: { position: [-1.8, 1.45, 4.6], target: [-1.4, 0.85, 0] },
  edit: { position: [2.4, 0.95, 5.1], target: [0.5, 0.55, -0.6] },
  register: { position: [0.1, 1.55, 6.4], target: [0, 0.7, 0] },
  witness: { position: [0.15, 3.6, 7.4], target: [0, 0.45, 0] },
  lineage: { position: [0.2, 10.2, 17.4], target: [0, 0.4, 0] },
  player: { position: [0.1, 3.1, 6.8], target: [0, -0.15, 0] },
};
