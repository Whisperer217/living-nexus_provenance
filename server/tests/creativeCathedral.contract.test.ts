import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  cathedralEvidencePacketSchema,
  cathedralContextManifestSchema,
  cathedralDraftSnapshotSchema,
  cathedralSuggestionPatchSchema,
  normalizeCathedralDraftSnapshot,
} from "../../shared/creativeCathedral";
import { normalizeWorkMetadataSuggestion } from "../services/workMetadataSuggestion";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Creative Cathedral Slice 1 contracts", () => {
  it("accepts only the bounded editorial suggestion fields", () => {
    expect(cathedralSuggestionPatchSchema.parse({
      title: "A creator-controlled title",
      genre: "Other",
      bpm: 88,
      keySignature: "D minor",
      moodTags: ["reflective", "resolute"],
      caption: "A concise creator-facing line.",
      originalReleaseDate: "2024-06-12",
      participationMusic: "Both",
    })).toMatchObject({ genre: "Other", bpm: 88 });

    expect(() => cathedralSuggestionPatchSchema.parse({ wid: "WID-MUS-FAKE" })).toThrow();
    expect(() => cathedralSuggestionPatchSchema.parse({ status: "Published" })).toThrow();
    expect(() => cathedralSuggestionPatchSchema.parse({ publicationDate: "2026-09-03" })).toThrow();
    expect(() => cathedralSuggestionPatchSchema.parse({ contributorName: "Invented person" })).toThrow();
  });

  it("persists only the allowlisted private draft snapshot", () => {
    expect(cathedralDraftSnapshotSchema.parse({
      title: "Draft",
      genre: "Other",
      bpm: "88",
      keySignature: "Dm",
      moodTags: ["reflective"],
      caption: "Private working state",
    })).toEqual({
      title: "Draft",
      genre: "Other",
      bpm: "88",
      keySignature: "Dm",
      moodTags: ["reflective"],
      caption: "Private working state",
      creationDate: "",
      originalReleaseDate: "",
      participationMusic: "Human",
      participationLyrics: "Human",
      participationVoice: "Human",
    });
    expect(() => cathedralDraftSnapshotSchema.parse({ title: "Draft", signature: "secret" })).toThrow();
    expect(normalizeCathedralDraftSnapshot({ genre: "x".repeat(500) }).genre).toBe("");
  });

  it("accepts only a bounded, creator-approved media evidence packet", () => {
    const packet = cathedralEvidencePacketSchema.parse({
      version: 1,
      audio: {
        fileName: "SUPERCHARGE ME.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 1_024,
        durationSeconds: 204,
        codec: "MPEG 1 Layer 3",
        title: "SUPERCHARGE ME",
        genres: ["Christian & Gospel"],
        comments: [],
        productionHints: ["AI-assisted instrumentation; human lyrics and voice"],
        embeddedArtwork: { present: true, format: "image/jpeg", sizeBytes: 4096 },
      },
      attachedVisual: { present: true, source: "embedded" },
      currentForm: {
        title: "",
        genre: "",
        bpm: "",
        keySignature: "",
        moodTags: [],
        caption: "",
        creationDate: "",
        originalReleaseDate: "",
        participationMusic: "Human",
        participationLyrics: "Human",
        participationVoice: "Human",
      },
    });
    expect(packet.audio.title).toBe("SUPERCHARGE ME");
    expect(() => cathedralEvidencePacketSchema.parse({ ...packet, accountToken: "secret" })).toThrow();
  });

  it("loads the browser Buffer polyfill before inspecting embedded audio metadata", () => {
    const audio = read("shared/loopRegistration.ts");
    const register = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    expect(audio.indexOf('import("buffer/")')).toBeGreaterThan(-1);
    expect(audio.indexOf('import("buffer/")')).toBeLessThan(audio.indexOf('import("music-metadata-browser")'));
    expect(audio).toContain('Reflect.set(globalThis, "Buffer", BrowserBuffer)');
    expect(register).toContain('id="music-register-audio-file"');
    expect(register).toContain('aria-label="Choose canonical audio file"');
  });

  it("does not invent a month or day from year-only embedded date evidence", () => {
    const audio = read("shared/loopRegistration.ts");
    expect(audio).not.toContain('`${year}-01-01`');
    expect(audio).toContain('/^\\d{4}-\\d{2}-\\d{2}$/.test(candidate) ? candidate : undefined');
  });

  it("normalizes oversized model text and drops unsupported chronology or participation claims", () => {
    const packet = cathedralEvidencePacketSchema.parse({
      version: 1,
      audio: {
        fileName: "work.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 1024,
        genres: ["Other"],
        comments: [],
        productionHints: [],
      },
      attachedVisual: { present: false, source: "none" },
      currentForm: {
        title: "",
        genre: "",
        bpm: "",
        keySignature: "",
        moodTags: [],
        caption: "",
        creationDate: "",
        originalReleaseDate: "",
        participationMusic: "Human",
        participationLyrics: "Human",
        participationVoice: "Human",
      },
    });
    const result = normalizeWorkMetadataSuggestion({
      summary: "x".repeat(900),
      patch: { genre: "Other", creationDate: "2024-01-01", participationMusic: "AI" },
      evidence: [
        { field: "genre", note: "Embedded genre tag", confidence: "high" },
        { field: "creationDate", note: "Guessed from file", confidence: "low" },
        { field: "participationMusic", note: "No evidence", confidence: "low" },
      ],
      cautions: ["c".repeat(800)],
    }, packet);
    expect(result.summary).toBe("The review returned non-binding proposals for: genres. Select only the fields you want to copy into the local form.");
    expect(result.summary).not.toMatch(/participation|Creation Date/);
    expect(result.cautions[0]).toHaveLength(280);
    expect(result.patch).toEqual({ genre: "Other" });
    expect(result.evidence).toEqual([{ field: "genre", note: "Embedded genre tag", confidence: "high" }]);
  });

  it("keeps Participation proposals only for the specifically evidenced axis", () => {
    const packet = cathedralEvidencePacketSchema.parse({
      version: 1,
      audio: {
        fileName: "work.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 1024,
        genres: [],
        comments: [],
        productionHints: ["AI-assisted instrumentation"],
      },
      attachedVisual: { present: false, source: "none" },
      currentForm: {
        title: "",
        genre: "",
        bpm: "",
        keySignature: "",
        moodTags: [],
        caption: "",
        creationDate: "",
        originalReleaseDate: "",
        participationMusic: "Human",
        participationLyrics: "Human",
        participationVoice: "Human",
      },
    });
    const result = normalizeWorkMetadataSuggestion({
      summary: "Model attempted all participation fields.",
      patch: {
        participationMusic: "Both",
        participationLyrics: "AI",
        participationVoice: "AI",
      },
      evidence: [
        { field: "participationMusic", note: "AI-assisted instrumentation", confidence: "high" },
        { field: "participationLyrics", note: "Unsupported", confidence: "low" },
        { field: "participationVoice", note: "Unsupported", confidence: "low" },
      ],
      cautions: [],
    }, packet);
    expect(result.patch).toEqual({ participationMusic: "Both" });
    expect(result.evidence).toEqual([
      { field: "participationMusic", note: "AI-assisted instrumentation", confidence: "high" },
    ]);
    expect(result.summary).toContain("music participation");
    expect(result.summary).not.toMatch(/lyrics participation|voice participation/);
  });

  it("requires a creator-consented, purpose-limited context manifest", () => {
    expect(cathedralContextManifestSchema.parse({
      version: 1,
      sessionId: "session-1",
      sources: [{ kind: "filename", label: "Audio filename: work.wav" }],
      permittedPurposes: ["media_fact_review"],
      consentedAt: new Date().toISOString(),
    }).permittedPurposes).toEqual(["media_fact_review"]);
    expect(() => cathedralContextManifestSchema.parse({
      version: 1,
      sessionId: "session-1",
      sources: [{ kind: "filename", label: "Audio filename: work.wav" }],
      permittedPurposes: ["publish"],
      consentedAt: new Date().toISOString(),
    })).toThrow();
  });

  it("keeps every Cathedral procedure protected and owner-scoped", () => {
    const router = read("server/routers/cathedral.ts");
    const db = read("server/db/creativeCathedral.ts");
    expect(router).not.toContain("publicProcedure");
    expect(router.match(/protectedProcedure/g)?.length).toBeGreaterThanOrEqual(8);
    expect(db).toContain("eq(creativeCathedralSessions.creatorId, creatorId)");
    expect(db).toContain("eq(creativeCathedralSuggestions.creatorId, input.creatorId)");
    expect(db).toContain("eq(creativeCathedralDecisions.creatorId, creatorId)");
  });

  it("cannot import Work, WID, publication, or provenance writers", () => {
    const router = read("server/routers/cathedral.ts");
    const db = read("server/db/creativeCathedral.ts");
    const combined = `${router}\n${db}`;
    expect(combined).not.toMatch(/songs\.upload|updateSongMetadata|generateWID|workEvents|setSongPublicationStatus|publishSong/);
  });

  it("uses the approved bounded model and structured output without tools", () => {
    const service = read("server/services/workMetadataSuggestion.ts");
    expect(service).toContain('const MODEL_ID = "gpt-5-mini"');
    expect(service).toContain('type: "json_schema"');
    expect(service).not.toContain("tools:");
    expect(service).toContain("Never invent provenance");
  });

  it("keeps Cathedral state out of WID and upload serialization", () => {
    const prepared = read("shared/preparedWorkRegistration.ts");
    expect(prepared).not.toMatch(/creativeCathedral|cathedralSession|suggestionId/);
  });

  it("creates additive private tables without altering authoritative records", () => {
    const migration = read("drizzle/migrations/0135_add_creative_cathedral_workspace.sql");
    expect(migration).toContain("creative_cathedral_sessions");
    expect(migration).toContain("creative_cathedral_suggestions");
    expect(migration).toContain("creative_cathedral_decisions");
    expect(migration).not.toMatch(/ALTER TABLE `?(songs|wids|workEvents|work_events)`?/i);
    expect(migration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
  });

  it("applies suggestions to local Music Register setters only", () => {
    const register = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const workspace = read("client/src/components/creative-cathedral/CreativeCathedralWorkspace.tsx");
    const card = read("client/src/components/creative-cathedral/CathedralSuggestionCard.tsx");
    expect(register).toContain("applyCathedralPatch");
    expect(register).toContain("setTitle(patch.title)");
    expect(workspace).toContain("onApplyPatch(result.patch)");
    expect(card).toContain("Apply selected");
    expect(card).toContain("selectedFields");
    expect(workspace).not.toMatch(/songs\.upload|generateWID|handlePublish|workEvents/);
  });

  it("requires the creator to select every proposed field explicitly", () => {
    const card = read("client/src/components/creative-cathedral/CathedralSuggestionCard.tsx");
    expect(card).toContain("useState<SuggestionField[]>([])");
    expect(card).toContain("disabled={busy || selectedFields.length === 0}");
    expect(card).not.toMatch(/useState<SuggestionField\[\]>\(\(\) => fields/);
  });
});
