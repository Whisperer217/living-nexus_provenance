/**
 * server/routers/apiKey.ts
 *
 * Developer API key management — create, list, and revoke per-user API keys.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createApiKey, listApiKeys, revokeApiKey } from "../utils/db";

export const apiKeyRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      tier: z.enum(["free", "pro", "enterprise"]).default("free"),
    }))
    .mutation(async ({ input, ctx }) => {
      const { key, record } = await createApiKey(ctx.user.id, input.name, input.tier);
      return {
        key,
        id:          record.id,
        keyPrefix:   record.keyPrefix,
        name:        record.name,
        tier:        record.tier,
        dailyLimit:  record.dailyLimit,
        createdAt:   record.createdAt,
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => listApiKeys(ctx.user.id)),

  revoke: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await revokeApiKey(input.id, ctx.user.id);
      return { success: true };
    }),
});
