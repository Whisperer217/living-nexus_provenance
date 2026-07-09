/**
 * Collection Studio Router
 *
 * Provides all CRUD + management procedures for WID-ALB collections (Albums).
 * Phase 2 will extend this to cover Playlists.
 *
 * Namespace: trpc.collectionStudio.*
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../utils/storage";
import {
  getCollectionsByCreator,
  getSongsByCollectionId,
  getUserById,
} from "../utils/db";
import {
  logCollectionVersion,
  getCollectionVersionHistory,
  updateCollectionMeta,
  reorderCollectionTracks,
  removeFromCollectionById,
  addToCollectionById,
  replaceInCollectionById,
  getCreatorSongsNotInCollection,
} from "../db/songs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a WID-ALB collection and verify the caller is its owner. */
async function requireOwnedCollection(collectionId: number, callerId: number) {
  const rows = await getCollectionsByCreator(callerId);
  const col = (rows as any[]).find((c: any) => c.id === collectionId);
  if (!col) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Collection not found or you do not own it.",
    });
  }
  return col;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const collectionStudioRouter = router({

  /**
   * Get a single collection with its full track list.
   * Owner-only — returns the raw collection object including private metadata.
   */
  getCollection: protectedProcedure
    .input(z.object({ collectionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const col = await requireOwnedCollection(input.collectionId, ctx.user.id);
      const tracks = await getSongsByCollectionId(input.collectionId);
      return { collection: col, tracks };
    }),

  /**
   * List all WID-ALB collections owned by the authenticated creator.
   */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return getCollectionsByCreator(ctx.user.id);
  }),

  /**
   * Update collection metadata: name, description, visibility.
   */
  updateMeta: protectedProcedure
    .input(z.object({
      collectionId: z.number().int().positive(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      visibility: z.enum(["public", "unlisted", "private"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { collectionId, ...data } = input;
      await requireOwnedCollection(collectionId, ctx.user.id);
      const updated = await updateCollectionMeta(collectionId, ctx.user.id, data);
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Update failed." });
      await logCollectionVersion({
        collectionId,
        actorId: ctx.user.id,
        eventType: "meta_updated",
        description: `Metadata updated: ${Object.keys(data).join(", ")}`,
      });
      return { success: true };
    }),

  /**
   * Upload a new cover image for the collection.
   * Accepts a base64-encoded image string.
   */
  uploadCover: protectedProcedure
    .input(z.object({
      collectionId: z.number().int().positive(),
      base64: z.string().min(1),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedCollection(input.collectionId, ctx.user.id);
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const key = `collection-covers/${ctx.user.id}/${input.collectionId}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      // Update coverArtUrl on the collection
      const { getDb } = await import("../utils/db");
      const { collections } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.update(collections)
          .set({ coverArtUrl: url } as any)
          .where(and(eq(collections.id, input.collectionId), eq(collections.creatorId, ctx.user.id)));
      }
      await logCollectionVersion({
        collectionId: input.collectionId,
        actorId: ctx.user.id,
        eventType: "meta_updated",
        description: "Cover art updated",
      });
      return { url };
    }),

  /**
   * Reorder tracks in a collection.
   * orderedSongIds must be the complete ordered list of song IDs currently in the collection.
   */
  reorderTracks: protectedProcedure
    .input(z.object({
      collectionId: z.number().int().positive(),
      orderedSongIds: z.array(z.number().int().positive()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedCollection(input.collectionId, ctx.user.id);
      await reorderCollectionTracks(input.collectionId, ctx.user.id, input.orderedSongIds);
      await logCollectionVersion({
        collectionId: input.collectionId,
        actorId: ctx.user.id,
        eventType: "tracks_reordered",
        description: `${input.orderedSongIds.length} tracks reordered`,
      });
      return { success: true };
    }),

  /**
   * Remove a track from the collection (unlinks; does not delete the song).
   */
  removeTrack: protectedProcedure
    .input(z.object({
      collectionId: z.number().int().positive(),
      songId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedCollection(input.collectionId, ctx.user.id);
      // Get song title for the version log
      const { getSongById } = await import("../utils/db");
      const song = await getSongById(input.songId);
      await removeFromCollectionById(input.collectionId, input.songId, ctx.user.id);
      await logCollectionVersion({
        collectionId: input.collectionId,
        actorId: ctx.user.id,
        eventType: "track_removed",
        description: `Removed: "${song?.title ?? input.songId}"`,
      });
      return { success: true };
    }),

  /**
   * Add an existing song from the creator's archive to the collection.
   */
  addTrack: protectedProcedure
    .input(z.object({
      collectionId: z.number().int().positive(),
      songId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedCollection(input.collectionId, ctx.user.id);
      const { getSongById } = await import("../utils/db");
      const song = await getSongById(input.songId);
      await addToCollectionById(input.collectionId, input.songId, ctx.user.id);
      await logCollectionVersion({
        collectionId: input.collectionId,
        actorId: ctx.user.id,
        eventType: "track_added",
        description: `Added: "${song?.title ?? input.songId}"`,
      });
      return { success: true };
    }),

  /**
   * Replace a track in the collection with another song from the creator's archive.
   */
  replaceTrack: protectedProcedure
    .input(z.object({
      collectionId: z.number().int().positive(),
      oldSongId: z.number().int().positive(),
      newSongId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedCollection(input.collectionId, ctx.user.id);
      const { getSongById } = await import("../utils/db");
      const [oldSong, newSong] = await Promise.all([
        getSongById(input.oldSongId),
        getSongById(input.newSongId),
      ]);
      await replaceInCollectionById(input.collectionId, input.oldSongId, input.newSongId, ctx.user.id);
      await logCollectionVersion({
        collectionId: input.collectionId,
        actorId: ctx.user.id,
        eventType: "track_replaced",
        description: `Replaced "${oldSong?.title ?? input.oldSongId}" → "${newSong?.title ?? input.newSongId}"`,
      });
      return { success: true };
    }),

  /**
   * Get the full version history for a collection.
   */
  getVersionHistory: protectedProcedure
    .input(z.object({ collectionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireOwnedCollection(input.collectionId, ctx.user.id);
      return getCollectionVersionHistory(input.collectionId);
    }),

  /**
   * Get all songs in the creator's archive that are not currently in any collection.
   * Used by the Add Track and Replace Track pickers.
   */
  getAvailableSongs: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const songs = await getCreatorSongsNotInCollection(ctx.user.id);
      if (input.search) {
        const q = input.search.toLowerCase();
        return (songs as any[]).filter((s: any) =>
          s.title?.toLowerCase().includes(q) ||
          s.genre?.toLowerCase().includes(q)
        );
      }
      return songs;
    }),
});
