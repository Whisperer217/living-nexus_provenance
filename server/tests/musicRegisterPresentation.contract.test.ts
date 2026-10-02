import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Music Register presentation contracts", () => {
  it("keeps uploaded filenames and preview titles inside their visual boundaries", () => {
    const source = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    expect(source).toContain("line-clamp-2 max-w-full break-all");
    expect(source).toContain("line-clamp-3 min-w-0 break-words");
    expect(source).toContain("[overflow-wrap:anywhere]");
    expect(source).toContain("title={audioFile.name}");
    expect(source).toContain('title={title || "Untitled work"}');
  });

  it("identifies artwork provenance and exposes a dedicated replacement control", () => {
    const source = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    expect(source).toContain('embedded: { label: "Embedded artwork"');
    expect(source).toContain('uploaded: { label: "Creator upload"');
    expect(source).toContain('generated: { label: "Generated visual"');
    expect(source).toContain('remixed: { label: "Remixed visual"');
    expect(source).toContain('"Replace artwork"');
    expect(source).toContain('aria-describedby="music-register-artwork-source"');
  });

  it("uses one compact asset-card grammar and accurate audio-to-visual relationship language", () => {
    const gateway = read("client/src/pages/manifestation-studio/TypeGateway.tsx");
    const music = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const assetCard = read("client/src/pages/manifestation-studio/RegistrationAssetCard.tsx");
    const tokens = read("client/src/index.css");

    expect(gateway).toContain("RegistrationAssetCard");
    expect(music).toContain("RegistrationAssetCard");
    expect(gateway).toContain('eyebrow="Canonical artifact"');
    expect(assetCard).toContain("sm:grid-cols-[minmax(0,1fr)_auto]");
    expect(gateway).toContain("min-h-11");
    expect(music).toContain("Canonical audio received");
    expect(music).toContain("Visual identity");
    expect(music).toContain("not part of the WID hash");
    expect(music).toContain("Publish requires a visual identity");
    expect(music).not.toContain("Bound visual");
    expect(music).not.toContain("Publish requires a bound visual");
    expect(assetCard).toContain("px-3 py-4 sm:px-5");
    expect(assetCard).toContain("w-full sm:w-auto");
    expect(assetCard).toContain('color: "var(--ln-bone)"');
    expect(music).toContain("registration-artwork-preview");
    expect(music).toContain("interactive");
    expect(tokens).toContain("@media (hover: hover) and (pointer: fine)");
    expect(tokens).toContain(".registration-asset-card--interactive:hover");
    expect(tokens).toContain("prefers-reduced-motion: reduce");
  });

  it("places extracted record evidence under creator review before WID sealing", () => {
    const music = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const prepared = read("shared/preparedWorkRegistration.ts");
    const extraction = read("shared/loopRegistration.ts");

    expect(music).toContain("Detected record");
    expect(music).toContain("Review embedded audio evidence");
    expect(music).toContain("setDetectedRecordReviewed");
    expect(music).toContain("Review the detected record details before sealing");
    expect(music).toContain("!hasDetectedRecord || detectedRecordReviewed");
    expect(music).toContain("Official artist / album artist");
    expect(music).toContain("Publisher / label");
    expect(music).toContain("Living Nexus Collection placement");
    expect(music).toContain("distinct from the embedded album metadata above");
    expect(music).toContain("setWitnessData(null)");
    expect(music).toContain("setToneProfile(null)");
    expect(music).toContain("autoExtractedFields");
    expect(music).toContain("ExtractedMetadataStatus");
    expect(music).toContain("Extracted");
    expect(music).toContain("Approve All");
    expect(music).toContain("Detected record approved — ready to seal when you are.");
    expect(music).toContain("validateIsrc(isrc)");
    expect(music).toContain("aria-invalid={Boolean(isrcValidationError)}");
    expect(music).toContain("Original Release Date is the first release of this Work");
    expect(music).toContain("detectedRecordValidationError");
    expect(music).toContain("labelAdornment");
    expect(extraction).toContain("albumArtist?: string");
    expect(extraction).toContain("publisher?: string");
    expect(extraction).toContain("validateIsrc");
    expect(extraction).toContain("ISRC must contain 12 characters");
    expect(prepared).toContain("officialArtistName");
    expect(prepared).toContain("publisherName");
    expect(prepared).toContain('role: "publisher"');
    expect(prepared).not.toContain('widBound: [\n    "audioFile",\n    "title",\n    "officialArtistName"');
  });

  it("gives Cathedral a high-contrast, creator-expandable workspace", () => {
    const workspace = read("client/src/components/creative-cathedral/CreativeCathedralWorkspace.tsx");
    const gate = read("client/src/components/creative-cathedral/CathedralContextGate.tsx");
    const suggestion = read("client/src/components/creative-cathedral/CathedralSuggestionCard.tsx");
    const statusRail = read("client/src/components/creative-cathedral/CathedralStatusRail.tsx");
    const tokens = read("client/src/index.css");
    expect(workspace).toContain("Expand Creative Cathedral workspace");
    expect(workspace).toContain('width: desktop ? "min(760px, calc(100vw - 2rem))"');
    expect(workspace).toContain('"calc(100vw - 1rem)"');
    expect(workspace).toContain("zIndex: 9000");
    expect(workspace).toContain('top: "3rem"');
    expect(workspace).toContain('height: "auto"');
    expect(workspace).toContain("overflow-x-hidden");
    expect(workspace).toContain("var(--font-display)");
    expect(workspace).toContain("var(--ln-cathedral-surface)");
    expect(gate).toContain("[overflow-wrap:anywhere]");
    expect(gate).toContain("var(--ln-cathedral-text-muted)");
    expect(suggestion).toContain("text-base font-semibold");
    expect(suggestion).toContain("var(--ln-cathedral-text)");
    expect(suggestion).not.toContain('style={{ color: "#000" }}');
    expect(statusRail).toContain('className="mt-1 text-[10px]');
    expect(tokens).toContain("--ln-cathedral-surface:");
    expect(tokens).toContain("--ln-cathedral-text-muted:");
    expect(tokens).toContain("--ln-cathedral-border:");
  });

  it("keeps desktop Studio panels independently scrollable while preserving mobile document flow", () => {
    const shell = read("client/src/pages/manifestation-studio/StudioShell.tsx");
    expect(shell).toContain("lg:h-[calc(100dvh-3rem)] lg:min-h-0");
    expect(shell).toContain("min-h-0 flex-1 flex flex-col lg:flex-row overflow-hidden");
    expect(shell).toContain('overscrollBehavior: "contain"');
    expect(shell).not.toContain('className="p-6 md:p-8 lg:p-10 sticky top-0"');
  });

  it("allows provenance-aware adornments on canonical historical date controls", () => {
    const historicalDateField = read("client/src/components/HistoricalDateField.tsx");
    expect(historicalDateField).toContain("labelAdornment?: ReactNode");
    expect(historicalDateField).toContain("labelAdornment,");
    expect(historicalDateField).toContain("flex flex-wrap items-center gap-2 text-xs");
  });

  it("does not add registration, publication, WID, or provenance authority to Cathedral UI", () => {
    const files = [
      "client/src/components/creative-cathedral/CreativeCathedralWorkspace.tsx",
      "client/src/components/creative-cathedral/CathedralContextGate.tsx",
      "client/src/components/creative-cathedral/CathedralSuggestionCard.tsx",
    ].map(read).join("\n");
    expect(files).not.toMatch(/songs\.upload|generateWID|setSongPublicationStatus|workEvents|publishSong/);
  });
});
