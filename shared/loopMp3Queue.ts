export const LOOP_MP3_QUEUE_LIMIT = 20;

const MP3_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/x-mpeg",
]);

export function isLoopMp3File(file: Pick<File, "name" | "type">): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  return extension === "mp3" && (mimeType.length === 0 || MP3_MIME_TYPES.has(mimeType));
}

export interface LoopMp3QueueSelection {
  accepted: File[];
  rejected: File[];
  overLimit: File[];
}

export interface LoopMp3QueueIntakeNotice {
  title: string;
  message: string;
}

/**
 * Prepares a browser-memory queue only. This does not upload, register, seal,
 * or persist any Work. Server-side verification remains the authority boundary.
 */
export function prepareLoopMp3Queue(files: ArrayLike<File>, limit = LOOP_MP3_QUEUE_LIMIT): LoopMp3QueueSelection {
  const accepted: File[] = [];
  const rejected: File[] = [];
  const overLimit: File[] = [];

  for (const file of Array.from(files)) {
    if (!isLoopMp3File(file)) {
      rejected.push(file);
      continue;
    }
    if (accepted.length >= limit) {
      overLimit.push(file);
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected, overLimit };
}

/**
 * Explains queue intake corrections without treating accepted records as
 * registered Works. The caller decides whether to present this as inline
 * feedback, a toast, or both.
 */
export function describeLoopMp3QueueIntake(
  selection: Pick<LoopMp3QueueSelection, "rejected" | "overLimit">,
  limit = LOOP_MP3_QUEUE_LIMIT
): LoopMp3QueueIntakeNotice | null {
  const rejectedCount = selection.rejected.length;
  const overLimitCount = selection.overLimit.length;

  if (rejectedCount === 0 && overLimitCount === 0) return null;

  const rejectedMessage = rejectedCount > 0
    ? `${rejectedCount} non-MP3 ${rejectedCount === 1 ? "file was" : "files were"} not added. Only .mp3 records can enter this review queue.`
    : "";
  const overLimitMessage = overLimitCount > 0
    ? `The queue holds a maximum of ${limit} records; ${overLimitCount} ${overLimitCount === 1 ? "MP3 remains" : "MP3s remain"} outside this queue.`
    : "";

  return {
    title: rejectedCount > 0 && overLimitCount > 0
      ? "MP3 Queue needs attention"
      : rejectedCount > 0
        ? "MP3 Queue accepts MP3 files only"
        : "MP3 Queue limit reached",
    message: [rejectedMessage, overLimitMessage].filter(Boolean).join(" "),
  };
}

/** Reorders a local pre-review queue. It never registers, seals, or uploads a Work. */
export function reorderLoopMp3Queue<T extends { id: string }>(
  queue: readonly T[],
  activeId: string,
  overId: string
): T[] {
  const fromIndex = queue.findIndex((item) => item.id === activeId);
  const toIndex = queue.findIndex((item) => item.id === overId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [...queue];

  const reordered = [...queue];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}
