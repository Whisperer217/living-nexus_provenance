/**
 * Living Nexus — Physical Distribution Export
 * =============================================
 * Admin-only endpoint that packages selected songs into a branded ZIP
 * ready for USB thumb drive duplication.
 *
 * Each exported track includes:
 *  - ID3-tagged MP3 (title, artist, WID, cover art embedded)
 *  - Cover art as separate JPEG
 *  - WID certificate PDF (if available)
 *  - Branded README with provenance chain
 *
 * Route: POST /api/admin/physical-export
 * Body: { songIds: number[] }
 *
 * Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework
 */
import { Router, Request, Response } from "express";
import JSZip from "jszip";
import NodeID3 from "node-id3";
import { getSongsByIds } from "./db";
import { sdk } from "./_core/sdk";

export const physicalExportRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim();
}

function padNum(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

// ── Physical Export Endpoint ──────────────────────────────────────────────────

physicalExportRouter.post("/api/admin/physical-export", async (req: Request, res: Response) => {
  // 1. Admin auth
  let user: any;
  try {
    user = await sdk.authenticateRequest(req);
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
  } catch {
    res.status(401).json({ error: "Sign in as admin." });
    return;
  }

  // 2. Validate input
  const { songIds } = req.body as { songIds?: number[] };
  if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
    res.status(400).json({ error: "Provide songIds array." });
    return;
  }
  if (songIds.length > 200) {
    res.status(400).json({ error: "Max 200 songs per export." });
    return;
  }

  // 3. Fetch songs with creator info
  const songs = await getSongsByIds(songIds);
  if (songs.length === 0) {
    res.status(404).json({ error: "No songs found for the given IDs." });
    return;
  }

  // 4. Build ZIP
  const zip = new JSZip();
  const timestamp = new Date().toISOString().slice(0, 10);

  const readmeLines: string[] = [
    `╔══════════════════════════════════════════════════════════════════════╗`,
    `║          LIVING NEXUS — PHYSICAL DISTRIBUTION ARCHIVE              ║`,
    `╚══════════════════════════════════════════════════════════════════════╝`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Tracks: ${songs.length}`,
    ``,
    `Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework`,
    `He is before all things, and in him all things hold together. — Col 1:17`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `PROVENANCE MANIFEST`,
    `Each track carries its Witness ID (WID) — a cryptographic proof of`,
    `origin embedded in the audio file's ID3 metadata. Verify any track at:`,
    `https://www.livingnexus.org/verify/<WID>`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
  ];

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < songs.length; i++) {
    const { song, creator } = songs[i];
    const trackNum = padNum(i + 1);
    const creatorName = creator?.artistHandle
      ? `@${creator.artistHandle}`
      : (creator?.name ?? "Unknown Artist");
    const witnessId = song.witnessId ?? "UNWITNESSED";
    const verifyUrl = `https://www.livingnexus.org/verify/${witnessId}`;
    const year = new Date(song.createdAt).getFullYear().toString();
    const safeTitle = sanitizeFilename(song.title);
    const safeCreator = sanitizeFilename(creatorName.replace(/^@/, ""));
    const folderName = `${trackNum} - ${safeTitle} - ${safeCreator}`;

    // README entry
    readmeLines.push(`[${trackNum}] ${song.title}`);
    readmeLines.push(`     Artist: ${creatorName}`);
    readmeLines.push(`     WID: ${witnessId}`);
    readmeLines.push(`     Verify: ${verifyUrl}`);
    readmeLines.push(`     Genre: ${song.genre ?? "—"}`);
    readmeLines.push(`     Duration: ${song.durationSeconds ? `${Math.floor(song.durationSeconds / 60)}:${padNum(Math.round(song.durationSeconds % 60))}` : "—"}`);
    readmeLines.push(`     AI Disclosure: ${song.aiDisclosure ?? "—"}`);
    readmeLines.push(`     Uploaded: ${new Date(song.createdAt).toLocaleDateString()}`);
    readmeLines.push(``);

    // Fetch audio
    if (song.fileUrl) {
      const audioBuffer = await fetchBytes(song.fileUrl);
      if (audioBuffer) {
        // Fetch cover art
        let coverBuffer: Buffer | null = null;
        if (song.coverArtUrl) {
          coverBuffer = await fetchBytes(song.coverArtUrl);
        }

        // Build ID3 tags
        const tags: NodeID3.Tags = {
          title: song.title,
          artist: creatorName,
          album: song.albumName || "Living Nexus",
          year,
          genre: song.genre || undefined,
          comment: { language: "eng", text: `Witness ID: ${witnessId} | Verify: ${verifyUrl}` },
          userDefinedText: [
            { description: "LNWID", value: witnessId },
            { description: "LN_CREATOR", value: creatorName },
            { description: "LN_TIMESTAMP", value: song.createdAt.toISOString() },
            { description: "LN_VERIFY_URL", value: verifyUrl },
            { description: "LN_PLATFORM", value: "Living Nexus — Sovereign Music" },
            { description: "LN_DOCTRINE", value: "Command Domains LLC · BDDT Publishing" },
            { description: "LN_AI_CONSENT", value: song.aiConsent ?? "prohibited" },
            { description: "LN_AI_DISCLOSURE", value: song.aiDisclosure ?? "—" },
          ],
        };
        if (coverBuffer) {
          tags.image = {
            mime: "image/jpeg",
            type: { id: 3, name: "front cover" },
            description: "Cover Art",
            imageBuffer: coverBuffer,
          };
        }

        const taggedBuffer = NodeID3.write(tags, audioBuffer);
        zip.file(`${folderName}/track.mp3`, taggedBuffer);

        // Also save cover art as separate file
        if (coverBuffer) {
          zip.file(`${folderName}/cover.jpg`, coverBuffer);
        }

        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }

    // Add WID certificate PDF if available
    if (song.certificateUrl) {
      const certBuffer = await fetchBytes(song.certificateUrl);
      if (certBuffer) {
        zip.file(`${folderName}/WID_Certificate.pdf`, certBuffer);
      }
    }
  }

  // Add summary to README
  readmeLines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  readmeLines.push(``);
  readmeLines.push(`EXPORT SUMMARY`);
  readmeLines.push(`  Total tracks: ${songs.length}`);
  readmeLines.push(`  Successfully packaged: ${successCount}`);
  readmeLines.push(`  Failed/missing audio: ${failCount}`);
  readmeLines.push(``);
  readmeLines.push(`VERIFICATION`);
  readmeLines.push(`  Each MP3 file contains embedded WID metadata in its ID3 tags.`);
  readmeLines.push(`  Use any ID3 tag reader to inspect the LNWID field, or visit:`);
  readmeLines.push(`  https://www.livingnexus.org/verify/<WID>`);
  readmeLines.push(``);
  readmeLines.push(`© ${new Date().getFullYear()} Command Domains LLC. All rights reserved.`);

  zip.file("README.txt", readmeLines.join("\n"));

  // 5. Generate and stream ZIP
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const zipFilename = `LivingNexus_Physical_${timestamp}_${songs.length}tracks.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
  res.setHeader("Content-Length", zipBuffer.length.toString());
  res.setHeader("Cache-Control", "no-store");
  res.end(zipBuffer);
});

// ── List Songs for Export (admin) ─────────────────────────────────────────────
// GET /api/admin/physical-export/songs?search=&limit=&offset=
physicalExportRouter.get("/api/admin/physical-export/songs", async (req: Request, res: Response) => {
  let user: any;
  try {
    user = await sdk.authenticateRequest(req);
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
  } catch {
    res.status(401).json({ error: "Sign in as admin." });
    return;
  }

  const search = (req.query.search as string) || "";
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const offset = parseInt(req.query.offset as string) || 0;

  const songs = await getSongsByIds([], { search, limit, offset, includeAll: true });
  res.json({ songs, total: songs.length });
});
