import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { z } from "zod";
import {
  correspondenceBlocks,
  correspondenceMessages,
  correspondenceParticipants,
  correspondenceReports,
  correspondenceThreads,
  creatorContactSettings,
  songs,
  users,
  witnessSubscriptions,
} from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { createNotification, getDb, getUserById } from "../utils/db";

const policySchema = z.enum(["none", "mutual_witnesses", "witnesses"]);
const blockedMessage = "Correspondence is not available for this creator.";
const messageRateWindowMs = 60_000;
const maxMessagesPerWindow = 30;

function directKeyFor(userA: number, userB: number) {
  return createHash("sha256").update([userA, userB].sort((a, b) => a - b).join(":"), "utf8").digest("hex");
}

function unavailable(): never {
  // This intentionally does not distinguish a private contact policy from a block.
  throw new TRPCError({ code: "FORBIDDEN", message: blockedMessage });
}

async function hasBlockingPair(db: any, userA: number, userB: number) {
  const rows = await db.select({ id: correspondenceBlocks.id })
    .from(correspondenceBlocks)
    .where(or(
      and(eq(correspondenceBlocks.blockerUserId, userA), eq(correspondenceBlocks.blockedUserId, userB)),
      and(eq(correspondenceBlocks.blockerUserId, userB), eq(correspondenceBlocks.blockedUserId, userA)),
    ))
    .limit(1);
  return rows.length > 0;
}

async function requireThreadParticipant(db: any, threadId: number, userId: number) {
  const [participant] = await db.select()
    .from(correspondenceParticipants)
    .where(and(eq(correspondenceParticipants.threadId, threadId), eq(correspondenceParticipants.userId, userId)))
    .limit(1);
  if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Correspondence thread not found." });

  const [thread] = await db.select()
    .from(correspondenceThreads)
    .where(eq(correspondenceThreads.id, threadId))
    .limit(1);
  if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Correspondence thread not found." });

  const [otherParticipant] = await db.select()
    .from(correspondenceParticipants)
    .where(and(eq(correspondenceParticipants.threadId, threadId), ne(correspondenceParticipants.userId, userId)))
    .limit(1);
  if (!otherParticipant || await hasBlockingPair(db, userId, otherParticipant.userId)) unavailable();

  return { thread, participant, otherParticipant };
}

async function verifyIncomingPolicy(db: any, requesterId: number, recipientId: number, workContextId?: number) {
  if (await hasBlockingPair(db, requesterId, recipientId)) unavailable();

  const [recipientSettings] = await db.select()
    .from(creatorContactSettings)
    .where(eq(creatorContactSettings.userId, recipientId))
    .limit(1);
  const policy = recipientSettings?.incomingPolicy ?? "witnesses";
  if (policy === "none") unavailable();

  const [witnessing] = await db.select({ id: witnessSubscriptions.id })
    .from(witnessSubscriptions)
    .where(and(eq(witnessSubscriptions.witnessId, requesterId), eq(witnessSubscriptions.creatorId, recipientId)))
    .limit(1);
  if (!witnessing) unavailable();

  if (policy === "mutual_witnesses") {
    const [mutual] = await db.select({ id: witnessSubscriptions.id })
      .from(witnessSubscriptions)
      .where(and(eq(witnessSubscriptions.witnessId, recipientId), eq(witnessSubscriptions.creatorId, requesterId)))
      .limit(1);
    if (!mutual) unavailable();
  }

  if (workContextId !== undefined) {
    if (!recipientSettings?.allowWorkContext) unavailable();
    const [work] = await db.select({ id: songs.id })
      .from(songs)
      .where(and(eq(songs.id, workContextId), eq(songs.status, "Published"), eq(songs.isPublic, true)))
      .limit(1);
    if (!work) throw new TRPCError({ code: "BAD_REQUEST", message: "A correspondence Work context must be a published public Work." });
  }
}

