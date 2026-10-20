import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("Collection Studio recovery contracts", () => {
  const studio = () => read("client/src/pages/CollectionStudioPage.tsx");

  it("resolves authentication before rendering guest denial or starting the primary query", () => {
    const source = studio();

    expect(source).toContain("loading: authLoading, error: authError, refresh: refreshAuth");
    expect(source).toContain("enabled: !authLoading && !!user && hasValidCollectionId");
    expect(source.indexOf("if (authLoading)")).toBeLessThan(source.indexOf("if (!user)"));
    expect(source.indexOf("if (authError && !user)")).toBeLessThan(source.indexOf("if (!user)"));
    expect(source).toContain("void refreshAuth()");
  });

  it("keeps failed primary loads bounded and recoverable without cache resets, navigation delays, or player changes", () => {
    const source = studio();

    expect(source).toContain("retry: false");
    expect(source).toContain("refetchOnWindowFocus: false");
    expect(source).toContain("refetch: refetchCollection");
    expect(source).toContain("void refetchCollection()");
    expect(source).toContain("disabled={collectionIsFetching}");
    expect(source).toContain("The collection and your active player have been left unchanged.");
    expect(source).not.toContain("setTimeout(() => refetchCollection");
    expect(source).not.toContain("localStorage.clear");
    expect(source).not.toContain("caches.delete");
  });

  it("uses a stable diagnostic reference that excludes user, collection, and message data", () => {
    const source = studio();
    const helper = source.slice(source.indexOf("function getCollectionLoadDiagnosticId"), source.indexOf("export default function CollectionStudioPage"));

    expect(helper).toContain("CS-GET-COLLECTION-");
    expect(helper).toContain("data?.code");
    expect(helper).toContain("replace(/[^A-Za-z0-9_]/g, \"_\").toUpperCase()");
    expect(helper).not.toContain("error.message");
    expect(helper).not.toContain("collectionId");
    expect(helper).not.toContain("user.");
    expect(helper).not.toContain("Date.now");
    expect(helper).not.toContain("Math.random");
  });

  it("returns recovery and success links to the selected Archive collection", () => {
    const source = studio();
    const archive = read("client/src/pages/ArchivePage.tsx");

    expect(source).toContain("/archive?tab=collections&collection=${collectionId}");
    expect(source).toContain("navigate(archiveCollectionHref)");
    expect(source).toContain("href={archiveCollectionHref}");
    expect(archive).toContain("deepLinkCollectionId");
    expect(archive).toContain("initialExpandedId={deepLinkCollectionId}");
  });

  it("keeps Version History after primary success and retains the existing global player authority", () => {
    const source = studio();

    expect(source.indexOf("if (collectionError || !data)")).toBeLessThan(source.indexOf("<VersionHistoryPanel collectionId={collectionId} />"));
    expect(source).toContain("const { playQueueAt } = usePlayer();");
    expect(source).not.toContain("PlayerProvider");
    expect(source).not.toContain("GlobalPlayer");
    expect(source).not.toContain("resetQueue");
  });
});
