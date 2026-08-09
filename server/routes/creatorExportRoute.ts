/**
 * Creator Data Export Route
 * GET /api/creator-export/batch?offset=0&limit=10
 *
 * Authenticates the user via session cookie, fetches their songs from the DB,
 * then fetches the actual audio and cover art binary files from the CDN
 * server-to-server (no CORS restriction), and streams a real ZIP to the browser.
 *
 * Each work gets its own folder inside the ZIP:
 *   {Title}-{WID-suffix}/
 *     provenance.json        — all metadata, WID, HAAI declaration
 *     {title}.mp3            — actual audio binary (if fileUrl present)
 *     cover.jpg              — actual cover art binary (if coverArtUrl present)
 *     lyrics.txt             — embedded lyrics (if present)
 */
import { Router, Request, Response } from "express";
import type { ArchiverOptions, ZipArchive } from "archiver";
import { createRequire } from "module";
const _req = createRequire(import.meta.url);
const createArchive = _req("archiver") as (format: string, opts?: ArchiverOptions) => InstanceType<typeof ZipArchive>;
import { getDb } from "../utils/db";
import { songs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@shared/const";
import { Readable } from "stream";

export const creatorExportRouter = Router();

// ── Auth helper ─────────────────────────────────────────────────────────────
async function getUserIdFromCookie(req: Request): Promise<number | null> {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "number") return null;
    return payload.userId;
  } catch {
    return null;
  }
}

// ── Sanitize filename ────────────────────────────────────────────────────────
function safe(str: string, maxLen = 60): string {
  return str
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .trim()
    .slice(0, maxLen);
}

// ── Guess file extension from URL ────────────────────────────────────────────
function guessExt(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
    if (["mp3", "wav", "flac", "ogg", "m4a", "aac"].includes(ext)) return ext;
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return ext;
  } catch { /* ignore */ }
  return fallback;
}

