import Stripe from "stripe";
import { z } from "zod";
import { generateShareArtifact } from "../services/shareArtifactService";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { systemRouter } from "../_core/systemRouter";
import { normalizationRouter } from "./normalization";
import { qrRouter } from "./qr";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../utils/storage";
import { micronize } from "../services/imageProcessing";
import { invokeLLM } from "../_core/llm";
import {
  addComment, createSong, deleteSong, getAllCreators,
  getCommentsBySong, getPublicSongs, getSongById,
  getSongsByUser, getSongWithCreator, getTipsBySong, reorderSongs, getNextDisplayOrder,
  getUserById, incrementPlayCount, recordDownload,
  recordLicense, recordSlotPurchase, recordTip,
  updateSongLyrics, updateSongLyricsWithWid, updateSongStatus, getRelatedSongs, updateSongVideo,
  updateUserProfile, updateUserStripeAccount,
  getLikedSongs, toggleLike, getLikeStatus, getLikeCount, getBulkLikeStatuses,
  getSongByWitnessId, updateSongMetadata, getRecentTips,
  getPlaylist, addToPlaylist, removeFromPlaylist, isInPlaylist,
  getUserTipTotalForSong, updateSongDownloadPermission,
  getAllUsersWithStats, markWelcomeSeen, recordTosAcceptance, getCreatorAnalytics,
  createEvent, getEventsByWork, getEventsForCreator,
  getCreatorForOg,
  createFieldNote, getFieldNotesByUser, getPublicFieldNotes,
  updateFieldNote, deleteFieldNote,
  witnessCreator, unwatchCreator, isWitnessing, getWitnessCount,
  getWitnessNetwork, createReference, getReferencesForSong, getReferencesForUser,
  createPlaylist, getPlaylistsByUser, getPlaylistById, updatePlaylist, deletePlaylist,
  getPlaylistTracks, addTrackToPlaylist, removeTrackFromPlaylist,
  getPlaylistCollaborators, inviteCollaborator, acceptPlaylistInvite, removeCollaborator,
  isPlaylistMember,
  createNotification, getNotifications, markNotificationRead, markAllNotificationsRead,
  archiveNotification, getUnreadNotificationCount, getNotificationById,
  getWitnessRegistry,
  adminSearchUsers, adminGrantLicense,
  createPromoCode, listPromoCodes, deactivatePromoCode, reactivatePromoCode, redeemPromoCode,
  recordNameChange, getNameHistory, getOriginalName,
  createCollection, updateCollectionPdf, linkSongsToCollection,
  getCollectionByWid, getSongsByCollectionId, getCollectionForSong,
  getCollectionsByCreator, updateCollectionCover,
  getAllSupporters, getSupporterByUserId, recordPlatformGift, getPublishedCountByUser,
  getNewEventCountForCreator, touchActivityVisit, touchDashboardVisit, getDashboardDeltas,
  getSongReactions, toggleSongReaction,
  getTrendingWorks,
  getNewThisWeek,
  getRecentCreators,
  updateSongCredits,
  getCreatorTotalPlays,
  getSongsWithoutEmbedVideo,
  reorderMySongs,
  archiveAudioVersion, replaceAudioFile, getAudioVersions,
  logAdminAction, getAdminLogs,
  flagSong, unflagSong, adminRemoveSong, adminRestoreSong, adminSearchWorks,
  getAllSystemConfig, getSystemConfigValue, setSystemConfigValue,
  resetUserBilling, getAllUsersAdmin,
  recordPlayEvent, getPlayAuditStats, MIN_PLAY_SECONDS,
  updateUserExpression,
  insertExpressionLineage,
  getExpressionLineageByUser,
  getDb,
  createTestimony, getTestimoniesByCreator, getTestimonyByWid, getTestimonyCount,
  activateLivingArchive, deactivateLivingArchive, grantFounderFreeTier,
  getLivingArchiveStatus, getUserByStripeSubscriptionId,
  countFounders, grantFounder, revokeFounder, listFounders, searchUsersForFounderPanel, MAX_FOUNDERS,
  getSongsNeedingAutoVideo, cacheAutoVideoUrl, getAutoVideoStats,
  savePromptDraft, getPromptDraftsByUser, getPromptDraftById,
  getPromptDraftByShareToken, updatePromptDraftShare, deletePromptDraft, revokePromptDraftShare,
  updateUserToneFrequency,
  createContentFlag, listContentFlags, resolveContentFlag, getContentFlagStats,
  signDeclaration, getDeclarationSignature, countDeclarationSigners,
  createSongVersion, getSongVersions, getLatestVersionNumber, getSongVersionById,
  exportUserData, requestDataDeletion,
  getPlatformSetting, setPlatformSetting,
  listDeletionRequests, clearDeletionRequest,
  createProject, getProjectBySlug, getProjectById, getProjectsByUser, getProjectByWid, updateProject,
  getProjectUpdates, addProjectUpdate, getProjectDonations, recordProjectDonation, listActiveProjects,
  getProjectBlocks, saveProjectBlocks, getProjectsByCreator,
  followProject, unfollowProject, isFollowingProject, getProjectFollowerCount, getProjectFollowerUserIds,
  getProjectSongs, addSongToProject, removeSongFromProject, reorderProjectSongs,
  getLatestAuditLog, getAllAuditLogs, createAuditLog, updateAuditLog,
  setPinCreator,
  insertProvenanceEvent,
  getProvenanceEventsByCreator,
  getLatestProvenanceCheckpoint,
  getOrCreateAgent,
  updateAgentFingerprint,
  insertWid,
  getWidWithEvent,
  setUserPublicKey,
  getUserCollections, createUserCollection, renameUserCollection, deleteUserCollection,
  getUserCollectionTracks, addTrackToUserCollection, removeTrackFromUserCollection,
  reorderUserCollectionTracks,
  getLikedSongsOrdered, reorderLikes,
  createCommentReport, getFlaggedComments, moderateCommentReport,
  getGlobalActivityFeed,
  getActivationForSong,
  recordActivationContribution,
  getActivationContributions,
  configureSongActivation,
  verifySongOwnership,
  type ActivationStage,
  getEvidenceForSong,
  addEvidence,
  deleteEvidence,
  createGuide,
  getGuideById,
  getGuideByWid,
  getGuidesByCreator,
  getPublishedGuides,
  updateGuide,
  publishGuide,
  deleteGuide,
  globalSearch,
  type SearchResults,
  getDomainBlocks,
  saveDomainLayout,
  getDomainVersions,
  createManifestedCollection,
  getManifestedCollectionBySlug,
  getManifestedCollectionById,
  getManifestedCollectionsByOwner,
  updateManifestedCollection,
  deleteManifestedCollection,
  getCollectionTracksWithSongs,
  addTrackToManifestedCollection,
  removeTrackFromManifestedCollection,
  toggleCollectionFollow,
  isFollowingCollection,
  forkManifestedCollection,
  getPublicCollections,
  getOnboardingProgress,
  upsertOnboardingProgress,
  getPlaybackSettings,
  savePlaybackSettings,
  updateSongFade,
  getWorkEvents,
  addWorkEvent,
  getWorkLineage,
  addLineageRelationship,
  getWorkWitnesses,
  inviteWitness,
  acceptWitnessInvite,
  witnessSubscribe,
  witnessUnsubscribe,
  getWitnessSubscription,
  getSubscriberCount,
  publishToFeed,
  getWitnessArchive,
  getWitnessArchiveCount,
  getCreatorGallery,
  getCreatorGalleryCount,
  getMyQuiverImages,
  updateQuiverImage,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "../utils/db";
import { FOUNDER_PRICE_EARLY_CENTS, FOUNDER_PRICE_LATE_CENTS, FOUNDER_THRESHOLD, LICENSE_PRICE_CENTS, LICENSE_SLOTS, SLOT_PACKAGES, getSlotPackage, type SlotPackageId } from "../services/livingArchiveProducts";
import { ENV } from "../_core/env";
import { getOrGenerateEmbedVideo } from "../services/embedVideo";
import { enqueueVisualJob } from "../workers/visualQueue";
import { notifyOwner } from "../_core/notification";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any })
  : null as unknown as Stripe;
