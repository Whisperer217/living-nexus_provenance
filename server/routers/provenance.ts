/**
 * server/routers/provenance.ts
 *
 * Work provenance — timeline events, lineage relationships, and witness invitations
 * attached to a song/work record.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getSongById,
  getWorkEvents,
  getWorkLineage,
  getWorkWitnesses,
  addWorkEvent,
  addLineageRelationship,
  inviteWitness,
  acceptWitnessInvite,
} from "../utils/db";

export const provenanceRouter = router({
  getTimeline: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => getWorkEvents(input.songId)),

  getLineage: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => getWorkLineage(input.songId)),

  getWitnesses: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => getWorkWitnesses(input.songId)),

  addEvent: protectedProcedure
    .input(z.object({
      songId:        z.number(),
      eventType:     z.string().min(1).max(64),
      eventLabel:    z.string().max(256).optional(),
      platformName:  z.string().max(128).optional(),
      platformUrl:   z.string().url().optional(),
      occurredAt:    z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await addWorkEvent({
        songId:        input.songId,
        eventType:     input.eventType,
        eventLabel:    input.eventLabel,
        actorId:       ctx.user.id,
        actorName:     ctx.user.name ?? ctx.user.artistHandle ?? undefined,
        platformName:  input.platformName,
        platformUrl:   input.platformUrl,
        isSystemEvent: false,
        occurredAt:    input.occurredAt,
      });
    }),

  addLineage: protectedProcedure
    .input(z.object({
      parentSongId:      z.number(),
      childSongId:       z.number(),
      relationshipType:  z.enum(["version", "remix", "remaster", "sample", "derivative", "translation"]),
      versionLabel:      z.string().max(128).optional(),
      notes:             z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const child = await getSongById(input.childSongId);
      if (!child || child.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await addLineageRelationship({ ...input, createdByUserId: ctx.user.id });
    }),

  inviteWitness: protectedProcedure
    .input(z.object({
      songId:               z.number(),
      role:                 z.string().min(1).max(64),
      customRole:           z.string().max(128).optional(),
      contributionPercent:  z.number().min(0).max(100).optional(),
      inviteEmail:          z.string().email().optional(),
      inviteeName:          z.string().max(256).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const token = await inviteWitness({
        songId:              input.songId,
        invitedByUserId:     ctx.user.id,
        role:                input.role,
        customRole:          input.customRole,
        contributionPercent: input.contributionPercent,
        inviteEmail:         input.inviteEmail,
        inviteeName:         input.inviteeName,
      });
      return { token, inviteUrl: `https://www.livingnexus.org/witness/accept?token=${token}` };
    }),

  acceptWitness: protectedProcedure
    .input(z.object({ token: z.string().min(1), testimony: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await acceptWitnessInvite(input.token, ctx.user.id, input.testimony);
    }),
});
