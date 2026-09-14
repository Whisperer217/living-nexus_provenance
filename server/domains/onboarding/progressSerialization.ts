import type { InsertOnboardingProgress } from "../../../drizzle/schema";

export type OnboardingProgressPatch = Partial<
  Omit<InsertOnboardingProgress, "id" | "userId" | "startedAt">
> & {
  /** The UI works with step IDs; TiDB persists this text column as JSON. */
  completedSteps?: string[] | string | null;
};

/**
 * Keeps the application-facing step list ergonomic while ensuring the
 * `onboardingProgress.completedSteps` text column always receives one scalar
 * SQL value. Passing an array directly causes Drizzle/MySQL to expand it into
 * multiple bound values, which is invalid for a single-column update in TiDB.
 */
export function serializeOnboardingProgressPatch(
  patch: OnboardingProgressPatch,
): Partial<Omit<InsertOnboardingProgress, "id" | "userId" | "startedAt">> {
  if (!Array.isArray(patch.completedSteps)) {
    return patch as Partial<Omit<InsertOnboardingProgress, "id" | "userId" | "startedAt">>;
  }

  return {
    ...patch,
    completedSteps: JSON.stringify(patch.completedSteps),
  } as Partial<Omit<InsertOnboardingProgress, "id" | "userId" | "startedAt">>;
}
