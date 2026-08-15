import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "../utils/db";
import { protectedProcedure, router } from "../_core/trpc";

const modeSchema = z.enum(["guide", "conductor", "witness", "custodian", "archivist", "vision", "research"]);
const visualProposalSchema = z.object({
  url: z.string().url(),
  prompt: z.string().min(1).max(2000),
  savedQuiverId: z.number().int().positive().optional(),
});

async function ownedThread(threadId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const { pnaThreads } = await import("../../drizzle/schema");
  const [thread] = await db.select().from(pnaThreads)
    .where(and(eq(pnaThreads.id, threadId), eq(pnaThreads.userId, userId)))
    .limit(1);
  if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Private PNA thread not found." });
  return { db, thread };
}

export const pnaThreadRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(80).default(40) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const { pnaThreads } = await import("../../drizzle/schema");
      return db.select().from(pnaThreads)
        .where(eq(pnaThreads.userId, ctx.user.id))
        .orderBy(desc(pnaThreads.updatedAt))
        .limit(input?.limit ?? 40);
    }),

  create: protectedProcedure
    .input(z.object({ title: z.string().trim().min(1).max(200).optional(), activeMode: modeSchema.default("guide") }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { pnaThreads } = await import("../../drizzle/schema");
      const id = nanoid(24);
      const title = input?.title || `PNA Thread · ${new Date().toLocaleDateString()}`;
      await db.insert(pnaThreads).values({ id, userId: ctx.user.id, title, activeMode: input?.activeMode ?? "guide" });
      return { id, title, activeMode: input?.activeMode ?? "guide" };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const { db, thread } = await ownedThread(input.id, ctx.user.id);
      const { pnaThreadMessages } = await import("../../drizzle/schema");
      const messages = await db.select().from(pnaThreadMessages)
        .where(and(eq(pnaThreadMessages.threadId, thread.id), eq(pnaThreadMessages.userId, ctx.user.id)))
        .orderBy(asc(pnaThreadMessages.position));
      return { thread, messages };
    }),

  append: protectedProcedure
    .input(z.object({
      threadId: z.string().min(1).max(64),
      role: z.enum(["user", "pna"]),
      content: z.string().min(1).max(10000),
      mode: modeSchema,
      visualProposal: visualProposalSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, thread } = await ownedThread(input.threadId, ctx.user.id);
      const { pnaThreadMessages, pnaThreads } = await import("../../drizzle/schema");
      const [positionRow] = await db.select({ last: max(pnaThreadMessages.position) })
        .from(pnaThreadMessages)
        .where(and(eq(pnaThreadMessages.threadId, thread.id), eq(pnaThreadMessages.userId, ctx.user.id)));
      const position = Number(positionRow?.last ?? -1) + 1;
      const id = nanoid(24);
      await db.insert(pnaThreadMessages).values({
        id,
        threadId: thread.id,
        userId: ctx.user.id,
        position,
        role: input.role,
        content: input.content,
        mode: input.mode,
        visualProposalJson: input.visualProposal,
      });
      const title = thread.title.startsWith("PNA Thread ·") && input.role === "user"
        ? input.content.trim().slice(0, 72) || thread.title
        : thread.title;
      await db.update(pnaThreads).set({ title, activeMode: input.mode, updatedAt: new Date() })
        .where(and(eq(pnaThreads.id, thread.id), eq(pnaThreads.userId, ctx.user.id)));
      return { id, position, title };
    }),

  setVisualProposal: protectedProcedure
    .input(z.object({
      threadId: z.string().min(1).max(64),
      messageId: z.string().min(1).max(64),
      visualProposal: visualProposalSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, thread } = await ownedThread(input.threadId, ctx.user.id);
      const { pnaThreadMessages } = await import("../../drizzle/schema");
      const result = await db.update(pnaThreadMessages).set({ visualProposalJson: input.visualProposal })
        .where(and(
          eq(pnaThreadMessages.id, input.messageId),
          eq(pnaThreadMessages.threadId, thread.id),
          eq(pnaThreadMessages.userId, ctx.user.id),
          eq(pnaThreadMessages.role, "pna"),
        ));
      if ((result as any)[0]?.affectedRows === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Private visual proposal not found." });
      return { ok: true };
    }),
});
