import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { CathedralDraftSnapshot, CathedralContextManifest, CathedralSuggestionResult } from "../../shared/creativeCathedral";
import { getDb } from "../utils/db";

export async function getOwnedCathedralSession(sessionId: string, creatorId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  const { creativeCathedralSessions } = await import("../../drizzle/schema");
  const [session] = await db.select().from(creativeCathedralSessions)
    .where(and(eq(creativeCathedralSessions.id, sessionId), eq(creativeCathedralSessions.creatorId, creatorId)))
    .limit(1);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Private Creative Cathedral session not found." });
  return { db, session };
}

export async function createCathedralSession(input: {
  creatorId: number;
  songId?: number;
  stage: "prepare" | "review" | "registered" | "published";
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  const { creativeCathedralSessions } = await import("../../drizzle/schema");
  const id = nanoid(24);
  await db.insert(creativeCathedralSessions).values({
    id,
    creatorId: input.creatorId,
    songId: input.songId,
    stage: input.stage,
  });
  return { id, creatorId: input.creatorId, songId: input.songId ?? null, stage: input.stage };
}

export async function getLatestCathedralSession(creatorId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  const { creativeCathedralSessions } = await import("../../drizzle/schema");
  const [session] = await db.select().from(creativeCathedralSessions)
    .where(eq(creativeCathedralSessions.creatorId, creatorId))
    .orderBy(desc(creativeCathedralSessions.updatedAt))
    .limit(1);
  return session ?? null;
}

export async function saveCathedralDraft(input: {
  sessionId: string;
  creatorId: number;
  draft: CathedralDraftSnapshot;
  uiState?: { activePanel?: "assistant" | "record" };
}) {
  const { db, session } = await getOwnedCathedralSession(input.sessionId, input.creatorId);
  const { creativeCathedralSessions } = await import("../../drizzle/schema");
  await db.update(creativeCathedralSessions).set({
    draftSnapshotJson: input.draft,
    uiStateJson: input.uiState,
    updatedAt: new Date(),
  }).where(and(eq(creativeCathedralSessions.id, session.id), eq(creativeCathedralSessions.creatorId, input.creatorId)));
  return { ok: true, updatedAt: new Date() };
}

export async function listCathedralSuggestions(sessionId: string, creatorId: number) {
  const { db, session } = await getOwnedCathedralSession(sessionId, creatorId);
  const { creativeCathedralSuggestions } = await import("../../drizzle/schema");
  return db.select().from(creativeCathedralSuggestions)
    .where(and(eq(creativeCathedralSuggestions.sessionId, session.id), eq(creativeCathedralSuggestions.creatorId, creatorId)))
    .orderBy(desc(creativeCathedralSuggestions.createdAt));
}

export async function recordCathedralConsent(input: {
  sessionId: string;
  creatorId: number;
  manifestHash: string;
}) {
  const { db, session } = await getOwnedCathedralSession(input.sessionId, input.creatorId);
  const { creativeCathedralDecisions } = await import("../../drizzle/schema");
  await db.insert(creativeCathedralDecisions).values({
    id: nanoid(24),
    sessionId: session.id,
    creatorId: input.creatorId,
    decision: "consent_context",
    contextManifestHash: input.manifestHash,
  });
}

export async function createCathedralSuggestion(input: {
  sessionId: string;
  creatorId: number;
  manifest: CathedralContextManifest;
  result: CathedralSuggestionResult;
  modelRef: string;
}) {
  const { db, session } = await getOwnedCathedralSession(input.sessionId, input.creatorId);
  const { creativeCathedralSuggestions } = await import("../../drizzle/schema");
  const id = nanoid(24);
  await db.insert(creativeCathedralSuggestions).values({
    id,
    sessionId: session.id,
    creatorId: input.creatorId,
    songId: session.songId,
    kind: "media_facts",
    proposalJson: input.result,
    evidenceJson: input.result.evidence,
    sourceManifestJson: input.manifest,
    modelRef: input.modelRef,
  });
  return { id, status: "proposed" as const, ...input.result, modelRef: input.modelRef };
}

export async function resolveCathedralSuggestion(input: {
  sessionId: string;
  suggestionId: string;
  creatorId: number;
  decision: "apply_to_form" | "edit_first" | "dismiss";
  patchOverride?: CathedralSuggestionResult["patch"];
}) {
  const { db, session } = await getOwnedCathedralSession(input.sessionId, input.creatorId);
  const { creativeCathedralDecisions, creativeCathedralSuggestions } = await import("../../drizzle/schema");
  const [suggestion] = await db.select().from(creativeCathedralSuggestions)
    .where(and(
      eq(creativeCathedralSuggestions.id, input.suggestionId),
      eq(creativeCathedralSuggestions.sessionId, session.id),
      eq(creativeCathedralSuggestions.creatorId, input.creatorId),
    )).limit(1);
  if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Private suggestion not found." });
  if (suggestion.status !== "proposed" && input.decision !== "edit_first") {
    throw new TRPCError({ code: "CONFLICT", message: "This suggestion has already been resolved." });
  }
  const stored = suggestion.proposalJson as CathedralSuggestionResult;
  const patch = input.patchOverride ?? stored.patch;
  await db.insert(creativeCathedralDecisions).values({
    id: nanoid(24),
    sessionId: session.id,
    suggestionId: suggestion.id,
    creatorId: input.creatorId,
    decision: input.decision,
    targetFieldsJson: Object.keys(patch),
  });
  if (input.decision === "apply_to_form" || input.decision === "dismiss") {
    await db.update(creativeCathedralSuggestions).set({
      status: input.decision === "apply_to_form" ? "applied_to_form" : "dismissed",
      resolvedAt: new Date(),
    }).where(and(
      eq(creativeCathedralSuggestions.id, suggestion.id),
      eq(creativeCathedralSuggestions.creatorId, input.creatorId),
    ));
  }
  return { patch, decision: input.decision };
}

export async function clearCathedralWorkspace(sessionId: string, creatorId: number) {
  const { db, session } = await getOwnedCathedralSession(sessionId, creatorId);
  const { creativeCathedralDecisions, creativeCathedralSessions, creativeCathedralSuggestions } = await import("../../drizzle/schema");
  await db.delete(creativeCathedralDecisions)
    .where(and(eq(creativeCathedralDecisions.sessionId, session.id), eq(creativeCathedralDecisions.creatorId, creatorId)));
  await db.delete(creativeCathedralSuggestions)
    .where(and(eq(creativeCathedralSuggestions.sessionId, session.id), eq(creativeCathedralSuggestions.creatorId, creatorId)));
  await db.delete(creativeCathedralSessions)
    .where(and(eq(creativeCathedralSessions.id, session.id), eq(creativeCathedralSessions.creatorId, creatorId)));
  return { ok: true };
}
