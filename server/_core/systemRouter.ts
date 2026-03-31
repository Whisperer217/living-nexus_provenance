import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
  /**
   * Client-side error logging — called by the dashboard when a data load fails.
   * Logs to server console with userId, route, and error message for debugging.
   */
  logClientError: protectedProcedure
    .input(
      z.object({
        route: z.string(),
        error: z.string(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.error(
        `[ClientError] userId=${ctx.user.id} route=${input.route} error=${input.error}${
          input.context ? ` context=${input.context}` : ""
        }`
      );
      return { logged: true };
    }),
});
