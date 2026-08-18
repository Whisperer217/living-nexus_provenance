import { describe, expect, it } from "vitest";
import {
  buildPreparedWorkUploadPayload,
  createPreparedWorkRegistration,
  derivePreparedWorkTone,
  PREPARED_WORK_FIELD_CLASSIFICATION,
  serializePreparedWorkWidPayload,
} from "@shared/preparedWorkRegistration";
import {
  harmonicSignatureFromAccents,
  participationToAiDisclosure,
} from "@shared/loopRegistration";

const participation = { music: "Human", lyrics: "Both", voice: "AI" } as const;

function createPrepared() {
  return createPreparedWorkRegistration({
    audioFile: { name: "canonical.wav" },
    coverFile: { name: "cover.png" },
    coverRemoteUrl: null,
    visualSource: "uploaded" as const,
    visualPrompt: "weathered gold at dusk",
    visualLineage: [{ prompt: "weathered gold", url: "https://example.test/cover.webp", at: "2026-08-18T00:00:00.000Z" }],
    title: "Testimony of the Road",
    genre: "Ambient",
    bpm: "92",
    keySignature: "D minor",
    lyrics: "I carried the night.",
    moodTags: ["solemn", "resolute"],
    caption: "A field note.",
    originStory: "Written after return.",
    aiConsent: "prohibited" as const,
    participation,
    publishIntent: "Draft" as const,
    durationSeconds: 212,
  });
}

describe("PreparedWorkRegistration", () => {
  it("preserves the existing WID payload serialization byte-for-byte", () => {
    const prepared = createPrepared();
    const tone = derivePreparedWorkTone(prepared);
    const timestamp = "2026-08-18T00:00:00.000Z";
    const payload = serializePreparedWorkWidPayload({
      fileHash: "a".repeat(64),
      title: prepared.metadata.title,
      participation: prepared.metadata.participation,
      toneLabel: tone.label,
      timestamp,
    });

    expect(payload).toBe(
      JSON.stringify({
        fileHash: "a".repeat(64),
        title: "Testimony of the Road",
        participation,
        toneLabel: tone.label,
        timestamp,
      })
    );
  });

  it("recreates the existing Draft upload payload byte-for-byte by field and key order", () => {
    const prepared = createPrepared();
    const tone = derivePreparedWorkTone(prepared);
    const payload = buildPreparedWorkUploadPayload(prepared, {
      fileUrl: "https://example.test/audio.wav",
      fileKey: "audio/1/testimony.wav",
      coverArtUrl: "https://example.test/cover.webp",
      fileHash: "b".repeat(64),
      witnessId: "WID-MUS-TESTIMON-YOFTHERO",
      publicKeyJWK: "{\"kty\":\"EC\"}",
      signature: "signature",
      tone,
      waveformUrl: "https://example.test/waveform.png",
      waveformKey: "covers/1/waveform.png",
      visualSource: "uploaded",
    });

    const existingPayload = {
      fileUrl: "https://example.test/audio.wav",
      fileKey: "audio/1/testimony.wav",
      coverArtUrl: "https://example.test/cover.webp",
      title: "Testimony of the Road",
      genre: "Ambient",
      bpm: 92,
      keySignature: "D minor",
      aiConsent: "prohibited" as const,
      ownershipStatus: "full" as const,
      moodTags: ["solemn", "resolute"],
      caption: "A field note.",
      contentType: "audio" as const,
      fileHash: "b".repeat(64),
      witnessId: "WID-MUS-TESTIMON-YOFTHERO",
      harmonicSignature: harmonicSignatureFromAccents(tone.accents),
      ecdsaPublicKey: "{\"kty\":\"EC\"}",
      ecdsaSignature: "signature",
      aiDisclosure: participationToAiDisclosure(participation),
      lyricsText: "I carried the night.",
      haaiOriginStory: "Written after return.",
      haaiEmotionalTone: "solemn, resolute",
      durationSeconds: 212,
      status: "Draft" as const,
      participationMusic: "Human" as const,
      participationLyrics: "Both" as const,
      participationVoice: "AI" as const,
      toneProfileJson: JSON.stringify(tone),
      waveformUrl: "https://example.test/waveform.png",
      waveformKey: "covers/1/waveform.png",
      visualSource: "uploaded" as const,
      visualPrompt: "weathered gold at dusk",
      visualLineageJson: JSON.stringify([
        { prompt: "weathered gold", url: "https://example.test/cover.webp", at: "2026-08-18T00:00:00.000Z" },
      ]),
    };

    expect(payload).toEqual(existingPayload);
    expect(JSON.stringify(payload)).toBe(JSON.stringify(existingPayload));
    expect(payload).toMatchObject({
      title: "Testimony of the Road",
      status: "Draft",
      witnessId: "WID-MUS-TESTIMON-YOFTHERO",
    });
    expect(Object.keys(payload)).toEqual([
      "fileUrl", "fileKey", "coverArtUrl", "title", "genre", "bpm", "keySignature",
      "aiConsent", "ownershipStatus", "moodTags", "caption", "contentType", "fileHash",
      "witnessId", "harmonicSignature", "ecdsaPublicKey", "ecdsaSignature", "aiDisclosure",
      "lyricsText", "haaiOriginStory", "haaiEmotionalTone", "durationSeconds", "status",
      "participationMusic", "participationLyrics", "participationVoice", "toneProfileJson",
      "waveformUrl", "waveformKey", "visualSource", "visualPrompt", "visualLineageJson",
    ]);
  });

  it("keeps Draft and Published intent as existing informational values", () => {
    const draft = createPrepared();
    const published = createPreparedWorkRegistration({
      ...draft.assets,
      ...draft.metadata,
      publishIntent: "Published",
    });
    expect(draft.metadata.publishIntent).toBe("Draft");
    expect(published.metadata.publishIntent).toBe("Published");
  });

  it("exposes informational field classifications without enforcement", () => {
    const prepared = createPrepared();
    expect(prepared.fieldClassification).toBe(PREPARED_WORK_FIELD_CLASSIFICATION);
    expect(prepared.fieldClassification.widBound).toContain("title");
    expect(prepared.fieldClassification.editorial).toContain("lyrics");
    expect(prepared.fieldClassification.independentComponent).toContain("coverFile");
  });
});
