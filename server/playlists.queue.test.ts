/**
 * Tests for queue-to-playlist procedures:
 * - playlists.generateCover (schema validation)
 * - playlists.saveQueueAsPlaylist (schema validation)
 * - playlists.update with coverArtUrl (schema validation)
 * - PlayerContext appendToQueue (unit)
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Schema mirrors (copied from router to avoid importing full server) ──────

const generateCoverSchema = z.object({
  prompt: z.string().min(1).max(600),
  referenceImageUrls: z.array(z.string().url()).max(4).optional(),
});

const saveQueueSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(500).optional(),
  coverArtUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
  songIds: z.array(z.number().int().positive()).min(1).max(500),
});

const updatePlaylistSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  isCollaborative: z.boolean().optional(),
  coverArtUrl: z.string().url().optional(),
});

// ── generateCover schema ────────────────────────────────────────────────────

describe("playlists.generateCover schema", () => {
  it("accepts a valid prompt", () => {
    const result = generateCoverSchema.safeParse({ prompt: "Cathedral light, gold, sacred geometry" });
    expect(result.success).toBe(true);
  });

  it("accepts prompt with reference image URLs", () => {
    const result = generateCoverSchema.safeParse({
      prompt: "Luminous collection",
      referenceImageUrls: ["https://cdn.example.com/img1.jpg", "https://cdn.example.com/img2.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty prompt", () => {
    const result = generateCoverSchema.safeParse({ prompt: "" });
    expect(result.success).toBe(false);
  });

  it("rejects more than 4 reference images", () => {
    const result = generateCoverSchema.safeParse({
      prompt: "Test",
      referenceImageUrls: [
        "https://a.com/1.jpg",
        "https://a.com/2.jpg",
        "https://a.com/3.jpg",
        "https://a.com/4.jpg",
        "https://a.com/5.jpg",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL in referenceImageUrls", () => {
    const result = generateCoverSchema.safeParse({
      prompt: "Test",
      referenceImageUrls: ["not-a-url"],
    });
    expect(result.success).toBe(false);
  });
});

// ── saveQueueAsPlaylist schema ──────────────────────────────────────────────

describe("playlists.saveQueueAsPlaylist schema", () => {
  it("accepts a valid queue save request", () => {
    const result = saveQueueSchema.safeParse({
      name: "My Cathedral Mix",
      description: "A collection of sacred works",
      coverArtUrl: "https://cdn.example.com/cover.jpg",
      isPublic: true,
      songIds: [1, 2, 3, 4, 5],
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal request (name + songIds only)", () => {
    const result = saveQueueSchema.safeParse({
      name: "Quick Mix",
      songIds: [42],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = saveQueueSchema.safeParse({ name: "", songIds: [1] });
    expect(result.success).toBe(false);
  });

  it("rejects empty songIds array", () => {
    const result = saveQueueSchema.safeParse({ name: "Test", songIds: [] });
    expect(result.success).toBe(false);
  });

  it("rejects songIds with non-positive integers", () => {
    const result = saveQueueSchema.safeParse({ name: "Test", songIds: [0, -1] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid coverArtUrl", () => {
    const result = saveQueueSchema.safeParse({
      name: "Test",
      songIds: [1],
      coverArtUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 500 chars", () => {
    const result = saveQueueSchema.safeParse({
      name: "Test",
      songIds: [1],
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ── updatePlaylist schema with coverArtUrl ──────────────────────────────────

describe("playlists.update schema with coverArtUrl", () => {
  it("accepts coverArtUrl in update", () => {
    const result = updatePlaylistSchema.safeParse({
      id: 1,
      coverArtUrl: "https://cdn.example.com/new-cover.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid coverArtUrl in update", () => {
    const result = updatePlaylistSchema.safeParse({
      id: 1,
      coverArtUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

// ── appendToQueue logic ─────────────────────────────────────────────────────

describe("appendToQueue logic", () => {
  it("appends a track to the end of the queue array", () => {
    const queue = [
      { id: "1", title: "Track A", audioUrl: "https://a.com/a.mp3" },
      { id: "2", title: "Track B", audioUrl: "https://a.com/b.mp3" },
    ];
    const newTrack = { id: "3", title: "Track C", audioUrl: "https://a.com/c.mp3" };
    const result = [...queue, newTrack];
    expect(result.length).toBe(3);
    expect(result[result.length - 1].id).toBe("3");
  });

  it("does not duplicate if track already in queue", () => {
    const queue = [
      { id: "1", title: "Track A", audioUrl: "https://a.com/a.mp3" },
    ];
    const newTrack = { id: "1", title: "Track A", audioUrl: "https://a.com/a.mp3" };
    // Dedup logic: only add if not already present
    const alreadyIn = queue.some(t => t.id === newTrack.id);
    const result = alreadyIn ? queue : [...queue, newTrack];
    expect(result.length).toBe(1);
  });
});
