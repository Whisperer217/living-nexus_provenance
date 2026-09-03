import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWorkGenres, serializeWorkGenres, toggleWorkGenre } from "@shared/workMetadata";
import { formatHistoricalDateValue, parseHistoricalDate, validateHistoricalDates } from "@shared/workHistoricalDates";

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
    const musicEnvironment = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const publicWork = read("client/src/pages/loop/LoopWorkPage.tsx");

    expect(router).toContain("creatorReleaseDate: z.string().optional()");
    expect(router).toContain("creatorReleaseDate: input.creatorReleaseDate");
    expect(musicEnvironment).toContain("releaseDate: creationDate");
    expect(musicEnvironment).toContain("creatorReleaseDate,");
    expect(musicEnvironment).toContain("toggleWorkGenre");
    expect(publicWork).toContain("parseWorkGenres(song.genre)");
    expect(publicWork).toContain("Released {(song as any).creatorReleaseDate}");
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
    expect(publicHistory).not.toContain("actorId:");
    expect(history).toContain("Public record · read-only");
    expect(history).toContain("Creator declaration");
  });
});
