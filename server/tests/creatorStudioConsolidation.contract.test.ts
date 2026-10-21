import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("same-origin Creator Studio consolidation", () => {
  const app = read("client/src/App.tsx");
  const studio = read("client/src/studio/CreatorStudioHome.tsx");
  const creatorDomain = read("client/src/pages/loop/LoopCreatorPage.tsx");
  const manage = read("client/src/pages/loop/LoopManagePage.tsx");

  it("loads Creator Studio as an independently lazy-loaded same-origin route without shadowing existing Studio routes", () => {
    expect(app).toContain('const CreatorStudioHome = lazy(() => import("./studio/CreatorStudioHome"));');
    expect(app).toContain('path="/studio/release/:id"');
    expect(app).toContain('path="/studio/collection/:id"');
    expect(app).toContain('path="/studio" component={CreatorStudioHome}');
    expect(app.indexOf('path="/studio/release/:id"')).toBeLessThan(app.indexOf('path="/studio" component={CreatorStudioHome}'));
    expect(app.indexOf('path="/studio/collection/:id"')).toBeLessThan(app.indexOf('path="/studio" component={CreatorStudioHome}'));
    expect(app).not.toContain('import("./pages/CreatorStudioPage")');
  });

  it("routes Creator Domain and legacy Manage surfaces into the one Studio hub without retiring their established workflows", () => {
    expect(creatorDomain).toContain('<Link href="/studio">');
    expect(creatorDomain).toContain("Creator Studio");
    expect(manage).toContain('{ href: "/studio", icon: Settings, label: "Creator Studio" }');
    expect(manage).toContain('href="/manifest"');
    expect(manage).toContain("Manage your works");
  });

  it("composes existing owner-authorized surfaces instead of duplicating registry, mutation, or playback authority", () => {
    expect(studio).toContain("trpc.songs.mySongs.useQuery");
    expect(studio).toContain("trpc.releaseDrafts.listMine.useQuery");
    expect(studio).toContain("trpc.playlists.mine.useQuery");
    expect(studio).toContain("useWorkEditorActions");
    expect(studio).toContain("openEditor(asCreativeDrawerSong(work))");
    expect(studio).toContain('href="/creator/collections"');
    expect(studio).toContain('href="/my-archive/export"');
    expect(studio).toContain('href="/settings/payouts"');
    expect(studio).not.toContain("usePlayer(");
    expect(studio).not.toContain("playQueueAt(");
    expect(studio).not.toContain("updateMetadata.useMutation");
    expect(studio).not.toContain("createClient(");
    expect(studio).not.toContain("fetch(");
  });

  it("keeps the companion player explicitly external and non-authoritative", () => {
    expect(studio).toContain('https://provenanceplayer.netlify.app/#/home');
    expect(studio).toContain('target="_blank"');
    expect(studio).toContain('rel="noopener noreferrer"');
    expect(studio).toContain("does not synchronize accounts, verify WIDs, or replace the Living Nexus queue");
  });
});
