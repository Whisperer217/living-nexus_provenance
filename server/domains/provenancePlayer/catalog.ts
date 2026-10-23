import {
  buildProvenancePlayerManifest,
  type ProvenancePlayerManifestTrack,
  type ProvenancePlayerManifestTrackSource,
  ProvenancePlayerManifestUnavailableError,
} from "./manifest";

export const PROVENANCE_PLAYER_CATALOG_SCHEMA = "living-nexus-provenance-catalog/1" as const;
export const MAX_PROVENANCE_PLAYER_CATALOG_PAGE_SIZE = 100;
export const MAX_PROVENANCE_PLAYER_CATALOG_SCAN_SIZE = 500;

export type ProvenancePlayerCatalogCandidate = ProvenancePlayerManifestTrackSource & {
  createdAt: Date | null;
};

export type ProvenancePlayerCatalogPage = {
  schema: typeof PROVENANCE_PLAYER_CATALOG_SCHEMA;
  offset: number;
  limit: number;
  nextOffset: number | null;
  items: ProvenancePlayerManifestTrack[];
};

/**
 * Produces a page of discovery records from the exact single-Work portable
 * projection. A catalog page is not itself a living-nexus-player/1 import
 * manifest: each returned item is the already validated one-Work manifest track
 * a compatible remote client can map into its own catalog.
 */
export function buildProvenancePlayerCatalogPage(input: {
  offset: number;
  limit: number;
  scannedCandidates: readonly ProvenancePlayerCatalogCandidate[];
  hasMoreCandidates: boolean;
  ambiguousWids: ReadonlySet<string>;
}): ProvenancePlayerCatalogPage {
  const items: ProvenancePlayerManifestTrack[] = [];
  let consumedCandidates = 0;

  for (const candidate of input.scannedCandidates) {
    if (items.length >= input.limit) break;
    consumedCandidates += 1;
    const wid = candidate.witnessId?.trim() ?? "";
    if (!wid || input.ambiguousWids.has(wid)) continue;

    try {
      const manifest = buildProvenancePlayerManifest({ tracks: [candidate] });
      const track = manifest.tracks[0];
      if (track) items.push(track);
    } catch (error) {
      if (error instanceof ProvenancePlayerManifestUnavailableError) continue;
      throw error;
    }
  }

  return {
    schema: PROVENANCE_PLAYER_CATALOG_SCHEMA,
    offset: input.offset,
    limit: input.limit,
    nextOffset: input.hasMoreCandidates || consumedCandidates < input.scannedCandidates.length
      ? input.offset + consumedCandidates
      : null,
    items,
  };
}
