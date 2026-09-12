import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  attachCoreIngestionAsset,
  cancelCoreIngestionCommission,
  getCoreIngestionCommission,
  listCoreIngestionCommissions,
  startCoreIngestionCommission,
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
});

