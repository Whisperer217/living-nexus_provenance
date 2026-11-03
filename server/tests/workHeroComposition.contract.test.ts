import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("public Work hero composition contract", () => {
  const workPage = source("client/src/pages/loop/LoopWorkPage.tsx");

  it("uses a bounded, centered hero content plane instead of anchoring the record at the lower viewport edge", () => {
    expect(workPage).toContain("min-h-[clamp(34rem,68svh,46rem)] flex flex-col justify-center");
    expect(workPage).toContain("max-w-4xl mx-auto w-full px-4 sm:px-6 text-center");
    expect(workPage).toContain("justify-center gap-3");
    expect(workPage).not.toContain("min-h-[88vh] flex flex-col justify-end");
  });

  it("keeps the first testimony and provenance headings visually legible after the hero", () => {
    expect(workPage).toContain("ln-work-section-title mb-6");
    expect(workPage).toContain("ln-work-section-title mb-4");
    expect(workPage).toContain("ln-work-hero-lead max-w-none ml-0 ln-breath-rule");
    expect(workPage).toContain("ln-work-wid");
    expect(workPage).toContain("py-10 sm:py-12 ln-breath-reveal");
  });

  it("uses shared semantic typography roles for the hero instead of page-local sizes", () => {
    expect(workPage).toContain('className="ln-work-hero-title mb-5');
    expect(workPage).toContain('className="ln-work-hero-lead mb-8');
    expect(workPage).not.toContain("text-4xl sm:text-6xl md:text-7xl leading-[0.95]");
  });

  it("keeps feedback attached to real Work actions and provenance controls", () => {
    expect(workPage).toContain("ln-work-action inline-flex");
    expect(workPage).toContain("ln-work-wid-copy");
    expect(workPage).toContain("ln-work-verify-link");
  });

  it("does not introduce Work, WID, provenance, or publication writers into the presentation repair", () => {
    expect(workPage).not.toContain("createWorkEvent");
    expect(workPage).not.toContain("generateWID");
    expect(workPage).not.toContain("updateSongMetadata");
  });
});
