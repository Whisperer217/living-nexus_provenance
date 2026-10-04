import type { LucideIcon } from "lucide-react";
import type { PNAVisualProposal } from "@/components/PNAVisualProposalCard";

export type PNAMode = "guide" | "conductor" | "witness" | "custodian" | "archivist" | "vision" | "research";
export type PNAWorkspaceSurface = "conversation" | "context" | "artifacts";

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

export interface PNAWorkspaceArtifact {
  id: string;
  createdAt: Date;
  mode: PNAMode;
  proposal: PNAVisualProposal;
}
