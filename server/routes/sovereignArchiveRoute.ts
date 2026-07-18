/**
 * Sovereign Archive Export — /api/admin/sovereign-archive
 *
 * Packages a batch of tracks into a structured ZIP:
 *
 *   ln-sovereign-archive-YYYY-MM-DD-batch1.zip
 *   └── songs/
 *       └── {slug}-{id}/
 *           ├── audio/        ← original audio file (MP3/WAV/etc.)
 *           ├── artwork/      ← cover art image
 *           ├── video/        ← AI music video loop MP4 (if available)
 *           ├── lyrics/       ← plain text lyrics (if available)
 *           ├── tone/         ← harmonic signature + tone frequency profile
 *           ├── wid/          ← full WID document (hash, signature, witnesses, chain)
 *           └── metadata/     ← all DB fields as JSON
 *
 * Endpoints:
 *   GET /api/admin/sovereign-archive/manifest   — song list with file availability
 *   GET /api/admin/sovereign-archive/batch      — streams a ZIP of N songs (offset + limit)
 */

import { createRequire } from "module";
import type { ArchiverOptions, ZipArchive } from "archiver";
const _require = createRequire(import.meta.url);
const archiver = _require("archiver") as (format: string, opts?: ArchiverOptions) => InstanceType<typeof ZipArchive>;
import { Router, type Request, type Response } from "express";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../utils/db.js";
import { songs, wids, witnessTestimonies, provenanceEvents } from "../../drizzle/schema.js";
import { sdk } from "../_core/sdk.js";

export const sovereignArchiveRouter = Router();

// ── Auth helper ──────────────────────────────────────────────────────────────
async function requireAdmin(req: Request, res: Response): Promise<any | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return null;
    }
    return user;
  } catch {
    res.status(401).json({ error: "Sign in as admin to access archive." });
    return null;
  }
}

// ── Fetch a remote file as a Buffer ─────────────────────────────────────────
async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

// ── Slugify a title for folder naming ───────────────────────────────────────
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ── Guess file extension from URL ────────────────────────────────────────────
function extFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split(".");
    if (parts.length > 1) {
      const ext = parts[parts.length - 1].split("?")[0].toLowerCase();
      if (ext.length <= 5) return ext;
    }
  } catch {}
  return fallback;
}

// ── MANIFEST — list of songs with file availability ─────────────────────────
sovereignArchiveRouter.get(
  "/api/admin/sovereign-archive/manifest",
  async (req: Request, res: Response) => {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const db = await getDb();
    const allSongs = await db
      .select({
        id: songs.id,
        title: songs.title,
        userId: songs.userId,
        status: songs.status,
        fileUrl: songs.fileUrl,
        coverArtUrl: songs.coverArtUrl,
        musicVideoUrl: songs.musicVideoUrl,
        autoVideoUrl: songs.autoVideoUrl,
        videoUrl: songs.videoUrl,
        lyricsText: songs.lyricsText,
        harmonicSignature: songs.harmonicSignature,
        witnessId: songs.witnessId,
        createdAt: songs.createdAt,
      })
      .from(songs)
      .orderBy(songs.createdAt) as any[];

    const manifest = (allSongs as any[]).map((s: any) => ({
      id: s.id,
      title: s.title,
      userId: s.userId,
      status: s.status,
      hasAudio: !!s.fileUrl,
      hasArtwork: !!s.coverArtUrl,
      hasVideo: !!(s.musicVideoUrl || s.autoVideoUrl || s.videoUrl),
      hasLyrics: !!s.lyricsText,
      hasTone: !!(s.harmonicSignature),
      hasWid: !!s.witnessId,
      createdAt: s.createdAt,
    }));

    res.json({
      totalSongs: manifest.length,
      songs: manifest,
      generatedAt: new Date().toISOString(),
    });
  }
);

