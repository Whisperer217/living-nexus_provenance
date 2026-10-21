import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveUploadEntry } from "../../client/src/lib/uploadEntryRoute";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Archive Draft continuation route", () => {
  it("keeps a valid Draft identity and its complete media/type query context on the existing Draft editor", () => {
    const destination = resolveUploadEntry("editId=60001&type=audio&media=existing");

    expect(destination).toEqual({ kind: "draft-resume", draftId: 60001 });
  });

  it("preserves normal registration and invalid legacy queries when redirecting to the canonical Manifestation Studio", () => {
    expect(resolveUploadEntry("type=lyrics&title=Living%20Testimony")).toEqual({
      kind: "manifest",
      href: "/manifest?type=lyrics&title=Living%20Testimony",
    });
    expect(resolveUploadEntry("?editId=0&type=audio")).toEqual({
      kind: "manifest",
      href: "/manifest?editId=0&type=audio",
    });
    expect(resolveUploadEntry("editId=not-a-draft&type=audio")).toEqual({
      kind: "manifest",
      href: "/manifest?editId=not-a-draft&type=audio",
    });
  });

  it("hands ordinary Upload parameters to Manifestation Studio, preserves them through guest sign-in, then cleans the URL after authentication", () => {
    const studio = read("client/src/pages/manifestation-studio/ManifestationStudio.tsx");
    const queryStart = studio.indexOf('const params = new URLSearchParams(window.location.search)');
    const cleanup = studio.indexOf('window.history.replaceState({}, "", window.location.pathname);', queryStart);

    expect(queryStart).toBeGreaterThanOrEqual(0);
    expect(studio.indexOf('const typeParam = params.get("type");', queryStart)).toBeGreaterThan(queryStart);
    expect(studio.indexOf('const title = params.get("title"); if (title) prefill.title = title;', queryStart)).toBeGreaterThan(queryStart);
    expect(studio.indexOf("setEntered(true);", queryStart)).toBeGreaterThan(queryStart);
    expect(cleanup).toBeGreaterThan(queryStart);
    expect(studio.lastIndexOf("if (isAuthenticated) {", cleanup)).toBeGreaterThan(queryStart);
    expect(studio).toContain("}, [isAuthenticated]);");
    expect(studio).toContain("getLoginUrl(`${window.location.pathname}${window.location.search}`)");
  });

  it("keeps the route handoff attached to the existing protected Draft hydrator rather than duplicating persistence logic", () => {
    const app = read("client/src/App.tsx");
    const upload = read("client/src/pages/UploadPage.tsx");
    const songs = read("server/routers/songs.ts");

    expect(app).toContain('path="/upload" component={UploadEntryRoute}');
    expect(app).toContain("resolveUploadEntry(window.location.search)");
    expect(app).toContain("<UploadPage />");
    expect(upload).toContain("trpc.songs.getMyDraft.useQuery");
    expect(upload).toContain('params.get("editId")');
    expect(upload).toContain('toast.success("Draft loaded — continue where you left off")');
    expect(upload).toContain("if (isAuthenticated && (qTitle || qGenre || qMood || qTags || qType || qEditId)) {");
    expect(upload).toContain("}, [isAuthenticated]);");
    expect(songs).toContain("getMyDraft: protectedProcedure");
    expect(songs).toContain("eqOp(songsTable.userId, ctx.user.id)");
  });

  it("keeps unauthenticated access inside the established UploadPage sign-in gate", () => {
    const upload = read("client/src/pages/UploadPage.tsx");

    expect(upload).toContain("if (!isAuthenticated) return (");
    expect(upload).toContain("Sign In Required");
    expect(upload).toContain("getLoginUrl(`${window.location.pathname}${window.location.search}`)");
  });

  it("resolves the retired entry from the actual browser URL rather than dropping Draft context in router state", () => {
    const app = read("client/src/App.tsx");

    expect(app).toContain("resolveUploadEntry(window.location.search)");
  });
});
