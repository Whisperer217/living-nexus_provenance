import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const exploreSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ExplorePage.tsx"), "utf8");
const workListSource = fs.readFileSync(path.join(projectRoot, "client/src/components/WorkListRow.tsx"), "utf8");

describe("Explore creator presence contract", () => {
  it("retains creator-declared biography from the public creator directory response", () => {
    expect(exploreSource).toContain("bio: c.bio ?? null");
    expect(exploreSource).toContain("creator.bio ?");
    expect(exploreSource).toContain("Creator statement");
    expect(exploreSource).toContain("Explore this creator’s registered works and provenance record.");
  });

  it("opens the existing support drawer only after a visitor requests creator support", () => {
    expect(exploreSource).toContain('import { SupportCreatorDrawer, type SupportTarget }');
    expect(exploreSource).toContain("enabled: supportRequested");
    expect(exploreSource).toContain("setSupportRequested(true)");
    expect(exploreSource).toContain("<SupportCreatorDrawer");
    expect(exploreSource).toContain("creatorId: creator.id");
  });

  it("keeps the list-row support action visible rather than hover-only", () => {
    const supportAction = workListSource.slice(
      workListSource.indexOf('aria-label="Support this creator"'),
      workListSource.indexOf('aria-label="Support this creator"') + 500,
    );
    expect(supportAction).toContain("inline-flex");
    expect(supportAction).not.toContain("sm:opacity-0");
    expect(supportAction).not.toContain("hidden sm:flex");
  });

  it("uses Cathedral semantic type roles throughout Explore’s public header and directory", () => {
    expect(exploreSource).toContain('className="ln-page-title"');
    expect(exploreSource).toContain('className="ln-overline mb-1"');
    expect(exploreSource).toContain('className="ln-section-header mt-1"');
    expect(exploreSource).not.toMatch(/text-\[(?:9|10|11)px\]/);
  });
});