const PLATFORM_FEE_PERCENT = 10;

// ── Build stats — updated via env vars on each deploy ──
const BUGS_FIXED = parseInt(process.env.BUGS_FIXED ?? "222", 10);
const TOTAL_COMMITS = parseInt(process.env.TOTAL_COMMITS ?? "554", 10);

// ─── Keeper Character Sheet Presets ──────────────────────────────────────────
const KEEPER_PRESETS = [
  { id: 'witness', name: 'The Witness', description: 'Provenance-aware creative companion. Speaks with quiet authority and poetic precision.', persona: 'witness', attributes: { voiceDepth: 95, lyricalDensity: 85, structuralLogic: 35, emotionalRange: 100, provenanceDepth: 60, corpusSize: 600 }, mediumContext: { music: 'Listens for the emotional truth behind every note.', lyrics: 'Reads lyrics as testimony. Identifies themes, metaphors, structural patterns.', book: 'Treats chapters as provenance events.', comic: 'Reads panels as visual testimony.', video: 'Frames every scene as a moment of witness.', general: 'Every creative act is a timestamp, a testimony, a record.' }, capabilities: ['testimony', 'emotional-depth', 'provenance'], accentColor: '#7C3AED', badge: 'Testimony' },
  { id: 'conductor', name: 'The Conductor', description: 'Master of structure and arrangement. Builds the architecture that lets your work breathe.', persona: 'conductor', attributes: { voiceDepth: 45, lyricalDensity: 80, structuralLogic: 95, emotionalRange: 55, provenanceDepth: 40, corpusSize: 800 }, mediumContext: { music: 'Focuses on arrangement, instrumentation, and the architecture of sound.', lyrics: 'Analyzes song structure — verse/chorus/bridge patterns, syllabic density, rhyme scheme.', book: 'Focuses on chapter structure, pacing, and narrative architecture.', comic: 'Analyzes panel layout, page flow, and visual rhythm.', video: 'Focuses on scene structure, pacing, and visual storytelling architecture.', general: 'Brings structural clarity to any creative work.' }, capabilities: ['structure', 'arrangement', 'architecture'], accentColor: '#2563EB', badge: 'Direction' },
  { id: 'archivist', name: 'The Archivist', description: 'Deep reader and semantic analyst. Finds patterns across your full corpus.', persona: 'archivist', attributes: { voiceDepth: 55, lyricalDensity: 90, structuralLogic: 85, emotionalRange: 65, provenanceDepth: 95, corpusSize: 1000 }, mediumContext: { music: 'Focuses on the provenance chain — WID, version history, testimony record.', lyrics: 'Treats lyrics as immutable testimony. Focuses on preservation and attribution.', book: 'Builds the archive of a manuscript — tracks revisions, themes, voice evolution.', comic: 'Archives the visual language of a series — recurring motifs, character evolution.', video: 'Archives the visual and narrative DNA of a creator\'s video work.', general: 'Treats every creative act as evidence of something larger.' }, capabilities: ['archive', 'semantics', 'corpus-analysis'], accentColor: '#D97706', badge: 'Archive' },
  { id: 'sovereign', name: 'The Sovereign', description: 'Guardian of your creative legacy and IP. Understands WIDs, provenance events, and the Living Nexus system deeply.', persona: 'custodian', attributes: { voiceDepth: 60, lyricalDensity: 40, structuralLogic: 70, emotionalRange: 50, provenanceDepth: 100, corpusSize: 400 }, mediumContext: { music: 'Focuses on IP protection, licensing, and the provenance chain of a musical work.', lyrics: 'Focuses on copyright, attribution, and long-term protection of lyrical IP.', book: 'Focuses on manuscript rights, publishing strategy, and protection of written IP.', comic: 'Focuses on character IP, visual trademark, and protection of sequential art.', video: 'Focuses on visual IP, licensing, and protection of video content.', general: 'Focuses on IP protection, provenance, and the long-term legacy of creative work.' }, capabilities: ['ip-protection', 'provenance', 'legacy'], accentColor: '#059669', badge: 'Sovereignty' },
  { id: 'cipher', name: 'The Cipher', description: 'Experimental and boundary-pushing. Explores the edges of your creative identity.', persona: 'guide', attributes: { voiceDepth: 72, lyricalDensity: 65, structuralLogic: 40, emotionalRange: 85, provenanceDepth: 30, corpusSize: 500 }, mediumContext: { music: 'Explores the experimental edges of sound. Pushes genre boundaries.', lyrics: 'Explores the experimental edges of language. Challenges lyrical conventions.', book: 'Explores the experimental edges of narrative. Challenges genre conventions.', comic: 'Explores the experimental edges of visual storytelling.', video: 'Explores the experimental edges of visual narrative.', general: 'Explores the experimental edges of creative identity.' }, capabilities: ['experimentation', 'boundary-pushing', 'identity'], accentColor: '#DC2626', badge: 'Cipher' },
];

