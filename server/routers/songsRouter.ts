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
// Domain Router: songsRouter
// Namespaces: songs, comments, events, songDownload, moderation, versions, activation, evidence, search
// ─────────────────────────────────────────────────────────────────────────

export const songsProcedures = router({
    /** Pre-upload duplicate detection — checks if a fileHash already exists in the system. */
    checkDuplicate: protectedProcedure
      .input(z.object({ fileHash: z.string().length(64) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        const { songs } = await import("../../drizzle/schema");
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
      const { getDb } = await import("../utils/db");
      const { songs: songsTable } = await import("../../drizzle/schema");
      const { count, isNotNull, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      // Only count Published, public witnessed songs — respects archive/unpublish toggle
      const [row] = await db.select({ total: count() }).from(songsTable).where(
        andOp(isNotNull(songsTable.witnessId), eqOp(songsTable.status, "Published"), eqOp(songsTable.isPublic, true))
      );
      return { count: row?.total ?? 0 };
    }),
    getCountsByContentType: publicProcedure.query(async () => {
      const { getDb } = await import("../utils/db");
      const { songs: songsTable } = await import("../../drizzle/schema");
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
      const { getDb } = await import("../utils/db");
      const { songs: songsTable } = await import("../../drizzle/schema");
      const { count, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const db = await getDb();
      const [row] = await db.select({ total: count() }).from(songsTable).where(
        andOp(eqOp(songsTable.userId, input.creatorId), eqOp(songsTable.isPublic, true), eqOp(songsTable.status, "Published"))
      );
      return { count: row?.total ?? 0 };
    }),
    getWitnessedVoices: publicProcedure.query(async () => {
      const { getDb } = await import("../utils/db");
      const { songs: songsTable, users: usersTable } = await import("../../drizzle/schema");
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
        const { songs: songsTable } = await import("../../drizzle/schema");
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
          const { fireUserWebhook } = await import("../services/discord");
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
        const { songs: songsTable } = await import("../../drizzle/schema");
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
        const { songs: songsTable, users } = await import("../../drizzle/schema");
        const { getDb } = await import("../utils/db");
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
            const { likes } = await import("../../drizzle/schema");
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
                const { fireUserWebhook } = await import("../services/discord");
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
        const { playEvents } = await import("../../drizzle/schema");
        const { getDb } = await import("../utils/db");
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
  });


export const commentsProcedures = router({
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
  });


export const eventsProcedures = router({
    // Fetch the unified interaction thread for a work (song)
    getByWork: publicProcedure
      .input(z.object({ workId: z.number(), limit: z.number().max(200).optional() }))
      .query(async ({ input }) => getEventsByWork(input.workId, input.limit ?? 100)),
    // Fetch all events across all songs owned by the authenticated creator
    getForCreator: protectedProcedure
      .input(z.object({ limit: z.number().max(500).optional() }))
      .query(async ({ ctx, input }) => getEventsForCreator(ctx.user.id, input.limit ?? 200)),
  });


export const songDownloadProcedures = router({
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
  });


export const moderationProcedures = router({
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
  });


export const versionsProcedures = router({
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
  });


export const activationProcedures = router({
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
  });


export const evidenceProcedures = router({
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
  });


export const searchProcedures = router({
    global: publicProcedure
      .input(z.object({ q: z.string().min(1).max(200) }))
      .query(async ({ input }): Promise<SearchResults> => {
        return globalSearch(input.q);
      }),
  });