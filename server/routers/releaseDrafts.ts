import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  abandonDraftRelease,
  createDraftRelease,
  getOwnedDraftRelease,
  listEligibleDraftReleaseWorks,
  listOwnedDraftReleases,
  reorderDraftReleaseMembership,
  replaceDraftReleaseMembership,
  updateDraftReleaseMetadata,
} from "../db/albumReleases";
import { ReleaseDraftPolicyError } from "../domains/releases/releasePolicy";
import { RELEASE_SIGNING_HOLD } from "../../shared/albumReleaseTypes";

const visibilityIntent = z.enum(["public", "unlisted", "private"]);
const metadataInput = z.object({
  title: z.string().trim().min(1, "A release title is required.").max(255),
  description: z.string().trim().max(20_000).nullable().optional(),
  coverArtUrl: z.string().url().nullable().optional(),
  visibilityIntent: visibilityIntent.optional(),
});

function mapDraftError(error: unknown): never {
  if (error instanceof ReleaseDraftPolicyError) {
    const code = error.code === "DRAFT_CHANGED" ? "CONFLICT"
      : error.code === "DRAFT_UNAVAILABLE" ? "NOT_FOUND"
      : "BAD_REQUEST";
    throw new TRPCError({ code, message: error.message });
  }
  throw error;
}

/**
 * Private owner workspace for mutable release relationships.
 * No procedure in this router emits a WID-ALB2, public album, certificate,
 * manifest, or direct media URL.
 */
export const releaseDraftsRouter = router({
  listMine: protectedProcedure.query(async ({ ctx }) => listOwnedDraftReleases(ctx.user.id)),

  listEligibleWorks: protectedProcedure.query(async ({ ctx }) => listEligibleDraftReleaseWorks(ctx.user.id)),

  getMine: protectedProcedure
    .input(z.object({ draftId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const release = await getOwnedDraftRelease(ctx.user.id, input.draftId);
      if (!release) throw new TRPCError({ code: "NOT_FOUND", message: "Draft release unavailable." });
      return release;
    }),

  create: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      metadata: metadataInput,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createDraftRelease(ctx.user.id, input.requestId, input.metadata);
      } catch (error) {
        return mapDraftError(error);
      }
    }),

  updateMetadata: protectedProcedure
    .input(z.object({
      draftId: z.number().int().positive(),
      expectedRevision: z.number().int().positive(),
      metadata: metadataInput,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await updateDraftReleaseMetadata(ctx.user.id, input.draftId, input.expectedRevision, input.metadata);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Draft release unavailable." });
        return result;
      } catch (error) {
        return mapDraftError(error);
      }
    }),

  replaceTracks: protectedProcedure
    .input(z.object({
      draftId: z.number().int().positive(),
      expectedRevision: z.number().int().positive(),
      songIdsInOrder: z.array(z.number().int().positive()).min(1).max(250),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await replaceDraftReleaseMembership(ctx.user.id, input.draftId, input.expectedRevision, input.songIdsInOrder);
      } catch (error) {
        return mapDraftError(error);
      }
    }),

  reorderTracks: protectedProcedure
    .input(z.object({
      draftId: z.number().int().positive(),
      expectedRevision: z.number().int().positive(),
      membershipIdsInOrder: z.array(z.number().int().positive()).min(1).max(250),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await reorderDraftReleaseMembership(ctx.user.id, input.draftId, input.expectedRevision, input.membershipIdsInOrder);
      } catch (error) {
        return mapDraftError(error);
      }
    }),

  abandon: protectedProcedure
    .input(z.object({ draftId: z.number().int().positive(), expectedRevision: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await abandonDraftRelease(ctx.user.id, input.draftId, input.expectedRevision);
      } catch (error) {
        return mapDraftError(error);
      }
    }),

  sealReadiness: protectedProcedure
    .input(z.object({ draftId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const release = await getOwnedDraftRelease(ctx.user.id, input.draftId);
      if (!release) throw new TRPCError({ code: "NOT_FOUND", message: "Draft release unavailable." });
      return {
        ready: false as const,
        reason: RELEASE_SIGNING_HOLD,
        trackCount: release.tracks.length,
      };
    }),
});
