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
import { invokeLLM } from "./_core/llm";
import {
  addComment, createSong, deleteSong, getAllCreators,
  getCommentsBySong, getPublicSongs, getSongById,
  getSongsByUser, getSongWithCreator, getTipsBySong, reorderSongs,
  getUserById, incrementPlayCount, recordDownload,
  recordLicense, recordSlotPurchase, recordTip,
  updateSongLyrics, updateSongLyricsWithWid, updateSongStatus, getRelatedSongs, updateSongVideo,
  updateUserProfile, updateUserStripeAccount,
  createAiTransform, updateAiTransform, getAiTransformById,
  getAiTransformsBySong, getAiTransformsByUser,
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
  getAllSupporters, getSupporterByUserId, recordPlatformGift,
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
} from "./db";
import { FOUNDER_PRICE_EARLY_CENTS, FOUNDER_PRICE_LATE_CENTS, FOUNDER_THRESHOLD, LICENSE_PRICE_CENTS, LICENSE_SLOTS, SLOT_PACKAGES, getSlotPackage, type SlotPackageId } from "./livingArchiveProducts";
import { ENV } from "./_core/env";
import { getOrGenerateEmbedVideo } from "./embedVideo";
import { enqueueVisualJob } from "./visualQueue";
import { notifyOwner } from "./_core/notification";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" as any });
const PLATFORM_FEE_PERCENT = 10;

// ── Build stats — updated via env vars on each deploy ──
const BUGS_FIXED = parseInt(process.env.BUGS_FIXED ?? "222", 10);
const TOTAL_COMMITS = parseInt(process.env.TOTAL_COMMITS ?? "554", 10);

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

