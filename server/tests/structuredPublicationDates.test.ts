import { describe, expect, it } from "vitest";
import { buildSongJsonLd } from "../services/og";

function parseMusicRecording(html: string) {
  const match = html.match(/<script type="application\/ld\+json">(.*)<\/script>/);
  if (!match) throw new Error("Expected a MusicRecording JSON-LD script");
  return JSON.parse(match[1]) as Record<string, unknown>;
}

describe("public MusicRecording date semantics", () => {
  const base = {
    title: "A declared work",
    artistName: "A creator",
    songUrl: "https://www.livingnexus.org/song/1",
    witnessId: "WID-MUS-EXAMPLE-0001",
  };

  it("maps creator-declared creation and original release dates without substituting system record time", () => {
    const record = parseMusicRecording(buildSongJsonLd({
      ...base,
      creationDate: "2018-02-14",
      originalReleaseDate: "2019-03-01",
    }));

    expect(record.dateCreated).toBe("2018-02-14");
    expect(record.datePublished).toBe("2019-03-01");
    expect(record.identifier).toEqual([{ "@type": "PropertyValue", name: "Witness ID", value: base.witnessId }]);
  });

  it("omits creator dates when a creator did not declare them rather than inventing publication metadata", () => {
    const record = parseMusicRecording(buildSongJsonLd(base));

    expect(record).not.toHaveProperty("dateCreated");
    expect(record).not.toHaveProperty("datePublished");
  });

  it("preserves a calendar-day string exactly instead of applying a timezone conversion", () => {
    const record = parseMusicRecording(buildSongJsonLd({
      ...base,
      originalReleaseDate: "2020-01-02",
    }));

    expect(record.datePublished).toBe("2020-01-02");
  });
});
