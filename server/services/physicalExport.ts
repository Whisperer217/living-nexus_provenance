/**
 * Living Nexus — Physical Distribution Export
 * =============================================
 * Admin-only endpoint that packages selected songs into a branded ZIP
 * ready for USB thumb drive duplication.
 *
 * LIMIT: 10 tracks per export.
 *
 * Each exported track includes:
 *  - ID3-tagged MP3 (title, artist, WID, cover art embedded)
 *  - Cover art as separate JPEG
 *  - Lyrics sheet (.txt) with full lyrics text
 *  - WID Provenance document (.txt) with full cryptographic chain
 *  - WID certificate PDF (if available)
 *  - Branded README with provenance manifest
 *
 * Route: POST /api/admin/physical-export
 * Body: { songIds: number[] }
 *
 * Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework
 */
import { Router, Request, Response } from "express";
import JSZip from "jszip";
import NodeID3 from "node-id3";
import { getSongsByIds } from "../utils/db";
import { sdk } from "../_core/sdk";

export const physicalExportRouter = Router();

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_TRACKS_PER_EXPORT = 10;

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

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${padNum(s)}`;
}

/**
 * Generate a lyrics sheet text file for a track.
 */
function buildLyricsSheet(song: any, creatorName: string): string {
  const lines: string[] = [
    `═══════════════════════════════════════════════════════`,
    `  LYRICS SHEET`,
    `═══════════════════════════════════════════════════════`,
    ``,
    `  Title: ${song.title}`,
    `  Artist: ${creatorName}`,
    `  Album: ${song.albumName || "Living Nexus"}`,
    `  Genre: ${song.genre ?? "—"}`,
    `  WID: ${song.witnessId ?? "UNWITNESSED"}`,
    ``,
    `───────────────────────────────────────────────────────`,
    ``,
  ];

  if (song.lyricsText && song.lyricsText.trim().length > 0) {
    lines.push(song.lyricsText);
  } else {
    lines.push(`  [No lyrics available for this track]`);
    lines.push(`  This work may be instrumental or lyrics have not been registered.`);
  }

  lines.push(``);
  lines.push(`───────────────────────────────────────────────────────`);
  lines.push(`  © ${new Date().getFullYear()} ${creatorName} · All Rights Reserved`);
  lines.push(`  Witnessed on Living Nexus · Command Domains LLC`);
  lines.push(`═══════════════════════════════════════════════════════`);

  return lines.join("\n");
}

/**
 * Generate a WID provenance document for a track.
 */
function buildProvenanceDoc(song: any, creatorName: string): string {
  const witnessId = song.witnessId ?? "UNWITNESSED";
  const verifyUrl = `https://www.livingnexus.org/verify/${witnessId}`;
  const createdAt = song.createdAt ? new Date(song.createdAt).toISOString() : "Unknown";

  const lines: string[] = [
    `╔══════════════════════════════════════════════════════════════════╗`,
    `║          WID PROVENANCE CERTIFICATE — LIVING NEXUS              ║`,
    `╚══════════════════════════════════════════════════════════════════╝`,
    ``,
    `WITNESS IDENTIFICATION`,
    `──────────────────────────────────────────────────────────────────`,
    `  WID:              ${witnessId}`,
    `  Title:            ${song.title}`,
    `  Creator:          ${creatorName}`,
    `  Content Type:     ${song.contentType ?? "audio"}`,
    `  Registered:       ${createdAt}`,
    `  Verify URL:       ${verifyUrl}`,
    ``,
    `CRYPTOGRAPHIC PROOF`,
    `──────────────────────────────────────────────────────────────────`,
    `  ECDSA Public Key: ${song.ecdsaPublicKey ? "Present (P-256)" : "Not available"}`,
    `  ECDSA Signature:  ${song.ecdsaSignature ? song.ecdsaSignature.substring(0, 44) + "..." : "Not available"}`,
    `  File Hash:        ${song.fileHash ?? "Not available"}`,
    `  Lyrics Hash:      ${song.lyricsHash ?? "Not available"}`,
    ``,
    `HARMONIC SIGNATURE`,
    `──────────────────────────────────────────────────────────────────`,
  ];

  if (song.harmonicSignature && Array.isArray(song.harmonicSignature)) {
    lines.push(`  Frequencies: ${song.harmonicSignature.map((f: number) => `${f.toFixed(1)} Hz`).join(", ")}`);
  } else {
    lines.push(`  Not available (non-audio content or pending analysis)`);
  }

  lines.push(``);
  lines.push(`AI DISCLOSURE`);
  lines.push(`──────────────────────────────────────────────────────────────────`);
  lines.push(`  AI Consent:       ${song.aiConsent ?? "prohibited"}`);
  lines.push(`  AI Disclosure:    ${song.aiDisclosure ?? "—"}`);
  if (song.aiToolOther && song.aiToolOtherName) {
    lines.push(`  AI Tool Used:     ${song.aiToolOtherName}`);
  }
  if (song.aiToolSuno) lines.push(`  AI Tool:          Suno`);
  if (song.aiToolUdio) lines.push(`  AI Tool:          Udio`);
  if (song.aiToolSonato) lines.push(`  AI Tool:          Sonauto`);

  lines.push(``);
  lines.push(`TRACK METADATA`);
  lines.push(`──────────────────────────────────────────────────────────────────`);
  lines.push(`  Genre:            ${song.genre ?? "—"}`);
  lines.push(`  Album:            ${song.albumName ?? "—"}`);
  lines.push(`  Duration:         ${formatDuration(song.durationSeconds)}`);
  lines.push(`  BPM:              ${song.bpm ?? "—"}`);
  lines.push(`  Key:              ${song.keySignature ?? "—"}`);
  lines.push(`  Sample Rate:      ${song.sampleRate ?? "—"}`);
  lines.push(`  Bit Depth:        ${song.bitDepth ?? "—"}`);
  lines.push(`  ISRC:             ${song.isrc ?? "—"}`);

  if (song.coWriters && song.coWriters.length > 0) {
    lines.push(`  Co-Writers:       ${song.coWriters.join(", ")}`);
  }

  lines.push(``);
  lines.push(`DOWNLOAD PERMISSION`);
  lines.push(`──────────────────────────────────────────────────────────────────`);
  lines.push(`  Permission:       ${song.downloadPermission ?? "none"}`);
  lines.push(`  This physical copy is authorized by the platform administrator.`);

  lines.push(``);
  lines.push(`VERIFICATION INSTRUCTIONS`);
  lines.push(`──────────────────────────────────────────────────────────────────`);
  lines.push(`  1. Visit: ${verifyUrl}`);
  lines.push(`  2. The WID is also embedded in the MP3 file's ID3 metadata.`);
  lines.push(`     Open the file in any ID3 tag reader and check the`);
  lines.push(`     "LNWID" user-defined text field.`);
  lines.push(`  3. The harmonic signature and ECDSA signature provide`);
  lines.push(`     cryptographic proof of origin that cannot be forged.`);

  lines.push(``);
  lines.push(`──────────────────────────────────────────────────────────────────`);
  lines.push(`  © ${new Date().getFullYear()} Command Domains LLC · BDDT Publishing`);
  lines.push(`  He is before all things, and in him all things hold together.`);
  lines.push(`  — Colossians 1:17`);
  lines.push(`╚══════════════════════════════════════════════════════════════════╝`);

  return lines.join("\n");
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

  // 2. Validate input — MAX 10 tracks
  const { songIds } = req.body as { songIds?: number[] };
  if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
    res.status(400).json({ error: "Provide songIds array." });
    return;
  }
  if (songIds.length > MAX_TRACKS_PER_EXPORT) {
    res.status(400).json({ error: `Max ${MAX_TRACKS_PER_EXPORT} songs per export. You selected ${songIds.length}.` });
    return;
  }

  // 3. Fetch songs with creator info
  const songs = await getSongsByIds(songIds);
  if (songs.length === 0) {
    res.status(404).json({ error: "No songs found for the given IDs." });
    return;
  }

  // 4. Build ZIP with full documentation per track
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
    `CONTENTS PER TRACK FOLDER:`,
    `  • track.mp3          — ID3-tagged audio with embedded WID + cover art`,
    `  • cover.jpg          — Cover art image (high resolution)`,
    `  • lyrics.txt         — Full lyrics sheet`,
    `  • provenance.txt     — WID provenance certificate with crypto proof`,
    `  • WID_Certificate.pdf — Official WID certificate (if available)`,
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
    readmeLines.push(`     Duration: ${formatDuration(song.durationSeconds)}`);
    readmeLines.push(`     AI Disclosure: ${song.aiDisclosure ?? "—"}`);
    readmeLines.push(`     Uploaded: ${new Date(song.createdAt).toLocaleDateString()}`);
    readmeLines.push(``);

    // ── Per-track documentation ──

    // A) Lyrics sheet (always included, even if empty)
    const lyricsSheet = buildLyricsSheet(song, creatorName);
    zip.file(`${folderName}/lyrics.txt`, lyricsSheet);

    // B) WID Provenance document (always included)
    const provenanceDoc = buildProvenanceDoc(song, creatorName);
    zip.file(`${folderName}/provenance.txt`, provenanceDoc);

    // C) Audio file with ID3 tags
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

        // D) Cover art as separate file
        if (coverBuffer) {
          zip.file(`${folderName}/cover.jpg`, coverBuffer);
        }

        successCount++;
      } else {
        failCount++;
      }
    } else {
      // No audio — still count as partial (lyrics + provenance are included)
      failCount++;
    }

    // E) WID certificate PDF if available
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
  readmeLines.push(`  Successfully packaged (with audio): ${successCount}`);
  readmeLines.push(`  Missing audio (docs only): ${failCount}`);
  readmeLines.push(``);
  readmeLines.push(`NOTE: Even tracks without audio files include lyrics and provenance`);
  readmeLines.push(`documents. These are still valid intellectual property records.`);
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
