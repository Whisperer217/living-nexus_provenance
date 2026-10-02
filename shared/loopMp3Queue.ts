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
