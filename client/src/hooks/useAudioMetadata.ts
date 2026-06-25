/**
 * useAudioMetadata
 *
 * Reads ID3 / Vorbis / MP4 metadata from a browser File object using
 * the music-metadata library (browser-safe ESM build).
 *
 * Returns extracted fields that can be used to pre-populate upload forms:
 *   title, artist, album, genre, year, lyrics, coverArtDataUrl
 *
 * Usage:
 *   const { extractMetadata, isExtracting } = useAudioMetadata();
 *   const meta = await extractMetadata(file);
 *   if (meta.title) setTitle(meta.title);
 */

import { useState, useCallback } from "react";
import * as musicMetadata from "music-metadata";

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  lyrics?: string;
  /** Data URL (data:image/jpeg;base64,...) ready to use as <img src> or to convert to File */
  coverArtDataUrl?: string;
  /** Raw cover art blob, useful for creating a File object for upload */
  coverArtBlob?: Blob;
}

export function useAudioMetadata() {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractMetadata = useCallback(async (file: File): Promise<AudioMetadata> => {
    setIsExtracting(true);
    try {
      // parseBlob is the cleanest browser-safe API — no ArrayBuffer/Uint8Array type issues
      const parsed = await musicMetadata.parseBlob(file);

      const common = parsed.common;

      // Extract cover art if present
      let coverArtDataUrl: string | undefined;
      let coverArtBlob: Blob | undefined;
      const pictures = common.picture;
      if (pictures && pictures.length > 0) {
        const pic = pictures[0];
        const mime = pic.format || "image/jpeg";
        // pic.data is Uint8Array<ArrayBufferLike> — may be backed by a SharedArrayBuffer.
        // Blob() requires ArrayBufferView<ArrayBuffer>, so we copy into a fresh Uint8Array
        // with a plain ArrayBuffer. .slice() always returns a new Uint8Array with its own buffer.
        const safeBytes = pic.data.slice(0);
        const blob = new Blob([safeBytes], { type: mime });
        coverArtBlob = blob;
        coverArtDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Extract unsynchronised lyrics (USLT tag)
      let lyrics: string | undefined;
      if (common.lyrics && common.lyrics.length > 0) {
        const lyricsEntry = common.lyrics[0];
        // ILyricsTag has a .text property; plain strings are also possible
        if (typeof lyricsEntry === "string") {
          lyrics = lyricsEntry;
        } else if (lyricsEntry && typeof (lyricsEntry as { text?: string }).text === "string") {
          lyrics = (lyricsEntry as { text: string }).text;
        }
      }

      // Year — prefer originalyear, fall back to year
      const year = common.originalyear
        ? String(common.originalyear)
        : common.year
        ? String(common.year)
        : undefined;

      // Genre — music-metadata returns an array; take the first
      const genre = common.genre && common.genre.length > 0 ? common.genre[0] : undefined;

      return {
        title: common.title || undefined,
        artist: common.artist || common.albumartist || undefined,
        album: common.album || undefined,
        genre,
        year,
        lyrics,
        coverArtDataUrl,
        coverArtBlob,
      };
    } catch (err) {
      // Non-fatal — if metadata parsing fails, just return empty
      console.warn("[useAudioMetadata] Failed to parse metadata:", err);
      return {};
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return { extractMetadata, isExtracting };
}