// ── Main export endpoint ─────────────────────────────────────────────────────
creatorExportRouter.get("/api/creator-export/batch", async (req: Request, res: Response) => {
  // 1. Authenticate
  const userId = await getUserIdFromCookie(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // 2. Parse query params
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
  const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10));

  // 3. Fetch songs from DB
  const db = await getDb();
  if (!db) {
    res.status(500).json({ error: "Database unavailable" });
    return;
  }

  const [totalRows, batch] = await Promise.all([
    db.select({ id: songs.id }).from(songs).where(eq(songs.userId, userId)),
    db.select().from(songs)
      .where(eq(songs.userId, userId))
      .orderBy(desc(songs.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  if (batch.length === 0) {
    res.status(404).json({ error: "No works found at this offset" });
    return;
  }

  const totalCount = totalRows.length;
  const batchNum = Math.floor(offset / limit) + 1;
  const totalBatches = Math.ceil(totalCount / limit);

  // 4. Set ZIP response headers
  const zipName = `living-nexus-archive-batch-${batchNum}-of-${totalBatches}.zip`;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");

  // 5. Create archiver and pipe to response
  const archive = createArchive("zip", { zlib: { level: 6 } });
  archive.on("error", (err: Error) => {
    console.error("[CreatorExport] Archiver error:", err);
    res.destroy(err);
  });
  archive.pipe(res);

  // 6. Build batch manifest
  const manifest = {
    _platform: "Living Nexus — BDDT Publishing / Command Domains LLC",
    _exportedAt: new Date().toISOString(),
    _exportVersion: "2.0",
    _batchInfo: { batchNumber: batchNum, totalBatches, offset, limit, totalWorks: totalCount },
    works: batch.map((s: typeof batch[number]) => ({
      id: s.id,
      title: s.title,
      witnessId: s.witnessId,
      lyricsWid: s.lyricsWid,
      contentType: s.contentType,
      genre: s.genre,
      status: s.status,
      aiDisclosure: s.aiDisclosure,
      bpm: s.bpm,
      musicalKey: s.musicalKey,
      isrc: s.isrc,
      duration: s.duration,
      fileUrl: s.fileUrl,
      coverArtUrl: s.coverArtUrl,
      videoUrl: s.videoUrl,
      createdAt: s.createdAt,
    })),
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: "batch-manifest.json" });

  // 7. For each work, fetch binary files and add to ZIP
  for (const s of batch) {
    const title = safe(s.title ?? `work-${s.id}`);
    const widSuffix = s.witnessId ? s.witnessId.slice(-8) : `id${s.id}`;
    const folderName = `${title}-${widSuffix}`;

    // provenance.json — always
    const provenance = {
      _platform: "Living Nexus — BDDT Publishing / Command Domains LLC",
      _exportedAt: new Date().toISOString(),
      registry: {
        witnessId: s.witnessId,
        lyricsWid: s.lyricsWid,
        registeredAt: s.createdAt,
        lastUpdated: s.updatedAt,
        status: s.status,
      },
      work: {
        id: s.id,
        title: s.title,
        contentType: s.contentType,
        genre: s.genre,
        bpm: s.bpm,
        musicalKey: s.musicalKey,
        isrc: s.isrc,
        duration: s.duration,
      },
      disclosure: {
        aiDisclosure: s.aiDisclosure,
        aiConsent: s.aiConsent,
        haaiOriginStory: (s as any).haaiOriginStory ?? null,
        haaiVisualConcept: (s as any).haaiVisualConcept ?? null,
        haaiStyleLanguage: (s as any).haaiStyleLanguage ?? null,
        haaiInstrumentation: (s as any).haaiInstrumentation ?? null,
        haaiVocalConveyance: (s as any).haaiVocalConveyance ?? null,
        haaiLyricalInspiration: (s as any).haaiLyricalInspiration ?? null,
        haaiEmotionalTone: (s as any).haaiEmotionalTone ?? null,
        haaiDeclaredAt: (s as any).haaiDeclaredAt ?? null,
      },
      media: {
        audioFile: s.fileUrl ?? null,
        coverArt: s.coverArtUrl ?? null,
        video: s.videoUrl ?? null,
        s3Key: s.fileKey ?? null,
      },
    };
    archive.append(JSON.stringify(provenance, null, 2), { name: `${folderName}/provenance.json` });

    // lyrics.txt — if present
    if ((s as any).lyricsText) {
      archive.append(String((s as any).lyricsText), { name: `${folderName}/lyrics.txt` });
    }

    // Audio file — fetch binary from CDN
    if (s.fileUrl) {
      try {
        const resp = await fetch(s.fileUrl, { signal: AbortSignal.timeout(30000) });
        if (resp.ok && resp.body) {
          const ext = guessExt(s.fileUrl, "mp3");
          const nodeStream = Readable.fromWeb(resp.body as Parameters<typeof Readable.fromWeb>[0]);
          archive.append(nodeStream, { name: `${folderName}/${title}.${ext}` });
        } else {
          console.warn(`[CreatorExport] Audio fetch failed for song ${s.id}: HTTP ${resp.status}`);
          archive.append(`Audio URL: ${s.fileUrl}\n(File could not be fetched — use this URL to download manually)`, {
            name: `${folderName}/audio-url.txt`,
          });
        }
      } catch (err) {
        console.warn(`[CreatorExport] Audio fetch error for song ${s.id}:`, err);
        archive.append(`Audio URL: ${s.fileUrl}\n(Fetch timed out — use this URL to download manually)`, {
          name: `${folderName}/audio-url.txt`,
        });
      }
    }

    // Cover art — fetch binary from CDN
    if (s.coverArtUrl) {
      try {
        const resp = await fetch(s.coverArtUrl, { signal: AbortSignal.timeout(15000) });
        if (resp.ok && resp.body) {
          const ext = guessExt(s.coverArtUrl, "jpg");
          const nodeStream = Readable.fromWeb(resp.body as Parameters<typeof Readable.fromWeb>[0]);
          archive.append(nodeStream, { name: `${folderName}/cover.${ext}` });
        }
      } catch (err) {
        console.warn(`[CreatorExport] Cover art fetch error for song ${s.id}:`, err);
      }
    }
  }

  // 8. Finalize
  await archive.finalize();
});
