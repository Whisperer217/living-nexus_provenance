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
// Domain Router: witnessRouter
// Namespaces: witness, witnessSubscription, imageGallery, reference, witnessRegistry, guides, quiver, domain, collections
// ─────────────────────────────────────────────────────────────────────────

export const witnessProcedures = router({
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
          const { broadcastEvent } = await import("../services/sse");
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
  });


export const witnessSubscriptionProcedures = router({
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
  });


export const imageGalleryProcedures = router({
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
  });


export const referenceProcedures = router({
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
  });


export const witnessRegistryProcedures = router({
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
  });


export const guidesProcedures = router({
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


export const quiverProcedures = router({
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
        const { quiverImages } = await import('../../drizzle/schema');
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
        const { quiverImages } = await import('../../drizzle/schema');
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
        const { quiverImages } = await import('../../drizzle/schema');
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
        const { quiverImages } = await import('../../drizzle/schema');
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
        const { quiverImages } = await import('../../drizzle/schema');
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
  });


export const domainProcedures = router({
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
  });


export const collectionsProcedures = router({
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
  });