export const correspondenceRouter = router({
  settings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    const [settings] = await db.select().from(creatorContactSettings)
      .where(eq(creatorContactSettings.userId, ctx.user.id)).limit(1);
    return settings ?? {
      userId: ctx.user.id,
      incomingPolicy: "witnesses" as const,
      allowWorkContext: true,
      isDefault: true,
    };
  }),

  updateSettings: protectedProcedure.input(z.object({
    incomingPolicy: policySchema,
    allowWorkContext: z.boolean(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    await db.insert(creatorContactSettings).values({ userId: ctx.user.id, ...input })
      .onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
    return { ok: true, ...input };
  }),

  request: protectedProcedure.input(z.object({
    recipientId: z.number().int().positive(),
    workContextId: z.number().int().positive().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (input.recipientId === ctx.user.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "A creator cannot request correspondence with themselves." });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });

    const [recipient] = await db.select({ id: users.id, artistHandle: users.artistHandle, name: users.name })
      .from(users).where(eq(users.id, input.recipientId)).limit(1);
    if (!recipient) unavailable();
    await verifyIncomingPolicy(db, ctx.user.id, input.recipientId, input.workContextId);

    const directKey = directKeyFor(ctx.user.id, input.recipientId);
    const [existingThread] = await db.select().from(correspondenceThreads)
      .where(eq(correspondenceThreads.directKey, directKey)).limit(1);
    let threadId: number;
    if (existingThread) {
      const participants = await db.select().from(correspondenceParticipants)
        .where(eq(correspondenceParticipants.threadId, existingThread.id));
      const recipientParticipant = participants.find((participant: any) => participant.userId === input.recipientId);
      const requesterParticipant = participants.find((participant: any) => participant.userId === ctx.user.id);
      if (recipientParticipant?.state === "accepted" && requesterParticipant?.state === "accepted" && !existingThread.closedAt) {
        return { threadId: existingThread.id, state: "accepted" as const };
      }
      const canRenew = Boolean(existingThread.closedAt) || participants.some((participant: any) =>
        participant.state === "declined" || participant.state === "blocked",
      );
      if (!canRenew) {
        // A still-pending request remains indistinguishable from a private refusal.
        return { threadId: existingThread.id, state: "requested" as const };
      }
      // Consent is not permanent. Once a block is lifted and the current policy
      // allows it, either creator can begin a fresh request on the same direct pair.
      threadId = existingThread.id;
      await db.transaction(async (tx: any) => {
        const now = new Date();
        await tx.update(correspondenceThreads).set({
          initiatedByUserId: ctx.user.id,
          workContextId: input.workContextId ?? null,
          closedAt: null,
          updatedAt: now,
        }).where(eq(correspondenceThreads.id, threadId));
        await tx.update(correspondenceParticipants).set({ role: "initiator", state: "requested", respondedAt: null, lastReadMessageId: null })
          .where(and(eq(correspondenceParticipants.threadId, threadId), eq(correspondenceParticipants.userId, ctx.user.id)));
        await tx.update(correspondenceParticipants).set({ role: "recipient", state: "requested", respondedAt: null, lastReadMessageId: null })
          .where(and(eq(correspondenceParticipants.threadId, threadId), eq(correspondenceParticipants.userId, input.recipientId)));
      });
    } else {
      try {
        threadId = await db.transaction(async (tx: any) => {
          const [result] = await tx.insert(correspondenceThreads).values({
            directKey,
            initiatedByUserId: ctx.user.id,
            workContextId: input.workContextId ?? null,
          });
          const id = Number(result.insertId);
          await tx.insert(correspondenceParticipants).values([
            { threadId: id, userId: ctx.user.id, role: "initiator", state: "requested" },
            { threadId: id, userId: input.recipientId, role: "recipient", state: "requested" },
          ]);
          return id;
        });
      } catch (error: any) {
        // A simultaneous request can race the deterministic direct-key insert.
        const [racedThread] = await db.select().from(correspondenceThreads)
          .where(eq(correspondenceThreads.directKey, directKey)).limit(1);
        if (!racedThread) throw error;
        return { threadId: racedThread.id, state: "requested" as const };
      }
    }

    const requester = await getUserById(ctx.user.id);
    await createNotification({
      userId: input.recipientId,
      type: "correspondence",
      title: `${requester?.artistHandle || requester?.name || "A creator"} requested correspondence`,
      body: "Review the request in your Witnessing Circle before opening a private conversation.",
      actorId: ctx.user.id,
      actorName: requester?.artistHandle || requester?.name || "Creator",
      refId: threadId,
      refType: "correspondence_thread",
    });
    return { threadId, state: "requested" as const };
  }),

  respond: protectedProcedure.input(z.object({
    threadId: z.number().int().positive(),
    action: z.enum(["accept", "decline"]),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    const { participant, otherParticipant } = await requireThreadParticipant(db, input.threadId, ctx.user.id);
    if (participant.role !== "recipient" || participant.state !== "requested") {
      throw new TRPCError({ code: "CONFLICT", message: "This correspondence request is no longer awaiting your response." });
    }
    if (input.action === "accept") {
      await db.transaction(async (tx: any) => {
        const now = new Date();
        await tx.update(correspondenceParticipants).set({ state: "accepted", respondedAt: now })
          .where(eq(correspondenceParticipants.threadId, input.threadId));
        await tx.update(correspondenceThreads).set({ updatedAt: now })
          .where(eq(correspondenceThreads.id, input.threadId));
      });
      const recipient = await getUserById(ctx.user.id);
      await createNotification({
        userId: otherParticipant.userId,
        type: "correspondence",
        title: `${recipient?.artistHandle || recipient?.name || "A creator"} accepted your correspondence request`,
        body: "Your private creator correspondence is now open in the Witnessing Circle.",
        actorId: ctx.user.id,
        actorName: recipient?.artistHandle || recipient?.name || "Creator",
        refId: input.threadId,
        refType: "correspondence_thread",
      });
    } else {
      await db.update(correspondenceParticipants).set({ state: "declined", respondedAt: new Date() })
        .where(and(eq(correspondenceParticipants.threadId, input.threadId), eq(correspondenceParticipants.userId, ctx.user.id)));
    }
    return { ok: true, state: input.action === "accept" ? "accepted" as const : "declined" as const };
  }),

  listThreads: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const selfParticipant = alias(correspondenceParticipants, "selfParticipant");
    const otherParticipant = alias(correspondenceParticipants, "otherParticipant");
    const counterpart = alias(users, "counterpart");
    const rows = await db.select({
      threadId: correspondenceThreads.id,
      workContextId: correspondenceThreads.workContextId,
      updatedAt: correspondenceThreads.updatedAt,
      closedAt: correspondenceThreads.closedAt,
      selfState: selfParticipant.state,
      selfRole: selfParticipant.role,
      counterpartState: otherParticipant.state,
      counterpartId: otherParticipant.userId,
      counterpartHandle: counterpart.artistHandle,
      counterpartName: counterpart.name,
      counterpartAvatarUrl: counterpart.profilePhotoUrl,
      lastMessagePreview: sql<string | null>`(
        SELECT LEFT(message.body, 160)
        FROM ${correspondenceMessages} message
        WHERE message.threadId = ${correspondenceThreads.id} AND message.deletedAt IS NULL
        ORDER BY message.createdAt DESC, message.id DESC
        LIMIT 1
      )`,
      lastMessageAt: sql<Date | null>`(
        SELECT message.createdAt
        FROM ${correspondenceMessages} message
        WHERE message.threadId = ${correspondenceThreads.id} AND message.deletedAt IS NULL
        ORDER BY message.createdAt DESC, message.id DESC
        LIMIT 1
      )`,
      unreadCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${correspondenceMessages} message
        WHERE message.threadId = ${correspondenceThreads.id}
          AND message.senderId <> ${ctx.user.id}
          AND message.deletedAt IS NULL
          AND message.id > COALESCE(${selfParticipant.lastReadMessageId}, 0)
      )`,
    }).from(correspondenceThreads)
      .innerJoin(selfParticipant, and(eq(selfParticipant.threadId, correspondenceThreads.id), eq(selfParticipant.userId, ctx.user.id)))
      .innerJoin(otherParticipant, and(eq(otherParticipant.threadId, correspondenceThreads.id), ne(otherParticipant.userId, ctx.user.id)))
      .leftJoin(counterpart, eq(otherParticipant.userId, counterpart.id))
      .orderBy(desc(correspondenceThreads.updatedAt))
      .limit(100);
    // Do not expose a recipient's decline or either creator's block state to the
    // other participant through the inbox listing.
    return rows.filter((row: any) => !(
      row.selfState === "declined" ||
      row.selfState === "blocked" ||
      row.counterpartState === "blocked" ||
      (row.selfRole === "initiator" && row.counterpartState === "declined")
    ));
  }),

  getThread: protectedProcedure.input(z.object({ threadId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    const { thread, participant, otherParticipant } = await requireThreadParticipant(db, input.threadId, ctx.user.id);
    const sender = alias(users, "messageSender");
    const messages = await db.select({
      id: correspondenceMessages.id,
      senderId: correspondenceMessages.senderId,
      body: correspondenceMessages.body,
      createdAt: correspondenceMessages.createdAt,
      senderHandle: sender.artistHandle,
      senderName: sender.name,
      senderAvatarUrl: sender.profilePhotoUrl,
    }).from(correspondenceMessages)
      .leftJoin(sender, eq(correspondenceMessages.senderId, sender.id))
      .where(and(eq(correspondenceMessages.threadId, input.threadId), isNull(correspondenceMessages.deletedAt)))
      .orderBy(asc(correspondenceMessages.createdAt), asc(correspondenceMessages.id))
      .limit(200);
    return {
      thread: {
        id: thread.id,
        workContextId: thread.workContextId,
        closedAt: thread.closedAt,
        selfState: participant.state,
        selfRole: participant.role,
        counterpartState: otherParticipant.state,
        counterpartId: otherParticipant.userId,
      },
      messages,
    };
  }),

  markRead: protectedProcedure.input(z.object({
    threadId: z.number().int().positive(),
    messageId: z.number().int().positive(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    await requireThreadParticipant(db, input.threadId, ctx.user.id);
    const [message] = await db.select({ id: correspondenceMessages.id }).from(correspondenceMessages)
      .where(and(eq(correspondenceMessages.id, input.messageId), eq(correspondenceMessages.threadId, input.threadId)))
      .limit(1);
    if (!message) throw new TRPCError({ code: "NOT_FOUND", message: "Correspondence message not found." });
    await db.update(correspondenceParticipants).set({ lastReadMessageId: message.id })
      .where(and(eq(correspondenceParticipants.threadId, input.threadId), eq(correspondenceParticipants.userId, ctx.user.id)));
    return { ok: true };
  }),

  send: protectedProcedure.input(z.object({
    threadId: z.number().int().positive(),
    body: z.string().trim().min(1).max(2_000),
    clientMessageId: z.string().trim().min(8).max(64),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    const { thread, participant, otherParticipant } = await requireThreadParticipant(db, input.threadId, ctx.user.id);
    if (thread.closedAt || participant.state !== "accepted" || otherParticipant.state !== "accepted") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Both creators must accept before correspondence can be sent." });
    }

    const existing = await db.select({ id: correspondenceMessages.id, createdAt: correspondenceMessages.createdAt })
      .from(correspondenceMessages)
      .where(and(
        eq(correspondenceMessages.threadId, input.threadId),
        eq(correspondenceMessages.senderId, ctx.user.id),
        eq(correspondenceMessages.clientMessageId, input.clientMessageId),
      )).limit(1);
    if (existing[0]) return { id: existing[0].id, createdAt: existing[0].createdAt, idempotent: true };

    const windowStart = new Date(Date.now() - messageRateWindowMs);
    const [rate] = await db.select({ total: count() }).from(correspondenceMessages)
      .where(and(eq(correspondenceMessages.senderId, ctx.user.id), gt(correspondenceMessages.createdAt, windowStart)));
    if (Number(rate?.total ?? 0) >= maxMessagesPerWindow) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please pause before sending another correspondence message." });
    }

    const now = new Date();
    const [result] = await db.insert(correspondenceMessages).values({
      threadId: input.threadId,
      senderId: ctx.user.id,
      body: input.body,
      clientMessageId: input.clientMessageId,
    });
    const messageId = Number(result.insertId);
    await db.update(correspondenceThreads).set({ updatedAt: now }).where(eq(correspondenceThreads.id, input.threadId));

    const sender = await getUserById(ctx.user.id);
    await createNotification({
      userId: otherParticipant.userId,
      type: "correspondence",
      title: `${sender?.artistHandle || sender?.name || "A creator"} sent you a correspondence message`,
      body: input.body.slice(0, 160),
      actorId: ctx.user.id,
      actorName: sender?.artistHandle || sender?.name || "Creator",
      refId: input.threadId,
      refType: "correspondence_thread",
    });
    return { id: messageId, createdAt: now, idempotent: false };
  }),

  block: protectedProcedure.input(z.object({ blockedUserId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (input.blockedUserId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "A creator cannot block themselves." });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    const directKey = directKeyFor(ctx.user.id, input.blockedUserId);
    await db.transaction(async (tx: any) => {
      await tx.insert(correspondenceBlocks).values({ blockerUserId: ctx.user.id, blockedUserId: input.blockedUserId })
        .onDuplicateKeyUpdate({ set: { blockerUserId: ctx.user.id } });
      const [thread] = await tx.select({ id: correspondenceThreads.id }).from(correspondenceThreads)
        .where(eq(correspondenceThreads.directKey, directKey)).limit(1);
      if (thread) {
        await tx.update(correspondenceThreads).set({ closedAt: new Date(), updatedAt: new Date() }).where(eq(correspondenceThreads.id, thread.id));
        await tx.update(correspondenceParticipants).set({ state: "blocked", respondedAt: new Date() })
          .where(eq(correspondenceParticipants.threadId, thread.id));
      }
    });
    return { ok: true };
  }),

  unblock: protectedProcedure.input(z.object({ blockedUserId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    await db.delete(correspondenceBlocks).where(and(
      eq(correspondenceBlocks.blockerUserId, ctx.user.id),
      eq(correspondenceBlocks.blockedUserId, input.blockedUserId),
    ));
    return { ok: true };
  }),

  report: protectedProcedure.input(z.object({
    threadId: z.number().int().positive(),
    messageId: z.number().int().positive().optional(),
    reason: z.enum(["spam", "harassment", "hate_speech", "threat", "other"]),
    notes: z.string().trim().max(500).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Correspondence is temporarily unavailable." });
    await requireThreadParticipant(db, input.threadId, ctx.user.id);
    if (input.messageId) {
      const [message] = await db.select({ id: correspondenceMessages.id }).from(correspondenceMessages)
        .where(and(eq(correspondenceMessages.id, input.messageId), eq(correspondenceMessages.threadId, input.threadId))).limit(1);
      if (!message) throw new TRPCError({ code: "NOT_FOUND", message: "Correspondence message not found." });
    }
    const [result] = await db.insert(correspondenceReports).values({
      threadId: input.threadId,
      messageId: input.messageId ?? null,
      reporterId: ctx.user.id,
      reason: input.reason,
      notes: input.notes ?? null,
    });
    return { ok: true, reportId: Number(result.insertId) };
  }),
});
