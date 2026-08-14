import { describe, expect, it } from "vitest";
import {
  allowedContextActions,
  contextRefKey,
  contextRoute,
  createContextSuggestion,
  createPendingResolution,
  isNexusContextRef,
  type NexusContextRef,
} from "../../client/src/lib/nexusContext";

describe("ADR-023 Nexus Context contract", () => {
  it("accepts only the approved Phase 1 canonical reference shapes", () => {
    const references: NexusContextRef[] = [
      { version: 1, kind: "explore", feed: "trending" },
      { version: 1, kind: "work", songId: 42, wid: "WID-MUS-42" },
      { version: 1, kind: "creator", creatorId: 7 },
      { version: 1, kind: "provenance", wid: "WID-MUS-42" },
      { version: 1, kind: "now-playing" },
    ];

    for (const ref of references) {
      expect(isNexusContextRef(ref)).toBe(true);
      expect(contextRefKey(ref)).not.toBe("");
    }
  });

  it("rejects malformed, future-version, unsupported, and mutation-shaped payloads", () => {
    expect(isNexusContextRef({ version: 2, kind: "work", songId: 42 })).toBe(false);
    expect(isNexusContextRef({ version: 1, kind: "work", songId: 0 })).toBe(false);
    expect(isNexusContextRef({ version: 1, kind: "work", songId: 42, action: "publish" })).toBe(false);
    expect(isNexusContextRef({ version: 1, kind: "diary", diaryWid: "WID-CNV-1" })).toBe(false);
    expect(isNexusContextRef({ version: 1, kind: "provenance", wid: "" })).toBe(false);
  });

  it("exposes only deliberate Phase 1 routes and user actions", () => {
    const work: NexusContextRef = { version: 1, kind: "work", songId: 42, wid: "WID-MUS-42" };
    expect(contextRoute(work)).toBe("/song/42");
    expect(contextRoute(work, "verify")).toBe("/verify/WID-MUS-42");
    expect(allowedContextActions(work)).toEqual(["open", "verify", "play"]);
    expect(allowedContextActions({ version: 1, kind: "now-playing" })).toEqual(["play"]);
    expect(contextRoute({ version: 1, kind: "creator", creatorId: 7 }, "verify")).toBeNull();
  });

  it("marks Agent output as a suggestion and keeps resolution status read-only", () => {
    const ref: NexusContextRef = { version: 1, kind: "provenance", wid: "WID-MUS-42" };
    const suggestion = createContextSuggestion(ref, "Open witness record", "deterministic");
    const resolution = createPendingResolution(ref, "agent-suggestion");

    expect(suggestion.source).toBe("agent-suggestion");
    expect(suggestion.confidence).toBe("deterministic");
    expect(resolution.status).toBe("loading");
    expect(resolution.actions).toEqual(["open", "verify"]);
  });
});
