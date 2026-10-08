/**
 * Living Nexus model-operation control plane.
 *
 * This switch governs only new calls to external model providers. It does not
 * alter historical disclosure, creator testimony, provenance, WIDs, stored
 * generated assets, or creator-owned records.
 */
export const AI_OPERATIONS_ENABLED = false as const;

export const AI_OPERATIONS_PAUSE_MESSAGE =
  "Model-assisted operations are temporarily paused while Living Nexus is under stewardship.";

export class AiOperationsPausedError extends Error {
  constructor() {
    super(AI_OPERATIONS_PAUSE_MESSAGE);
    this.name = "AiOperationsPausedError";
  }
}

/** Throws before any provider request is constructed or dispatched. */
export function assertAiOperationsEnabled(): void {
  if (!AI_OPERATIONS_ENABLED) {
    throw new AiOperationsPausedError();
  }
}
