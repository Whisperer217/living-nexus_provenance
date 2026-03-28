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
 */

import { Router, Request, Response } from "express";
import Busboy from "busboy";
import FormData from "form-data";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

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
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // ── Streaming multipart parse ─────────────────────────────────────────────
  // We use busboy to extract the file stream and metadata fields WITHOUT
  // buffering the file bytes in memory.
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    res.status(400).json({ error: "Expected multipart/form-data" });
    return;
  }

  const bb = Busboy({ headers: req.headers });

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
    const key = `${prefix}/${user!.id}/${Date.now()}-${safeFileName}`;

    // Build a FormData that wraps the live stream — no buffering
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
              reject(new Error(`Forge API error ${forgeRes.statusCode}: ${body}`));
              return;
            }
            try {
              const parsed = JSON.parse(body);
              resolve({ url: parsed.url, key });
            } catch {
              reject(new Error(`Invalid Forge API response: ${body}`));
            }
          });
        }
      );
    });
  });

  bb.on("finish", async () => {
    if (!uploadPromise) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    try {
      const result = await uploadPromise;
      res.json(result);
    } catch (err: any) {
      console.error("[upload-file] Forge relay error:", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  bb.on("error", (err: Error) => {
    console.error("[upload-file] Busboy error:", err);
    res.status(500).json({ error: "Upload parsing failed" });
  });

  req.pipe(bb);
});

export { router as uploadRouter };
