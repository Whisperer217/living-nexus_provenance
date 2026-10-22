import { afterEach, describe, expect, it, vi } from "vitest";
import {
  copyProvenancePlayerManifest,
  downloadProvenancePlayerManifest,
  serializeProvenancePlayerManifest,
} from "../../client/src/lib/provenancePlayerManifest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Provenance Player manifest client helpers", () => {
  it("copies and downloads identical canonical JSON without creating a playback path", async () => {
    const manifest = {
      schema: "living-nexus-player/1" as const,
      tracks: [
        {
          title: "Portable Witness",
          workId: "60001",
          wid: "WID-MUS-PORTABLE-WITNESS",
          audioUrl: "https://www.livingnexus.org/api/provenance-player/media/60001",
        },
      ],
    };
    const expected = serializeProvenancePlayerManifest(manifest);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const click = vi.fn();
    const anchor = { href: "", download: "", click };
    let downloadedBlob: Blob | null = null;

    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => anchor),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlob = blob;
        return "blob:portable-witness";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("window", { setTimeout: vi.fn() });

    await expect(copyProvenancePlayerManifest(manifest)).resolves.toBe(true);
    downloadProvenancePlayerManifest(manifest, "Portable Witness");

    expect(writeText).toHaveBeenCalledWith(expected);
    expect(downloadedBlob).toBeInstanceOf(Blob);
    await expect(downloadedBlob!.text()).resolves.toBe(expected);
    expect(anchor.download).toBe("Portable-Witness-provenance-player.json");
    expect(click).toHaveBeenCalledOnce();
  });
});
