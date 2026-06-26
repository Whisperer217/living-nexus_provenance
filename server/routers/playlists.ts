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

export const playlistsRouter = router({
    /** Get all playlists owned or collaborated on by the current user */
    mine: protectedProcedure.query(async ({ ctx }) => {
      return getPlaylistsByUser(ctx.user.id);
    }),
    /** Get a single playlist with its tracks and collaborators */
    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const playlist = await getPlaylistById(input.id);
        if (!playlist) throw new TRPCError({ code: "NOT_FOUND" });
        // Private playlists only visible to members
        if (!playlist.isPublic) {
          if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
          const isMember = await isPlaylistMember(input.id, ctx.user.id);
          if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const [tracks, collaborators] = await Promise.all([
          getPlaylistTracks(input.id),
          getPlaylistCollaborators(input.id),
        ]);
        return { playlist, tracks, collaborators };
      }),
    /** Create a new playlist */
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        description: z.string().max(500).optional(),
        isPublic: z.boolean().optional(),
        isCollaborative: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createPlaylist({ ownerId: ctx.user.id, ...input });
        return { id };
      }),
    /** Update playlist metadata */
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().max(500).optional(),
        isPublic: z.boolean().optional(),
        isCollaborative: z.boolean().optional(),
        coverArtUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const playlist = await getPlaylistById(input.id);
        if (!playlist || playlist.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updatePlaylist(id, data);
        return { ok: true };
      }),
    /** Delete a playlist (owner only) */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const playlist = await getPlaylistById(input.id);
        if (!playlist || playlist.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await deletePlaylist(input.id);
        return { ok: true };
      }),
    /** Add a track to a playlist */
    addTrack: protectedProcedure
      .input(z.object({ playlistId: z.number().int().positive(), songId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await isPlaylistMember(input.playlistId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        await addTrackToPlaylist(input.playlistId, input.songId, ctx.user.id);
        return { ok: true };
      }),
    /** Remove a track from a playlist */
    removeTrack: protectedProcedure
      .input(z.object({ playlistTrackId: z.number().int().positive(), playlistId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await isPlaylistMember(input.playlistId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        await removeTrackFromPlaylist(input.playlistTrackId);
        return { ok: true };
      }),
    /** Invite a collaborator by userId */
    invite: protectedProcedure
      .input(z.object({ playlistId: z.number().int().positive(), userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const playlist = await getPlaylistById(input.playlistId);
        if (!playlist || playlist.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await inviteCollaborator(input.playlistId, input.userId, ctx.user.id);
        // Notify the invited user
        const inviter = await getUserById(ctx.user.id);
        await createNotification({
          userId: input.userId,
          type: "playlist_invite",
          title: `${inviter?.artistHandle || inviter?.name || "Someone"} invited you to collaborate`,
          body: `You've been invited to co-edit "${playlist.name}"`,
          actorId: ctx.user.id,
          actorName: inviter?.artistHandle || inviter?.name || undefined,
          actorAvatarUrl: inviter?.profilePhotoUrl || undefined,
          refId: input.playlistId,
          refType: "playlist",
        });
        return { ok: true };
      }),
    /** Accept a playlist collaboration invite */
    acceptInvite: protectedProcedure
      .input(z.object({ playlistId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await acceptPlaylistInvite(input.playlistId, ctx.user.id);
        return { ok: true };
      }),
    /** Remove a collaborator (owner) or leave a playlist (collaborator) */
    removeCollaborator: protectedProcedure
      .input(z.object({ playlistId: z.number().int().positive(), userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const playlist = await getPlaylistById(input.playlistId);
        if (!playlist) throw new TRPCError({ code: "NOT_FOUND" });
        // Owner can remove anyone; collaborator can only remove themselves
        if (playlist.ownerId !== ctx.user.id && ctx.user.id !== input.userId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await removeCollaborator(input.playlistId, input.userId);
        return { ok: true };
      }),
    /** Reorder tracks in a playlist (owner/collaborator) */
    reorder: protectedProcedure
      .input(z.object({
        playlistId: z.number().int().positive(),
        orderedSongIds: z.array(z.number().int().positive()),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await isPlaylistMember(input.playlistId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import("../utils/db");
        const { playlistTracks: pt } = await import("../../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const db = await getDb();
        // Update position for each songId in the new order
        await Promise.all(
          input.orderedSongIds.map((songId, idx) =>
            db.update(pt)
              .set({ position: idx })
              .where(eqOp(pt.playlistId, input.playlistId))
              .where(eqOp(pt.songId, songId))
          )
        );
        return { ok: true };
      }),
    /** Save a version snapshot of the current playlist ordering */
    saveVersion: protectedProcedure
      .input(z.object({
        playlistId: z.number().int().positive(),
        note: z.string().max(256).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await isPlaylistMember(input.playlistId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import("../utils/db");
        const { playlistVersions, playlistTracks: pt, songs: songsTable } = await import("../../drizzle/schema");
        const { eq: eqOp, asc, max } = await import("drizzle-orm");
        const db = await getDb();
        // Get current ordered tracks
        const tracks = await db
          .select({ songId: pt.songId, witnessId: songsTable.witnessId, position: pt.position })
          .from(pt)
          .leftJoin(songsTable, eqOp(pt.songId, songsTable.id))
          .where(eqOp(pt.playlistId, input.playlistId))
          .orderBy(asc(pt.position));
        // Get next version number
        const [{ maxVer }] = await db
          .select({ maxVer: max(playlistVersions.versionNum) })
          .from(playlistVersions)
          .where(eqOp(playlistVersions.playlistId, input.playlistId));
        const nextVer = (maxVer ?? 0) + 1;
        const widArray = tracks.map((t: typeof tracks[number]) => t.witnessId).filter(Boolean);
        const songIdArray = tracks.map((t: typeof tracks[number]) => t.songId);
        await db.insert(playlistVersions).values({
          playlistId: input.playlistId,
          versionNum: nextVer,
          widArray,
          songIdArray,
          savedByUserId: ctx.user.id,
          note: input.note,
        });
        return { versionNum: nextVer, trackCount: tracks.length };
      }),
    /** Get version history for a playlist */
    getVersions: protectedProcedure
      .input(z.object({ playlistId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const isMember = await isPlaylistMember(input.playlistId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import("../utils/db");
        const { playlistVersions, users: usersTable } = await import("../../drizzle/schema");
        const { eq: eqOp, desc: descOp } = await import("drizzle-orm");
        const db = await getDb();
        const rows = await db
          .select({
            id: playlistVersions.id,
            versionNum: playlistVersions.versionNum,
            widArray: playlistVersions.widArray,
            songIdArray: playlistVersions.songIdArray,
            note: playlistVersions.note,
            savedAt: playlistVersions.savedAt,
            savedByName: usersTable.name,
            savedByHandle: usersTable.artistHandle,
          })
          .from(playlistVersions)
          .leftJoin(usersTable, eqOp(playlistVersions.savedByUserId, usersTable.id))
          .where(eqOp(playlistVersions.playlistId, input.playlistId))
                    .orderBy(descOp(playlistVersions.versionNum))
          .limit(20);
        return rows;
      }),
    /** Generate an AI cover image for a playlist based on a prompt and optional reference images */
    generateCover: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(600),
        referenceImageUrls: z.array(z.string().url()).max(4).optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateImage } = await import('../_core/imageGeneration');
        const enrichedPrompt = `Playlist cover art for a music collection. Cathedral aesthetic, luminous, cinematic. ${input.prompt}`;
        const originalImages = (input.referenceImageUrls ?? []).map(url => ({ url, mimeType: 'image/jpeg' as const }));
        const result = await generateImage({ prompt: enrichedPrompt, originalImages });
        return { url: result.url };
      }),
    /** Save the current session queue as a new named playlist with optional cover art */
    saveQueueAsPlaylist: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        description: z.string().max(500).optional(),
        coverArtUrl: z.string().url().optional(),
        isPublic: z.boolean().optional(),
        songIds: z.array(z.number().int().positive()).min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const { songIds, ...meta } = input;
        const playlistId = await createPlaylist({ ownerId: ctx.user.id, ...meta });
        if (!playlistId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create playlist' });
        // Add all tracks in order
        for (const songId of songIds) {
          await addTrackToPlaylist(playlistId, songId, ctx.user.id);
        }
        return { id: playlistId };
      }),
    /** Check which of the user's playlists already contain a given song */
    songInPlaylists: protectedProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { getDb: getDb2 } = await import("../utils/db");
        const { playlistTracks: pt2, playlists: pl2 } = await import("../../drizzle/schema");
        const { eq: eqOp2, and: andOp2, inArray } = await import("drizzle-orm");
        const db2 = await getDb2();
        // Get all playlist IDs the user owns
        const userPlaylists = await db2
          .select({ id: pl2.id })
          .from(pl2)
          .where(eqOp2(pl2.ownerId, ctx.user.id));
        const playlistIds = userPlaylists.map((p: { id: number }) => p.id);
        if (playlistIds.length === 0) return {} as Record<number, boolean>;
        // Check which contain this song
        const rows2 = await db2
          .select({ playlistId: pt2.playlistId })
          .from(pt2)
          .where(andOp2(eqOp2(pt2.songId, input.songId), inArray(pt2.playlistId, playlistIds)));
        const containsSet = new Set(rows2.map((r: { playlistId: number }) => r.playlistId));
        const result: Record<number, boolean> = {};
        for (const id of playlistIds) result[id] = containsSet.has(id);
        return result;
      }),
  });


