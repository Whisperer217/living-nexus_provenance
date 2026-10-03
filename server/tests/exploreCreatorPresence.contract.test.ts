import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const exploreSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/ExplorePage.tsx"), "utf8");
const workListSource = fs.readFileSync(path.join(projectRoot, "client/src/components/WorkListRow.tsx"), "utf8");
const stylesheet = fs.readFileSync(path.join(projectRoot, "client/src/index.css"), "utf8");

describe("Explore creator presence contract", () => {
  it("retains creator-declared biography from the public creator directory response", () => {
    expect(exploreSource).toContain("bio: c.bio ?? null");
    expect(exploreSource).toContain("creator.bio ?");
    expect(exploreSource).toContain("Creator statement");
    expect(exploreSource).toContain("Explore this creator’s registered works and provenance record.");
  });

  it("uses only the existing creator banner as the optional directory-card background", () => {
    expect(exploreSource).toContain("bannerUrl: c.bannerUrl ?? null");
    expect(exploreSource).toContain("creator.bannerUrl && !bannerFailed");
    expect(exploreSource).toContain("src={creator.bannerUrl}");
    expect(exploreSource).toContain("object-cover");
    expect(exploreSource).toContain("setBannerFailed(true)");
    expect(exploreSource).toContain("bg-[var(--void-3)]");
    expect(exploreSource).not.toContain("src={supportRow.song.coverArtUrl}");
  });

  it("keeps directory cards geometrically stable while preserving creator statements and anchored actions", () => {
    expect(exploreSource).toContain("aspect-[5/4] min-h-72");
    expect(exploreSource).toContain("ln-creator-card__veil");
    expect(exploreSource).toContain("ln-creator-card__ink");
    expect(exploreSource).toContain("line-clamp-3 !text-[var(--ln-parchment)]");
    expect(exploreSource).toContain("!text-[var(--ln-gold-hot)]");
    expect(exploreSource).toContain("flex h-full min-h-0 flex-col");
    expect(exploreSource).toContain("mt-4 flex items-center justify-between");
  });

  it("adds restrained browse feedback without overriding reduced-motion preferences", () => {
    expect(exploreSource).toContain("hover:scale-[1.012]");
    expect(exploreSource).toContain("hover:shadow-[0_16px_36px_rgba(0,0,0,0.28)]");
    expect(exploreSource).toContain("motion-reduce:transform-none motion-reduce:transition-none");
  });

  it("aligns creator Follow states with parchment labels and gold-hot witness emphasis", () => {
    expect(exploreSource).toContain("ln-creator-follow--active");
    expect(exploreSource).toContain("ln-creator-follow--idle");
    expect(stylesheet).toContain(".ln-creator-follow--active");
    expect(stylesheet).toContain(".ln-creator-follow--idle:hover:not(:disabled)");
    expect(stylesheet).toContain("color: var(--ln-parchment)");
    expect(stylesheet).toContain("color: var(--ln-gold-hot)");
  });

  it("raises compact creator metadata and actions to the mobile readable type tier", () => {
    expect(exploreSource).toContain("ln-creator-card__handle");
    expect(exploreSource).toContain("ln-creator-card__supporting");
    expect(exploreSource).toContain("ln-creator-card__action");
    expect(stylesheet).toContain("@media (max-width: 639px)");
    expect(stylesheet).toContain("font-size: var(--text-sm) !important");
    expect(stylesheet).toContain("min-height: 2.75rem");
  });

  it("uses creator-specific skeletons while public directory data and images are loading", () => {
    expect(exploreSource).toContain("function CreatorDirectorySkeleton()");
    expect(exploreSource).toContain('aria-label="Loading public creator domains"');
    expect(exploreSource).toContain("viewMode === \"creators\" ? (");
    expect(exploreSource).toContain("<CreatorDirectorySkeleton />");
    expect(exploreSource).toContain("creator.bannerUrl && !bannerLoaded && !bannerFailed");
    expect(exploreSource).toContain("!avatarLoaded &&");
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
