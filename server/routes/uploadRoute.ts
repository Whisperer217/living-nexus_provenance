/**
 * /api/upload-file
 * Accepts a multipart/form-data POST with a single `file` field.
 *
 * STREAMING RELAY — the incoming file bytes are piped directly to the Forge
 * storage API without buffering in memory. This bypasses the platform reverse
 * proxy's request-body size limit (≈30 MB) and supports arbitrarily large
 * WAV / video files.
 *
 * Flow:
 *   Browser → multipart POST → Express (streaming, no buffer) → Forge API → CDN URL
 *
 * Auth: requires a valid session cookie (same as tRPC protectedProcedure).
 *
 * ERROR HARDENING:
 *   - Every failure path returns a reference code (UPL-XXXX) to the client
 *   - Full error details (stack, ORM, S3 response) go to server logs ONLY
 *   - No raw error message, path, or internal detail ever reaches the client
 */

import { Router, Request, Response } from "express";
import Busboy from "busboy";
import FormData from "form-data";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import { generateRef, safeErrorResponse } from "../_core/errorHandler";
import { micronize, type ImagePreset } from "../services/imageProcessing";
import { storagePut } from "../utils/storage";

const router = Router();

/**
 * POST /api/upload-file
 * Body: multipart/form-data
 *   file     — the binary file (audio, image, video)
 *   type     — "audio" | "cover" | "video" (used to build the S3 key prefix)
 *   filename — original filename (used for the S3 key)
 *
 * Returns: { url: string, key: string }
 */
router.post("/api/upload-file", async (req: Request, res: Response) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
  try {
    user = await sdk.authenticateRequest(req);
  } catch (err) {
    const ref = generateRef("UPL");
    console.error(`[upload-file] Auth error [${ref}]`, err instanceof Error ? err.stack ?? err.message : err);
    res.status(401).json({ error: "Unauthorized", code: "ERR_AUTH", ref });
    return;
  }
  if (!user) {
    res.status(401).json({ error: "Unauthorized", code: "ERR_AUTH" });
    return;
  }

  // ── Content-type guard ────────────────────────────────────────────────────
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    res.status(400).json({ error: "Expected multipart/form-data", code: "ERR_BAD_REQUEST" });
    return;
  }

  // ── Streaming multipart parse ─────────────────────────────────────────────
  let bb: ReturnType<typeof Busboy>;
  try {
    bb = Busboy({ headers: req.headers });
  } catch (err) {
    const { payload } = safeErrorResponse("[upload-file] Busboy init", err, generateRef("UPL"));
    res.status(500).json(payload);
    return;
  }

  let fileType = "audio";
  let originalName = "file";
  let mimeType = "application/octet-stream";
  let uploadPromise: Promise<{ url: string; key: string }> | null = null;

  bb.on("field", (name: string, value: string) => {
    if (name === "type") fileType = value;
    if (name === "filename") originalName = value;
  });

  bb.on("file", (_fieldname: string, fileStream: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
    if (info.filename) originalName = info.filename;
    if (info.mimeType) mimeType = info.mimeType;

    const safeFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const prefix =
      fileType === "cover" ? "covers" :
      fileType === "video" ? "videos" :
      "audio";

    // Determine if this file type should be micronized
    const imagePreset: ImagePreset | null =
      fileType === "cover" ? "coverArt" : null;

    if (imagePreset) {
      // IMAGE PATH: buffer the stream, micronize, then upload processed WebP
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      uploadPromise = new Promise<{ url: string; key: string }>((resolve, reject) => {
        fileStream.on("end", async () => {
          try {
            const rawBuffer = Buffer.concat(chunks);
            const { buffer, mimeType: processedMime } = await micronize(rawBuffer, imagePreset);
            const webpFileName = safeFileName.replace(/\.[^.]+$/, ".webp");
            const key = `${prefix}/${user!.id}/${Date.now()}-${webpFileName}`;
            const { url } = await storagePut(key, buffer, processedMime);
            resolve({ url, key });
          } catch (err) {
            reject(err);
          }
        });
        fileStream.on("error", reject);
      });
    } else {
      // STREAMING PATH: pipe directly to Forge (audio/video — no processing)
      const key = `${prefix}/${user!.id}/${Date.now()}-${safeFileName}`;
      const form = new FormData();
      form.append("file", fileStream, {
        filename: safeFileName,
        contentType: mimeType,
        knownLength: undefined, // unknown — streaming
      });

      const forgeUrl = `${ENV.forgeApiUrl.replace(/\/+$/, "")}/v1/storage/upload?path=${encodeURIComponent(key)}`;

      uploadPromise = new Promise<{ url: string; key: string }>((resolve, reject) => {
        form.submit(
          {
            protocol: forgeUrl.startsWith("https") ? "https:" : "http:",
            host: new URL(forgeUrl).hostname,
            port: new URL(forgeUrl).port || undefined,
            path: new URL(forgeUrl).pathname + new URL(forgeUrl).search,
            method: "POST",
            headers: {
              Authorization: `Bearer ${ENV.forgeApiKey}`,
            },
          },
          (err, forgeRes) => {
            if (err) { reject(err); return; }
            let body = "";
            forgeRes.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            forgeRes.on("end", () => {
              if (forgeRes.statusCode && forgeRes.statusCode >= 400) {
                const ref = generateRef("UPL");
                console.error(`[upload-file] Forge API error [${ref}] status=${forgeRes.statusCode} body=${body}`);
                reject(Object.assign(new Error("Forge API rejected the upload"), { ref }));
                return;
              }
              try {
                const parsed = JSON.parse(body);
                resolve({ url: parsed.url, key });
              } catch (parseErr) {
                const ref = generateRef("UPL");
                console.error(`[upload-file] Forge response parse error [${ref}]`, parseErr, "body:", body);
                reject(Object.assign(new Error("Invalid storage response"), { ref }));
              }
            });
          }
        );
      });
    }
  });

  bb.on("finish", async () => {
    if (!uploadPromise) {
      res.status(400).json({ error: "No file provided", code: "ERR_NO_FILE" });
      return;
    }
    try {
      const result = await uploadPromise;
      res.json(result);
    } catch (err: any) {
      // err.ref is set above when we already logged; otherwise generate a new one
      const ref: string = err?.ref ?? generateRef("UPL");
      if (!err?.ref) {
        // Only log if we haven't already
        console.error(`[upload-file] Upload failed [${ref}]`, err instanceof Error ? err.stack ?? err.message : err);
      }
      res.status(500).json({
        error: "Upload failed. Please try again.",
        code: "ERR_UPLOAD",
        ref,
      });
    }
  });

  bb.on("error", (err: Error) => {
    const { payload } = safeErrorResponse("[upload-file] Busboy stream error", err, generateRef("UPL"));
    if (!res.headersSent) res.status(500).json(payload);
  });

  req.pipe(bb);
});

