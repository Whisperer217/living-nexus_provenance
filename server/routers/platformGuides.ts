/**
 * @domain   Platform Guides — self-publishable how-to articles by the owner
 * @impl     tRPC router: list, get, create, update, delete, publish/unpublish
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../utils/db";

const GUIDE_CATEGORIES = [
  "getting-started",
  "registration",
  "keeper-avatar",
  "store",
  "provenance",
  "3d-print",
  "music",
  "general",
] as const;

export const platformGuidesRouter = router({
  // ── Public: list published guides (optionally filtered by category) ──────────
  list: publicProcedure
    .input(z.object({
      category: z.enum(GUIDE_CATEGORIES).optional(),
      featuredOnly: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { platformGuides } = await import("../../drizzle/schema");
      const { eq, and, desc } = await import("drizzle-orm");

      const conditions = [eq(platformGuides.published, true)];
      if (input?.category) conditions.push(eq(platformGuides.category, input.category));
      if (input?.featuredOnly) conditions.push(eq(platformGuides.featured, true));

      const rows = await db
        .select()
        .from(platformGuides)
        .where(and(...conditions))
        .orderBy(desc(platformGuides.featured), desc(platformGuides.createdAt));

      return rows;
    }),

  // ── Public: get a single guide by slug ───────────────────────────────────────
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { platformGuides } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const [guide] = await db
        .select()
        .from(platformGuides)
        .where(and(eq(platformGuides.slug, input.slug), eq(platformGuides.published, true)))
        .limit(1);

      if (!guide) throw new TRPCError({ code: "NOT_FOUND", message: "Guide not found" });
      return guide;
    }),

  // ── Owner: list ALL guides (including drafts) ────────────────────────────────
  listAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const { platformGuides } = await import("../../drizzle/schema");
    const { eq, desc } = await import("drizzle-orm");

    const rows = await db
      .select()
      .from(platformGuides)
      .where(eq(platformGuides.authorId, ctx.user.id))
      .orderBy(desc(platformGuides.createdAt));

    return rows;
  }),

  // ── Owner: get a single guide by id (including drafts) ───────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { platformGuides } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const [guide] = await db
        .select()
        .from(platformGuides)
        .where(and(eq(platformGuides.id, input.id), eq(platformGuides.authorId, ctx.user.id)))
        .limit(1);

      if (!guide) throw new TRPCError({ code: "NOT_FOUND", message: "Guide not found" });
      return guide;
    }),

  // ── Owner: create a new guide ─────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      slug: z.string().min(2).max(128).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
      title: z.string().min(1).max(256),
      summary: z.string().max(512).optional(),
      body: z.string().optional(),
      coverImageUrl: z.string().url().optional(),
      category: z.enum(GUIDE_CATEGORIES).default("general"),
      readingTimeMinutes: z.number().min(1).max(60).default(3),
      featured: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { platformGuides } = await import("../../drizzle/schema");

      const result = await db.insert(platformGuides).values({
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        body: input.body ?? "",
        coverImageUrl: input.coverImageUrl,
        category: input.category,
        readingTimeMinutes: input.readingTimeMinutes,
        featured: input.featured,
        authorId: ctx.user.id,
        published: false,
      });

      return { id: (result as any)[0]?.insertId };
    }),

  // ── Owner: update an existing guide ──────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(256).optional(),
      summary: z.string().max(512).optional(),
      body: z.string().optional(),
      coverImageUrl: z.string().url().nullable().optional(),
      category: z.enum(GUIDE_CATEGORIES).optional(),
      readingTimeMinutes: z.number().min(1).max(60).optional(),
      featured: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { platformGuides } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const { id, ...updates } = input;
      const filtered = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );

      await db.update(platformGuides)
        .set(filtered)
        .where(and(eq(platformGuides.id, id), eq(platformGuides.authorId, ctx.user.id)));

      return { ok: true };
    }),

  // ── Owner: toggle published status ───────────────────────────────────────────
  togglePublished: protectedProcedure
    .input(z.object({ id: z.number(), published: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { platformGuides } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      await db.update(platformGuides)
        .set({ published: input.published })
        .where(and(eq(platformGuides.id, input.id), eq(platformGuides.authorId, ctx.user.id)));

      return { ok: true };
    }),

  // ── Owner: delete a guide ─────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { platformGuides } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      await db.delete(platformGuides)
        .where(and(eq(platformGuides.id, input.id), eq(platformGuides.authorId, ctx.user.id)));

      return { ok: true };
    }),
});
