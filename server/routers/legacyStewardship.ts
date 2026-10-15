import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  appendLegacyMemorialStatement,
  createLegacyStewardshipGrant,
  getActiveLegacyStewardshipGrant,
  getLegacyStewardshipEvents,
  getPublicLegacyMemorials,
  LEGACY_STEWARDSHIP_SCOPE,
  reconcileCreatorRegistry,
  recordLegacyReconciliation,
  revokeLegacyStewardshipGrant,
} from "../utils/legacyStewardship";

const forbidden = () => new TRPCError({ code: "FORBIDDEN", message: "Legacy Stewardship access is not available." });

async function requireActiveGrant(creatorId: number, stewardId: number) {
  const grant = await getActiveLegacyStewardshipGrant(creatorId, stewardId);
  if (!grant) throw forbidden();
  return grant;
}

function requireScope(grant: Awaited<ReturnType<typeof getActiveLegacyStewardshipGrant>>, key: keyof typeof LEGACY_STEWARDSHIP_SCOPE) {
  if (!grant || !grant.scopeJson?.[key]) throw forbidden();
}

export const legacyStewardshipRouter = router({
  /** Public presentation records only; no grant details, creator private data, or custody audit. */
  publicMemorials: publicProcedure
    .input(z.object({ creatorId: z.number().int().positive() }))
    .query(({ input }) => getPublicLegacyMemorials(input.creatorId)),

  /** Administrator-only, additive grant issue. This does not modify roles, Creator records, or Works. */
  grant: adminProcedure
    .input(z.object({
      creatorId: z.number().int().positive(),
      stewardId: z.number().int().positive(),
      reason: z.string().trim().min(12).max(2_000),
      authorityReference: z.string().trim().min(6).max(256),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.creatorId === input.stewardId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A Legacy Steward must be distinct from the Creator." });
      }
      const result = await createLegacyStewardshipGrant({
        ...input,
        grantedByUserId: ctx.user.id,
      });
      return {
        id: Number(result.grant.id),
        creatorId: result.grant.creatorId,
        stewardId: result.grant.stewardId,
        status: result.grant.status,
        scope: result.grant.scopeJson,
        created: result.created,
      };
    }),

  /** Administrators can revoke future platform stewardship without deleting custody history. */
  revoke: adminProcedure
    .input(z.object({ grantId: z.number().int().positive(), reason: z.string().trim().min(6).max(2_000) }))
    .mutation(async ({ ctx, input }) => {
      const revoked = await revokeLegacyStewardshipGrant({
        grantId: input.grantId,
        revokedByUserId: ctx.user.id,
        revocationReason: input.reason,
      });
      if (!revoked) throw new TRPCError({ code: "NOT_FOUND", message: "Active Legacy Stewardship grant not found." });
      return { success: true };
    }),

  /** Returns only the caller's own active grant for the requested Creator. */
  myAuthority: protectedProcedure
    .input(z.object({ creatorId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const grant = await getActiveLegacyStewardshipGrant(input.creatorId, ctx.user.id);
      if (!grant) return null;
      return {
        id: Number(grant.id),
        creatorId: grant.creatorId,
        stewardId: grant.stewardId,
        status: grant.status,
        scope: grant.scopeJson,
        grantedAt: grant.grantedAt,
      };
    }),

  /** A scoped steward may inspect registry continuity; the procedure never writes a Work or WID. */
  reconcile: protectedProcedure
    .input(z.object({ creatorId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const grant = await requireActiveGrant(input.creatorId, ctx.user.id);
      requireScope(grant, "viewRegistry");
      return reconcileCreatorRegistry(input.creatorId);
    }),

  /** Records the summary digest in the append-only custody ledger after an authorized inspection. */
  recordReconciliation: protectedProcedure
    .input(z.object({ creatorId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const grant = await requireActiveGrant(input.creatorId, ctx.user.id);
      requireScope(grant, "viewRegistry");
      const reconciliation = await reconcileCreatorRegistry(input.creatorId);
      return recordLegacyReconciliation({
        grantId: Number(grant.id),
        creatorId: input.creatorId,
        actorUserId: ctx.user.id,
        reconciliation,
      });
    }),

  /** Append only: no update/delete route exists for published memorial records. */
  appendMemorial: protectedProcedure
    .input(z.object({
      creatorId: z.number().int().positive(),
      body: z.string().trim().min(40).max(8_000),
    }))
    .mutation(async ({ ctx, input }) => {
      const grant = await requireActiveGrant(input.creatorId, ctx.user.id);
      requireScope(grant, "appendMemorialStatement");
      return appendLegacyMemorialStatement({
        creatorId: input.creatorId,
        stewardId: ctx.user.id,
        stewardshipGrantId: Number(grant.id),
        body: input.body,
      });
    }),

  /** The custody history is limited to the named Steward or an Administrator. */
  events: protectedProcedure
    .input(z.object({ creatorId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        await requireActiveGrant(input.creatorId, ctx.user.id);
      }
      return getLegacyStewardshipEvents(input.creatorId);
    }),
});
