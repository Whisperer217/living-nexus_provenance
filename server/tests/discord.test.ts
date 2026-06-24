import { describe, expect, it, vi, beforeEach } from "vitest";
import { formatDiscordMessage, buildRateLimitKey } from "../services/discord";

// ── Unit tests for Discord webhook helper functions ──────────────────────────
// We test the pure formatting/key-building logic without making real HTTP calls.

describe("formatDiscordMessage", () => {
  it("formats wid_minted event correctly", () => {
    const msg = formatDiscordMessage("wid_minted", {
      title: "Echoes of Dawn",
      creatorName: "Aria Nova",
      witnessId: "WID-MUS-abc123",
    });
    expect(msg).toContain("Echoes of Dawn");
    expect(msg).toContain("Aria Nova");
    expect(msg).toContain("WID-MUS-abc123");
  });

  it("formats track_upload event correctly", () => {
    const msg = formatDiscordMessage("track_upload", {
      title: "Silent Witness",
      creatorName: "Marcus Bell",
      contentType: "audio",
      genre: "Ambient",
    });
    expect(msg).toContain("Silent Witness");
    expect(msg).toContain("Marcus Bell");
    expect(msg).toContain("Ambient");
  });

  it("formats tip_received event correctly", () => {
    const msg = formatDiscordMessage("tip_received", {
      creatorName: "Aria Nova",
      amountCents: 500,
      songTitle: "Echoes of Dawn",
      fanName: "A supporter",
    });
    expect(msg).toContain("$5.00");
    expect(msg).toContain("Echoes of Dawn");
    expect(msg).toContain("Aria Nova");
  });

  it("formats jukebox_room event correctly", () => {
    const msg = formatDiscordMessage("jukebox_room", {
      roomCode: "NEXUS1",
      hostName: "DJ Witness",
    });
    expect(msg).toContain("NEXUS1");
    expect(msg).toContain("DJ Witness");
  });

  it("formats like_surge event correctly", () => {
    const msg = formatDiscordMessage("like_surge", {
      title: "Echoes of Dawn",
      creatorName: "Aria Nova",
      newLikes: 50,
    });
    expect(msg).toContain("50");
    expect(msg).toContain("Echoes of Dawn");
  });

  it("handles unknown event type gracefully", () => {
    const msg = formatDiscordMessage("unknown_event" as any, {});
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe("buildRateLimitKey", () => {
  it("builds a unique key per userId and event", () => {
    const key1 = buildRateLimitKey(1, "wid_minted");
    const key2 = buildRateLimitKey(1, "track_upload");
    const key3 = buildRateLimitKey(2, "wid_minted");
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);
  });

  it("returns the same key for same userId and event", () => {
    const key1 = buildRateLimitKey(42, "tip_received");
    const key2 = buildRateLimitKey(42, "tip_received");
    expect(key1).toBe(key2);
  });
});
