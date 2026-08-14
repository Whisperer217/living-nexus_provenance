/**
 * ADR-023 Phase 1 — Nexus Context contract.
 *
 * The panel accepts canonical references, never arbitrary rendered objects.
 * This module is deliberately side-effect free: it does not fetch, persist,
 * navigate, mutate playback, or permit registry/commerce operations.
 */

export const NEXUS_CONTEXT_KINDS = [
  "explore",
  "work",
  "creator",
  "provenance",
  "now-playing",
] as const;

export type NexusContextKind = (typeof NEXUS_CONTEXT_KINDS)[number];
export type ExploreFeed = "new" | "witnessed" | "trending" | "gems";
export type NexusContextAction = "open" | "verify" | "play";
export type NexusContextStatus = "ready" | "loading" | "empty" | "not-found" | "unauthorized" | "error";
export type NexusContextSource = "registry" | "catalog" | "player" | "search" | "agent-suggestion";

export type NexusContextRef =
  | { version: 1; kind: "explore"; feed: ExploreFeed }
  | { version: 1; kind: "work"; songId: number; wid?: string }
  | { version: 1; kind: "creator"; creatorId: number }
  | { version: 1; kind: "provenance"; wid: string }
  | { version: 1; kind: "now-playing" };

export interface NexusContextSuggestion {
  ref: NexusContextRef;
  source: "agent-suggestion";
  confidence: "deterministic" | "suggested";
  label: string;
}

export interface NexusContextProvenance {
  label: string;
  route: string;
  wid?: string;
}

export interface NexusContextResolution {
  ref: NexusContextRef;
  visibility: "public" | "viewer-owned" | "creator-owned";
  status: NexusContextStatus;
  source: NexusContextSource;
  provenance: NexusContextProvenance[];
  actions: NexusContextAction[];
}

const EXPLORE_FEEDS: readonly ExploreFeed[] = ["new", "witnessed", "trending", "gems"];

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

/** Reject untyped Agent payloads, mutation attempts, and unsupported future versions. */
export function isNexusContextRef(value: unknown): value is NexusContextRef {
  if (!value || typeof value !== "object") return false;
  const ref = value as Record<string, unknown>;
  if (ref.version !== 1 || typeof ref.kind !== "string") return false;

  switch (ref.kind) {
    case "explore":
      return hasOnlyKeys(ref, ["version", "kind", "feed"])
        && typeof ref.feed === "string"
        && EXPLORE_FEEDS.includes(ref.feed as ExploreFeed);
    case "work":
      return hasOnlyKeys(ref, ["version", "kind", "songId", "wid"])
        && isPositiveInteger(ref.songId)
        && (ref.wid === undefined || isNonEmptyString(ref.wid));
    case "creator":
      return hasOnlyKeys(ref, ["version", "kind", "creatorId"]) && isPositiveInteger(ref.creatorId);
    case "provenance":
      return hasOnlyKeys(ref, ["version", "kind", "wid"]) && isNonEmptyString(ref.wid);
    case "now-playing":
      return hasOnlyKeys(ref, ["version", "kind"]);
    default:
      return false;
  }
}

export function contextRefKey(ref: NexusContextRef): string {
  switch (ref.kind) {
    case "explore": return `explore:${ref.feed}`;
    case "work": return `work:${ref.songId}`;
    case "creator": return `creator:${ref.creatorId}`;
    case "provenance": return `provenance:${ref.wid}`;
    case "now-playing": return "now-playing";
  }
}

/** Only explicit user actions may use these routes. No route represents a mutation. */
export function contextRoute(ref: NexusContextRef, action: Exclude<NexusContextAction, "play"> = "open"): string | null {
  if (action === "verify") {
    if (ref.kind === "provenance") return `/verify/${encodeURIComponent(ref.wid)}`;
    if (ref.kind === "work" && ref.wid) return `/verify/${encodeURIComponent(ref.wid)}`;
    return null;
  }

  switch (ref.kind) {
    case "explore": return "/explore";
    case "work": return `/song/${ref.songId}`;
    case "creator": return `/creator/${ref.creatorId}`;
    case "provenance": return `/verify/${encodeURIComponent(ref.wid)}`;
    case "now-playing": return null;
  }
}

export function allowedContextActions(ref: NexusContextRef): NexusContextAction[] {
  switch (ref.kind) {
    case "now-playing": return ["play"];
    case "provenance": return ["open", "verify"];
    case "work": return ref.wid ? ["open", "verify", "play"] : ["open", "play"];
    case "creator":
    case "explore": return ["open"];
  }
}

export function createContextSuggestion(ref: NexusContextRef, label: string, confidence: NexusContextSuggestion["confidence"] = "suggested"): NexusContextSuggestion {
  return { ref, source: "agent-suggestion", confidence, label };
}

export function createPendingResolution(ref: NexusContextRef, source: NexusContextSource): NexusContextResolution {
  return {
    ref,
    visibility: "public",
    status: "loading",
    source,
    provenance: [],
    actions: allowedContextActions(ref),
  };
}
