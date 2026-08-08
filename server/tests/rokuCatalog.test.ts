import { describe, expect, it } from "vitest";
import { buildRokuHome, type RokuSongRecord } from "../services/rokuCatalog";

const baseUrl = "https://www.livingnexus.org";

function record(overrides: Partial<RokuSongRecord["song"]> = {}): RokuSongRecord {
  return {
    song: {
      id: 42,
      title: "The First Witness",
      fileUrl: "https://media.example.org/audio.mp3",
      coverArtUrl: "https://media.example.org/cover.jpg",
      witnessId: "WID-MUS-TEST-0001",
      genre: "Ambient",
      playCount: 10,
      durationSeconds: 216,
      aiConsent: "original",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      haaiOriginStory: "A testimony about the creative work.",
      ...overrides,
    },
    creator: {
      id: 7,
      name: "Keeper",
      artistHandle: "keeper",
    },
  };
}

describe("Roku home catalog projection", () => {
  it("maps public audio work to absolute playback and immutable provenance URLs", () => {
    const home = buildRokuHome([record()], baseUrl, new Date("2026-08-08T00:00:00.000Z"));
    const item = home.rows[0]?.items[0];

    expect(home.schemaVersion).toBe("1.0");
    expect(home.platform.websiteUrl).toBe("https://www.livingnexus.org/");
    expect(item).toMatchObject({
      contentId: "ln-song-42",
      streamUrl: "https://www.livingnexus.org/api/v1/stream/42",
      detailUrl: "https://www.livingnexus.org/api/v1/track/42",
      creator: { handle: "@keeper" },
      provenance: {
        witnessId: "WID-MUS-TEST-0001",
        verificationStatus: "verified",
        verificationUrl: "https://www.livingnexus.org/api/v1/wid/WID-MUS-TEST-0001",
        webVerifyUrl: "https://www.livingnexus.org/verify/WID-MUS-TEST-0001",
      },
    });
  });

  it("excludes records without a streamable public audio source", () => {
    const home = buildRokuHome([record({ fileUrl: null }), record({ id: 43, fileUrl: "https://media.example.org/second.mp3" })], baseUrl);
    const allItems = home.rows.flatMap(row => row.items);

    expect(allItems).toHaveLength(3);
    expect(allItems.every(item => item.contentId === "ln-song-43")).toBe(true);
  });

  it("keeps the feed bounded for constrained TV hardware", () => {
    const records = Array.from({ length: 20 }, (_, index) => record({ id: index + 1, title: `Work ${index + 1}`, fileUrl: `https://media.example.org/${index + 1}.mp3` }));
    const home = buildRokuHome(records, baseUrl);

    expect(home.rows.length).toBeLessThanOrEqual(3);
    expect(home.rows.every(row => row.items.length <= 12)).toBe(true);
  });

  it("preserves the absence of a WID without inventing a provenance record", () => {
    const home = buildRokuHome([record({ witnessId: null, haaiOriginStory: "   " })], baseUrl);
    const item = home.rows[0]?.items[0];

    expect(item?.provenance).toMatchObject({
      witnessId: null,
      verificationStatus: "unverified",
      verificationUrl: null,
      webVerifyUrl: null,
      originStory: null,
    });
  });
});
