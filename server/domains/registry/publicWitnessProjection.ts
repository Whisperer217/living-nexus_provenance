export type PublicWitnessProjection<T> =
  | { state: "not_found" }
  | { state: "resolved"; record: T }
  | { state: "ambiguous"; publicCandidateCountAtLeast: 2 };

/**
 * Classifies candidates already filtered to the public Registry eligibility
 * predicate. It intentionally refuses to select among multiple public Works
 * sharing a WID; ownership adjudication remains a separate append-only process.
 */
export function classifyPublicWitnessCandidates<T>(
  candidates: readonly T[]
): PublicWitnessProjection<T> {
  if (candidates.length === 0) return { state: "not_found" };
  if (candidates.length > 1) {
    return { state: "ambiguous", publicCandidateCountAtLeast: 2 };
  }
  return { state: "resolved", record: candidates[0] };
}
