import { Router, type Response } from "express";
import { buildProvenancePlayerManifest, ProvenancePlayerManifestUnavailableError } from "../domains/provenancePlayer/manifest";
import { getProvenancePlayerTrackSourceById, hasAmbiguousProvenancePlayerWids } from "../utils/db";

export const provenancePlayerMediaRouter = Router();

function unavailable(res: Response) {
  return res.status(404).json({ error: "Media unavailable" });
}

function setPublicMediaHeaders(res: Response) {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Range",
    "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range, Content-Type",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
}

/**
 * This route is deliberately not a generic stream endpoint. It is the media URL
 * in a copied Provenance Player manifest and re-evaluates external delegation on
 * every request, so a later unpublish/revoke/permission change stops new fetches.
 */
provenancePlayerMediaRouter.options("/api/provenance-player/media/:songId", (_req, res) => {
  setPublicMediaHeaders(res);
  return res.status(204).end();
});

provenancePlayerMediaRouter.get("/api/provenance-player/media/:songId", async (req, res) => {
  setPublicMediaHeaders(res);

  const songId = Number(req.params.songId);
  if (!Number.isSafeInteger(songId) || songId <= 0) return unavailable(res);

  try {
    const source = await getProvenancePlayerTrackSourceById(songId);
    if (!source?.song || !source.creator) return unavailable(res);
    if (await hasAmbiguousProvenancePlayerWids([source.song.witnessId ?? ""])) return unavailable(res);

    // Reuse the exact manifest eligibility policy instead of drifting from it.
    buildProvenancePlayerManifest({ tracks: [{ ...source.song, creator: source.creator }] });

    return res.redirect(302, source.song.fileUrl as string);
  } catch (error) {
    if (error instanceof ProvenancePlayerManifestUnavailableError) return unavailable(res);
    console.error("[ProvenancePlayerMedia] eligibility check failed", { songId });
    return unavailable(res);
  }
});
