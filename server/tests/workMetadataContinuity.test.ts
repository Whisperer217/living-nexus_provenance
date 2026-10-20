import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { applySuggestedWorkGenres, getSuggestedWorkGenres, parseWorkGenres, serializeWorkGenres, toggleWorkGenre } from "@shared/workMetadata";
import { formatHistoricalDateValue, parseHistoricalDate, validateHistoricalDates } from "@shared/workHistoricalDates";
import { buildParticipationCorrectionEventData, declarationsMatch } from "@shared/participationDeclaration";

const root = resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("Work metadata continuity", () => {
  it("preserves Other as a selected Work genre alongside other genres", () => {
    const withOther = toggleWorkGenre("Gospel / Worship", "Other");
    expect(withOther).toBe("Gospel / Worship, Other");
    expect(parseWorkGenres(withOther)).toEqual(["Gospel / Worship", "Other"]);
    expect(serializeWorkGenres(["Other", "Other", "Experimental"])).toBe("Other, Experimental");
  });

  it("keeps creator historical dates distinct from immutable system timestamps in the schema", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('creatorReleaseDate: varchar("creatorReleaseDate", { length: 32 })');
    expect(schema).toContain('createdAt: timestamp("createdAt").defaultNow().notNull()');
    expect(schema).toContain('updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()');
  });

  it("accepts only creator historical dates in the metadata mutation and records genuine changes append-only", () => {
    const router = read("server/routers/songs.ts");
    const updateMetadata = router.slice(router.indexOf("updateMetadata: protectedProcedure"), router.indexOf("// Legacy play counter"));
    expect(updateMetadata).toContain("releaseDate: z.string().nullable().optional()");
    expect(updateMetadata).toContain("creatorReleaseDate: z.string().nullable().optional()");
    expect(updateMetadata).not.toContain("createdAt:");
    expect(updateMetadata).not.toContain("publishedAt:");
    expect(updateMetadata).not.toContain("witnessId: z.");
    expect(updateMetadata).toContain('eventType: "creator_historical_dates_revised"');
    expect(updateMetadata).toContain("current !== undefined && current !== previous");
    expect(updateMetadata).toContain("isSystemEvent: false");
  });

  it("passes historical dates through upload and renders each persisted Other genre on the public Work surface", () => {
    const router = read("server/routers/songs.ts");
    const activeDb = read("server/utils/db.ts");
    const musicEnvironment = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const publicWork = read("client/src/pages/loop/LoopWorkPage.tsx");

    expect(router).toContain("creatorReleaseDate: z.string().optional()");
    expect(router).toContain("creatorReleaseDate: input.creatorReleaseDate");
    expect(router).toContain("originalReleaseDate: input.creatorReleaseDate");
    expect(router).toContain("creditsJson: input.creditsJson");
    expect(activeDb).toContain("creatorReleaseDate?: string");
    expect(activeDb).toContain("officialArtistName?: string");
    expect(activeDb).toContain("creditsJson?: string");
    expect(musicEnvironment).toContain("releaseDate: creationDate");
    expect(musicEnvironment).toContain("creatorReleaseDate,");
    expect(router).toContain("const historicalDateError = validateHistoricalDates({");
    expect(musicEnvironment).toContain("toggleWorkGenre");
    expect(publicWork).toContain("parseWorkGenres(song.genre)");
    expect(publicWork).toContain("Released {(song as any).creatorReleaseDate}");
  });

  it("starts a new Work classification cleanly and treats profile genres as optional suggestions", () => {
    const musicEnvironment = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const creativeDrawer = read("client/src/components/CreativeDrawer.tsx");
    const editChapel = read("client/src/components/EditChapel.tsx");

    expect(getSuggestedWorkGenres("Pop, Faith", "")).toEqual(["Pop", "Faith"]);
    expect(getSuggestedWorkGenres("Pop, Faith", "Pop")).toEqual(["Faith"]);
    expect(getSuggestedWorkGenres("Pop, Faith", "Gospel, Pop")).toEqual(["Faith"]);
    expect(musicEnvironment).toContain('const [genre, setGenre] = useState(keeperPrefill?.genre ?? "")');
    expect(musicEnvironment).toContain("const creatorGenreSuggestions = useMemo(");
    expect(musicEnvironment).toContain("getSuggestedWorkGenres(creatorProfile?.primaryGenre, genre)");
    expect(musicEnvironment).toContain("Genre suggestions from your profile");
    expect(musicEnvironment).toContain("optional suggestions. Select only what describes this Work.");
    expect(musicEnvironment).not.toContain("if (creatorProfile?.primaryGenre && !genre) setGenre(creatorProfile.primaryGenre)");
    expect(creativeDrawer).toContain('useState(song.genre ?? "")');
    expect(editChapel).toContain('useState(song.genre ?? "")');
  });

  it("lets a creator clear only the current Work genre selection and return to optional profile suggestions", () => {
    const musicEnvironment = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const creativeDrawer = read("client/src/components/CreativeDrawer.tsx");
    const editChapel = read("client/src/components/EditChapel.tsx");

    expect(applySuggestedWorkGenres("Pop, Faith", "Alternative")).toBe("Alternative, Pop, Faith");
    expect(applySuggestedWorkGenres("Pop, Faith", "Pop")).toBe("Pop, Faith");
    expect(musicEnvironment).toContain("Selected for this Work");
    expect(musicEnvironment).toContain("Clear All");
    expect(musicEnvironment).toContain("clearWorkGenres");
    expect(musicEnvironment).toContain("window.confirm(\"Clear all selected genres for this Work?");
    expect(musicEnvironment).toContain("if (!window.confirm(\"Clear all selected genres for this Work?");
    expect(musicEnvironment).toContain("setClearingGenres(true);");
    expect(musicEnvironment).toContain("window.setTimeout(() => {");
    expect(musicEnvironment).toContain("work-genre-selection-clearing");
    expect(musicEnvironment).toContain("Select All Suggested");
    expect(musicEnvironment).toContain("applySuggestedWorkGenres(creatorProfile?.primaryGenre, genre)");
    expect(musicEnvironment).toContain('aria-label="Clear all selected genres for this Work"');
    expect(musicEnvironment).toContain("Genre suggestions from your profile");
    expect(creativeDrawer).toContain("Clear All");
    expect(creativeDrawer).toContain("clearWorkGenres");
    expect(creativeDrawer).toContain("if (!window.confirm(\"Clear all selected genres for this Work?");
    expect(creativeDrawer).toContain("setClearingGenres(true);");
    expect(creativeDrawer).toContain("work-genre-selection-clearing");
    expect(editChapel).toContain("Clear All");
    expect(editChapel).toContain("clearWorkGenres");
    expect(editChapel).toContain("if (!window.confirm(\"Clear all selected genres for this Work?");
    expect(editChapel).toContain("setClearingGenres(true);");
    expect(editChapel).toContain("work-genre-selection-clearing");
  });

  it("uses opacity and transform only for post-confirmation genre clear feedback and disables it for reduced motion", () => {
    const styles = read("client/src/index.css");

    expect(styles).toContain("@keyframes work-genre-selection-clear");
    expect(styles).toContain("opacity: 0; transform: translateY(-4px);");
    expect(styles).toContain(".work-genre-selection-clearing");
    expect(styles).toContain("animation: none;");
  });

  it("keeps creator-declared Origin separate from editorial description, caption, classification, and participation display", () => {
    const publicWork = read("client/src/pages/loop/LoopWorkPage.tsx");

    expect(publicWork).toContain('const origin = song.haaiOriginStory?.trim() || ""');
    expect(publicWork).toContain("Origin is a creator-declared provenance field");
    expect(publicWork).not.toContain("song.haaiOriginStory || song.description || song.caption");
    expect(publicWork).toContain("No origin testimony recorded for this work yet.");
    expect(publicWork).toContain('formatParticipation("Music", (song as any).participationMusic)');
  });

  it("validates creator chronology as date-only editorial metadata", () => {
    expect(formatHistoricalDateValue(new Date(2024, 2, 17, 12))).toBe("2024-03-17");
    expect(parseHistoricalDate("2024-02-30")).toBeUndefined();
    expect(validateHistoricalDates({ creationDate: "2024-03-17", originalReleaseDate: "2024-06-12" })).toBeNull();
    expect(validateHistoricalDates({ creationDate: "2024-06-12", originalReleaseDate: "2024-03-17" }))
      .toBe("Original Release Date cannot be earlier than Creation Date.");
  });

  it("uses the shared calendar field and guards upload without adding dates to WID serialization", () => {
    const musicEnvironment = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const preparedWork = read("shared/preparedWorkRegistration.ts");
    const router = read("server/routers/songs.ts");

    expect(musicEnvironment).toContain('import { HistoricalDateField } from "@/components/HistoricalDateField"');
    expect(musicEnvironment).toContain("validateHistoricalDates({");
    expect(musicEnvironment).toContain('id="music-creation-date"');
    expect(musicEnvironment).toContain('id="music-original-release-date"');
    expect(preparedWork).not.toContain("releaseDate,");
    expect(preparedWork).not.toContain("creatorReleaseDate,");
    expect(router).toContain('eventType: "creator_historical_dates_declared"');
  });

  it("exposes only creator-date declaration and revision events through the public history contract", () => {
    const router = read("server/routers/songs.ts");
    const history = read("client/src/components/WorkProvenanceHistory.tsx");

    const publicHistory = router.slice(router.indexOf("getPublicCreatorDateHistory:"), router.indexOf("verifyWid:"));
    expect(publicHistory).toContain("getSongWithCreator(input.songId)");
    expect(publicHistory).toContain('eventType === "creator_historical_dates_declared"');
    expect(publicHistory).toContain('eventType === "creator_historical_dates_revised"');
    expect(publicHistory).toContain('eventType === "creator_participation_declaration_corrected"');
    expect(publicHistory).not.toContain("actorId:");
    expect(history).toContain("Public record · read-only");
    expect(history).toContain("Creator declaration");
    expect(history).toContain("Corrected effective declaration");
  });

  it("builds a correction event with immutable before/after declaration evidence and an optional creator note", () => {
    const previous = { music: "AI", lyrics: "Human", voice: "None" } as const;
    const current = { music: "Both", lyrics: "Human", voice: "None" } as const;

    expect(declarationsMatch(previous, current)).toBe(false);
    expect(buildParticipationCorrectionEventData({
      previous,
      current,
      witnessId: "WID-MUS-EXAMPLE",
      explanation: "  Music participation should have been Both.  ",
    })).toEqual({
      previous,
      current,
      witnessId: "WID-MUS-EXAMPLE",
      explanation: "Music participation should have been Both.",
    });
  });

  it("keeps participation corrections owner-only, narrow, append-only, and separate from ordinary metadata edits", () => {
    const router = read("server/routers/songs.ts");
    const db = read("server/utils/db.ts");
    const policy = read("server/domains/work/participationCorrection.ts");
    const correction = router.slice(router.indexOf("correctDeclaration: protectedProcedure"), router.indexOf("updateMetadata: protectedProcedure"));

    expect(correction).toContain('participationMusic: z.enum(["Human", "AI", "Both", "None"])');
    expect(correction).toContain('participationLyrics: z.enum(["Human", "AI", "Both", "None"])');
    expect(correction).toContain('participationVoice: z.enum(["Human", "AI", "Both", "None"])');
    expect(correction).toContain("prepareParticipationCorrection({");
    expect(correction).toContain("ownerId: existing?.userId");
    expect(correction).toContain("actorId: ctx.user.id");
    expect(correction).toContain("correctSongParticipationDeclaration");
    expect(correction).toContain("eventData: correction.eventData");
    expect(correction).not.toContain("fileUrl");
    expect(correction).not.toContain("fileKey");
    expect(correction).not.toContain("coverArtUrl");
    expect(correction).not.toContain("lyricsText");
    expect(correction).not.toContain("parentSongId");
    expect(correction).not.toContain("collectionId");
    expect(db).toContain("export async function correctSongParticipationDeclaration(data:");
    expect(db).toContain("return db.transaction(async (tx: any) => {");
    expect(db).toContain("Number(updateResult?.affectedRows ?? 0) !== 1");
    expect(db).toContain("participationMusic: data.declaration.music");
    expect(db).toContain("participationLyrics: data.declaration.lyrics");
    expect(db).toContain("participationVoice: data.declaration.voice");
    expect(db).toContain('eventType: "creator_participation_declaration_corrected"');
    expect(db).toContain("isSystemEvent: false");
    expect(policy).toContain("buildParticipationCorrectionEventData");
    expect(policy).toContain("declarationsMatch");
  });

  it("carries persisted participation values into every active owner editor entry point", () => {
    const editorFiles: Record<string, number> = {
      "client/src/pages/ArchivePage.tsx": 2,
      "client/src/pages/CreatorDomainPage.tsx": 1,
      "client/src/pages/CreatorProfilePage.tsx": 1,
      "client/src/pages/DashboardPage.tsx": 1,
      "client/src/pages/ProfilePage.tsx": 1,
      "client/src/pages/SongDetailPage.tsx": 3,
      "client/src/pages/loop/LoopManagePage.tsx": 1,
      "client/src/pages/loop/LoopWorkPage.tsx": 1,
    };

    const drawer = read("client/src/components/CreativeDrawer.tsx");
    expect(drawer).toContain("participationMusic?: ParticipationValue | null");
    expect(drawer).toContain("trpc.songs.correctDeclaration.useMutation()");
    expect(drawer).toContain("Confirm &amp; Record Correction");
    expect(drawer).toContain("This updates the current effective disclosure only.");

    for (const [path, expectedCalls] of Object.entries(editorFiles)) {
      const calls = read(path).split("openEditor({").slice(1);
      expect(calls).toHaveLength(expectedCalls);
      for (const call of calls) {
        const payload = call.slice(0, call.indexOf("})"));
        expect(payload).toContain("participationMusic:");
        expect(payload).toContain("participationLyrics:");
        expect(payload).toContain("participationVoice:");
      }
    }
  });
});
