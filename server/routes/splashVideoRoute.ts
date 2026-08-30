import type { Express, Request, Response } from "express";
import { Readable } from "node:stream";
import { ENV } from "../_core/env";

const SPLASH_VIDEO_KEY = "dark-gold-vault_cc92b6bb.mp4";

export function registerSplashVideoRoute(app: Express) {
  app.get("/api/splash-video", async (req: Request, res: Response) => {
    try {
      if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
        res.status(500).send("Storage proxy not configured");
        return;
      }

      const presignUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      presignUrl.searchParams.set("path", SPLASH_VIDEO_KEY);

      const presignResponse = await fetch(presignUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!presignResponse.ok) {
        console.error(`[SplashVideo] storage presign failed: ${presignResponse.status}`);
        res.status(502).send("Splash video unavailable");
        return;
      }

      const { url } = (await presignResponse.json()) as { url?: string };
      if (!url) {
        res.status(502).send("Splash video unavailable");
        return;
      }

      const range = req.header("range");
      const upstream = await fetch(url, range ? { headers: { Range: range } } : undefined);

      if (!upstream.ok && upstream.status !== 206) {
        res.status(502).send("Splash video unavailable");
        return;
      }

      res.status(upstream.status);
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp4");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
      for (const header of ["content-length", "content-range", "etag", "last-modified"]) {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
      }

      if (!upstream.body) {
        res.end();
        return;
      }
      Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    } catch (error) {
      console.error("[SplashVideo] proxy failed:", error);
      if (!res.headersSent) res.status(502).send("Splash video unavailable");
    }
  });
}

export { SPLASH_VIDEO_KEY };
