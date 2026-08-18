import {
  deriveToneFromMetadata,
  harmonicSignatureFromAccents,
  participationToAiDisclosure,
  type LoopParticipation,
  type PublishIntent,
  type ToneProfile,
  type VisualSource,
} from "./loopRegistration";

/**
 * Informational only. These groups describe the current registration boundary;
 * they do not enforce resealing, revisioning, or publication behavior.
 */
export const PREPARED_WORK_FIELD_CLASSIFICATION = {
  /** Inputs that currently flow into the existing WID-MUS signature payload. */
  widBound: [
    "audioFile",
    "title",
    "participation",
    "genre",
    "bpm",
    "keySignature",
    "moodTags",
    "originStory",
    "caption",
    "toneLabel",
    "timestamp",
  ],
  /** Existing registration values outside the current WID-MUS signature payload. */
  editorial: ["lyrics", "aiConsent", "publishIntent", "durationSeconds"],
  /** Independently prepared media/manifestation components. */
  independentComponent: [
    "coverFile",
    "coverRemoteUrl",
    "waveform",
    "visualSource",
    "visualPrompt",
    "visualLineage",
  ],
} as const;

export interface PreparedWorkRegistrationInput<TAsset = unknown> {
  audioFile: TAsset | null;
  coverFile: TAsset | null;
  coverRemoteUrl: string | null;
  visualSource: VisualSource;
  visualPrompt: string;
  visualLineage: Array<{ prompt: string; url: string; at: string }>;
  title: string;
  genre: string;
  bpm: string;
  keySignature: string;
  lyrics: string;
  moodTags: string[];
  caption: string;
  originStory: string;
  aiConsent: "prohibited" | "permitted_attribution" | "permitted";
  participation: LoopParticipation;
  publishIntent: PublishIntent;
  durationSeconds?: number;
}

export interface PreparedWorkRegistration<TAsset = unknown> {
  assets: Pick<
    PreparedWorkRegistrationInput<TAsset>,
    "audioFile" | "coverFile" | "coverRemoteUrl"
  >;
  metadata: Omit<
    PreparedWorkRegistrationInput<TAsset>,
    "audioFile" | "coverFile" | "coverRemoteUrl"
  >;
  fieldClassification: typeof PREPARED_WORK_FIELD_CLASSIFICATION;
}

/**
 * Captures existing client preparation state without persistence or side effects.
 * Values intentionally remain unnormalized so existing MusicEnvironment behavior
 * and WID/upload contracts are preserved exactly.
 */
export function createPreparedWorkRegistration<TAsset = unknown>(
  input: PreparedWorkRegistrationInput<TAsset>
): PreparedWorkRegistration<TAsset> {
  const { audioFile, coverFile, coverRemoteUrl, ...metadata } = input;
  return {
    assets: { audioFile, coverFile, coverRemoteUrl },
    metadata,
    fieldClassification: PREPARED_WORK_FIELD_CLASSIFICATION,
  };
}

/** Mirrors the existing MusicEnvironment tone derivation inputs byte-for-byte. */
export function derivePreparedWorkTone(
  prepared: PreparedWorkRegistration
): ToneProfile {
  const { metadata } = prepared;
  return deriveToneFromMetadata({
    genre: metadata.genre || null,
    bpm: metadata.bpm ? parseInt(metadata.bpm, 10) : null,
    keySignature: metadata.keySignature || null,
    moods: metadata.moodTags,
    participation: metadata.participation,
    emotionalHint: metadata.originStory || metadata.caption || null,
    title: metadata.title,
  });
}

/**
 * Intentionally preserves the exact pre-Slice-2 JSON property order used by
 * MusicEnvironment.generateWID before ECDSA signing.
 */
export function serializePreparedWorkWidPayload(input: {
  fileHash: string;
  title: string;
  participation: LoopParticipation;
  toneLabel: string;
  timestamp: string;
}): string {
  return JSON.stringify({
    fileHash: input.fileHash,
    title: input.title,
    participation: input.participation,
    toneLabel: input.toneLabel,
    timestamp: input.timestamp,
  });
}

export interface PreparedWorkUploadContext {
  fileUrl: string;
  fileKey: string;
  coverArtUrl?: string;
  fileHash: string;
  witnessId: string;
  publicKeyJWK: string;
  signature: string;
  tone: ToneProfile;
  waveformUrl?: string;
  waveformKey?: string;
  visualSource: VisualSource;
}

/**
 * Recreates the existing MusicEnvironment songs.upload payload from the pure
 * preparation boundary plus already-uploaded asset and seal facts.
 */
export function buildPreparedWorkUploadPayload(
  prepared: PreparedWorkRegistration,
  context: PreparedWorkUploadContext
) {
  const { metadata } = prepared;
  return {
    fileUrl: context.fileUrl,
    fileKey: context.fileKey,
    coverArtUrl: context.coverArtUrl,
    title: metadata.title,
    genre: metadata.genre || undefined,
    bpm: metadata.bpm ? parseInt(metadata.bpm, 10) : undefined,
    keySignature: metadata.keySignature || undefined,
    aiConsent: metadata.aiConsent,
    ownershipStatus: "full" as const,
    moodTags: metadata.moodTags,
    caption: metadata.caption || undefined,
    contentType: "audio" as const,
    fileHash: context.fileHash,
    witnessId: context.witnessId,
    harmonicSignature: harmonicSignatureFromAccents(context.tone.accents),
    ecdsaPublicKey: context.publicKeyJWK,
    ecdsaSignature: context.signature,
    aiDisclosure: participationToAiDisclosure(metadata.participation),
    lyricsText: metadata.lyrics || undefined,
    haaiOriginStory: metadata.originStory || undefined,
    haaiEmotionalTone: metadata.moodTags.join(", ") || undefined,
    durationSeconds: metadata.durationSeconds,
    status: metadata.publishIntent,
    participationMusic: metadata.participation.music,
    participationLyrics: metadata.participation.lyrics,
    participationVoice: metadata.participation.voice,
    toneProfileJson: JSON.stringify(context.tone),
    waveformUrl: context.waveformUrl,
    waveformKey: context.waveformKey,
    visualSource: context.visualSource,
    visualPrompt: metadata.visualPrompt || undefined,
    visualLineageJson: metadata.visualLineage.length
      ? JSON.stringify(metadata.visualLineage)
      : undefined,
  };
}
