/**
 * Loop Registration — shared types & helpers
 * Authority: docs/LOOP_PRODUCT_SPEC.md
 */

export const PARTICIPATION_AXES = ["music", "lyrics", "voice"] as const;
export type ParticipationAxis = (typeof PARTICIPATION_AXES)[number];
export type ParticipationValue = "Human" | "AI" | "Both";

export const PARTICIPATION_VALUES: ParticipationValue[] = ["Human", "AI", "Both"];

export type VisualSource = "embedded" | "uploaded" | "generated" | "remixed" | "none";

export type PublishIntent = "Draft" | "Published";

export interface LoopParticipation {
  music: ParticipationValue;
  lyrics: ParticipationValue;
  voice: ParticipationValue;
}

export interface ToneProfile {
  version: 1;
  genre?: string | null;
  bpm?: number | null;
  keySignature?: string | null;
  moods?: string[];
  participation: LoopParticipation;
  emotionalHint?: string | null;
  /** Derived display label */
  label: string;
  /** Hex accents for UI atmosphere */
  accents: string[];
  sealedAt: string;
}

export function defaultParticipation(): LoopParticipation {
  return { music: "Human", lyrics: "Human", voice: "Human" };
}

/** Tone-from-metadata — stable identity from confirmed register fields */
export function deriveToneFromMetadata(input: {
  genre?: string | null;
  bpm?: number | null;
  keySignature?: string | null;
  moods?: string[] | null;
  participation: LoopParticipation;
  emotionalHint?: string | null;
  title?: string | null;
}): ToneProfile {
  const moods = input.moods?.filter(Boolean) ?? [];
  const parts: string[] = [];
  if (input.genre) parts.push(input.genre);
  if (input.keySignature) parts.push(`Key ${input.keySignature}`);
  if (input.bpm) parts.push(`${input.bpm} BPM`);
  if (moods.length) parts.push(moods.slice(0, 3).join(" · "));
  const collab =
    input.participation.music !== "Human" ||
    input.participation.lyrics !== "Human" ||
    input.participation.voice !== "Human";
  if (collab) parts.push("Mixed authorship");
  if (input.emotionalHint) parts.push(input.emotionalHint.slice(0, 48));

  const label = parts.length > 0 ? parts.join(" · ") : "Unspecified tone";

  // Deterministic accents from metadata string (not file hash)
  const seed = `${input.genre ?? ""}|${input.bpm ?? ""}|${input.keySignature ?? ""}|${moods.join(",")}|${input.participation.music}${input.participation.lyrics}${input.participation.voice}`;
  const accents = accentsFromSeed(seed);

  return {
    version: 1,
    genre: input.genre ?? null,
    bpm: input.bpm ?? null,
    keySignature: input.keySignature ?? null,
    moods,
    participation: input.participation,
    emotionalHint: input.emotionalHint ?? null,
    label,
    accents,
    sealedAt: new Date().toISOString(),
  };
}

/**
 * Convert a tone profile's decorative color accents into the numeric signature
 * expected by the registration contract. Older or partially restored profiles
 * may not contain all three strings; preserve the three-slot signature without
 * allowing a missing value to break a Draft or Publish submission.
 */
export function harmonicSignatureFromAccents(accents: unknown): number[] {
  const source = Array.isArray(accents) ? accents : [];
  return [0, 1, 2].map((index) => {
    const accent = typeof source[index] === "string" ? source[index] : "";
    const accentOffset = accent.length > 1 ? accent.charCodeAt(1) % 40 : 0;
    return 110 + index * 55 + accentOffset;
  });
}

function accentsFromSeed(seed: string): string[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const golds = ["#C49A28", "#D4A84B", "#E8B840", "#8B6914", "#F5CC5A"];
  const stones = ["#EDE5D0", "#D8C9A8", "#6B6555"];
  return [golds[h % golds.length], stones[(h >> 3) % stones.length], golds[(h >> 5) % golds.length]];
}

/** Map participation → legacy aiDisclosure for backward compatibility */
export function participationToAiDisclosure(
  p: LoopParticipation
): "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument" {
  const vals = [p.music, p.lyrics, p.voice];
  if (vals.every((v) => v === "Human")) return "original";
  if (vals.every((v) => v === "AI")) return "ai_generated";
  if (vals.some((v) => v === "Both") || vals.some((v) => v === "AI")) {
    return vals.filter((v) => v === "AI").length >= 2 ? "ai_generated" : "ai_assisted";
  }
  return "original";
}

