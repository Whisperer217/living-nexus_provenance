export type RokuSongRecord = {
  song: Record<string, any>;
  creator: Record<string, any> | null;
};

type RokuArtifact = {
  contentId: string;
  title: string;
  shortDescription: string;
  contentType: "audio";
  streamFormat: "mp3";
  hdPosterUrl: string | null;
  sdPosterUrl: string | null;
  streamUrl: string;
  detailUrl: string;
  creator: {
    id: number | null;
    name: string;
    handle: string | null;
    profileUrl: string | null;
  };
  provenance: {
    witnessId: string | null;
    verificationStatus: "verified" | "unverified";
    registeredAt: string | null;
    verificationUrl: string | null;
    webVerifyUrl: string | null;
    originStory: string | null;
  };
  metadata: {
    genre: string | null;
    durationSeconds: number | null;
    aiDisclosure: string | null;
  };
};

type RokuRow = {
  id: string;
  title: string;
  description: string;
  items: RokuArtifact[];
};

const MAX_ROWS = 3;
const MAX_ITEMS_PER_ROW = 12;
const MAX_ORIGIN_LENGTH = 480;

function asIso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function truncateOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.length > MAX_ORIGIN_LENGTH ? `${compact.slice(0, MAX_ORIGIN_LENGTH - 1).trimEnd()}…` : compact;
}

function absoluteUrl(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl}/`).toString();
}

function artifactFromRecord(record: RokuSongRecord, baseUrl: string): RokuArtifact {
  const { song, creator } = record;
  const witnessId = typeof song.witnessId === "string" && song.witnessId.trim() ? song.witnessId : null;
  const creatorHandle = typeof creator?.artistHandle === "string" && creator.artistHandle.trim()
    ? `@${creator.artistHandle.replace(/^@/, "")}`
    : null;
  const creatorName = creatorHandle ?? creator?.name ?? "Unknown creator";
  const genre = typeof song.genre === "string" && song.genre.trim() ? song.genre : null;
  const poster = typeof song.coverArtUrl === "string" && song.coverArtUrl.trim() ? song.coverArtUrl : null;

  return {
    contentId: `ln-song-${song.id}`,
    title: song.title ?? "Untitled manifestation",
    shortDescription: genre ? `${creatorName} · ${genre}` : creatorName,
    contentType: "audio",
    streamFormat: "mp3",
    hdPosterUrl: poster,
    sdPosterUrl: poster,
    streamUrl: absoluteUrl(baseUrl, `/api/v1/stream/${song.id}`),
    detailUrl: absoluteUrl(baseUrl, `/api/v1/track/${song.id}`),
    creator: {
      id: typeof creator?.id === "number" ? creator.id : null,
      name: creator?.name ?? creatorName,
      handle: creatorHandle,
      profileUrl: creator?.artistHandle
        ? absoluteUrl(baseUrl, `/creator/${creator.artistHandle.replace(/^@/, "")}`)
        : null,
    },
    provenance: {
      witnessId,
      verificationStatus: witnessId ? "verified" : "unverified",
      registeredAt: asIso(song.createdAt),
      verificationUrl: witnessId ? absoluteUrl(baseUrl, `/api/v1/wid/${encodeURIComponent(witnessId)}`) : null,
      webVerifyUrl: witnessId ? absoluteUrl(baseUrl, `/verify/${encodeURIComponent(witnessId)}`) : null,
      originStory: truncateOrigin(song.haaiOriginStory),
    },
    metadata: {
      genre,
      durationSeconds: typeof song.durationSeconds === "number" ? song.durationSeconds : null,
      aiDisclosure: typeof song.aiConsent === "string" ? song.aiConsent : null,
    },
  };
}

function toRow(id: string, title: string, description: string, records: RokuSongRecord[], baseUrl: string): RokuRow | null {
  const items = records
    .filter(record => typeof record.song.fileUrl === "string" && record.song.fileUrl.trim().length > 0)
    .slice(0, MAX_ITEMS_PER_ROW)
    .map(record => artifactFromRecord(record, baseUrl));

  return items.length > 0 ? { id, title, description, items } : null;
}

/**
 * Builds a compact, immutable Roku view of existing published audio work.
 * The function deliberately accepts already-authorized public records so it can
 * remain deterministic, easy to test, and independent of the database layer.
 */
export function buildRokuHome(records: RokuSongRecord[], baseUrl: string, generatedAt = new Date()): {
  schemaVersion: "1.0";
  generatedAt: string;
  platform: { name: string; tagline: string; websiteUrl: string };
  rows: RokuRow[];
} {
  const recent = records.filter(record => typeof record.song.fileUrl === "string" && record.song.fileUrl.trim().length > 0);
  const honored = [...recent].sort((left, right) => (right.song.playCount ?? 0) - (left.song.playCount ?? 0));
  const genreSeed = recent.find(record => typeof record.song.genre === "string" && record.song.genre.trim().length > 0);
  const genreName = genreSeed?.song.genre?.trim();
  const genreWorks = genreName
    ? recent.filter(record => record.song.genre?.trim().toLowerCase() === genreName.toLowerCase())
    : [];

  const candidates = [
    toRow("new-witnesses", "New Witnesses", "Recently published audio manifestations with verifiable origin.", recent, baseUrl),
    toRow("honored-works", "Honored Works", "Works receiving sustained listening within the Living Nexus archive.", honored, baseUrl),
    genreName ? toRow(`genre-${genreName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, genreName, `A focused gathering of ${genreName} manifestations.`, genreWorks, baseUrl) : null,
  ];

  return {
    schemaVersion: "1.0",
    generatedAt: generatedAt.toISOString(),
    platform: {
      name: "Living Nexus",
      tagline: "A living registry of human creative contribution.",
      websiteUrl: absoluteUrl(baseUrl, "/"),
    },
    rows: candidates.filter((row): row is RokuRow => row !== null).slice(0, MAX_ROWS),
  };
}
