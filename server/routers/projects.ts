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

export const projectsRouter = router({
    /** List all active (published) projects — public */
    list: publicProcedure.query(async () => {
      return listActiveProjects();
    }),

    /** Get a single project by slug — public */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const project = await getProjectBySlug(input.slug);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const updates = await getProjectUpdates(project.id);
        const donations = await getProjectDonations(project.id);
        return { project, updates, donations };
      }),

    /** Get current user's projects — protected */
    mine: protectedProcedure.query(async ({ ctx }) => {
      return getProjectsByUser(ctx.user.id);
    }),

    /** Create a new project — protected */
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        tagline: z.string().max(512).optional(),
        description: z.string().optional(),
        videoUrl: z.string().url().optional().or(z.literal("")),
        videoType: z.enum(["youtube", "vimeo", "s3", "none"]).optional(),
        goalAmountCents: z.number().int().positive().optional(),
        linkedWitnessId: z.string().optional(),
        linkedSongId: z.number().int().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate slug from title
        const baseSlug = input.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 80);
        const slug = `${baseSlug}-${Date.now().toString(36)}`;
        const id = await createProject({
          userId: ctx.user.id,
          slug,
          title: input.title,
          tagline: input.tagline ?? null,
          description: input.description ?? null,
          videoUrl: input.videoUrl || null,
          videoType: (input.videoType ?? "none") as any,
          goalAmountCents: input.goalAmountCents ?? null,
          linkedWitnessId: input.linkedWitnessId ?? null,
          linkedSongId: input.linkedSongId ?? null,
          status: "draft",
        });
        return { id, slug };
      }),

    /** Update project details — protected, must be owner */
    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        title: z.string().min(1).max(256).optional(),
        tagline: z.string().max(512).optional(),
        description: z.string().optional(),
        bannerUrl: z.string().nullable().optional(),
        bannerKey: z.string().nullable().optional(),
        bannerPositionX: z.number().min(0).max(100).optional(),
        bannerPositionY: z.number().min(0).max(100).optional(),
        videoUrl: z.string().nullable().optional(),
        videoType: z.enum(["youtube", "vimeo", "s3", "none"]).nullable().optional(),
        goalAmountCents: z.number().int().positive().nullable().optional(),
        status: z.enum(["draft", "active", "completed", "archived"]).optional(),
        linkedWitnessId: z.string().optional(),
        linkedSongId: z.number().int().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { id, ...data } = input;
        await updateProject(id, data as any);
        return { ok: true };
      }),

    /** Upload banner image — protected, must be owner */
    uploadBanner: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const buf = Buffer.from(input.fileBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `project-banners/${ctx.user.id}-${input.projectId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buf, input.mimeType);
        await updateProject(input.projectId, { bannerUrl: url, bannerKey: key });
        return { url, key };
      }),

    /** Post a progress update — protected, must be owner */
    addUpdate: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        title: z.string().max(256).optional(),
        body: z.string().min(1),
        imageUrl: z.string().nullable().optional(),
        imageKey: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await addProjectUpdate({ ...input, userId: ctx.user.id });
        // Notify all donors AND followers about the new update (fire-and-forget, non-blocking)
        void (async () => {
          try {
            const donations = await getProjectDonations(input.projectId);
            const followerIds = await getProjectFollowerUserIds(input.projectId);
            const donorUserIds = donations
              .filter((d) => d.donorUserId != null && d.donorUserId !== ctx.user.id)
              .map((d) => d.donorUserId as number);
            // Merge donors + followers, deduplicate, exclude the creator
            const recipientIds = Array.from(new Set([...donorUserIds, ...followerIds]))
              .filter((uid) => uid !== ctx.user.id);
            if (recipientIds.length === 0) return;
            const creator = await getUserById(ctx.user.id);
            const notifTitle = input.title
              ? `Update on "${project.title}": ${input.title}`
              : `New update on "${project.title}"`;
            await Promise.all(
              recipientIds.map((uid) =>
                createNotification({
                  userId: uid,
                  type: "project_update",
                  title: notifTitle,
                  body: input.body.slice(0, 200),
                  actorId: ctx.user.id,
                  actorName: creator?.name ?? ctx.user.name,
                  actorAvatarUrl: creator?.profilePhotoUrl ?? undefined,
                  refId: input.projectId,
                  refType: "project",
                })
              )
            );
          } catch (e) {
            console.error("[projects.addUpdate] Failed to notify donors/followers:", e);
          }
        })();
        return { ok: true };
      }),
    /** Create Stripe checkout for a project donation - public (logged in optional) */
    donate: publicProcedure
      .input(z.object({
        projectId: z.number().int(),
        amountCents: z.number().int().min(100).max(1000000),
        message: z.string().max(500).optional(),
        anonymous: z.boolean().optional(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "This project is not currently accepting donations" });

        // Get creator's Stripe account for transfer (optional — works without Connect)
        const creator = await getUserById(project.userId);
        const hasConnectAccount = !!(creator?.stripeAccountId && creator.stripeAccountStatus === "enabled");

        const platformFeeCents = Math.round(input.amountCents * PLATFORM_FEE_PERCENT / 100);
        const user = ctx.user;

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: `Support: ${project.title}`, description: project.tagline || undefined },
              unit_amount: input.amountCents,
            },
            quantity: 1,
          }],
          mode: "payment",
          success_url: `${input.origin}/project/${project.slug}?donation=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.origin}/project/${project.slug}`,
          customer_email: user?.email || undefined,
          metadata: {
            type: "project_donation",
            projectId: String(project.id),
            userId: user ? String(user.id) : "",
            donorName: user?.name || "",
            donorEmail: user?.email || "",
            message: input.message || "",
            anonymous: input.anonymous ? "true" : "false",
          },
        };

        // Only add transfer_data if creator has a verified Stripe Connect account
        if (hasConnectAccount) {
          sessionParams.payment_intent_data = {
            transfer_data: { destination: creator!.stripeAccountId! },
            application_fee_amount: platformFeeCents,
          };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);
        return { url: session.url };
      }),

    /**
     * Confirm a donation by verifying the Stripe session directly.
     * Called client-side after returning from checkout with ?donation=success.
     * Idempotent: uses stripeSessionId as unique key to prevent double-counting.
     * Reliable fallback when webhooks are delayed or not configured in test mode.
     */
    confirmDonation: publicProcedure
      .input(z.object({
        sessionId: z.string().min(1),
        projectId: z.number().int(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const session = await stripe.checkout.sessions.retrieve(input.sessionId);
          if (session.payment_status !== "paid") {
            return { credited: false, reason: "payment_not_completed" };
          }
          const meta = session.metadata || {};
          if (meta.type !== "project_donation" || parseInt(meta.projectId || "0") !== input.projectId) {
            return { credited: false, reason: "metadata_mismatch" };
          }
          // Check if already recorded (webhook may have already processed it)
          const db = await getDb();
          if (!db) return { credited: false, reason: "db_unavailable" };
          const existing = await db.execute(
            `SELECT id FROM projectDonations WHERE stripeSessionId = ? LIMIT 1`,
            [session.id]
          ) as any;
          const rows = existing?.[0] as any[];
          if (rows && rows.length > 0) {
            return { credited: true, alreadyRecorded: true };
          }
          // Webhook hasn't fired yet — record it now
          const amountCents = session.amount_total ?? 0;
          const user = ctx.user;
          await recordProjectDonation({
            projectId: input.projectId,
            donorUserId: meta.userId ? parseInt(meta.userId) : (user?.id ?? undefined),
            donorName: meta.anonymous === "true" ? "Anonymous" : (meta.donorName || user?.name || undefined),
            donorEmail: meta.donorEmail || user?.email || undefined,
            amountCents,
            message: meta.message || undefined,
            anonymous: meta.anonymous === "true",
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          });
          return { credited: true, alreadyRecorded: false, amountCents };
        } catch (err: any) {
          console.error("[confirmDonation] Error:", err.message);
          return { credited: false, reason: "error" };
        }
      }),

    /** Get content blocks for a project — public */
    getBlocks: publicProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ input }) => {
        return getProjectBlocks(input.projectId);
      }),

    /** Save content blocks (replace all) — protected, must be owner */
    saveBlocks: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        blocks: z.array(z.object({
          type: z.enum(["text", "image", "video", "divider", "quote"]),
          position: z.number().int(),
          content: z.string().optional(),
          imageUrl: z.string().nullable().optional(),
          imageKey: z.string().nullable().optional(),
          imageCaption: z.string().nullable().optional(),
          imageSize: z.enum(["small", "medium", "large", "full"]).nullable().optional(),
          imageFocalX: z.number().int().min(0).max(100).nullable().optional(),
          imageFocalY: z.number().int().min(0).max(100).nullable().optional(),
          videoUrl: z.string().nullable().optional(),
          videoType: z.enum(["youtube", "vimeo", "s3", "none"]).nullable().optional(),
          videoCaption: z.string().nullable().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await saveProjectBlocks(input.projectId, input.blocks);
        return { ok: true };
      }),

    /** Upload a block image to S3 — protected, must be owner */
    uploadBlockImage: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        fileBase64: z.string(),
        mimeType: z.string(),
        caption: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const buf = Buffer.from(input.fileBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `project-blocks/${ctx.user.id}-${input.projectId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buf, input.mimeType);
        return { url, key };
      }),

    /** Publish a project — sets status to active and generates a WID */
    publish: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (project.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Project is already published" });
        // Generate a WID for this project (same format as song WIDs)
        const widPrefix = "PROJ";
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).slice(2, 8).toUpperCase();
        const wid = `${widPrefix}-${timestamp}-${random}`;
        await updateProject(input.projectId, {
          status: "active",
          linkedWitnessId: wid,
          updatedAt: new Date(),
        });
        // Log a creation event
        await createEvent({
          type: "PROJECT_PUBLISHED",
          workId: input.projectId,
          workType: "project",
          actorId: ctx.user.id,
          actorName: ctx.user.name || undefined,
          payload: { wid, title: project.title },
        });
        return { ok: true, wid };
      }),

    /** List all active public projects — public */
    listPublic: publicProcedure
      .input(z.object({ limit: z.number().int().max(200).default(50) }).optional())
      .query(async ({ input }) => {
        return listActiveProjects();
      }),
    /** Get projects by a specific creator -- public */
    getByCreator: publicProcedure
      .input(z.object({ userId: z.number().int() }))
      .query(async ({ input }) => {
        return getProjectsByCreator(input.userId);
      }),

    /** Follow a project -- protected */
    follow: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (project.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot follow your own project" });
        await followProject(input.projectId, ctx.user.id);
        // Notify the creator that someone followed their project
        void (async () => {
          try {
            const follower = await getUserById(ctx.user.id);
            await createNotification({
              userId: project.userId,
              type: "project_follow",
              title: `${follower?.name ?? "Someone"} is following your project`,
              body: `"${project.title}" just gained a new follower.`,
              actorId: ctx.user.id,
              actorName: follower?.name ?? undefined,
              actorAvatarUrl: follower?.profilePhotoUrl ?? undefined,
              refId: input.projectId,
              refType: "project",
            });
          } catch (e) {
            console.error("[projects.follow] Notification failed:", e);
          }
        })();
        return { ok: true };
      }),

    /** Unfollow a project -- protected */
    unfollow: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await unfollowProject(input.projectId, ctx.user.id);
        return { ok: true };
      }),

    /** Get follow status + follower count for a project -- public */
    getFollowStatus: publicProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const followerCount = await getProjectFollowerCount(input.projectId);
        const isFollowing = ctx.user
          ? await isFollowingProject(input.projectId, ctx.user.id)
          : false;
        return { isFollowing, followerCount };
      }),

    /** Archive a project (owner only) — sets status to 'archived', removes from public listings */
    archive: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your project' });
        await updateProject(input.projectId, { status: 'archived' });
        return { success: true };
      }),

    /** Unpublish a project (owner only) — reverts status from 'active' back to 'draft' */
    unpublish: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your project' });
        await updateProject(input.projectId, { status: 'draft' });
        return { success: true };
      }),

    /** Upload a narration audio file for a project (owner only) */
    uploadNarration: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        fileBase64: z.string(),
        mimeType: z.string(),
        fileName: z.string().max(256).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        const buf = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType.split('/')[1]?.replace('mpeg', 'mp3') || 'mp3';
        const key = `project-narrations/${ctx.user.id}-${input.projectId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buf, input.mimeType);
        await updateProject(input.projectId, { narrationUrl: url, narrationKey: key });
        return { url, key };
      }),

    /** Upload a video file directly to S3 for a project (owner only) */
    uploadVideo: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        const buf = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType.split('/')[1] || 'mp4';
        const key = `project-videos/${ctx.user.id}-${input.projectId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buf, input.mimeType);
        await updateProject(input.projectId, { videoUrl: url, videoType: 's3' });
        return { url, key };
      }),

    /** Get all songs linked to a project */
    getSongs: publicProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ input }) => {
        return getProjectSongs(input.projectId);
      }),

    /** Add a song to a project (owner only) */
    addSong: protectedProcedure
      .input(z.object({ projectId: z.number().int(), songId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        await addSongToProject(input.projectId, input.songId);
        return { ok: true };
      }),

    /** Remove a song from a project (owner only) */
    removeSong: protectedProcedure
      .input(z.object({ projectId: z.number().int(), songId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        await removeSongFromProject(input.projectId, input.songId);
        return { ok: true };
      }),

    /** Reorder project songs — accepts ordered array of projectSong row IDs */
    reorderSongs: protectedProcedure
      .input(z.object({ projectId: z.number().int(), orderedIds: z.array(z.number().int()) }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        await reorderProjectSongs(input.projectId, input.orderedIds);
        return { ok: true };
      }),
    /** Get album download permission info (public) */
    getAlbumDownload: publicProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        const perm = (project as any).albumDownloadPermission as string ?? 'none';
        const priceCents = (project as any).albumDownloadPriceCents as number ?? 499;
        let unlocked = perm === 'free';
        if (!unlocked && perm === 'tipped' && ctx.user) {
          const donations = await getProjectDonations(input.projectId);
          const userTotal = donations
            .filter((d) => d.donorUserId === ctx.user!.id)
            .reduce((sum, d) => sum + d.amountCents, 0);
          unlocked = userTotal >= priceCents;
        }
        return { permission: perm, priceCents, unlocked };
      }),
    /** Set album download permission (creator only) */
    setAlbumDownload: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        permission: z.enum(['none', 'free', 'tipped']),
        priceCents: z.number().int().min(50).max(100000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        if (project.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
        await updateProject(input.projectId, {
          albumDownloadPermission: input.permission as any,
          ...(input.priceCents !== undefined ? { albumDownloadPriceCents: input.priceCents } : {}),
        });
        return { ok: true };
      }),
    /** Download all tracks in an album — returns array of {id, title, fileUrl} */
    downloadAlbum: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        const perm = (project as any).albumDownloadPermission as string ?? 'none';
        const priceCents = (project as any).albumDownloadPriceCents as number ?? 499;
        if (perm === 'none') throw new TRPCError({ code: 'FORBIDDEN', message: 'Album downloads are not enabled for this project.' });
        if (perm === 'tipped') {
          const donations = await getProjectDonations(input.projectId);
          const userTotal = donations
            .filter((d) => d.donorUserId === ctx.user.id)
            .reduce((sum, d) => sum + d.amountCents, 0);
          if (userTotal < priceCents) {
            throw new TRPCError({ code: 'FORBIDDEN', message: `Gift \$${(priceCents / 100).toFixed(2)} to unlock the full album download.` });
          }
        }
        const tracks = await getProjectSongs(input.projectId);
        const downloadable = tracks
          .filter((t: typeof tracks[number]) => t.song?.fileUrl && t.song?.status === 'Published')
          .map((t: typeof tracks[number]) => ({ id: t.songId, title: t.song!.title, fileUrl: t.song!.fileUrl! }));
        return { tracks: downloadable };
      }),
    /** Create Stripe checkout to gift-unlock an album download */
    createAlbumDownloadCheckout: publicProcedure
      .input(z.object({ projectId: z.number().int(), origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        const perm = (project as any).albumDownloadPermission as string ?? 'none';
        if (perm !== 'tipped') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This album does not require a gift to download.' });
        const priceCents = (project as any).albumDownloadPriceCents as number ?? 499;
        const creator = await getUserById(project.userId);
        if (!creator?.stripeAccountId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This creator has not enabled payments yet.' });
        const acct = await stripe.accounts.retrieve(creator.stripeAccountId);
        if (!acct.charges_enabled) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Creator payment account is still being verified.' });
        const feeAmount = Math.round(priceCents * PLATFORM_FEE_PERCENT / 100);
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [{ price_data: { currency: 'usd', product_data: { name: `Album Download: "${project.title}"`, description: `Gift-to-download — supporting ${(creator as any).artistHandle || creator.name || 'this creator'} on Living Nexus` }, unit_amount: priceCents }, quantity: 1 }],
          metadata: { type: 'album_download', projectId: input.projectId.toString(), userId: ctx.user?.id?.toString() || '', donorName: ctx.user?.name || '' },
          payment_intent_data: { application_fee_amount: feeAmount, transfer_data: { destination: creator.stripeAccountId } },
          success_url: `${input.origin}/project/${project.slug}?album_download=unlocked`,
          cancel_url: `${input.origin}/project/${project.slug}`,
          allow_promotion_codes: false,
        });
        return { url: session.url };
      }),
  });
