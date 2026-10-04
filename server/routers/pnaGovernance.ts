import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  PNA_PROFILE_IDS,
  PNA_STEWARDSHIP_PROFILES,
  type PNAContextSourceKind,
  type PNAProfileId,
} from "../../shared/pnaGovernance";
import {
  pnaActionReceipts,
  pnaArtifactSources,
  pnaArtifacts,
  pnaContextEntries,
  pnaContextEnvelopes,
  pnaContextUseEntries,
  pnaContextUseReceipts,
  pnaProfileSettings,
  quiverImages,
} from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../utils/db";
import {
  getOrCreateActiveEnvelope,
  preparePnaContextUse,
  requireOwnedPnaThread,
  resolveOwnedPnaContextSource,
} from "../utils/pnaGovernance";

const profileSchema = z.enum(PNA_PROFILE_IDS);
const sourceSchema = z.enum(["work", "wid", "keeper_note", "diary", "quiver_image"]);
const artifactStateSchema = z.enum(["draft", "reviewed", "preserved_private", "discarded"]);
const ARTIFACT_NON_EFFECT = "No Work, Witness ID, testimony, provenance event, publication, license, payment, or public page changed.";

function profileSettingView(profileId: PNAProfileId, row?: { isEnabled: boolean; allowRemoteContext: boolean }) {
  const profile = PNA_STEWARDSHIP_PROFILES[profileId];
  return {
    ...profile,
    isEnabled: row?.isEnabled ?? true,
    allowRemoteContext: row?.allowRemoteContext ?? false,
  };
}

async function ownedArtifact(userId: number, id: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PNA Artifact Review is temporarily unavailable." });
  const [artifact] = await db.select().from(pnaArtifacts)
    .where(and(eq(pnaArtifacts.id, id), eq(pnaArtifacts.userId, userId))).limit(1);
  if (!artifact) throw new TRPCError({ code: "NOT_FOUND", message: "Private PNA Artifact not found." });
  return { db, artifact };
}

async function recordAction(args: {
  userId: number; threadId?: string | null; artifactId?: string | null; envelopeId?: string | null;
  action: "attach_context" | "detach_context" | "review_artifact" | "preserve_artifact" | "discard_artifact";
  effectSummary: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pnaActionReceipts).values({
    id: nanoid(24), userId: args.userId, threadId: args.threadId ?? null, artifactId: args.artifactId ?? null,
    envelopeId: args.envelopeId ?? null, action: args.action, effectSummary: args.effectSummary, nonEffectSummary: ARTIFACT_NON_EFFECT,
  });
}