// ── BATCH ZIP — streams a ZIP of N songs ─────────────────────────────────────
sovereignArchiveRouter.get(
  "/api/admin/sovereign-archive/batch",
  async (req: Request, res: Response) => {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
    const batchNum = parseInt(String(req.query.batch ?? "1"), 10);

    const db = await getDb();

    // 1. Fetch the batch of songs
    const batch = (await db
      .select()
      .from(songs)
      .orderBy(songs.createdAt)
      .limit(limit)
      .offset(offset)) as any[];

    if (batch.length === 0) {
      res.status(404).json({ error: "No songs found in this range." });
      return;
    }

    // 2. Fetch WID records for this batch
    const songWitnesses = batch
      .map((s) => s.witnessId)
      .filter(Boolean) as string[];

    const widRecords: any[] =
      songWitnesses.length > 0
        ? (await db
            .select()
            .from(wids)
            .where(inArray(wids.wid, songWitnesses))) as any[]
        : [];

    const widMap = new Map((widRecords as any[]).map((w: any) => [w.wid, w]));

    // 3. Fetch witness testimonies linked to each WID
    const testimonies: any[] =
      songWitnesses.length > 0 && batch.length > 0
        ? (await db
            .select()
            .from(witnessTestimonies)
            .where(
              eq(witnessTestimonies.creatorId, (batch[0] as any).userId)
            )) as any[]
        : [];

    // 4. Stream the ZIP
    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `ln-sovereign-archive-${dateSlug}-batch${batchNum}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err: any) => {
      console.error("[SovereignArchive] ZIP error:", err);
    });
    archive.pipe(res);

    console.log(
      `[SovereignArchive] Admin ${user.name} exporting batch ${batchNum} — ${batch.length} tracks (offset ${offset})`
    );

    for (const song of batch as any[]) {
      const folderSlug = `${slugify(song.title)}-${song.id}`;
      const base = `songs/${folderSlug}`;

      // ── metadata/ ──────────────────────────────────────────────────────────
      const metadataObj = {
        ...song,
        exportedAt: new Date().toISOString(),
        exportedBy: user.name,
        platform: "Living Nexus",
      };
      archive.append(JSON.stringify(metadataObj, null, 2), {
        name: `${base}/metadata/metadata.json`,
      });

      // ── lyrics/ ────────────────────────────────────────────────────────────
      if (song.lyricsText) {
        archive.append(song.lyricsText, {
          name: `${base}/lyrics/lyrics.txt`,
        });
      }

      // ── tone/ ──────────────────────────────────────────────────────────────
      const toneData: Record<string, any> = {
        songId: song.id,
        title: song.title,
        exportedAt: new Date().toISOString(),
      };
      if (song.harmonicSignature) {
        toneData.harmonicSignature = song.harmonicSignature;
        toneData.description =
          "Harmonic signature — frequency amplitude array derived from audio analysis during WID registration.";
      }
      // Include ECDSA provenance keys if present
      if (song.ecdsaPublicKey) toneData.ecdsaPublicKey = song.ecdsaPublicKey;
      if (song.ecdsaSignature) toneData.ecdsaSignature = song.ecdsaSignature;
      if (song.fileHash) toneData.fileHash = song.fileHash;
      if (song.sampleRate) toneData.sampleRate = song.sampleRate;
      if (song.bitDepth) toneData.bitDepth = song.bitDepth;
      if (song.bpm) toneData.bpm = song.bpm;
      if (song.keySignature) toneData.keySignature = song.keySignature;

      archive.append(JSON.stringify(toneData, null, 2), {
        name: `${base}/tone/tone-signature.json`,
      });

      // ── wid/ ───────────────────────────────────────────────────────────────
      if (song.witnessId) {
        const widRecord = widMap.get(song.witnessId);
        const linkedTestimonies = (testimonies as any[]).filter((t: any) => {
          try {
            const linked = (t.linkedWorks as string[]) ?? [];
            return linked.includes(song.witnessId!);
          } catch {
            return false;
          }
        });

        const widDoc = {
          wid: song.witnessId,
          songId: song.id,
          title: song.title,
          contentHash: (widRecord as any)?.contentHash ?? song.fileHash ?? null,
          signature: (widRecord as any)?.signature ?? null,
          createdAt: (widRecord as any)?.createdAt ?? song.createdAt,
          lyricsHash: song.lyricsHash ?? null,
          certificateUrl: song.certificateUrl ?? null,
          ecdsaPublicKey: song.ecdsaPublicKey ?? null,
          ecdsaSignature: song.ecdsaSignature ?? null,
          witnessTestimonies: (linkedTestimonies as any[]).map((t: any) => ({
            wid: t.wid,
            content: t.content,
            createdAt: t.createdAt,
          })),
          exportedAt: new Date().toISOString(),
          platform: "Living Nexus",
          note: "This document constitutes a sovereign provenance record. The WID (Witness ID) anchors authorship, timestamp, and cryptographic integrity for this work.",
        };

        archive.append(JSON.stringify(widDoc, null, 2), {
          name: `${base}/wid/${song.witnessId}.json`,
        });
      }

      // ── audio/ ─────────────────────────────────────────────────────────────
      if (song.fileUrl) {
        const audioBuffer = await fetchBuffer(song.fileUrl);
        if (audioBuffer) {
          const ext = extFromUrl(song.fileUrl, "mp3");
          const audioFilename = `${slugify(song.title)}.${ext}`;
          archive.append(audioBuffer, { name: `${base}/audio/${audioFilename}` });
        } else {
          // Fallback: include a reference file if download fails
          archive.append(
            JSON.stringify({ url: song.fileUrl, note: "Download failed — use this URL to retrieve the file." }, null, 2),
            { name: `${base}/audio/audio-url.json` }
          );
        }
      }

      // ── artwork/ ───────────────────────────────────────────────────────────
      if (song.coverArtUrl) {
        const artBuffer = await fetchBuffer(song.coverArtUrl);
        if (artBuffer) {
          const ext = extFromUrl(song.coverArtUrl, "jpg");
          archive.append(artBuffer, { name: `${base}/artwork/cover-art.${ext}` });
        } else {
          archive.append(
            JSON.stringify({ url: song.coverArtUrl, note: "Download failed — use this URL to retrieve the file." }, null, 2),
            { name: `${base}/artwork/artwork-url.json` }
          );
        }
      }

      // ── video/ ─────────────────────────────────────────────────────────────
      const videoUrl = song.musicVideoUrl || song.autoVideoUrl || song.videoUrl;
      if (videoUrl) {
        const videoBuffer = await fetchBuffer(videoUrl);
        if (videoBuffer) {
          const ext = extFromUrl(videoUrl, "mp4");
          const isAiGenerated = !!song.musicVideoUrl;
          const videoFilename = isAiGenerated ? `music-video-ai.${ext}` : `music-video.${ext}`;
          archive.append(videoBuffer, { name: `${base}/video/${videoFilename}` });

          // Include the AI script if available
          if (song.musicVideoScript && isAiGenerated) {
            archive.append(song.musicVideoScript, {
              name: `${base}/video/music-video-script.json`,
            });
          }
        } else {
          archive.append(
            JSON.stringify({ url: videoUrl, note: "Download failed — use this URL to retrieve the file." }, null, 2),
            { name: `${base}/video/video-url.json` }
          );
        }
      }
    }

    // Finalize the archive
    await archive.finalize();

    console.log(
      `[SovereignArchive] ZIP complete — batch ${batchNum}, ${batch.length} tracks`
    );
  }
);
