import type { LucideIcon } from "lucide-react";
import type { PNAVisualProposal } from "@/components/PNAVisualProposalCard";
import type { PNAArtifactKind, PNAContextSourceKind, PNAProfileId } from "@shared/pnaGovernance";

export type PNAMode = PNAProfileId;
export type PNAWorkspaceSurface = "conversation" | "context" | "artifacts";
export type PNAInspectionSurface = "context" | "sources" | "artifacts" | "activity";
export type PNAArtifactState = "draft" | "reviewed" | "preserved_private" | "discarded";

export interface PNAModeOption {
  id: PNAMode;
  label: string;
  desc: string;
  icon: LucideIcon;
}

export interface PNAThreadSummary {
  id: string;
  title: string;
  activeMode: string;
  updatedAt: Date | string;
}

export interface PNAProfileSettingView {
  id: PNAProfileId;
  revision: number;
  label: string;
  purpose: string;
  permittedContextKinds: readonly PNAContextSourceKind[];
  artifactKinds: readonly PNAArtifactKind[];
  never: readonly string[];
  isEnabled: boolean;
  allowRemoteContext: boolean;
}

export interface PNAContextEntryView {
  id: string;
  sourceKind: PNAContextSourceKind;
  sourceRef: string;
  titleSnapshot: string;
  widSnapshot: string | null;
  visibility: "creator_private" | "creator_approved" | "public";
  state: "attached" | "detached";
  attachedAt: Date | string;
}

export interface PNAWorkspaceArtifact {
  id: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  threadId?: string;
  originMessageId?: string | null;
  profileId: PNAProfileId;
  kind: PNAArtifactKind | string;
  title: string;
  summary: string | null;
  state: PNAArtifactState;
  payloadJson: { url?: string; prompt?: string };
  quiverImageId?: number | null;
  // Compatibility presentation for legacy, persisted visual proposals.
  proposal?: PNAVisualProposal;
}

export interface PNAArtifactSourceView {
  id: string;
  artifactId: string;
  sourceKind: string;
  titleSnapshot: string;
  locatorSnapshot: string | null;
  relation: "source" | "inference_basis" | "creator_input" | "reference_image";
}

export interface PNAActionReceiptView {
  id: string;
  artifactId: string | null;
  envelopeId: string | null;
  action: string;
  effectSummary: string;
  nonEffectSummary: string;
  createdAt: Date | string;
}

export interface PNAContextUseReceiptView {
  id: string;
  profileId: string;
  disclosureSnapshot: string;
  outcome: "prepared" | "sent" | "blocked" | "failed";
  createdAt: Date | string;
}

export interface PNAContextUseEntryView {
  id: string;
  receiptId: string;
  sourceKind: string;
  sourceRefSnapshot: string;
  titleSnapshot: string;
}
