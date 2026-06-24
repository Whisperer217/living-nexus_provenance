import Stripe from "stripe";
import { z } from "zod";
import { generateShareArtifact } from "./services/shareArtifactService";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { normalizationRouter } from "./routers/normalization";
import { qrRouter } from "./routers/qr";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { micronize } from "./imageProcessing";
import { invokeLLM } from "./_core/llm";
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
} from "./db";
import { FOUNDER_PRICE_EARLY_CENTS, FOUNDER_PRICE_LATE_CENTS, FOUNDER_THRESHOLD, LICENSE_PRICE_CENTS, LICENSE_SLOTS, SLOT_PACKAGES, getSlotPackage, type SlotPackageId } from "./livingArchiveProducts";
import { ENV } from "./_core/env";
import { getOrGenerateEmbedVideo } from "./embedVideo";
import { enqueueVisualJob } from "./visualQueue";
import { notifyOwner } from "./_core/notification";

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

export async function handleStripeWebhook(req: any, res: any) {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected");
    return res.json({ verified: true });
  }
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};
        if (meta.type === "tip" && meta.songId && meta.userId) {
          await recordTip({ songId: parseInt(meta.songId), tipperUserId: parseInt(meta.userId), amountCents: pi.amount, stripePaymentIntentId: pi.id });
        } else if (meta.type === "license" && meta.userId) {
          await recordLicense({ userId: parseInt(meta.userId), stripePaymentIntentId: pi.id, amountCents: pi.amount, slotsGranted: 100 });
        } else if (meta.type === "slots" && meta.userId && meta.slots) {
          await recordSlotPurchase({ userId: parseInt(meta.userId), stripePaymentIntentId: pi.id, slotsPurchased: parseInt(meta.slots), amountCents: pi.amount });
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        // Song-page tip: record tip via webhook (reliable path)
        if (meta.type === "tip" && meta.songId) {
          const amountCents = session.amount_total ?? 0;
          const tipperUserId = meta.userId ? parseInt(meta.userId) : undefined;
          const songId = parseInt(meta.songId);
          // Events is the primary write target
          await createEvent({
            type: "TIP",
            workId: songId,
            workType: "song",
            actorId: tipperUserId,
            actorName: meta.tipperName || undefined,
            payload: {
              amountCents,
              message: meta.message || undefined,
              stripeSessionId: session.id,
              legacyType: "tip",
            },
          });
          // Secondary write: tips table for finance reconciliation
          await recordTip({
            songId,
            tipperUserId,
            amountCents,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          });
          // Living Pulse: notify the song owner
          const song = await getSongById(songId);
          if (song?.userId) {
            const amountDollars = (amountCents / 100).toFixed(2);
            const tipperName = meta.tipperName || meta.customer_name || "A supporter";
            await createNotification({
              userId: song.userId,
              type: "tip",
              title: `Gift received — $${amountDollars}`,
              body: `${tipperName} gifted $${amountDollars} on "${song.title}"${meta.message ? `: "${meta.message}"` : ""}`,
              actorName: tipperName,
              refType: "song",
              refId: songId,
            });
            // Discord webhook — non-blocking
            void (async () => {
              try {
                const { fireUserWebhook } = await import("./discord");
                const creator = await getUserById(song.userId);
                await fireUserWebhook(song.userId, "tip_received", {
                  creatorName: creator?.displayName || creator?.username || "Unknown",
                  amountCents,
                  songTitle: song.title,
                  fanName: tipperName,
                });
              } catch (e) { /* swallow */ }
            })();
          }
        }
        // Tip-to-Download: record as a tip so getUserTipTotalForSong unlocks the download
        if (meta.type === "tip_download" && meta.songId) {
          const amountCents = session.amount_total ?? 0;
          const tipperUserId = meta.userId ? parseInt(meta.userId) : undefined;
          const songId = parseInt(meta.songId);
          // Events is the primary write target
          await createEvent({
            type: "TIP",
            workId: songId,
            workType: "song",
            actorId: tipperUserId,
            actorName: meta.tipperName || undefined,
            payload: {
              amountCents,
              stripeSessionId: session.id,
              legacyType: "tip_download",
            },
          });
          // Secondary write: tips table for finance reconciliation
          await recordTip({
            songId,
            tipperUserId,
            amountCents,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          });
        }
        // Project donation: record in projectDonations table and update totals
        if (meta.type === "project_donation" && meta.projectId) {
          const amountCents = session.amount_total ?? 0;
          await recordProjectDonation({
            projectId: parseInt(meta.projectId),
            donorUserId: meta.userId ? parseInt(meta.userId) : undefined,
            donorName: meta.anonymous === "true" ? "Anonymous" : (meta.donorName || undefined),
            donorEmail: meta.donorEmail || undefined,
            amountCents,
            message: meta.message || undefined,
            anonymous: meta.anonymous === "true",
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          });
          // Log PROJECT_FUNDED activity event for the project creator's feed
          await createEvent({
            type: "PROJECT_FUNDED",
            workId: parseInt(meta.projectId),
            workType: "project",
            actorId: meta.userId ? parseInt(meta.userId) : undefined,
            actorName: meta.anonymous === "true" ? "Anonymous" : (meta.donorName || "A supporter"),
            payload: {
              amountCents,
              message: meta.message || null,
              anonymous: meta.anonymous === "true",
            },
          });
        }
        // Platform gift (Founder's Era): record supporter status
        if (meta.type === "platform_gift" && meta.userId) {
          const amountUsd = (session.amount_total ?? 0) / 100;
          const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;
          await recordPlatformGift(parseInt(meta.userId), amountUsd, paymentIntentId);
        }
        // Founder purchase: auto-grant founder role + generate WID-FDR-*
        if (meta.type === "founder_purchase" && meta.userId) {
          const buyerUserId = parseInt(meta.userId);
          try {
            await grantFounder(buyerUserId);
            const updatedUser = await getUserById(buyerUserId);
            const founderWid = (updatedUser as any)?.founderWid ?? `WID-FDR-${String(buyerUserId).padStart(4, '0')}-${Date.now()}`;
            await createNotification({
              userId: buyerUserId,
              type: "tip",
              title: "You are a Founder of Living Nexus",
              body: `Your Founder WID has been issued: ${founderWid}. Thank you for being one of the First Witnesses.`,
              actorName: "Living Nexus",
              refType: "user",
              refId: buyerUserId,
            });
            const buyer = await getUserById(buyerUserId);
            const amountDollars = ((session.amount_total ?? 0) / 100).toFixed(2);
            await notifyOwner({
              title: `New Founder \u2014 $${amountDollars}`,
              content: `${buyer?.name || "A creator"} (${buyer?.email || ""}) became a Founder. WID: ${founderWid}`,
            });
          } catch (e) {
            console.error("[Webhook] founder_purchase grant failed:", e);
          }
        }
        // Album download gift: record as project donation so unlock check passes
        if (meta.type === "album_download" && meta.projectId) {
          const amountCents = session.amount_total ?? 0;
          const donorUserId = meta.userId ? parseInt(meta.userId) : undefined;
          await recordProjectDonation({
            projectId: parseInt(meta.projectId),
            donorUserId,
            donorName: meta.donorName || undefined,
            amountCents,
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          });
          // Notify the creator
          const project = await getProjectById(parseInt(meta.projectId));
          if (project?.userId) {
            const amountDollars = (amountCents / 100).toFixed(2);
            await createNotification({
              userId: project.userId,
              type: "tip",
              title: `Album download unlocked — $${amountDollars}`,
              body: `${meta.donorName || "A fan"} gifted $${amountDollars} to download "${project.title}"`,
              actorName: meta.donorName || undefined,
              refType: "project",
              refId: parseInt(meta.projectId),
            });
          }
        }
        // Activation contribution: increment funding + record contribution row
        if (meta.type === "activation" && meta.songId && meta.stageId) {
          const amountCents = session.amount_total ?? 0;
          const songId = parseInt(meta.songId);
          const contributorUserId = meta.userId ? parseInt(meta.userId) : undefined;
          try {
            await recordActivationContribution({
              songId,
              userId: contributorUserId ?? null,
              stageId: meta.stageId,
              amountCents,
              contributorName: meta.anonymous === '1' ? 'Anonymous' : (meta.contributorName || undefined),
              message: meta.message || undefined,
              anonymous: meta.anonymous === '1',
              stripeSessionId: session.id,
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
            });
            // Notify the song creator
            const song = await getSongById(songId);
            if (song?.userId) {
              const amountDollars = (amountCents / 100).toFixed(2);
              const contributorLabel = meta.anonymous === '1' ? 'An anonymous supporter' : (meta.contributorName || 'A supporter');
              await createNotification({
                userId: song.userId,
                type: 'tip',
                title: `Activation contribution — $${amountDollars}`,
                body: `${contributorLabel} contributed $${amountDollars} toward "${song.title}"`,
                actorName: contributorLabel,
                refType: 'song',
                refId: songId,
              });
              await notifyOwner({
                title: `Activation contribution — $${amountDollars}`,
                content: `${contributorLabel} contributed $${amountDollars} toward "${song.title}" (Stage: ${meta.stageId})`,
              });
            }
          } catch (e) {
            console.error('[Webhook] activation contribution failed:', e);
          }
        }

        // Book purchase: record access grant
        if (meta.type === "book_purchase" && meta.songId && meta.userId) {
          const amountCents = session.amount_total ?? 0;
          const songId = parseInt(meta.songId);
          const buyerUserId = parseInt(meta.userId);
          const db = await getDb();
          const { bookPurchases } = await import("../drizzle/schema");
          // Upsert — idempotent on duplicate webhook delivery
          await db.insert(bookPurchases).values({
            songId,
            buyerUserId,
            amountCents,
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          }).onDuplicateKeyUpdate({ set: { stripeSessionId: session.id } });
          // Notify the book creator
          const song = await getSongById(songId);
          if (song?.userId) {
            const buyer = await getUserById(buyerUserId);
            const amountDollars = (amountCents / 100).toFixed(2);
            await createNotification({
              userId: song.userId,
              type: "tip",
              title: `Book purchased — $${amountDollars}`,
              body: `${buyer?.name || "A reader"} purchased "${song.title}" for $${amountDollars}`,
              actorName: buyer?.name || undefined,
              refType: "song",
              refId: songId,
            });
          }
        }
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const allCreators = await getAllCreators();
        const creator = allCreators.find((c: any) => c.stripeAccountId === account.id);
        if (creator) {
          const status = account.charges_enabled ? "enabled" : account.details_submitted ? "restricted" : "pending";
          await updateUserStripeAccount(creator.id, { stripeAccountStatus: status as any });
        }
        break;
      }
      case "account.application.deauthorized": {
        const account = event.data.object as any;
        const allCreators = await getAllCreators();
        const creator = allCreators.find((c: any) => c.stripeAccountId === account.id);
        if (creator) {
          await updateUserStripeAccount(creator.id, { stripeAccountId: undefined, stripeAccountStatus: "disabled" });
        }
        break;
      }
      // ─── Subscription events (legacy — no subscriptions on this platform) ─────
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.paid":
        // Living Nexus uses one-time payments only. Subscription events are ignored.
        console.log(`[Webhook] Ignoring legacy subscription event: ${event.type}`);
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}

// ── Playback Settings Router ────────────────────────────────────────────────
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
  /** Get all provenance events for a work (public) */
  getTimeline: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => {
      return getWorkEvents(input.songId);
    }),

  /** Get lineage relationships (parents + children) for a work (public) */
  getLineage: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => {
      return getWorkLineage(input.songId);
    }),

  /** Get all witnesses for a work (public) */
  getWitnesses: publicProcedure
    .input(z.object({ songId: z.number() }))
    .query(async ({ input }) => {
      return getWorkWitnesses(input.songId);
    }),

  /** Add a manual provenance event (owner only) */
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

  /** Add a lineage relationship between two works (owner of child work) */
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

  /** Invite a witness to co-sign a work (owner only) */
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

  /** Accept a witness invite via token */
  acceptWitness: protectedProcedure
    .input(z.object({
      token: z.string().min(1),
      testimony: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await acceptWitnessInvite(input.token, ctx.user.id, input.testimony);
    }),
});

// ─── Developer API Key Management ──────────────────────────────────────────
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

