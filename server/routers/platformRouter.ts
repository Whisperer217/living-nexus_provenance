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
// Domain Router: platformRouter
// Namespaces: platform, testimony, playlist, playlists, notifications, globalActivity, books, externalPlaylists, projects
// ─────────────────────────────────────────────────────────────────────────

export const platformProcedures = router({
    /** Public — returns build stats shown on the founder's creator card */
    getBuildStats: publicProcedure.query(() => ({
      bugsFixed: BUGS_FIXED,
      totalCommits: TOTAL_COMMITS,
    })),
  });


export const testimonyProcedures = router({
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
  });


export const playlistProcedures = router({
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
  });


export const playlistsProcedures = router({
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


export const notificationsProcedures = router({
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
  });


export const globalActivityProcedures = router({
    /** Public activity feed — recent tips, comments, and likes across the platform */
    feed: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(20).default(8) }).optional())
      .query(async ({ input }) => {
        return getGlobalActivityFeed(input?.limit ?? 8);
      }),
  });


export const booksProcedures = router({
    /** Check if the current user has purchased a book */
    hasPurchased: publicProcedure
      .input(z.object({ songId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) return { purchased: false };
        const db = await getDb();
        const { bookPurchases } = await import("../../drizzle/schema");
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
  });


export const externalPlaylistsProcedures = router({
    // Import a playlist from a URL (YouTube or Suno)
    import: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        sourceUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("../utils/db");
        const db = await getDb();
        const { externalPlaylists } = await import("../../drizzle/schema");

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
      const { getDb } = await import("../utils/db");
      const db = await getDb();
      const { externalPlaylists } = await import("../../drizzle/schema");
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
        const { getDb } = await import("../utils/db");
        const db = await getDb();
        const { externalPlaylists } = await import("../../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");

        await db
          .delete(externalPlaylists)
          .where(and(
            eq(externalPlaylists.id, input.id),
            eq(externalPlaylists.userId, ctx.user.id),
          ));
        return { success: true };
      }),
  });


export const projectsProcedures = router({
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