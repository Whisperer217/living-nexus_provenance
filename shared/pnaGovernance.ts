export const PNA_PROFILE_IDS = [
  "guide",
  "conductor",
  "witness",
  "custodian",
  "archivist",
  "vision",
  "research",
] as const;

export type PNAProfileId = (typeof PNA_PROFILE_IDS)[number];
export type PNAContextSourceKind = "work" | "wid" | "keeper_note" | "diary" | "quiver_image";
export type PNAArtifactKind = "creative_brief" | "arrangement_plan" | "testimony_prompt_set" | "metadata_review" | "archive_map" | "image_proposal" | "research_brief";

export interface PNAStewardshipProfileContract {
  id: PNAProfileId;
  revision: number;
  label: string;
  purpose: string;
  permittedContextKinds: readonly PNAContextSourceKind[];
  artifactKinds: readonly PNAArtifactKind[];
  never: readonly string[];
}

const NO_REGISTRY_WRITE = "Create, alter, or issue a Work, WID, testimony, provenance event, declaration, publication, license, or payment.";
const NO_UNSELECTED = "Read another creator’s private record or any context you have not deliberately attached.";
const NO_FALSE_AUTHORITY = "Present a draft, inference, or model response as verified authorship, legal advice, or canonical Registry truth.";

export const PNA_STEWARDSHIP_PROFILES: Record<PNAProfileId, PNAStewardshipProfileContract> = {
  guide: {
    id: "guide", revision: 1, label: "Guide", purpose: "Creative direction, intent, questions, and next decisions.",
    permittedContextKinds: ["work", "wid", "keeper_note", "diary", "quiver_image"],
    artifactKinds: ["creative_brief"],
    never: [NO_REGISTRY_WRITE, NO_UNSELECTED, NO_FALSE_AUTHORITY],
  },
  conductor: {
    id: "conductor", revision: 1, label: "Compose", purpose: "Structure, arrangement, pacing, and creative form.",
    permittedContextKinds: ["work", "keeper_note", "diary", "quiver_image"],
    artifactKinds: ["arrangement_plan"],
    never: [NO_REGISTRY_WRITE, NO_UNSELECTED, NO_FALSE_AUTHORITY],
  },
  witness: {
    id: "witness", revision: 1, label: "Witness", purpose: "Reflective prompts for emotional truth and creator-led testimony.",
    permittedContextKinds: ["work", "keeper_note", "diary"],
    artifactKinds: ["testimony_prompt_set"],
    never: [NO_REGISTRY_WRITE, "Write or alter creator-declared testimony.", NO_UNSELECTED, NO_FALSE_AUTHORITY],
  },
  custodian: {
    id: "custodian", revision: 1, label: "Registry", purpose: "Explain visible provenance and prepare creator-controlled registration review.",
    permittedContextKinds: ["work", "wid", "keeper_note", "diary"],
    artifactKinds: ["metadata_review"],
    never: [NO_REGISTRY_WRITE, "State legal certainty or verification unless the canonical Registry record says so.", NO_UNSELECTED],
  },
  archivist: {
    id: "archivist", revision: 1, label: "Archive", purpose: "Read patterns only across creator-selected archive material.",
    permittedContextKinds: ["work", "wid", "keeper_note", "diary", "quiver_image"],
    artifactKinds: ["archive_map"],
    never: [NO_REGISTRY_WRITE, "Search your entire Archive by default.", NO_UNSELECTED, NO_FALSE_AUTHORITY],
  },
  vision: {
    id: "vision", revision: 1, label: "Vision", purpose: "Prepare private visual directions and image proposals.",
    permittedContextKinds: ["work", "keeper_note", "diary", "quiver_image"],
    artifactKinds: ["image_proposal"],
    never: [NO_REGISTRY_WRITE, "Make an image canonical, attach it to a Work, or publish it without a separate creator action.", NO_UNSELECTED],
  },
  research: {
    id: "research", revision: 1, label: "Research", purpose: "Organize creator-selected material and distinguish source from inference.",
    permittedContextKinds: ["work", "wid", "keeper_note"],
    artifactKinds: ["research_brief"],
    never: [NO_REGISTRY_WRITE, "Browse, cite, or assert external facts that have not been deliberately supplied through an approved source path.", NO_UNSELECTED, NO_FALSE_AUTHORITY],
  },
};

export function isPNAProfileId(value: string): value is PNAProfileId {
  return (PNA_PROFILE_IDS as readonly string[]).includes(value);
}
