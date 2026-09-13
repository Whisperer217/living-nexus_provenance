import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { listHeartbeatJobs } from "../_core/heartbeat";
import {
  CORE_INGESTION_OPTION_B_CADENCE,
  CORE_INGESTION_SCHEDULER_CALLBACK_PATH,
  bindCoreIngestionSchedulerTask,
  attachCoreIngestionAsset,
  cancelCoreIngestionCommission,
  confirmCoreIngestionPrivateDraft,
  dismissCoreIngestionDraftProposal,
  getCoreIngestionCommission,
  getCoreIngestionSchedulerStatus,
  issueCoreIngestionDraftConfirmation,
  listCoreIngestionCommissions,
  listOwnedCoreIngestionAudioAssets,
  offerCoreIngestionDraftProposal,
  startCoreIngestionCommission,
  startCoreIngestionFromOwnedAudioAsset,
} from "../services/coreIngestion";

const commissionId = z.string().uuid();

/**
 * Creator-scoped I1 inspection procedures only. No procedure in this router can
 * register/publish a Work, issue a WID, create provenance, invoke a model, or
 * access PNA/Quiver/avatar/marketplace records.
 */
export const coreIngestionRouter = router({
  start: protectedProcedure
    .input(z.object({
      requestedOutcome: z.enum(["private_draft", "registration_review"]).default("private_draft"),
      idempotencyKey: z.string().trim().min(12).max(128),
    }))
    .mutation(({ ctx, input }) => startCoreIngestionCommission(ctx.user.id, input)),
  listOwnedAudioAssets: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional())
    .query(({ ctx, input }) => listOwnedCoreIngestionAudioAssets(ctx.user.id, input?.limit)),
  startFromOwnedAudioAsset: protectedProcedure
    .input(z.object({
      sourceSongId: z.number().int().positive(),
      requestedOutcome: z.enum(["private_draft", "registration_review"]).default("private_draft"),
      idempotencyKey: z.string().trim().min(12).max(128),
    }))
    .mutation(({ ctx, input }) => startCoreIngestionFromOwnedAudioAsset(ctx.user.id, input)),
  attachAsset: protectedProcedure
    .input(z.object({
      commissionId,
      storageKey: z.string().trim().min(1).max(512),
      declaredContentType: z.string().trim().min(1).max(191).optional(),
      declaredSizeBytes: z.number().int().min(0).max(64 * 1024 * 1024).optional(),
    }))
    .mutation(({ ctx, input }) => attachCoreIngestionAsset(ctx.user.id, input)),
  cancel: protectedProcedure
    .input(z.object({ commissionId }))
    .mutation(({ ctx, input }) => cancelCoreIngestionCommission(ctx.user.id, input.commissionId)),
  get: protectedProcedure
    .input(z.object({ commissionId }))
    .query(({ ctx, input }) => getCoreIngestionCommission(ctx.user.id, input.commissionId)),
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(({ ctx, input }) => listCoreIngestionCommissions(ctx.user.id, input?.limit)),
  offerPrivateDraftProposal: protectedProcedure
    .input(z.object({ commissionId }))
    .mutation(({ ctx, input }) => offerCoreIngestionDraftProposal(ctx.user.id, input.commissionId)),
  issuePrivateDraftConfirmation: protectedProcedure
    .input(z.object({ proposalId: z.string().uuid() }))
    .mutation(({ ctx, input }) => issueCoreIngestionDraftConfirmation(ctx.user.id, input.proposalId)),
  confirmPrivateDraft: protectedProcedure
    .input(z.object({
      proposalId: z.string().uuid(),
      confirmationId: z.string().uuid(),
      confirmationToken: z.string().min(32).max(128),
    }))
    .mutation(({ ctx, input }) => confirmCoreIngestionPrivateDraft({ creatorId: ctx.user.id, ...input })),
  dismissPrivateDraftProposal: protectedProcedure
    .input(z.object({ proposalId: z.string().uuid() }))
    .mutation(({ ctx, input }) => dismissCoreIngestionDraftProposal(ctx.user.id, input.proposalId)),
  schedulerStatus: adminProcedure
    .query(() => getCoreIngestionSchedulerStatus()),
  bindOptionBSchedulerTask: adminProcedure
    .input(z.object({ taskUid: z.string().trim().min(1).max(65) }))
    .mutation(async ({ ctx, input }) => {
      const tasks = await listHeartbeatJobs("");
      const task = tasks.jobs.find((candidate) => candidate.taskUid === input.taskUid);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "The requested project scheduler task was not found." });
      if (task.name !== "core-ingestion-option-b" || task.cronExpression !== CORE_INGESTION_OPTION_B_CADENCE || task.callbackPath !== CORE_INGESTION_SCHEDULER_CALLBACK_PATH || task.callbackMethod !== "POST") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The scheduler task does not match the approved Option B Core Ingestion contract." });
      }
      return bindCoreIngestionSchedulerTask(ctx.user.id, input.taskUid);
    }),
});