export const appRouter = router({
  system: systemRouter,
  qr: qrRouter,
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
  }),

  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => getUserById(ctx.user.id)),
    getById: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => getUserById(input.userId)),
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
      primaryGenre: z.string().max(64).optional(),
      avatarObjectPosition: z.string().max(32).optional(),
      bannerPositionX: z.number().min(0).max(100).optional(),
      bannerPositionY: z.number().min(0).max(100).optional(),
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
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(`avatars/${ctx.user.id}-${Date.now()}.jpg`, buffer, input.mimeType);
      await updateUserProfile(ctx.user.id, { profilePhotoUrl: url });
      return { url };
    }),
    uploadBanner: protectedProcedure.input(z.object({ base64: z.string(), mimeType: z.string() })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(`banners/${ctx.user.id}-${Date.now()}.jpg`, buffer, input.mimeType);
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
    discover: publicProcedure.input(z.object({ genre: z.string().optional(), search: z.string().optional(), limit: z.number().max(500).optional(), offset: z.number().optional(), randomize: z.boolean().optional(), seed: z.number().optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic"]).optional() }).optional()).query(async ({ input }) => getPublicSongs(input ?? {})),
    trending: publicProcedure.input(z.object({ genre: z.string().optional(), limit: z.number().max(500).optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic"]).optional() }).optional()).query(async ({ input }) => getTrendingWorks(input ?? {})),
    newThisWeek: publicProcedure.input(z.object({ genre: z.string().optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic"]).optional(), limit: z.number().max(100).optional() }).optional()).query(async ({ input }) => getNewThisWeek(input ?? {})),
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
      lyricsText: z.string().max(20000).optional(),
      lyricsHash: z.string().optional(),
      isLyricsOnly: z.boolean().optional(),
      contentType: z.enum(["audio", "lyrics", "manuscript", "comic"]).optional(),
      fileHash: z.string().optional(), witnessId: z.string().optional(),
      harmonicSignature: z.array(z.number()).optional(), ecdsaPublicKey: z.string().optional(), ecdsaSignature: z.string().optional(),
      caption: z.string().max(2000).nullable().optional(),
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
      // Fallback: legacy base64 cover path
      if (!coverArtUrl && input.coverBase64 && input.coverMimeType) {
        const coverBuffer = Buffer.from(input.coverBase64, "base64");
        const { url } = await storagePut(`covers/${ctx.user.id}/${Date.now()}.jpg`, coverBuffer, input.coverMimeType);
        coverArtUrl = url;
      }
      // Determine HAAI declared timestamp if all 6 fields are provided
      const haaiFields = [input.haaiVisualConcept, input.haaiStyleLanguage, input.haaiInstrumentation, input.haaiVocalConveyance, input.haaiLyricalInspiration, input.haaiEmotionalTone];
      const haaiDeclaredAt = (input.aiDisclosure === "human_authored_ai_instrument" && haaiFields.every(f => f && f.trim().length > 0)) ? new Date() : undefined;
      const insertResult = await createSong({ userId: ctx.user.id, title: input.title, genre: input.genre, bpm: input.bpm, keySignature: input.keySignature, moodTags: input.moodTags, coWriters: input.coWriters, albumName: input.albumName, creditsJson: input.creditsJson, releaseDate: input.releaseDate, isrc: input.isrc, aiConsent: input.aiConsent, lyricsText: input.lyricsText, lyricsHash: input.lyricsHash, isLyricsOnly: input.isLyricsOnly ?? false, contentType: input.contentType ?? (input.isLyricsOnly ? "lyrics" : "audio"), fileUrl, fileKey: audioKey, coverArtUrl, fileHash: input.fileHash, witnessId: input.witnessId, harmonicSignature: input.harmonicSignature, ecdsaPublicKey: input.ecdsaPublicKey, ecdsaSignature: input.ecdsaSignature, caption: input.caption, durationSeconds: input.durationSeconds, sampleRate: input.sampleRate, bitDepth: input.bitDepth, aiDisclosure: input.aiDisclosure, haaiVisualConcept: input.haaiVisualConcept, haaiStyleLanguage: input.haaiStyleLanguage, haaiInstrumentation: input.haaiInstrumentation, haaiVocalConveyance: input.haaiVocalConveyance, haaiLyricalInspiration: input.haaiLyricalInspiration, haaiEmotionalTone: input.haaiEmotionalTone, haaiDeclaredAt, pagesJson: input.pagesJson } as any);
       const songId = (insertResult as any).insertId as number;
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
      return { success: true, fileUrl, coverArtUrl, songId };
    }),
    uploadCoverArt: protectedProcedure.input(z.object({
      songId: z.number(),
      coverBase64: z.string(),
      coverMimeType: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const coverBuffer = Buffer.from(input.coverBase64, "base64");
      const ext = input.coverMimeType.includes("png") ? "png" : "jpg";
      const { url } = await storagePut(`covers/${ctx.user.id}/${Date.now()}-edit.${ext}`, coverBuffer, input.coverMimeType);
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
        const coverBuffer = Buffer.from(input.coverBase64, "base64");
        const { url } = await storagePut(`covers/${ctx.user.id}/${Date.now()}-album.jpg`, coverBuffer, input.coverMimeType);
        coverArtUrl = url;
      }
      // Create song records (files already uploaded via /api/upload-file)
      // Track insertId in upload order so linkSongsToCollection preserves sequence
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
          coverArtUrl: track.coverArtUrl ?? coverArtUrl,
          fileHash: track.fileHash,
          witnessId: track.witnessId,
          harmonicSignature: track.harmonicSignature,
          ecdsaPublicKey: track.ecdsaPublicKey,
          ecdsaSignature: track.ecdsaSignature,
        });
        // Capture the auto-increment ID directly from the insert result to preserve upload order
        const songId = (insertResult as any).insertId as number | undefined;
        results.push({ title: track.title, witnessId: track.witnessId, fileUrl, songId });
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
        collectionId = (insertResult as any).insertId as number;

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
      const collection = await getCollectionByWid(input.collectionWid);
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
      // On publish: ensure visual pipeline is triggered
      if (input.status === "Published") {
        const isFounder = (ctx.user as any).role === "founder";
        enqueueVisualJob(input.songId, isFounder).catch(err => console.error("[VisualQueue] Enqueue error:", err));
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

    // ── AI Transform ──────────────────────────────────────────────────────────
    aiTransform: protectedProcedure.input(z.object({
      songId: z.number(),
      prompt: z.string().min(1).max(500),
      style: z.string().max(128).optional(),
      tags: z.array(z.string()).max(10).optional(),
    })).mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Song not found" });
      if (!song.fileUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Song has no audio file" });

      // Create DB record first
      const insertResult = await createAiTransform({
        originalSongId: input.songId,
        userId: ctx.user.id,
        prompt: input.prompt,
        style: input.style,
        tags: input.tags,
        originalWitnessId: song.witnessId ?? undefined,
      });
      const transformId = (insertResult as any).insertId as number;

      // Kick off Sonauto generation asynchronously
      const sonautoApiKey = process.env.SONAUTO_API_KEY || "";
      const requestBody: Record<string, unknown> = {
        prompt: input.prompt,
        num_songs: 1,
      };
      if (input.style) requestBody.style = input.style;
      if (input.tags && input.tags.length > 0) requestBody.tags = input.tags;

      // Fire-and-forget: start Sonauto task, poll in background
      (async () => {
        try {
          // Submit generation request
          const genRes = await fetch("https://api.sonauto.ai/v1/generations", {
            method: "POST",
            headers: { "Authorization": `Bearer ${sonautoApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });
          if (!genRes.ok) {
            const errText = await genRes.text();
            await updateAiTransform(transformId, { status: "failed", errorMessage: `Sonauto API error: ${errText}` });
            return;
          }
          const genData = await genRes.json() as { task_id: string };
          const taskId = genData.task_id;
          await updateAiTransform(transformId, { sonautoTaskId: taskId, status: "processing" });

          // Poll until complete (max 3 minutes)
          const maxAttempts = 36; // 36 * 5s = 180s
          for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const pollRes = await fetch(`https://api.sonauto.ai/v1/generations/${taskId}`, {
              headers: { "Authorization": `Bearer ${sonautoApiKey}` },
            });
            if (!pollRes.ok) continue;
            const pollData = await pollRes.json() as { status: string; song_paths?: string[] };
            if (pollData.status === "SUCCESS" && pollData.song_paths && pollData.song_paths.length > 0) {
              const outputUrl = pollData.song_paths[0];
              await updateAiTransform(transformId, { status: "success", outputUrl });
              return;
            } else if (pollData.status === "FAILURE") {
              await updateAiTransform(transformId, { status: "failed", errorMessage: "Sonauto generation failed" });
              return;
            }
          }
          await updateAiTransform(transformId, { status: "failed", errorMessage: "Generation timed out" });
        } catch (err: any) {
          await updateAiTransform(transformId, { status: "failed", errorMessage: err.message });
        }
      })();

      return { transformId, status: "processing" as const };
    }),

    getTransformStatus: protectedProcedure.input(z.object({ transformId: z.number() })).query(async ({ ctx, input }) => {
      const transform = await getAiTransformById(input.transformId);
      if (!transform || transform.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return transform;
    }),

    getTransforms: publicProcedure.input(z.object({ songId: z.number() })).query(async ({ input }) => {
      return getAiTransformsBySong(input.songId);
    }),
    getMyTransforms: protectedProcedure.query(async ({ ctx }) => {
      return getAiTransformsByUser(ctx.user.id);
    }),
    getLiked: protectedProcedure.query(async ({ ctx }) => {
      return getLikedSongs(ctx.user.id);
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
        // NOTE: content is intentionally NOT accepted here.
        // Per platform policy, only title and genre/category are sent to AI.
        // Lyrics, manuscripts, and audio are WID-protected and must never be sent to external AI systems.
      }))
      .mutation(async ({ input }) => {
        const workType = input.workType ?? "audio";
        const workLabel = workType === "audio" ? "music track" : workType === "lyrics" ? "lyrics work" : workType === "manuscript" ? "manuscript or book" : "comic or graphic novel";
        const creatorLabel = workType === "audio" || workType === "lyrics" ? "musician/songwriter" : workType === "manuscript" ? "author" : "comic creator";
        const systemPrompt = `You are a caption writer for Living Nexus, a sovereign creative provenance platform. Your job is to write a short, compelling caption/description for a ${workLabel} that a creator is uploading. The caption should:
- Be 1-3 sentences (50-150 words max)
- Capture the spirit and feel of the work based on its title and category only
- Sound authentic and creator-voiced — not corporate or generic
- Avoid clichés like "a journey" or "sonic landscape"
- Match the medium: for a ${workLabel}, speak as if introducing a ${creatorLabel}'s work
- End with energy — make someone want to experience it
Return ONLY the caption text. No quotes. No labels. No explanation.`;

        // IMPORTANT: Only title and genre/category are sent. Content is NEVER sent.
        const userMessage = `${workType === "manuscript" || workType === "comic" ? "Work" : "Track"} title: "${input.title}"
${workType === "manuscript" || workType === "comic" ? "Category" : "Genre"}: ${input.genre || "Not specified"}`;;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        });

        const caption = (response as any)?.choices?.[0]?.message?.content?.trim() ?? "";
        if (!caption) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Caption generation failed. Please try again." });
        return { caption };
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
  }),
  comments: router({
    list: publicProcedure.input(z.object({ songId: z.number() })).query(async ({ input }) => getCommentsBySong(input.songId)),
    add: publicProcedure.input(z.object({ songId: z.number(), content: z.string().min(1).max(1000), authorName: z.string().max(128).optional() })).mutation(async ({ ctx, input }) => {
      // Events is the primary write target
      const actorName = input.authorName || ctx.user?.artistHandle || ctx.user?.name || "Anonymous";
      await createEvent({
        type: "COMMENT",
        workId: input.songId,
        workType: "song",
        actorId: ctx.user?.id,
        actorName,
        payload: { content: input.content },
      });
      // Secondary write: comments table for legacy queries
      await addComment({ songId: input.songId, userId: ctx.user?.id, authorName: actorName, content: input.content });
      // Notify the song owner if commenter is a different user
      if (ctx.user?.id) {
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
      }
      return { success: true };
    }),
    addReply: publicProcedure
      .input(z.object({
        songId: z.number(),
        parentId: z.number(),
        content: z.string().min(1).max(1000),
        authorName: z.string().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const actorName = input.authorName || ctx.user?.artistHandle || ctx.user?.name || "Anonymous";
        // Insert reply with parentId
        await addComment({
          songId: input.songId,
          userId: ctx.user?.id,
          authorName: actorName,
          content: input.content,
          parentId: input.parentId,
        });
        // Notify the parent comment author if they are a different logged-in user
        if (ctx.user?.id) {
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
        }
        return { success: true };
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

  // ── External Playlists (Phase 7) ─────────────────────────────────────────────
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
});
export type AppRouter = typeof appRouter;
