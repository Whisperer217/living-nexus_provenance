/**
 * server/routers/visualWorks.ts
 *
 * tRPC router for the Visual Works medium — the 6th creative medium on Living Nexus.
 *
 * Procedures:
 *   createCollection      — create a new visual works collection (draft)
 *   uploadItem            — upload a single image into a collection (returns WID-VIS)
 *   publishCollection     — seal the collection with a WID-VWC and set status = published
 *   getMyCollections      — list all collections for the logged-in creator
 *   getCollection         — public: get a single collection with its items
 *   getPublicCollections  — public: browse published collections
 *   updateCollection      — update collection metadata
 *   updateItem            — update individual item metadata
 *   deleteItem            — remove an item from a collection
 *   deleteCollection      — delete an unpublished collection
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../utils/storage";
import {
  createVisualWork,
  getVisualWorkById,
  getVisualWorksByCreator,
  getPublicVisualWorks,
  updateVisualWork,
  publishVisualWork,
  deleteVisualWork,
  createVisualItem,
  getVisualItemsByCollection,
  getVisualItemById,
  updateVisualItem,
  deleteVisualItem,
  countVisualItemsInCollection,
} from "../db/visualWorks";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generateWid(prefix: string, input: string): Promise<string> {
  const { createHash } = await import("crypto");
  const hash = createHash("sha256")
    .update(input + Date.now().toString())
    .digest("hex");
  return `${prefix}-${hash.slice(0, 8).toUpperCase()}-${hash.slice(8, 16).toUpperCase()}`;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const visualWorksRouter = router({

  // ── Create a new collection (draft) ────────────────────────────────────────
  createCollection: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(512),
      description: z.string().max(4000).optional(),
      mediumType: z.string().max(64).optional(),
      style: z.string().max(256).optional(),
      subject: z.string().max(256).optional(),
      keywords: z.string().max(1000).optional(),
      license: z.string().max(128).optional(),
      copyright: z.string().max(256).optional(),
      haaiDisclosure: z.enum(["none", "assisted", "generated"]).optional(),
      originStory: z.string().max(4000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await createVisualWork({
        creatorId: ctx.user.id,
        ...input,
      });
      return { id: (result as { insertId: number }).insertId };
    }),

  // ── Upload a single image item ──────────────────────────────────────────────
  uploadItem: protectedProcedure
    .input(z.object({
      collectionId: z.number().int().positive(),
      // Base64-encoded image data
      imageData: z.string().min(1),
      mimeType: z.string().default("image/jpeg"),
      fileName: z.string().max(256).optional(),
      // Item metadata
      title: z.string().max(512).optional(),
      description: z.string().max(4000).optional(),
      mediumType: z.string().max(64).optional(),
      style: z.string().max(256).optional(),
      subject: z.string().max(256).optional(),
      dimensions: z.string().max(64).optional(),
      resolution: z.string().max(32).optional(),
      aspectRatio: z.string().max(16).optional(),
      colorProfile: z.string().max(32).optional(),
      cameraInfo: z.string().max(256).optional(),
      haaiDisclosure: z.enum(["none", "assisted", "generated"]).optional(),
      creationDate: z.string().max(32).optional(),
      license: z.string().max(128).optional(),
      copyright: z.string().max(256).optional(),
      keywords: z.string().max(1000).optional(),
      versionLabel: z.string().max(64).optional(),
      displayOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the collection belongs to this creator
      const collection = await getVisualWorkById(input.collectionId);
      if (!collection) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
      if (collection.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Decode base64 image and upload to S3
      const imageBuffer = Buffer.from(input.imageData, "base64");
      const { createHash } = await import("crypto");
      const contentHash = createHash("sha256").update(imageBuffer).digest("hex");

      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const suffix = Math.random().toString(36).slice(2, 8);
      const fileKey = `visual-works/${ctx.user.id}/${input.collectionId}/${suffix}.${ext}`;

      const { url: imageUrl } = await storagePut(fileKey, imageBuffer, input.mimeType);

      // Generate WID-VIS
      const witnessId = await generateWid("WID-VIS", `${ctx.user.id}:${contentHash}`);

      // Determine display order
      const itemCount = await countVisualItemsInCollection(input.collectionId);
      const displayOrder = input.displayOrder ?? itemCount;

      const result = await createVisualItem({
        collectionId: input.collectionId,
        creatorId: ctx.user.id,
        imageUrl,
        imageKey: fileKey,
        contentHash,
        witnessId,
        displayOrder,
        title: input.title,
        description: input.description,
        mediumType: input.mediumType,
        style: input.style,
        subject: input.subject,
        dimensions: input.dimensions,
        resolution: input.resolution,
        aspectRatio: input.aspectRatio,
        colorProfile: input.colorProfile,
        cameraInfo: input.cameraInfo,
        haaiDisclosure: input.haaiDisclosure ?? "none",
        creationDate: input.creationDate,
        license: input.license,
        copyright: input.copyright,
        keywords: input.keywords,
        versionLabel: input.versionLabel,
      });

      // If this is the first item, set it as the collection cover
      if (itemCount === 0) {
        await updateVisualWork(input.collectionId, ctx.user.id, { coverUrl: imageUrl });
      }

      return {
        id: (result as { insertId: number }).insertId,
        witnessId,
        imageUrl,
      };
    }),

  // ── Publish a collection — seals it with a WID-VWC ─────────────────────────
  publishCollection: protectedProcedure
    .input(z.object({ collectionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const collection = await getVisualWorkById(input.collectionId);
      if (!collection) throw new TRPCError({ code: "NOT_FOUND" });
      if (collection.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const items = await getVisualItemsByCollection(input.collectionId);
      if (items.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot publish an empty collection" });
      }

      // Generate WID-VWC from sorted item WIDs
      const { createHash } = await import("crypto");
      const widArray = items.map((i: { witnessId: string | null }) => i.witnessId ?? "").filter(Boolean).sort();
      const collectiveHash = createHash("sha256").update(widArray.join("|")).digest("hex");
      const collectionWid = `WID-VWC-${collectiveHash.slice(0, 8).toUpperCase()}-${collectiveHash.slice(8, 16).toUpperCase()}`;

      await publishVisualWork(input.collectionId, ctx.user.id, collectionWid);

      return { collectionWid };
    }),

  // ── Get my collections ──────────────────────────────────────────────────────
  getMyCollections: protectedProcedure.query(async ({ ctx }) => {
    return getVisualWorksByCreator(ctx.user.id);
  }),

  // ── Get a single collection with items (public) ─────────────────────────────
  getCollection: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const collection = await getVisualWorkById(input.id);
      if (!collection) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await getVisualItemsByCollection(input.id);
      return { collection, items };
    }),

  // ── Browse published collections ────────────────────────────────────────────
  getPublicCollections: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      return getPublicVisualWorks(input.limit);
    }),

  // ── Update collection metadata ──────────────────────────────────────────────
  updateCollection: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      title: z.string().min(1).max(512).optional(),
      description: z.string().max(4000).optional(),
      mediumType: z.string().max(64).optional(),
      style: z.string().max(256).optional(),
      subject: z.string().max(256).optional(),
      keywords: z.string().max(1000).optional(),
      license: z.string().max(128).optional(),
      copyright: z.string().max(256).optional(),
      haaiDisclosure: z.enum(["none", "assisted", "generated"]).optional(),
      originStory: z.string().max(4000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const collection = await getVisualWorkById(id);
      if (!collection) throw new TRPCError({ code: "NOT_FOUND" });
      if (collection.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateVisualWork(id, ctx.user.id, data);
      return { success: true };
    }),

  // ── Update item metadata ────────────────────────────────────────────────────
  updateItem: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      title: z.string().max(512).optional(),
      description: z.string().max(4000).optional(),
      mediumType: z.string().max(64).optional(),
      style: z.string().max(256).optional(),
      subject: z.string().max(256).optional(),
      dimensions: z.string().max(64).optional(),
      resolution: z.string().max(32).optional(),
      aspectRatio: z.string().max(16).optional(),
      colorProfile: z.string().max(32).optional(),
      cameraInfo: z.string().max(256).optional(),
      haaiDisclosure: z.enum(["none", "assisted", "generated"]).optional(),
      creationDate: z.string().max(32).optional(),
      license: z.string().max(128).optional(),
      copyright: z.string().max(256).optional(),
      keywords: z.string().max(1000).optional(),
      versionLabel: z.string().max(64).optional(),
      displayOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const item = await getVisualItemById(id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      if (item.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateVisualItem(id, ctx.user.id, data);
      return { success: true };
    }),

  // ── Delete an item ──────────────────────────────────────────────────────────
  deleteItem: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getVisualItemById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      if (item.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteVisualItem(input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Delete a collection (only if still draft) ───────────────────────────────
  deleteCollection: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const collection = await getVisualWorkById(input.id);
      if (!collection) throw new TRPCError({ code: "NOT_FOUND" });
      if (collection.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (collection.status === "published") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Published collections cannot be deleted — only archived" });
      }
      await deleteVisualWork(input.id, ctx.user.id);
      return { success: true };
    }),
});
