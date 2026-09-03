import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cathedralContextManifestSchema,
  cathedralDraftSnapshotSchema,
  cathedralEvidencePacketSchema,
  cathedralStageSchema,
  cathedralSuggestionPatchSchema,
} from "../../shared/creativeCathedral";
import { protectedProcedure, router } from "../_core/trpc";
import {
  clearCathedralWorkspace,
  createCathedralSession,
  createCathedralSuggestion,
  getLatestCathedralSession,
  getOwnedCathedralSession,
  listCathedralSuggestions,
  recordCathedralConsent,
  resolveCathedralSuggestion,
  saveCathedralDraft,
} from "../db/creativeCathedral";
import { suggestWorkMetadataFromApprovedContext } from "../services/workMetadataSuggestion";

const sessionIdSchema = z.string().min(1).max(64);

export const cathedralRouter = router({
  getCurrentSession: protectedProcedure
    .query(({ ctx }) => getLatestCathedralSession(ctx.user.id)),

  createSession: protectedProcedure
    .input(z.object({ stage: cathedralStageSchema.default("prepare") }).optional())
    .mutation(({ ctx, input }) => createCathedralSession({ creatorId: ctx.user.id, stage: input?.stage ?? "prepare" })),

  getSession: protectedProcedure
    .input(z.object({ sessionId: sessionIdSchema }))
    .query(async ({ ctx, input }) => (await getOwnedCathedralSession(input.sessionId, ctx.user.id)).session),

  saveDraftSnapshot: protectedProcedure
    .input(z.object({
      sessionId: sessionIdSchema,
      draft: cathedralDraftSnapshotSchema,
      activePanel: z.enum(["assistant", "record"]).optional(),
    }))
    .mutation(({ ctx, input }) => saveCathedralDraft({
      sessionId: input.sessionId,
      creatorId: ctx.user.id,
      draft: input.draft,
      uiState: input.activePanel ? { activePanel: input.activePanel } : undefined,
    })),

  listSuggestions: protectedProcedure
    .input(z.object({ sessionId: sessionIdSchema }))
    .query(({ ctx, input }) => listCathedralSuggestions(input.sessionId, ctx.user.id)),

  requestMediaFactReview: protectedProcedure
    .input(z.object({
      sessionId: sessionIdSchema,
      consent: z.literal(true),
      manifest: cathedralContextManifestSchema,
      evidencePacket: cathedralEvidencePacketSchema,
    }).superRefine((value, issue) => {
      if (value.manifest.sessionId !== value.sessionId) {
        issue.addIssue({ code: "custom", path: ["manifest", "sessionId"], message: "Context manifest does not match the private session." });
      }
    }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedCathedralSession(input.sessionId, ctx.user.id);
      const canonicalManifest = JSON.stringify(input.manifest);
      const manifestHash = createHash("sha256").update(canonicalManifest).digest("hex");
      await recordCathedralConsent({ sessionId: input.sessionId, creatorId: ctx.user.id, manifestHash });
      try {
        const result = await suggestWorkMetadataFromApprovedContext({
          evidencePacket: input.evidencePacket,
        });
        return createCathedralSuggestion({
          sessionId: input.sessionId,
          creatorId: ctx.user.id,
          manifest: input.manifest,
          result: result.suggestion,
          modelRef: result.modelRef,
        });
      } catch (error) {
        console.error("[CreativeCathedral] Media fact review failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The Cathedral could not prepare a suggestion. No Work data was changed." });
      }
    }),

  applySuggestionToForm: protectedProcedure
    .input(z.object({
      sessionId: sessionIdSchema,
      suggestionId: sessionIdSchema,
      patch: cathedralSuggestionPatchSchema.optional(),
    }))
    .mutation(({ ctx, input }) => resolveCathedralSuggestion({
      sessionId: input.sessionId,
      suggestionId: input.suggestionId,
      creatorId: ctx.user.id,
      decision: "apply_to_form",
      patchOverride: input.patch,
    })),

  markEditFirst: protectedProcedure
    .input(z.object({ sessionId: sessionIdSchema, suggestionId: sessionIdSchema }))
    .mutation(({ ctx, input }) => resolveCathedralSuggestion({
      ...input,
      creatorId: ctx.user.id,
      decision: "edit_first",
    })),

  dismissSuggestion: protectedProcedure
    .input(z.object({ sessionId: sessionIdSchema, suggestionId: sessionIdSchema }))
    .mutation(({ ctx, input }) => resolveCathedralSuggestion({
      ...input,
      creatorId: ctx.user.id,
      decision: "dismiss",
    })),

  clearWorkspace: protectedProcedure
    .input(z.object({ sessionId: sessionIdSchema, confirm: z.literal("CLEAR PRIVATE WORKSPACE") }))
    .mutation(({ ctx, input }) => clearCathedralWorkspace(input.sessionId, ctx.user.id)),
});
