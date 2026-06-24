/**
 * server/routers/index.ts
 *
 * Thin combiner — imports all domain-specific routers and assembles the
 * final appRouter.  No procedures live here; all logic is in the domain files.
 *
 * Domain files:
 *   songsRouter.ts     — songs, comments, events, songDownload, moderation, versions, activation, evidence, search
 *   profileRouter.ts   — auth, profile, fieldNotes, onboarding, declaration, agents, userCollections, wids
 *   witnessRouter.ts   — witness, witnessSubscription, imageGallery, reference, witnessRegistry, guides, quiver, domain, collections
 *   paymentRouter.ts   — tips, licenses, supporters, livingArchive, paymentIntegrity, marketplace, satchel, ppg
 *   adminRouter.ts     — admin, promo, discord, audit, worker
 *   keeperRouter.ts    — keeper, promptStudio
 *   platformRouter.ts  — platform, testimony, playlist, playlists, notifications, globalActivity, books, externalPlaylists, projects
 *
 * Inline routers (small, no domain file needed):
 *   playbackRouter, provenanceRouter, apiKeyRouter  — defined below
 *
 * Stripe webhook handler:
 *   handleStripeWebhook — exported from paymentRouter.ts
 */

import Stripe from "stripe";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { normalizationRouter } from "./normalization";
import { qrRouter } from "./qr";

// ── Domain routers ────────────────────────────────────────────────────────────
import {
  songsProcedures,
  commentsProcedures,
  eventsProcedures,
  songDownloadProcedures,
  moderationProcedures,
  versionsProcedures,
  activationProcedures,
  evidenceProcedures,
  searchProcedures,
} from "./songsRouter";

import {
  authProcedures,
  profileProcedures,
  fieldNotesProcedures,
  onboardingProcedures,
  declarationProcedures,
  agentsProcedures,
  userCollectionsProcedures,
  widsProcedures,
} from "./profileRouter";

import {
  witnessProcedures,
  witnessSubscriptionProcedures,
  imageGalleryProcedures,
  referenceProcedures,
  witnessRegistryProcedures,
  guidesProcedures,
  quiverProcedures,
  domainProcedures,
  collectionsProcedures,
} from "./witnessRouter";

import {
  tipsProcedures,
  licensesProcedures,
  supportersProcedures,
  livingArchiveProcedures,
  paymentIntegrityProcedures,
  marketplaceProcedures,
  satchelProcedures,
  ppgProcedures,
} from "./paymentRouter";

import {
  adminProcedures,
  promoProcedures,
  discordProcedures,
  auditProcedures,
  workerProcedures,
} from "./adminRouter";

import {
  keeperProcedures,
  promptStudioProcedures,
} from "./keeperRouter";

import {
  platformProcedures,
  testimonyProcedures,
  playlistProcedures,
  playlistsProcedures,
  notificationsProcedures,
  globalActivityProcedures,
  booksProcedures,
  externalPlaylistsProcedures,
  projectsProcedures,
} from "./platformRouter";

// Re-export the Stripe webhook handler from paymentRouter
export { handleStripeWebhook } from "./paymentRouter";

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

// ── Inline routers (small, self-contained) ────────────────────────────────────

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
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      await updateSongFade(input.songId, ctx.user.id, input.fadeInSeconds, input.fadeOutSeconds);
      return { success: true };
    }),
});

const provenanceRouter = router({
  getTimeline: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => {
      return getWorkEvents(input.songId);
    }),
  getLineage: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => {
      return getWorkLineage(input.songId);
    }),
  getWitnesses: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => {
      return getWorkWitnesses(input.songId);
    }),
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
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
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
      relationshipType: z.enum(['version', 'remix', 'remaster', 'sample', 'derivative', 'translation']),
      versionLabel: z.string().max(128).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const child = await getSongById(input.childSongId);
      if (!child || child.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
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
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      const token = await inviteWitness({
        songId: input.songId,
        invitedByUserId: ctx.user.id,
        role: input.role,
        customRole: input.customRole,
        contributionPercent: input.contributionPercent,
        inviteEmail: input.inviteEmail,
        inviteeName: input.inviteeName,
      });
      const inviteUrl = `https://www.livingnexus.org/witness/accept?token=${token}`;
      return { token, inviteUrl };
    }),
  acceptWitness: protectedProcedure
    .input(z.object({
      token: z.string().min(1),
      testimony: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await acceptWitnessInvite(input.token, ctx.user.id, input.testimony);
    }),
});

const apiKeyRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(128), tier: z.enum(["free", "pro", "enterprise"]).default("free") }))
    .mutation(async ({ input, ctx }) => {
      const { key, record } = await createApiKey(ctx.user.id, input.name, input.tier);
      return { key, id: record.id, keyPrefix: record.keyPrefix, name: record.name, tier: record.tier, dailyLimit: record.dailyLimit, createdAt: record.createdAt };
    }),
  list: protectedProcedure.query(async ({ ctx }) => listApiKeys(ctx.user.id)),
  revoke: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => { await revokeApiKey(input.id, ctx.user.id); return { success: true }; }),
});

// ── Main appRouter — assembles all domain routers ─────────────────────────────
export const appRouter = router({
  // Framework
  system:               systemRouter,
  qr:                   qrRouter,
  normalization:        normalizationRouter,
  apiKey:               apiKeyRouter,
  playback:             playbackRouter,
  provenance:           provenanceRouter,

  // Songs domain
  songs:                songsProcedures,
  comments:             commentsProcedures,
  events:               eventsProcedures,
  songDownload:         songDownloadProcedures,
  moderation:           moderationProcedures,
  versions:             versionsProcedures,
  activation:           activationProcedures,
  evidence:             evidenceProcedures,
  search:               searchProcedures,

  // Profile domain
  auth:                 authProcedures,
  profile:              profileProcedures,
  fieldNotes:           fieldNotesProcedures,
  onboarding:           onboardingProcedures,
  declaration:          declarationProcedures,
  agents:               agentsProcedures,
  userCollections:      userCollectionsProcedures,
  wids:                 widsProcedures,

  // Witness / provenance domain
  witness:              witnessProcedures,
  witnessSubscription:  witnessSubscriptionProcedures,
  imageGallery:         imageGalleryProcedures,
  reference:            referenceProcedures,
  witnessRegistry:      witnessRegistryProcedures,
  guides:               guidesProcedures,
  quiver:               quiverProcedures,
  domain:               domainProcedures,
  collections:          collectionsProcedures,

  // Payment domain
  tips:                 tipsProcedures,
  licenses:             licensesProcedures,
  supporters:           supportersProcedures,
  livingArchive:        livingArchiveProcedures,
  paymentIntegrity:     paymentIntegrityProcedures,
  marketplace:          marketplaceProcedures,
  satchel:              satchelProcedures,
  ppg:                  ppgProcedures,

  // Admin domain
  admin:                adminProcedures,
  promo:                promoProcedures,
  discord:              discordProcedures,
  audit:                auditProcedures,
  worker:               workerProcedures,

  // Keeper / AI domain
  keeper:               keeperProcedures,
  promptStudio:         promptStudioProcedures,

  // Platform domain
  platform:             platformProcedures,
  testimony:            testimonyProcedures,
  playlist:             playlistProcedures,
  playlists:            playlistsProcedures,
  notifications:        notificationsProcedures,
  globalActivity:       globalActivityProcedures,
  books:                booksProcedures,
  externalPlaylists:    externalPlaylistsProcedures,
  projects:             projectsProcedures,
});

export type AppRouter = typeof appRouter;
