import { parseBuffer } from "music-metadata";

export class LoopMp3QueueSourceError extends Error {
  readonly code = "ERR_LOOP_MP3_QUEUE_SOURCE";

  constructor(message: string) {
    super(message);
    this.name = "LoopMp3QueueSourceError";
  }
}

/**
 * Validates the dedicated Loop MP3 queue intake at the final server boundary.
 * This is deliberately scoped to the queue marker: single-record Loop intake
 * continues to support its existing audio formats.
 */
export async function assertLoopMp3QueueSource(
  source: Buffer,
  fileName: string,
  declaredMimeType: string,
): Promise<void> {
  if (!fileName.toLowerCase().endsWith(".mp3")) {
    throw new LoopMp3QueueSourceError("MP3 Queue accepts .mp3 sources only.");
  }

  const declared = declaredMimeType.toLowerCase();
  if (declared && !["audio/mpeg", "audio/mp3", "audio/x-mpeg", "application/octet-stream"].includes(declared)) {
    throw new LoopMp3QueueSourceError("MP3 Queue requires an MPEG audio source.");
  }

  try {
    const metadata = await parseBuffer(source, { mimeType: "audio/mpeg", path: fileName }, {
      duration: false,
      skipCovers: true,
    });
    const container = metadata.format.container?.toLowerCase() ?? "";
    if (!container.includes("mpeg")) {
      throw new LoopMp3QueueSourceError("MP3 Queue could not verify an MPEG audio source.");
    }
  } catch (error) {
    if (error instanceof LoopMp3QueueSourceError) throw error;
    throw new LoopMp3QueueSourceError("MP3 Queue could not read this source as an MP3.");
  }
}
