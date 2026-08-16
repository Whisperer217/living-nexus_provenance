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

export type SpatialRegistryNode = {
  id: SpatialRegistryNodeId;
  label: string;
  shortLabel: string;
  eyebrow: string;
  caption: string;
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
} as const;

export const DEFAULT_COVER_ART = ASSET.cover;

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
    copy: "Registration established a durable provenance event. The work is now anchored in the registry.",
  },
  witnesses: [
    { name: "Living Nexus Node", at: "Aug 15, 2026 · 11:42 AM", avatar: ASSET.lnNode },
    { name: "Slim Doggy", at: "Aug 15, 2026 · 11:48 AM", avatar: ASSET.slimDoggy },
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
      position: [-4.4, 2.35, -0.55],
      color: "#9c27b0",
      description: "Jake / Weave & Breathe — the attributed creator domain.",
    },
    {
      id: "work",
      label: "YAHWEH LIGHTS MY WAY",
      shortLabel: "WORK",
      eyebrow: "Registered work",
      caption: "WID: LN-00017",
      position: [0, 0.55, 0],
      color: "#d4af37",
      description: "Version 01. The work is the central object of this fictional registry.",
    },
    {
      id: "edit",
      label: "EDIT",
      shortLabel: "EDIT",
      eyebrow: "Working version",
      caption: "Version 01 · Aug 15, 2026",
      position: [-3.7, -1.85, 0.85],
      color: "#4fc3f7",
      description: "A deliberate version step before registration.",
    },
    {
      id: "register",
      label: "REGISTER",
      shortLabel: "REGISTER",
      eyebrow: "Selected event",
      caption: "Aug 15, 2026 · 11:42 AM",
      position: [4.15, 2.2, -0.45],
      color: "#d4af37",
      description: "Registration establishes a durable provenance event.",
    },
    {
      id: "witness",
      label: "WITNESS",
      shortLabel: "WITNESS",
      eyebrow: "Attestation",
      caption: "2 Witnesses",
      position: [3.85, -1.85, 0.9],
      color: "#4fc3f7",
      description: "A witness is an attestation of a registration event.",
    },
    {
      id: "lineage",
      label: "LINEAGE",
      shortLabel: "LINEAGE",
      eyebrow: "Visible relation",
      caption: "Trace the journey",
      position: [0.15, 3.55, 0.35],
      color: "#d4af37",
      description: "Creator → Edit → Register → Witness, made inspectable in space.",
    },
    {
      id: "player",
      label: "PLAYER",
      shortLabel: "PLAYER",
      eyebrow: "Canonical playback",
      caption: "Now Playing",
      position: [0.05, -3.25, 0.35],
      color: "#4fc3f7",
      description: "One canonical player stays present while the registry is explored.",
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
