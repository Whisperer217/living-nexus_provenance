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

export const guidesRouter = router({
    /** Create a new guide draft (Step 1 — after files uploaded). */
    create: protectedProcedure
      .input(z.object({
        canonicalName: z.string().min(1).max(256).optional(),
        provenanceSheetUrl: z.string().url().optional(),
        artworkUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createGuide({
          creatorId: ctx.user.id,
          canonicalName: input.canonicalName ?? "Untitled Guide",
          provenanceSheetUrl: input.provenanceSheetUrl,
          artworkUrl: input.artworkUrl,
          canonicalStatus: "draft",
          revenueCreatorPct: 90,
        });
      }),

    /** AI extraction from provenance sheet (Step 2). Uses Gemini to parse the uploaded file. */
    extractFromSheet: protectedProcedure
      .input(z.object({
        guideId: z.number(),
        fileUrl: z.string().url(),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const guide = await getGuideById(input.guideId);
        if (!guide || guide.creatorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Guide not found or access denied" });
        }
        // Use Gemini to extract structured data from the provenance sheet
        const extractionPrompt = `You are an AI extraction engine for Living Nexus, a provenance-first creative platform.
Analyze this provenance sheet / artwork document and extract the following structured information about the guide character.
Return ONLY valid JSON matching this exact schema:
{
  "canonicalName": string,
  "tagline": string,
  "archetypeType": string,
  "role": string,
  "alignment": string,
  "domain": string,
  "testimony": string,
  "loreDescription": string,
  "firstManifested": string,
  "symbols": [{"name": string, "label": string}],
}
If a field cannot be determined from the document, use an empty string. For symbols, extract any iconographic symbols, emblems, or sacred objects mentioned or visible.`;

        let extracted: Record<string, unknown> = {};
        try {
          const response = await invokeLLM({
            messages: [
              { role: "user", content: [
                { type: "text", text: extractionPrompt },
                { type: "image_url", image_url: { url: input.fileUrl, detail: "high" } },
              ]},
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "guide_extraction",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    canonicalName: { type: "string" },
                    tagline: { type: "string" },
                    archetypeType: { type: "string" },
                    role: { type: "string" },
                    alignment: { type: "string" },
                    domain: { type: "string" },
                    testimony: { type: "string" },
                    loreDescription: { type: "string" },
                    firstManifested: { type: "string" },
                    symbols: { type: "array", items: { type: "object", properties: { name: { type: "string" }, label: { type: "string" } }, required: ["name", "label"], additionalProperties: false } },
                  },
                  required: ["canonicalName", "tagline", "archetypeType", "role", "alignment", "domain", "testimony", "loreDescription", "firstManifested", "symbols"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = response?.choices?.[0]?.message?.content;
          if (content) extracted = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        } catch (err) {
          console.error("[guides.extractFromSheet] LLM extraction failed:", err);
          // Return partial data — don't fail the whole step
        }

        // Update the guide with extracted data
        const updated = await updateGuide(input.guideId, ctx.user.id, {
          canonicalName: (extracted.canonicalName as string) || guide.canonicalName,
          tagline: (extracted.tagline as string) || undefined,
          archetypeType: (extracted.archetypeType as string) || undefined,
          role: (extracted.role as string) || undefined,
          alignment: (extracted.alignment as string) || undefined,
          domain: (extracted.domain as string) || undefined,
          testimony: (extracted.testimony as string) || undefined,
          loreDescription: (extracted.loreDescription as string) || undefined,
          firstManifested: (extracted.firstManifested as string) || undefined,
          symbolsJson: extracted.symbols || [],
          widCode: (() => {
            const name = (extracted.canonicalName as string) || guide.canonicalName || "";
            if (!name) return undefined;
            const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16);
            return `LN-GUIDE-${slug}-${String(input.guideId).padStart(4, "0")}`;
          })(),
          canonicalStatus: "review",
        });
        return { guide: updated, extracted };
      }),

    /** Update guide fields (Step 3 — Review & Confirm). */
    update: protectedProcedure
      .input(z.object({
        guideId: z.number(),
        canonicalName: z.string().min(1).max(256).optional(),
        tagline: z.string().max(512).optional(),
        archetypeType: z.string().max(128).optional(),
        role: z.string().max(256).optional(),
        alignment: z.string().max(512).optional(),
        domain: z.string().max(512).optional(),
        testimony: z.string().optional(),
        loreDescription: z.string().optional(),
        firstManifested: z.string().max(128).optional(),
        provenanceSheetUrl: z.string().url().optional(),
        artworkUrl: z.string().url().optional(),
        extractedImagesJson: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        symbolsJson: z.array(z.object({ name: z.string(), label: z.string(), iconUrl: z.string().optional() })).optional(),
        widCode: z.string().max(64).optional(),
        rightsJson: z.record(z.string(), z.unknown()).optional(),
        revenueCreatorPct: z.number().min(0).max(100).optional(),
        derivativePermissionsJson: z.record(z.string(), z.unknown()).optional(),
        stripeConnectId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { guideId, ...data } = input;
        const updated = await updateGuide(guideId, ctx.user.id, data as Parameters<typeof updateGuide>[2]);
        if (!updated) throw new TRPCError({ code: "FORBIDDEN", message: "Guide not found or access denied" });
        return updated;
      }),

    /** Publish the guide (Step 6). Generates canonical WID and sets status to published. */
    publish: protectedProcedure
      .input(z.object({ guideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const guide = await getGuideById(input.guideId);
        if (!guide || guide.creatorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Guide not found or access denied" });
        }
        if (!guide.canonicalName) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Guide must have a canonical name before publishing" });
        }
        const published = await publishGuide(input.guideId, ctx.user.id);
        if (!published) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to publish guide" });
        return published;
      }),

    /** Get a guide by ID (owner only for drafts, public for published). */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const guide = await getGuideById(input.id);
        if (!guide) throw new TRPCError({ code: "NOT_FOUND" });
        if (guide.canonicalStatus !== "published" && guide.creatorId !== ctx.user?.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return guide;
      }),

    /** Get a guide by WID code (public, published only). */
    getByWid: publicProcedure
      .input(z.object({ widCode: z.string() }))
      .query(async ({ input }) => {
        const guide = await getGuideByWid(input.widCode);
        if (!guide || guide.canonicalStatus !== "published") throw new TRPCError({ code: "NOT_FOUND" });
        return guide;
      }),

    /** List guides for the current creator (all statuses). */
    listMine: protectedProcedure
      .query(async ({ ctx }) => getGuidesByCreator(ctx.user.id)),

    /** List all published guides (public). */
    listPublished: publicProcedure
      .input(z.object({ limit: z.number().max(100).optional() }))
      .query(async ({ input }) => getPublishedGuides(input.limit ?? 20)),

    /** Delete a guide draft (owner only, not published). */
    delete: protectedProcedure
      .input(z.object({ guideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const guide = await getGuideById(input.guideId);
        if (!guide || guide.creatorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (guide.canonicalStatus === "published") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete a published guide" });
        }
        return deleteGuide(input.guideId, ctx.user.id);
      }),

    /** Tip/gift a guide creator via Stripe Checkout. */
    createTip: protectedProcedure
      .input(z.object({
        guideId: z.number().int().positive(),
        amountCents: z.number().min(100).max(50000),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const guide = await getGuideById(input.guideId);
        if (!guide || guide.canonicalStatus !== "published") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Guide not found" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [creator] = await db.select({
          stripeAccountId: users.stripeAccountId,
          name: users.name,
          artistHandle: users.artistHandle,
        }).from(users).where(eq(users.id, guide.creatorId)).limit(1);
        if (!creator?.stripeAccountId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This creator has not enabled tips yet." });
        }
        try {
          const acct = await stripe.accounts.retrieve(creator.stripeAccountId);
          if (!acct.charges_enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "This creator's Stripe account is still being verified." });
        } catch (e: any) {
          if (e instanceof TRPCError) throw e;
          throw new TRPCError({ code: "BAD_REQUEST", message: "This creator's payment account is not yet active." });
        }
        const feeAmount = Math.round(input.amountCents * PLATFORM_FEE_PERCENT / 100);
        const creatorHandle = creator.artistHandle || creator.name || "this creator";
        const session = await stripe.checkout.sessions.create({
          mode: "payment", payment_method_types: ["card"],
          line_items: [{ price_data: { currency: "usd", product_data: { name: `Gift for "${guide.canonicalName}" by ${creatorHandle}`, description: `Supporting ${creatorHandle} on Living Nexus` }, unit_amount: input.amountCents }, quantity: 1 }],
          metadata: { type: "tip", songId: "0", userId: ctx.user.id.toString(), tipperName: ctx.user.name || "", creatorId: guide.creatorId.toString() },
          payment_intent_data: { application_fee_amount: feeAmount, transfer_data: { destination: creator.stripeAccountId } },
          success_url: `${input.origin}/guide/${guide.id}?tip=success`,
          cancel_url: `${input.origin}/guide/${guide.id}`,
        });
        return { url: session.url };
      }),

    /**
     * Generate an image from a text prompt using the platform image generation service.
     * Returns the CDN URL of the generated image.
     * Optionally scoped to a guide's identity for style context.
     */
     generateImage: protectedProcedure
       .input(z.object({
         prompt: z.string().min(1).max(3000),
         guideId: z.number().optional(),
         styleContext: z.string().max(500).optional(),
         // Legacy single URL kept for backwards compat
         referenceImageUrl: z.string().url().optional(),
         // New: up to 4 reference images for merging
         referenceImageUrls: z.array(z.string().url()).max(4).optional(),
       }))
       .mutation(async ({ ctx, input }) => {
         let enrichedPrompt = input.prompt;
         if (input.guideId) {
           const guide = await getGuideById(input.guideId);
           if (!guide || guide.creatorId !== ctx.user.id) {
             throw new TRPCError({ code: 'FORBIDDEN', message: 'Guide not found or access denied' });
           }
           const identityContext = [
             guide.canonicalName && `Character: ${guide.canonicalName}`,
             guide.archetypeType && `Archetype: ${guide.archetypeType}`,
             guide.domain && `Domain: ${guide.domain}`,
             input.styleContext,
           ].filter(Boolean).join('. ');
           if (identityContext) enrichedPrompt = `${identityContext}. ${input.prompt}`;
         }

         const { generateImage } = await import('../_core/imageGeneration');
         // Merge referenceImageUrls array + legacy single URL into originalImages
         const allRefUrls: string[] = [
           ...(input.referenceImageUrls ?? []),
           ...(input.referenceImageUrl && !(input.referenceImageUrls ?? []).includes(input.referenceImageUrl)
             ? [input.referenceImageUrl]
             : []),
         ];
         const originalImages = allRefUrls.map(url => ({ url, mimeType: 'image/jpeg' }));
         const result = await generateImage({ prompt: enrichedPrompt, originalImages });

         // Auto-generate WID-VIS from hash of url + enrichedPrompt + timestamp + userId
         const crypto = await import('crypto');
         const generatedAt = new Date().toISOString();
         const hashInput = `${result.url ?? ''}|${enrichedPrompt}|${generatedAt}|${ctx.user.id}`;
         const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
         const widId = `WID-VIS-${hash.slice(0, 8).toUpperCase()}-${hash.slice(8, 16).toUpperCase()}`;

         // Primary reference URL for display (first in array or legacy single)
         const primaryRefUrl = allRefUrls[0] ?? null;

         return {
           url: result.url,
           prompt: input.prompt,
           enrichedPrompt,
           generatedAt,
           creatorId: ctx.user.id,
           guideId: input.guideId ?? null,
           widId,
           referenceImageUrl: primaryRefUrl,
           referenceImageUrls: allRefUrls,
           isRemix: false,
         };
       }),

     /**
      * Remix an existing generated image: pass it as a reference image and apply a new/modified prompt.
      * Enables visual consistency — the model uses the source image as a style/content anchor.
      */
     remixImage: protectedProcedure
       .input(z.object({
         sourceImageUrl: z.string().url(),
         prompt: z.string().min(1).max(3000),
         guideId: z.number().optional(),
         styleContext: z.string().max(500).optional(),
       }))
       .mutation(async ({ ctx, input }) => {
         let enrichedPrompt = input.prompt;
         if (input.guideId) {
           const guide = await getGuideById(input.guideId);
           if (!guide || guide.creatorId !== ctx.user.id) {
             throw new TRPCError({ code: 'FORBIDDEN', message: 'Guide not found or access denied' });
           }
           const identityContext = [
             guide.canonicalName && `Character: ${guide.canonicalName}`,
             guide.archetypeType && `Archetype: ${guide.archetypeType}`,
             guide.domain && `Domain: ${guide.domain}`,
             input.styleContext,
           ].filter(Boolean).join('. ');
           if (identityContext) enrichedPrompt = `${identityContext}. ${input.prompt}`;
         }

         const { generateImage } = await import('../_core/imageGeneration');
         const result = await generateImage({
           prompt: enrichedPrompt,
           originalImages: [{ url: input.sourceImageUrl, mimeType: 'image/jpeg' }],
         });

         const crypto = await import('crypto');
         const generatedAt = new Date().toISOString();
         const hashInput = `${result.url ?? ''}|${enrichedPrompt}|${generatedAt}|${ctx.user.id}`;
         const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
         const widId = `WID-VIS-${hash.slice(0, 8).toUpperCase()}-${hash.slice(8, 16).toUpperCase()}`;

         return {
           url: result.url,
           prompt: input.prompt,
           enrichedPrompt,
           generatedAt,
           creatorId: ctx.user.id,
           guideId: input.guideId ?? null,
           widId,
           referenceImageUrl: input.sourceImageUrl,
           isRemix: true,
         };
       }),

     /**
      * Upload a reference image to S3 for use as a consistency anchor in image generation.
      * Returns the CDN URL to pass as referenceImageUrl to generateImage or remixImage.
      */
     uploadReferenceImage: protectedProcedure
       .input(z.object({
         base64: z.string().min(1),
         mimeType: z.string().default('image/jpeg'),
       }))
       .mutation(async ({ ctx, input }) => {
         const buffer = Buffer.from(input.base64, 'base64');
         const ext = input.mimeType.includes('png') ? 'png' : input.mimeType.includes('webp') ? 'webp' : 'jpg';
         const key = `references/${ctx.user.id}/${Date.now()}-ref.${ext}`;
         const { url } = await storagePut(key, buffer, input.mimeType);
         return { url, key };
              }),
    });


