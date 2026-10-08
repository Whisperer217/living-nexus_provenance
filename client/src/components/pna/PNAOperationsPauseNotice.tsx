import React from "react";
import { CirclePause, ShieldCheck } from "lucide-react";
import { AI_OPERATIONS_ENABLED } from "@shared/aiAvailability";

interface PNAOperationsPauseNoticeProps {
  compact?: boolean;
  className?: string;
}

/**
 * A shared status indicator for the private PNA surfaces. It does not alter
 * historical records or review controls; it states the current boundary for
 * new model-assisted operations.
 */
export function PNAOperationsPauseNotice({ compact = false, className = "" }: PNAOperationsPauseNoticeProps) {
  if (AI_OPERATIONS_ENABLED) return null;

  return (
    <div className={`pna-operations-pause-notice ${compact ? "pna-operations-pause-notice--compact" : ""} ${className}`} role="status">
      <CirclePause size={compact ? 13 : 15} aria-hidden="true" />
      <div className="min-w-0">
        <p className="pna-operations-pause-notice__title">Model operations paused</p>
        {!compact ? (
          <p className="pna-operations-pause-notice__copy">
            PNA is under construction. Threads, Context Envelopes, and private Artifacts remain available for inspection.
          </p>
        ) : null}
      </div>
      {!compact ? <ShieldCheck size={14} aria-hidden="true" /> : null}
    </div>
  );
}
