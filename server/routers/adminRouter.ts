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
                const { fireUserWebhook } = await import("../services/discord");
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
          const { bookPurchases } = await import("../../drizzle/schema");
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


// ─────────────────────────────────────────────────────────────────────────
// Domain Router: adminRouter
// Namespaces: admin, promo, discord, audit, worker
// ─────────────────────────────────────────────────────────────────────────

export const adminProcedures = router({
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


export const promoProcedures = router({
    /** Redeem a promo code to activate a Creator License */
    redeem: protectedProcedure
      .input(z.object({ code: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const result = await redeemPromoCode(ctx.user.id, input.code);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
        return result;
      }),
  });


export const discordProcedures = router({
    /** Get all webhook configs for the current user */
    getWebhooks: protectedProcedure.query(async ({ ctx }) => {
      const { getWebhooksForUser } = await import("../services/discord");
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
        const { upsertWebhook } = await import("../services/discord");
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
        const { discordWebhooks } = await import("../../drizzle/schema");
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
        const { discordWebhooks } = await import("../../drizzle/schema");
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
        const { testWebhookUrl } = await import("../services/discord");
        const result = await testWebhookUrl(input.event, input.webhookUrl);
        return result;
      }),
  });


export const auditProcedures = router({
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
  });


export const workerProcedures = router({
    /** Admin: manually trigger a self-improvement run */
    triggerRun: adminProcedure
      .mutation(async ({ ctx }) => {
        const { runSelfImprovementCycle } = await import('../workers/selfImprovementWorker');
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
        const { getSelfImprovementRuns } = await import('../workers/selfImprovementWorker');
        return getSelfImprovementRuns(input.limit ?? 20);
      }),

    /** Admin: get a single run by ID */
    getRunById: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const { getSelfImprovementRunById } = await import('../workers/selfImprovementWorker');
        return getSelfImprovementRunById(input.id);
      }),

    /** Admin: get all findings for a run */
    getFindingsByRun: adminProcedure
      .input(z.object({ runId: z.number().int() }))
      .query(async ({ input }) => {
        const { getFindingsByRun } = await import('../workers/selfImprovementWorker');
        return getFindingsByRun(input.runId);
      }),

    /** Admin: revert a specific applied fix */
    revertFinding: adminProcedure
      .input(z.object({ findingId: z.number().int() }))
      .mutation(async ({ input }) => {
        const { revertFinding } = await import('../workers/selfImprovementWorker');
        return revertFinding(input.findingId);
      }),
  });