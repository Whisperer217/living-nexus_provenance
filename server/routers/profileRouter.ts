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
// Domain Router: profileRouter
// Namespaces: auth, profile, fieldNotes, onboarding, declaration, agents, userCollections, wids
// ─────────────────────────────────────────────────────────────────────────

export const authProcedures = router({
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
      const { generateKeypair: genKp } = await import("../services/provenance");
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      if (user.publicKey) return { publicKeyHex: user.publicKey, alreadyExists: true };
      const { privateKeyHex, publicKeyHex } = await genKp();
      await setUserPublicKey(ctx.user.id, publicKeyHex);
      return { publicKeyHex, privateKeyHex, alreadyExists: false };
    }),
  });


export const profileProcedures = router({
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


export const fieldNotesProcedures = router({
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
  });


export const onboardingProcedures = router({
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
  });


export const declarationProcedures = router({
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
  });


export const agentsProcedures = router({
    /** Get or create the Personal Nexus Agent for the current user. */
    me: protectedProcedure.query(async ({ ctx }) => getOrCreateAgent(ctx.user.id)),
    /** Alias used by CreatorSurface — same as me. */
    getOrCreate: protectedProcedure.query(async ({ ctx }) => getOrCreateAgent(ctx.user.id)),
    /** Send a message to the agent for style analysis or creative assistance. */
    message: protectedProcedure
      .input(z.object({ content: z.string().min(1), context: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("../_core/llm");
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
  });


export const userCollectionsProcedures = router({
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
  });


export const widsProcedures = router({
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
  });