export const pnaGovernanceRouter = router({
  profileSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return PNA_PROFILE_IDS.map((id) => profileSettingView(id));
    const rows = await db.select().from(pnaProfileSettings).where(eq(pnaProfileSettings.userId, ctx.user.id)) as Array<{
      profileId: string;
      isEnabled: boolean;
      allowRemoteContext: boolean;
    }>;
    const byProfile = new Map<string, { isEnabled: boolean; allowRemoteContext: boolean }>(
      rows.map((row) => [row.profileId, { isEnabled: row.isEnabled, allowRemoteContext: row.allowRemoteContext }]),
    );
    return PNA_PROFILE_IDS.map((id) => profileSettingView(id, byProfile.get(id)));
  }),

  saveProfileSetting: protectedProcedure
    .input(z.object({ profileId: profileSchema, isEnabled: z.boolean(), allowRemoteContext: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PNA stewardship settings are temporarily unavailable." });
      await db.insert(pnaProfileSettings).values({
        userId: ctx.user.id, profileId: input.profileId, isEnabled: input.isEnabled, allowRemoteContext: input.allowRemoteContext,
      }).onDuplicateKeyUpdate({ set: { isEnabled: input.isEnabled, allowRemoteContext: input.allowRemoteContext, updatedAt: new Date() } });
      return profileSettingView(input.profileId, input);
    }),

  overview: protectedProcedure
    .input(z.object({ threadId: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const { db } = await requireOwnedPnaThread(ctx.user.id, input.threadId);
      const [envelope] = await db.select().from(pnaContextEnvelopes).where(and(
        eq(pnaContextEnvelopes.userId, ctx.user.id), eq(pnaContextEnvelopes.threadId, input.threadId), eq(pnaContextEnvelopes.state, "active"),
      )).limit(1);
      const entries = envelope ? await db.select().from(pnaContextEntries).where(and(
        eq(pnaContextEntries.envelopeId, envelope.id), eq(pnaContextEntries.userId, ctx.user.id),
      )).orderBy(desc(pnaContextEntries.attachedAt)) : [];
      const artifacts = await db.select().from(pnaArtifacts).where(and(
        eq(pnaArtifacts.userId, ctx.user.id), eq(pnaArtifacts.threadId, input.threadId),
      )).orderBy(desc(pnaArtifacts.updatedAt));
      const sourceRows = artifacts.length > 0
        ? await db.select().from(pnaArtifactSources).where(sql`${pnaArtifactSources.artifactId} IN (${sql.join(artifacts.map((artifact: { id: string }) => sql`${artifact.id}`), sql`, `)})`)
        : [];
      const actionReceipts = await db.select().from(pnaActionReceipts).where(and(
        eq(pnaActionReceipts.userId, ctx.user.id), eq(pnaActionReceipts.threadId, input.threadId),
      )).orderBy(desc(pnaActionReceipts.createdAt)).limit(40);
      const useReceipts = envelope ? await db.select().from(pnaContextUseReceipts).where(and(
        eq(pnaContextUseReceipts.userId, ctx.user.id), eq(pnaContextUseReceipts.envelopeId, envelope.id),
      )).orderBy(desc(pnaContextUseReceipts.createdAt)).limit(40) : [];
      const useEntryRows = useReceipts.length > 0
        ? await db.select().from(pnaContextUseEntries).where(sql`${pnaContextUseEntries.receiptId} IN (${sql.join(useReceipts.map((receipt: { id: string }) => sql`${receipt.id}`), sql`, `)})`)
        : [];
      return { envelope: envelope ?? null, entries, artifacts, artifactSources: sourceRows, actionReceipts, useReceipts, useEntries: useEntryRows };
    }),

  attachContext: protectedProcedure
    .input(z.object({ threadId: z.string().min(1).max(64), profileId: profileSchema, sourceKind: sourceSchema, sourceRef: z.string().trim().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const profile = PNA_STEWARDSHIP_PROFILES[input.profileId];
      if (!profile.permittedContextKinds.includes(input.sourceKind as PNAContextSourceKind)) {
        throw new TRPCError({ code: "FORBIDDEN", message: `${profile.label} cannot use this source type. Choose a compatible Stewardship Profile.` });
      }
      const source = await resolveOwnedPnaContextSource(ctx.user.id, input.sourceKind, input.sourceRef);
      const { db, envelope } = await getOrCreateActiveEnvelope(ctx.user.id, input.threadId);
      const entries = await db.select().from(pnaContextEntries).where(and(
        eq(pnaContextEntries.envelopeId, envelope.id), eq(pnaContextEntries.state, "attached"),
      ));
      if (entries.length >= 12) throw new TRPCError({ code: "BAD_REQUEST", message: "A Context Envelope may hold up to twelve selected sources." });
      const id = nanoid(24);
      try {
        await db.insert(pnaContextEntries).values({
          id, envelopeId: envelope.id, userId: ctx.user.id, sourceKind: input.sourceKind, sourceRef: source.sourceRef,
          titleSnapshot: source.title, widSnapshot: source.wid ?? null,
        });
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "That source is already attached to this private Context Envelope." });
      }
      await db.update(pnaContextEnvelopes).set({ revision: envelope.revision + 1, updatedAt: new Date() }).where(eq(pnaContextEnvelopes.id, envelope.id));
      await recordAction({ userId: ctx.user.id, threadId: input.threadId, envelopeId: envelope.id, action: "attach_context", effectSummary: `Attached “${source.title}” to this private Context Envelope.` });
      return { id, title: source.title, envelopeId: envelope.id, revision: envelope.revision + 1 };
    }),

  detachContext: protectedProcedure
    .input(z.object({ threadId: z.string().min(1).max(64), entryId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await requireOwnedPnaThread(ctx.user.id, input.threadId);
      const [envelope] = await db.select().from(pnaContextEnvelopes).where(and(
        eq(pnaContextEnvelopes.userId, ctx.user.id), eq(pnaContextEnvelopes.threadId, input.threadId), eq(pnaContextEnvelopes.state, "active"),
      )).limit(1);
      if (!envelope) throw new TRPCError({ code: "NOT_FOUND", message: "No active private Context Envelope exists for this thread." });
      const [entry] = await db.select().from(pnaContextEntries).where(and(
        eq(pnaContextEntries.id, input.entryId), eq(pnaContextEntries.envelopeId, envelope.id), eq(pnaContextEntries.userId, ctx.user.id), eq(pnaContextEntries.state, "attached"),
      )).limit(1);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Private Context source not found." });
      await db.update(pnaContextEntries).set({ state: "detached", detachedAt: new Date() }).where(eq(pnaContextEntries.id, entry.id));
      await db.update(pnaContextEnvelopes).set({ revision: envelope.revision + 1, updatedAt: new Date() }).where(eq(pnaContextEnvelopes.id, envelope.id));
      await recordAction({ userId: ctx.user.id, threadId: input.threadId, envelopeId: envelope.id, action: "detach_context", effectSummary: `Detached “${entry.titleSnapshot}” from future PNA use in this thread.` });
      return { ok: true, revision: envelope.revision + 1 };
    }),

  prepareContextUse: protectedProcedure
    .input(z.object({ threadId: z.string().min(1).max(64), profileId: profileSchema }))
    .mutation(async ({ ctx, input }) => preparePnaContextUse(ctx.user.id, input.threadId, input.profileId)),

  createVisualArtifact: protectedProcedure
    .input(z.object({ threadId: z.string().min(1).max(64), originMessageId: z.string().min(1).max(64), url: z.string().url(), prompt: z.string().min(1).max(2000), title: z.string().trim().min(1).max(255).default("Private visual proposal") }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await requireOwnedPnaThread(ctx.user.id, input.threadId);
      const [existing] = await db.select().from(pnaArtifacts).where(and(
        eq(pnaArtifacts.originMessageId, input.originMessageId), eq(pnaArtifacts.userId, ctx.user.id),
      )).limit(1);
      if (existing) return existing;
      const [envelope] = await db.select().from(pnaContextEnvelopes).where(and(
        eq(pnaContextEnvelopes.userId, ctx.user.id), eq(pnaContextEnvelopes.threadId, input.threadId), eq(pnaContextEnvelopes.state, "active"),
      )).limit(1);
      const id = nanoid(24);
      await db.insert(pnaArtifacts).values({
        id, userId: ctx.user.id, threadId: input.threadId, originMessageId: input.originMessageId,
        contextEnvelopeId: envelope?.id ?? null, contextRevision: envelope?.revision ?? null,
        profileId: "vision", kind: "image_proposal", title: input.title,
        summary: "Private visual proposal. Review before preserving it in Quiver.",
        payloadJson: { url: input.url, prompt: input.prompt },
      });
      if (envelope) {
        const entries = await db.select().from(pnaContextEntries).where(and(
          eq(pnaContextEntries.envelopeId, envelope.id), eq(pnaContextEntries.userId, ctx.user.id), eq(pnaContextEntries.state, "attached"),
        ));
        if (entries.length > 0) await db.insert(pnaArtifactSources).values(entries.map((entry: { id: string; sourceKind: string; titleSnapshot: string; widSnapshot: string | null; sourceRef: string }) => ({
          id: nanoid(24), artifactId: id, contextEntryId: entry.id, sourceKind: entry.sourceKind,
          titleSnapshot: entry.titleSnapshot, locatorSnapshot: entry.widSnapshot ?? entry.sourceRef, relation: "source" as const,
        })));
      }
      const [artifact] = await db.select().from(pnaArtifacts).where(eq(pnaArtifacts.id, id)).limit(1);
      return artifact!;
    }),

  reviewArtifact: protectedProcedure
    .input(z.object({ id: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const { db, artifact } = await ownedArtifact(ctx.user.id, input.id);
      if (artifact.state === "discarded") throw new TRPCError({ code: "BAD_REQUEST", message: "Restore this private Artifact before reviewing it again." });
      if (artifact.state === "draft") await db.update(pnaArtifacts).set({ state: "reviewed", updatedAt: new Date() }).where(eq(pnaArtifacts.id, artifact.id));
      await recordAction({ userId: ctx.user.id, threadId: artifact.threadId, artifactId: artifact.id, action: "review_artifact", effectSummary: `Reviewed private Artifact “${artifact.title}”.` });
      return { ok: true, state: artifact.state === "draft" ? "reviewed" : artifact.state };
    }),

  preserveArtifact: protectedProcedure
    .input(z.object({ id: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const { db, artifact } = await ownedArtifact(ctx.user.id, input.id);
      if (artifact.state === "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Review this private Artifact before preserving it." });
      if (artifact.state === "discarded") throw new TRPCError({ code: "BAD_REQUEST", message: "Restore this private Artifact before preserving it." });
      if (artifact.state === "preserved_private" && artifact.quiverImageId) return { ok: true, quiverImageId: artifact.quiverImageId, state: artifact.state };
      const payload = artifact.payloadJson as { url?: string; prompt?: string };
      if (artifact.kind !== "image_proposal" || !payload?.url || !payload?.prompt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This Artifact has no supported private preservation destination yet." });
      }
      const [row] = await db.insert(quiverImages).values({ userId: ctx.user.id, url: payload.url, prompt: payload.prompt, title: artifact.title });
      const quiverImageId = Number((row as any).insertId);
      await db.update(pnaArtifacts).set({ state: "preserved_private", quiverImageId, updatedAt: new Date() }).where(eq(pnaArtifacts.id, artifact.id));
      await recordAction({ userId: ctx.user.id, threadId: artifact.threadId, artifactId: artifact.id, action: "preserve_artifact", effectSummary: `Preserved “${artifact.title}” privately in Quiver.` });
      return { ok: true, quiverImageId, state: "preserved_private" as const };
    }),

  discardArtifact: protectedProcedure
    .input(z.object({ id: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const { db, artifact } = await ownedArtifact(ctx.user.id, input.id);
      if (artifact.state === "preserved_private") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This Artifact is already preserved in Quiver. Its private asset remains intact; use Quiver controls to manage that asset." });
      }
      if (artifact.state !== "discarded") await db.update(pnaArtifacts).set({ state: "discarded", updatedAt: new Date() }).where(eq(pnaArtifacts.id, artifact.id));
      await recordAction({ userId: ctx.user.id, threadId: artifact.threadId, artifactId: artifact.id, action: "discard_artifact", effectSummary: `Discarded private Artifact “${artifact.title}” from the PNA review surface.` });
      return { ok: true, state: "discarded" as const };
    }),
});
