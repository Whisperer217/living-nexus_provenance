import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const domainShellPath = path.resolve(process.cwd(), "client/src/pages/CreatorDomainShell.tsx");

describe("Creator Domain shell performance contract", () => {
  it("defers full owner works and analytics until their sections are opened", () => {
    const source = fs.readFileSync(domainShellPath, "utf8");

    expect(source).toContain('const isOwnerWorkSection = isOwner && (activeSection === "artifacts" || activeSection === "drafts")');
    expect(source).toContain('const isAnalyticsSection = isOwner && activeSection === "analytics"');
    expect(source).toContain("enabled: isOwnerWorkSection");
    expect(source).toContain("enabled: isAnalyticsSection");
    expect(source).toContain("refetchOnWindowFocus: false");
  });

  it("loads public works only from the opened Works section", () => {
    const source = fs.readFileSync(domainShellPath, "utf8");

    expect(source).toContain('const isPublicWorkSection = !isOwner && activeSection === "artifacts"');
    expect(source).toContain("discoverInfinite.useInfiniteQuery");
    expect(source).toContain("enabled: Boolean(creatorQuery.data?.id) && isPublicWorkSection");
  });
});
