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
// Domain Router: keeperRouter
// Namespaces: promptStudio, keeper
// ─────────────────────────────────────────────────────────────────────────

export const promptStudioProcedures = router({
    /** Return the saved EID + expression prompt for any creator (public) */
    getProfileExpression: publicProcedure
      .input(z.object({ creatorId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const { users: usersTable } = await import("../../drizzle/schema");
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
        const { users: usersTable } = await import("../../drizzle/schema");
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
        const { users } = await import("../../drizzle/schema");
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
  });


export const keeperProcedures = router({
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
      const { keeperSkins, songs, witnesses } = await import('../../drizzle/schema');
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
        const { keeperSkins } = await import('../../drizzle/schema');
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
        const { keeperSkins } = await import('../../drizzle/schema');
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
        const { keeperNotes } = await import('../../drizzle/schema');
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
        const { keeperNotes } = await import('../../drizzle/schema');
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
        const { keeperNotes } = await import('../../drizzle/schema');
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
          const { keeperSkins } = await import('../../drizzle/schema');
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
        const { transcribeAudio } = await import('../_core/voiceTranscription');
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
        const { generateImage } = await import('../_core/imageGeneration');
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
        const { keeperCharacterSheets } = await import('../../drizzle/schema');
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
        const { keeperCharacterSheets } = await import('../../drizzle/schema');
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

  });