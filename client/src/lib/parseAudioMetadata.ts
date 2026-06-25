/**
 * parseAudioMetadata.ts
 * Client-side ID3 / audio metadata extraction using music-metadata-browser.
 * Returns title, artist, album, lyrics, and cover art (as a data URL) from a File.
 * Falls back gracefully — any field that can't be read is returned as undefined.
 */

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  lyrics?: string;
  coverDataUrl?: string; // base64 data URL for the embedded cover art
  year?: string;
}

export async function parseAudioMetadata(file: File): Promise<AudioMetadata> {
  try {
    // Dynamically import to keep the main bundle lean
    const mm = await import("music-metadata-browser");
    const metadata = await mm.parseBlob(file, { skipCovers: false });
    const { common } = metadata;

    let coverDataUrl: string | undefined;

    // Extract embedded cover art
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      // pic.data may be a Node Buffer (SharedArrayBuffer) — always copy to a plain ArrayBuffer
      const bytes = new Uint8Array(pic.data.buffer.slice(pic.data.byteOffset, pic.data.byteOffset + pic.data.byteLength));
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: pic.format || "image/jpeg" });
      coverDataUrl = await blobToDataUrl(blob);
    }

    // Extract lyrics — ID3 USLT tag or LYRICS field
    let lyrics: string | undefined;
    if (common.lyrics && common.lyrics.length > 0) {
      lyrics = common.lyrics[0];
    }

    return {
      title: common.title || undefined,
      artist: common.artist || common.artists?.[0] || undefined,
      album: common.album || undefined,
      lyrics,
      coverDataUrl,
      year: common.year ? String(common.year) : undefined,
    };
  } catch (err) {
    // Fail silently — metadata parsing is best-effort
    console.warn("[parseAudioMetadata] Could not parse metadata:", err);
    return {};
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
