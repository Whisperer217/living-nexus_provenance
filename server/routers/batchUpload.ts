import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  cancelPrivateBatchOperation,
  createPrivateBatchOperation,
  getPrivateBatchOperation,
  getPrivateCollectionFinalizationReadiness,
  reconcilePrivateBatchSource,
} from "../domains/batchUpload/service";

const operationIdSchema = z.string().trim().min(12).max(64);
const sha256Schema = z.string().trim().regex(/^[a-fA-F0-9]{64}$/, "A complete SHA-256 value is required.");

/**
 * H2 creator-private preparation services. These procedures are intentionally
 * separate from songs.batchUpload and cannot create Works, WIDs, or collections.
 */
export const batchUploadRouter = router({
  createOperation: protectedProcedure.input(z.object({
    collectionName: z.string().trim().min(1).max(255).optional(),
    intendedMetadataHash: sha256Schema.optional(),
  }).optional()).mutation(({ ctx, input }) => createPrivateBatchOperation({
    creatorId: ctx.user.id,
    collectionName: input?.collectionName,
    intendedMetadataHash: input?.intendedMetadataHash,
  })),

  getOperation: protectedProcedure.input(z.object({ operationId: operationIdSchema }))
    .query(({ ctx, input }) => getPrivateBatchOperation(input.operationId, ctx.user.id)),

  cancelOperation: protectedProcedure.input(z.object({ operationId: operationIdSchema }))
    .mutation(({ ctx, input }) => cancelPrivateBatchOperation(input.operationId, ctx.user.id)),

  reconcileSource: protectedProcedure.input(z.object({
    operationId: operationIdSchema,
    sourceSha256: sha256Schema,
  })).query(({ ctx, input }) => reconcilePrivateBatchSource({ ...input, creatorId: ctx.user.id })),

  collectionFinalizationReadiness: protectedProcedure.input(z.object({ operationId: operationIdSchema }))
    .query(({ ctx, input }) => getPrivateCollectionFinalizationReadiness(input.operationId, ctx.user.id)),
});
