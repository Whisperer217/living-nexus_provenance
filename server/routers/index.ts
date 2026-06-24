/**
 * server/routers/index.ts
 *
 * Thin combiner — imports all focused single-namespace routers and assembles
 * the final appRouter.  No procedures live here.
 *
 * Each import below is a dedicated file with a single router({...}) export.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { normalizationRouter } from "./normalization";
import { qrRouter } from "./qr";

// ── Songs domain ──────────────────────────────────────────────────────────────
import { songsRouter }       from "./songs";
import { commentsRouter }    from "./comments";
import { eventsRouter }      from "./events";
import { songDownloadRouter } from "./songDownload";
import { moderationRouter }  from "./moderation";
import { versionsRouter }    from "./versions";
import { activationRouter }  from "./activation";
import { evidenceRouter }    from "./evidence";
import { searchRouter }      from "./search";

// ── Profile domain ────────────────────────────────────────────────────────────
import { authRouter }            from "./auth";
import { profileRouter }         from "./profile";
import { fieldNotesRouter }      from "./fieldNotes";
import { onboardingRouter }      from "./onboarding";
import { declarationRouter }     from "./declaration";
import { agentsRouter }          from "./agents";
import { userCollectionsRouter } from "./userCollections";
import { widsRouter }            from "./wids";

// ── Witness / provenance domain ───────────────────────────────────────────────
import { witnessRouter }              from "./witness";
import { witnessSubscriptionRouter }  from "./witnessSubscription";
import { imageGalleryRouter }         from "./imageGallery";
import { referenceRouter }            from "./reference";
import { witnessRegistryRouter }      from "./witnessRegistry";
import { guidesRouter }               from "./guides";
import { quiverRouter }               from "./quiver";
import { domainRouter }               from "./domain";
import { collectionsRouter }          from "./collections";

// ── Payment domain ────────────────────────────────────────────────────────────
import { tipsRouter }             from "./tips";
import { licensesRouter }         from "./licenses";
import { supportersRouter }       from "./supporters";
import { livingArchiveRouter }    from "./livingArchive";
import { paymentIntegrityRouter } from "./paymentIntegrity";
import { marketplaceRouter }      from "./marketplace";
import { satchelRouter }          from "./satchel";
import { ppgRouter }              from "./ppg";

// ── Admin domain ──────────────────────────────────────────────────────────────
import { adminRouter }   from "./admin";
import { promoRouter }   from "./promo";
import { discordRouter } from "./discord";
import { auditRouter }   from "./audit";
import { workerRouter }  from "./worker";

// ── Keeper / AI domain ────────────────────────────────────────────────────────
import { keeperRouter }      from "./keeper";
import { promptStudioRouter } from "./promptStudio";

// ── Platform domain ───────────────────────────────────────────────────────────
import { platformRouter }         from "./platform";
import { testimonyRouter }        from "./testimony";
import { playlistRouter }         from "./playlist";
import { playlistsRouter }        from "./playlists";
import { notificationsRouter }    from "./notifications";
import { globalActivityRouter }   from "./globalActivity";
import { booksRouter }            from "./books";
import { externalPlaylistsRouter } from "./externalPlaylists";
import { projectsRouter }         from "./projects";

// Re-export the Stripe webhook handler (lives in paymentIntegrity domain)
export { handleStripeWebhook } from "./stripeWebhook";

// ── DB helpers needed by inline routers ───────────────────────────────────────
import {
  getPlaybackSettings,
  savePlaybackSettings,
  updateSongFade,
  getSongById,
  getWorkEvents,
  getWorkLineage,
  getWorkWitnesses,
  addWorkEvent,
  addLineageRelationship,
  inviteWitness,
  acceptWitnessInvite,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "../utils/db";

// ── Inline routers (too small to warrant their own file) ──────────────────────

const playbackRouter = router({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return getPlaybackSettings(ctx.user.id);
  }),
  saveSettings: protectedProcedure
    .input(z.object({
      transitionMode: z.enum(["standard", "gapless", "crossfade", "album_blend"]).optional(),
      crossfadeDuration: z.number().min(1).max(12).optional(),
      globalFadeIn: z.number().min(0).max(8).optional(),
      globalFadeOut: z.number().min(0).max(8).optional(),
      respectTrackFades: z.boolean().optional(),
      preloadNext: z.boolean().optional(),
      albumMode: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return savePlaybackSettings(ctx.user.id, input as any);
    }),
  updateTrackFade: protectedProcedure
    .input(z.object({
      songId: z.number().int().positive(),
      fadeInSeconds: z.number().min(0).max(30).nullable(),
      fadeOutSeconds: z.number().min(0).max(30).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateSongFade(input.songId, ctx.user.id, input.fadeInSeconds, input.fadeOutSeconds);
      return { success: true };
    }),
});

const provenanceRouter = router({
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
      songId: z.number(),
      eventType: z.string().min(1).max(64),
      eventLabel: z.string().max(256).optional(),
      platformName: z.string().max(128).optional(),
      platformUrl: z.string().url().optional(),
      occurredAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await addWorkEvent({
        songId: input.songId,
        eventType: input.eventType,
        eventLabel: input.eventLabel,
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? ctx.user.artistHandle ?? undefined,
        platformName: input.platformName,
        platformUrl: input.platformUrl,
        isSystemEvent: false,
        occurredAt: input.occurredAt,
      });
    }),
  addLineage: protectedProcedure
    .input(z.object({
      parentSongId: z.number(),
      childSongId: z.number(),
      relationshipType: z.enum(["version", "remix", "remaster", "sample", "derivative", "translation"]),
      versionLabel: z.string().max(128).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const child = await getSongById(input.childSongId);
      if (!child || child.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await addLineageRelationship({ ...input, createdByUserId: ctx.user.id });
    }),
  inviteWitness: protectedProcedure
    .input(z.object({
      songId: z.number(),
      role: z.string().min(1).max(64),
      customRole: z.string().max(128).optional(),
      contributionPercent: z.number().min(0).max(100).optional(),
      inviteEmail: z.string().email().optional(),
      inviteeName: z.string().max(256).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const token = await inviteWitness({
        songId: input.songId,
        invitedByUserId: ctx.user.id,
        role: input.role,
        customRole: input.customRole,
        contributionPercent: input.contributionPercent,
        inviteEmail: input.inviteEmail,
        inviteeName: input.inviteeName,
      });
      return { token, inviteUrl: `https://www.livingnexus.org/witness/accept?token=${token}` };
    }),
  acceptWitness: protectedProcedure
    .input(z.object({ token: z.string().min(1), testimony: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await acceptWitnessInvite(input.token, ctx.user.id, input.testimony);
    }),
});

const apiKeyRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(128), tier: z.enum(["free", "pro", "enterprise"]).default("free") }))
    .mutation(async ({ input, ctx }) => {
      const { key, record } = await createApiKey(ctx.user.id, input.name, input.tier);
      return {
        key, id: record.id, keyPrefix: record.keyPrefix, name: record.name,
        tier: record.tier, dailyLimit: record.dailyLimit, createdAt: record.createdAt,
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

// ── Main appRouter ────────────────────────────────────────────────────────────
export const appRouter = router({
  // Framework
  system:            systemRouter,
  qr:                qrRouter,
  normalization:     normalizationRouter,
  apiKey:            apiKeyRouter,
  playback:          playbackRouter,
  provenance:        provenanceRouter,

  // Songs domain
  songs:             songsRouter,
  comments:          commentsRouter,
  events:            eventsRouter,
  songDownload:      songDownloadRouter,
  moderation:        moderationRouter,
  versions:          versionsRouter,
  activation:        activationRouter,
  evidence:          evidenceRouter,
  search:            searchRouter,

  // Profile domain
  auth:              authRouter,
  profile:           profileRouter,
  fieldNotes:        fieldNotesRouter,
  onboarding:        onboardingRouter,
  declaration:       declarationRouter,
  agents:            agentsRouter,
  userCollections:   userCollectionsRouter,
  wids:              widsRouter,

  // Witness / provenance domain
  witness:              witnessRouter,
  witnessSubscription:  witnessSubscriptionRouter,
  imageGallery:         imageGalleryRouter,
  reference:            referenceRouter,
  witnessRegistry:      witnessRegistryRouter,
  guides:               guidesRouter,
  quiver:               quiverRouter,
  domain:               domainRouter,
  collections:          collectionsRouter,

  // Payment domain
  tips:              tipsRouter,
  licenses:          licensesRouter,
  supporters:        supportersRouter,
  livingArchive:     livingArchiveRouter,
  paymentIntegrity:  paymentIntegrityRouter,
  marketplace:       marketplaceRouter,
  satchel:           satchelRouter,
  ppg:               ppgRouter,

  // Admin domain
  admin:             adminRouter,
  promo:             promoRouter,
  discord:           discordRouter,
  audit:             auditRouter,
  worker:            workerRouter,

  // Keeper / AI domain
  keeper:            keeperRouter,
  promptStudio:      promptStudioRouter,

  // Platform domain
  platform:          platformRouter,
  testimony:         testimonyRouter,
  playlist:          playlistRouter,
  playlists:         playlistsRouter,
  notifications:     notificationsRouter,
  globalActivity:    globalActivityRouter,
  books:             booksRouter,
  externalPlaylists: externalPlaylistsRouter,
  projects:          projectsRouter,
});

export type AppRouter = typeof appRouter;
