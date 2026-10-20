import { describe, expect, it } from "vitest";
import {
  assertExactPlaylistMembershipIds,
  PlaylistMembershipIntegrityError,
} from "../domains/playlists/playlistMembershipIntegrity";

describe("named playlist membership reorder integrity", () => {
  it("accepts a complete reordered set of membership row IDs, including duplicate Works represented by distinct rows", () => {
    expect(() => assertExactPlaylistMembershipIds([101, 102, 103], [103, 101, 102])).not.toThrow();
  });

  it("accepts an empty playlist only when the supplied order is also empty", () => {
    expect(() => assertExactPlaylistMembershipIds([], [])).not.toThrow();
    expect(() => assertExactPlaylistMembershipIds([], [101])).toThrow(PlaylistMembershipIntegrityError);
  });

  it.each([
    ["duplicate membership id", [101, 102, 103], [103, 101, 101]],
    ["omitted membership id", [101, 102, 103], [103, 101]],
    ["foreign membership id", [101, 102, 103], [103, 101, 999]],
    ["stale membership id", [101, 102], [101, 103]],
  ])("rejects a %s before any position write", (_label, current, submitted) => {
    expect(() => assertExactPlaylistMembershipIds(current, submitted)).toThrow(PlaylistMembershipIntegrityError);
  });
});
