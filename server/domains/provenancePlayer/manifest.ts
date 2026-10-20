export const PROVENANCE_PLAYER_MANIFEST_SCHEMA = "living-nexus-player/1" as const;
export const MAX_PROVENANCE_PLAYER_MANIFEST_TRACKS = 500;
export const MAX_PROVENANCE_PLAYER_MANIFEST_BYTES = 2 * 1024 * 1024;

export type ProvenancePlayerManifestTrackSource = {
  id: number;
  title: string;
  contentType: string;
  status: string;
  isPublic: boolean;
  isFlagged: boolean;
  witnessId: string | null;
  fileUrl: string | null;
  coverArtUrl: string | null;
  externalDisplayEnabled: boolean;
  externalDisplayRightsConfirmed: boolean;
  externalDisplayAuthorizedAt: Date | null;
  externalDisplayRevokedAt: Date | null;
  downloadPermission: string;
  participationMusic: string | null;
  participationLyrics: string | null;
  participationVoice: string | null;
  creator: {
    artistHandle: string | null;
    name: string | null;
  };
};

export type ProvenancePlayerManifestTrack = {
  title: string;
  creator: string;
  album?: string;
  artworkUrl?: string;
  sourceUrl: string;
  audioUrl: string;
  workId: string;
  wid: string;
  aiDisclosure?: string;
};

export type ProvenancePlayerManifest = {
  schema: typeof PROVENANCE_PLAYER_MANIFEST_SCHEMA;
  tracks: ProvenancePlayerManifestTrack[];
};

export class ProvenancePlayerManifestUnavailableError extends Error {
  constructor() {
    super("Manifest unavailable");
    this.name = "ProvenancePlayerManifestUnavailableError";
  }
}

function unavailable(): never {
  throw new ProvenancePlayerManifestUnavailableError();
}

/**
 * A copied manifest is intentionally a portable media delegation. Never accept a
 * signed, credentialed, query-bearing, or fragment-bearing object URL here.
 */
export function isCleanPublicHttpsUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function currentParticipationDisclosure(track: ProvenancePlayerManifestTrackSource): string | undefined {
  const axes = [
    ["Music", track.participationMusic],
    ["Lyrics", track.participationLyrics],
    ["Voice", track.participationVoice],
  ].filter((axis): axis is [string, string] => Boolean(axis[1]?.trim()));

  if (axes.length === 0) return undefined;
  return `Current participation declaration: ${axes.map(([label, value]) => `${label} — ${value}`).join("; ")}.`;
}

function creatorLabel(track: ProvenancePlayerManifestTrackSource): string {
  const handle = track.creator.artistHandle?.trim();
  if (handle) return handle.startsWith("@") ? handle : `@${handle}`;

  const name = track.creator.name?.trim();
  if (name) return name;

  return unavailable();
}

function validateTrack(track: ProvenancePlayerManifestTrackSource): void {
  if (
    track.contentType !== "audio"
    || track.status !== "Published"
    || !track.isPublic
    || track.isFlagged
    || !track.witnessId?.trim()
    || !isCleanPublicHttpsUrl(track.fileUrl)
    || !track.externalDisplayEnabled
    || !track.externalDisplayRightsConfirmed
    || !track.externalDisplayAuthorizedAt
    || track.externalDisplayRevokedAt !== null
    || track.downloadPermission !== "free"
  ) {
    unavailable();
  }
}

function serializeAndAssertSize(manifest: ProvenancePlayerManifest): ProvenancePlayerManifest {
  const byteLength = Buffer.byteLength(JSON.stringify(manifest), "utf8");
  if (byteLength > MAX_PROVENANCE_PLAYER_MANIFEST_BYTES) unavailable();
  return manifest;
}

/**
 * Builds the exact adapter object accepted by Provenance Player. The caller owns
 * ordering; this pure function preserves it verbatim and never writes registry,
 * media, playlist, album, or player state.
 */
export function buildProvenancePlayerManifest(input: {
  tracks: readonly ProvenancePlayerManifestTrackSource[];
  album?: string | null;
  fallbackArtworkUrl?: string | null;
}): ProvenancePlayerManifest {
  if (input.tracks.length === 0 || input.tracks.length > MAX_PROVENANCE_PLAYER_MANIFEST_TRACKS) {
    unavailable();
  }

  const album = input.album?.trim() || undefined;
  const fallbackArtworkUrl = isCleanPublicHttpsUrl(input.fallbackArtworkUrl)
    ? input.fallbackArtworkUrl
    : undefined;

  const tracks = input.tracks.map((track) => {
    validateTrack(track);
    const wid = track.witnessId!.trim();
    const artworkUrl = isCleanPublicHttpsUrl(track.coverArtUrl)
      ? track.coverArtUrl
      : fallbackArtworkUrl;
    const aiDisclosure = currentParticipationDisclosure(track);

    return {
      title: track.title,
      creator: creatorLabel(track),
      ...(album ? { album } : {}),
      ...(artworkUrl ? { artworkUrl } : {}),
      sourceUrl: `https://www.livingnexus.org/share/${encodeURIComponent(wid)}`,
      audioUrl: `https://www.livingnexus.org/api/provenance-player/media/${track.id}`,
      workId: String(track.id),
      wid,
      ...(aiDisclosure ? { aiDisclosure } : {}),
    } satisfies ProvenancePlayerManifestTrack;
  });

  return serializeAndAssertSize({
    schema: PROVENANCE_PLAYER_MANIFEST_SCHEMA,
    tracks,
  });
}
