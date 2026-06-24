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

export const tipsRouter = router({
    list: publicProcedure.input(z.object({ songId: z.number() })).query(async ({ input }) => getTipsBySong(input.songId)),
    connectOnboarding: protectedProcedure.input(z.object({ returnUrl: z.string().url() })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      let accountId = user.stripeAccountId;
      if (!accountId) {
        // Build the creator's public profile URL for Stripe business_profile.url
        const origin = input.returnUrl.replace(/\/dashboard.*$/, "");
        const profileUrl = (user.website && user.website.startsWith("http"))
          ? user.website
          : `${origin}/creator/${ctx.user.id}`;
        const account = await stripe.accounts.create({
          controller: {
            stripe_dashboard: { type: "full" },
            losses: { payments: "stripe" },
            requirement_collection: "stripe",
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "individual",
          business_profile: {
            url: profileUrl,
            mcc: "7929", // Bands, Orchestras, Actors, and Other Entertainers
          },
          email: user.email || undefined,
          metadata: { userId: ctx.user.id.toString(), artistHandle: user.artistHandle || "" },
        });
        accountId = account.id;
        await updateUserStripeAccount(ctx.user.id, { stripeAccountId: accountId, stripeAccountStatus: "pending" });
      }
      const accountLink = await stripe.accountLinks.create({ account: accountId, refresh_url: input.returnUrl, return_url: input.returnUrl, type: "account_onboarding" });
      return { url: accountLink.url };
    }),
    connectStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user?.stripeAccountId) return { status: "not_connected", accountId: null, requirementsDue: [] as string[], requirementsLabels: [] as string[] };
      try {
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        const status = account.charges_enabled ? "enabled" : account.details_submitted ? "restricted" : "pending";
        await updateUserStripeAccount(ctx.user.id, { stripeAccountStatus: status as any });
        // Translate Stripe requirement keys into plain English for the dashboard
        const requirementsDue: string[] = [
          ...(account.requirements?.currently_due ?? []),
          ...(account.requirements?.past_due ?? []),
        ];
        const STRIPE_REQUIREMENT_LABELS: Record<string, string> = {
          "individual.first_name": "Your first name",
          "individual.last_name": "Your last name",
          "individual.dob.day": "Your date of birth",
          "individual.dob.month": "Your date of birth",
          "individual.dob.year": "Your date of birth",
          "individual.ssn_last_4": "Last 4 digits of your SSN",
          "individual.id_number": "Your full SSN or Tax ID",
          "individual.address.line1": "Your street address",
          "individual.address.city": "Your city",
          "individual.address.state": "Your state",
          "individual.address.postal_code": "Your ZIP code",
          "individual.email": "Your email address",
          "individual.phone": "Your phone number",
          "individual.verification.document": "A government-issued photo ID (passport or driver's license)",
          "individual.verification.additional_document": "A secondary ID document",
          "external_account": "Your bank account (routing + account number)",
          "business_profile.url": "Your website or profile URL",
          "business_profile.mcc": "Your business category",
          "tos_acceptance.date": "Accept Stripe's Terms of Service",
          "tos_acceptance.ip": "Accept Stripe's Terms of Service",
        };
        const seen = new Set<string>();
        const requirementsLabels = requirementsDue
          .map((key) => {
            // Normalize dob sub-fields to a single label
            const normalized = key.replace(/\.day$|\.month$|\.year$/, ".dob");
            const label = STRIPE_REQUIREMENT_LABELS[key] ?? STRIPE_REQUIREMENT_LABELS[normalized] ?? key.replace(/_/g, " ").replace(/\./g, " → ");
            if (seen.has(label)) return null;
            seen.add(label);
            return label;
          })
          .filter((l): l is string => l !== null);
        return { status, accountId: user.stripeAccountId, chargesEnabled: account.charges_enabled, requirementsDue, requirementsLabels };
      } catch { return { status: "error", accountId: user.stripeAccountId, requirementsDue: [] as string[], requirementsLabels: [] as string[] }; }
    }),
    recentTips: publicProcedure.query(async () => {
      const rows = await getRecentTips(20);
      return rows.map((r: any) => ({
        id: r.id,
        amountCents: r.amountCents,
        songTitle: r.songTitle,
        fanName: r.fanName || "A fan",
        creatorName: r.creatorHandle || r.creatorName || "a creator",
        createdAt: r.createdAt,
      }));
    }),
    /** Tip-to-Download: create a Stripe checkout that, on success, unlocks the download */
    createTipDownloadCheckout: publicProcedure.input(z.object({ songId: z.number(), origin: z.string().url() })).mutation(async ({ ctx, input }) => {
      const songData = await getSongWithCreator(input.songId);
      if (!songData) throw new Error("Song not found");
      const { song, creator } = songData;
      if (!creator?.stripeAccountId) throw new Error("This creator has not enabled tips yet. Ask them to connect Stripe in their Dashboard.");
      // Verify the connected account is ready to receive transfers
      try {
        const acct = await stripe.accounts.retrieve(creator.stripeAccountId);
        if (!acct.charges_enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "This creator's Stripe account is still being verified. Tips will be available once their onboarding is complete." });
      } catch (e: any) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: "BAD_REQUEST", message: "This creator's payment account is not yet active. Please try again later." });
      }
      const thresholdCents = (song as any).downloadTipThresholdCents ?? 179;
      const feeAmount = Math.round(thresholdCents * PLATFORM_FEE_PERCENT / 100);
      const session = await stripe.checkout.sessions.create({
        mode: "payment", payment_method_types: ["card"],
        line_items: [{ price_data: { currency: "usd", product_data: { name: `Download: "${song.title}"`, description: `Tip-to-download — supporting ${creator.artistHandle || creator.name || "this creator"} on Living Nexus` }, unit_amount: thresholdCents }, quantity: 1 }],
        metadata: { type: "tip_download", songId: input.songId.toString(), userId: ctx.user?.id?.toString() || "", tipperName: ctx.user?.name || "" },
        payment_intent_data: { application_fee_amount: feeAmount, transfer_data: { destination: creator.stripeAccountId } },
        success_url: `${input.origin}/song/${input.songId}?download=unlocked`,
        cancel_url: `${input.origin}/song/${input.songId}`,
        allow_promotion_codes: false,
      });
      return { url: session.url };
    }),

    /** Creator-level tip: gift directly to a creator without tying to a specific song */
    createCreatorTipCheckout: publicProcedure.input(z.object({ creatorId: z.number().int().positive(), amountCents: z.number().min(100).max(50000), origin: z.string().url() })).mutation(async ({ ctx, input }) => {
      const creator = await getUserById(input.creatorId);
      if (!creator) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
      if (!creator.stripeAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "This creator has not enabled gifts yet." });
      try {
        const acct = await stripe.accounts.retrieve(creator.stripeAccountId);
        if (!acct.charges_enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "This creator's Stripe account is still being verified. Gifts will be available once their onboarding is complete." });
      } catch (e: any) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: "BAD_REQUEST", message: "This creator's payment account is not yet active. Please try again later." });
      }
      const feeAmount = Math.round(input.amountCents * PLATFORM_FEE_PERCENT / 100);
      const creatorHandle = creator.artistHandle || creator.name || "this creator";
      const session = await stripe.checkout.sessions.create({
        mode: "payment", payment_method_types: ["card"],
        line_items: [{ price_data: { currency: "usd", product_data: { name: `Gift for ${creatorHandle}`, description: `Supporting ${creatorHandle} on Living Nexus` }, unit_amount: input.amountCents }, quantity: 1 }],
        metadata: { type: "tip", songId: "0", userId: ctx.user?.id?.toString() || "", tipperName: ctx.user?.name || "", creatorId: input.creatorId.toString() },
        payment_intent_data: { application_fee_amount: feeAmount, transfer_data: { destination: creator.stripeAccountId } },
        success_url: `${input.origin}/creator/${input.creatorId}?tip=success`,
        cancel_url: `${input.origin}/creator/${input.creatorId}`,
        allow_promotion_codes: false,
      });
      return { url: session.url };
    }),
    createTipCheckout: publicProcedure.input(z.object({ songId: z.number(), amountCents: z.number().min(100).max(50000), origin: z.string().url() })).mutation(async ({ ctx, input }) => {
      const songData = await getSongWithCreator(input.songId);
      if (!songData) throw new Error("Song not found");
      const { song, creator } = songData;
      if (!creator?.stripeAccountId) throw new Error("This creator has not enabled tips yet.");
      // Verify the connected account is ready to receive transfers
      try {
        const acct = await stripe.accounts.retrieve(creator.stripeAccountId);
        if (!acct.charges_enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "This creator's Stripe account is still being verified. Tips will be available once their onboarding is complete." });
      } catch (e: any) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: "BAD_REQUEST", message: "This creator's payment account is not yet active. Please try again later." });
      }
      const feeAmount = Math.round(input.amountCents * PLATFORM_FEE_PERCENT / 100);
      const session = await stripe.checkout.sessions.create({
        mode: "payment", payment_method_types: ["card"],
        line_items: [{ price_data: { currency: "usd", product_data: { name: `Tip for "${song.title}"`, description: `Supporting ${creator.artistHandle || creator.name || "this creator"} on Living Nexus` }, unit_amount: input.amountCents }, quantity: 1 }],
        metadata: { type: "tip", songId: input.songId.toString(), userId: ctx.user?.id?.toString() || "", tipperName: ctx.user?.name || "" },
        payment_intent_data: { application_fee_amount: feeAmount, transfer_data: { destination: creator.stripeAccountId } },
        success_url: `${input.origin}/song/${input.songId}?tip=success`,
        cancel_url: `${input.origin}/song/${input.songId}`,
        allow_promotion_codes: false,
      });
      return { url: session.url };
    }),
  });


