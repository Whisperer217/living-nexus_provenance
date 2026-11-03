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

  it("composes recent activity from existing Works and collection projections", () => {
    const desk = read("client/src/pages/WorkDeskPage.tsx");
    expect(desk).toContain("updatedAt ?? work.createdAt");
    expect(desk).toContain("releasesQuery.data");
    expect(desk).toContain("playlistsQuery.data");
    expect(desk).toContain("Latest edited records");
    expect(desk).toContain("Read-only view");
    expect(desk).toContain("slice(0, 8)");
    expect(desk).toContain("onSelectWork={setSelectedId}");
    expect(desk).not.toContain("createActivity");
  });

  it("reuses protected album procedures and keeps sealed membership immutable", () => {
    const desk = read("client/src/pages/WorkDeskPage.tsx");
    const studio = read("client/src/pages/CollectionStudioPage.tsx");
    const router = read("server/routers/collectionStudio.ts");
    expect(desk).toContain("trpc.songs.getMyCollections.useQuery");
    expect(desk).toContain("trpc.collectionStudio.getCollection.useQuery");
    expect(desk).toContain("trpc.collectionStudio.reorderTracks.useMutation");
    expect(desk).toContain("trpc.collectionStudio.updateMeta.useMutation");
    expect(desk).toContain("Membership additions/removals remain locked");
    expect(desk).toContain("Move ${track.title} up");
    expect(desk).toContain("Move ${track.title} down");
    expect(desk).toContain('href={`/studio/release/${draft.id}`}');
    expect(studio).toContain("trpc.collectionStudio.reorderTracks.useMutation");
    expect(router).toContain("requireMutableCollectionComposition");
    expect(router).toContain("reorderTracks: protectedProcedure");
    expect(router).toContain("updateMeta: protectedProcedure");
  });

  it("keeps album enhancements lightweight and uses the canonical playback authority", () => {
    const desk = read("client/src/pages/WorkDeskPage.tsx");
    expect(desk).toContain("formatTrackDuration(track.durationSeconds)");
    expect(desk).toContain("selectedTrackIds");
    expect(desk).toContain("Move selected to top");
    expect(desk).toContain("Move selected to bottom");
    expect(desk).toContain("addAndPlay({");
    expect(desk).toContain("Album preview");
    expect(desk).not.toContain("new Audio(");
    expect(desk).not.toContain("<audio");
  });

  it("connects Playlist Rack to existing Named Playlist authority", () => {
    const desk = read("client/src/pages/WorkDeskPage.tsx");
    const styles = read("client/src/index.css");
    const router = read("server/routers/playlists.ts");
    expect(desk).toContain("function PlaylistRack");
    expect(desk).toContain("trpc.playlists.getById.useQuery");
    expect(desk).toContain("trpc.playlists.addTrack.useMutation");
    expect(desk).toContain("trpc.playlists.removeTrack.useMutation");
    expect(desk).toContain("trpc.playlists.reorder.useMutation");
    expect(desk).toContain("selectedWork.id");
    expect(desk).toContain("duplicates remain distinct");
    expect(desk).toContain("Playlist Rack");
    expect(desk).toContain("draggedTrackId");
    expect(desk).toContain("dragOverTrackId");
    expect(desk).toContain("ln-playlist-rack-row--dragging");
    expect(desk).toContain("ln-playlist-rack-row--drop-target");
    expect(styles).toContain(".ln-playlist-rack-row:hover");
    expect(styles).toContain(".ln-playlist-rack-row--dragging");
    expect(styles).toContain(".ln-playlist-rack-row--drop-target");
    expect(styles).toContain(".ln-playlist-rack-row");
    expect(router).toContain("addTrack: protectedProcedure");
    expect(router).toContain("removeTrack: protectedProcedure");
    expect(router).toContain("reorder: protectedProcedure");
    expect(router).toContain("isPlaylistMember(input.playlistId, ctx.user.id)");
    expect(desk).not.toContain("createPlaylist({");
  });
});
