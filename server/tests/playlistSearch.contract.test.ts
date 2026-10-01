import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const playlistsPagePath = path.resolve(process.cwd(), "client/src/pages/PlaylistsPage.tsx");

describe("playlist registry search contract", () => {
  it("debounces input and displays results only for the current query snapshot", () => {
    const source = fs.readFileSync(playlistsPagePath, "utf8");

    expect(source).toContain("useDebouncedValue(query.trim(), 300)");
    expect(source).toContain("const queryIsCurrent = query.trim() === debouncedQuery");
    expect(source).toContain("const canSearch = open && queryIsCurrent && debouncedQuery.length >= 2");
    expect(source).toContain("const songs = canSearch ? results?.songs ?? [] : []");
  });

  it("refreshes both playlist detail and playlist list after adding a work", () => {
    const source = fs.readFileSync(playlistsPagePath, "utf8");

    expect(source).toContain("utils.playlists.getById.invalidate({ id: playlistId })");
    expect(source).toContain("utils.playlists.mine.invalidate()");
  });
});