/**
 * Build downloadable waveform PNG peaks from an audio File (client-side).
 * Returns a Blob PNG suitable for S3 upload.
 */
export async function buildWaveformPngFromAudio(file: File, width = 1200, height = 320): Promise<Blob> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const buf = await file.arrayBuffer();
    const audio = await ctx.decodeAudioData(buf.slice(0));
    const channel = audio.getChannelData(0);
    const samples = width;
    const block = Math.floor(channel.length / samples) || 1;
    const peaks: number[] = [];
    for (let i = 0; i < samples; i++) {
      let max = 0;
      const start = i * block;
      for (let j = 0; j < block && start + j < channel.length; j++) {
        const v = Math.abs(channel[start + j]);
        if (v > max) max = v;
      }
      peaks.push(max);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#000000";
    g.fillRect(0, 0, width, height);
    const mid = height / 2;
    g.strokeStyle = "#C49A28";
    g.lineWidth = 1;
    for (let x = 0; x < samples; x++) {
      const amp = peaks[x] * (mid - 8);
      g.beginPath();
      g.moveTo(x, mid - amp);
      g.lineTo(x, mid + amp);
      g.stroke();
    }
    g.fillStyle = "rgba(196,154,40,0.85)";
    g.font = "12px monospace";
    g.fillText("LOOP WAVEFORM", 16, 24);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("waveform png failed"))), "image/png");
    });
    return blob;
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

/** Try to pull embedded cover art from audio metadata (browser) */
export async function extractEmbeddedCover(file: File): Promise<File | null> {
  try {
    const { parseBlob } = await import("music-metadata-browser");
    const meta = await parseBlob(file);
    const pic = meta.common.picture?.[0];
    if (!pic?.data) return null;
    const mime = pic.format || "image/jpeg";
    const ext = mime.includes("png") ? "png" : "jpg";
    const bytes = pic.data instanceof Uint8Array
      ? new Uint8Array(pic.data)
      : new Uint8Array(pic.data as ArrayBuffer);
    return new File([bytes.buffer], `embedded-cover.${ext}`, { type: mime });
  } catch {
    return null;
  }
}

/** Assist: pull BPM/key/title/genre/lyrics from file when present */
export async function assistAudioMetadata(file: File): Promise<{
  title?: string;
  genre?: string;
  bpm?: number;
  keySignature?: string;
  lyrics?: string;
  durationSeconds?: number;
}> {
  const out: {
    title?: string;
    genre?: string;
    bpm?: number;
    keySignature?: string;
    lyrics?: string;
    durationSeconds?: number;
  } = {};
  try {
    const { parseBlob } = await import("music-metadata-browser");
    const meta = await parseBlob(file);
    if (meta.common.title) out.title = meta.common.title;
    if (meta.common.genre?.[0]) out.genre = meta.common.genre[0];
    if (meta.common.bpm) out.bpm = Math.round(Number(meta.common.bpm));
    const key =
      (meta.common as any).key ||
      meta.native?.["ID3v2.4"]?.find((t: any) => t.id === "TKEY")?.value ||
      meta.native?.["ID3v2.3"]?.find((t: any) => t.id === "TKEY")?.value;
    if (key && typeof key === "string") out.keySignature = key;
    const lyricEntry = meta.common.lyrics?.[0];
    const lyrics =
      typeof lyricEntry === "string"
        ? lyricEntry
        : lyricEntry && typeof (lyricEntry as any).text === "string"
          ? (lyricEntry as any).text
          : undefined;
    if (lyrics) out.lyrics = lyrics;
    if (meta.format.duration) out.durationSeconds = meta.format.duration;
  } catch {
    /* ignore */
  }
  return out;
}

export function isWitnessReadyProfile(profile: {
  artistHandle?: string | null;
  name?: string | null;
  bio?: string | null;
  originStatement?: string | null;
  profilePhotoUrl?: string | null;
  testimonyCount?: number;
}): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!profile.artistHandle && !profile.name) missing.push("who (name or handle)");
  if (!profile.bio && !profile.originStatement) missing.push("why (bio or origin / testimony statement)");
  if (!profile.profilePhotoUrl) missing.push("presence (profile photo)");
  if ((profile.testimonyCount ?? 0) < 1) missing.push("testimony");
  return { ready: missing.length === 0, missing };
}
