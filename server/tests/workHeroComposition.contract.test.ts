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
    expect(workPage).toContain("font-heading text-3xl sm:text-4xl mb-6");
    expect(workPage).toContain("font-heading text-3xl sm:text-4xl mb-4");
    expect(workPage).toContain("py-10 sm:py-12 ln-breath-reveal");
  });

  it("does not introduce Work, WID, provenance, or publication writers into the presentation repair", () => {
    expect(workPage).not.toContain("createWorkEvent");
    expect(workPage).not.toContain("generateWID");
    expect(workPage).not.toContain("updateSongMetadata");
  });
});