/**
 * POST /api/upload-gallery-image
 * Accepts a multipart/form-data POST with a single `file` image field.
 * Returns { url, key } — stores under gallery/ prefix in S3.
 */
router.post("/api/upload-gallery-image", async (req: Request, res: Response) => {
  let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
  try { user = await sdk.authenticateRequest(req); }
  catch (err) { const ref = generateRef("GAL"); console.error(`[upload-gallery] Auth error [${ref}]`, err); res.status(401).json({ error: "Unauthorized", ref }); return; }
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    res.status(400).json({ error: "Expected multipart/form-data" }); return;
  }

  let bb: ReturnType<typeof Busboy>;
  try { bb = Busboy({ headers: req.headers }); }
  catch (err) { const { payload } = safeErrorResponse("[upload-gallery] Busboy init", err, generateRef("GAL")); res.status(500).json(payload); return; }

  let originalName = "image";
  let mimeType = "image/jpeg";
  let uploadPromise: Promise<{ url: string; key: string }> | null = null;

  bb.on("file", (_fieldname: string, fileStream: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
    if (info.filename) originalName = info.filename;
    if (info.mimeType) mimeType = info.mimeType;
    const safeFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Buffer the stream, micronize as gallery preset, then upload WebP
    const chunks: Buffer[] = [];
    fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    uploadPromise = new Promise<{ url: string; key: string }>((resolve, reject) => {
      fileStream.on("end", async () => {
        try {
          const rawBuffer = Buffer.concat(chunks);
          const { buffer, mimeType: processedMime } = await micronize(rawBuffer, "gallery");
          const webpFileName = safeFileName.replace(/\.[^.]+$/, ".webp");
          const key = `gallery/${user!.id}/${Date.now()}-${webpFileName}`;
          const { url } = await storagePut(key, buffer, processedMime);
          resolve({ url, key });
        } catch (err) {
          reject(err);
        }
      });
      fileStream.on("error", reject);
    });
  });

  bb.on("finish", async () => {
    if (!uploadPromise) { res.status(400).json({ error: "No file provided" }); return; }
    try { const result = await uploadPromise; res.json(result); }
    catch (err: any) {
      const ref: string = err?.ref ?? generateRef("GAL");
      if (!err?.ref) console.error(`[upload-gallery] Upload failed [${ref}]`, err instanceof Error ? err.stack ?? err.message : err);
      res.status(500).json({ error: "Upload failed. Please try again.", code: "ERR_UPLOAD", ref });
    }
  });

  bb.on("error", (err: Error) => { const { payload } = safeErrorResponse("[upload-gallery] stream error", err, generateRef("GAL")); if (!res.headersSent) res.status(500).json(payload); });
  req.pipe(bb);
});

export { router as uploadRouter };
