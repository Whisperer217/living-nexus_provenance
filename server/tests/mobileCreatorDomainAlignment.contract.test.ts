import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("mobile Creator Domain alignment contract", () => {
  it("filters only known incomplete creator prompts from public narrative rendering", () => {
    const page = source("client/src/pages/loop/LoopCreatorPage.tsx");

    expect(page).toContain('"type some"');
    expect(page).toContain("function isIncompleteCreatorText");
    expect(page).toContain("function firstCreatorNarrative");
    expect(page).toContain("firstCreatorNarrative(creator.bio, creator.originStatement, creator.tagline)");
    expect(page).toContain("firstCreatorNarrative(creator.originStatement, creator.creativeMission, creator.bio)");
    expect(page).not.toContain("creator.originStatement || creator.creativeMission || creator.bio");
  });

  it("contains dynamic creator identity and summary facts on narrow screens", () => {
    const page = source("client/src/pages/loop/LoopCreatorPage.tsx");

    expect(page).toContain("break-words text-3xl");
    expect(page).toContain("data-creator-domain-fact={fact.label.toLowerCase()}");
    expect(page).toContain("grid-cols-1 gap-2 mb-8 min-[420px]:grid-cols-2");
    expect(page).toContain('aria-label="Creator record summary"');
    expect(page).toContain("max-w-full flex-wrap gap-2 sm:gap-3");
  });
});
