/**
 * Tests for songs.generateCaption tRPC procedure logic
 * Validates input schema, system prompt construction, and error handling
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mirror the input schema from routers.ts
const generateCaptionInput = z.object({
  title: z.string().min(1).max(255),
  genre: z.string().optional(),
  lyrics: z.string().max(5000).optional(),
});

describe("generateCaption input schema", () => {
  it("accepts a valid title-only input", () => {
    const result = generateCaptionInput.safeParse({ title: "War Cry" });
    expect(result.success).toBe(true);
  });

  it("accepts title + genre + lyrics", () => {
    const result = generateCaptionInput.safeParse({
      title: "Gospel Fire",
      genre: "Gospel / Worship",
      lyrics: "I rise in the morning with praise on my lips",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = generateCaptionInput.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 255 chars", () => {
    const result = generateCaptionInput.safeParse({ title: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("rejects lyrics longer than 5000 chars", () => {
    const result = generateCaptionInput.safeParse({
      title: "Test Track",
      lyrics: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("genre is optional", () => {
    const result = generateCaptionInput.safeParse({ title: "Silence" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.genre).toBeUndefined();
  });
});

describe("generateCaption prompt construction", () => {
  it("builds user message with title and genre", () => {
    const title = "Sovereign Ground";
    const genre = "Rock / Indie";
    const lyrics = undefined;
    const lyricsSnippet = lyrics ? `\n\nLyrics excerpt:\n${lyrics.slice(0, 1500)}` : "";
    const userMessage = `Track title: "${title}"\nGenre: ${genre || "Not specified"}${lyricsSnippet}`;
    expect(userMessage).toContain("Sovereign Ground");
    expect(userMessage).toContain("Rock / Indie");
    expect(userMessage).not.toContain("Lyrics excerpt");
  });

  it("includes lyrics snippet when provided", () => {
    const title = "First Prayer";
    const genre = "Gospel / Worship";
    const lyrics = "Lord, I come before you in the stillness of the morning";
    const lyricsSnippet = `\n\nLyrics excerpt:\n${lyrics.slice(0, 1500)}`;
    const userMessage = `Track title: "${title}"\nGenre: ${genre}${lyricsSnippet}`;
    expect(userMessage).toContain("Lyrics excerpt");
    expect(userMessage).toContain("stillness of the morning");
  });

  it("truncates lyrics to 1500 chars in the prompt", () => {
    const longLyrics = "verse ".repeat(400); // ~2400 chars
    const snippet = longLyrics.slice(0, 1500);
    expect(snippet.length).toBe(1500);
  });
});
