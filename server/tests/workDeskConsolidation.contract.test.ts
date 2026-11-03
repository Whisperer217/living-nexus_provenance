import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Work Desk consolidation", () => {
  it("registers an additive Work Desk route without removing legacy management routes", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('const WorkDeskPage = lazy(() => import("./pages/WorkDeskPage"));');
    expect(app).toContain('path="/work-desk" component={WorkDeskPage}');
    expect(app).toContain('path="/studio" component={CreatorStudioHome}');
    expect(app).toContain('path="/creator/collections" component={CollectionsWorkspacePage}');
    expect(app).toContain('path="/manage" component={LoopManagePage}');
  });

  it("reuses canonical inventory, editor context, and existing relationship destinations", () => {
    const desk = read("client/src/pages/WorkDeskPage.tsx");
    expect(desk).toContain("trpc.songs.mySongs.useQuery");
    expect(desk).toContain("useWorkEditorActions");
    expect(desk).toContain("openEditor(asEditorWork(selected))");
    expect(desk).toContain('href="/creator/collections"');
    expect(desk).toContain('href="/profile?tab=collections"');
    expect(desk).toContain("WIDs preserved");
    expect(desk).toContain("does not alter WIDs");
  });

  it("makes Work Desk the clear Creator Studio entry without deleting old pages", () => {
    const studio = read("client/src/studio/CreatorStudioHome.tsx");
    expect(studio).toContain('href="/work-desk"');
    expect(studio).toContain("Open Work Desk");
    expect(studio).toContain('href="/creator/collections"');
    expect(studio).toContain('href="/manage"');
  });
});
