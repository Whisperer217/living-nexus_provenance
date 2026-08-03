/**
 * @domain   The Creative Operating System → Manifestation Sessions
 * @impl     Server Router — session lifecycle, event log, provenance graph
 *
 * A Manifestation Session is the core primitive of the Creative OS.
 * It is created at the moment of intent declaration — before any work exists.
 * Every prompt, image, lyric, revision, and AI response is appended to the
 * session's event log, forming an append-only provenance graph anchored to
 * the creator's original intent.
 *
 * Session WID format: LN-SESSION-{SLUG}-{ID}
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../utils/db";
import { eq, desc, and } from "drizzle-orm";
import { manifestationSessions, sessionEvents } from "../../drizzle/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSessionWid(name: string, id: number): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return `LN-SESSION-${slug}-${String(id).padStart(4, "0")}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const sessionsRouter = router({

  /**
   * Create a new Manifestation Session.
   * Issues a Session WID at the moment of intent declaration.
   * Appends an INTENT_DECLARED event to the provenance graph.
   */
  create: protectedProcedure
    .input(z.object({
      name:                 z.string().min(1).max(256),
      intent:               z.string().min(1).max(2000),
      medium:               z.enum(["music", "book", "research", "film", "visual_art", "software", "other"]),
      collaborators:        z.string().optional(),   // JSON array string
      declaration:          z.string().optional(),
      guideWid:             z.string().optional(),
      humanContributions:   z.array(z.string()).optional(),
      aiContributions:      z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Insert the session first to get the auto-increment ID
      const db = await getDb();

      const [result] = await db.insert(manifestationSessions).values({
        userId:              ctx.user.id,
        sessionWid:          `LN-SESSION-PENDING-${Date.now()}`, // temp, updated below
        name:                input.name,
        intent:              input.intent,
        medium:              input.medium,
        collaborators:       input.collaborators ?? null,
        declaration:         input.declaration ?? null,
        guideWid:            input.guideWid ?? null,
        humanContributions:  input.humanContributions ?? null,
        aiContributions:     input.aiContributions ?? null,
        status:              "active",
      });

      const sessionId = (result as { insertId: number }).insertId;

      // Generate the canonical Session WID using the real ID
      const sessionWid = generateSessionWid(input.name, sessionId);

      // Update with the real WID
      await db.update(manifestationSessions)
        .set({ sessionWid })
        .where(eq(manifestationSessions.id, sessionId));

      // Append the founding event: INTENT_DECLARED
      await db.insert(sessionEvents).values({
        sessionId,
        eventType: "INTENT_DECLARED",
        actorType: "creator",
        actorId:   String(ctx.user.id),
        payload:   {
          name:      input.name,
          intent:    input.intent,
          medium:    input.medium,
          guideWid:  input.guideWid ?? null,
          declaration: input.declaration ?? null,
        },
        summary: `Manifestation "${input.name}" declared. Intent: ${input.intent.slice(0, 120)}${input.intent.length > 120 ? "…" : ""}`,
      });

      // Fetch and return the full session
      const session = await db.select()
        .from(manifestationSessions)
        .where(eq(manifestationSessions.id, sessionId))
        .limit(1);

      return { session: session[0], sessionWid };
    }),

  /**
   * Append an event to the session's provenance graph.
   * This is the core append-only write — every creative action flows through here.
   */
  addEvent: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      eventType: z.string().min(1).max(64),
      actorType: z.enum(["creator", "ai", "system"]).default("creator"),
      actorId:   z.string().optional(),
      payload:   z.record(z.string(), z.unknown()).optional(),
      summary:   z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Verify the session belongs to this user
      const sessions = await db.select({ id: manifestationSessions.id, userId: manifestationSessions.userId })
        .from(manifestationSessions)
        .where(eq(manifestationSessions.id, input.sessionId))
        .limit(1);

      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (sessions[0].userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const [result] = await db.insert(sessionEvents).values({
        sessionId: input.sessionId,
        eventType: input.eventType,
        actorType: input.actorType,
        actorId:   input.actorId ?? String(ctx.user.id),
        payload:   input.payload ?? null,
        summary:   input.summary ?? null,
      });

      return { eventId: (result as { insertId: number }).insertId };
    }),

  /**
   * Get a single session with its metadata.
   */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      const sessions = await db.select()
        .from(manifestationSessions)
        .where(and(
          eq(manifestationSessions.id, input.sessionId),
          eq(manifestationSessions.userId, ctx.user.id),
        ))
        .limit(1);

      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND" });
      return sessions[0];
    }),

  /**
   * Get the full event timeline for a session (append-only provenance graph).
   */
  getTimeline: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Verify ownership
      const sessions = await db.select({ userId: manifestationSessions.userId })
        .from(manifestationSessions)
        .where(eq(manifestationSessions.id, input.sessionId))
        .limit(1);

      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND" });
      if (sessions[0].userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const events = await db.select()
        .from(sessionEvents)
        .where(eq(sessionEvents.sessionId, input.sessionId))
        .orderBy(sessionEvents.createdAt);

      return events;
    }),

  /**
   * List all Manifestation Sessions for the authenticated creator.
   */
  listMine: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "paused", "completed", "archived"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      const conditions = [eq(manifestationSessions.userId, ctx.user.id)];
      if (input?.status) {
        conditions.push(eq(manifestationSessions.status, input.status));
      }

      const sessions = await db.select()
        .from(manifestationSessions)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(manifestationSessions.updatedAt));

      return sessions;
    }),

  /**
   * Update session status (active → paused → completed → archived).
   */
  updateStatus: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      status:    z.enum(["active", "paused", "completed", "archived"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      const sessions = await db.select({ userId: manifestationSessions.userId })
        .from(manifestationSessions)
        .where(eq(manifestationSessions.id, input.sessionId))
        .limit(1);

      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND" });
      if (sessions[0].userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await db.update(manifestationSessions)
        .set({ status: input.status })
        .where(eq(manifestationSessions.id, input.sessionId));

      // Append status change event
      await db.insert(sessionEvents).values({
        sessionId: input.sessionId,
        eventType: "STATUS_CHANGED",
        actorType: "creator",
        actorId:   String(ctx.user.id),
        payload:   { newStatus: input.status },
        summary:   `Session status changed to ${input.status}`,
      });

      return { success: true };
    }),

  /**
   * Link a Work WID to the session when the creator issues the final registration.
   * Marks the session as completed.
   */
  linkWorkWid: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      workWid:   z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      const sessions = await db.select({ userId: manifestationSessions.userId })
        .from(manifestationSessions)
        .where(eq(manifestationSessions.id, input.sessionId))
        .limit(1);

      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND" });
      if (sessions[0].userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await db.update(manifestationSessions)
        .set({ workWid: input.workWid, status: "completed" })
        .where(eq(manifestationSessions.id, input.sessionId));

      // Append the culminating event
      await db.insert(sessionEvents).values({
        sessionId: input.sessionId,
        eventType: "WORK_REGISTERED",
        actorType: "creator",
        actorId:   String(ctx.user.id),
        payload:   { workWid: input.workWid },
        summary:   `Work WID issued: ${input.workWid}. Creative journey complete.`,
      });

      return { success: true };
    }),

  /**
   * Update the Manifestation Record fields — contributions, transformation summary, declaration.
   * Called from the ManifestationRecord panel when the creator saves their record.
   */
  updateRecord: protectedProcedure
    .input(z.object({
      sessionId:            z.number(),
      humanContributions:   z.array(z.string()).optional(),
      aiContributions:      z.array(z.string()).optional(),
      transformationSummary: z.string().optional(),
      declaration:          z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      const sessions = await db.select({ userId: manifestationSessions.userId })
        .from(manifestationSessions)
        .where(eq(manifestationSessions.id, input.sessionId))
        .limit(1);

      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND" });
      if (sessions[0].userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const updatePayload: Record<string, unknown> = {};
      if (input.humanContributions !== undefined) updatePayload.humanContributions = input.humanContributions;
      if (input.aiContributions !== undefined) updatePayload.aiContributions = input.aiContributions;
      if (input.transformationSummary !== undefined) updatePayload.transformationSummary = input.transformationSummary;
      if (input.declaration !== undefined) updatePayload.declaration = input.declaration;

      await db.update(manifestationSessions)
        .set(updatePayload)
        .where(eq(manifestationSessions.id, input.sessionId));

      // Append record update event
      await db.insert(sessionEvents).values({
        sessionId: input.sessionId,
        eventType: "RECORD_UPDATED",
        actorType: "creator",
        actorId:   String(ctx.user.id),
        payload:   { fields: Object.keys(updatePayload) },
        summary:   `Manifestation Record updated: ${Object.keys(updatePayload).join(", ")}`,
      });

      return { success: true };
    }),

  getByWid: publicProcedure
    .input(z.object({ sessionWid: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();

      const sessions = await db.select()
        .from(manifestationSessions)
        .where(eq(manifestationSessions.sessionWid, input.sessionWid))
        .limit(1);

      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND" });
      // Return public fields only
      const s = sessions[0];
      return {
        sessionWid: s.sessionWid,
        name:       s.name,
        intent:     s.intent,
        medium:     s.medium,
        declaration: s.declaration,
        guideWid:   s.guideWid,
        workWid:    s.workWid,
        status:     s.status,
        createdAt:  s.createdAt,
      };
    }),
});

export type SessionsRouter = typeof sessionsRouter;
