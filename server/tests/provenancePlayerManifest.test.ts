import { describe, expect, it } from "vitest";
import {
  buildProvenancePlayerManifest,
  MAX_PROVENANCE_PLAYER_MANIFEST_TRACKS,
  ProvenancePlayerManifestUnavailableError,
  type ProvenancePlayerManifestTrackSource,
} from "../domains/provenancePlayer/manifest";

function source(overrides: Partial<ProvenancePlayerManifestTrackSource> = {}): ProvenancePlayerManifestTrackSource {
  return {
    id: 60001,
    title: "Push Forward",
    contentType: "audio",
    status: "Published",
    isPublic: true,
    isFlagged: false,
    witnessId: "WID-MUS-F61EC526-F2E36FBC",
    fileUrl: "https://media.example.test/push-forward.mp3",
    coverArtUrl: "https://media.example.test/push-forward.webp",
    externalDisplayRevokedAt: null,
    participationMusic: "Both",
    participationLyrics: "Human",
    participationVoice: "None",
    creator: { artistHandle: "DocSMercer", name: "Doc Seraph Mercer" },
    ...overrides,
  };
}

describe("Provenance Player manifest adapter", () => {
  it("preserves caller ordering while exposing only the exact portable adapter fields", () => {
    const first = source({ id: 2, title: "Second in storage, first in playlist", witnessId: "WID-MUS-SECOND" });
    const second = source({ id: 1, title: "First in storage, second in playlist", witnessId: "WID-MUS-FIRST" });

    const manifest = buildProvenancePlayerManifest({
      tracks: [first, second],
      album: "The Ordered Record",
      fallbackArtworkUrl: "https://media.example.test/album.webp",
    });

    expect(manifest).toEqual({
      schema: "living-nexus-player/1",
      tracks: [
        expect.objectContaining({
          title: "Second in storage, first in playlist",
          creator: "@DocSMercer",
          album: "The Ordered Record",
          workId: "2",
          wid: "WID-MUS-SECOND",
          sourceUrl: "https://www.livingnexus.org/share/WID-MUS-SECOND",
          audioUrl: "https://www.livingnexus.org/api/provenance-player/media/2",
        }),
        expect.objectContaining({
          title: "First in storage, second in playlist",
          workId: "1",
          wid: "WID-MUS-FIRST",
          audioUrl: "https://www.livingnexus.org/api/provenance-player/media/1",
        }),
      ],
    });
    expect(JSON.stringify(manifest)).not.toContain("media.example.test/push-forward.mp3");
    expect(manifest.tracks[0]?.aiDisclosure).toContain("Current participation declaration");
  });

  it("uses clean fallback artwork but never emits signed, query-bearing, or fragment-bearing media", () => {
    const manifest = buildProvenancePlayerManifest({
      tracks: [source({ coverArtUrl: null })],
      fallbackArtworkUrl: "https://media.example.test/album.webp",
    });
    expect(manifest.tracks[0]?.artworkUrl).toBe("https://media.example.test/album.webp");

    expect(() => buildProvenancePlayerManifest({
      tracks: [source({ fileUrl: "https://media.example.test/file.mp3?signature=private" })],
    })).toThrow(ProvenancePlayerManifestUnavailableError);
  });

  it("delegates a public published Work under the community-approved player policy without a per-Work display or download declaration", () => {
    expect(() => buildProvenancePlayerManifest({
      tracks: [source()],
    })).not.toThrow();
  });

  it.each([
    ["private Work", { isPublic: false }],
    ["not published", { status: "Draft" }],
    ["individually withdrawn delegation", { externalDisplayRevokedAt: new Date() }],
    ["missing WID", { witnessId: null }],
    ["flagged Work", { isFlagged: true }],
  ] as const)("rejects the entire manifest for %s", (_label, overrides) => {
    expect(() => buildProvenancePlayerManifest({ tracks: [source(overrides)] }))
      .toThrow(ProvenancePlayerManifestUnavailableError);
  });

  it("rejects empty and oversized lists rather than truncating a listening path", () => {
    expect(() => buildProvenancePlayerManifest({ tracks: [] })).toThrow(ProvenancePlayerManifestUnavailableError);
    expect(() => buildProvenancePlayerManifest({
      tracks: Array.from({ length: MAX_PROVENANCE_PLAYER_MANIFEST_TRACKS + 1 }, (_, index) => source({
        id: index + 1,
        witnessId: `WID-MUS-${index + 1}`,
      })),
    })).toThrow(ProvenancePlayerManifestUnavailableError);
  });
});
