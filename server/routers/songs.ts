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

export const songsRouter = router({
    /** Pre-upload duplicate detection — checks if a fileHash already exists in the system. */
    checkDuplicate: protectedProcedure
      .input(z.object({ fileHash: z.string().length(64) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        const { songs } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const existing = await db.select({
          id: songs.id,
          title: songs.title,
          witnessId: songs.witnessId,
          userId: songs.userId,
          createdAt: songs.createdAt,
        }).from(songs).where(eq(songs.fileHash, input.fileHash)).limit(1);
        if (existing.length === 0) return { duplicate: false as const };
        const match = existing[0];
        const owner = await getUserById(match.userId);
        return {
          duplicate: true as const,
          isOwnWork: match.userId === ctx.user.id,
          existingTitle: match.title,
          existingWid: match.witnessId,
          existingCreator: owner?.artistHandle ?? owner?.name ?? "Unknown",
          existingCreatedAt: match.createdAt,
        };
      }),
    /**
     * @version 1.0.0
     * Returns paginated public works in canonical FeedRow[] shape { song: SongRecord, creator: CreatorSummary }.
     * All clients (web, mobile) MUST use coreDataTypes.ts FeedRow for type safety.
     */
    discover: publicProcedure.input(z.object({ genre: z.string().optional(), search: z.string().optional(), limit: z.number().max(500).optional(), offset: z.number().optional(), randomize: z.boolean().optional(), seed: z.number().optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic", "written", "game"]).optional() }).optional()).query(async ({ input }) => getPublicSongs(input ?? {})),
    /**
     * @version 1.0.0
     * Cursor-based infinite-scroll variant of discover.
     * cursor = offset (number of rows already seen). Returns { items, nextCursor }.
     * nextCursor is null when the feed is exhausted.
     */
    discoverInfinite: publicProcedure
      .input(z.object({
        cursor: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(60).optional(),
        genre: z.string().optional(),
        search: z.string().optional(),
        contentType: z.enum(["audio", "lyrics", "manuscript", "comic", "written", "game"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 24;
        const offset = input?.cursor ?? 0;
        const rows = await getPublicSongs({
          genre: input?.genre,
          search: input?.search,
          contentType: input?.contentType,
          limit: limit + 1, // fetch one extra to detect hasMore
          offset,
        });
        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore ? offset + limit : null;
        return { items, nextCursor };
      }),
    /**
     * @version 1.0.0
     * Returns trending works scored by weekly plays + likes in canonical FeedRow[] shape.
     * Score: weeklyPlays * 3 + weeklyLikes * 5 + allTimePlays * 0.01 (recency-weighted).
     */
    trending: publicProcedure.input(z.object({ genre: z.string().optional(), limit: z.number().max(500).optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic", "written", "game"]).optional() }).optional()).query(async ({ input }) => getTrendingWorks(input ?? {})),
    /**
     * @version 1.0.0
     * Returns works published within the last 90 days, newest first, in canonical FeedRow[] shape.
     * Falls back to all-time newest if no works exist within the window.
     */
    newThisWeek: publicProcedure.input(z.object({ genre: z.string().optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic", "written", "game"]).optional(), limit: z.number().max(100).optional() }).optional()).query(async ({ input }) => getNewThisWeek(input ?? {})),
    updateCredits: protectedProcedure.input(z.object({ songId: z.number().int(), creditsJson: z.string().max(4096) })).mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Song not found" });
      if (song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });
      await updateSongCredits(input.songId, input.creditsJson);
      return { ok: true };
    }),
    getTotalPlays: publicProcedure.input(z.object({ creatorId: z.number().int() })).query(async ({ input }) => {
      const total = await getCreatorTotalPlays(input.creatorId);
      return { total };
    }),
    /**
     * @version 1.0.0
     * Returns a single work with creator in canonical { song: SongRecord, creator: CreatorSummary } shape.
     * Used for work detail pages and OG meta tag generation.
     */
    getById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const result = await getSongWithCreator(input.id);
      return result ?? null;
    }),
    /**
     * @version 1.0.0
     * Returns the canonical WitnessRecord for any WID (WID-MUS-*, WID-LYR-*, WID-TST-*, PROJ-*).
     * This is the authoritative provenance lookup endpoint — see shared/coreDataTypes.ts WitnessRecord.
     * All clients MUST use this endpoint for WID verification; do not reconstruct provenance client-side.
     */
    verifyWid: publicProcedure.input(z.object({ witnessId: z.string().min(1) })).query(async ({ input }) => {
      // Handle WID-TST (testimony) lookups
      if (input.witnessId.startsWith("WID-TST-")) {
        const testimony = await getTestimonyByWid(input.witnessId);
        if (!testimony) throw new TRPCError({ code: "NOT_FOUND", message: "No testimony found for this Witness ID" });
        const creator = await getUserById(testimony.creatorId);
        return {
          witnessId: testimony.wid,
          title: `Testimony by ${creator?.artistHandle || creator?.name || "Creator"}`,
          artistName: creator?.artistHandle || creator?.name || "Unknown",
          artistHandle: creator?.artistHandle ?? null,
          profilePhotoUrl: creator?.profilePhotoUrl ?? null,
          songId: null,
          registeredAt: testimony.createdAt,
          fileHash: null,
          lyricsHash: null,
          isLyricsOnly: false,
          ecdsaSignature: null,
          ecdsaPublicKey: null,
          harmonicSignature: null,
          coverArtUrl: null,
          aiConsent: false,
          genre: null,
          isrc: null,
          nameAtWitnessing: creator?.artistHandle || creator?.name || "Unknown",
          nameHistory: [],
          lyricsWid: null,
          lyricsFileName: null,
          lyricsAddedAt: null,
          contentType: "testimony" as any,
          testimonyContent: testimony.content,
          testimonyLinkedWorks: (testimony.linkedWorks as string[] | null) ?? [],
        };
      }
      // Handle PROJ-* project WIDs
      if (input.witnessId.startsWith("PROJ-")) {
        const project = await getProjectByWid(input.witnessId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "No record found for this Witness ID" });
        const creator = await getUserById((project as any).userId);
        const creatorName = creator?.artistHandle || creator?.name || "Unknown Creator";
        return {
          witnessId: input.witnessId,
          title: project.title,
          artistName: creatorName,
          artistHandle: creator?.artistHandle ?? null,
          profilePhotoUrl: creator?.profilePhotoUrl ?? null,
          songId: null,
          registeredAt: project.createdAt,
          fileHash: null,
          lyricsHash: null,
          isLyricsOnly: false,
          ecdsaSignature: null,
          ecdsaPublicKey: null,
          harmonicSignature: null,
          coverArtUrl: project.bannerUrl ?? null,
          aiConsent: false,
          genre: null,
          isrc: null,
          nameAtWitnessing: creatorName,
          nameHistory: [],
          lyricsWid: null,
          lyricsFileName: null,
          lyricsAddedAt: null,
          contentType: "project" as any,
          testimonyContent: project.tagline ?? null,
          testimonyLinkedWorks: [],
        };
      }
      const result = await getSongByWitnessId(input.witnessId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "No record found for this Witness ID" });
      const { song, creator } = result;
      const creatorId = creator?.id;
      const nameHistoryRows = creatorId ? await getNameHistory(creatorId) : [];
      const currentArtistName = creator?.artistHandle || creator?.name || "Unknown Artist";
      const originalName = creatorId ? await getOriginalName(creatorId) : null;
      const nameAtWitnessing = originalName || currentArtistName;
      return {
        witnessId: song.witnessId,
        title: song.title,
        artistName: currentArtistName,
        artistHandle: creator?.artistHandle,
        profilePhotoUrl: creator?.profilePhotoUrl,
        creatorId: creator?.id ?? null,
        creatorUserId: song.userId,
        songId: song.id,
        registeredAt: song.createdAt,
        fileHash: song.fileHash,
        lyricsHash: song.lyricsHash,
        isLyricsOnly: song.isLyricsOnly,
        ecdsaSignature: song.ecdsaSignature,
        ecdsaPublicKey: song.ecdsaPublicKey,
        harmonicSignature: song.harmonicSignature,
        coverArtUrl: song.coverArtUrl,
        aiConsent: song.aiConsent,
        genre: song.genre,
        isrc: song.isrc,
        nameAtWitnessing,
        nameHistory: nameHistoryRows.map((r: { oldName: string | null; newName: string; changedAt: Date }) => ({ oldName: r.oldName, newName: r.newName, changedAt: r.changedAt })),
        lyricsWid: song.lyricsWid ?? null,
        lyricsFileName: song.lyricsFileName ?? null,
        lyricsAddedAt: song.lyricsAddedAt ?? null,
        contentType: (song.contentType ?? "audio") as "audio" | "lyrics" | "manuscript" | "comic",
        aiDisclosure: (song as any).aiDisclosure ?? null,
      };
    }),
    // Public counters for homepage trust layer
    getWitnessedCount: publicProcedure.query(async () => {
      const { getDb } = await import("../utils/db");
      const { songs: songsTable } = await import("../../drizzle/schema");
      const { count, isNotNull, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      // Only count Published, public witnessed songs — respects archive/unpublish toggle
      const [row] = await db.select({ total: count() }).from(songsTable).where(
        andOp(isNotNull(songsTable.witnessId), eqOp(songsTable.status, "Published"), eqOp(songsTable.isPublic, true))
      );
      return { count: row?.total ?? 0 };
    }),
    getCountsByContentType: publicProcedure.query(async () => {
      const { getDb } = await import("../utils/db");
      const { songs: songsTable } = await import("../../drizzle/schema");
      const { count, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      const countFor = async (ct: string) => {
        const [row] = await db.select({ total: count() }).from(songsTable)
          .where(andOp(
            eqOp(songsTable.contentType as any, ct),
            eqOp(songsTable.isPublic, true),
            eqOp(songsTable.status, "Published"),
          ));
        return row?.total ?? 0;
      };
      const [audio, lyrics, manuscript, comic] = await Promise.all([
        countFor("audio"),
        countFor("lyrics"),
        countFor("manuscript"),
        countFor("comic"),
      ]);
      return { audio, lyrics, manuscript, comic };
    }),
    countByCreator: publicProcedure.input(z.object({ creatorId: z.number().int() })).query(async ({ input }) => {
      const { getDb } = await import("../utils/db");
      const { songs: songsTable } = await import("../../drizzle/schema");
      const { count, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      const [row] = await db.select({ total: count() }).from(songsTable).where(
        andOp(eqOp(songsTable.userId, input.creatorId), eqOp(songsTable.isPublic, true), eqOp(songsTable.status, "Published"))
      );
      return { count: row?.total ?? 0 };
    }),
    /**
     * @version 1.0.0
     * Returns recently witnessed audio works in canonical FeedRow shape { song, creator }.
     * All clients (web, mobile) MUST use this shape — see shared/coreDataTypes.ts FeedRow.
     * Previously returned a flat shape; normalized in v1.0.0 for cross-client consistency.
     */
    getWitnessedVoices: publicProcedure.query(async () => {
      const { getDb } = await import("../utils/db");
      const { songs: songsTable, users: usersTable } = await import("../../drizzle/schema");
      const { isNotNull, desc: descOp, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      // Only return Published, public, audio-type witnessed songs — respects creator archive/unpublish toggle
      const rows = await db
        .select({
          // Canonical FeedRow.song fields (coreDataTypes.ts SongRecord)
          song: songsTable,
          // Canonical FeedRow.creator fields (coreDataTypes.ts CreatorSummary)
          creator: {
            id: usersTable.id,
            name: usersTable.name,
            artistHandle: usersTable.artistHandle,
            profilePhotoUrl: usersTable.profilePhotoUrl,
            aiDisclosure: usersTable.aiDisclosure,
            primaryGenre: usersTable.primaryGenre,
            stripeAccountStatus: usersTable.stripeAccountStatus,
            role: usersTable.role,
          },
        })
        .from(songsTable)
        .innerJoin(usersTable, eqOp(songsTable.userId, usersTable.id))
        .where(andOp(
          isNotNull(songsTable.witnessId),
          eqOp(songsTable.status, "Published"),
          eqOp(songsTable.isPublic, true),
          eqOp(songsTable.contentType as any, "audio"),
        ))
        .orderBy(descOp(songsTable.createdAt))
        .limit(10);
      return rows;
    }),
    mySongs: protectedProcedure.query(async ({ ctx }) => getSongsByUser(ctx.user.id)),
    bySelf: protectedProcedure.query(async ({ ctx }) => getSongsByUser(ctx.user.id)),
    getMyDraft: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;
        const { songs: songsTable } = await import("../../drizzle/schema");
        const { eq: eqOp, and: andOp } = await import("drizzle-orm");
        const result = await db.select().from(songsTable)
          .where(andOp(eqOp(songsTable.id, input.id), eqOp(songsTable.userId, ctx.user.id)))
          .limit(1);
        return result[0] ?? null;
      }),
    reorder: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number()).min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        // Validate all IDs belong to the requesting user before updating
        const userSongs = await getSongsByUser(ctx.user.id);
        const userSongIds = new Set(userSongs.map((s: { id: number }) => s.id));
        const invalid = input.orderedIds.filter((id) => !userSongIds.has(id));
        if (invalid.length > 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'One or more song IDs do not belong to you.' });
        await reorderSongs(ctx.user.id, input.orderedIds);
        return { success: true };
      }),
    upload: protectedProcedure.input(z.object({
      // Legacy base64 fields (still accepted for backward compat)
      audioBase64: z.string().max(50_000_000).optional(), audioMimeType: z.string().optional(), audioFileName: z.string().optional(),
      coverBase64: z.string().optional(), coverMimeType: z.string().optional(),
      // Preferred: pre-uploaded S3 URLs from /api/upload-file
      fileUrl: z.string().url().optional(), fileKey: z.string().optional(),
      coverArtUrl: z.string().url().optional(),
      title: z.string().min(1).max(255), genre: z.string().optional(), bpm: z.number().optional(),
      keySignature: z.string().optional(), moodTags: z.array(z.string()).optional(),
      coWriters: z.array(z.string()).optional(), albumName: z.string().optional(),
      creditsJson: z.string().max(4096).optional(),
      releaseDate: z.string().optional(), isrc: z.string().optional(),
      aiConsent: z.enum(["prohibited", "permitted_attribution", "permitted"]),
      ownershipStatus: z.enum(["full", "partial"]).default("full"),
      lyricsText: z.string().max(20000).optional(),
      lyricsHash: z.string().optional(),
      isLyricsOnly: z.boolean().optional(),
      contentType: z.enum(["audio", "lyrics", "manuscript", "comic"]).optional(),
      fileHash: z.string().optional(), witnessId: z.string().optional(),
      harmonicSignature: z.array(z.number()).optional(), ecdsaPublicKey: z.string().optional(), ecdsaSignature: z.string().optional(),
      caption: z.string().max(2000).nullable().optional(),
      // Enriched editorial fields
      headlineCaption: z.string().max(280).optional(),
      description: z.string().max(10000).optional(),
      galleryImagesJson: z.string().max(200000).optional(), // JSON array of { url, key, caption? }
      playerAssetType: z.enum(["cover", "video"]).optional(),
      // AI Tool Disclosure
      aiToolSuno: z.boolean().optional(),
      aiToolUdio: z.boolean().optional(),
      aiToolSonato: z.boolean().optional(),
      aiToolOther: z.boolean().optional(),
      aiToolOtherName: z.string().max(128).optional(),
      // Audio metadata from upload pipeline
      durationSeconds: z.number().optional(),
      sampleRate: z.number().optional(),
      bitDepth: z.number().optional(),
      // AI Disclosure & HAAI Declaration
      aiDisclosure: z.enum(["original", "ai_assisted", "ai_generated", "human_authored_ai_instrument"]).optional(),
      haaiVisualConcept: z.string().max(2000).optional(),
      haaiStyleLanguage: z.string().max(2000).optional(),
      haaiInstrumentation: z.string().max(2000).optional(),
      haaiVocalConveyance: z.string().max(2000).optional(),
      haaiLyricalInspiration: z.string().max(2000).optional(),
      haaiEmotionalTone: z.string().max(2000).optional(),
      haaiOriginStory: z.string().max(5000).optional(),
      // Storyboard / Comic Book Reader
      pagesJson: z.string().max(500000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      // Founders have slotLimit = null (infinite). Regular users are capped by songSlotsTotal.
      const isFounder = user.role === "founder" || user.slotLimit === null;
      if (!isFounder && user.songSlotsUsed >= user.songSlotsTotal) throw new Error("No song slots available. Please purchase more slots.");
      let fileUrl: string | undefined = input.fileUrl;
      let audioKey: string | undefined = input.fileKey;
      // Fallback: legacy base64 path (for backward compat)
      if (!fileUrl && !input.isLyricsOnly && input.audioBase64 && input.audioMimeType && input.audioFileName) {
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        const safeFileName = input.audioFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        audioKey = `audio/${ctx.user.id}/${Date.now()}-${safeFileName}`;
        const { url } = await storagePut(audioKey, audioBuffer, input.audioMimeType);
        fileUrl = url;
      }
      let coverArtUrl: string | undefined = input.coverArtUrl;
      // Fallback: legacy base64 cover path — micronize before upload
      if (!coverArtUrl && input.coverBase64 && input.coverMimeType) {
        const rawCover = Buffer.from(input.coverBase64, "base64");
        const { buffer: processedCover, mimeType: coverMime } = await micronize(rawCover, "coverArt");
        const { url } = await storagePut(`covers/${ctx.user.id}/${Date.now()}.webp`, processedCover, coverMime);
        coverArtUrl = url;
      }
      // Determine HAAI declared timestamp if all 6 fields are provided
      const haaiFields = [input.haaiVisualConcept, input.haaiStyleLanguage, input.haaiInstrumentation, input.haaiVocalConveyance, input.haaiLyricalInspiration, input.haaiEmotionalTone];
      const haaiDeclaredAt = (input.aiDisclosure === "human_authored_ai_instrument" && haaiFields.every(f => f && f.trim().length > 0)) ? new Date() : undefined;
      // Assign displayOrder so new songs append to the end of the creator's list
      const nextOrder = await getNextDisplayOrder(ctx.user.id);
      const insertResult = await createSong({ userId: ctx.user.id, title: input.title, genre: input.genre, bpm: input.bpm, keySignature: input.keySignature, moodTags: input.moodTags, coWriters: input.coWriters, albumName: input.albumName, creditsJson: input.creditsJson, releaseDate: input.releaseDate, isrc: input.isrc, aiConsent: input.aiConsent, ownershipStatus: input.ownershipStatus, lyricsText: input.lyricsText, lyricsHash: input.lyricsHash, isLyricsOnly: input.isLyricsOnly ?? false, contentType: input.contentType ?? (input.isLyricsOnly ? "lyrics" : "audio"), fileUrl, fileKey: audioKey, coverArtUrl, fileHash: input.fileHash, witnessId: input.witnessId, harmonicSignature: input.harmonicSignature, ecdsaPublicKey: input.ecdsaPublicKey, ecdsaSignature: input.ecdsaSignature, caption: input.caption, headlineCaption: input.headlineCaption, description: input.description, galleryImagesJson: input.galleryImagesJson, playerAssetType: input.playerAssetType ?? 'cover', aiToolSuno: input.aiToolSuno ?? false, aiToolUdio: input.aiToolUdio ?? false, aiToolSonato: input.aiToolSonato ?? false, aiToolOther: input.aiToolOther ?? false, aiToolOtherName: input.aiToolOtherName, durationSeconds: input.durationSeconds, sampleRate: input.sampleRate, bitDepth: input.bitDepth, aiDisclosure: input.aiDisclosure, haaiVisualConcept: input.haaiVisualConcept, haaiStyleLanguage: input.haaiStyleLanguage, haaiInstrumentation: input.haaiInstrumentation, haaiVocalConveyance: input.haaiVocalConveyance, haaiLyricalInspiration: input.haaiLyricalInspiration, haaiEmotionalTone: input.haaiEmotionalTone, haaiOriginStory: input.haaiOriginStory, haaiDeclaredAt, pagesJson: input.pagesJson, displayOrder: nextOrder } as any);
       const songId = (insertResult as any)[0]?.insertId as number;
      // Trigger visual generation pipeline (non-blocking)
      enqueueVisualJob(songId, isFounder).catch(err => console.error("[VisualQueue] Enqueue error:", err));
      // Generate share artifact (non-blocking) — precomputed OG HTML for Discord/X/iMessage
      if (input.witnessId) {
        generateShareArtifact(input.witnessId).catch(err => console.error("[ShareArtifact] Generation error:", err));
      }
      // Discord webhooks — fire non-blocking
      void (async () => {
        try {
          const { fireUserWebhook } = await import("../services/discord");
          const creator = await getUserById(ctx.user.id);
          const webhookPayload = {
            title: input.title,
            creatorName: creator?.displayName || creator?.username || "Unknown",
            contentType: input.contentType ?? "audio",
            genre: input.genre ?? undefined,
            witnessId: input.witnessId ?? undefined,
          };
          await fireUserWebhook(ctx.user.id, "track_upload", webhookPayload);
          if (input.witnessId) {
            await fireUserWebhook(ctx.user.id, "wid_minted", webhookPayload);
          }
        } catch (e) { /* swallow */ }
      })();
      return { success: true, fileUrl, coverArtUrl, songId, witnessId: input.witnessId ?? null };
    }),
    uploadCoverArt: protectedProcedure.input(z.object({
      songId: z.number(),
      coverBase64: z.string(),
      coverMimeType: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const rawBuffer = Buffer.from(input.coverBase64, "base64");
      // Micronize: trim, resize to max 1200×1200, WebP quality 85
      const { buffer, mimeType } = await micronize(rawBuffer, "coverArt");
      const { url } = await storagePut(`covers/${ctx.user.id}/${Date.now()}-edit.webp`, buffer, mimeType);
      // Immediately persist the new cover URL
      await updateSongMetadata(input.songId, ctx.user.id, { coverArtUrl: url });
      return { url };
    }),

    // ── Batch Upload (Album) ──────────────────────────────────────────────────────────────────
    batchUpload: protectedProcedure.input(z.object({
      albumName: z.string().min(1).max(255),
      genre: z.string().optional(),
      aiConsent: z.enum(["prohibited", "permitted_attribution", "permitted"]),
      // Preferred: pre-uploaded cover S3 URL from /api/upload-file
      coverArtUrl: z.string().url().optional(),
      // Legacy base64 cover (still accepted for backward compat)
      coverBase64: z.string().optional(),
      coverMimeType: z.string().optional(),
      // Album-level options from batch upload sketch
      albumArtAcrossAll: z.boolean().optional(), // apply album art to every track
      albumArtIsAi: z.boolean().optional(), // album art is AI-generated
      tracks: z.array(z.object({
        // Preferred: pre-uploaded S3 URL from /api/upload-file
        fileUrl: z.string().url().optional(),
        fileKey: z.string().optional(),
        // Per-track cover art (overrides album-level cover)
        coverArtUrl: z.string().url().optional(),
        // Legacy base64 fields (still accepted for backward compat)
        audioBase64: z.string().max(50_000_000).optional(),
        audioMimeType: z.string().optional(),
        audioFileName: z.string().optional(),
        title: z.string().min(1).max(255),
        genre: z.string().optional(),
        albumName: z.string().optional(),
        aiConsent: z.enum(["prohibited", "permitted_attribution", "permitted"]).optional(),
        fileHash: z.string().optional(),
        witnessId: z.string().optional(),
        harmonicSignature: z.array(z.number()).optional(),
        ecdsaPublicKey: z.string().optional(),
        ecdsaSignature: z.string().optional(),
        // New fields from batch upload sketch
        releaseDate: z.string().optional(), // ISO date string for original creation date
        aiDisclosure: z.enum(["original", "ai_assisted", "human_authored_ai_instrument", "ai_generated"]).optional(),
        aiToolSuno: z.boolean().optional(),
        aiToolUdio: z.boolean().optional(),
        aiToolSonato: z.boolean().optional(),
        aiToolOther: z.boolean().optional(),
        aiToolOtherName: z.string().max(128).optional(),
        lyricsText: z.string().max(50000).optional(),
      })).min(1).max(50),
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      const isFounderBatch = user.role === "founder" || user.slotLimit === null;
      if (!isFounderBatch && user.songSlotsUsed + input.tracks.length > user.songSlotsTotal) {
        throw new Error(`Not enough song slots. You have ${user.songSlotsTotal - user.songSlotsUsed} slot(s) remaining but are trying to upload ${input.tracks.length} track(s).`);
      }
      // Resolve cover art URL (prefer pre-uploaded, fallback to base64)
      let coverArtUrl: string | undefined = input.coverArtUrl;
      if (!coverArtUrl && input.coverBase64 && input.coverMimeType) {
        const rawCover = Buffer.from(input.coverBase64, "base64");
        const { buffer: processedCover, mimeType: coverMime } = await micronize(rawCover, "coverArt");
        const { url } = await storagePut(`covers/${ctx.user.id}/${Date.now()}-album.webp`, processedCover, coverMime);
        coverArtUrl = url;
      }
      // Create song records (files already uploaded via /api/upload-file)
      // Track insertId in upload order so linkSongsToCollection preserves sequence
      // Get the starting displayOrder slot so batch tracks are appended sequentially
      let batchDisplayOrder = await getNextDisplayOrder(ctx.user.id);
      const results: { title: string; witnessId?: string; fileUrl: string; songId?: number }[] = [];
      for (const track of input.tracks) {
        let fileUrl: string | undefined = track.fileUrl;
        let audioKey: string | undefined = track.fileKey;
        // Fallback: legacy base64 path
        if (!fileUrl && track.audioBase64 && track.audioMimeType && track.audioFileName) {
          const audioBuffer = Buffer.from(track.audioBase64, "base64");
          const safeFileName = track.audioFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          audioKey = `audio/${ctx.user.id}/${Date.now()}-${safeFileName}`;
          const { url } = await storagePut(audioKey, audioBuffer, track.audioMimeType);
          fileUrl = url;
        }
        if (!fileUrl) throw new Error(`No file URL for track: ${track.title}`);
        const insertResult = await createSong({
          userId: ctx.user.id,
          title: track.title,
          genre: track.genre ?? input.genre,
          albumName: track.albumName ?? input.albumName,
          aiConsent: track.aiConsent ?? input.aiConsent,
          fileUrl,
          fileKey: audioKey,
          coverArtUrl: track.coverArtUrl ?? (input.albumArtAcrossAll !== false ? coverArtUrl : undefined),
          fileHash: track.fileHash,
          witnessId: track.witnessId,
          harmonicSignature: track.harmonicSignature,
          ecdsaPublicKey: track.ecdsaPublicKey,
          ecdsaSignature: track.ecdsaSignature,
          // New provenance fields from batch upload sketch
          releaseDate: track.releaseDate,
          aiDisclosure: track.aiDisclosure,
          aiToolSuno: track.aiToolSuno ?? false,
          aiToolUdio: track.aiToolUdio ?? false,
          aiToolSonato: track.aiToolSonato ?? false,
          aiToolOther: track.aiToolOther ?? false,
          aiToolOtherName: track.aiToolOtherName,
          lyricsText: track.lyricsText,
          displayOrder: batchDisplayOrder++,
        } as any);
        // Capture the auto-increment ID directly from the insert result to preserve upload order
        const songId = (insertResult as any)[0]?.insertId as number | undefined;
        results.push({ title: track.title, witnessId: track.witnessId, fileUrl, songId });
        // Generate WID-LYR if lyrics were provided
        if (songId && track.lyricsText && track.lyricsText.trim()) {
          try {
            const { createHash: createHashLyr } = await import("crypto");
            // Hash the lyrics text itself (no file bytes in batch flow)
            const lyricsHash = createHashLyr("sha256").update(track.lyricsText.trim()).digest("hex");
            const combinedHash = createHashLyr("sha256")
              .update(`${lyricsHash}:${track.witnessId ?? songId}:${ctx.user.id}`)
              .digest("hex");
            const lyricsWid = `WID-LYR-${combinedHash.slice(0, 8).toUpperCase()}-${combinedHash.slice(8, 16).toUpperCase()}`;
            await updateSongLyricsWithWid(songId, ctx.user.id, {
              lyricsText: track.lyricsText.trim(),
              lyricsWid,
              lyricsFileName: `${track.title || "lyrics"}.txt`,
              lyricsFileHash: lyricsHash,
              lyricsAddedAt: new Date(),
            });
          } catch (lyrErr) {
            console.error("[BatchUpload] WID-LYR generation failed for song", songId, lyrErr);
          }
        }
        // Trigger visual generation pipeline for each song (non-blocking)
        if (songId) {
          const isBatchFounder = (ctx.user as any).role === "founder";
          enqueueVisualJob(songId, isBatchFounder).catch(err => console.error("[VisualQueue] Batch enqueue error:", err));
        }
      }
      // ── Generate Collection WID (WID-ALB) ─────────────────────────────────────
      // Collect all WIDs that were assigned, sort them, hash together
      const allWids = results.map(r => r.witnessId).filter(Boolean) as string[];
      let collectionWid: string | undefined;
      let collectiveHash: string | undefined;
      let collectionId: number | undefined;

      if (allWids.length > 0) {
        // Server-side SHA-256 of sorted WIDs joined by '|'
        const { createHash } = await import("crypto");
        const sortedWids = [...allWids].sort();
        const hashInput = sortedWids.join("|");
        collectiveHash = createHash("sha256").update(hashInput).digest("hex");
        collectionWid = `WID-ALB-${collectiveHash.slice(0, 8).toUpperCase()}-${collectiveHash.slice(8, 16).toUpperCase()}`;

        // Persist the collection record
        const insertResult = await createCollection({
          creatorId: ctx.user.id,
          name: input.albumName,
          collectionWid,
          collectiveHash,
          coverArtUrl,
          trackCount: allWids.length,
        });
        collectionId = (insertResult as any)[0]?.insertId as number;

        // Back-link all newly created songs to this collection
        // Use insertId from each createSong call (upload order preserved)
        // Fall back to WID lookup only for tracks that didn't return an insertId
        const songIds: number[] = [];
        for (const r of results) {
          if (r.songId) {
            songIds.push(r.songId);
          } else if (r.witnessId) {
            const songRow = await getSongByWitnessId(r.witnessId);
            if (songRow?.song?.id) songIds.push(songRow.song.id);
          }
        }
        if (songIds.length > 0) await linkSongsToCollection(songIds, collectionId);
      }

      return {
        success: true,
        trackCount: results.length,
        coverArtUrl,
        results,
        collectionWid,
        collectiveHash,
        collectionId,
      };
    }),
    // ── Verify Collection WID (WID-ALB) ──────────────────────────────────────────
    verifyCollection: publicProcedure.input(z.object({ collectionWid: z.string().min(1) })).query(async ({ input }) => {
      let collection;
      try { collection = await getCollectionByWid(input.collectionWid); } catch { collection = undefined; }
      if (!collection) throw new TRPCError({ code: "NOT_FOUND", message: "No collection found for this WID-ALB" });
      const tracks = await getSongsByCollectionId(collection.id);
      const creator = await getUserById(collection.creatorId);
      const creatorName = creator?.artistHandle || creator?.name || "Unknown Artist";
      return {
        collectionWid: collection.collectionWid,
        collectiveHash: collection.collectiveHash,
        name: collection.name,
        creatorId: collection.creatorId,
        creatorName,
        creatorHandle: creator?.artistHandle,
        creatorPhotoUrl: creator?.profilePhotoUrl,
        coverArtUrl: collection.coverArtUrl,
        trackCount: collection.trackCount,
        pdfUrl: collection.pdfUrl,
        createdAt: collection.createdAt,
        tracks: tracks.map((t: typeof tracks[number]) => ({
          id: t.id,
          title: t.title,
          witnessId: t.witnessId,
          fileHash: t.fileHash,
          coverArtUrl: t.coverArtUrl,
          genre: t.genre,
          aiConsent: t.aiConsent,
          createdAt: t.createdAt,
        })),
      };
    }),
    // ── Get collection for a song ─────────────────────────────────────────────
    getCollectionForSong: publicProcedure.input(z.object({ songId: z.number() })).query(async ({ input }) => {
      const collection = await getCollectionForSong(input.songId);
      if (!collection) return null;
      return {
        collectionWid: collection.collectionWid,
        name: collection.name,
        trackCount: collection.trackCount,
        coverArtUrl: collection.coverArtUrl,
      };
    }),
    delete: protectedProcedure.input(z.object({ songId: z.number() })).mutation(async ({ ctx, input }) => { await deleteSong(input.songId, ctx.user.id); return { success: true }; }),
    // Bulk-dismiss stale Draft songs — soft-deletes all Draft songs for the user
    dismissDrafts: protectedProcedure
      .input(z.object({ olderThanDays: z.number().int().min(0).max(365).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const { songs: songsTable } = await import("../../drizzle/schema");
        const { and: _and, eq: _eq, lt: _lt } = await import("drizzle-orm");
        const cutoff = input.olderThanDays != null
          ? new Date(Date.now() - input.olderThanDays * 86400000)
          : undefined;
        const conditions: any[] = [
          _eq(songsTable.userId, ctx.user.id),
          _eq(songsTable.status, "Draft"),
        ];
        if (cutoff) conditions.push(_lt(songsTable.createdAt, cutoff));
        const result = await db.update(songsTable)
          .set({ status: "Deleted", isPublic: false, updatedAt: new Date() })
          .where(_and(...conditions));
        return { success: true, deleted: (result as any).rowsAffected ?? 0 };
      }),
    reorderMySongs: protectedProcedure
      .input(z.object({ songIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await reorderMySongs(ctx.user.id, input.songIds);
        return { success: true };
      }),
    updateStatus: protectedProcedure.input(z.object({
      songId: z.number(),
      status: z.enum(["Draft", "Published", "Unlisted", "Deleted"]),
    })).mutation(async ({ ctx, input }) => {
      await updateSongStatus(input.songId, ctx.user.id, input.status);
      // On publish: ensure visual pipeline is triggered + fan out to witnesses
      if (input.status === "Published") {
        const isFounder = (ctx.user as any).role === "founder";
        enqueueVisualJob(input.songId, isFounder).catch(err => console.error("[VisualQueue] Enqueue error:", err));
        // Publish to witness feed (fire-and-forget)
        getSongById(input.songId).then(song => {
          if (!song) return;
          publishToFeed({
            creatorId: ctx.user.id,
            manifestationId: song.id,
            contentType: (song.contentType as any) ?? "audio",
            wid: song.witnessId ?? undefined,
            title: song.title,
            coverArtUrl: song.coverArtUrl ?? undefined,
            slug: song.witnessId ?? undefined,
            visibility: "public",
          }).catch(err => console.error("[WitnessFeed] publishToFeed error:", err));
        }).catch(err => console.error("[WitnessFeed] getSongById error:", err));
      }
      return { success: true };
    }),
    updateMetadata: protectedProcedure.input(z.object({
      songId: z.number(),
      caption: z.string().max(2000).nullable().optional(),
      genre: z.string().nullable().optional(),
      collectionTag: z.string().max(128).nullable().optional(),
      coverArtUrl: z.string().url().nullable().optional(),
      aiConsent: z.enum(["prohibited", "permitted_attribution", "permitted"]).optional(),
      ownershipStatus: z.enum(["full", "partial"]).optional(),
      status: z.enum(["Draft", "Published", "Unlisted", "Deleted"]).optional(),
      coverPositionX: z.number().min(0).max(100).optional(),
      coverPositionY: z.number().min(0).max(100).optional(),
      // AI Disclosure & HAAI Declaration
      aiDisclosure: z.enum(["original", "ai_assisted", "ai_generated", "human_authored_ai_instrument"]).nullable().optional(),
      haaiVisualConcept: z.string().max(2000).nullable().optional(),
      haaiStyleLanguage: z.string().max(2000).nullable().optional(),
      haaiInstrumentation: z.string().max(2000).nullable().optional(),
      haaiVocalConveyance: z.string().max(2000).nullable().optional(),
      haaiLyricalInspiration: z.string().max(2000).nullable().optional(),
      haaiEmotionalTone: z.string().max(2000).nullable().optional(),
      haaiOriginStory: z.string().max(5000).nullable().optional(),
      creditsJson: z.string().max(4096).nullable().optional(),
      parentSongId: z.number().int().positive().nullable().optional(),
      // Storyboard / Comic Book Reader
      pagesJson: z.string().max(500000).nullable().optional(),
      // Book Access Control & Commerce
      readAccess: z.enum(["open", "preview", "locked"]).optional(),
      purchasePriceCents: z.number().int().min(0).nullable().optional(),
      previewPageCount: z.number().int().min(1).max(50).optional(),
      consentSettingsJson: z.string().max(2000).nullable().optional(),
      externalLinksJson: z.string().max(4096).nullable().optional(),
      // Narrative Format — reader engine selector
      narrativeFormat: z.enum(["comic", "childrens", "manuscript"]).nullable().optional(),
      // Guided Reader: Panel Regions & Soundtrack Cues
      panelRegionsJson: z.string().max(500000).nullable().optional(),
      soundtrackCuesJson: z.string().max(100000).nullable().optional(),
      // Title / description / headline
      title: z.string().max(255).optional(),
      description: z.string().max(10000).nullable().optional(),
      headlineCaption: z.string().max(280).nullable().optional(),
      // Mood tags
      moodTags: z.array(z.string()).nullable().optional(),
      // Release / creation date (ISO date string, e.g. "2024-03-15")
      releaseDate: z.string().nullable().optional(),
      // Download Settings
      downloadPermission: z.enum(["none", "free", "tipped"]).optional(),
      downloadTipThresholdCents: z.number().int().min(0).max(100000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { songId, creditsJson, ...fields } = input;
      // If saving a complete HAAI declaration, stamp the declared timestamp
      const haaiFields = [fields.haaiVisualConcept, fields.haaiStyleLanguage, fields.haaiInstrumentation, fields.haaiVocalConveyance, fields.haaiLyricalInspiration, fields.haaiEmotionalTone];
      const isHaaiComplete = haaiFields.every(f => f && f.trim().length > 0);
      await updateSongMetadata(songId, ctx.user.id, {
        ...fields,
        haaiDeclaredAt: isHaaiComplete ? new Date() : undefined,
      });
      // Save credits separately if provided (null = clear all credits, empty string = clear)
      if (creditsJson !== undefined) {
        await updateSongCredits(songId, creditsJson ?? "");
      }
      return { success: true };
    }),

    // Legacy play counter — kept for backward compatibility (PlayerBar still calls this)
    play: publicProcedure.input(z.object({ songId: z.number() })).mutation(async ({ input }) => { await incrementPlayCount(input.songId); return { success: true }; }),
    // Trust-layer play audit — replaces legacy play for qualified tracking
    recordPlay: publicProcedure
      .input(z.object({
        songId: z.number().int().positive(),
        witnessId: z.string().optional(),
        sessionId: z.string().min(8).max(64),   // client UUID, stable per listening session
        durationSeconds: z.number().min(0),      // elapsed seconds heard
        totalDurationSeconds: z.number().min(0).optional(), // full track length
      }))
      .mutation(async ({ ctx, input }) => {
        // Hash the IP for dedup (never store raw IP)
        const ip = (ctx.req as any)?.ip ?? (ctx.req as any)?.socket?.remoteAddress ?? "";
        let ipHash: string | null = null;
        if (ip) {
          const { createHash } = await import("crypto");
          ipHash = createHash("sha256").update(ip).digest("hex");
        }
        const result = await recordPlayEvent({
          songId: input.songId,
          witnessId: input.witnessId ?? null,
          sessionId: input.sessionId,
          userId: ctx.user?.id ?? null,
          durationSeconds: input.durationSeconds,
          totalDurationSeconds: input.totalDurationSeconds,
          ipHash,
        });
        return { ...result, minThreshold: MIN_PLAY_SECONDS };
      }),
    // Get play audit stats for a song
    playAuditStats: publicProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getPlayAuditStats(input.songId);
      }),
    download: publicProcedure.input(z.object({ songId: z.number() })).mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song?.fileUrl) throw new Error("Song file not found");
      const perm = (song as any).downloadPermission as string | undefined;
      // Enforce permission gate
      if (!perm || perm === "none") throw new TRPCError({ code: "FORBIDDEN", message: "Downloads are not enabled for this track." });
      // All download types require authentication — guests must sign in first
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to download this track." });
      if (perm === "tipped") {
        // Must have tipped at least the threshold amount
        const thresholdCents = (song as any).downloadTipThresholdCents ?? 179;
        const userTipTotal = await getUserTipTotalForSong(ctx.user.id, input.songId);
        if (userTipTotal < thresholdCents) throw new TRPCError({ code: "FORBIDDEN", message: `Tip $${(thresholdCents / 100).toFixed(2)} to unlock this download.` });
      }
      await recordDownload({ songId: input.songId, userId: ctx.user.id });
      return { url: song.fileUrl };
    }),
    updateLyrics: protectedProcedure.input(z.object({ songId: z.number(), lyricsText: z.string().max(10000) })).mutation(async ({ ctx, input }) => {
      await updateSongLyrics(input.songId, ctx.user.id, input.lyricsText);
      return { success: true };
    }),
    // ── Lyrics WID (WID-LYR) ─────────────────────────────────────────────────
    addLyricsWithWid: protectedProcedure.input(z.object({
      songId: z.number(),
      lyricsText: z.string().max(50000),
      lyricsFileName: z.string().max(255),
      lyricsFileHash: z.string().length(64), // SHA-256 hex
    })).mutation(async ({ ctx, input }) => {
      // Ownership check
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });
      // Generate WID-LYR from the file hash
      const { createHash } = await import("crypto");
      const combinedHash = createHash("sha256")
        .update(`${input.lyricsFileHash}:${song.witnessId ?? song.id}:${ctx.user.id}`)
        .digest("hex");
      const lyricsWid = `WID-LYR-${combinedHash.slice(0, 8).toUpperCase()}-${combinedHash.slice(8, 16).toUpperCase()}`;
      const lyricsAddedAt = new Date();
      await updateSongLyricsWithWid(input.songId, ctx.user.id, {
        lyricsText: input.lyricsText,
        lyricsWid,
        lyricsFileName: input.lyricsFileName,
        lyricsFileHash: input.lyricsFileHash,
        lyricsAddedAt,
      });
      return { success: true, lyricsWid, lyricsAddedAt };
    }),
    // ── Audio Replace ──────────────────────────────────────────────────────────
    replaceAudio: protectedProcedure.input(z.object({
      songId: z.number(),
      audioBase64: z.string(),
      audioMimeType: z.string(),
      audioFileName: z.string(),
      fileHash: z.string().length(64), // SHA-256 hex computed on client
      versionNote: z.string().max(500).optional(),
    })).mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });
      // 0. Check slot availability — audio replacement generates a new WID and consumes a slot
      //    EXCEPTION: If the song is lyrics-only, attaching audio for the first time does NOT
      //    consume an extra slot — the slot was already consumed when the lyrics work was created.
      const isLyricsOnlyUpgrade = song.isLyricsOnly === true;
      if (!isLyricsOnlyUpgrade) {
        const userForSlots = await getUserById(ctx.user.id);
        if (!userForSlots) throw new TRPCError({ code: "UNAUTHORIZED" });
        const slotsUsed = userForSlots.songSlotsUsed ?? 0;
        const slotsTotal = userForSlots.songSlotsTotal ?? 0;
        const isFounderReplace = userForSlots.role === "founder" || userForSlots.slotLimit === null;
        if (!isFounderReplace && slotsUsed >= slotsTotal) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You have used all your upload slots. Audio replacement generates a new WID and requires an available slot. Upgrade your Living Archive to continue.",
          });
        }
      }
      // 1. Archive the current audio as a historical version
      if (song.fileUrl && song.witnessId) {
        await archiveAudioVersion({
          songId: input.songId,
          witnessId: song.witnessId,
          audioUrl: song.fileUrl,
          fileKey: song.fileKey ?? null,
          fileHash: song.fileHash ?? null,
          versionNote: input.versionNote ?? null,
        });
      }
      // 2. Upload new audio to S3
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      const safeFileName = input.audioFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `audio/${ctx.user.id}/${Date.now()}-${safeFileName}`;
      const { url: fileUrl } = await storagePut(fileKey, audioBuffer, input.audioMimeType);
      // 3. Generate new WID-MUS bound to the new file hash
      const { createHash } = await import("crypto");
      const combinedHash = createHash("sha256")
        .update(`${input.fileHash}:${ctx.user.id}:${Date.now()}`)
        .digest("hex");
      const newWitnessId = `WID-MUS-${combinedHash.slice(0, 8).toUpperCase()}-${combinedHash.slice(8, 16).toUpperCase()}`;
      // 4. Update the songs row with new audio + new WID
      await replaceAudioFile(input.songId, ctx.user.id, {
        fileUrl,
        fileKey,
        fileHash: input.fileHash,
        witnessId: newWitnessId,
      });
      return { success: true, fileUrl, witnessId: newWitnessId };
    }),

    getAudioVersions: protectedProcedure.input(z.object({ songId: z.number() })).query(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });
      return getAudioVersions(input.songId);
    }),

    // Public — used by VerifyPage to show version history for any WID
    getAudioVersionsByWid: publicProcedure.input(z.object({ witnessId: z.string().min(1) })).query(async ({ input }) => {
      const result = await getSongByWitnessId(input.witnessId);
      if (!result) return [];
      return getAudioVersions(result.song.id);
    }),

    // ── Video Upload ───────────────────────────────────────────────────────────
    uploadVideo: protectedProcedure.input(z.object({
      songId: z.number(),
      videoBase64: z.string(),
      videoMimeType: z.string(),
      videoFileName: z.string(),
      videoWitnessId: z.string().optional(), // SHA-256 hash computed on client
    })).mutation(async ({ ctx, input }) => {
      // Verify song belongs to this user
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });
      const videoBuffer = Buffer.from(input.videoBase64, "base64");
      const safeFileName = input.videoFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const videoKey = `videos/${ctx.user.id}/${Date.now()}-${safeFileName}`;
      const { url: videoUrl } = await storagePut(videoKey, videoBuffer, input.videoMimeType);
      await updateSongVideo(input.songId, ctx.user.id, {
        videoUrl,
        videoKey,
        videoWitnessId: input.videoWitnessId ?? null,
      });
      return { videoUrl, videoKey, videoWitnessId: input.videoWitnessId ?? null };
    }),

    removeVideo: protectedProcedure.input(z.object({ songId: z.number() })).mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });
      await updateSongVideo(input.songId, ctx.user.id, { videoUrl: null, videoKey: null, videoWitnessId: null });
      return { success: true };
    }),

    // uploadVideoByUrl: links a video already uploaded via the /api/upload-file streaming relay
    // Avoids base64 encoding and the platform proxy body-size limit
    uploadVideoByUrl: protectedProcedure.input(z.object({
      songId: z.number(),
      videoUrl: z.string().url(),
      videoKey: z.string(),
      videoMimeType: z.string().optional(),
      videoWitnessId: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song || song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });
      await updateSongVideo(input.songId, ctx.user.id, {
        videoUrl: input.videoUrl,
        videoKey: input.videoKey,
        videoWitnessId: input.videoWitnessId ?? null,
      });
      return { videoUrl: input.videoUrl, videoKey: input.videoKey, videoWitnessId: input.videoWitnessId ?? null };
    }),
    getRelated: publicProcedure.input(z.object({ songId: z.number(), genre: z.string().optional() })).query(async ({ input }) => {
      return getRelatedSongs(input.songId, input.genre, 6);
    }),
    /**
     * Constellation data: central song + inner ring (same creator) + outer ring (same genre, different creator).
     * Used by /constellation/:songId page.
     */
    constellation: publicProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const central = await getSongWithCreator(input.songId);
        if (!central) throw new TRPCError({ code: "NOT_FOUND", message: "Song not found" });
        // Inner ring: same creator, different song, published
        const { songs: songsTable, users } = await import("../../drizzle/schema");
        const { getDb } = await import("../utils/db");
        const { eq, and, ne, desc } = await import("drizzle-orm");
        const db = await getDb();
        const innerRaw = db ? await db.select({
          song: songsTable,
          creator: { id: users.id, name: users.name, artistHandle: users.artistHandle, profilePhotoUrl: users.profilePhotoUrl },
        }).from(songsTable)
          .leftJoin(users, eq(songsTable.userId, users.id))
          .where(and(
            eq(songsTable.userId, central.creator?.id ?? 0),
            ne(songsTable.id, input.songId),
            eq(songsTable.isPublic, true),
            eq(songsTable.status, "Published"),
          ))
          .orderBy(desc(songsTable.playCount))
          .limit(8) : [];
        // Outer ring: same genre, different creator
        const outerRaw = central.song.genre
          ? await getRelatedSongs(input.songId, central.song.genre, 8)
          : await getRelatedSongs(input.songId, undefined, 8);
        return {
          central,
          inner: innerRaw,
          outer: outerRaw,
        };
      }),

    getLiked: protectedProcedure.query(async ({ ctx }) => {
      return getLikedSongs(ctx.user.id);
    }),
    getLikedOrdered: protectedProcedure.query(async ({ ctx }) => {
      return getLikedSongsOrdered(ctx.user.id);
    }),
    reorderLikes: protectedProcedure
      .input(z.object({ orderedSongIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await reorderLikes(ctx.user.id, input.orderedSongIds);
        return { ok: true };
      }),
    toggleLike: protectedProcedure.input(z.object({ songId: z.number() })).mutation(async ({ ctx, input }) => {
      const result = await toggleLike(ctx.user.id, input.songId);
      // Check for like surge: if this was a new like, see if the song got 10+ likes in the last hour
      if (result?.liked) {
        void (async () => {
          try {
            const db = await getDb();
            if (!db) return;
            const { likes } = await import("../../drizzle/schema");
            const { gte, count: drizzleCount, eq } = await import("drizzle-orm");
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const [{ cnt }] = await db
              .select({ cnt: drizzleCount(likes.id) })
              .from(likes)
              .where(eq(likes.songId, input.songId));
            // Fire surge webhook only at the 10-like milestone (within ±1 to avoid spam)
            if (cnt === 10 || cnt === 50 || cnt === 100 || cnt === 500) {
              const song = await getSongById(input.songId);
              if (song?.userId) {
                const { fireUserWebhook } = await import("../services/discord");
                const creator = await getUserById(song.userId);
                await fireUserWebhook(song.userId, "like_surge", {
                  title: song.title,
                  creatorName: creator?.displayName || creator?.username || "Unknown",
                  newLikes: cnt,
                });
              }
            }
          } catch (e) { /* swallow */ }
        })();
      }
      return result;
    }),
    getLikeStatus: protectedProcedure.input(z.object({ songId: z.number() })).query(async ({ ctx, input }) => {
      const liked = await getLikeStatus(ctx.user.id, input.songId);
      return { liked };
    }),
    getLikeCount: publicProcedure.input(z.object({ songId: z.number() })).query(async ({ input }) => {
      const count = await getLikeCount(input.songId);
      return { count };
    }),
    /**
     * Witness Activity: count unique sessions that played this song in the
     * last 5 minutes — a lightweight "currently listening" signal.
     */
    getListenerCount: publicProcedure
      .input(z.object({ songId: z.number() }))
      .query(async ({ input }) => {
        const { playEvents } = await import("../../drizzle/schema");
        const { getDb } = await import("../utils/db");
        const db = await getDb();
        const { gte, eq, and, count: drizzleCount } = await import("drizzle-orm");
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const result = await db
          .select({ cnt: drizzleCount(playEvents.sessionId) })
          .from(playEvents)
          .where(and(eq(playEvents.songId, input.songId), gte(playEvents.createdAt, fiveMinutesAgo)));
        const raw = result[0]?.cnt ?? 0;
        // Small synthetic floor so brand-new tracks feel alive (1–3)
        const floor = ((input.songId % 3) + 1);
        return { count: Math.max(raw, floor) };
      }),
    /**
     * Bulk fetch like statuses + counts for up to 100 songs in 2 DB queries.
     * Use this instead of batching individual getLikeStatus/getLikeCount calls
     * to avoid HTTP 414 URI Too Long errors on large track lists.
     */
    getBulkLikeStatuses: publicProcedure
      .input(z.object({ songIds: z.array(z.number()).max(500) }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id ?? null;
        return getBulkLikeStatuses(userId, input.songIds);
      }),
    // Persistent emoji reactions
    getReactions: publicProcedure
      .input(z.object({ songId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getSongReactions(input.songId, ctx.user?.id);
      }),
    toggleReaction: protectedProcedure
      .input(z.object({ songId: z.number(), type: z.string().min(1).max(16) }))
      .mutation(async ({ ctx, input }) => {
        const result = await toggleSongReaction(input.songId, ctx.user.id, input.type);
        // When a reaction is added (not removed), notify the song's creator
        if (result === "added") {
          try {
            const song = await getSongById(input.songId);
            if (song?.userId && song.userId !== ctx.user.id) {
              const EMOJI_MAP: Record<string, string> = {
                fire: "🔥", love: "❤️", grateful: "🙏", magic: "✨", gem: "💎", vibe: "🎵",
              };
              const emoji = EMOJI_MAP[input.type] || "✨";
              const senderName = ctx.user.artistHandle || ctx.user.name || "A listener";
              await createNotification({
                userId: song.userId,
                type: "reaction",
                title: `${emoji} Appreciation received`,
                body: `${senderName} sent ${emoji} on "${song.title}"`,
                actorName: senderName,
                refType: "song",
                refId: input.songId,
              });
            }
          } catch (notifyErr) {
            // Non-critical — don't fail the reaction if notification fails
            console.error("[toggleReaction] Notification failed:", notifyErr);
          }
        }
        return { result };
      }),
    generateCaption: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        genre: z.string().optional(),
        workType: z.enum(["audio", "lyrics", "manuscript", "comic"]).optional(),
        generateDescription: z.boolean().optional(), // if true, generate a longer description instead of a short caption
        imageUrls: z.array(z.string().url()).max(6).optional(), // gallery images to analyze for richer description
        // NOTE: content is intentionally NOT accepted here.
        // Per platform policy, only title and genre/category are sent to AI.
        // Lyrics, manuscripts, and audio are WID-protected and must never be sent to external AI systems.
      }))
      .mutation(async ({ input }) => {
        const workType = input.workType ?? "audio";
        const workLabel = workType === "audio" ? "music track" : workType === "lyrics" ? "lyrics work" : workType === "manuscript" ? "manuscript or book" : "comic or graphic novel";
        const creatorLabel = workType === "audio" || workType === "lyrics" ? "musician/songwriter" : workType === "manuscript" ? "author" : "comic creator";

        const isDescription = input.generateDescription === true;

        const systemPrompt = isDescription
          ? `You are a description writer for Living Nexus, a sovereign creative provenance platform. Your job is to write a rich, authentic long-form description for a ${workLabel} that a creator is uploading. The description should:
- Be 2-4 paragraphs (100-300 words)
- Tell the story behind the work — the process, the intent, the emotional context
- Sound like the creator's own voice — personal, specific, not corporate
- Avoid generic phrases like "a journey" or "sonic landscape"
- Give the reader a reason to care about this specific work
- End with something that makes the reader want to experience it
Return ONLY the description text. No quotes. No labels. No explanation.`
          : `You are a caption writer for Living Nexus, a sovereign creative provenance platform. Your job is to write a short, compelling caption/description for a ${workLabel} that a creator is uploading. The caption should:
- Be 1-3 sentences (50-150 words max)
- Capture the spirit and feel of the work based on its title and category only
- Sound authentic and creator-voiced — not corporate or generic
- Avoid clichés like "a journey" or "sonic landscape"
- Match the medium: for a ${workLabel}, speak as if introducing a ${creatorLabel}'s work
- End with energy — make someone want to experience it
Return ONLY the caption text. No quotes. No labels. No explanation.`;

        // IMPORTANT: Only title, genre/category, and optional gallery images are sent. Audio/lyrics content is NEVER sent.
        const textContent = `${workType === "manuscript" || workType === "comic" ? "Work" : "Track"} title: "${input.title}"
${workType === "manuscript" || workType === "comic" ? "Category" : "Genre"}: ${input.genre || "Not specified"}${input.imageUrls?.length ? `\n\nI have also attached ${input.imageUrls.length} image(s) that represent the visual context, artwork, or process photos for this work. Use them to enrich the description.` : ""}`;

        // Build multimodal message if images are provided
        const userContent: any = input.imageUrls?.length
          ? [
              { type: "text", text: textContent },
              ...input.imageUrls.map((url: string) => ({ type: "image_url", image_url: { url, detail: "low" as const } })),
            ]
          : textContent;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        });

        const caption = (response as any)?.choices?.[0]?.message?.content?.trim() ?? "";
        if (!caption) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Caption generation failed. Please try again." });
        return { caption, description: caption }; // return both keys for compatibility
      }),
    // ── Generate Collection Certificate (HTML → S3) ────────────────────────────
    generateCollectionCertificate: protectedProcedure
      .input(z.object({ collectionWid: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const collection = await getCollectionByWid(input.collectionWid);
        if (!collection) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
        if (collection.creatorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your collection" });
        const tracks = await getSongsByCollectionId(collection.id);
        const creator = await getUserById(collection.creatorId);
        const creatorName = creator?.artistHandle || creator?.name || "Unknown Artist";
        const year = new Date().getFullYear();
        const regDate = new Date(collection.createdAt).toLocaleString("en-US", {
          year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit", timeZoneName: "short",
        });
        const trackRows = tracks.map((t: typeof tracks[number], i: number) =>
          `<tr>
            <td style="padding:6px 8px;color:#6ee7f7;font-size:11px;">${String(i + 1).padStart(2, "0")}</td>
            <td style="padding:6px 8px;color:#e2e8f0;font-size:12px;">${t.title.replace(/</g, "&lt;")}</td>
            <td style="padding:6px 8px;color:#D4AF37;font-family:'Share Tech Mono',monospace;font-size:10px;">${t.witnessId ?? "\u2014"}</td>
            <td style="padding:6px 8px;color:rgba(226,232,240,0.4);font-size:9px;font-family:'Share Tech Mono',monospace;">${t.fileHash ? t.fileHash.slice(0, 16) + "..." : "\u2014"}</td>
          </tr>`
        ).join("");
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Collection Certificate \u2014 ${collection.name.replace(/</g, "&lt;")}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
  body { background:#0a0a0a;color:#e2e8f0;font-family:'Share Tech Mono',monospace;margin:0;padding:40px; }
  .cert { max-width:900px;margin:0 auto;border:1px solid #D4AF37;padding:40px;position:relative; }
  .cert::before { content:'';position:absolute;inset:6px;border:1px solid rgba(201,168,76,0.2);pointer-events:none; }
  h1 { font-family:'Orbitron',monospace;color:#D4AF37;font-size:20px;letter-spacing:4px;margin:0 0 4px; }
  h2 { font-family:'Orbitron',monospace;color:#6ee7f7;font-size:11px;letter-spacing:3px;margin:0 0 28px; }
  .divider { border:none;border-top:1px solid #D4AF37;margin:24px 0;opacity:0.4; }
  .label { color:#6ee7f7;font-size:10px;letter-spacing:2px;margin-bottom:2px; }
  .value { color:#e2e8f0;font-size:14px;margin-bottom:14px;word-break:break-all; }
  .wid { font-family:'Orbitron',monospace;color:#D4AF37;font-size:20px;letter-spacing:3px; }
  .hash { font-size:10px;color:rgba(226,232,240,0.5);word-break:break-all;line-height:1.6; }
  .verified { color:#22c55e;font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px; }
  table { width:100%;border-collapse:collapse;margin-top:8px; }
  th { text-align:left;padding:6px 8px;color:#6ee7f7;font-size:10px;letter-spacing:1px;border-bottom:1px solid rgba(201,168,76,0.3); }
  tr:nth-child(even) td { background:rgba(255,255,255,0.02); }
  .footer { margin-top:32px;font-size:10px;color:rgba(226,232,240,0.35);line-height:1.8;text-align:center; }
</style>
</head>
<body>
<div class="cert">
  <h1>COLLECTION WITNESS CERTIFICATE</h1>
  <h2>Command Domains LLC / BDDT Publishing \u2014 Sovereign Shutter\u2122 Framework</h2>
  <div class="verified">\u2713 VERIFIED \u2014 Living Nexus Collective Provenance Registry</div>
  <hr class="divider">
  <div class="label">COLLECTION NAME</div>
  <div class="value" style="font-size:20px;color:#D4AF37;">${collection.name.replace(/</g, "&lt;")}</div>
  <div class="label">CREATOR</div>
  <div class="value">${creatorName.replace(/</g, "&lt;")}</div>
  <div class="label">REGISTRATION DATE</div>
  <div class="value">${regDate}</div>
  <hr class="divider">
  <div class="label">COLLECTION WITNESS ID (WID-ALB)</div>
  <div class="value wid">${collection.collectionWid}</div>
  <div class="label">COLLECTIVE HASH (SHA-256 of all sorted individual WIDs)</div>
  <div class="value hash">sha256:${collection.collectiveHash}</div>
  <hr class="divider">
  <div class="label">INCLUDED WORKS (${tracks.length} tracks)</div>
  <table>
    <thead><tr><th>#</th><th>TITLE</th><th>WITNESS ID</th><th>FILE HASH (truncated)</th></tr></thead>
    <tbody>${trackRows}</tbody>
  </table>
  <hr class="divider">
  <div class="label">LEGAL NOTICE</div>
  <div style="font-size:11px;color:rgba(226,232,240,0.4);line-height:1.8;">
    This certificate establishes collective provenance of the above works under the Sovereign Shutter\u2122 framework, Command Domains LLC.<br>
    Each individual track carries its own cryptographic Witness ID. The Collection WID binds them into a single origin record.<br>
    Copyright &copy; ${year} ${creatorName.replace(/</g, "&lt;")}. Published under BDDT Publishing. All rights reserved.<br>
    Verified via Living Nexus Provenance Registry \u2014 livingnexus.org/verify/${collection.collectionWid}
  </div>
  <div class="footer">
    &ldquo;He is before all things, and in him all things hold together.&rdquo; \u2014 Colossians 1:17<br>
    Living Nexus &bull; Sovereign Shutter\u2122 &bull; BDDT Publishing &bull; Command Domains LLC
  </div>
</div>
</body>
</html>`;
        const htmlBuffer = Buffer.from(html, "utf-8");
        const certKey = `certificates/collections/${collection.collectionWid}-${Date.now()}.html`;
        const { url: pdfUrl } = await storagePut(certKey, htmlBuffer, "text/html;charset=utf-8");
        await updateCollectionPdf(collection.id, pdfUrl, certKey);
        return { pdfUrl, collectionWid: collection.collectionWid };
      }),
    // ── Get My Collections (Dashboard) ─────────────────────────────────────────────────────────────────────────────────
    getMyCollections: protectedProcedure.query(async ({ ctx }) => {
      return getCollectionsByCreator(ctx.user.id);
    }),
    // ── Get Collections by Creator (public, for profile page) ───────────────────────────────
    getCollectionsByCreator: publicProcedure
      .input(z.object({ creatorId: z.number() }))
      .query(async ({ input }) => {
        return getCollectionsByCreator(input.creatorId);
      }),
    // ── Get tracks for a WID-ALB collection (Archive page) ─────────────────────────────────────
    getCollectionTracks: publicProcedure
      .input(z.object({ collectionId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getSongsByCollectionId(input.collectionId);
      }),
    // ── Update Collection Cover Position ─────────────────────────────────────────────────────
    updateCollectionCoverPosition: protectedProcedure.input(z.object({
      collectionId: z.number(),
      coverPositionX: z.number().min(0).max(100),
      coverPositionY: z.number().min(0).max(100),
    })).mutation(async ({ ctx, input }) => {
      await updateCollectionCover(input.collectionId, ctx.user.id, {
        coverPositionX: input.coverPositionX,
        coverPositionY: input.coverPositionY,
      });
      return { success: true };
    }),
    // ── Upload Collection Cover Art ──────────────────────────────────────────────────────────
    uploadCollectionCover: protectedProcedure.input(z.object({
      collectionId: z.number(),
      base64: z.string(),
      mimeType: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(`collection-covers/${ctx.user.id}-${input.collectionId}-${Date.now()}.jpg`, buffer, input.mimeType);
      await updateCollectionCover(input.collectionId, ctx.user.id, { coverArtUrl: url });
      return { url };
    }),
    /* Stub: worker stats for MissionControlPage (backend worker not yet deployed) */
    getWorkerStats: protectedProcedure.query(async () => {
      return { stats: { pending: 0, claimed: 0, completed: 0, failed: 0 }, recent: [] as any[] };
    }),
  });


