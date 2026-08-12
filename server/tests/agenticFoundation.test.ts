import fs from "node:fs";
import path from "node:path";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import {
  assertMusicDraftCapability,
  assertMusicDraftScope,
} from "../services/agenticFoundation";

describe("Authorized Agent music-Draft foundation", () => {
  const eligibleDraft = { userId: 42, contentType: "audio", status: "Draft", isPublic: false };

  it("accepts only a creator-owned, private audio Draft", () => {
    expect(() => assertMusicDraftScope(eligibleDraft, 42)).not.toThrow();
    expect(() => assertMusicDraftScope({ ...eligibleDraft, userId: 7 }, 42)).toThrow(TRPCError);
    expect(() => assertMusicDraftScope({ ...eligibleDraft, contentType: "lyrics" }, 42)).toThrow(TRPCError);
    expect(() => assertMusicDraftScope({ ...eligibleDraft, status: "Published" }, 42)).toThrow(TRPCError);
    expect(() => assertMusicDraftScope({ ...eligibleDraft, isPublic: true }, 42)).toThrow(TRPCError);
  });

  it("requires explicit capability authority before a Commission may proceed", () => {
    expect(() => assertMusicDraftCapability({ enabled: true })).not.toThrow();
    expect(() => assertMusicDraftCapability({ enabled: false })).toThrow(TRPCError);
    expect(() => assertMusicDraftCapability(undefined)).toThrow(TRPCError);
  });

  it("keeps the Agent Ledger insert-only and keeps raw creator direction out of ledger payloads", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "server/services/agenticFoundation.ts"), "utf8");
    expect(source).toContain("db.insert(agentLedgerEntries).values");
    expect(source).not.toContain("update(agentLedgerEntries)");
    expect(source).not.toContain("delete(agentLedgerEntries)");
    expect(source).toContain("directionHash");
    expect(source).toContain("payload: { commissionId, songId: input.songId, directionHash, commissionStatus: \"active\" }");
  });
});
