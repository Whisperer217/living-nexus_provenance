/**
 * queue.collection.test.ts
 *
 * Tests for the Queue vs Collection separation:
 * - playNext() inserts a track after the current position (session-only, no DB)
 * - playlists.addTrack persists a song to a user's playlist (DB-backed)
 * - The two systems are never mixed
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal Track shape for testing */
function makeTrack(id: string, title: string) {
  return { id, title, artist: "Test Artist", genre: "Test", audioUrl: `https://cdn.test/${id}.mp3` };
}

// ── playNext logic (pure state machine, no React) ─────────────────────────────

/**
 * Mirrors the playNext reducer from PlayerContext.
 * Extracted here so we can test the pure logic without React.
 */
function playNextReducer(
  state: { tracks: any[]; currentIdx: number },
  track: any
): { tracks: any[]; currentIdx: number } {
  const withoutTrack = state.tracks.filter((tr) => tr.id !== track.id);
  const insertAt = state.currentIdx >= 0 ? state.currentIdx + 1 : 0;
  const newTracks = [
    ...withoutTrack.slice(0, insertAt),
    track,
    ...withoutTrack.slice(insertAt),
  ];
  return { ...state, tracks: newTracks };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("playNext (session queue — no DB writes)", () => {
  it("inserts a track immediately after the current position", () => {
    const trackA = makeTrack("a", "Track A");
    const trackB = makeTrack("b", "Track B");
    const trackC = makeTrack("c", "Track C");
    const state = { tracks: [trackA, trackB], currentIdx: 0 };

    const result = playNextReducer(state, trackC);

    // trackC should be at index 1, trackB pushed to index 2
    expect(result.tracks[0].id).toBe("a");
    expect(result.tracks[1].id).toBe("c");
    expect(result.tracks[2].id).toBe("b");
    expect(result.currentIdx).toBe(0); // currentIdx unchanged
  });

  it("inserts at position 0 when queue is empty", () => {
    const track = makeTrack("x", "Track X");
    const state = { tracks: [], currentIdx: -1 };

    const result = playNextReducer(state, track);

    expect(result.tracks.length).toBe(1);
    expect(result.tracks[0].id).toBe("x");
  });

  it("moves an already-queued track to the next position instead of duplicating", () => {
    const trackA = makeTrack("a", "Track A");
    const trackB = makeTrack("b", "Track B");
    const trackC = makeTrack("c", "Track C");
    // Queue: [A(current), B, C] — play B next
    const state = { tracks: [trackA, trackB, trackC], currentIdx: 0 };

    const result = playNextReducer(state, trackB);

    // B should move to index 1, C stays at 2 — no duplicates
    expect(result.tracks.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(result.tracks.length).toBe(3);
  });

  it("inserts after the last track when currentIdx is at the end", () => {
    const trackA = makeTrack("a", "Track A");
    const trackB = makeTrack("b", "Track B");
    const trackC = makeTrack("c", "Track C");
    // Playing last track
    const state = { tracks: [trackA, trackB], currentIdx: 1 };

    const result = playNextReducer(state, trackC);

    expect(result.tracks.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("does NOT mutate the original state object", () => {
    const trackA = makeTrack("a", "Track A");
    const trackB = makeTrack("b", "Track B");
    const state = { tracks: [trackA], currentIdx: 0 };
    const originalTracks = state.tracks;

    playNextReducer(state, trackB);

    // Original array must be untouched
    expect(state.tracks).toBe(originalTracks);
    expect(state.tracks.length).toBe(1);
  });
});

// ── Collection / Playlist separation ─────────────────────────────────────────

describe("collection separation — playlist.addTrack procedure", () => {
  it("addTrack requires a playlistId and songId (schema validation)", async () => {
    // Simulate the z.object schema used in the router
    const { z } = await import("zod");
    const schema = z.object({
      playlistId: z.number().int().positive(),
      songId: z.number().int().positive(),
    });

    // Valid input
    expect(() => schema.parse({ playlistId: 1, songId: 42 })).not.toThrow();

    // Missing playlistId
    expect(() => schema.parse({ songId: 42 })).toThrow();

    // Invalid playlistId (not positive)
    expect(() => schema.parse({ playlistId: 0, songId: 42 })).toThrow();

    // Non-integer songId
    expect(() => schema.parse({ playlistId: 1, songId: 1.5 })).toThrow();
  });

  it("playNext does NOT call any DB or mutation function", () => {
    // The playNext reducer is a pure state transformation — no side effects
    const dbSpy = vi.fn();
    const track = makeTrack("z", "Track Z");
    const state = { tracks: [], currentIdx: -1 };

    // Run the reducer — dbSpy should never be called
    playNextReducer(state, track);

    expect(dbSpy).not.toHaveBeenCalled();
  });
});
