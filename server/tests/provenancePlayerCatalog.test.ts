import { describe, expect, it } from "vitest";
import {
  buildProvenancePlayerCatalogPage,
  PROVENANCE_PLAYER_CATALOG_SCHEMA,
} from "../domains/provenancePlayer/catalog";

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 60001,
    title: "Push Forward",
    contentType: "audio",
    status: "Published",
    isPublic: true,
    isFlagged: false,
    witnessId: "WID-MUS-PUSH-FORWARD",
    fileUrl: "https://media.example.test/push-forward.mp3",
    coverArtUrl: "https://media.example.test/push-forward.webp",
    externalDisplayRevokedAt: null,
    participationMusic: "Both",
    participationLyrics: "Human",
    participationVoice: "None",
    creator: { id: 1, artistHandle: "DocSMercer", name: "Doc Seraph Mercer" },
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    ...overrides,
  } as any;
}

describe("Provenance Player discovery catalog adapter", () => {
  it("uses the exact existing one-Work manifest adapter shape and gateway-only media URL", () => {
    const page = buildProvenancePlayerCatalogPage({
      offset: 0,
      limit: 25,
      scannedCandidates: [candidate()],
      hasMoreCandidates: false,
      ambiguousWids: new Set(),
    });

    expect(page).toMatchObject({
      schema: PROVENANCE_PLAYER_CATALOG_SCHEMA,
      offset: 0,
      limit: 25,
      nextOffset: null,
      items: [{
        title: "Push Forward",
        creator: "@DocSMercer",
        workId: "60001",
        wid: "WID-MUS-PUSH-FORWARD",
        sourceUrl: "https://www.livingnexus.org/share/WID-MUS-PUSH-FORWARD",
        audioUrl: "https://www.livingnexus.org/api/provenance-player/media/60001",
      }],
    });
    expect(JSON.stringify(page)).not.toContain("media.example.test/push-forward.mp3");
  });

  it("preserves source order while omitting unavailable and ambiguous current records", () => {
    const page = buildProvenancePlayerCatalogPage({
      offset: 50,
      limit: 3,
      scannedCandidates: [
        candidate({ id: 1, title: "First", witnessId: "WID-MUS-FIRST" }),
        candidate({ id: 2, title: "Withdrawn", witnessId: "WID-MUS-WITHDRAWN", externalDisplayRevokedAt: new Date() }),
        candidate({ id: 3, title: "Ambiguous", witnessId: "WID-MUS-AMBIGUOUS" }),
        candidate({ id: 4, title: "Fourth", witnessId: "WID-MUS-FOURTH" }),
      ],
      hasMoreCandidates: true,
      ambiguousWids: new Set(["WID-MUS-AMBIGUOUS"]),
    });

    expect(page.items.map((item) => item.title)).toEqual(["First", "Fourth"]);
    expect(page.nextOffset).toBe(54);
  });

  it("remains fail-closed for malformed public candidates rather than fabricating a catalog item", () => {
    const page = buildProvenancePlayerCatalogPage({
      offset: 0,
      limit: 1,
      scannedCandidates: [candidate({ witnessId: null }), candidate({ id: 2, creator: null })],
      hasMoreCandidates: false,
      ambiguousWids: new Set(),
    });

    expect(page.items).toEqual([]);
    expect(page.nextOffset).toBeNull();
  });
});
