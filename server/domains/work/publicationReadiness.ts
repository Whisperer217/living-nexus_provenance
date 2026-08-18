export type PublicationReadinessInput = {
  ownershipStatus?: "full" | "partial" | null;
  coverArtUrl?: string | null;
  creatorName?: string | null;
  creatorHandle?: string | null;
  creatorBio?: string | null;
  creatorOriginStatement?: string | null;
  creatorProfilePhotoUrl?: string | null;
  testimonyCount: number;
};

/**
 * Pure publication-readiness evaluator shared by direct registration and later
 * status transition authority. It deliberately reads no database state and
 * makes no publication, WID, provenance, storage, or projection mutation.
 */
export function getPublicationReadinessMissing(input: PublicationReadinessInput): string[] {
  const missing: string[] = [];

  if (input.ownershipStatus === "partial") {
    missing.push("full commercial ownership or a commercial license");
  }
  if (!input.coverArtUrl) missing.push("a bound visual (upload or generate cover art)");
  if (!input.creatorHandle && !input.creatorName) missing.push("name or handle");
  if (!input.creatorBio && !input.creatorOriginStatement) missing.push("bio or origin statement");
  if (!input.creatorProfilePhotoUrl) missing.push("profile photo");
  if (input.testimonyCount < 1) missing.push("at least one testimony");

  return missing;
}

export function publicationReadinessError(missing: string[]): string {
  return `Cannot publish yet. Complete: ${missing.join(", ")}. Save as Draft instead.`;
}
