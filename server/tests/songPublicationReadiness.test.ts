import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  getPublicationReadinessMissing,
  publicationReadinessError,
} from "../domains/work/publicationReadiness";

const readyCreator = {
  ownershipStatus: "full" as const,
  coverArtUrl: "https://example.com/cover.webp",
  creatorName: "Ready Creator",
  creatorHandle: "ready-creator",
  creatorBio: "A complete origin statement.",
  creatorOriginStatement: null,
  creatorProfilePhotoUrl: "https://example.com/profile.webp",
  testimonyCount: 1,
};

describe("Song publication readiness", () => {
  it("accepts a ready creator and bound Work for direct or later publication", () => {
    expect(getPublicationReadinessMissing(readyCreator)).toEqual([]);
  });

  it("returns every creator-actionable requirement instead of permitting an invisible publish", () => {
    const missing = getPublicationReadinessMissing({
      ownershipStatus: "partial",
      coverArtUrl: null,
      creatorName: null,
      creatorHandle: null,
      creatorBio: null,
      creatorOriginStatement: null,
      creatorProfilePhotoUrl: null,
      testimonyCount: 0,
    });

    expect(missing).toEqual([
      "full commercial ownership or a commercial license",
      "a bound visual (upload or generate cover art)",
      "name or handle",
      "bio or origin statement",
      "profile photo",
      "at least one testimony",
    ]);
    expect(publicationReadinessError(missing)).toBe(
      "Cannot publish yet. Complete: full commercial ownership or a commercial license, a bound visual (upload or generate cover art), name or handle, bio or origin statement, profile photo, at least one testimony. Save as Draft instead."
    );
  });

  it("treats a cover, profile, testimony, and full rights as direct-publish requirements", () => {
    expect(getPublicationReadinessMissing({ ...readyCreator, coverArtUrl: null })).toContain(
      "a bound visual (upload or generate cover art)"
    );
    expect(getPublicationReadinessMissing({ ...readyCreator, testimonyCount: 0 })).toContain(
      "at least one testimony"
    );
    expect(getPublicationReadinessMissing({ ...readyCreator, ownershipStatus: "partial" })).toContain(
      "full commercial ownership or a commercial license"
    );
  });

  it("contains no database, storage, WID, provenance-event, or status-transition side effects", () => {
    const source = getPublicationReadinessMissing.toString();
    expect(source).not.toContain("await ");
    expect(source).not.toMatch(/getDb\(|storagePut\(|insertWid\(|addWorkEvent\(|updateSongStatus\(/);
  });

  it("uses the same readiness contract for direct and later publication", () => {
    const songsRouter = readFileSync(fileURLToPath(new URL("../routers/songs.ts", import.meta.url)), "utf8");
    const songDb = readFileSync(fileURLToPath(new URL("../utils/db.ts", import.meta.url)), "utf8");

    expect(songsRouter).toContain("getPublicationReadinessMissing({");
    expect(songsRouter).toContain("publicationReadinessError(missing)");
    expect(songDb).toContain("getPublicationReadinessMissing({");
    expect(songDb).toContain("publicationReadinessError(missing)");
  });
});
