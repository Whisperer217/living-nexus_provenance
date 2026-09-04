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

  it("does not add registration, publication, WID, or provenance authority to Cathedral UI", () => {
    const files = [
      "client/src/components/creative-cathedral/CreativeCathedralWorkspace.tsx",
      "client/src/components/creative-cathedral/CathedralContextGate.tsx",
      "client/src/components/creative-cathedral/CathedralSuggestionCard.tsx",
    ].map(read).join("\n");
    expect(files).not.toMatch(/songs\.upload|generateWID|setSongPublicationStatus|workEvents|publishSong/);
  });
});
