/**
 * server/routers/playback.ts
 *
 * Playback settings — per-user audio transition preferences and per-track fade overrides.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getPlaybackSettings,
  savePlaybackSettings,
  updateSongFade,
  getSongById,
} from "../utils/db";

export const playbackRouter = router({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return getPlaybackSettings(ctx.user.id);
  }),

  saveSettings: protectedProcedure
    .input(z.object({
      transitionMode:     z.enum(["standard", "gapless", "crossfade", "album_blend"]).optional(),
      crossfadeDuration:  z.number().min(1).max(12).optional(),
      globalFadeIn:       z.number().min(0).max(8).optional(),
      globalFadeOut:      z.number().min(0).max(8).optional(),
      respectTrackFades:  z.boolean().optional(),
      preloadNext:        z.boolean().optional(),
      albumMode:          z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return savePlaybackSettings(ctx.user.id, input as any);
    }),

  updateTrackFade: protectedProcedure
    .input(z.object({
      songId:          z.number().int().positive(),
      fadeInSeconds:   z.number().min(0).max(30).nullable(),
      fadeOutSeconds:  z.number().min(0).max(30).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateSongFade(input.songId, ctx.user.id, input.fadeInSeconds, input.fadeOutSeconds);
      return { success: true };
    }),
});