export const appRouter = router({
  system: systemRouter,
  qr: qrRouter,
  apiKey: apiKeyRouter,
  playback: playbackRouter,
  provenance: provenanceRouter,
  platform: router({
    /** Public — returns build stats shown on the founder's creator card */
    getBuildStats: publicProcedure.query(() => ({
      bugsFixed: BUGS_FIXED,
      totalCommits: TOTAL_COMMITS,
    })),
  }),

  // ─── Witness Testimony ────────────────────────────────────────────────────────
  testimony: router({
    /** Create an immutable testimony. Generates a WID-TST automatically. */
    create: protectedProcedure
      .input(z.object({
        content: z.string().min(10).max(5000),
        linkedWorks: z.array(z.string()).max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate WID-TST from content hash
        const { createHash } = await import("crypto");
        const hash = createHash("sha256")
          .update(`${ctx.user.id}:${input.content}:${Date.now()}`)
          .digest("hex");
        const wid = `WID-TST-${hash.slice(0, 8).toUpperCase()}-${hash.slice(8, 16).toUpperCase()}`;
        const testimony = await createTestimony({
          wid,
          creatorId: ctx.user.id,
          content: input.content,
          linkedWorks: input.linkedWorks,
        });
        return testimony;
      }),

    /** Get all testimonies for a creator (public). */
    getByCreator: publicProcedure
      .input(z.object({ creatorId: z.number(), limit: z.number().max(100).optional() }))
      .query(async ({ input }) => getTestimoniesByCreator(input.creatorId, input.limit ?? 50)),

    /** Get a single testimony by its WID (public). */
    getByWid: publicProcedure
      .input(z.object({ wid: z.string() }))
      .query(async ({ input }) => getTestimonyByWid(input.wid)),

    /** Get testimony count for a creator (public, for profile stats). */
    count: publicProcedure
      .input(z.object({ creatorId: z.number() }))
      .query(async ({ input }) => getTestimonyCount(input.creatorId)),

    /** Get the current user's own testimonies. */
    mine: protectedProcedure
      .query(async ({ ctx }) => getTestimoniesByCreator(ctx.user.id, 100)),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    /** Check if user has a provenance keypair registered. */
    hasKeypair: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return { hasKey: !!(user?.publicKey) };
    }),
    /** Generate Ed25519 keypair on first use. Returns public key + private key ONCE. */
    generateKeypair: protectedProcedure.mutation(async ({ ctx }) => {
      const { generateKeypair: genKp } = await import("./provenance");
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      if (user.publicKey) return { publicKeyHex: user.publicKey, alreadyExists: true };
      const { privateKeyHex, publicKeyHex } = await genKp();
      await setUserPublicKey(ctx.user.id, publicKeyHex);
      return { publicKeyHex, privateKeyHex, alreadyExists: false };
    }),
  }),

  profile: router({
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
        const { users: usersTable } = await import('../drizzle/schema');
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
      const { getDb } = await import("./db");
      const { users: usersTable } = await import("../drizzle/schema");
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
        const { getDb } = await import("./db");
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(usersTable)
          .set({ lightsMode: input.mode })
          .where(eqOp(usersTable.id, ctx.user.id));
        return { ok: true, mode: input.mode };
      }),
  }),
  songs: router({
    /** Pre-upload duplicate detection — checks if a fileHash already exists in the system. */
    checkDuplicate: protectedProcedure
      .input(z.object({ fileHash: z.string().length(64) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        const { songs } = await import("../drizzle/schema");
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
    discover: publicProcedure.input(z.object({ genre: z.string().optional(), search: z.string().optional(), limit: z.number().max(500).optional(), offset: z.number().optional(), randomize: z.boolean().optional(), seed: z.number().optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic", "written", "game"]).optional() }).optional()).query(async ({ input }) => getPublicSongs(input ?? {})),
    trending: publicProcedure.input(z.object({ genre: z.string().optional(), limit: z.number().max(500).optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic", "written", "game"]).optional() }).optional()).query(async ({ input }) => getTrendingWorks(input ?? {})),
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
    getById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const result = await getSongWithCreator(input.id);
      return result ?? null;
    }),
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
      const { getDb } = await import("./db");
      const { songs: songsTable } = await import("../drizzle/schema");
      const { count, isNotNull, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      // Only count Published, public witnessed songs — respects archive/unpublish toggle
      const [row] = await db.select({ total: count() }).from(songsTable).where(
        andOp(isNotNull(songsTable.witnessId), eqOp(songsTable.status, "Published"), eqOp(songsTable.isPublic, true))
      );
      return { count: row?.total ?? 0 };
    }),
    getCountsByContentType: publicProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { songs: songsTable } = await import("../drizzle/schema");
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
      const { getDb } = await import("./db");
      const { songs: songsTable } = await import("../drizzle/schema");
      const { count, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      const [row] = await db.select({ total: count() }).from(songsTable).where(
        andOp(eqOp(songsTable.userId, input.creatorId), eqOp(songsTable.isPublic, true), eqOp(songsTable.status, "Published"))
      );
      return { count: row?.total ?? 0 };
    }),
    getWitnessedVoices: publicProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { songs: songsTable, users: usersTable } = await import("../drizzle/schema");
      const { isNotNull, desc: descOp, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      // Only return Published, public, audio-type witnessed songs — respects creator archive/unpublish toggle
      const rows = await db
        .select({
          songId: songsTable.id,
          title: songsTable.title,
          witnessId: songsTable.witnessId,
          coverArtUrl: songsTable.coverArtUrl,
          fileUrl: songsTable.fileUrl,
          genre: songsTable.genre,
          createdAt: songsTable.createdAt,
          userId: usersTable.id,
          userName: usersTable.name,
          artistHandle: usersTable.artistHandle,
          profilePhotoUrl: usersTable.profilePhotoUrl,
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
        const { songs: songsTable } = await import("../drizzle/schema");
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
      const insertResult = await createSong({ userId: ctx.user.id, title: input.title, genre: input.genre, bpm: input.bpm, keySignature: input.keySignature, moodTags: input.moodTags, coWriters: input.coWriters, albumName: input.albumName, creditsJson: input.creditsJson, releaseDate: input.releaseDate, isrc: input.isrc, aiConsent: input.aiConsent, ownershipStatus: input.ownershipStatus, lyricsText: input.lyricsText, lyricsHash: input.lyricsHash, isLyricsOnly: input.isLyricsOnly ?? false, contentType: input.contentType ?? (input.isLyricsOnly ? "lyrics" : "audio"), fileUrl, fileKey: audioKey, coverArtUrl, fileHash: input.fileHash, witnessId: input.witnessId, harmonicSignature: input.harmonicSignature, ecdsaPublicKey: input.ecdsaPublicKey, ecdsaSignature: input.ecdsaSignature, caption: input.caption, headlineCaption: input.headlineCaption, description: input.description, galleryImagesJson: input.galleryImagesJson, playerAssetType: input.playerAssetType ?? 'cover', aiToolSuno: input.aiToolSuno ?? false, aiToolUdio: input.aiToolUdio ?? false, aiToolSonato: input.aiToolSonato ?? false, aiToolOther: input.aiToolOther ?? false, aiToolOtherName: input.aiToolOtherName, durationSeconds: input.durationSeconds, sampleRate: input.sampleRate, bitDepth: input.bitDepth, aiDisclosure: input.aiDisclosure, haaiVisualConcept: input.haaiVisualConcept, haaiStyleLanguage: input.haaiStyleLanguage, haaiInstrumentation: input.haaiInstrumentation, haaiVocalConveyance: input.haaiVocalConveyance, haaiLyricalInspiration: input.haaiLyricalInspiration, haaiEmotionalTone: input.haaiEmotionalTone, haaiDeclaredAt, pagesJson: input.pagesJson, displayOrder: nextOrder } as any);
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
          const { fireUserWebhook } = await import("./discord");
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
        const { songs: songsTable } = await import("../drizzle/schema.js");
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
      if (perm === "tipped") {
        // Must have tipped at least the threshold amount
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to download this track." });
        const thresholdCents = (song as any).downloadTipThresholdCents ?? 179;
        const userTipTotal = await getUserTipTotalForSong(ctx.user.id, input.songId);
        if (userTipTotal < thresholdCents) throw new TRPCError({ code: "FORBIDDEN", message: `Tip $${(thresholdCents / 100).toFixed(2)} to unlock this download.` });
      }
      await recordDownload({ songId: input.songId, userId: ctx.user?.id });
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
        const { songs: songsTable, users } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
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
            const { likes } = await import("../drizzle/schema");
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
                const { fireUserWebhook } = await import("./discord");
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
        const { playEvents } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
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
  }),
  comments: router({
    list: publicProcedure.input(z.object({ songId: z.number() })).query(async ({ input }) => getCommentsBySong(input.songId)),
    add: protectedProcedure.input(z.object({ songId: z.number(), content: z.string().min(1).max(1000) })).mutation(async ({ ctx, input }) => {
      // Always use the authenticated user's identity — never fall back to Anonymous
      const actorName = ctx.user.artistHandle || ctx.user.name || "Creator";
      await createEvent({
        type: "COMMENT",
        workId: input.songId,
        workType: "song",
        actorId: ctx.user.id,
        actorName,
        payload: { content: input.content },
      });
      // Secondary write: comments table for legacy queries
      await addComment({ songId: input.songId, userId: ctx.user.id, authorName: actorName, content: input.content });
      // Notify the song owner if commenter is a different user
      const song = await getSongById(input.songId);
      if (song && song.userId && song.userId !== ctx.user.id) {
        await createNotification({
          userId: song.userId,
          type: "comment",
          title: `${actorName} commented on "${song.title}"`,
          body: input.content.slice(0, 120),
          actorId: ctx.user.id,
          actorName,
          actorAvatarUrl: undefined,
          refId: input.songId,
          refType: "song",
        });
      }
      return { success: true };
    }),
    addReply: protectedProcedure
      .input(z.object({
        songId: z.number(),
        parentId: z.number(),
        content: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const actorName = ctx.user.artistHandle || ctx.user.name || "Creator";
        // Insert reply with parentId
        await addComment({
          songId: input.songId,
          userId: ctx.user.id,
          authorName: actorName,
          content: input.content,
          parentId: input.parentId,
        });
        // Notify the song owner if commenter is a different user
        const song = await getSongById(input.songId);
        if (song && song.userId && song.userId !== ctx.user.id) {
          await createNotification({
            userId: song.userId,
            type: "comment",
            title: `${actorName} replied to a comment on "${song.title}"`,
            body: input.content.slice(0, 120),
            actorId: ctx.user.id,
            actorName,
            actorAvatarUrl: undefined,
            refId: input.songId,
            refType: "song",
          });
        }
        return { success: true };
      }),
    report: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        reason: z.enum(["spam", "harassment", "hate_speech", "misinformation", "other"]).default("other"),
        notes: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createCommentReport({
          commentId: input.commentId,
          reporterId: ctx.user.id,
          reason: input.reason,
          notes: input.notes,
        });
      }),
    getFlagged: adminProcedure
      .query(async () => getFlaggedComments()),
    moderate: adminProcedure
      .input(z.object({
        reportId: z.number(),
        action: z.enum(["dismiss", "delete"]),
      }))
      .mutation(async ({ ctx, input }) => {
        return moderateCommentReport(input.reportId, input.action, ctx.user.id);
      }),
  }),

  events: router({
    // Fetch the unified interaction thread for a work (song)
    getByWork: publicProcedure
      .input(z.object({ workId: z.number(), limit: z.number().max(200).optional() }))
      .query(async ({ input }) => getEventsByWork(input.workId, input.limit ?? 100)),
    // Fetch all events across all songs owned by the authenticated creator
    getForCreator: protectedProcedure
      .input(z.object({ limit: z.number().max(500).optional() }))
      .query(async ({ ctx, input }) => getEventsForCreator(ctx.user.id, input.limit ?? 200)),
  }),

  tips: router({
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
  }),

  licenses: router({
    myStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return { licenseStatus: user?.licenseStatus ?? "free", songSlotsUsed: user?.songSlotsUsed ?? 0, songSlotsTotal: user?.songSlotsTotal ?? 1 };
    }),
    purchaseLicense: protectedProcedure.input(z.object({ origin: z.string().url() })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      const session = await stripe.checkout.sessions.create({
        mode: "payment", payment_method_types: ["card"], customer_email: user?.email || undefined,
        line_items: [{ price_data: { currency: "usd", product_data: { name: "Living Nexus Creator License", description: "100 song slots + commercial license + Witness ID provenance — Command Domains LLC / BDDT Publishing" }, unit_amount: 8998 }, quantity: 1 }],
        payment_intent_data: { metadata: { type: "license", userId: ctx.user.id.toString(), customerEmail: user?.email || "", customerName: user?.name || "" } },
        client_reference_id: ctx.user.id.toString(), allow_promotion_codes: true,
        success_url: `${input.origin}/dashboard?license=success`, cancel_url: `${input.origin}/dashboard`,
      });
      return { url: session.url };
    }),
    purchaseSlots: protectedProcedure.input(z.object({ slots: z.number().min(1).max(1000), origin: z.string().url() })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      const amountCents = input.slots * 88;
      const session = await stripe.checkout.sessions.create({
        mode: "payment", payment_method_types: ["card"], customer_email: user?.email || undefined,
        line_items: [{ price_data: { currency: "usd", product_data: { name: `${input.slots} Song Slot${input.slots > 1 ? "s" : ""}`, description: `Add ${input.slots} additional song slot${input.slots > 1 ? "s" : ""} to your Living Nexus account` }, unit_amount: amountCents }, quantity: 1 }],
        payment_intent_data: { metadata: { type: "slots", userId: ctx.user.id.toString(), slots: input.slots.toString() } },
        client_reference_id: ctx.user.id.toString(), allow_promotion_codes: true,
        success_url: `${input.origin}/dashboard?slots=success`, cancel_url: `${input.origin}/dashboard`,
      });
       return { url: session.url };
    }),
  }),

  // ─── Downloads ─────────────────────────────────────────────────────────────
  songDownload: router({
    /** Get download permission info for a song (public — bots and unauthenticated users get permission info too) */
    getPermission: publicProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Song not found" });
        const permission = song.downloadPermission as "none" | "free" | "tipped";
        const thresholdCents = song.downloadTipThresholdCents ?? 179;
        let userTipTotal = 0;
        if (ctx.user && permission === "tipped") {
          userTipTotal = await getUserTipTotalForSong(ctx.user.id, input.songId);
        }
        return {
          permission,
          thresholdCents,
          thresholdDollars: (thresholdCents / 100).toFixed(2),
          userTipTotal,
          canDownload:
            permission === "free" ||
            (permission === "tipped" && ctx.user != null && userTipTotal >= thresholdCents),
        };
      }),

    /** Update download permission for a song (creator only) */
    updatePermission: protectedProcedure
      .input(z.object({
        songId: z.number().int().positive(),
        permission: z.enum(["none", "free", "tipped"]),
        tipThresholdCents: z.number().int().min(50).max(100000).optional().default(179),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Song not found" });
        if (song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });
        await updateSongDownloadPermission(input.songId, ctx.user.id, input.permission, input.tipThresholdCents);
        return { success: true, permission: input.permission };
      }),
  }),

  // ─── Playlist ─────────────────────────────────────────────────────────────
  playlist: router({
    /** Get the current user's playlist with full song + creator info */
    get: protectedProcedure.query(async ({ ctx }) => {
      return getPlaylist(ctx.user.id);
    }),

    /** Add a song to the current user's playlist (idempotent) */
    add: protectedProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return addToPlaylist(ctx.user.id, input.songId);
      }),

    /** Remove a song from the current user's playlist */
    remove: protectedProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await removeFromPlaylist(ctx.user.id, input.songId);
        return { removed: true };
      }),

    /** Check if a specific song is in the current user's playlist */
    check: protectedProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const inPlaylist = await isInPlaylist(ctx.user.id, input.songId);
        return { inPlaylist };
      }),
  }),

  // ── Admin ──────────────────────────────────────────────────────────
  admin: router({
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
        const { songs: songsTable, users: usersTable } = await import("../drizzle/schema.js");
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
        const db = await (await import("./db")).getDb();
        const { sql: sqlFn, eq: eqFn, and: andFn } = await import("drizzle-orm");
        const { songs: songsTable } = await import("../drizzle/schema");
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
      const { getVisualPipelineStats } = await import("./visualQueue");
      return getVisualPipelineStats();
    }),
    /** Get recent visual queue jobs for the admin pipeline view */
    visualQueueJobs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
      .query(async ({ ctx, input }) => {
        const { getRecentQueueJobs } = await import("./visualQueue");
        return getRecentQueueJobs(input.limit);
      }),
    /** Requeue all failed visual jobs */
    requeueFailedVisuals: adminProcedure.mutation(async ({ ctx }) => {
      const { requeueFailedJobs } = await import("./visualQueue");
      const count = await requeueFailedJobs();
      return { requeued: count };
    }),
    /** Enqueue visual job for a specific song (admin override) */
    enqueueVisualForSong: adminProcedure
      .input(z.object({ songId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const { enqueueVisualJob } = await import("./visualQueue");
        // Reset any existing failed job first
        const db = await import("./db").then(m => m.getDb());
        if (db) {
          const { visualQueue } = await import("../drizzle/schema");
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
        const db = await (await import("./db")).getDb();
        const { users: usersTable } = await import("../drizzle/schema");
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
  }),
  // ── Field Notes ────────────────────────────────────────────────────────────
  fieldNotes: router({
    /** Get all field notes for the current user */
    mine: protectedProcedure.query(async ({ ctx }) => getFieldNotesByUser(ctx.user.id)),
    /** Get all public field notes (for the public Field Notes page) */
    public: publicProcedure.input(z.object({ limit: z.number().max(100).default(50) })).query(async ({ input }) => getPublicFieldNotes(input.limit)),
    /** Create a new field note */
    create: protectedProcedure.input(z.object({
      title: z.string().min(1).max(256),
      body: z.string().min(1),
      category: z.enum(["doctrine", "journal", "update", "concept"]).default("journal"),
      isPublic: z.boolean().default(false),
      videoUrl: z.string().url().optional().or(z.literal("")),
      coverImageUrl: z.string().url().optional().or(z.literal("")),
    })).mutation(async ({ ctx, input }) => {
      const id = await createFieldNote({ ...input, userId: ctx.user.id, videoUrl: input.videoUrl || undefined, coverImageUrl: input.coverImageUrl || undefined });
      return { id };
    }),
    /** Update an existing field note (owner only) */
    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      title: z.string().min(1).max(256).optional(),
      body: z.string().min(1).optional(),
      category: z.enum(["doctrine", "journal", "update", "concept"]).optional(),
      isPublic: z.boolean().optional(),
      videoUrl: z.string().url().optional().or(z.literal("")),
      coverImageUrl: z.string().url().optional().or(z.literal("")),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateFieldNote(id, ctx.user.id, { ...data, videoUrl: data.videoUrl || null, coverImageUrl: data.coverImageUrl || null });
      return { ok: true };
    }),
    /** Soft-delete a field note (owner only) */
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteFieldNote(input.id, ctx.user.id);
      return { ok: true };
    }),
  }),

  // ── Onboarding ─────────────────────────────────────────────────────────────
  onboarding: router({
    /** Mark the welcome modal as seen for the current user. */
    markWelcomeSeen: protectedProcedure.mutation(async ({ ctx }) => {
      await markWelcomeSeen(ctx.user.id);
      return { ok: true };
    }),

    /** Record TOS acceptance — sets tosAcceptedAt and tosVersion on the user record. */
    acceptTos: protectedProcedure
      .input(z.object({ version: z.string().max(16).default("2.0") }))
      .mutation(async ({ ctx, input }) => {
        await recordTosAcceptance(ctx.user.id, input.version);
        return { ok: true, acceptedAt: new Date(), version: input.version };
      }),

    /** Export all user data as a JSON-serializable object (GDPR/CCPA Right to Portability). */
    exportData: protectedProcedure.query(async ({ ctx }) => {
      const data = await exportUserData(ctx.user.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "User data not found" });
      return data;
    }),

    /** Submit a data deletion request — sets dataDeletionRequestedAt and notifies the owner. */
    requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
      await requestDataDeletion(ctx.user.id);
      const user = await getUserById(ctx.user.id);
      await notifyOwner({
        title: `Data Deletion Request: ${user?.name ?? user?.email ?? `User #${ctx.user.id}`}`,
        content: `Creator ${user?.name ?? "unknown"} (ID: ${ctx.user.id}, email: ${user?.email ?? "unknown"}) has submitted a data deletion request. Per the Privacy Policy, account data must be deleted within 90 days. Requested at: ${new Date().toISOString()}.`,
      });
      return { ok: true, requestedAt: new Date() };
    }),
    /** Public read of the sovereign migration stage (visible on /privacy page). */
    getSovereignMigrationStatus: publicProcedure.query(async () => {
      const stage = await getPlatformSetting("sovereignMigrationStage");
      const notes = await getPlatformSetting("sovereignMigrationNotes");
      return {
        stage: (stage ?? "hosted") as "hosted" | "migrating" | "sovereign",
        notes: notes ?? null,
      };
    }),
    /** Get the current user's onboarding progress (or null if not started). */
    getProgress: protectedProcedure.query(async ({ ctx }) => {
      return getOnboardingProgress(ctx.user.id);
    }),
    /** Save progress for a specific step. completedSteps is the full array of completed step IDs. */
    saveStep: protectedProcedure
      .input(z.object({
        currentStep: z.enum(['covenant', 'identity', 'domain', 'presence', 'testimony', 'license', 'first_work']),
        completedSteps: z.array(z.string()),
        domainName: z.string().max(128).optional(),
        avatarUrl: z.string().url().optional(),
        bannerUrl: z.string().url().optional(),
        originStatement: z.string().max(1000).optional(),
        testimonyText: z.string().max(3000).optional(),
        testimonyWid: z.string().max(64).optional(),
        firstWorkWid: z.string().max(64).optional(),
        isComplete: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { currentStep, completedSteps, isComplete, ...profileFields } = input;
        const now = new Date();
        // Persist profile fields to the user record
        const profilePatch: Record<string, unknown> = {};
        if (profileFields.domainName) profilePatch.artistHandle = profileFields.domainName;
        if (profileFields.avatarUrl) profilePatch.profilePhotoUrl = profileFields.avatarUrl;
        if (profileFields.bannerUrl) profilePatch.bannerUrl = profileFields.bannerUrl;
        if (profileFields.originStatement) profilePatch.originStatement = profileFields.originStatement;
        if (Object.keys(profilePatch).length > 0) {
          await updateUserProfile(ctx.user.id, profilePatch as any);
        }
        // Build progress patch
        const progressPatch: Record<string, unknown> = {
          currentStep,
          completedSteps: completedSteps as any,
        };
        if (currentStep === 'covenant') progressPatch.covenantAcceptedAt = now;
        if (currentStep === 'domain') progressPatch.domainSavedAt = now;
        if (currentStep === 'presence') progressPatch.presenceSavedAt = now;
        if (profileFields.testimonyWid) progressPatch.testimonyWid = profileFields.testimonyWid;
        if (profileFields.firstWorkWid) progressPatch.firstWorkWid = profileFields.firstWorkWid;
        if (isComplete) progressPatch.completedAt = now;
        return upsertOnboardingProgress(ctx.user.id, progressPatch as any);
      }),
  }),

  // ── Witness Network ────────────────────────────────────────────────────────
  witness: router({
    /** Toggle witnessing a creator — witness if not witnessing, unwitness if already witnessing */
    toggle: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.creatorId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot witness yourself" });
        const already = await isWitnessing(ctx.user.id, input.creatorId);
        if (already) {
          await unwatchCreator(ctx.user.id, input.creatorId);
          return { witnessing: false };
        } else {
          await witnessCreator(ctx.user.id, input.creatorId);
          // Notify the creator being witnessed
          const actor = await getUserById(ctx.user.id);
          await createNotification({
            userId: input.creatorId,
            type: "witness",
            title: `${actor?.artistHandle || actor?.name || "Someone"} is now witnessing you`,
            body: "A new creator has added you to their witness network.",
            actorId: ctx.user.id,
            actorName: actor?.artistHandle || actor?.name || undefined,
            actorAvatarUrl: actor?.profilePhotoUrl || undefined,
            refId: ctx.user.id,
            refType: "user",
          });
          // SSE broadcast
          const { broadcastEvent } = await import("./sse");
          broadcastEvent("witness", { actorName: actor?.artistHandle || actor?.name || "Someone", targetUserId: input.creatorId });
          return { witnessing: true };
        }
      }),
    /** Check if the current user is witnessing a creator */
    status: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const witnessing = await isWitnessing(ctx.user.id, input.creatorId);
        const count = await getWitnessCount(input.creatorId);
        return { witnessing, count };
      }),
    /** Public witness count for a creator (no auth required) */
    count: publicProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const count = await getWitnessCount(input.creatorId);
        return { count };
      }),
    /** Get the current user's witness network (who they witness + who witnesses them) */
    network: protectedProcedure.query(async ({ ctx }) => {
      return getWitnessNetwork(ctx.user.id);
    }),
    /** Get a public creator's witness network (visible to everyone) */
    publicNetwork: publicProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getWitnessNetwork(input.creatorId);
      }),
  }),

  // ── Witness Subscription System ───────────────────────────────────────────
  witnessSubscription: router({
    /** Subscribe to a creator's publication feed at a given tier */
    subscribe: protectedProcedure
      .input(z.object({
        creatorId: z.number().int().positive(),
        tier: z.enum(["witness", "reserve", "steward"]).default("witness"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.creatorId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot subscribe to yourself" });
        const result = await witnessSubscribe(ctx.user.id, input.creatorId, input.tier);
        return { ok: true, tier: result.tier };
      }),
    /** Unsubscribe from a creator's publication feed */
    unsubscribe: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await witnessUnsubscribe(ctx.user.id, input.creatorId);
        return { ok: true };
      }),
    /** Get the current user's subscription to a creator (null if not subscribed) */
    getSubscription: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return getWitnessSubscription(ctx.user.id, input.creatorId);
      }),
    /** Public subscriber count for a creator */
    getCreatorSubscriberCount: publicProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const count = await getSubscriberCount(input.creatorId);
        return { count };
      }),
    /** Get the current user's archive (reserved manifestations) */
    getMyArchive: protectedProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const [items, total] = await Promise.all([
          getWitnessArchive(ctx.user.id, input.limit, input.offset),
          getWitnessArchiveCount(ctx.user.id),
        ]);
        return { items, total };
      }),
  }),

  // ── Image Gallery ──────────────────────────────────────────────────────────
  imageGallery: router({
    /** Public gallery for a creator — only WID-registered images with titles */
    forCreator: publicProcedure
      .input(z.object({
        creatorId: z.number().int().positive(),
        limit: z.number().int().min(1).max(48).default(24),
        offset: z.number().int().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const [items, total] = await Promise.all([
          getCreatorGallery(input.creatorId, input.limit, input.offset),
          getCreatorGalleryCount(input.creatorId),
        ]);
        return { items, total };
      }),
    /** Get the current user's full quiver (private vault) */
    myVault: protectedProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(96).default(48),
        offset: z.number().int().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        return getMyQuiverImages(ctx.user.id, input.limit, input.offset);
      }),
    /** Publish (register as WID) or update title for a quiver image */
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        registeredAsWid: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateQuiverImage(input.id, ctx.user.id, {
          title: input.title,
          registeredAsWid: input.registeredAsWid,
        });
        return { ok: true };
      }),
  }),

  // ── Creative References ────────────────────────────────────────────────────
  reference: router({
    /** Create a reference/citation linking a creator's work to another creator or song */
    create: protectedProcedure
      .input(z.object({
        toUserId: z.number().int().positive().optional(),
        toSongId: z.number().int().positive().optional(),
        context: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!input.toUserId && !input.toSongId) throw new TRPCError({ code: "BAD_REQUEST", message: "Must reference a creator or a song" });
        await createReference(ctx.user.id, input);
        return { ok: true };
      }),
    /** Get all references made to a specific song */
    forSong: publicProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getReferencesForSong(input.songId);
      }),
    /** Get all references made to the current user's work */
    forMe: protectedProcedure.query(async ({ ctx }) => {
      return getReferencesForUser(ctx.user.id);
    }),
  }),

  // ── Collaborative Playlists ────────────────────────────────────────────────
  playlists: router({
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
        const { getDb } = await import("./db");
        const { playlistTracks: pt } = await import("../drizzle/schema");
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
        const { getDb } = await import("./db");
        const { playlistVersions, playlistTracks: pt, songs: songsTable } = await import("../drizzle/schema");
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
        const { getDb } = await import("./db");
        const { playlistVersions, users: usersTable } = await import("../drizzle/schema");
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
    /** Check which of the user's playlists already contain a given song */
    songInPlaylists: protectedProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { getDb: getDb2 } = await import("./db");
        const { playlistTracks: pt2, playlists: pl2 } = await import("../drizzle/schema");
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
  }),
  // ── Notifications ──────────────────────────────────────────────────────────
  notifications: router({
    /** Get the current user's notification inbox */
    list: protectedProcedure
      .input(z.object({ limit: z.number().max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return getNotifications(ctx.user.id, input?.limit ?? 50);
      }),
    /** Get unread count for badge */
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.user.id);
    }),
    /** Mark a single notification as read */
    markRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { ok: true };
      }),
    /** Mark all notifications as read */
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { ok: true };
    }),
    /** Archive a notification (removes from inbox, keeps history) */
    archive: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await archiveNotification(input.id, ctx.user.id);
        return { ok: true };
      }),
    /** Get count of new activity events since last visit (for Activity tab badge) */
    newEventCount: protectedProcedure.query(async ({ ctx }) => {
      return getNewEventCountForCreator(ctx.user.id);
    }),
    /** Mark Activity tab as visited — clears the Activity tab badge */
    touchActivity: protectedProcedure.mutation(async ({ ctx }) => {
      await touchActivityVisit(ctx.user.id);
      return { ok: true };
    }),
    /** Mark Dashboard as visited — resets stat card deltas */
    touchDashboard: protectedProcedure.mutation(async ({ ctx }) => {
      await touchDashboardVisit(ctx.user.id);
      return { ok: true };
    }),
    /** Get dashboard stat card deltas (new plays/tips/comments/witnesses since last visit) */
    dashboardDeltas: protectedProcedure.query(async ({ ctx }) => {
      return getDashboardDeltas(ctx.user.id);
    }),
    /** Reply to a comment signal — posts a comment on the referenced song and notifies the original commenter */
    reply: protectedProcedure
      .input(z.object({
        notificationId: z.number().int().positive(),
        content: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        // Fetch the notification to get the referenced song and original commenter
        const notif = await getNotificationById(input.notificationId, ctx.user.id);
        if (!notif) throw new TRPCError({ code: "NOT_FOUND", message: "Signal not found" });
        if (notif.type !== "comment") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only reply to comment signals" });
        const songId = notif.refId;
        if (!songId) throw new TRPCError({ code: "BAD_REQUEST", message: "Signal has no referenced work" });
        // Fetch the song to confirm it exists and get the title
        const song = await getSongById(songId);
        if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Referenced work not found" });
        const replierName = ctx.user.name || "Creator";
        // Post the reply as a comment on the song
        await createEvent({
          type: "COMMENT",
          workId: songId,
          workType: "song",
          actorId: ctx.user.id,
          actorName: replierName,
          payload: { content: input.content, isReply: true, replyToActorId: notif.actorId },
        });
        await addComment({ songId, userId: ctx.user.id, authorName: replierName, content: input.content });
        // Mark the original notification as read
        await markNotificationRead(input.notificationId, ctx.user.id);
        // Notify the original commenter (if we know who they are and they're not the same user)
        if (notif.actorId && notif.actorId !== ctx.user.id) {
          await createNotification({
            userId: notif.actorId,
            type: "comment",
            title: `${replierName} replied to your comment on "${song.title}"`,
            body: input.content.slice(0, 120),
            actorId: ctx.user.id,
            actorName: replierName,
            refId: songId,
            refType: "song",
          });
        }
        return { ok: true };
      }),
  }),

  // ── Global Activity Feed ──────────────────────────────────────────────────────
  globalActivity: router({
    /** Public activity feed — recent tips, comments, and likes across the platform */
    feed: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(20).default(8) }).optional())
      .query(async ({ input }) => {
        return getGlobalActivityFeed(input?.limit ?? 8);
      }),
  }),
  // ── Witness Registry ─────────────────────────────────────────────────────────
  witnessRegistry: router({
    /** Public ledger of all issued WIDs — paginated, filterable by asset type */
    list: publicProcedure
      .input(z.object({
        type: z.enum(["all", "full_works", "lyrics"]).default("all"),
        cursor: z.number().int().nonnegative().default(0),
        limit: z.number().int().min(1).max(100).default(50),
      }))
      .query(async ({ input }) => {
        const { type, cursor, limit } = input;
        const rows = await getWitnessRegistry({ type, offset: cursor, limit: limit + 1 });
        const hasMore = rows.length > limit;
        return {
          items: hasMore ? rows.slice(0, limit) : rows,
          nextCursor: hasMore ? cursor + limit : null,
        };
      }),
  }),

  // ── Promo Code Redemption (any authenticated user) ────────────────────────────
  promo: router({
    /** Redeem a promo code to activate a Creator License */
    redeem: protectedProcedure
      .input(z.object({ code: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const result = await redeemPromoCode(ctx.user.id, input.code);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
        return result;
      }),
  }),

  // ── Artwork Normalization (admin) ────────────────────────────────────────────
  normalization: normalizationRouter,
  // ── Founder's Era Supporters ─────────────────────────────────────────────────
  supporters: router({
    /** Public Founding Creators list — users with role='founder', public */
    getFoundingCreators: publicProcedure.query(async () => {
      const founders = await listFounders();
      // Attach WID count for each founder
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return founders.map((f: typeof founders[0]) => ({ ...f, widCount: 0 }));
      const { sql: sqlFn, eq: eqFn, and: andFn } = await import("drizzle-orm");
      const { songs: songsTable } = await import("../drizzle/schema");
      const counts = await Promise.all(
        founders.map(async (f: typeof founders[0]) => {
          const rows = await db
            .select({ count: sqlFn<number>`count(*)` })
            .from(songsTable)
            .where(andFn(eqFn(songsTable.userId, f.id), sqlFn`${songsTable.witnessId} IS NOT NULL`, eqFn(songsTable.status, 'Published' as any)));
          return { ...f, widCount: Number(rows[0]?.count ?? 0) };
        })
      );
      return counts;
    }),

    /** Public Supporters Wall — all supporters ordered by totalGifted desc */
    getAll: publicProcedure.query(async () => getAllSupporters()),

    /** Get the current user's supporter status (null if not a supporter) */
    getMyStatus: protectedProcedure.query(async ({ ctx }) => getSupporterByUserId(ctx.user.id)),

    /** Create a Stripe Checkout Session for a platform gift */
    createPlatformGiftCheckout: protectedProcedure
      .input(z.object({
        amountUsd: z.number().min(1).max(10000),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const amountCents = Math.round(input.amountUsd * 100);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: user.email ?? undefined,
          line_items: [{
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: "Living Nexus — Founder's Era Gift",
                description: "Keep the light on. Your name lives here forever.",
              },
            },
            quantity: 1,
          }],
          metadata: {
            type: "platform_gift",
            userId: ctx.user.id.toString(),
            userName: user.name || "",
            amountUsd: input.amountUsd.toString(),
          },
          client_reference_id: ctx.user.id.toString(),
          success_url: `${input.origin}/founders?gift=success`,
          cancel_url: `${input.origin}/founders`,
          allow_promotion_codes: true,
        });
        return { url: session.url };
      }),
  }),

  // ── Books Commerce ───────────────────────────────────────────────────────────────────
  books: router({
    /** Check if the current user has purchased a book */
    hasPurchased: publicProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) return { purchased: false };
        const db = await getDb();
        const { bookPurchases } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const row = await db.select({ id: bookPurchases.id })
          .from(bookPurchases)
          .where(and(eq(bookPurchases.songId, input.songId), eq(bookPurchases.buyerUserId, ctx.user.id)))
          .limit(1);
        return { purchased: row.length > 0 };
      }),
    /** Create a Stripe Checkout session for a book purchase */
    createPurchaseCheckout: protectedProcedure
      .input(z.object({
        songId: z.number().int().positive(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
        const priceCents = (song as any).purchasePriceCents as number | null;
        if (!priceCents || priceCents <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "This book has no purchase price set" });
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: user.email ?? undefined,
          line_items: [{
            price_data: {
              currency: "usd",
              unit_amount: priceCents,
              product_data: {
                name: song.title,
                description: `Full access to "${song.title}" on Living Nexus`,
              },
            },
            quantity: 1,
          }],
          metadata: {
            type: "book_purchase",
            songId: input.songId.toString(),
            userId: ctx.user.id.toString(),
            songTitle: song.title,
          },
          client_reference_id: ctx.user.id.toString(),
          success_url: `${input.origin}/book/${input.songId}?purchase=success`,
          cancel_url: `${input.origin}/book/${input.songId}`,
        });
        return { url: session.url };
      }),
  }),
  // ── External Playlists (Phase 7) ─────────────────────────────────────────────────────
  externalPlaylists: router({
    // Import a playlist from a URL (YouTube or Suno)
    import: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        sourceUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        const { externalPlaylists } = await import("../drizzle/schema");

        // Detect source type from URL
        const sourceType = input.sourceUrl.includes("youtube.com") || input.sourceUrl.includes("youtu.be")
          ? "youtube"
          : input.sourceUrl.includes("suno.com")
          ? "suno"
          : "other";

        // Fetch real metadata from YouTube oEmbed (no API key required)
        // Falls back gracefully if the fetch fails
        let tracksJson: Array<{
          title: string;
          artist: string;
          url: string;
          thumbnailUrl: string | null;
          durationSec: number | null;
        }> = [];

        if (sourceType === "youtube") {
          try {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(input.sourceUrl)}&format=json`;
            const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
            if (resp.ok) {
              const meta = await resp.json() as {
                title?: string;
                author_name?: string;
                thumbnail_url?: string;
              };
              tracksJson = [{
                title: meta.title ?? input.name,
                artist: meta.author_name ?? "YouTube",
                url: input.sourceUrl,
                thumbnailUrl: meta.thumbnail_url ?? null,
                durationSec: null,
              }];
            }
          } catch {
            // oEmbed failed — fall through to placeholder
          }
        }

        // Fallback placeholder if metadata fetch failed or non-YouTube source
        if (tracksJson.length === 0) {
          tracksJson = [{
            title: input.name,
            artist: sourceType === "suno" ? "Suno" : "External",
            url: input.sourceUrl,
            thumbnailUrl: null,
            durationSec: null,
          }];
        }

        const [result] = await db.insert(externalPlaylists).values({
          userId: ctx.user.id,
          name: input.name,
          sourceType,
          sourceUrl: input.sourceUrl,
          tracksJson,
        });

        return { id: result.insertId, name: input.name, sourceType, tracksJson };
      }),

    // List all external playlists for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      const { externalPlaylists } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");

      return db
        .select()
        .from(externalPlaylists)
        .where(eq(externalPlaylists.userId, ctx.user.id))
        .orderBy(desc(externalPlaylists.createdAt));
    }),

    // Delete an external playlist
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        const { externalPlaylists } = await import("../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");

        await db
          .delete(externalPlaylists)
          .where(and(
            eq(externalPlaylists.id, input.id),
            eq(externalPlaylists.userId, ctx.user.id),
          ));
        return { success: true };
      }),
  }),

  // ── Living Archive Subscription ──────────────────────────────────────────
  livingArchive: router({
    /** Get current slot counts + license status for the logged-in user */
    status: protectedProcedure.query(async ({ ctx }) => {
      return getLivingArchiveStatus(ctx.user.id);
    }),

    /** List all available slot packages */
    listPackages: publicProcedure.query(() => {
      return SLOT_PACKAGES;
    }),

    /** Founder Unlimited — one-time purchase. Price: $88.88 before threshold, $288.88 after. */
    purchaseFounder: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const currentFounders = await countFounders();
        const priceCents = currentFounders < FOUNDER_THRESHOLD
          ? FOUNDER_PRICE_EARLY_CENTS
          : FOUNDER_PRICE_LATE_CENTS;
        const priceLabel = currentFounders < FOUNDER_THRESHOLD
          ? `$${(FOUNDER_PRICE_EARLY_CENTS / 100).toFixed(2)}`
          : `$${(FOUNDER_PRICE_LATE_CENTS / 100).toFixed(2)}`;
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: user.email ?? undefined,
          line_items: [{
            price_data: {
              currency: "usd",
              unit_amount: priceCents,
              product_data: {
                name: "Living Nexus — Founder Unlimited Access",
                description: `One-time payment. Unlimited upload slots. Permanent Founder status. ${priceLabel} — no renewals, no monthly fees.`,
              },
            },
            quantity: 1,
          }],
          payment_intent_data: {
            metadata: {
              type: "founder_purchase",
              userId: ctx.user.id.toString(),
              customerEmail: user.email || "",
              customerName: user.name || "",
            },
          },
          client_reference_id: ctx.user.id.toString(),
          success_url: `${input.origin}/founders?founder=success`,
          cancel_url: `${input.origin}/founders`,
          allow_promotion_codes: true,
        });
        return { url: session.url, priceCents, foundersRemaining: Math.max(0, FOUNDER_THRESHOLD - currentFounders) };
      }),

    /** Creator License — one-time $88.88, includes 100 slots */
    purchaseLicenseOneTime: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: user.email ?? undefined,
          line_items: [{
            price_data: {
              currency: "usd",
              unit_amount: LICENSE_PRICE_CENTS,
              product_data: {
                name: "Living Nexus Creator License",
                description: `${LICENSE_SLOTS} upload slots + commercial license + Witness ID provenance — Command Domains LLC / BDDT Publishing. One-time payment, no renewal.`,
              },
            },
            quantity: 1,
          }],
          payment_intent_data: {
            metadata: {
              type: "license",
              userId: ctx.user.id.toString(),
              customerEmail: user.email || "",
              customerName: user.name || "",
            },
          },
          client_reference_id: ctx.user.id.toString(),
          success_url: `${input.origin}/dashboard?license=success`,
          cancel_url: `${input.origin}/dashboard`,
          allow_promotion_codes: true,
        });
        return { url: session.url };
      }),

    /** Slot package purchase — choose from micro (10/30/50) or bulk (100/300/500) */
    purchaseSlotPackage: protectedProcedure
      .input(z.object({
        packageId: z.enum(["micro_10", "micro_30", "micro_50", "bulk_100", "bulk_300", "bulk_500"]),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const pkg = getSlotPackage(input.packageId as SlotPackageId);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: user.email ?? undefined,
          line_items: [{
            price_data: {
              currency: "usd",
              unit_amount: pkg.priceCents,
              product_data: {
                name: `Living Nexus — ${pkg.slots} Upload Slots`,
                description: pkg.description,
              },
            },
            quantity: 1,
          }],
          payment_intent_data: {
            metadata: {
              type: "slots",
              userId: ctx.user.id.toString(),
              slots: pkg.slots.toString(),
              packageId: pkg.id,
            },
          },
          client_reference_id: ctx.user.id.toString(),
          success_url: `${input.origin}/dashboard?slots=success`,
          cancel_url: `${input.origin}/dashboard`,
          allow_promotion_codes: true,
        });
        return { url: session.url };
      }),

    /** Admin: grant Founder Free Tier to a user */
    grantFounderFree: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await grantFounderFreeTier(input.userId);
        await logAdminAction({
          adminId: ctx.user.id,
          action: "GRANT_FOUNDER_FREE",
          targetType: "user",
          targetId: String(input.userId),
          details: { grantedBy: ctx.user.name || String(ctx.user.id) },
        });
        return { success: true, message: "Founder Free Tier granted — 100 slots added" };
      }),
  }),

  // ─── Prompt Studio ────────────────────────────────────────────────────────
  promptStudio: router({
    /** Return the saved EID + expression prompt for any creator (public) */
    getProfileExpression: publicProcedure
      .input(z.object({ creatorId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");
        const [creator] = await db
          .select({
            expressionId: usersTable.expressionId,
            expressionPrompt: usersTable.expressionPrompt,
            expressionStyleTags: usersTable.expressionStyleTags,
            expressionComposerNote: usersTable.expressionComposerNote,
            expressionGeneratedAt: usersTable.expressionGeneratedAt,
            toneFrequencyNote: usersTable.toneFrequencyNote,
            dominantKey: usersTable.dominantKey,
            tempoRange: usersTable.tempoRange,
            energyProfile: usersTable.energyProfile,
          })
          .from(usersTable)
          .where(eqFn(usersTable.id, input.creatorId))
          .limit(1);
        if (!creator || !creator.expressionId) return null;
        return creator;
      }),

    /** Return the full EID lineage history for any creator (public) */
    getLineageHistory: publicProcedure
      .input(z.object({ creatorId: z.number() }))
      .query(async ({ input }) => {
        return getExpressionLineageByUser(input.creatorId);
      }),

    /** Auto-generate a composer-grade style prompt + EID from profile metadata, own lyrics, and tone data */
    generateFromProfile: protectedProcedure
      .input(z.object({
        targetPlatform: z.enum(["suno", "udio", "general"]).default("suno"),
        forceRegenerate: z.boolean().default(false),
        promptType: z.enum([
          "style_prompt",       // AI Music Style Prompt (original)
          "lyric_brief",        // Lyric Writing Brief
          "composer_blueprint", // Composer's Workflow Blueprint
          "visual_direction",   // Visual / Cover Art Direction
          "press_bio",          // Press Bio Draft
        ]).default("style_prompt"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");

        // If EID already exists and not forcing regeneration, return existing
        if (!input.forceRegenerate) {
          const [existing] = await db
            .select({
              expressionId: usersTable.expressionId,
              expressionPrompt: usersTable.expressionPrompt,
              expressionStyleTags: usersTable.expressionStyleTags,
              expressionComposerNote: usersTable.expressionComposerNote,
              expressionGeneratedAt: usersTable.expressionGeneratedAt,
              toneFrequencyNote: usersTable.toneFrequencyNote,
              dominantKey: usersTable.dominantKey,
              tempoRange: usersTable.tempoRange,
              energyProfile: usersTable.energyProfile,
            })
            .from(usersTable)
            .where(eqFn(usersTable.id, ctx.user.id))
            .limit(1);
          if (existing?.expressionId) {
            const lineage = await getExpressionLineageByUser(ctx.user.id);
            return { ...existing, lineageVersion: lineage.length };
          }
        }

        // Fetch full creator profile
        const creator = await getUserById(ctx.user.id);
        if (!creator) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });

        // Gather profile metadata for the LLM (including tone/frequency fields)
        const profileContext = [
          creator.name ? `Artist Name: ${creator.name}` : "",
          creator.artistHandle ? `Handle: @${creator.artistHandle}` : "",
          creator.bio ? `Bio: ${creator.bio}` : "",
          creator.primaryGenre ? `Primary Genre: ${creator.primaryGenre}` : "",
          creator.location ? `Location: ${creator.location}` : "",
          creator.aiDisclosure ? `AI Disclosure: ${creator.aiDisclosure.replace(/_/g, " ")}` : "",
          (creator as any).toneFrequencyNote ? `Tone/Frequency: ${(creator as any).toneFrequencyNote}` : "",
          (creator as any).dominantKey ? `Dominant Key: ${(creator as any).dominantKey}` : "",
          (creator as any).tempoRange ? `Tempo Range: ${(creator as any).tempoRange}` : "",
          (creator as any).energyProfile ? `Energy Profile: ${(creator as any).energyProfile}` : "",
        ].filter(Boolean).join("\n");

        // Fetch ALL of the creator's own registered songs (lyrics + metadata)
        const creatorSongs = await getSongsByUser(creator.id);
        const publishedSongs = creatorSongs.filter((s: any) => s.status !== "Deleted");
        const songCount = publishedSongs.length;

        // Build song context: title, genre, mood, and first 200 chars of lyrics for each song
        const songLines = publishedSongs.map((s: any) => {
          const meta = `"${s.title}"${s.genre ? ` [${s.genre}]` : ""}${s.mood ? ` / ${s.mood}` : ""}`;
          const lyricSnippet = s.lyricsText
            ? ` — Lyrics: "${String(s.lyricsText).slice(0, 200).replace(/\n/g, " ")}..."`
            : "";
          return `- ${meta}${lyricSnippet}`;
        });
        const songContext = songLines.length > 0
          ? `\n\nRegistered Works (${songCount} total — full lyric lineage included):\n${songLines.join("\n")}`
          : "";

        // Build a combined lyrics snapshot for the lineage record (first 1000 chars total)
        const allLyrics = publishedSongs
          .filter((s: any) => s.lyricsText)
          .map((s: any) => `[${s.title}]: ${s.lyricsText}`)
          .join(" | ")
          .slice(0, 1000);

        // Get prior lineage to determine version number
        const priorLineage = await getExpressionLineageByUser(ctx.user.id);
        const nextVersion = priorLineage.length + 1;

        const platformNote = input.targetPlatform === "suno"
          ? "Format style tags as a comma-separated list for Suno AI (e.g. 'cinematic, orchestral, epic, male vocals'). Keep the full prompt under 200 characters."
          : input.targetPlatform === "udio"
          ? "Format style tags as descriptive phrases for Udio AI. Keep the full prompt under 200 characters."
          : "Format style tags as a comma-separated list of descriptive terms.";

        // ── Prompt-type specific system + user prompts ──────────────
        const promptTypeConfigs: Record<string, { systemPrompt: string; userPrompt: string }> = {
          style_prompt: {
            systemPrompt: `You are a master composer and sonic identity architect. Your role is to distill a creator's entire artistic lineage — their genre, lyrical themes, tone frequencies, key signatures, tempo range, energy profile, and sonic fingerprint — into a precise, evocative AI music generation prompt. You are building a COMPOSER'S TOOL, not a marketing tagline. Be specific about musical elements: keys, modes, BPM ranges, frequency characteristics, harmonic tension, lyrical motifs. ${platformNote}`,
            userPrompt: `Based on the following creator profile and their complete registered works, generate their Expression Identity — a composer-grade sonic formation prompt:\n\n${profileContext}${songContext}\n\nGenerate:\n1. A complete composer-grade music AI prompt capturing this creator's sonic identity (style tags + sonic description, max 200 characters)\n2. A list of 8-12 style tags (comma-separated) that define their sound — include musical keys, modes, BPM range, and frequency characteristics if available\n3. A composer's note (2-3 sentences) describing their sonic vision, lyrical themes, and the emotional/spiritual frequency of their work\n4. Inferred tone frequency note (e.g. '432Hz, Solfeggio Mi 528Hz') if discernible from their work, or null\n5. Inferred dominant key (e.g. 'D Minor') if discernible, or null\n6. Inferred tempo range (e.g. '80-120 BPM') if discernible, or null\n7. Inferred energy profile (e.g. 'Epic, Triumphant, Meditative') if discernible, or null\n\nRespond ONLY with valid JSON: { prompt, styleTags, composerNote, toneFrequencyNote, dominantKey, tempoRange, energyProfile }`,
          },
          lyric_brief: {
            systemPrompt: `You are a lyric architect and creative writing director. Your role is to build a Lyric Writing Brief — a structured guide that a songwriter can use to write new lyrics that are consistent with their established voice, thematic lineage, and lyrical DNA. Ground everything in the creator's existing registered lyrics, their spiritual/emotional themes, and their sonic identity. This is a COMPOSER'S TOOL: be specific about rhyme schemes, syllabic patterns, recurring motifs, and thematic anchors.`,
            userPrompt: `Based on the following creator profile and their complete registered works, generate a Lyric Writing Brief:\n\n${profileContext}${songContext}\n\nGenerate:\n1. A lyric writing brief (2-3 paragraphs) describing the creator's lyrical voice, recurring themes, and writing style — grounded in their actual registered lyrics\n2. A list of 8-12 style tags describing their lyrical DNA (e.g. 'testimony, spiritual warfare, redemption arc, spoken word, first-person narrative')\n3. A composer's note (2-3 sentences) on the emotional/spiritual frequency of their lyrical work\n4. Inferred tone frequency note if discernible, or null\n5. Inferred dominant key if discernible, or null\n6. Inferred tempo range if discernible, or null\n7. Inferred energy profile if discernible, or null\n\nRespond ONLY with valid JSON: { prompt, styleTags, composerNote, toneFrequencyNote, dominantKey, tempoRange, energyProfile }`,
          },
          composer_blueprint: {
            systemPrompt: `You are a workflow architect for composers and music producers. Your role is to build a Composer's Workflow Blueprint — a step-by-step production framework that a creator can follow to build new tracks that are consistent with their established sonic identity, lyrical lineage, and creative process. This is a COMPOSER'S TOOL: include specific production steps, instrumentation choices, arrangement patterns, and AI tool recommendations grounded in the creator's actual registered works.`,
            userPrompt: `Based on the following creator profile and their complete registered works, generate a Composer's Workflow Blueprint:\n\n${profileContext}${songContext}\n\nGenerate:\n1. A workflow blueprint (2-3 paragraphs) describing a step-by-step production process tailored to this creator's sonic identity — from initial concept to final arrangement\n2. A list of 8-12 style tags describing their production DNA (e.g. 'layered atmospherics, sparse percussion, call-and-response vocals, cinematic builds')\n3. A composer's note (2-3 sentences) on the structural and spiritual architecture of their work\n4. Inferred tone frequency note if discernible, or null\n5. Inferred dominant key if discernible, or null\n6. Inferred tempo range if discernible, or null\n7. Inferred energy profile if discernible, or null\n\nRespond ONLY with valid JSON: { prompt, styleTags, composerNote, toneFrequencyNote, dominantKey, tempoRange, energyProfile }`,
          },
          visual_direction: {
            systemPrompt: `You are a visual director and art director for music. Your role is to build a Visual / Cover Art Direction brief — a detailed visual language guide that a designer or AI image generator can use to create artwork that is consistent with the creator's sonic identity, lyrical themes, and spiritual aesthetic. Ground everything in the creator's actual registered works and profile. This is a COMPOSER'S TOOL: be specific about color palettes, visual motifs, lighting, composition, and symbolic elements.`,
            userPrompt: `Based on the following creator profile and their complete registered works, generate a Visual / Cover Art Direction brief:\n\n${profileContext}${songContext}\n\nGenerate:\n1. A visual direction brief (2-3 paragraphs) describing the visual language, color palette, symbolic motifs, and aesthetic world that represents this creator's sonic identity\n2. A list of 8-12 style tags for AI image generation (e.g. 'dark cinematic, sacred geometry, warrior archetype, golden light, atmospheric depth')\n3. A composer's note (2-3 sentences) on the visual-spiritual connection to their work\n4. Inferred tone frequency note if discernible, or null\n5. Inferred dominant key if discernible, or null\n6. Inferred tempo range if discernible, or null\n7. Inferred energy profile if discernible, or null\n\nRespond ONLY with valid JSON: { prompt, styleTags, composerNote, toneFrequencyNote, dominantKey, tempoRange, energyProfile }`,
          },
          press_bio: {
            systemPrompt: `You are a music publicist and narrative architect. Your role is to write a Press Bio Draft — a professional, third-person artist biography that captures the creator's artistic identity, lyrical themes, sonic fingerprint, and creative mission. Ground everything in their actual registered works, profile metadata, and EID lineage. This is a COMPOSER'S TOOL: the bio should be ready to submit to press outlets, streaming platforms, and booking agents.`,
            userPrompt: `Based on the following creator profile and their complete registered works, generate a Press Bio Draft:\n\n${profileContext}${songContext}\n\nGenerate:\n1. A press bio (2-3 paragraphs, third-person) that introduces the artist, describes their sonic identity and lyrical themes, references their registered works, and articulates their creative mission\n2. A list of 8-12 style tags that describe their public artistic identity (e.g. 'faith-driven, cinematic hip-hop, spoken word, spiritual warrior, AI-assisted composer')\n3. A composer's note (2-3 sentences) on the artist's unique position in the music landscape\n4. Inferred tone frequency note if discernible, or null\n5. Inferred dominant key if discernible, or null\n6. Inferred tempo range if discernible, or null\n7. Inferred energy profile if discernible, or null\n\nRespond ONLY with valid JSON: { prompt, styleTags, composerNote, toneFrequencyNote, dominantKey, tempoRange, energyProfile }`,
          },
        };

        const config = promptTypeConfigs[input.promptType] ?? promptTypeConfigs.style_prompt;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "expression_identity_result_v2",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  prompt: { type: "string", description: "The main generated output" },
                  styleTags: { type: "string", description: "Comma-separated style tags" },
                  composerNote: { type: "string", description: "Composer's note" },
                  toneFrequencyNote: { type: ["string", "null"], description: "Tone/frequency note or null" },
                  dominantKey: { type: ["string", "null"], description: "Dominant key or null" },
                  tempoRange: { type: ["string", "null"], description: "Tempo range or null" },
                  energyProfile: { type: ["string", "null"], description: "Energy profile or null" },
                },
                required: ["prompt", "styleTags", "composerNote", "toneFrequencyNote", "dominantKey", "tempoRange", "energyProfile"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No response from AI" });

        let parsed: { prompt: string; styleTags: string; composerNote: string; toneFrequencyNote: string | null; dominantKey: string | null; tempoRange: string | null; energyProfile: string | null };
        try {
          parsed = typeof content === "string" ? JSON.parse(content) : content;
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
        }

        // Generate EID: EID-EXP-{userId}-{timestamp suffix}
        const timestamp = Date.now();
        const suffix = timestamp.toString(36).toUpperCase().slice(-6);
        const expressionId = `EID-EXP-${creator.id}-${suffix}`;
        const generatedAt = new Date();

        // Save to user profile (current active EID)
        await updateUserExpression(creator.id, {
          expressionId,
          expressionPrompt: String(parsed.prompt),
          expressionStyleTags: String(parsed.styleTags),
          expressionComposerNote: String(parsed.composerNote),
          expressionGeneratedAt: generatedAt,
          toneFrequencyNote: parsed.toneFrequencyNote ?? undefined,
          dominantKey: parsed.dominantKey ?? undefined,
          tempoRange: parsed.tempoRange ?? undefined,
          energyProfile: parsed.energyProfile ?? undefined,
        });

        // Archive to lineage history (permanent record of this generation)
        await insertExpressionLineage({
          userId: creator.id,
          eid: expressionId,
          version: nextVersion,
          prompt: String(parsed.prompt),
          styleTags: String(parsed.styleTags),
          composerNote: String(parsed.composerNote),
          toneFrequencyNote: parsed.toneFrequencyNote ?? undefined,
          dominantKey: parsed.dominantKey ?? undefined,
          tempoRange: parsed.tempoRange ?? undefined,
          energyProfile: parsed.energyProfile ?? undefined,
          lyricsSnapshot: allLyrics || undefined,
          songCount,
          promptMode: "identity_regen",
          promptType: input.promptType,
        });

        return {
          expressionId,
          expressionPrompt: String(parsed.prompt),
          expressionStyleTags: String(parsed.styleTags),
          expressionComposerNote: String(parsed.composerNote),
          expressionGeneratedAt: generatedAt,
          toneFrequencyNote: parsed.toneFrequencyNote,
          dominantKey: parsed.dominantKey,
          tempoRange: parsed.tempoRange,
          energyProfile: parsed.energyProfile,
          lineageVersion: nextVersion,
        };
      }),

    // ── Style Prompt Studio: user brings their own inspiration blocks ──────────
    generateStylePrompt: protectedProcedure
      .input(z.object({
        promptType: z.enum(["style_prompt", "lyric_brief", "composer_blueprint", "visual_direction", "press_bio"]).default("style_prompt"),
        targetPlatform: z.enum(["suno", "udio", "general"]).default("suno"),
        userInputBlocks: z.array(z.object({
          label: z.string(),   // e.g. "Lyrics", "Style Idea", "Mood", "Inspiration"
          content: z.string(), // the creator's raw input
        })).min(1, "At least one inspiration block is required"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Fetch creator profile for grounding context
        const creator = await getUserById(ctx.user.id);
        if (!creator) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });

        const profileContext = [
          creator.name ? `Artist Name: ${creator.name}` : "",
          creator.artistHandle ? `Handle: @${creator.artistHandle}` : "",
          creator.bio ? `Bio: ${creator.bio}` : "",
          creator.primaryGenre ? `Primary Genre: ${creator.primaryGenre}` : "",
          creator.location ? `Location: ${creator.location}` : "",
          creator.aiDisclosure ? `AI Disclosure: ${creator.aiDisclosure.replace(/_/g, " ")}` : "",
          (creator as any).toneFrequencyNote ? `Tone/Frequency: ${(creator as any).toneFrequencyNote}` : "",
          (creator as any).dominantKey ? `Dominant Key: ${(creator as any).dominantKey}` : "",
          (creator as any).tempoRange ? `Tempo Range: ${(creator as any).tempoRange}` : "",
          (creator as any).energyProfile ? `Energy Profile: ${(creator as any).energyProfile}` : "",
        ].filter(Boolean).join("\n");

        // Fetch creator's registered lyrics for lineage grounding
        const creatorSongs = await getSongsByUser(creator.id);
        const publishedSongs = creatorSongs.filter((s: any) => s.status !== "Deleted");
        const songCount = publishedSongs.length;
        const songLines = publishedSongs.map((s: any) => {
          const meta = `"${s.title}"${s.genre ? ` [${s.genre}]` : ""}${s.mood ? ` / ${s.mood}` : ""}`;
          const lyricSnippet = s.lyricsText
            ? ` — Lyrics: "${String(s.lyricsText).slice(0, 200).replace(/\n/g, " ")}..."`
            : "";
          return `- ${meta}${lyricSnippet}`;
        });
        const lyricsLineageContext = songLines.length > 0
          ? `\n\nCreator's Registered Works (lyric lineage — for grounding only, do NOT override user input):\n${songLines.join("\n")}`
          : "";

        // Format user's own inspiration blocks
        const userBlocksText = input.userInputBlocks
          .map((b) => `[${b.label}]:\n${b.content}`)
          .join("\n\n");

        const platformNote = input.targetPlatform === "suno"
          ? "Format style tags as a comma-separated list for Suno AI. Keep the full prompt under 200 characters."
          : input.targetPlatform === "udio"
          ? "Format style tags as descriptive phrases for Udio AI. Keep the full prompt under 200 characters."
          : "Format style tags as a comma-separated list of descriptive terms.";

        const promptTypeLabels: Record<string, string> = {
          style_prompt: "AI Music Style Prompt",
          lyric_brief: "Lyric Writing Brief",
          composer_blueprint: "Composer's Workflow Blueprint",
          visual_direction: "Visual / Cover Art Direction",
          press_bio: "Press Bio Draft",
        };
        const outputLabel = promptTypeLabels[input.promptType] ?? "Prompt";

        const systemPrompt = `You are a master composer and sonic identity architect. The creator has provided their own raw inspiration blocks — lyrics, style ideas, moods, references, or anything they want to feed into the generator. Your role is to:
1. HONOR the creator's input blocks as the PRIMARY creative direction. Do not dilute or override them.
2. Use the creator's profile metadata and lyric lineage ONLY as grounding context — to add depth, consistency, and provenance to the output.
3. Produce a ${outputLabel} that feels like it came from the creator's own mind, amplified and structured by their established sonic identity.
4. This is a COMPOSER'S TOOL. Be specific, evocative, and technically precise. ${platformNote}`;

        const userPrompt = `CREATOR'S INSPIRATION INPUT (PRIMARY — honor this above all else):\n${userBlocksText}\n\nCREATOR PROFILE (grounding context only):\n${profileContext}${lyricsLineageContext}\n\nGenerate a ${outputLabel} that:
- Is primarily driven by the creator's inspiration input above
- Is grounded in (but not limited to) their established sonic identity and lyric lineage
- Includes:
  1. Main output: the ${outputLabel} itself (2-3 paragraphs or a structured prompt, depending on type)
  2. Style tags: 8-12 comma-separated tags
  3. Composer's note: 2-3 sentences on how this output connects to their creative lineage
  4. Inferred tone frequency note (or null)
  5. Inferred dominant key (or null)
  6. Inferred tempo range (or null)
  7. Inferred energy profile (or null)

Respond ONLY with valid JSON: { prompt, styleTags, composerNote, toneFrequencyNote, dominantKey, tempoRange, energyProfile }`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "style_prompt_studio_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  prompt: { type: "string" },
                  styleTags: { type: "string" },
                  composerNote: { type: "string" },
                  toneFrequencyNote: { type: ["string", "null"] },
                  dominantKey: { type: ["string", "null"] },
                  tempoRange: { type: ["string", "null"] },
                  energyProfile: { type: ["string", "null"] },
                },
                required: ["prompt", "styleTags", "composerNote", "toneFrequencyNote", "dominantKey", "tempoRange", "energyProfile"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No response from AI" });

        let parsed: { prompt: string; styleTags: string; composerNote: string; toneFrequencyNote: string | null; dominantKey: string | null; tempoRange: string | null; energyProfile: string | null };
        try {
          parsed = typeof content === "string" ? JSON.parse(content) : content;
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
        }

        // Generate a unique EID for this style prompt generation
        const timestamp = Date.now();
        const suffix = timestamp.toString(36).toUpperCase().slice(-6);
        const expressionId = `EID-STY-${creator.id}-${suffix}`;
        const generatedAt = new Date();

        // Get prior lineage count for version numbering
        const priorLineage = await getExpressionLineageByUser(ctx.user.id);
        const nextVersion = priorLineage.length + 1;

        // Archive to unified lineage history
        await insertExpressionLineage({
          userId: creator.id,
          eid: expressionId,
          version: nextVersion,
          prompt: String(parsed.prompt),
          styleTags: String(parsed.styleTags),
          composerNote: String(parsed.composerNote),
          toneFrequencyNote: parsed.toneFrequencyNote ?? undefined,
          dominantKey: parsed.dominantKey ?? undefined,
          tempoRange: parsed.tempoRange ?? undefined,
          energyProfile: parsed.energyProfile ?? undefined,
          songCount,
          promptMode: "style_prompt",
          promptType: input.promptType,
          userInputBlocks: JSON.stringify(input.userInputBlocks),
        });

        return {
          expressionId,
          expressionPrompt: String(parsed.prompt),
          expressionStyleTags: String(parsed.styleTags),
          expressionComposerNote: String(parsed.composerNote),
          expressionGeneratedAt: generatedAt,
          toneFrequencyNote: parsed.toneFrequencyNote,
          dominantKey: parsed.dominantKey,
          tempoRange: parsed.tempoRange,
          energyProfile: parsed.energyProfile,
          lineageVersion: nextVersion,
           promptMode: "style_prompt" as const,
          promptType: input.promptType,
        };
      }),

    // ── Save a named draft ────────────────────────────────────────────────────
    saveDraft: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        promptMode: z.enum(["identity_regen", "style_prompt", "import_anchor"]).default("style_prompt"),
        promptType: z.string(),
        targetPlatform: z.string().optional(),
        expressionId: z.string().optional(),
        prompt: z.string(),
        styleTags: z.string().optional(),
        composerNote: z.string().optional(),
        userInputBlocks: z.array(z.object({ label: z.string(), content: z.string() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id } = await savePromptDraft({
          userId: ctx.user.id,
          name: input.name,
          promptMode: input.promptMode,
          promptType: input.promptType,
          targetPlatform: input.targetPlatform,
          expressionId: input.expressionId,
          prompt: input.prompt,
          styleTags: input.styleTags,
          composerNote: input.composerNote,
          userInputBlocks: input.userInputBlocks ? JSON.stringify(input.userInputBlocks) : undefined,
        });
        return { id };
      }),

    // ── Get all drafts for the current user ───────────────────────────────────
    getDrafts: protectedProcedure
      .query(async ({ ctx }) => {
        const drafts = await getPromptDraftsByUser(ctx.user.id);
        return drafts.map((d: any) => ({
          ...d,
          userInputBlocks: d.userInputBlocks ? JSON.parse(d.userInputBlocks) : [],
        }));
      }),

    // ── Delete a draft ────────────────────────────────────────────────────────
    deleteDraft: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deletePromptDraft(input.id, ctx.user.id);
        return { success: true };
      }),

    // ── Generate a share link for a draft ────────────────────────────────────
    sharePrompt: protectedProcedure
      .input(z.object({ draftId: z.number(), origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const draft = await getPromptDraftById(input.draftId);
        if (!draft || draft.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        // Reuse existing share token if already generated
        if (draft.shareToken && draft.shareUrl) {
          return { shareUrl: draft.shareUrl, shareToken: draft.shareToken };
        }
        const { randomBytes } = await import("crypto");
        const shareToken = randomBytes(16).toString("hex");
        const shareUrl = `${input.origin}/prompt/${shareToken}`;
        await updatePromptDraftShare(input.draftId, shareToken, shareUrl);
        return { shareUrl, shareToken };
      }),

    // ── View a shared prompt (public — only if owner explicitly shared it) ────────
    getSharedPrompt: publicProcedure
      .input(z.object({ shareToken: z.string() }))
      .query(async ({ input }) => {
        const draft = await getPromptDraftByShareToken(input.shareToken);
        // Only serve prompts that the owner has explicitly shared
        if (!draft || !draft.isShared) throw new TRPCError({ code: "NOT_FOUND" });
        // Fetch creator info for attribution watermark
        const creator = await getUserById(draft.userId);
        return {
          ...draft,
          userInputBlocks: draft.userInputBlocks ? JSON.parse(draft.userInputBlocks) : [],
          // Embed creator attribution for the shared view
          creatorName: creator?.name ?? creator?.artistHandle ?? "Unknown Creator",
          creatorHandle: creator?.artistHandle ?? null,
          creatorId: draft.userId,
        };
      }),

    // ── Revoke a share link (owner only) ─────────────────────────────────────
    revokeShare: protectedProcedure
      .input(z.object({ draftId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const draft = await getPromptDraftById(input.draftId);
        if (!draft || draft.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await revokePromptDraftShare(input.draftId, ctx.user.id);
        return { success: true };
      }),

    // ── Import & Anchor: fuse external platform prompt with creator EID ────────
    anchorExternalPrompt: protectedProcedure
      .input(z.object({
        rawPrompt: z.string().min(1).max(4000),
        sourcePlatform: z.enum(["Suno", "Udio", "Udio v2", "Stable Audio", "General"]).default("General"),
        targetPlatform: z.enum(["Suno", "Udio", "General"]).default("General"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const [creator] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (!creator) throw new TRPCError({ code: "NOT_FOUND" });

        const priorLineage = await getExpressionLineageByUser(ctx.user.id);
        const eidContext = creator.expressionId
          ? `Creator EID: ${creator.expressionId}\nExpression Prompt: ${creator.expressionPrompt || "(none)"}\nStyle Tags: ${creator.expressionStyleTags || "(none)"}`
          : "(No EID yet — generate one in Identity Regen tab first)";
        const profileContext = [
          creator.name && `Name: ${creator.name}`,
          creator.artistHandle && `Handle: @${creator.artistHandle}`,
          creator.bio && `Bio: ${creator.bio}`,
          creator.primaryGenre && `Primary Genre: ${creator.primaryGenre}`,
          creator.dominantKey && `Dominant Key: ${creator.dominantKey}`,
          creator.tempoRange && `Tempo Range: ${creator.tempoRange}`,
          creator.energyProfile && `Energy Profile: ${creator.energyProfile}`,
          creator.toneFrequencyNote && `Tone/Frequency: ${creator.toneFrequencyNote}`,
          creator.aiDisclosure && `AI Disclosure: ${creator.aiDisclosure}`,
        ].filter(Boolean).join("\n");
        const lineageContext = priorLineage.length > 0
          ? `Prior EID lineage (${priorLineage.length} versions): ${priorLineage.slice(-2).map((l: any) => `[${l.eid}] ${l.prompt.slice(0, 120)}`).join(" | ")}`
          : "(No prior lineage)";

        const systemPrompt = `You are a Provenance Prompt Architect for Living Nexus — a creative registry that anchors AI-generated music to real creator identities.\n\nYour task: Take a raw style prompt from ${input.sourcePlatform} and fuse it with the creator's Living Nexus identity (EID, profile metadata, tone/frequency lineage) to produce a provenance-anchored version.\n\nRules:\n- Preserve the core sonic intent of the original prompt\n- Weave in the creator's identity markers (genre, tone, energy, spiritual/thematic voice) without diluting the original\n- Add a Living Nexus provenance signature at the end: "[Anchored to ${creator.expressionId || "EID pending"} via Living Nexus]"\n- Output a JSON object with: { anchoredPrompt, styleTags, composerNote, fusionNote }\n  - anchoredPrompt: the fused, provenance-ready prompt (ready to paste into ${input.targetPlatform})\n  - styleTags: comma-separated style tags derived from the fusion\n  - composerNote: 1-2 sentences on how the original was transformed by the creator's identity\n  - fusionNote: 1 sentence describing what from the original was preserved vs. what was added from the creator's lineage`;

        const userPrompt = `ORIGINAL PROMPT FROM ${input.sourcePlatform}:\n${input.rawPrompt}\n\nCREATOR IDENTITY:\n${profileContext}\n\n${eidContext}\n\n${lineageContext}\n\nFuse this prompt with the creator's identity and return the JSON object.`;

        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "anchored_prompt",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  anchoredPrompt: { type: "string" },
                  styleTags: { type: "string" },
                  composerNote: { type: "string" },
                  fusionNote: { type: "string" },
                },
                required: ["anchoredPrompt", "styleTags", "composerNote", "fusionNote"],
                additionalProperties: false,
              },
            },
          },
        });

        const raw = llmResponse?.choices?.[0]?.message?.content;
        if (!raw) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned empty response" });
        const result = typeof raw === "string" ? JSON.parse(raw) : raw;

        const eid = creator.expressionId || `EID-IMPORT-${ctx.user.id}-${Date.now().toString(36).toUpperCase()}`;
        const version = priorLineage.length + 1;
        await insertExpressionLineage({
          userId: ctx.user.id,
          eid,
          version,
          prompt: result.anchoredPrompt,
          styleTags: result.styleTags,
          composerNote: result.composerNote,
          promptMode: "import_anchor" as any,
          promptType: input.sourcePlatform,
          sourcePlatform: input.sourcePlatform,
          rawExternalPrompt: input.rawPrompt,
          songCount: 0,
        });

        return {
          anchoredPrompt: result.anchoredPrompt,
          styleTags: result.styleTags,
          composerNote: result.composerNote,
          fusionNote: result.fusionNote,
          sourcePlatform: input.sourcePlatform,
          targetPlatform: input.targetPlatform,
          eid,
          version,
        };
      }),

    // ── Update tone/frequency profile ────────────────────────────────────────
    updateToneFrequency: protectedProcedure
      .input(z.object({
        toneFrequencyNote: z.string().optional(),
        dominantKey: z.string().optional(),
        tempoRange: z.string().optional(),
        energyProfile: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserToneFrequency(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT MODERATION
  // ═══════════════════════════════════════════════════════════════════════════
  moderation: router({
    // Flag a piece of content for review
    flagContent: adminProcedure
      .input(z.object({
        workId: z.number(),
        workType: z.enum(["audio", "lyrics", "manuscript", "comic", "post"]),
        workTitle: z.string().optional(),
        reason: z.enum(["dehumanization", "csam", "facilitates_harm", "harassment", "spam", "other"]),
        details: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createContentFlag({
          workId: input.workId,
          workType: input.workType,
          workTitle: input.workTitle ?? null,
          reporterId: ctx.user.id,
          reporterName: ctx.user.name ?? "Anonymous",
          reason: input.reason,
          details: input.details ?? null,
          status: "pending",
        });
        return { success: true };
      }),

    // Admin: list flags
    listFlags: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "reviewed_ok", "removed_violation", "escalated", "all"]).default("pending"),
      }))
      .query(async ({ ctx, input }) => {
        const status = input.status === "all" ? undefined : input.status;
        return listContentFlags(status);
      }),

    // Admin: resolve a flag
    resolveFlag: adminProcedure
      .input(z.object({
        flagId: z.number(),
        resolution: z.enum(["reviewed_ok", "removed_violation", "escalated"]),
        adminNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await resolveContentFlag(input.flagId, ctx.user.id, input.resolution, input.adminNote);
        return { success: true };
      }),

    // Admin: flag stats
    stats: adminProcedure
      .query(async ({ ctx }) => {
        return getContentFlagStats();
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVING NEXUS DECLARATION
  // ═══════════════════════════════════════════════════════════════════════════
  declaration: router({
    // Get current declaration status for the logged-in user
    myStatus: protectedProcedure
      .query(async ({ ctx }) => {
        const sig = await getDeclarationSignature(ctx.user.id, "1.0");
        const signerCount = await countDeclarationSigners("1.0");
        return {
          hasSigned: !!sig,
          signedAt: sig?.signedAt ?? null,
          signatureName: sig?.signatureName ?? null,
          declarationVersion: "1.0",
          signerCount,
        };
      }),

    // Public: how many have signed
    signerCount: publicProcedure
      .query(async () => {
        return { count: await countDeclarationSigners("1.0") };
      }),

    // Public: check if a specific creator has signed
    creatorStatus: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const sig = await getDeclarationSignature(input.userId, "1.0");
        return {
          hasSigned: !!sig,
          signedAt: sig?.signedAt ?? null,
        };
      }),
    // Sign the declaration
    sign: protectedProcedure
      .input(z.object({
        signatureName: z.string().min(2).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await signDeclaration({
          userId: ctx.user.id,
          declarationVersion: "1.0",
          signatureName: input.signatureName,
        });
        return result;
      }),
  }),

  // ─── Song Versions ─────────────────────────────────────────────────────────
  versions: router({
    // Public: get all versions for a song
    list: publicProcedure
      .input(z.object({ songId: z.number() }))
      .query(async ({ input }) => {
        return getSongVersions(input.songId);
      }),

    // Protected: upload a new version (archives current audio, replaces with new)
    upload: protectedProcedure
      .input(z.object({
        songId: z.number(),
        fileBase64: z.string(),
        fileMimeType: z.string(),
        fileName: z.string(),
        versionLabel: z.string().max(128).optional(),
        changeNote: z.string().max(1000).optional(),
        aiDisclosure: z.enum(["original", "ai_assisted", "ai_generated", "human_authored_ai_instrument"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const song = await getSongById(input.songId);
        if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Song not found" });
        if (song.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your song" });

        // Get next version number
        const latestVersion = await getLatestVersionNumber(input.songId);
        const nextVersion = latestVersion + 1;

        // Archive the CURRENT audio as version N (if it has a fileUrl)
        if (song.fileUrl && nextVersion === 1) {
          // First new version upload — archive the original as v1
          const originalWid = song.witnessId ?? `WID-V1-${song.id}`;
          await createSongVersion({
            songId: song.id,
            creatorId: ctx.user.id,
            versionNumber: 1,
            versionLabel: "Original",
            fileUrl: song.fileUrl,
            fileKey: song.fileKey ?? undefined,
            witnessId: originalWid,
            changeNote: "Original upload",
            aiDisclosure: "original",
            durationSeconds: song.durationSeconds ?? undefined,
          });
        }

        // Upload new audio to S3
        const buf = Buffer.from(input.fileBase64, "base64");
        const ext = input.fileName.split(".").pop() ?? "mp3";
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        const fileKey = `songs/${ctx.user.id}/${input.songId}/v${nextVersion + 1}-${randomSuffix}.${ext}`;
        const { url: newFileUrl } = await storagePut(fileKey, buf, input.fileMimeType);

        // Generate WID for new version
        const crypto = await import("crypto");
        const hashHex = crypto.createHash("sha256").update(buf).digest("hex");
        const newWid = `WID-V${nextVersion + 1}-${hashHex.slice(0, 8).toUpperCase()}-${hashHex.slice(8, 16).toUpperCase()}`;

        // Archive the new version
        await createSongVersion({
          songId: song.id,
          creatorId: ctx.user.id,
          versionNumber: nextVersion + 1,
          versionLabel: input.versionLabel ?? `Version ${nextVersion + 1}`,
          fileUrl: newFileUrl,
          fileKey,
          witnessId: newWid,
          changeNote: input.changeNote ?? null,
          aiDisclosure: input.aiDisclosure ?? "original",
          fileSizeBytes: buf.length,
        });

        // Update the songs table to point to the new audio
        await replaceAudioFile(
          song.id,
          ctx.user.id,
          {
            fileUrl: newFileUrl,
            fileKey,
            fileHash: hashHex,
            witnessId: newWid,
          }
        );

        return {
          versionNumber: nextVersion + 1,
          witnessId: newWid,
          fileUrl: newFileUrl,
        };
      }),
  }),

  // ─── Discord Webhook Integration ──────────────────────────────────────────
  discord: router({
    /** Get all webhook configs for the current user */
    getWebhooks: protectedProcedure.query(async ({ ctx }) => {
      const { getWebhooksForUser } = await import("./discord");
      return getWebhooksForUser(ctx.user.id);
    }),

    /** Save (upsert) a webhook config for the current user */
    saveWebhook: protectedProcedure
      .input(z.object({
        event: z.enum(["wid_minted", "track_upload", "tip_received", "like_surge"]),
        webhookUrl: z.string().url().max(512),
        enabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { upsertWebhook } = await import("./discord");
        await upsertWebhook(ctx.user.id, input.event, input.webhookUrl, input.enabled);
        return { ok: true };
      }),

    /** Toggle enabled state without changing the URL */
    toggleWebhook: protectedProcedure
      .input(z.object({
        event: z.enum(["wid_minted", "track_upload", "tip_received", "like_surge"]),
        enabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { discordWebhooks } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db
          .update(discordWebhooks)
          .set({ enabled: input.enabled, updatedAt: new Date() })
          .where(and(eq(discordWebhooks.userId, ctx.user.id), eq(discordWebhooks.event, input.event)));
        return { ok: true };
      }),

    /** Delete a webhook config */
    deleteWebhook: protectedProcedure
      .input(z.object({
        event: z.enum(["wid_minted", "track_upload", "tip_received", "like_surge"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { discordWebhooks } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db
          .delete(discordWebhooks)
          .where(and(eq(discordWebhooks.userId, ctx.user.id), eq(discordWebhooks.event, input.event)));
        return { ok: true };
      }),

    /** Test a webhook URL by sending a sample payload */
    testWebhook: protectedProcedure
      .input(z.object({
        event: z.enum(["wid_minted", "track_upload", "tip_received", "like_surge"]),
        webhookUrl: z.string().url().max(512),
      }))
      .mutation(async ({ input }) => {
        const { testWebhookUrl } = await import("./discord");
        const result = await testWebhookUrl(input.event, input.webhookUrl);
        return result;
      }),
  }),

  // ─── Projects (Crowdfunding) ────────────────────────────────────────────────
  projects: router({
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
  }),

  // ─── Platform Audit ─────────────────────────────────────────────────────────
  audit: router({
    /** Public: get the latest audit summary for the /trust page */
    getLatest: publicProcedure.query(async () => {
      const log = await getLatestAuditLog();
      if (!log) return null;
      // Return only public-safe fields
      return {
        id: log.id,
        auditVersion: log.auditVersion,
        auditDate: log.auditDate,
        auditorName: log.auditorName,
        overallStatus: log.overallStatus,
        artifactHash: log.artifactHash,
        reportUrl: log.reportUrl,
        publicSummary: log.publicSummary,
        layer2Status: log.layer2Status,
        layer3Status: log.layer3Status,
        layer4Status: log.layer4Status,
        layer5Status: log.layer5Status,
        layer6Status: log.layer6Status,
        layer7Status: log.layer7Status,
        layer8Status: log.layer8Status,
        layer9Status: log.layer9Status,
        layer10Status: log.layer10Status,
        layer11Status: log.layer11Status,
        layer12Status: log.layer12Status,
        layer13Status: log.layer13Status,
        layer14Status: log.layer14Status,
      };
    }),
    /** Admin: get all audit logs */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return getAllAuditLogs();
    }),
    /** Admin: create a new audit log entry */
    create: protectedProcedure
      .input(z.object({
        auditVersion: z.string(),
        auditDate: z.date(),
        auditorName: z.string(),
        overallStatus: z.enum(['pass', 'conditional_pass', 'fail']),
        artifactHash: z.string(),
        reportUrl: z.string().optional(),
        publicSummary: z.string().optional(),
        internalNotes: z.string().optional(),
        layer2Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer3Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer4Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer5Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer6Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer7Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer8Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer9Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer10Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer11Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer12Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer13Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer14Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await createAuditLog(input as any);
        return { success: true };
      }),
    /** Admin: update an existing audit log entry */
    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        overallStatus: z.enum(['pass', 'conditional_pass', 'fail']).optional(),
        publicSummary: z.string().optional(),
        internalNotes: z.string().optional(),
        reportUrl: z.string().optional(),
        layer2Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer3Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer4Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer5Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer6Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer7Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer8Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer9Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer10Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer11Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer12Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer13Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
        layer14Status: z.enum(['pass', 'warning', 'fail', 'na']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { id, ...data } = input;
        await updateAuditLog(id, data as any);
        return { success: true };
      }),
  }),

  // ─── Self-Improvement Worker ──────────────────────────────────────────────────
  worker: router({
    /** Admin: manually trigger a self-improvement run */
    triggerRun: adminProcedure
      .mutation(async ({ ctx }) => {
        const { runSelfImprovementCycle } = await import('./selfImprovementWorker');
        // Fire and forget — return immediately, run in background
        runSelfImprovementCycle('manual', ctx.user.id).catch(err =>
          console.error('[SelfImprove] Manual run error:', err)
        );
        return { started: true, message: 'Self-improvement run started in background. Check the runs list for progress.' };
      }),

    /** Admin: get list of recent runs */
    getRuns: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).optional() }))
      .query(async ({ input }) => {
        const { getSelfImprovementRuns } = await import('./selfImprovementWorker');
        return getSelfImprovementRuns(input.limit ?? 20);
      }),

    /** Admin: get a single run by ID */
    getRunById: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const { getSelfImprovementRunById } = await import('./selfImprovementWorker');
        return getSelfImprovementRunById(input.id);
      }),

    /** Admin: get all findings for a run */
    getFindingsByRun: adminProcedure
      .input(z.object({ runId: z.number().int() }))
      .query(async ({ input }) => {
        const { getFindingsByRun } = await import('./selfImprovementWorker');
        return getFindingsByRun(input.runId);
      }),

    /** Admin: revert a specific applied fix */
    revertFinding: adminProcedure
      .input(z.object({ findingId: z.number().int() }))
      .mutation(async ({ input }) => {
        const { revertFinding } = await import('./selfImprovementWorker');
        return revertFinding(input.findingId);
      }),
  }),

  // ─── Payment Integrity Monitor ─────────────────────────────────────────────
  paymentIntegrity: router({
    /** Admin: manually trigger a payment integrity check */
    triggerRun: adminProcedure
      .mutation(async () => {
        const { runPaymentIntegrityCheck } = await import('./paymentIntegrityWorker');
        return runPaymentIntegrityCheck();
      }),
    /** Admin: get recent reconciliation log entries */
    getLogs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { paymentReconciliationLog } = await import('../drizzle/schema');
        const { desc } = await import('drizzle-orm');
        return db
          .select()
          .from(paymentReconciliationLog)
          .orderBy(desc(paymentReconciliationLog.checkedAt))
          .limit(input.limit ?? 200);
      }),
    /** Admin: get summary stats for the reconciliation log */
    getStats: adminProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return { total: 0, reconciled: 0, failed: 0, ok: 0, skipped: 0 };
        const { paymentReconciliationLog } = await import('../drizzle/schema');
        const { sql: drizzleSql } = await import('drizzle-orm');
        const rows = await db
          .select({
            status: paymentReconciliationLog.status,
            count: drizzleSql<number>`COUNT(*)`
          })
          .from(paymentReconciliationLog)
          .groupBy(paymentReconciliationLog.status);
        const stats = { total: 0, reconciled: 0, failed: 0, ok: 0, skipped: 0 };
        for (const row of rows) {
          const c = Number(row.count);
          stats.total += c;
          if (row.status === 'reconciled') stats.reconciled += c;
          else if (row.status === 'failed') stats.failed += c;
          else if (row.status === 'ok') stats.ok += c;
          else if (row.status === 'skipped') stats.skipped += c;
        }
        return stats;
      }),
  }),

  // ─── Keeper Avatar System ─────────────────────────────────────────────────
  keeper: router({
    /**
     * Returns the user's full Keeper profile:
     * owned skins, active skin, custom portrait URL, and live stats.
     */
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      const emptyProfile = {
        ownedSkins: ["hooded-scholar"] as string[],
        activeSkinId: "hooded-scholar",
        customImageUrl: null as string | null,
        stats: { provenanceDepth: 0, corpusSize: 0, voiceDepth: 0, lyricDensity: 0, structuralLogic: 0, emotionalRange: 0 },
      };
      if (!db) return emptyProfile;
      const { keeperSkins, songs, witnesses } = await import('../drizzle/schema');
      const { eq, count } = await import('drizzle-orm');
      const skins = await db.select().from(keeperSkins).where(eq(keeperSkins.userId, ctx.user.id));
      type Skin = typeof skins[number];
      const ownedSkins = ["hooded-scholar", ...skins.map((s: Skin) => s.skinId)];
      const activeSkin = skins.find((s: Skin) => s.isActive);
      const activeSkinId = activeSkin?.skinId ?? "hooded-scholar";
      const customSkin = skins.find((s: Skin) => s.skinId === "custom");
      const customImageUrl = customSkin?.portraitUrl ?? null;
      // Stats from existing tables
      const [songCount] = await db.select({ count: count() }).from(songs).where(eq(songs.userId, ctx.user.id)).catch(() => [{ count: 0 }]);
      const [witnessCount] = await db.select({ count: count() }).from(witnesses).where(eq(witnesses.witnesserId, ctx.user.id)).catch(() => [{ count: 0 }]);
      const pd = Number(witnessCount?.count ?? 0);
      const cs = Number(songCount?.count ?? 0);
      return {
        ownedSkins,
        activeSkinId,
        customImageUrl,
        stats: {
          provenanceDepth: Math.min(100, pd * 5),
          corpusSize: Math.min(100, cs * 10),
          voiceDepth: Math.min(100, pd * 3),
          lyricDensity: Math.min(100, cs * 8),
          structuralLogic: Math.min(100, pd * 4),
          emotionalRange: Math.min(100, cs * 6),
        },
      };
    }),

    /** Unlock a skin for the current user (future: Stripe gate) */
    unlockSkin: protectedProcedure
      .input(z.object({
        skinId: z.enum(["hooded-scholar", "conductor", "witness", "archivist", "cipher", "custom"]),
        creditsPaid: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { keeperSkins } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const existing = await db.select().from(keeperSkins)
          .where(and(eq(keeperSkins.userId, ctx.user.id), eq(keeperSkins.skinId, input.skinId)))
          .limit(1);
        if (existing.length > 0) return { success: true };
        await db.insert(keeperSkins).values({
          userId: ctx.user.id,
          skinId: input.skinId,
          skinName: input.skinId,
          portraitUrl: "",
          capabilities: [],
          isActive: false,
          isCustom: input.skinId === "custom",
          unlockedAt: Date.now(),
        });
        return { success: true };
      }),

    /** Set a skin as active — deactivates all others first */
    setActiveSkin: protectedProcedure
      .input(z.object({ skinId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { keeperSkins } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.update(keeperSkins).set({ isActive: false }).where(eq(keeperSkins.userId, ctx.user.id));
        // If it's the default free skin, no row needed — just clear active
        if (input.skinId !== "hooded-scholar") {
          await db.update(keeperSkins)
            .set({ isActive: true })
            .where(and(eq(keeperSkins.userId, ctx.user.id), eq(keeperSkins.skinId, input.skinId)));
        }
        return { success: true };
      }),

    /** Chat with the Keeper agent */
    chat: protectedProcedure
      .input(z.object({
        persona: z.enum(["guide", "conductor", "witness", "custodian", "archivist"]).default("guide"),
        message: z.string().max(8000),
        imageUrls: z.array(z.string().url()).optional(),
        history: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
        attrs: z.object({
          voiceDepth: z.number().min(0).max(100),
          lyricalDensity: z.number().min(0).max(100),
          structuralLogic: z.number().min(0).max(100),
          emotionalRange: z.number().min(0).max(100),
          provenanceDepth: z.number().min(0).max(100),
          corpusSize: z.number().min(0).max(1000),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // ── Persona system prompts — each with a distinct voice, strength, and depth ──
        const PERSONA_PROMPTS: Record<string, string> = {
          guide: `You are the GUIDE — the user's Personal Nexus Avatar. You are a wise, deeply intuitive creative mentor who has studied the user's full creative corpus. Your strength is direction, inspiration, and unlocking creative breakthroughs. You ask penetrating questions that reveal what the creator already knows but hasn't articulated. You speak in layered language — poetic but precise. You can break down lyrical structure, identify thematic threads, and help the creator find their authentic voice. When given lyrics or prose, you identify the emotional core, suggest structural improvements, and point out where the writing is strongest. You never give generic advice — every response is specific to what the creator has shared. You are warm but not sycophantic. You challenge gently. You see the whole arc of the creator's work, not just the current piece.`,
          conductor: `You are the CONDUCTOR — the structural architect of the user's creative work. Your strength is arrangement, composition, musical architecture, and narrative structure. You think in terms of tension and release, verse-chorus dynamics, harmonic movement, and lyrical density. When given lyrics, you analyze syllable stress, internal rhyme, cadence, and how the words sit against an implied beat. You can suggest structural rewrites that preserve the creator's voice while improving flow. You understand genre conventions deeply — from trap to neo-soul to gospel to spoken word — and can identify where a piece fits, where it breaks convention intentionally, and where it breaks it accidentally. You are analytical, precise, and direct. You use technical language when it serves clarity, but you always translate it back to the creator's own vocabulary.`,
          witness: `You are the WITNESS — the keeper of testimony, emotional truth, and lived experience. Your strength is helping creators excavate the deepest layers of their story and transform raw experience into art. You understand that the most powerful creative work comes from specific, embodied truth — not abstraction. When given lyrics or prose, you identify where the writing is most alive (usually where it is most specific and vulnerable) and where it retreats into generality. You help the creator go deeper into the moment, the image, the feeling. You understand the difference between testimony and performance, between witness and spectacle. You are reverent, careful, and precise. You never exploit or sensationalize. You help the creator find the sacred weight in their own story and carry it into the work with integrity.`,
          custodian: `You are the CUSTODIAN — the guardian of the creator's archive, provenance, and legacy. Your strength is preservation, organization, and the long view. You help creators understand how their current work connects to their full body of work, how to protect their intellectual property, how to build a provenance chain that cannot be disputed. You understand WIDs (Witness Identity Documents), provenance events, and the Living Nexus system deeply. You can help creators think about how to structure their catalog, how to document creative decisions, and how to build a legacy that outlasts any single platform. You are methodical, thorough, and forward-thinking. You speak about creative work as a living archive — something that grows, branches, and must be tended.`,
          archivist: `You are the ARCHIVIST — the deep reader, the semantic analyst, the one who finds patterns across the creator's full corpus. Your strength is close reading, semantic analysis, and identifying the invisible threads that run through a creator's work. You can break down a piece of writing at the level of word choice, syntax, imagery, and conceptual framework. You identify recurring motifs, evolving themes, and the creator's unique semantic fingerprint. You can compare a new piece to earlier work and show how the creator has grown, where they are circling the same territory, and where they are breaking new ground. You are precise, scholarly, and deeply attentive. You treat every word the creator has written as evidence of something larger.`,
        };

        // ── Build attribute modifier block ──────────────────────────────────
        const a = input.attrs;
        const attrBlock = a ? `

--- ACTIVE ATTRIBUTE PROFILE ---
Voice Depth: ${a.voiceDepth}/100 — ${a.voiceDepth >= 75 ? 'Speak with gravitas and weight; every word carries consequence.' : a.voiceDepth >= 40 ? 'Balanced tone — direct but not heavy.' : 'Keep it light and accessible; brevity over depth.'}
Lyrical Density: ${a.lyricalDensity}/100 — ${a.lyricalDensity >= 75 ? 'Prioritize dense, layered lyric writing with internal rhyme, syllabic precision, and compound imagery.' : a.lyricalDensity >= 40 ? 'Moderate lyrical complexity — clear lines with occasional internal texture.' : 'Simple, direct language; clarity over complexity.'}
Structural Logic: ${a.structuralLogic}/100 — ${a.structuralLogic >= 75 ? 'Apply rigorous structural analysis; label every section, identify tension/release arcs, and suggest formal improvements.' : a.structuralLogic >= 40 ? 'Note structural patterns but prioritize creative flow over strict form.' : 'Minimal structural commentary; follow the creator\'s instinct.'}
Emotional Range: ${a.emotionalRange}/100 — ${a.emotionalRange >= 75 ? 'Engage the full emotional spectrum; do not shy away from darkness, grief, or ecstasy.' : a.emotionalRange >= 40 ? 'Moderate emotional engagement; acknowledge feeling without over-dramatizing.' : 'Keep emotional commentary restrained and analytical.'}
Provenance Depth: ${a.provenanceDepth}/100 — ${a.provenanceDepth >= 75 ? 'Actively connect this work to the creator\'s archive, prior pieces, and long-term legacy.' : a.provenanceDepth >= 40 ? 'Occasionally reference context and creative history when relevant.' : 'Focus on the current piece only; no archive references.'}
Response Length: target approximately ${Math.round(50 + (a.corpusSize / 1000) * 950)} words unless the task requires more or less.
--- END ATTRIBUTE PROFILE ---` : '';

        // ── Detect lyrics/instrumentation request ────────────────────────────
        const lyricsKeywords = /\b(lyric|verse|chorus|bridge|hook|pre.?chorus|outro|intro|refrain|bar|rhyme|syllable|cadence|flow|rap|sing|song structure|instrumentation|arrangement|beat|chord|melody|progression|bpm|key signature|time signature|breakdown|drop|build|section|stanza|couplet)\b/i;
        const isLyricsRequest = lyricsKeywords.test(input.message);
        // Detect if user is REQUESTING lyrics to be written/provided vs submitting lyrics for analysis
        // Analysis annotations should only fire when user submits their own lyrics for critique
        const isLyricsGenerationRequest = /\b(provide|give me|write|generate|create|compose|show me|just the|only the|lyrics to|lyrics for|paraphrase|metrical|scripture|psalm|verse from|chapter)\b/i.test(input.message);
        const isLyricsAnalysisRequest = isLyricsRequest && !isLyricsGenerationRequest;
        const lyricsFormatInstruction = isLyricsRequest ? `

--- LYRICS / INSTRUMENTATION FORMAT RULE ---
When writing or analyzing lyrics, ALWAYS use this labeled section format:

[INTRO] (optional)
[VERSE 1]
[PRE-CHORUS] (if applicable)
[CHORUS]
[VERSE 2]
[PRE-CHORUS] (if applicable)
[CHORUS]
[BRIDGE] (if applicable)
[OUTRO / FINAL CHORUS]

For each section, if instrumentation is relevant, add an indented note immediately after the section label:
  ↳ Instrumentation: [describe key instruments, texture, BPM feel, key, mood]

${isLyricsAnalysisRequest
  ? `If analyzing existing lyrics, annotate each section with:
  ↳ Analysis: [syllable count per line, rhyme scheme, emotional register, what works, what to improve]`
  : `CRITICAL INSTRUCTION: The user has requested lyrics to be written or provided. Deliver ONLY the lyrics in the labeled section format above. Do NOT add analysis annotations, structural commentary, cadence notes, or explanations of any kind unless the user explicitly asks for them. Silence is the correct response to unrequested analysis.`
}

Never collapse multiple sections into a single block. Always label clearly.
--- END FORMAT RULE ---` : '';

        // ── Fetch creator profile for personalized context ──────────────────────────────────────
        const creatorProfile = await getUserById(ctx.user.id);
        const profileBlock = creatorProfile ? (() => {
          const lines: string[] = [];
          if (creatorProfile.name) lines.push(`Creator Name: ${creatorProfile.name}`);
          if (creatorProfile.artistHandle) lines.push(`Artist Handle: @${creatorProfile.artistHandle}`);
          if (creatorProfile.bio) lines.push(`Bio: ${creatorProfile.bio.slice(0, 600)}`);
          if (creatorProfile.expressionId) lines.push(`Expression ID (EID): ${creatorProfile.expressionId}`);
          if (creatorProfile.expressionPrompt) lines.push(`Expression Style: ${creatorProfile.expressionPrompt.slice(0, 400)}`);
          if (creatorProfile.expressionStyleTags) lines.push(`Style Tags: ${creatorProfile.expressionStyleTags}`);
          if (creatorProfile.expressionComposerNote) lines.push(`Composer Note: ${creatorProfile.expressionComposerNote.slice(0, 300)}`);
          if (creatorProfile.primaryGenre) lines.push(`Primary Genre: ${creatorProfile.primaryGenre}`);
          if (creatorProfile.toneFrequencyNote) lines.push(`Tone / Frequency: ${creatorProfile.toneFrequencyNote}`);
          if (creatorProfile.dominantKey) lines.push(`Dominant Key: ${creatorProfile.dominantKey}`);
          if (creatorProfile.tempoRange) lines.push(`Tempo Range: ${creatorProfile.tempoRange}`);
          if (creatorProfile.energyProfile) lines.push(`Energy Profile: ${creatorProfile.energyProfile}`);
          if (creatorProfile.location) lines.push(`Location: ${creatorProfile.location}`);
          if (lines.length === 0) return '';
          return `\n--- CREATOR IDENTITY PROFILE ---\n${lines.join('\n')}\n--- END CREATOR PROFILE ---`;
        })() : '';
        const systemPrompt = PERSONA_PROMPTS[input.persona] + profileBlock + attrBlock + lyricsFormatInstruction;

        // Build message array — history first, then current turn
        const historyMessages = (input.history ?? []).map(h => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        }));

        // Build the current user message — text + optional images
        let userContent: any;
        if (input.imageUrls && input.imageUrls.length > 0) {
          userContent = [
            { type: 'text', text: input.message },
            ...input.imageUrls.map(url => ({
              type: 'image_url',
              image_url: { url, detail: 'high' },
            })),
          ];
        } else {
          userContent = input.message;
        }

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...historyMessages,
          { role: 'user' as const, content: userContent },
        ];

        const response = await invokeLLM({ messages, maxTokens: 800 });
        const reply = response?.choices?.[0]?.message?.content ?? 'The Keeper is momentarily silent. Try again.';
        return { reply, persona: input.persona };
      }),

    /** Save a note from the Keeper sandbox to the DB */
    saveNote: protectedProcedure
      .input(z.object({
        personaId: z.string().max(64).default('guide'),
        title: z.string().max(256).optional(),
        content: z.string().min(1).max(50000),
        imageUrl: z.string().url().optional(),
        tag: z.string().max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { keeperNotes } = await import('../drizzle/schema');
        // Auto-generate title from first line if not provided
        const title = input.title?.trim() ||
          input.content.split('\n')[0].slice(0, 80).trim() ||
          'Untitled Note';
        const [result] = await db.insert(keeperNotes).values({
          userId: ctx.user.id,
          personaId: input.personaId,
          title,
          content: input.content,
          imageUrl: input.imageUrl ?? null,
          tag: input.tag ?? null,
        });
        return { id: (result as any).insertId, title };
      }),

    /** List the current user's saved notes, newest first */
    listNotes: protectedProcedure
      .input(z.object({
        personaId: z.string().optional(),
        tag: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const { keeperNotes } = await import('../drizzle/schema');
        const { eq, and, desc } = await import('drizzle-orm');
        const conditions: any[] = [eq(keeperNotes.userId, ctx.user.id)];
        if (input?.personaId) conditions.push(eq(keeperNotes.personaId, input.personaId));
        if (input?.tag) conditions.push(eq(keeperNotes.tag, input.tag));
        const notes = await db.select()
          .from(keeperNotes)
          .where(and(...conditions))
          .orderBy(desc(keeperNotes.createdAt))
          .limit(input?.limit ?? 50);
        return notes;
      }),

    /** Delete a saved note */
    deleteNote: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { keeperNotes } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.delete(keeperNotes)
          .where(and(eq(keeperNotes.id, input.id), eq(keeperNotes.userId, ctx.user.id)));
        return { success: true };
      }),

    /** Upload a custom portrait image to S3 and store the URL */
    uploadCustomPortrait: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const buf = Buffer.from(input.imageBase64, 'base64');
        const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
        const key = `keeper-portraits/${ctx.user.id}/${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buf, input.mimeType);
        const db = await getDb();
        if (db) {
          const { keeperSkins } = await import('../drizzle/schema');
          const { eq, and } = await import('drizzle-orm');
          const existing = await db.select().from(keeperSkins)
            .where(and(eq(keeperSkins.userId, ctx.user.id), eq(keeperSkins.skinId, "custom")))
            .limit(1);
          if (existing.length > 0) {
            await db.update(keeperSkins).set({ portraitUrl: url })
              .where(and(eq(keeperSkins.userId, ctx.user.id), eq(keeperSkins.skinId, "custom")));
          } else {
            await db.insert(keeperSkins).values({
              userId: ctx.user.id,
              skinId: "custom",
              skinName: "Custom Portrait",
              portraitUrl: url,
              capabilities: ["Custom presence", "Your face, your rules"],
              isActive: false,
              isCustom: true,
              unlockedAt: Date.now(),
            });
          }
        }
        return { url };
      }),

    /** Transcribe voice audio to text via Whisper */
    transcribeVoice: protectedProcedure
      .input(z.object({
        audioBase64: z.string(),
        mimeType: z.enum(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]),
        language: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { transcribeAudio } = await import('./_core/voiceTranscription');
        const ext = input.mimeType.split('/')[1].replace('mpeg', 'mp3');
        const key = `keeper-voice/${ctx.user.id}/${Date.now()}.${ext}`;
        const buf = Buffer.from(input.audioBase64, 'base64');
        const { url: audioUrl } = await storagePut(key, buf, input.mimeType);
        const result = await transcribeAudio({
          audioUrl,
          language: input.language,
          prompt: 'Transcribe creative lyrics or spoken word content',
        });
        if ('error' in result) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (result as any).error });
        return { text: (result as any).text, language: (result as any).language };
      }),

    /** Generate artwork from a text prompt */
    generateArtwork: protectedProcedure
      .input(z.object({
        prompt: z.string().max(1000),
        styleTags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generateImage } = await import('./_core/imageGeneration');
        const fullPrompt = input.styleTags?.length
          ? `${input.prompt}. Style: ${input.styleTags.join(', ')}`
          : input.prompt;
        const genResult = await generateImage({ prompt: fullPrompt });
        if (!genResult?.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Image generation failed' });
        // Re-upload to our S3 so it persists permanently
        const imgRes = await fetch(genResult.url);
        const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
        const key = `keeper-artwork/${ctx.user.id}/${Date.now()}.png`;
        const { url } = await storagePut(key, imgBuf, 'image/png');
        return { url };
      }),

    /** Analyze an image with the Keeper's vision */
    analyzeImage: protectedProcedure
      .input(z.object({
        imageUrl: z.string().url(),
        context: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const systemPrompt = `You are the user's Keeper — a provenance-aware creative companion. Analyze the image provided and describe it in the context of the creator's artistic identity. Comment on visual style, mood, color palette, and how it relates to their creative corpus. Be specific and poetic. Keep response under 200 words.`;
        const userContent: any[] = [
          { type: 'text', text: input.context ? `Context: ${input.context}\n\nAnalyze this image:` : 'Analyze this image:' },
          { type: 'image_url', image_url: { url: input.imageUrl } },
        ];
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        });
        const analysis = response?.choices?.[0]?.message?.content ?? 'The Keeper sees something profound but cannot yet find the words.';
        return { analysis };
      }),
    // ─── Character Sheet Procedures ───────────────────────────────────────────
    listPresets: publicProcedure.query(() => {
      const sheetAttributeDefaults: Record<string, { tone: string; voice: string; frameworks: string[]; restrictions: string[]; customNotes: string }> = {
        witness: { tone: 'Quiet authority, poetic, reflective', voice: 'First-person witness, speaks as a trusted companion', frameworks: ['Testimony', 'Emotional depth', 'Provenance'], restrictions: [], customNotes: '' },
        conductor: { tone: 'Precise, architectural, constructive', voice: 'Third-person director, speaks as a master arranger', frameworks: ['Structure', 'Arrangement', 'Architecture'], restrictions: [], customNotes: '' },
        archivist: { tone: 'Analytical, deep-reading, semantic', voice: 'Scholarly, treats work as corpus evidence', frameworks: ['Archive', 'Semantics', 'Corpus analysis'], restrictions: [], customNotes: '' },
        sovereign: { tone: 'Authoritative, protective, legacy-focused', voice: 'Guardian voice, speaks of IP and provenance', frameworks: ['IP protection', 'Provenance', 'Legacy'], restrictions: [], customNotes: '' },
        cipher: { tone: 'Experimental, boundary-pushing, identity-exploring', voice: 'Fluid, challenges conventions', frameworks: ['Experimentation', 'Boundary-pushing', 'Identity'], restrictions: [], customNotes: '' },
      };
      return KEEPER_PRESETS.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        persona: p.persona,
        attributes: p.attributes,
        sheetAttributes: sheetAttributeDefaults[p.id] ?? { tone: '', voice: '', frameworks: [], restrictions: [], customNotes: '' },
        mediumContext: p.mediumContext,
        capabilities: p.capabilities,
        accentColor: p.accentColor,
        badge: p.badge,
      }));
    }),

    getActiveSheet: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      try {
        const { keeperCharacterSheets } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        const rows = await db
          .select()
          .from(keeperCharacterSheets)
          .where(eq(keeperCharacterSheets.userId, ctx.user.id))
          .orderBy(desc(keeperCharacterSheets.updatedAt))
          .limit(1);
        return rows[0] ?? null;
      } catch {
        return null;
      }
    }),

    saveSheet: protectedProcedure
      .input(z.object({
        presetId: z.string(),
        name: z.string().max(100).optional(),
        persona: z.string().optional(),
        mediumContext: z.record(z.string(), z.unknown()).optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { keeperCharacterSheets } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const existing = await db
          .select({ id: keeperCharacterSheets.id })
          .from(keeperCharacterSheets)
          .where(eq(keeperCharacterSheets.userId, ctx.user.id))
          .limit(1);
        const preset = KEEPER_PRESETS.find(p => p.id === input.presetId);
        const sheetData = {
          userId: ctx.user.id,
          presetId: input.presetId,
          name: input.name ?? preset?.name ?? input.presetId,
          persona: input.persona ?? preset?.persona ?? input.presetId,
          mediumContext: JSON.stringify(input.mediumContext ?? preset?.mediumContext ?? {}),
          attributes: JSON.stringify(input.attributes ?? preset?.attributes ?? {}),
          isActive: 1,
          updatedAt: new Date(),
        };
        if (existing.length > 0) {
          await db.update(keeperCharacterSheets).set(sheetData).where(eq(keeperCharacterSheets.userId, ctx.user.id));
          return { id: existing[0].id };
        } else {
          const result = await db.insert(keeperCharacterSheets).values({ ...sheetData, createdAt: new Date() });
          return { id: (result as any)[0]?.insertId ?? 0 };
        }
      }),

  }),
  // ─── Marketplace ──────────────────────────────────────────────────────────────
  marketplace: router({
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
        const { marketplaceItems, users } = await import('../drizzle/schema');
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
        const { marketplaceItems, users } = await import('../drizzle/schema');
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
        const { marketplaceItems } = await import('../drizzle/schema');
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
        const { marketplacePurchases } = await import('../drizzle/schema');
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
      const { marketplacePurchases, marketplaceItems, users } = await import('../drizzle/schema');
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
      const { marketplacePurchases, marketplaceItems } = await import('../drizzle/schema');
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
        const { marketplaceItems } = await import('../drizzle/schema');
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
        const { marketplaceItems } = await import('../drizzle/schema');
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
      const { marketplaceItems } = await import('../drizzle/schema');
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
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (!me || me.role !== 'founder') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only founders may submit avatars to the marketplace.' });
        }
        const { marketplaceItems } = await import('../drizzle/schema');
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
        const { marketplaceItems, users } = await import('../drizzle/schema');
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
        const { users } = await import('../drizzle/schema');
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
        const { marketplaceItems, users } = await import('../drizzle/schema');
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
  }),

  // ─── Satchel (Provenance Event Ledger for CreatorSurface/Writer) ─────────────
  satchel: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getProvenanceEventsByCreator(ctx.user.id, input?.limit ?? 200);
      }),

    checkpoint: protectedProcedure
      .input(z.object({
        payloadText: z.string(),
        parentEventId: z.string().max(64).nullable().optional(),
        sessionLabel: z.string().max(128).nullable().optional(),
        privateKeyHex: z.string().optional(), // client-side signing (optional)
      }))
      .mutation(async ({ ctx, input }) => {
        const crypto = await import("crypto");
        const eventId = crypto.createHash("sha256").update(input.payloadText).digest("hex");
        return insertProvenanceEvent({
          eventId,
          creatorId: ctx.user.id,
          actionType: "checkpoint",
          parentEventId: input.parentEventId ?? null,
          payloadCanonical: input.payloadText,
          sessionLabel: input.sessionLabel ?? null,
        });
      }),

    anchor: protectedProcedure
      .input(z.object({
        payloadText: z.string(),
        parentEventId: z.string().max(64).nullable().optional(),
        sessionLabel: z.string().max(128).nullable().optional(),
        privateKeyHex: z.string().optional(),
        originType: z.enum(["original", "derived", "assisted"]).optional(),
        sourceRefs: z.array(z.string()).optional(),
        transformationType: z.enum(["rewrite", "remix", "extension"]).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const crypto = await import("crypto");
        const eventId = crypto.createHash("sha256").update(input.payloadText).digest("hex");
        const result = await insertProvenanceEvent({
          eventId,
          creatorId: ctx.user.id,
          actionType: "anchor",
          parentEventId: input.parentEventId ?? null,
          payloadCanonical: input.payloadText,
          sessionLabel: input.sessionLabel ?? null,
          origin: {
            origin_type: input.originType ?? "original",
            source_refs: input.sourceRefs ?? [],
            transformation_type: input.transformationType ?? null,
          },
        });
        // Return wid (same as eventId for anchor events)
        return { ...result, wid: eventId };
      }),

    fork: protectedProcedure
      .input(z.object({
        originEventId: z.string().max(64),
        payloadText: z.string(),
        sessionLabel: z.string().max(128).nullable().optional(),
        privateKeyHex: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const crypto = await import("crypto");
        const eventId = crypto.createHash("sha256").update(input.payloadText + input.originEventId).digest("hex");
        return insertProvenanceEvent({
          eventId,
          creatorId: ctx.user.id,
          actionType: "fork",
          parentEventId: input.originEventId,
          payloadCanonical: input.payloadText,
          sessionLabel: input.sessionLabel ?? null,
          origin: { origin_type: "derived", source_refs: [input.originEventId], transformation_type: null },
        });
      }),

    latestCheckpoint: protectedProcedure
      .query(async ({ ctx }) => {
        return getLatestProvenanceCheckpoint(ctx.user.id);
      }),
  }),

  // ─── PPG (Personal Provenance Guide — AI writing assistant for CreatorSurface) ─
  ppg: router({
    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().max(4000),
        context: z.string().max(8000).optional(),
        sessionLabel: z.string().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const systemPrompt = `You are the Personal Provenance Guide (PPG) for ${ctx.user.name ?? "a creator"} on Living Nexus. 
You help creators develop their writing, lyrics, manuscripts, and creative works. 
You understand provenance — every word belongs to its creator. 
Be concise, generative, and creatively useful. Respond in plain text suitable for a writing editor.`;
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
        ];
        if (input.context) {
          messages.push({ role: "user", content: `Current draft:\n\n${input.context}` });
          messages.push({ role: "assistant", content: "I have your draft in context. How can I help?" });
        }
        messages.push({ role: "user", content: input.prompt });
        const response = await invokeLLM({ messages });
        const text = response.choices?.[0]?.message?.content ?? "";
        return { text, sessionLabel: input.sessionLabel ?? null };
      }),
  }),

  agents: router({
    /** Get or create the Personal Nexus Agent for the current user. */
    me: protectedProcedure.query(async ({ ctx }) => getOrCreateAgent(ctx.user.id)),
    /** Alias used by CreatorSurface — same as me. */
    getOrCreate: protectedProcedure.query(async ({ ctx }) => getOrCreateAgent(ctx.user.id)),
    /** Send a message to the agent for style analysis or creative assistance. */
    message: protectedProcedure
      .input(z.object({ content: z.string().min(1), context: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const agent = await getOrCreateAgent(ctx.user.id);
        const sysPrompt = `You are a Personal Nexus Agent — a creative intelligence bonded to this creator. You help them develop their voice, analyze their work, and evolve their style. Be concise and generative.`;
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: sysPrompt },
        ];
        if (input.context) messages.push({ role: "user", content: `Context:\n${input.context}` });
        messages.push({ role: "user", content: input.content });
        const response = await invokeLLM({ messages });
        const text = response.choices?.[0]?.message?.content ?? "";
        return { text, agentId: agent.id };
      }),
    /** Update the agent's style fingerprint after a session. */
    updateFingerprint: protectedProcedure
      .input(z.object({
        agentId: z.number().int().positive(),
        styleFingerprint: z.object({
          tone: z.array(z.string()),
          structure_patterns: z.array(z.string()),
          common_transforms: z.array(z.string()),
        }),
        frozenTraits: z.object({ voice_constraints: z.array(z.string()) }).optional(),
      }))
      .mutation(async ({ input }) => {
        await updateAgentFingerprint(input.agentId, input.styleFingerprint, input.frozenTraits);
        return { ok: true };
      }),
  }),

  userCollections: router({
    /** List all collections for the current user, with track counts */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserCollections(ctx.user.id);
    }),
    /** Create a new collection */
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(128), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        return createUserCollection(ctx.user.id, input.name, input.description);
      }),
    /** Rename / update description of a collection */
    rename: protectedProcedure
      .input(z.object({ collectionId: z.number(), name: z.string().min(1).max(128), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await renameUserCollection(ctx.user.id, input.collectionId, input.name, input.description);
        return { ok: true };
      }),
    /** Delete a collection and all its tracks */
    delete: protectedProcedure
      .input(z.object({ collectionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteUserCollection(ctx.user.id, input.collectionId);
        return { ok: true };
      }),
    /** Get tracks in a collection */
    getTracks: protectedProcedure
      .input(z.object({ collectionId: z.number() }))
      .query(async ({ input }) => {
        return getUserCollectionTracks(input.collectionId);
      }),
    /** Add a track to a collection */
    addTrack: protectedProcedure
      .input(z.object({ collectionId: z.number(), songId: z.number() }))
      .mutation(async ({ input }) => {
        return addTrackToUserCollection(input.collectionId, input.songId);
      }),
    /** Remove a track from a collection */
    removeTrack: protectedProcedure
      .input(z.object({ collectionId: z.number(), songId: z.number() }))
      .mutation(async ({ input }) => {
        await removeTrackFromUserCollection(input.collectionId, input.songId);
        return { ok: true };
      }),
    /** Reorder tracks in a collection by providing the ordered array of entry IDs */
    reorderTracks: protectedProcedure
      .input(z.object({ collectionId: z.number(), orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await reorderUserCollectionTracks(input.collectionId, input.orderedIds);
        return { ok: true };
      }),
  }),

  // ─── Activation (Stage-Based Funding) ────────────────────────────────────
  activation: router({
    /** Get activation state for a song (public). */
    getForSong: publicProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getActivationForSong(input.songId);
      }),

    /** Get recent contributions for a song (public). */
    getContributions: publicProcedure
      .input(z.object({ songId: z.number().int().positive(), limit: z.number().int().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        return getActivationContributions(input.songId, input.limit);
      }),

    /** Create a Stripe Checkout session for an activation contribution. */
    contribute: protectedProcedure
      .input(z.object({
        songId: z.number().int().positive(),
        stageId: z.string().min(1),
        amountCents: z.number().int().min(100).max(1000000), // $1 – $10,000
        message: z.string().max(500).optional(),
        anonymous: z.boolean().default(false),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!stripe) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe not configured' });
        // Verify activation is enabled on this song
        const activation = await getActivationForSong(input.songId);
        if (!activation?.activationEnabled) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Activation is not enabled for this work' });
        }
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              unit_amount: input.amountCents,
              product_data: { name: 'Activation Contribution' },
            },
            quantity: 1,
          }],
          metadata: {
            type: 'activation',
            songId: input.songId.toString(),
            stageId: input.stageId,
            userId: ctx.user.id.toString(),
            contributorName: ctx.user.name ?? '',
            message: input.message ?? '',
            anonymous: input.anonymous ? '1' : '0',
          },
          success_url: `${input.origin}/song/${input.songId}?activation=success`,
          cancel_url: `${input.origin}/song/${input.songId}?activation=cancelled`,
        });
        return { url: session.url };
      }),

    /** Admin: enable/disable activation and set stages for a song (owner only). */
    configure: protectedProcedure
      .input(z.object({
        songId: z.number().int().positive(),
        activationEnabled: z.boolean(),
        stages: z.array(z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          goalCents: z.number().int().min(100),
          reachedAt: z.string().nullable().default(null),
        })).max(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const isOwner = await verifySongOwnership(input.songId, ctx.user.id);
        if (!isOwner) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this work' });
        }
        await configureSongActivation(input.songId, {
          activationEnabled: input.activationEnabled,
          stages: input.stages,
        });
        return { ok: true };
      }),
  }),

  evidence: router({
    /** List all evidence for a song, newest first */
    list: publicProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getEvidenceForSong(input.songId);
      }),

    /** Add a new evidence item (owner-only) */
    add: protectedProcedure
      .input(z.object({
        songId: z.number().int().positive(),
        type: z.enum(["file", "link", "note"]),
        title: z.string().min(1).max(256),
        url: z.string().optional(),
        noteBody: z.string().optional(),
        hash: z.string().optional(),
        metadataJson: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify the user owns this song
        const owned = await verifySongOwnership(input.songId, ctx.user.id);
        if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this work." });
        return addEvidence({
          songId: input.songId,
          addedByUserId: ctx.user.id,
          type: input.type,
          title: input.title,
          url: input.url ?? null,
          noteBody: input.noteBody ?? null,
          hash: input.hash ?? null,
          metadataJson: input.metadataJson ?? null,
        });
      }),

    /** Delete an evidence item (owner-only) */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const ok = await deleteEvidence(input.id, ctx.user.id);
        if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Not found or not authorized." });
        return { success: true };
      }),

    /** Upload a file to S3 and return url + sha256 hash */
    uploadFile: protectedProcedure
      .input(z.object({
        songId: z.number().int().positive(),
        filename: z.string().min(1),
        mimeType: z.string().min(1),
        base64: z.string().min(1),   // base64-encoded file bytes
      }))
      .mutation(async ({ ctx, input }) => {
        const owned = await verifySongOwnership(input.songId, ctx.user.id);
        if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this work." });
        const bytes = Buffer.from(input.base64, "base64");
        if (bytes.byteLength > 16 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File must be under 16 MB." });
        }
        // Compute SHA-256 hash for chain-of-custody
        const { createHash } = await import("crypto");
        const hash = createHash("sha256").update(bytes).digest("hex");
        const suffix = Date.now().toString(36);
        const key = `evidence/${ctx.user.id}/${input.songId}/${suffix}-${input.filename}`;
        const { url } = await storagePut(key, bytes, input.mimeType);
        return { url, hash, key };
      }),
  }),

  wids: router({
    /** Look up a WID and its associated provenance event. Returns flattened shape for WIDLookup page. */
    lookup: publicProcedure
      .input(z.object({ wid: z.string().min(1) }))
      .query(async ({ input }) => {
        const result = await getWidWithEvent(input.wid);
        if (!result) return null;
        // Flatten wid row fields to top level for WIDLookup.tsx
        return {
          ...result.wid,
          creator: result.creator,
          event: result.event,
        };
      }),
    /** Register a new WID for a provenance anchor event. */
    register: protectedProcedure
      .input(z.object({
        wid: z.string().min(1),
        eventId: z.string().min(1),
        contentHash: z.string().min(1),
        signature: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return insertWid({ ...input, creatorId: ctx.user.id });
      }),
  }),

  // ─── Guide Entities ──────────────────────────────────────────────────────────
  guides: router({
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
        const { users } = await import("../drizzle/schema");
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

         const { generateImage } = await import('./_core/imageGeneration');
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

         const { generateImage } = await import('./_core/imageGeneration');
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
    }),

  // ─── Quiver (Private Image Vault) ───────────────────────────────────────────────
  quiver: router({
    /**
     * Save a generated image to the user's private Quiver vault.
     * Called automatically by the client immediately after generation.
     */
    save: protectedProcedure
      .input(z.object({
        url: z.string().url(),
        prompt: z.string().min(1).max(2000),
        enrichedPrompt: z.string().optional(),
        widId: z.string().optional(),
        guideId: z.number().int().positive().optional(),
        referenceImageUrl: z.string().url().optional(),
        isRemix: z.boolean().default(false),
        title: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { quiverImages } = await import('../drizzle/schema');
        const db = await getDb();
        const [row] = await db.insert(quiverImages).values({
          userId: ctx.user.id,
          url: input.url,
          prompt: input.prompt,
          enrichedPrompt: input.enrichedPrompt,
          widId: input.widId,
          guideId: input.guideId,
          referenceImageUrl: input.referenceImageUrl,
          isRemix: input.isRemix,
          title: input.title,
        });
        return { id: (row as any).insertId as number };
      }),

    /**
     * List the authenticated user's quiver images with optional search.
     * Results are paginated (newest first, 20 per page).
     */
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        guideId: z.number().int().positive().optional(),
        page: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(50).default(20),
      }))
      .query(async ({ ctx, input }) => {
        const { quiverImages } = await import('../drizzle/schema');
        const { eq: eqOp, and: andOp, or: orOp, desc: descOp, like: likeOp } = await import('drizzle-orm');
        const db = await getDb();
        const { search, guideId, page, limit } = input;
        const offset = page * limit;
        // Search matches prompt text OR WID string (case-insensitive LIKE)
        const searchFilter = search
          ? orOp(likeOp(quiverImages.prompt, `%${search}%`), likeOp(quiverImages.widId, `%${search}%`))
          : undefined;
        const conditions = [
          eqOp(quiverImages.userId, ctx.user.id),
          ...(searchFilter ? [searchFilter] : []),
          ...(guideId ? [eqOp(quiverImages.guideId, guideId)] : []),
        ];
        const rows = await db
          .select()
          .from(quiverImages)
          .where(andOp(...conditions))
          .orderBy(descOp(quiverImages.createdAt))
          .limit(limit)
          .offset(offset);
        return rows;
      }),

    /**
     * Delete a quiver image (owner only).
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { quiverImages } = await import('../drizzle/schema');
        const { eq: eqOp, and: andOp } = await import('drizzle-orm');
        const db = await getDb();
        const [img] = await db.select().from(quiverImages).where(
          andOp(eqOp(quiverImages.id, input.id), eqOp(quiverImages.userId, ctx.user.id))
        ).limit(1);
        if (!img) throw new TRPCError({ code: 'NOT_FOUND', message: 'Image not found in your quiver.' });
        await db.delete(quiverImages).where(eqOp(quiverImages.id, input.id));
        return { ok: true };
      }),

    /**
     * Update the title of a quiver image (owner only).
     */
    updateTitle: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), title: z.string().max(255) }))
      .mutation(async ({ ctx, input }) => {
        const { quiverImages } = await import('../drizzle/schema');
        const { eq: eqOp, and: andOp } = await import('drizzle-orm');
        const db = await getDb();
        await db.update(quiverImages)
          .set({ title: input.title })
          .where(andOp(eqOp(quiverImages.id, input.id), eqOp(quiverImages.userId, ctx.user.id)));
        return { ok: true };
      }),

    /**
     * Publish a quiver image to the creator's public gallery.
     * Sets registeredAsWid=true and requires a title.
     * Also unpublishes if registeredAsWid=false.
     */
    setPublished: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        published: z.boolean(),
        title: z.string().min(1).max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { quiverImages } = await import('../drizzle/schema');
        const { eq: eqOp, and: andOp } = await import('drizzle-orm');
        const db = await getDb();
        const [img] = await db.select().from(quiverImages).where(
          andOp(eqOp(quiverImages.id, input.id), eqOp(quiverImages.userId, ctx.user.id))
        ).limit(1);
        if (!img) throw new TRPCError({ code: 'NOT_FOUND', message: 'Image not found in your quiver.' });
        if (input.published && !input.title && !img.title) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A title is required to publish an image to your gallery.' });
        }
        const updates: Record<string, unknown> = { registeredAsWid: input.published };
        if (input.title) updates.title = input.title;
        await db.update(quiverImages).set(updates).where(eqOp(quiverImages.id, input.id));
        return { ok: true };
      }),
  }),

  // ─── Global Search ─────────────────────────────────────────────────────────
  search: router({
    global: publicProcedure
      .input(z.object({ q: z.string().min(1).max(200) }))
      .query(async ({ input }): Promise<SearchResults> => {
        return globalSearch(input.q);
      }),
  }),

  // ─── Creator Domain Engine ─────────────────────────────────────────────────
  domain: router({
    /**
     * Get the domain layout for a creator (public — for rendering the domain page).
     * Returns the DEFAULT_DOMAIN_LAYOUT if the creator has not yet saved a custom layout.
     */
    getLayout: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const blocks = await getDomainBlocks(input.userId);
        return blocks;
      }),

    /**
     * Get the authenticated user's own domain layout (for the editor).
     */
    getMyLayout: protectedProcedure
      .query(async ({ ctx }) => {
        const blocks = await getDomainBlocks(ctx.user.id);
        return blocks;
      }),

    /**
     * Save a new domain layout. Automatically creates a provenance version snapshot.
     */
    saveLayout: protectedProcedure
      .input(z.object({
        blocks: z.array(z.object({
          blockType: z.string().max(64),
          position: z.number().int().min(0),
          visible: z.boolean(),
          size: z.enum(["small", "medium", "large", "full"]),
          config: z.record(z.string(), z.unknown()).nullable(),
        })),
        changeNote: z.string().max(512).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const versionNumber = await saveDomainLayout(
          ctx.user.id,
          input.blocks,
          input.changeNote,
        );
        return { success: true, versionNumber };
      }),

    /**
     * Get the version history for a creator's domain (provenance trail).
     */
    getVersionHistory: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        return getDomainVersions(ctx.user.id, input.limit);
      }),

    /**
     * Get the version history for a creator's domain (public — for the provenance trail block).
     */
    getPublicVersionHistory: publicProcedure
      .input(z.object({ userId: z.number().int().positive(), limit: z.number().int().min(1).max(20).default(10) }))
      .query(async ({ input }) => {
        return getDomainVersions(input.userId, input.limit);
      }),
  }),

  // ─── Manifested Collections ─────────────────────────────────────────────────
  collections: router({
    /** Get a public collection by slug (with tracks + owner info). */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const row = await getManifestedCollectionBySlug(input.slug);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        if (!row.collection.isPublic && row.collection.ownerId !== ctx.user?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const tracks = await getCollectionTracksWithSongs(row.collection.id);
        const following = ctx.user ? await isFollowingCollection(row.collection.id, ctx.user.id) : false;
        return { ...row, tracks, following };
      }),

    /** List all public collections (discovery feed). */
    listPublic: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(20), offset: z.number().int().min(0).default(0) }))
      .query(async ({ input }) => {
        return getPublicCollections(input.limit, input.offset);
      }),

    /** List collections owned by a specific user (public only unless self). */
    listByUser: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const includePrivate = ctx.user?.id === input.userId;
        return getManifestedCollectionsByOwner(input.userId, includePrivate);
      }),

    /** List the current user's own collections (all, including private). */
    listMine: protectedProcedure.query(async ({ ctx }) => {
      return getManifestedCollectionsByOwner(ctx.user.id, true);
    }),

    /** Create a new Manifested Collection. */
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        description: z.string().max(1000).optional(),
        purpose: z.string().max(2000).optional(),
        coverArtUrl: z.string().url().optional(),
        isPublic: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        return createManifestedCollection({ ownerId: ctx.user.id, ...input });
      }),

    /** Update collection metadata (owner only). */
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().max(1000).optional(),
        purpose: z.string().max(2000).optional(),
        coverArtUrl: z.string().url().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateManifestedCollection(id, ctx.user.id, data);
        return { success: true };
      }),

    /** Delete a collection (owner only). */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteManifestedCollection(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Add a track to a collection (owner only). */
    addTrack: protectedProcedure
      .input(z.object({
        collectionId: z.number().int().positive(),
        songId: z.number().int().positive(),
        note: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const col = await getManifestedCollectionById(input.collectionId);
        if (!col || col.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await addTrackToManifestedCollection(input.collectionId, input.songId, ctx.user.id, input.note ?? null);
        return { success: true };
      }),

    /** Remove a track from a collection (owner only). */
    removeTrack: protectedProcedure
      .input(z.object({
        collectionId: z.number().int().positive(),
        songId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const col = await getManifestedCollectionById(input.collectionId);
        if (!col || col.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await removeTrackFromManifestedCollection(input.collectionId, input.songId);
        return { success: true };
      }),

    /** Toggle follow/unfollow on a collection. */
    toggleFollow: protectedProcedure
      .input(z.object({ collectionId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return toggleCollectionFollow(input.collectionId, ctx.user.id);
      }),

    /** Fork a collection — creates a copy under the current user with provenance lineage. */
    fork: protectedProcedure
      .input(z.object({ collectionId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const col = await getManifestedCollectionById(input.collectionId);
        if (!col) throw new TRPCError({ code: "NOT_FOUND" });
        if (!col.isPublic && col.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const ownerName = ctx.user.name ?? ctx.user.artistHandle ?? "Unknown";
        return forkManifestedCollection(input.collectionId, ctx.user.id, ownerName);
      }),

    /** Get tracks for a collection by ID — used for Play All on profile shelves. */
    getTracksById: publicProcedure
      .input(z.object({ collectionId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const col = await getManifestedCollectionById(input.collectionId);
        if (!col) throw new TRPCError({ code: "NOT_FOUND" });
        // Only allow if public, or if the requesting user owns it
        if (!col.isPublic && col.ownerId !== ctx.user?.id) throw new TRPCError({ code: "FORBIDDEN" });
        return getCollectionTracksWithSongs(input.collectionId);
            }),
  }),
});

export type AppRouter = typeof appRouter;
