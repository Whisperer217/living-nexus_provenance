/**
 * /api/upload-file
 * Accepts a multipart/form-data POST with a single `file` field.
 * Uploads the raw bytes to S3 via storagePut and returns { url, key }.
 *
 * This endpoint bypasses the tRPC JSON body size limit, allowing large
 * audio and image files to be uploaded without base64 encoding overhead.
 *
 * Auth: requires a valid session cookie (same as tRPC protectedProcedure).
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";

const router = Router();

// Store files in memory (max 500 MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

/**
 * POST /api/upload-file
 * Body: multipart/form-data
 *   file     — the binary file (audio, image, video)
 *   type     — "audio" | "cover" | "video" (used to build the S3 key prefix)
 *   filename — original filename (used for the S3 key)
 *
 * Returns: { url: string, key: string }
 */
router.post(
  "/api/upload-file",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      // Auth — reuse the same SDK method as tRPC context
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

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const fileType = (req.body.type as string) || "audio";
      const originalName = (req.body.filename as string) || file.originalname || "file";
      const safeFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const mimeType = file.mimetype || "application/octet-stream";

      // Build S3 key based on file type
      const prefix =
        fileType === "cover" ? "covers" :
        fileType === "video" ? "videos" :
        "audio";
      const key = `${prefix}/${user.id}/${Date.now()}-${safeFileName}`;

      const { url } = await storagePut(key, file.buffer, mimeType);

      res.json({ url, key });
    } catch (err: any) {
      console.error("[upload-file] Error:", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  }
);

export { router as uploadRouter };
