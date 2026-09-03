import { z } from "zod";

export const cathedralStageSchema = z.enum(["prepare", "review", "registered", "published"]);

export const cathedralDraftSnapshotSchema = z.object({
  title: z.string().trim().max(200).default(""),
  genre: z.string().trim().max(160).default(""),
  bpm: z.string().trim().max(4).default(""),
  keySignature: z.string().trim().max(32).default(""),
  moodTags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  caption: z.string().trim().max(280).default(""),
  creationDate: z.string().trim().max(10).default(""),
  originalReleaseDate: z.string().trim().max(10).default(""),
  participationMusic: z.enum(["Human", "AI", "Both"]).default("Human"),
  participationLyrics: z.enum(["Human", "AI", "Both"]).default("Human"),
  participationVoice: z.enum(["Human", "AI", "Both"]).default("Human"),
}).strict();

export type CathedralDraftSnapshot = z.infer<typeof cathedralDraftSnapshotSchema>;

export function normalizeCathedralDraftSnapshot(input: Partial<CathedralDraftSnapshot>): CathedralDraftSnapshot {
  const text = (value: unknown, max: number) => {
    const normalized = String(value ?? "").trim();
    return normalized.length <= max ? normalized : "";
  };
  return cathedralDraftSnapshotSchema.parse({
    title: text(input.title, 200),
    genre: text(input.genre, 160),
    bpm: text(input.bpm, 4),
    keySignature: text(input.keySignature, 32),
    moodTags: Array.isArray(input.moodTags)
      ? input.moodTags.map((value) => text(value, 40)).filter(Boolean).slice(0, 8)
      : [],
    caption: text(input.caption, 280),
    creationDate: text(input.creationDate, 10),
    originalReleaseDate: text(input.originalReleaseDate, 10),
    participationMusic: input.participationMusic ?? "Human",
    participationLyrics: input.participationLyrics ?? "Human",
    participationVoice: input.participationVoice ?? "Human",
  });
}

export const cathedralSuggestionPatchSchema = z.object({
  title: z.string().trim().max(200).optional(),
  genre: z.string().trim().max(160).optional(),
  bpm: z.number().int().min(1).max(400).nullable().optional(),
  keySignature: z.string().trim().max(32).nullable().optional(),
  moodTags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  caption: z.string().trim().max(280).optional(),
  creationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  originalReleaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  participationMusic: z.enum(["Human", "AI", "Both"]).optional(),
  participationLyrics: z.enum(["Human", "AI", "Both"]).optional(),
  participationVoice: z.enum(["Human", "AI", "Both"]).optional(),
}).strict();

export type CathedralSuggestionPatch = z.infer<typeof cathedralSuggestionPatchSchema>;

export const cathedralContextSourceSchema = z.object({
  kind: z.enum(["filename", "embedded_metadata", "technical_audio", "embedded_artwork", "creator_text"]),
  label: z.string().trim().min(1).max(160),
  digest: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
}).strict();

export const cathedralContextManifestSchema = z.object({
  version: z.literal(1),
  sessionId: z.string().min(1).max(64),
  sources: z.array(cathedralContextSourceSchema).min(1).max(12),
  permittedPurposes: z.tuple([z.literal("media_fact_review")]),
  consentedAt: z.string().datetime(),
}).strict();

export type CathedralContextManifest = z.infer<typeof cathedralContextManifestSchema>;

export const cathedralAudioEvidenceSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(120).default("application/octet-stream"),
  sizeBytes: z.number().int().min(0).max(2_000_000_000),
  lastModified: z.string().datetime().optional(),
  durationSeconds: z.number().min(0).max(86_400).optional(),
  bitrateKbps: z.number().int().min(0).max(10_000).optional(),
  sampleRateHz: z.number().int().min(0).max(768_000).optional(),
  bitsPerSample: z.number().int().min(0).max(64).optional(),
  channels: z.number().int().min(0).max(64).optional(),
  codec: z.string().trim().max(80).optional(),
  title: z.string().trim().max(200).optional(),
  artist: z.string().trim().max(200).optional(),
  album: z.string().trim().max(200).optional(),
  genres: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  bpm: z.number().int().min(1).max(400).optional(),
  keySignature: z.string().trim().max(32).optional(),
  originalReleaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isrc: z.string().trim().max(32).optional(),
  lyricsExcerpt: z.string().trim().max(1600).optional(),
  comments: z.array(z.string().trim().min(1).max(280)).max(8).default([]),
  productionHints: z.array(z.string().trim().min(1).max(280)).max(8).default([]),
  embeddedArtwork: z.object({
    present: z.literal(true),
    format: z.string().trim().max(80),
    sizeBytes: z.number().int().min(0).max(100_000_000),
  }).strict().optional(),
}).strict();

export const cathedralEvidencePacketSchema = z.object({
  version: z.literal(1),
  audio: cathedralAudioEvidenceSchema,
  attachedVisual: z.object({
    present: z.boolean(),
    source: z.enum(["embedded", "uploaded", "generated", "remixed", "none"]),
    prompt: z.string().trim().max(600).optional(),
  }).strict(),
  currentForm: cathedralDraftSnapshotSchema,
}).strict();

export type CathedralEvidencePacket = z.infer<typeof cathedralEvidencePacketSchema>;

export const cathedralSuggestionFieldSchema = z.enum([
  "title", "genre", "bpm", "keySignature", "moodTags", "caption",
  "creationDate", "originalReleaseDate",
  "participationMusic", "participationLyrics", "participationVoice",
]);

export const cathedralSuggestionResultSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  patch: cathedralSuggestionPatchSchema,
  evidence: z.array(z.object({
    field: cathedralSuggestionFieldSchema,
    note: z.string().trim().min(1).max(400),
    confidence: z.enum(["high", "medium", "low"]),
  }).strict()).max(12),
  cautions: z.array(z.string().trim().min(1).max(280)).max(8),
}).strict();

export type CathedralSuggestionResult = z.infer<typeof cathedralSuggestionResultSchema>;
