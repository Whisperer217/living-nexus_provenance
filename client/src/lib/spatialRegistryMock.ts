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
  position: [number, number, number];
  color: string;
  description: string;
};

export const DEFAULT_COVER_ART =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <defs>
    <radialGradient id="g" cx="58%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#E8B840" stop-opacity="0.52"/>
      <stop offset="38%" stop-color="#C49A28" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#050403" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="640" height="640" fill="#080705"/>
  <rect width="640" height="640" fill="url(#g)"/>
  <path d="M72 528 C 176 478 228 372 312 312 S 468 176 568 108" fill="none" stroke="#E8B840" stroke-width="2.2" opacity="0.72"/>
  <path d="M86 548 C 198 500 246 392 328 334" fill="none" stroke="#F5CC5A" stroke-width="0.9" opacity="0.38"/>
  <circle cx="512" cy="142" r="2.2" fill="#EDE5D0" opacity="0.7"/>
  <circle cx="188" cy="96" r="1.4" fill="#EDE5D0" opacity="0.45"/>
  <circle cx="420" cy="86" r="1.2" fill="#F5CC5A" opacity="0.55"/>
  <circle cx="96" cy="240" r="1.1" fill="#EDE5D0" opacity="0.35"/>
  <text x="48" y="596" fill="#EDE5D0" opacity="0.48" font-family="Cinzel, serif" font-size="22">Yahweh Lights My Way</text>
</svg>`);

export const SPATIAL_REGISTRY_MOCK = {
  creator: {
    name: "Jake",
    artistName: "Weave & Breathe",
    registeredWorks: 1,
    registrationCapacity: 10,
    slotsRemaining: 9,
    witnessActivity: 1,
  },
  work: {
    title: "Yahweh Lights My Way",
    artist: "Weave & Breathe",
    version: "01",
    wid: "LN-00017",
    status: "Registered",
    registrationDate: "15 August 2026",
    duration: "04:12",
    durationSeconds: 252,
  },
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
      position: [-4.6, 1.7, -1.2],
      color: "#c9b896",
      description: "Jake / Weave & Breathe — the attributed creator domain.",
    },
    {
      id: "work",
      label: "YAHWEH LIGHTS MY WAY",
      shortLabel: "WORK",
      eyebrow: "Registered work",
      position: [0, 0.55, 0],
      color: "#c49a28",
      description: "Version 01. The work is the central object of this fictional registry.",
    },
    {
      id: "edit",
      label: "EDIT",
      shortLabel: "EDIT",
      eyebrow: "Working version",
      position: [-3.1, -2.0, 1.3],
      color: "#8a8478",
      description: "A deliberate version step before registration.",
    },
    {
      id: "register",
      label: "REGISTER",
      shortLabel: "REGISTER",
      eyebrow: "Provenance event",
      position: [3.4, 1.9, -0.6],
      color: "#e8b840",
      description: "Registration establishes a durable provenance event.",
    },
    {
      id: "witness",
      label: "WITNESS",
      shortLabel: "WITNESS",
      eyebrow: "Attestation",
      position: [4.6, -1.5, 1.3],
      color: "#b08a5a",
      description: "A witness is an attestation of a registration event.",
    },
    {
      id: "lineage",
      label: "LINEAGE",
      shortLabel: "LINEAGE",
      eyebrow: "Visible relation",
      position: [0.2, 3.5, 0.8],
      color: "#f0d78e",
      description: "Creator → Edit → Register → Witness, made inspectable in space.",
    },
    {
      id: "player",
      label: "PLAYER",
      shortLabel: "PLAYER",
      eyebrow: "Canonical playback",
      position: [-1.2, -3.0, 0.4],
      color: "#d8c9a8",
      description: "One canonical player stays present while the registry is explored.",
    },
  ] satisfies SpatialRegistryNode[],
  edges: [
    ["profile", "work"],
    ["profile", "edit"],
    ["work", "edit"],
    ["edit", "register"],
    ["work", "register"],
    ["register", "witness"],
    ["work", "lineage"],
    ["work", "player"],
  ] satisfies [SpatialRegistryNodeId, SpatialRegistryNodeId][],
} as const;

export const SPATIAL_REGISTRY_NODES_BY_ID = Object.fromEntries(
  SPATIAL_REGISTRY_MOCK.nodes.map((node) => [node.id, node]),
) as Record<SpatialRegistryNodeId, SpatialRegistryNode>;
