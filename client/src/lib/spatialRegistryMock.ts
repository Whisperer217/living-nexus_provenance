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
  eyebrow: string;
  position: [number, number, number];
  color: string;
  description: string;
};

export const SPATIAL_REGISTRY_MOCK = {
  creator: {
    name: "Jake",
    artistName: "Weave & Breathe",
    registeredWorks: 1,
    registrationCapacity: 10,
    witnessActivity: 1,
  },
  work: {
    title: "Yahweh Lights My Way",
    artist: "Weave & Breathe",
    version: "01",
    wid: "LN-00017",
    status: "Registered",
    registrationDate: "2026-08-15",
    duration: "04:12",
  },
  nodes: [
    {
      id: "profile",
      label: "PROFILE",
      eyebrow: "Creator identity",
      position: [-4.8, 1.5, -1.8],
      color: "#9480d8",
      description: "Jake / Weave & Breathe — the attributed creator domain.",
    },
    {
      id: "work",
      label: "YAHWEH LIGHTS MY WAY",
      eyebrow: "Central work",
      position: [0, 0.7, 0],
      color: "#d6ad4a",
      description: "Version 01. The work is the central object of this fictional registry.",
    },
    {
      id: "edit",
      label: "EDIT",
      eyebrow: "Working version",
      position: [-2.8, -2.7, 1.4],
      color: "#6e9fc6",
      description: "A deliberate version step before registration.",
    },
    {
      id: "register",
      label: "REGISTER",
      eyebrow: "Provenance event",
      position: [3.5, 2.3, -0.8],
      color: "#d6ad4a",
      description: "A durable registration event shown only in this mock.",
    },
    {
      id: "witness",
      label: "WITNESS",
      eyebrow: "Attestation",
      position: [4.7, -1.7, 1.1],
      color: "#a4714f",
      description: "A witness is an attestation of a registration event.",
    },
    {
      id: "lineage",
      label: "LINEAGE",
      eyebrow: "Visible relation",
      position: [0.8, 3.8, 1.1],
      color: "#dfc57e",
      description: "Creator → Edit → Register → Witness made inspectable in space.",
    },
    {
      id: "player",
      label: "PLAYER",
      eyebrow: "Canonical playback",
      position: [-4.4, -1.5, -1.1],
      color: "#d4ded3",
      description: "One canonical player stays present while the registry is explored.",
    },
  ] satisfies SpatialRegistryNode[],
  edges: [
    ["profile", "work"],
    ["work", "edit"],
    ["edit", "register"],
    ["register", "witness"],
    ["work", "lineage"],
    ["work", "player"],
  ] satisfies [SpatialRegistryNodeId, SpatialRegistryNodeId][],
} as const;
