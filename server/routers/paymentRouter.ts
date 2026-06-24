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
// Domain Router: paymentRouter
// Namespaces: tips, licenses, supporters, livingArchive, paymentIntegrity, marketplace, satchel, ppg
// ─────────────────────────────────────────────────────────────────────────

export const tipsProcedures = router({
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


export const licensesProcedures = router({
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
  });


export const supportersProcedures = router({
    /** Public Founding Creators list — users with role='founder', public */
    getFoundingCreators: publicProcedure.query(async () => {
      const founders = await listFounders();
      // Attach WID count for each founder
      const { getDb } = await import("../utils/db");
      const db = await getDb();
      if (!db) return founders.map((f: typeof founders[0]) => ({ ...f, widCount: 0 }));
      const { sql: sqlFn, eq: eqFn, and: andFn } = await import("drizzle-orm");
      const { songs: songsTable } = await import("../../drizzle/schema");
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
  });


export const livingArchiveProcedures = router({
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
  });


export const paymentIntegrityProcedures = router({
    /** Admin: manually trigger a payment integrity check */
    triggerRun: adminProcedure
      .mutation(async () => {
        const { runPaymentIntegrityCheck } = await import('../workers/paymentIntegrityWorker');
        return runPaymentIntegrityCheck();
      }),
    /** Admin: get recent reconciliation log entries */
    getLogs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { paymentReconciliationLog } = await import('../../drizzle/schema');
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
        const { paymentReconciliationLog } = await import('../../drizzle/schema');
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
  });


export const marketplaceProcedures = router({
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


export const satchelProcedures = router({
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
  });


export const ppgProcedures = router({
    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().max(4000),
        context: z.string().max(8000).optional(),
        sessionLabel: z.string().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("../_core/llm");
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
  });