export const adminRouter = router({
    /** Return all users with stats. Only admins may call this. */
    getUsers: adminProcedure
      .input(z.object({
        limit: z.number().int().min(10).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getAllUsersWithStats(input?.limit ?? 50, input?.offset ?? 0);
      }),

    /** Search users by name, handle, or email */
    searchUsers: adminProcedure
      .input(z.object({ query: z.string().min(1).max(128) }))
      .query(async ({ ctx, input }) => {
        return adminSearchUsers(input.query);
      }),

    /** Directly grant a Creator License + slots to a user */
    grantLicense: adminProcedure
      .input(z.object({
        userId: z.number().int(),
        slotsGranted: z.number().int().min(1).max(10000).default(100),
      }))
      .mutation(async ({ ctx, input }) => {
        await adminGrantLicense(input.userId, input.slotsGranted);
        return { success: true };
      }),

    /** Reconcile songSlotsUsed to the actual count of non-deleted songs for a user */
    reconcileSlotsUsed: adminProcedure
      .input(z.object({ userId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { songs: songsTable, users: usersTable } = await import("../../drizzle/schema");
        const { count, ne, eq: eqOp } = await import("drizzle-orm");
        const [row] = await db.select({ actual: count() }).from(songsTable)
          .where(eqOp(songsTable.userId, input.userId));
        const actualUsed = row?.actual ?? 0;
        await db.update(usersTable).set({ songSlotsUsed: actualUsed }).where(eqOp(usersTable.id, input.userId));
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "reconcile_slots", targetType: "user", targetId: String(input.userId) });
        return { success: true, reconciledTo: actualUsed };
      }),

    /** Toggle the isPinned flag for a creator — pinned creators appear first in the Featured Creators carousel */
    togglePinCreator: adminProcedure
      .input(z.object({ userId: z.number().int(), pin: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await setPinCreator(input.userId, input.pin);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: input.pin ? "pin_creator" : "unpin_creator", targetType: "user", targetId: String(input.userId) });
        return { success: true, isPinned: input.pin };
      }),
    // ── Founder Control ───────────────────────────────────────────────────────
    /** Get current founder count and list */
    getFounders: adminProcedure.query(async ({ ctx }) => {
      const founders = await listFounders();
      return { founders, count: founders.length, max: MAX_FOUNDERS };
    }),
    /** Search users for the Founder Control panel */
    searchUsersForFounder: adminProcedure
      .input(z.object({ query: z.string().default("") }))
      .query(async ({ ctx, input }) => {
        return searchUsersForFounderPanel(input.query);
      }),
    /** Grant founder status to a user */
    grantFounderRole: adminProcedure
      .input(z.object({ userId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await grantFounder(input.userId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "grant_founder", targetType: "user", targetId: String(input.userId) });
        return { success: true };
      }),
    /** Revoke founder status from a user */
    revokeFounderRole: adminProcedure
      .input(z.object({ userId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await revokeFounder(input.userId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "revoke_founder", targetType: "user", targetId: String(input.userId) });
        return { success: true };
      }),
    /** Create a new promo code */
    createPromoCode: adminProcedure
      .input(z.object({
        code: z.string().min(3).max(64).regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric with dashes/underscores"),
        description: z.string().max(256).optional(),
        slotsGranted: z.number().int().min(1).max(10000).default(100),
        maxUses: z.number().int().min(1).optional().nullable(),
        expiresAt: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createPromoCode({
          code: input.code,
          description: input.description,
          slotsGranted: input.slotsGranted,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          createdByUserId: ctx.user.id,
        });
        return { success: true };
      }),

    /** List all promo codes */
    listCodes: adminProcedure.query(async ({ ctx }) => {
      return listPromoCodes();
    }),

    /** Deactivate a promo code */
    deactivateCode: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await deactivatePromoCode(input.id);
        return { success: true };
      }),

    /** Reactivate a promo code */
    reactivateCode: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await reactivatePromoCode(input.id);
        return { success: true };
      }),
    /**
     * Regenerate a Stripe Connect onboarding link for a user whose account is
     * stuck in "pending" status (e.g. started KYC but never completed it).
     * Returns the onboarding URL so the admin can share it with the creator.
     */
    regenerateStripeOnboarding: adminProcedure
      .input(z.object({
        userId: z.number().int(),
        returnUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (!user.stripeAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "User has no Stripe account on record" });
        // Verify the account still exists in Stripe
        let account: Stripe.Account;
        try {
          account = await stripe.accounts.retrieve(user.stripeAccountId);
        } catch (err: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Stripe account lookup failed: ${err.message}` });
        }
        if (account.charges_enabled) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This account is already fully enabled — no onboarding needed." });
        }
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeAccountId,
          refresh_url: input.returnUrl,
          return_url: input.returnUrl,
          type: "account_onboarding",
        });
        return { onboardingUrl: accountLink.url, stripeAccountId: user.stripeAccountId };
      }),
    /** Get name change history for a specific user */
    getNameHistory: adminProcedure
      .input(z.object({ userId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        return getNameHistory(input.userId);
      }),

    /**
     * Pre-generate embed videos for all songs that don’t have one yet.
     * Runs in the background — returns immediately with a count of songs queued.
     * Admin only.
     */
    preGenerateEmbedVideos: adminProcedure
      .mutation(async ({ ctx }) => {
        const pending = await getSongsWithoutEmbedVideo();
        const count = pending.length;
        if (count === 0) return { queued: 0, message: "All songs already have embed videos." };

        // Fire-and-forget: generate in background, don’t block the response
        (async () => {
          let done = 0;
          let failed = 0;
          for (const song of pending) {
            try {
              await getOrGenerateEmbedVideo({
                songId: song.id,
                coverArtUrl: song.coverArtUrl,
                fileUrl: song.fileUrl,
                embedVideoUrl: null,
              });
              done++;
              console.log(`[Admin/EmbedVideo] ${done}/${count} done (song ${song.id})`);
            } catch (err) {
              failed++;
              console.error(`[Admin/EmbedVideo] Failed for song ${song.id}:`, err);
            }
          }
          console.log(`[Admin/EmbedVideo] Batch complete: ${done} succeeded, ${failed} failed out of ${count}`);
        })();

        return { queued: count, message: `Queued ${count} song${count === 1 ? "" : "s"} for embed video generation. Check server logs for progress.` };
      }),

    /**
     * Returns how many songs still need an embed video generated.
     * Admin only.
     */
    embedVideoStatus: adminProcedure
      .query(async ({ ctx }) => {
        const db = await (await import("../utils/db")).getDb();
        const { sql: sqlFn, eq: eqFn, and: andFn } = await import("drizzle-orm");
        const { songs: songsTable } = await import("../../drizzle/schema");
        const pending = await getSongsWithoutEmbedVideo();
        let total = 0;
        if (db) {
          const rows = await db.select({ count: sqlFn<number>`count(*)` }).from(songsTable)
            .where(andFn(eqFn(songsTable.status, "Published"), eqFn(songsTable.isPublic, true)));
          total = Number(rows[0]?.count ?? 0);
        }
        const withEmbed = total - pending.length;
        return { pending: pending.length, total, withEmbed };
      }),

    // ── Auto Video Engine ─────────────────────────────────────────────────────
    /** Get auto video generation stats (total, with video, pending) */
    autoVideoStats: adminProcedure.query(async ({ ctx }) => {
      return getAutoVideoStats();
    }),
    /** Trigger background auto video generation for all pending songs (founder-priority queue) */
    generateAutoVideos: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
      .mutation(async ({ ctx, input }) => {
        const pending = await getSongsNeedingAutoVideo(input.limit);
        const count = pending.length;
        if (count === 0) return { queued: 0, message: "All songs already have auto videos.", founderCount: 0 };
        const founderCount = pending.filter(s => s.isFounder).length;
        // Fire-and-forget background generation
        (async () => {
          let done = 0;
          let failed = 0;
          for (const song of pending) {
            try {
              const url = await getOrGenerateEmbedVideo({
                songId: song.id,
                coverArtUrl: song.coverArtUrl,
                fileUrl: song.fileUrl,
                embedVideoUrl: null,
              });
              if (url) {
                // Also store in autoVideoUrl field
                const s3Key = `auto-videos/${song.id}.mp4`;
                await cacheAutoVideoUrl(song.id, url, s3Key);
              }
              done++;
              console.log(`[AutoVideo] ${done}/${count} done (song ${song.id}${song.isFounder ? " [FOUNDER]" : ""})`);
            } catch (err) {
              failed++;
              console.error(`[AutoVideo] Failed for song ${song.id}:`, err);
            }
          }
          console.log(`[AutoVideo] Batch complete: ${done} succeeded, ${failed} failed out of ${count}`);
        })();
        return {
          queued: count,
          founderCount,
          message: `Queued ${count} song${count === 1 ? "" : "s"} for auto video generation. ${founderCount > 0 ? `${founderCount} founder work${founderCount === 1 ? "" : "s"} processed first.` : ""} Check server logs for progress.`,
        };
      }),
    // ── Visual Pipeline Admin ────────────────────────────────────────────────
    /** Get live visual pipeline stats for the admin dashboard */
    visualPipelineStats: adminProcedure.query(async ({ ctx }) => {
      const { getVisualPipelineStats } = await import("../workers/visualQueue");
      return getVisualPipelineStats();
    }),
    /** Get recent visual queue jobs for the admin pipeline view */
    visualQueueJobs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
      .query(async ({ ctx, input }) => {
        const { getRecentQueueJobs } = await import("../workers/visualQueue");
        return getRecentQueueJobs(input.limit);
      }),
    /** Requeue all failed visual jobs */
    requeueFailedVisuals: adminProcedure.mutation(async ({ ctx }) => {
      const { requeueFailedJobs } = await import("../workers/visualQueue");
      const count = await requeueFailedJobs();
      return { requeued: count };
    }),
    /** Enqueue visual job for a specific song (admin override) */
    enqueueVisualForSong: adminProcedure
      .input(z.object({ songId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const { enqueueVisualJob } = await import("../workers/visualQueue");
        // Reset any existing failed job first
        const db = await import("../utils/db").then(m => m.getDb());
        if (db) {
          const { visualQueue } = await import("../../drizzle/schema");
          const { eq, inArray } = await import("drizzle-orm");
          await db.update(visualQueue)
            .set({ status: "pending", attempts: 0, errorMessage: null, startedAt: null, completedAt: null })
            .where(eq(visualQueue.songId, input.songId));
        }
        await enqueueVisualJob(input.songId, true); // admin override = founder priority
        return { success: true };
      }),
    // ── Works / WIDs Moderation ───────────────────────────────────────────────
    searchWorks: adminProcedure
      .input(z.object({
        query: z.string().optional(),
        moderationStatus: z.enum(["clear", "flagged", "removed"]).optional(),
        limit: z.number().max(100).default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return adminSearchWorks(input);
      }),

    flagWork: adminProcedure
      .input(z.object({ songId: z.number().int(), reason: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await flagSong(input.songId, input.reason);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "flag_work", targetType: "song", targetId: String(input.songId), details: { reason: input.reason } });
        return { ok: true };
      }),

    unflagWork: adminProcedure
      .input(z.object({ songId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await unflagSong(input.songId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "unflag_work", targetType: "song", targetId: String(input.songId) });
        return { ok: true };
      }),

    removeWork: adminProcedure
      .input(z.object({ songId: z.number().int(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await adminRemoveSong(input.songId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "remove_work", targetType: "song", targetId: String(input.songId), details: { reason: input.reason } });
        return { ok: true };
      }),

    restoreWork: adminProcedure
      .input(z.object({ songId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await adminRestoreSong(input.songId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "restore_work", targetType: "song", targetId: String(input.songId) });
        return { ok: true };
      }),

    // ── System Config ─────────────────────────────────────────────────────────
    getSystemConfig: adminProcedure
      .query(async ({ ctx }) => {
        return getAllSystemConfig();
      }),

    setSystemConfig: adminProcedure
      .input(z.object({ key: z.string().min(1), value: z.string(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await setSystemConfigValue(input.key, input.value, input.description, ctx.user.id);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "set_system_config", targetType: "config", targetId: input.key, details: { value: input.value } });
        return { ok: true };
      }),

    // ── Admin Logs ────────────────────────────────────────────────────────────
    getLogs: adminProcedure
      .input(z.object({ limit: z.number().max(500).default(200) }))
      .query(async ({ ctx, input }) => {
        return getAdminLogs(input.limit);
      }),

    // ── Stripe Billing Reset ──────────────────────────────────────────────────
    resetBilling: adminProcedure
      .input(z.object({ userId: z.number().int(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        // Cancel Stripe subscription if one exists
        const stripeCustomerId = (user as any).stripeCustomerId;
        if (stripeCustomerId) {
          try {
            const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: "active", limit: 10 });
            for (const sub of subs.data) {
              await stripe.subscriptions.cancel(sub.id);
            }
          } catch (err: any) {
            console.warn("[Admin/resetBilling] Stripe cancel error:", err.message);
          }
        }
        await resetUserBilling(input.userId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "reset_billing", targetType: "user", targetId: String(input.userId), details: { reason: input.reason, stripeCustomerId } });
        return { ok: true };
      }),

    // ── All Users (admin view) ────────────────────────────────────────────────
    getAllUsers: adminProcedure
      .input(z.object({ limit: z.number().max(200).default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        return getAllUsersAdmin(input.limit, input.offset);
      }),

    // ── Update User Role ──────────────────────────────────────────────────────
    setUserRole: adminProcedure
      .input(z.object({ userId: z.number().int(), role: z.enum(["admin", "user"]) }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
        const db = await (await import("../utils/db")).getDb();
        const { users: usersTable } = await import("../../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");
        await db.update(usersTable).set({ role: input.role }).where(eqFn(usersTable.id, input.userId));
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "set_user_role", targetType: "user", targetId: String(input.userId), details: { role: input.role } });
        return { ok: true };
      }),

    /**
     * Manually regenerate the share artifact for a specific WID.
     * Use this after updating a track's cover art, title, or creator name.
     * Admin only.
     */
    regenerateShareArtifact: adminProcedure
      .input(z.object({ wid: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await generateShareArtifact(input.wid);
        return { success: true, wid: input.wid };
      }),
    // ── Data Rights: Deletion Requests ───────────────────────────────────────
    /** List all pending data deletion requests. Admin only. */
    getDeletionRequests: adminProcedure.query(async ({ ctx }) => {
      return listDeletionRequests();
    }),
    /** Mark a deletion request as processed (clears the flag). Admin only. */
    markDeletionProcessed: adminProcedure
      .input(z.object({ userId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await clearDeletionRequest(input.userId);
        await logAdminAction({
          adminId: ctx.user.id,
          adminName: ctx.user.name,
          action: "deletion_request_processed",
          targetType: "user",
          targetId: String(input.userId),
        });
        return { ok: true };
      }),
    // ── Sovereign Migration Status ────────────────────────────────────────────
    /** Get the current sovereign migration stage. Admin only. */
    getSovereignMigrationStatus: adminProcedure.query(async ({ ctx }) => {
      const stage = await getPlatformSetting("sovereignMigrationStage");
      const notes = await getPlatformSetting("sovereignMigrationNotes");
      return {
        stage: (stage ?? "hosted") as "hosted" | "migrating" | "sovereign",
        notes: notes ?? null,
      };
    }),
    /** Update the sovereign migration stage. Admin only. */
    updateSovereignMigrationStatus: adminProcedure
      .input(z.object({
        stage: z.enum(["hosted", "migrating", "sovereign"]),
        notes: z.string().max(512).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await setPlatformSetting("sovereignMigrationStage", input.stage, ctx.user.id);
        if (input.notes) {
          await setPlatformSetting("sovereignMigrationNotes", input.notes, ctx.user.id);
        }
        await logAdminAction({
          adminId: ctx.user.id,
          adminName: ctx.user.name,
          action: "sovereign_migration_update",
          targetType: "platform",
          targetId: "sovereignMigrationStage",
          details: { stage: input.stage, notes: input.notes },
        });
        return { ok: true, stage: input.stage };
      }),

    /**
     * Sync project donations from Stripe.
     * Queries Stripe for all paid checkout.session.completed events of type
     * project_donation for the given project, deduplicates against the DB,
     * and backfills any missing records (e.g. donors who closed the tab before
     * returning to the success URL so confirmDonation never fired).
     */
    syncProjectDonations: adminProcedure
      .input(z.object({
        projectId: z.number().int(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        let synced = 0;
        let skipped = 0;
        let totalCentsAdded = 0;
        let hasMore = true;
        let startingAfter: string | undefined = undefined;

        while (hasMore) {
          const listParams: Stripe.Checkout.SessionListParams = { limit: 100 };
          if (startingAfter) listParams.starting_after = startingAfter;
          const sessions = await stripe.checkout.sessions.list(listParams);
          hasMore = sessions.has_more;
          if (sessions.data.length > 0) {
            startingAfter = sessions.data[sessions.data.length - 1].id;
          } else {
            hasMore = false;
          }

          for (const session of sessions.data) {
            const meta = session.metadata || {};
            if (
              meta.type !== "project_donation" ||
              parseInt(meta.projectId || "0") !== input.projectId ||
              session.payment_status !== "paid"
            ) continue;

            // Check if already recorded (idempotent)
            const existing = await db.execute(
              `SELECT id FROM projectDonations WHERE stripeSessionId = ? LIMIT 1`,
              [session.id]
            ) as any;
            const rows = existing?.[0] as any[];
            if (rows && rows.length > 0) { skipped++; continue; }

            // Backfill the missing donation
            const amountCents = session.amount_total ?? 0;
            await recordProjectDonation({
              projectId: input.projectId,
              donorUserId: meta.userId ? parseInt(meta.userId) : undefined,
              donorName: meta.anonymous === "true" ? "Anonymous" : (meta.donorName || undefined),
              donorEmail: meta.donorEmail || undefined,
              amountCents,
              message: meta.message || undefined,
              anonymous: meta.anonymous === "true",
              stripeSessionId: session.id,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            });
            synced++;
            totalCentsAdded += amountCents;
          }
        }

        await logAdminAction({
          adminId: ctx.user.id,
          adminName: ctx.user.name,
          action: "sync_project_donations",
          targetType: "project",
          targetId: String(input.projectId),
          details: { synced, skipped, totalCentsAdded },
        });

        return { ok: true, synced, skipped, totalCentsAdded };
      }),
    /**
     * Manually credit a donation to a project — for cases where Stripe keys
     * are in test mode but real live payments were made, or when the webhook
     * and confirmDonation both failed to fire.
     */
    manualCreditDonation: adminProcedure
      .input(z.object({
        projectId: z.number().int(),
        amountCents: z.number().int().min(1),
        donorName: z.string().max(256).optional(),
        donorEmail: z.string().email().max(256).optional(),
        message: z.string().max(500).optional(),
        stripeSessionId: z.string().max(256).optional(),
        anonymous: z.boolean().optional(),
        note: z.string().max(512).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        // Check for duplicate stripeSessionId
        if (input.stripeSessionId) {
          const existing = await db.execute(
            `SELECT id FROM projectDonations WHERE stripeSessionId = ? LIMIT 1`,
            [input.stripeSessionId]
          ) as any;
          const rows = existing?.[0] as any[];
          if (rows && rows.length > 0) {
            return { ok: false, reason: "already_recorded" };
          }
        }
        await recordProjectDonation({
          projectId: input.projectId,
          donorUserId: undefined,
          donorName: input.anonymous ? "Anonymous" : (input.donorName || undefined),
          donorEmail: input.donorEmail || undefined,
          amountCents: input.amountCents,
          message: input.message || undefined,
          anonymous: input.anonymous ?? false,
          stripeSessionId: input.stripeSessionId || undefined,
        });
        await logAdminAction({
          adminId: ctx.user.id,
          adminName: ctx.user.name,
          action: "manual_credit_donation",
          targetType: "project",
          targetId: String(input.projectId),
          details: {
            amountCents: input.amountCents,
            donorName: input.donorName,
            stripeSessionId: input.stripeSessionId,
            note: input.note,
          },
        });
        return { ok: true, amountCents: input.amountCents };
      }),
  });


