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

export const marketplaceRouter = router({
    // Public: list all active marketplace items, optionally filtered by type
    listItems: publicProcedure
      .input(z.object({
        type: z.enum(["album", "skin", "physical", "creator_good"]).optional(),
        featuredOnly: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { marketplaceItems, users } = await import('../../drizzle/schema');
        const { eq, and, desc, isNull, gt } = await import('drizzle-orm');
        const conditions: any[] = [eq(marketplaceItems.active, true)];
        if (input.type) conditions.push(eq(marketplaceItems.type, input.type));
        if (input.featuredOnly) conditions.push(eq(marketplaceItems.featured, true));
        const rows = await db
          .select({
            id: marketplaceItems.id,
            type: marketplaceItems.type,
            title: marketplaceItems.title,
            description: marketplaceItems.description,
            artworkUrl: marketplaceItems.artworkUrl,
            priceCents: marketplaceItems.priceCents,
            royaltyPct: marketplaceItems.royaltyPct,
            wid: marketplaceItems.wid,
            projectId: marketplaceItems.projectId,
            songId: marketplaceItems.songId,
            stock: marketplaceItems.stock,
            featured: marketplaceItems.featured,
            createdAt: marketplaceItems.createdAt,
            creatorId: marketplaceItems.creatorId,
            creatorName: users.name,
            creatorHandle: users.artistHandle,
            creatorAvatarUrl: users.profilePhotoUrl,
            aiPrompt: marketplaceItems.aiPrompt,
            artistCredit: marketplaceItems.artistCredit,
            artStyle: marketplaceItems.artStyle,
            model3dStatus: marketplaceItems.model3dStatus,
            model3dUrl: marketplaceItems.model3dUrl,
            model3dFormat: marketplaceItems.model3dFormat,
          })
          .from(marketplaceItems)
          .leftJoin(users, eq(marketplaceItems.creatorId, users.id))
          .where(and(...conditions))
          .orderBy(desc(marketplaceItems.featured), desc(marketplaceItems.createdAt))
          .limit(input.limit);
        return rows;
      }),

    // Public: get a single marketplace item with full creator provenance
    getItem: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const { marketplaceItems, users } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await db
          .select({
            id: marketplaceItems.id,
            type: marketplaceItems.type,
            title: marketplaceItems.title,
            description: marketplaceItems.description,
            artworkUrl: marketplaceItems.artworkUrl,
            priceCents: marketplaceItems.priceCents,
            royaltyPct: marketplaceItems.royaltyPct,
            wid: marketplaceItems.wid,
            projectId: marketplaceItems.projectId,
            songId: marketplaceItems.songId,
            stock: marketplaceItems.stock,
            featured: marketplaceItems.featured,
            active: marketplaceItems.active,
            createdAt: marketplaceItems.createdAt,
            creatorId: marketplaceItems.creatorId,
            creatorName: users.name,
            creatorHandle: users.artistHandle,
            creatorAvatarUrl: users.profilePhotoUrl,
          })
          .from(marketplaceItems)
          .leftJoin(users, eq(marketplaceItems.creatorId, users.id))
          .where(eq(marketplaceItems.id, input.id))
          .limit(1);
        return rows[0] ?? null;
      }),

    // Protected: create a Stripe checkout session for a marketplace item
    createCheckout: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!stripe) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Payments not configured' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { marketplaceItems } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await db.select().from(marketplaceItems)
          .where(eq(marketplaceItems.id, input.itemId)).limit(1);
        const item = rows[0];
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
        if (!item.active) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Item is no longer available' });
        if (item.stock !== null && item.stock !== undefined && item.stock <= 0)
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Item is sold out' });
        const creatorPayoutCents = Math.floor(item.priceCents * item.royaltyPct / 100);
        const platformFeeCents = item.priceCents - creatorPayoutCents;
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.title,
                ...(item.artworkUrl ? { images: [item.artworkUrl] } : {}),
                metadata: { wid: item.wid ?? '', type: item.type },
              },
              unit_amount: item.priceCents,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${input.origin}/marketplace?purchase=success&item=${item.id}`,
          cancel_url: `${input.origin}/marketplace?purchase=cancelled`,
          metadata: {
            type: 'marketplace_purchase',
            itemId: item.id.toString(),
            buyerUserId: ctx.user.id.toString(),
            creatorPayoutCents: creatorPayoutCents.toString(),
            platformFeeCents: platformFeeCents.toString(),
          },
        });
        // Record pending purchase
        const { marketplacePurchases } = await import('../../drizzle/schema');
        await db.insert(marketplacePurchases).values({
          itemId: item.id,
          buyerUserId: ctx.user.id,
          amountCents: item.priceCents,
          creatorPayoutCents,
          platformFeeCents,
          stripeSessionId: session.id,
          status: 'pending',
        });
        return { url: session.url };
      }),

    // Protected: buyer's purchase history
    myPurchases: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { marketplacePurchases, marketplaceItems, users } = await import('../../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      const rows = await db
        .select({
          id: marketplacePurchases.id,
          status: marketplacePurchases.status,
          amountCents: marketplacePurchases.amountCents,
          provenanceWid: marketplacePurchases.provenanceWid,
          fulfilledAt: marketplacePurchases.fulfilledAt,
          createdAt: marketplacePurchases.createdAt,
          itemId: marketplaceItems.id,
          itemTitle: marketplaceItems.title,
          itemType: marketplaceItems.type,
          itemArtworkUrl: marketplaceItems.artworkUrl,
          itemWid: marketplaceItems.wid,
          creatorName: users.name,
          creatorHandle: users.artistHandle,
        })
        .from(marketplacePurchases)
        .leftJoin(marketplaceItems, eq(marketplacePurchases.itemId, marketplaceItems.id))
        .leftJoin(users, eq(marketplaceItems.creatorId, users.id))
        .where(eq(marketplacePurchases.buyerUserId, ctx.user.id))
        .orderBy(desc(marketplacePurchases.createdAt))
        .limit(50);
      return rows;
    }),

    // Protected: creator's sales dashboard
    creatorSales: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { items: [], totalEarningsCents: 0 };
      const { marketplacePurchases, marketplaceItems } = await import('../../drizzle/schema');
      const { eq, and, desc, sum } = await import('drizzle-orm');
      const items = await db
        .select({
          id: marketplaceItems.id,
          title: marketplaceItems.title,
          type: marketplaceItems.type,
          artworkUrl: marketplaceItems.artworkUrl,
          priceCents: marketplaceItems.priceCents,
          royaltyPct: marketplaceItems.royaltyPct,
          stock: marketplaceItems.stock,
          active: marketplaceItems.active,
          featured: marketplaceItems.featured,
          createdAt: marketplaceItems.createdAt,
        })
        .from(marketplaceItems)
        .where(eq(marketplaceItems.creatorId, ctx.user.id))
        .orderBy(desc(marketplaceItems.createdAt));
      // Total earnings from fulfilled purchases
      const earningsRows = await db
        .select({ total: sum(marketplacePurchases.creatorPayoutCents) })
        .from(marketplacePurchases)
        .leftJoin(marketplaceItems, eq(marketplacePurchases.itemId, marketplaceItems.id))
        .where(and(
          eq(marketplaceItems.creatorId, ctx.user.id),
          eq(marketplacePurchases.status, 'fulfilled')
        ));
      const totalEarningsCents = Number(earningsRows[0]?.total ?? 0);
      return { items, totalEarningsCents };
    }),

    // Admin: create a new marketplace item
    createItem: protectedProcedure
      .input(z.object({
        type: z.enum(["album", "skin", "physical", "creator_good"]),
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        artworkUrl: z.string().url().optional(),
        priceCents: z.number().min(0),
        royaltyPct: z.number().min(0).max(100).default(70),
        wid: z.string().optional(),
        projectId: z.number().optional(),
        songId: z.number().optional(),
        stock: z.number().optional(),
        featured: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { marketplaceItems } = await import('../../drizzle/schema');
        const result = await db.insert(marketplaceItems).values({
          type: input.type,
          title: input.title,
          description: input.description,
          artworkUrl: input.artworkUrl,
          priceCents: input.priceCents,
          royaltyPct: input.royaltyPct,
          creatorId: ctx.user.id,
          wid: input.wid,
          projectId: input.projectId,
          songId: input.songId,
          stock: input.stock,
          featured: input.featured,
          active: true,
        });
        return { id: (result as any)[0]?.insertId };
      }),

    // Protected: toggle item active status (owner only)
    toggleItemActive: protectedProcedure
      .input(z.object({ itemId: z.number(), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { marketplaceItems } = await import('../../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.update(marketplaceItems)
          .set({ active: input.active })
          .where(and(eq(marketplaceItems.id, input.itemId), eq(marketplaceItems.creatorId, ctx.user.id)));
        return { ok: true };
      }),

    // Owner-only: seed the first default marketplace listings
    // Safe to call multiple times — skips if items already exist for this creator
    seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
      const { marketplaceItems } = await import('../../drizzle/schema');
      const { eq, count } = await import('drizzle-orm');
      // Idempotency guard — only seed if creator has no items yet
      const existing = await db
        .select({ cnt: count() })
        .from(marketplaceItems)
        .where(eq(marketplaceItems.creatorId, ctx.user.id));
      if (Number(existing[0]?.cnt ?? 0) > 0) return { seeded: 0, message: 'Items already exist — skipped.' };
      const seeds = [
        {
          type: 'album' as const,
          title: 'Living Nexus — Provenance Vol. 1',
          description: 'The debut gated album. 12 tracks, each anchored to a Witness ID. Includes lossless WAV download + PDF provenance certificate.',
          artworkUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-hooded-scholar_67e69960.png',
          priceCents: 1299,
          royaltyPct: 90,
          featured: true,
          active: true,
          stock: null,
          creatorId: ctx.user.id,
        },
        {
          type: 'skin' as const,
          title: 'Keeper Skin Pack — The Conductor',
          description: 'Unlock the Conductor skin for your Keeper avatar. Grants arrangement analysis, structural critique, and beat mapping modes.',
          artworkUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-conductor_4e479e6b.png',
          priceCents: 499,
          royaltyPct: 80,
          featured: true,
          active: true,
          stock: null,
          creatorId: ctx.user.id,
        },
        {
          type: 'skin' as const,
          title: 'Keeper Skin Pack — The Witness',
          description: 'Unlock the Witness skin. Grants testimonial mode, emotional range analysis, and corpus deep-read capabilities.',
          artworkUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-witness_f31f36b2.png',
          priceCents: 699,
          royaltyPct: 80,
          featured: false,
          active: true,
          stock: null,
          creatorId: ctx.user.id,
        },
        {
          type: 'skin' as const,
          title: 'Keeper Skin Pack — The Archivist',
          description: 'Unlock the Archivist skin. Grants provenance graph, fork lineage mapping, and WID cross-reference tools.',
          artworkUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-archivist_07d235d9.png',
          priceCents: 899,
          royaltyPct: 80,
          featured: false,
          active: true,
          stock: null,
          creatorId: ctx.user.id,
        },
        {
          type: 'physical' as const,
          title: 'Living Nexus Thumb Drive — WID Edition',
          description: 'Physical USB thumb drive pre-loaded with your purchased tracks + provenance certificates. Ships in a 3D-printed case engraved with your WID. Limited run.',
          artworkUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-cipher_c8ee6e38.png',
          priceCents: 2999,
          royaltyPct: 70,
          featured: true,
          active: true,
          stock: 50,
          creatorId: ctx.user.id,
        },
        {
          type: 'creator_good' as const,
          title: 'Creator Starter Pack — 100 Provenance Slots',
          description: 'Bootstrap your provenance ledger. 100 Witness ID anchor slots for new songs, lyrics, and manuscripts. Never lose attribution.',
          artworkUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-upload-slot_ab8bd82e.png',
          priceCents: 999,
          royaltyPct: 85,
          featured: false,
          active: true,
          stock: null,
          creatorId: ctx.user.id,
        },
      ];
      await db.insert(marketplaceItems).values(seeds);
      return { seeded: seeds.length, message: `${seeds.length} default marketplace items created.` };
    }),

    // Founder-only: submit a new avatar/skin to the marketplace
    // Gate: role === "founder" only. artworkUrl must be a CDN URL (uploaded before calling).
    createAvatarItem: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        description: z.string().max(1000).optional(),
        artworkUrl: z.string().url(),
        priceCents: z.number().min(0).default(0),
        wid: z.string().max(128).optional(),
        aiPrompt: z.string().max(4000).optional(),
        artistCredit: z.string().max(256).optional(),
        artStyle: z.string().max(128).optional(),
        featured: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        // Founder gate
        const { users } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (!me || me.role !== 'founder') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only founders may submit avatars to the marketplace.' });
        }
        const { marketplaceItems } = await import('../../drizzle/schema');
        const result = await db.insert(marketplaceItems).values({
          type: 'skin',
          title: input.title,
          description: input.description,
          artworkUrl: input.artworkUrl,
          priceCents: input.priceCents,
          royaltyPct: 80,
          creatorId: ctx.user.id,
          wid: input.wid,
          aiPrompt: input.aiPrompt,
          artistCredit: input.artistCredit,
          artStyle: input.artStyle,
          featured: input.featured,
          active: true,
          model3dStatus: 'none',
        });
        return { id: (result as any)[0]?.insertId };
      }),

    // Protected: equip a marketplace skin as your profile avatar
    // Sets equippedAvatarItemId and updates profilePhotoUrl to the item's artworkUrl
    equipAvatar: protectedProcedure
      .input(z.object({ itemId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { marketplaceItems, users } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const [item] = await db.select({ artworkUrl: marketplaceItems.artworkUrl, type: marketplaceItems.type, active: marketplaceItems.active })
          .from(marketplaceItems).where(eq(marketplaceItems.id, input.itemId)).limit(1);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Avatar not found' });
        if (!item.active) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This avatar is no longer available' });
        if (item.type !== 'skin') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only skin items can be equipped as avatars' });
        await db.update(users)
          .set({ equippedAvatarItemId: input.itemId, profilePhotoUrl: item.artworkUrl ?? undefined })
          .where(eq(users.id, ctx.user.id));
        return { ok: true, artworkUrl: item.artworkUrl };
      }),

    // Protected: unequip marketplace avatar (revert to uploaded photo)
    unequipAvatar: protectedProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { users } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(users)
          .set({ equippedAvatarItemId: null })
          .where(eq(users.id, ctx.user.id));
        return { ok: true };
      }),

    // Public: tip the creator of a marketplace avatar item
    createAvatarTip: protectedProcedure
      .input(z.object({
        itemId: z.number().int().positive(),
        amountCents: z.number().min(100).max(50000),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { marketplaceItems, users } = await import('../../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const [item] = await db.select({
          id: marketplaceItems.id,
          title: marketplaceItems.title,
          creatorId: marketplaceItems.creatorId,
          artworkUrl: marketplaceItems.artworkUrl,
        }).from(marketplaceItems).where(eq(marketplaceItems.id, input.itemId)).limit(1);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Avatar not found' });
        const [creator] = await db.select({ stripeAccountId: users.stripeAccountId, name: users.name, artistHandle: users.artistHandle })
          .from(users).where(eq(users.id, item.creatorId)).limit(1);
        if (!creator?.stripeAccountId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This creator has not enabled gifts yet.' });
        try {
          const acct = await stripe.accounts.retrieve(creator.stripeAccountId);
          if (!acct.charges_enabled) throw new TRPCError({ code: 'BAD_REQUEST', message: "This creator's Stripe account is still being verified." });
        } catch (e: any) {
          if (e instanceof TRPCError) throw e;
          throw new TRPCError({ code: 'BAD_REQUEST', message: "This creator's payment account is not yet active." });
        }
        const feeAmount = Math.round(input.amountCents * PLATFORM_FEE_PERCENT / 100);
        const creatorHandle = creator.artistHandle || creator.name || 'this creator';
        const session = await stripe.checkout.sessions.create({
          mode: 'payment', payment_method_types: ['card'],
          line_items: [{ price_data: { currency: 'usd', product_data: { name: `Gift for "${item.title}" by ${creatorHandle}`, description: `Supporting ${creatorHandle} on Living Nexus` }, unit_amount: input.amountCents }, quantity: 1 }],
          metadata: { type: 'tip', songId: '0', userId: ctx.user.id.toString(), tipperName: ctx.user.name || '', creatorId: item.creatorId.toString() },
          payment_intent_data: { application_fee_amount: feeAmount, transfer_data: { destination: creator.stripeAccountId } },
          success_url: `${input.origin}/marketplace?tip=success&item=${item.id}`,
          cancel_url: `${input.origin}/marketplace`,
        });
        return { url: session.url };
      }),
  });


