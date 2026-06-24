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

export const profileRouter = router({
    me: protectedProcedure.query(async ({ ctx }) => getUserById(ctx.user.id)),
    getById: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => getUserById(input.userId)),
    /** Lightweight creator card data for handle pop-ups — returns only public fields */
    getCreatorMini: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) return null;
      const publishedCount = await getPublishedCountByUser(input.userId);
      return {
        id: user.id,
        name: user.name,
        artistHandle: user.artistHandle,
        bio: user.bio,
        profilePhotoUrl: user.profilePhotoUrl,
        role: user.role,
        primaryGenre: user.primaryGenre,
        songSlotsUsed: user.songSlotsUsed,
        publishedCount,
        // Witness Identity fields for creator card
        originStatement: user.originStatement,
        activeMediums: user.activeMediums as string[] | null,
        sigilUrl: user.sigilUrl,
        founderWid: user.founderWid,
        witnessPhilosophy: user.witnessPhilosophy,
        witnessEpitaph: user.witnessEpitaph,
        witnessOriginStory: user.witnessOriginStory,
        witnessDoctrine: user.witnessDoctrine,
      };
    }),
    update: protectedProcedure.input(z.object({
      name: z.string().max(128).optional(),
      artistHandle: z.string().max(64).optional(),
      bio: z.string().max(1000).optional(),
      profilePhotoUrl: z.string().url().optional(),
      bannerUrl: z.string().url().optional(),
      bmiMemberNumber: z.string().max(64).optional(),
      website: z.string().url().optional().or(z.literal('')),
      location: z.string().max(128).optional(),
      twitterHandle: z.string().max(64).optional(),
      instagramHandle: z.string().max(64).optional(),
      youtubeHandle: z.string().max(64).optional(),
      aiDisclosure: z.enum(["original", "ai_assisted", "ai_generated", "human_authored_ai_instrument"]).optional(),
      primaryGenre: z.string().max(500).optional(),
      avatarObjectPosition: z.string().max(32).optional(),
      bannerPositionX: z.number().min(0).max(100).optional(),
      bannerPositionY: z.number().min(0).max(100).optional(),
      // Creator economy — direct payment links
      cashAppHandle: z.string().max(64).optional(),
      paypalUsername: z.string().max(128).optional(),
      venmoHandle: z.string().max(64).optional(),
      // Witness Identity Layer
      originStatement: z.string().max(5000).optional(),
      creativePhilosophy: z.string().max(5000).optional(),
      creativeDoctrine: z.string().max(5000).optional(),
      sigilUrl: z.string().url().optional().or(z.literal('')),
      activeMediums: z.array(z.string()).optional(),
      archiveContinuity: z.string().max(5000).optional(),
      creativeMission: z.string().max(2000).optional(),
      // Distribution Identity Layer
      officialArtistName: z.string().max(128).optional(),
      localizedName: z.string().max(128).optional(),
      dspSpotifyUrl: z.string().url().optional().or(z.literal('')),
      dspAppleMusicUrl: z.string().url().optional().or(z.literal('')),
      dspTikTokHandle: z.string().max(64).optional(),
      producerCredits: z.string().max(2000).optional(),
      labelName: z.string().max(128).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (input.name !== undefined) {
        const current = await getUserById(ctx.user.id);
        const oldName = current?.name ?? null;
        if (oldName !== input.name) {
          await recordNameChange(ctx.user.id, oldName, input.name);
        }
      }
      await updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
    uploadAvatar: protectedProcedure.input(z.object({ base64: z.string(), mimeType: z.string() })).mutation(async ({ ctx, input }) => {
      const rawBuffer = Buffer.from(input.base64, "base64");
      // Micronize: trim, center-crop 400×400, WebP quality 82
      const { buffer, mimeType } = await micronize(rawBuffer, "avatar");
      const { url } = await storagePut(`avatars/${ctx.user.id}-${Date.now()}.webp`, buffer, mimeType);
      await updateUserProfile(ctx.user.id, { profilePhotoUrl: url });
      return { url };
    }),
    uploadBanner: protectedProcedure.input(z.object({ base64: z.string(), mimeType: z.string() })).mutation(async ({ ctx, input }) => {
      const rawBuffer = Buffer.from(input.base64, "base64");
      // Micronize: resize to max 1600×600, WebP quality 80
      const { buffer } = await micronize(rawBuffer, "banner");
      const { url } = await storagePut(`banners/${ctx.user.id}-${Date.now()}.webp`, buffer, "image/webp");
      await updateUserProfile(ctx.user.id, { bannerUrl: url });

      // ── AI Focal Point Detection ─────────────────────────────────────
      // Ask the vision LLM to identify the primary subject's focal point
      // so the banner auto-centers on the most meaningful part of the image.
      let focalX = 50;
      let focalY = 50;
      try {
        const mimeType = input.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
        const dataUrl = `data:${mimeType};base64,${input.base64}`;
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an image composition analyst. Analyze the image and identify the primary focal point — the most visually important subject (face, architectural center, horizon, object). Return ONLY a JSON object with x and y as percentages (0–100) representing the focal point position within the image. 0,0 is top-left. 50,50 is center. Example: {\"x\":52,\"y\":38}",
            },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
                { type: "text", text: "Identify the primary focal point of this banner image. Return only JSON: {\"x\": number, \"y\": number}" },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "focal_point",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  x: { type: "number", description: "Horizontal focal point 0-100" },
                  y: { type: "number", description: "Vertical focal point 0-100" },
                },
                required: ["x", "y"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = result?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = typeof content === "string" ? JSON.parse(content) : content;
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            focalX = Math.max(0, Math.min(100, Math.round(parsed.x)));
            focalY = Math.max(0, Math.min(100, Math.round(parsed.y)));
          }
        }
      } catch (e) {
        // Focal detection is non-critical — fall back to center
        console.warn("[uploadBanner] Focal point detection failed, using center:", e);
      }

      return { url, focalX, focalY };
    }),
    allCreators: publicProcedure.query(async () => getAllCreators()),
    featuredCreators: publicProcedure.query(async () => {
      // Return up to 12 creators: pinned creators first, then sorted by most published tracks
      const all = await getAllCreators();
      return [...all].sort((a, b) => {
        // Pinned creators always float to the top
        if ((a.isPinned ? 1 : 0) !== (b.isPinned ? 1 : 0)) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
        // Then sort by track count descending
        return (b.publishedCount ?? 0) - (a.publishedCount ?? 0);
      }).slice(0, 12);
    }),
    recentCreators: publicProcedure.input(z.object({ limit: z.number().max(20).optional() }).optional()).query(async ({ input }) => {
      return getRecentCreators(input?.limit ?? 8);
    }),
    getCreator: publicProcedure.input(z.object({ creatorId: z.number() })).query(async ({ input }) => {
      const creator = await getUserById(input.creatorId);
      if (!creator) return null;
      const songs = await getSongsByUser(input.creatorId);
      const publicSongs = songs.filter((s: any) => s.isPublic);
      return { creator, songs: publicSongs };
    }),

    /**
     * Generate (or return cached) AI-powered one-liner tagline for a creator.
     * The tagline is the Nexus's witness statement about the creator — derived
     * from their portfolio signals (genre, WID count, play count, harmonic data,
     * bio keywords). Cached in generatedTagline column; regenerates on demand.
     */
    generateTagline: publicProcedure
      .input(z.object({
        creatorId: z.number().int().positive(),
        forceRegenerate: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
        const { users: usersTable } = await import('../../drizzle/schema');
        const { eq: eqFn } = await import('drizzle-orm');

        const creator = await getUserById(input.creatorId);
        if (!creator) throw new TRPCError({ code: 'NOT_FOUND', message: 'Creator not found' });

        // Return cached tagline unless forceRegenerate
        if (!input.forceRegenerate && creator.generatedTagline) {
          return { tagline: creator.generatedTagline, cached: true };
        }

        // Gather portfolio signals
        const songs = await getSongsByUser(creator.id);
        const publicSongs = songs.filter((s: any) => s.status !== 'Deleted');
        const songCount = publicSongs.length;
        const totalPlays = await getCreatorTotalPlays(creator.id);

        // Build a compact context string for the LLM
        const genreMap: Record<string, number> = {};
        for (const s of publicSongs) {
          if ((s as any).genre) {
            const g = String((s as any).genre);
            genreMap[g] = (genreMap[g] ?? 0) + 1;
          }
        }
        const topGenres = Object.entries(genreMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([g]) => g)
          .join(', ');

        const contextLines = [
          creator.name ? `Artist: ${creator.name}` : '',
          creator.artistHandle ? `Handle: @${creator.artistHandle}` : '',
          creator.primaryGenre ? `Primary Genre: ${creator.primaryGenre}` : '',
          topGenres ? `Top Genres Across Works: ${topGenres}` : '',
          creator.bio ? `Bio: ${creator.bio.slice(0, 300)}` : '',
          creator.energyProfile ? `Energy Profile: ${creator.energyProfile}` : '',
          creator.toneFrequencyNote ? `Tone/Frequency: ${creator.toneFrequencyNote}` : '',
          creator.dominantKey ? `Dominant Key: ${creator.dominantKey}` : '',
          creator.creativeMission ? `Creative Mission: ${creator.creativeMission.slice(0, 200)}` : '',
          `Registered Works: ${songCount}`,
          `Total Plays: ${totalPlays}`,
        ].filter(Boolean).join('\n');

        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `You are the Living Nexus — an audio provenance platform that witnesses and anchors creator identity. Your task is to write a single, powerful one-liner that serves as the Nexus's witness statement about a creator. This is NOT a marketing tagline. It is the platform speaking on behalf of what it has observed in the creator's portfolio. Rules: (1) One sentence only — no more than 25 words. (2) Ground it in real portfolio signals (genre, work count, plays, energy, key, frequency). (3) Write in third person, present tense. (4) Do not use generic phrases like "talented artist" or "unique sound". (5) Make it feel earned — like a provenance seal.`,
            },
            {
              role: 'user',
              content: `Based on the following creator portfolio data, write the Nexus witness statement one-liner:\n\n${contextLines}\n\nRespond with ONLY the one-liner sentence. No quotes, no labels, no explanation.`,
            },
          ],
        });

        const raw = response.choices?.[0]?.message?.content;
        if (!raw) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No response from AI' });
        const tagline = typeof raw === 'string' ? raw.trim().replace(/^"|"$/g, '') : '';
        if (!tagline) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Empty tagline from AI' });

        // Cache in DB
        await db.update(usersTable)
          .set({ generatedTagline: tagline, generatedTaglineAt: new Date() })
          .where(eqFn(usersTable.id, creator.id));

        return { tagline, cached: false };
      }),
    myStats: protectedProcedure.query(async ({ ctx }) => {
      const [stats, songs, user] = await Promise.all([
        getCreatorForOg(ctx.user.id),
        getSongsByUser(ctx.user.id),
        getUserById(ctx.user.id),
      ]);
      return {
        totalWorks: songs.length,
        publishedWorks: songs.filter((s: any) => s.status === 'Published').length,
        witnessedWorks: stats?.widCount ?? 0,
        licenseStatus: user?.licenseStatus ?? 'free',
        memberSince: user?.createdAt ?? new Date(),
      };
    }),
    myActivity: protectedProcedure
      .input(z.object({ limit: z.number().max(50).default(20) }))
      .query(async ({ ctx, input }) => getEventsForCreator(ctx.user.id, input.limit)),
    myAnalytics: protectedProcedure.query(async ({ ctx }) => getCreatorAnalytics(ctx.user.id)),
    /** Get the platform owner's lights mode — public so all visitors can read it on load */
    getLightsMode: publicProcedure.query(async () => {
      const { getDb } = await import("../utils/db");
      const { users: usersTable } = await import("../../drizzle/schema");
      const db = await getDb();
      if (!db) return { lightsMode: 'dim' as const };
      const rows = await db.select({ lightsMode: usersTable.lightsMode })
        .from(usersTable)
        .orderBy(usersTable.id)
        .limit(1);
      return { lightsMode: (rows[0]?.lightsMode ?? 'dim') as 'dim' | 'on' };
    }),
    /** Set the authenticated creator's lights mode */
    setLightsMode: protectedProcedure
      .input(z.object({ mode: z.enum(['dim', 'on']) }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("../utils/db");
        const { users: usersTable } = await import("../../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(usersTable)
          .set({ lightsMode: input.mode })
          .where(eqOp(usersTable.id, ctx.user.id));
        return { ok: true, mode: input.mode };
      }),
  });


