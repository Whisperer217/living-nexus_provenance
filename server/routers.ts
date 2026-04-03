import Stripe from "stripe";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { normalizationRouter } from "./routers/normalization";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import {
  addComment, createSong, deleteSong, getAllCreators,
  getCommentsBySong, getPublicSongs, getSongById,
  getSongsByUser, getSongWithCreator, getTipsBySong,
  getUserById, incrementPlayCount, recordDownload,
  recordLicense, recordSlotPurchase, recordTip,
  updateSongLyrics, updateSongLyricsWithWid, updateSongStatus, getRelatedSongs, updateSongVideo,
  updateUserProfile, updateUserStripeAccount,
  createAiTransform, updateAiTransform, getAiTransformById,
  getAiTransformsBySong, getAiTransformsByUser,
  getLikedSongs, toggleLike, getLikeStatus, getLikeCount, getBulkLikeStatuses,
  getJukeboxQueue, addToJukeboxQueue, markJukeboxItemPlayed, markJukeboxItemSkipped,
  getSongByWitnessId, updateSongMetadata, getRecentTips,
  getPlaylist, addToPlaylist, removeFromPlaylist, isInPlaylist,
  getUserTipTotalForSong, updateSongDownloadPermission,
  getAllUsersWithStats, markWelcomeSeen, getCreatorAnalytics,
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
  archiveNotification, getUnreadNotificationCount,
  getWitnessRegistry,
  createJukeboxOffering, updateJukeboxOfferingStatus,
  getOfferingsForRoom, recordJukeboxPlayEvent, getJukeboxEarningsForCreator,
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
  getSongsWithoutEmbedVideo,
  reorderMySongs,
  archiveAudioVersion, replaceAudioFile, getAudioVersions,
  logAdminAction, getAdminLogs,
  flagSong, unflagSong, adminRemoveSong, adminRestoreSong, adminSearchWorks,
  getAllSystemConfig, getSystemConfigValue, setSystemConfigValue,
  resetUserBilling, getAllUsersAdmin,
  recordPlayEvent, getPlayAuditStats, MIN_PLAY_SECONDS,
  createTestimony, getTestimoniesByCreator, getTestimonyByWid, getTestimonyCount,
} from "./db";
import { ENV } from "./_core/env";
import { getOrGenerateEmbedVideo } from "./embedVideo";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" as any });
const PLATFORM_FEE_PERCENT = 10;

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
        // Platform gift (Founder's Era): record supporter status
        if (meta.type === "platform_gift" && meta.userId) {
          const amountUsd = (session.amount_total ?? 0) / 100;
          const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;
          await recordPlatformGift(parseInt(meta.userId), amountUsd, paymentIntentId);
        }
        // Jukebox tip: auto-queue song when payment completes (webhook path)
        if (meta.type === "jukebox_tip" && meta.roomCode && meta.songId && meta.tipperId) {
          const amountCents = session.amount_total ?? 100;
          const tipperName = meta.tipperName || "A listener";
          await addToJukeboxQueue({
            roomCode: meta.roomCode,
            songId: parseInt(meta.songId),
            tipperId: parseInt(meta.tipperId),
            tipperName,
            tipAmountCents: amountCents,
            stripeSessionId: session.id,
          });
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
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}

export const appRouter = router({
  system: systemRouter,

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
      aiDisclosure: z.enum(["original", "ai_assisted", "ai_generated"]).optional(),
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
      // Return up to 12 creators with most published tracks for the homepage carousel
      const all = await getAllCreators();
      return all.slice(0, 12);
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
  }),

  songs: router({
    discover: publicProcedure.input(z.object({ genre: z.string().optional(), search: z.string().optional(), limit: z.number().max(100).optional(), offset: z.number().optional(), randomize: z.boolean().optional(), seed: z.number().optional(), contentType: z.enum(["audio", "lyrics", "manuscript", "comic"]).optional() }).optional()).query(async ({ input }) => getPublicSongs(input ?? {})),
    trending: publicProcedure.input(z.object({ genre: z.string().optional(), limit: z.number().max(100).optional() }).optional()).query(async ({ input }) => getTrendingWorks(input ?? {})),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getSongWithCreator(input.id)),
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
      };
    }),
    // Public counters for homepage trust layer
    getWitnessedCount: publicProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { songs: songsTable } = await import("../drizzle/schema");
      const { count, isNotNull } = await import("drizzle-orm");
      const db = await getDb();
      const [row] = await db.select({ total: count() }).from(songsTable).where(isNotNull(songsTable.witnessId));
      return { count: row?.total ?? 0 };
    }),
    getCountsByContentType: publicProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { songs: songsTable } = await import("../drizzle/schema");
      const { count, eq: eqOp, or, isNull } = await import("drizzle-orm");
      const db = await getDb();
      const countFor = async (ct: string) => {
        const [row] = await db.select({ total: count() }).from(songsTable)
          .where(eqOp(songsTable.contentType as any, ct));
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
      const { isNotNull, desc: descOp, eq: eqOp } = await import("drizzle-orm");
      const db = await getDb();
      // Grab up to 10 most recent publicly-visible witnessed songs with creator info
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
        .where(isNotNull(songsTable.witnessId))
        .orderBy(descOp(songsTable.createdAt))
        .limit(10);
      return rows;
    }),
    mySongs: protectedProcedure.query(async ({ ctx }) => getSongsByUser(ctx.user.id)),
    bySelf: protectedProcedure.query(async ({ ctx }) => getSongsByUser(ctx.user.id)),
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
      releaseDate: z.string().optional(), isrc: z.string().optional(),
      aiConsent: z.enum(["prohibited", "permitted_attribution", "permitted"]),
      lyricsText: z.string().max(20000).optional(),
      lyricsHash: z.string().optional(),
      isLyricsOnly: z.boolean().optional(),
      contentType: z.enum(["audio", "lyrics", "manuscript", "comic"]).optional(),
      fileHash: z.string().optional(), witnessId: z.string().optional(),
      harmonicSignature: z.array(z.number()).optional(), ecdsaPublicKey: z.string().optional(), ecdsaSignature: z.string().optional(),
      caption: z.string().max(2000).optional(),
      // Audio metadata from upload pipeline
      durationSeconds: z.number().optional(),
      sampleRate: z.number().optional(),
      bitDepth: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      if (user.songSlotsUsed >= user.songSlotsTotal) throw new Error("No song slots available. Please purchase more slots.");
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
      const insertResult = await createSong({ userId: ctx.user.id, title: input.title, genre: input.genre, bpm: input.bpm, keySignature: input.keySignature, moodTags: input.moodTags, coWriters: input.coWriters, albumName: input.albumName, releaseDate: input.releaseDate, isrc: input.isrc, aiConsent: input.aiConsent, lyricsText: input.lyricsText, lyricsHash: input.lyricsHash, isLyricsOnly: input.isLyricsOnly ?? false, contentType: input.contentType ?? (input.isLyricsOnly ? "lyrics" : "audio"), fileUrl, fileKey: audioKey, coverArtUrl, fileHash: input.fileHash, witnessId: input.witnessId, harmonicSignature: input.harmonicSignature, ecdsaPublicKey: input.ecdsaPublicKey, ecdsaSignature: input.ecdsaSignature, caption: input.caption, durationSeconds: input.durationSeconds, sampleRate: input.sampleRate, bitDepth: input.bitDepth });
      const songId = (insertResult as any).insertId as number;
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
        // Legacy base64 fields (still accepted for backward compat)
        audioBase64: z.string().max(50_000_000).optional(),
        audioMimeType: z.string().optional(),
        audioFileName: z.string().optional(),
        title: z.string().min(1).max(255),
        fileHash: z.string().optional(),
        witnessId: z.string().optional(),
        harmonicSignature: z.array(z.number()).optional(),
        ecdsaPublicKey: z.string().optional(),
        ecdsaSignature: z.string().optional(),
      })).min(1).max(50),
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      if (user.songSlotsUsed + input.tracks.length > user.songSlotsTotal) {
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
          genre: input.genre,
          albumName: input.albumName,
          aiConsent: input.aiConsent,
          fileUrl,
          fileKey: audioKey,
          coverArtUrl,
          fileHash: track.fileHash,
          witnessId: track.witnessId,
          harmonicSignature: track.harmonicSignature,
          ecdsaPublicKey: track.ecdsaPublicKey,
          ecdsaSignature: track.ecdsaSignature,
        });
        // Capture the auto-increment ID directly from the insert result to preserve upload order
        const songId = (insertResult as any).insertId as number | undefined;
        results.push({ title: track.title, witnessId: track.witnessId, fileUrl, songId });
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
      return { success: true };
    }),
    updateMetadata: protectedProcedure.input(z.object({
      songId: z.number(),
      caption: z.string().max(2000).nullable().optional(),
      genre: z.string().max(64).nullable().optional(),
      collectionTag: z.string().max(128).nullable().optional(),
      coverArtUrl: z.string().url().nullable().optional(),
      aiConsent: z.enum(["prohibited", "permitted_attribution", "permitted"]).optional(),
      status: z.enum(["Draft", "Published", "Unlisted", "Deleted"]).optional(),
      coverPositionX: z.number().min(0).max(100).optional(),
      coverPositionY: z.number().min(0).max(100).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { songId, ...fields } = input;
      await updateSongMetadata(songId, ctx.user.id, fields);
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
      return toggleLike(ctx.user.id, input.songId);
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
     * Bulk fetch like statuses + counts for up to 100 songs in 2 DB queries.
     * Use this instead of batching individual getLikeStatus/getLikeCount calls
     * to avoid HTTP 414 URI Too Long errors on large track lists.
     */
    getBulkLikeStatuses: publicProcedure
      .input(z.object({ songIds: z.array(z.number()).max(100) }))
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
        // NOTE: lyrics are intentionally NOT accepted here.
        // Per platform policy, only title and genre are sent to AI.
        // Lyrics are WID-protected and must never be sent to external AI systems.
      }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are a music caption writer for Living Nexus, a sovereign music platform built on cryptographic provenance. Your job is to write a short, compelling caption/description for a music track that a creator is uploading. The caption should:
- Be 1-3 sentences (50-150 words max)
- Capture the spirit and feel of the track based on its title and genre only
- Sound authentic and creator-voiced — not corporate or generic
- Avoid clichés like "a journey" or "sonic landscape"
- Optionally reference the genre or mood naturally
- End with energy — make someone want to listen
Return ONLY the caption text. No quotes. No labels. No explanation.`;

        // IMPORTANT: Only title and genre are sent. Lyrics and audio are NEVER sent.
        const userMessage = `Track title: "${input.title}"\nGenre: ${input.genre || "Not specified"}`;

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
      const actorName = input.authorName || ctx.user?.name || "Anonymous";
      await createEvent({
        type: "COMMENT",
        workId: input.songId,
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
  // ── Jukebox ───────────────────────────────────────────────────────────────────────────────────────
  jukebox: router({
    // Get current queue (pending items) for a room
    getQueue: publicProcedure
      .input(z.object({ roomCode: z.string().min(1) }))
      .query(async ({ input }) => {
        return getJukeboxQueue(input.roomCode);
      }),

    // Tip a song into the queue — creates Stripe Checkout Session
    tipToQueue: protectedProcedure
      .input(z.object({
        roomCode: z.string().min(1),
        songId: z.number().int().positive(),
        amountCents: z.number().int().min(100), // $1 minimum
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Song not found" });
        const creator = await getUserById(song.userId);
        if (!creator) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
         if (!creator.stripeAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Creator has not enabled tips yet" });
        const acct = await stripe.accounts.retrieve(creator.stripeAccountId);
        if (!acct.charges_enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Creator's Stripe account is still being verified. Gifts are not yet enabled." });
        const tipper = await getUserById(ctx.user.id);
        const tipperName = tipper?.artistHandle || tipper?.name || "A listener";
        const feeAmount = Math.round(input.amountCents * PLATFORM_FEE_PERCENT / 100);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: tipper?.email || undefined,
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: {
                name: `Jukebox Tip — "${song.title}"`,
                description: `Queue "${song.title}" by ${creator.artistHandle || creator.name} in room ${input.roomCode}`,
              },
              unit_amount: input.amountCents,
            },
            quantity: 1,
          }],
          payment_intent_data: {
            application_fee_amount: feeAmount,
            transfer_data: { destination: creator.stripeAccountId },
            metadata: {
              type: "jukebox_tip",
              roomCode: input.roomCode,
              songId: input.songId.toString(),
              tipperId: ctx.user.id.toString(),
              tipperName,
            },
          },
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            type: "jukebox_tip",
            roomCode: input.roomCode,
            songId: input.songId.toString(),
            tipperId: ctx.user.id.toString(),
            tipperName,
          },
          allow_promotion_codes: false,
          success_url: `${input.origin}/together?room=${input.roomCode}&jukebox=success&songId=${input.songId}&amountCents=${input.amountCents}`,
          cancel_url: `${input.origin}/together?room=${input.roomCode}`,
        });

        return { url: session.url, sessionId: session.id };
      }),

    // Called after Stripe success redirect — adds item to queue
    confirmQueue: protectedProcedure
      .input(z.object({
        roomCode: z.string().min(1),
        songId: z.number().int().positive(),
        amountCents: z.number().int().min(100),
        stripeSessionId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tipper = await getUserById(ctx.user.id);
        const tipperName = tipper?.artistHandle || tipper?.name || "A listener";
        await addToJukeboxQueue({
          roomCode: input.roomCode,
          songId: input.songId,
          tipperId: ctx.user.id,
          tipperName,
          tipAmountCents: input.amountCents,
          stripeSessionId: input.stripeSessionId,
        });
        return { success: true };
      }),

    // Free queue — add a song to the jukebox without payment
    freeQueue: protectedProcedure
      .input(z.object({
        roomCode: z.string().min(1),
        songId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Song not found" });
        const queuer = await getUserById(ctx.user.id);
        const queuerName = queuer?.artistHandle || queuer?.name || "A listener";
        await addToJukeboxQueue({
          roomCode: input.roomCode,
          songId: input.songId,
          tipperId: ctx.user.id,
          tipperName: queuerName,
          tipAmountCents: 0,
        });
        return { success: true, songTitle: song.title, queuerName };
      }),
    // Mark the current (first) item as played
    markPlayed: protectedProcedure
      .input(z.object({ itemId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await markJukeboxItemPlayed(input.itemId);
        return { success: true };
      }),

    // Host skips the current item
    skipCurrent: protectedProcedure
      .input(z.object({ itemId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await markJukeboxItemSkipped(input.itemId);
        return { success: true };
      }),
    // Leave a voluntary offering for the room — single Stripe charge, distributed proportionally to creators
    leaveOffering: protectedProcedure
      .input(z.object({
        roomCode: z.string().min(1),
        amountCents: z.number().int().min(100), // $1 minimum
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const gifter = await getUserById(ctx.user.id);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: gifter?.email || undefined,
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: {
                name: `Jukebox Offering — Room ${input.roomCode}`,
                description: `A voluntary offering for the creators playing in room ${input.roomCode}. Distributed proportionally by play count.`,
              },
              unit_amount: input.amountCents,
            },
            quantity: 1,
          }],
          payment_intent_data: {
            metadata: {
              type: "jukebox_offering",
              roomCode: input.roomCode,
              gifterId: ctx.user.id.toString(),
              gifterName: gifter?.artistHandle || gifter?.name || "A listener",
            },
          },
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            type: "jukebox_offering",
            roomCode: input.roomCode,
            gifterId: ctx.user.id.toString(),
          },
          allow_promotion_codes: true,
          success_url: `${input.origin}/together?room=${input.roomCode}&offering=success&amountCents=${input.amountCents}`,
          cancel_url: `${input.origin}/together?room=${input.roomCode}`,
        });
        // Pre-create offering record as pending
        await createJukeboxOffering({
          roomCode: input.roomCode,
          gifterId: ctx.user.id,
          amountCents: input.amountCents,
          status: "pending",
        });
        return { url: session.url, sessionId: session.id };
      }),
    // Record a play event when a song starts playing in a room
    recordPlay: protectedProcedure
      .input(z.object({
        roomCode: z.string().min(1),
        songId: z.number().int().positive(),
        creatorId: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        await recordJukeboxPlayEvent(input);
        return { success: true };
      }),
    // Get offerings and earnings for a room
    getRoomOfferings: publicProcedure
      .input(z.object({ roomCode: z.string().min(1) }))
      .query(async ({ input }) => {
        const offerings = await getOfferingsForRoom(input.roomCode);
        const totalCents = offerings.reduce((sum: number, o: any) => sum + o.amountCents, 0);
        return { offerings, totalCents };
      }),
    // Get jukebox earnings for the logged-in creator (dashboard)
    getMyEarnings: protectedProcedure
      .query(async ({ ctx }) => {
        return getJukeboxEarningsForCreator(ctx.user.id);
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
    getUsers: protectedProcedure
      .input(z.object({
        limit: z.number().int().min(10).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        return getAllUsersWithStats(input?.limit ?? 50, input?.offset ?? 0);
      }),

    /** Search users by name, handle, or email */
    searchUsers: protectedProcedure
      .input(z.object({ query: z.string().min(1).max(128) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        return adminSearchUsers(input.query);
      }),

    /** Directly grant a Creator License + slots to a user */
    grantLicense: protectedProcedure
      .input(z.object({
        userId: z.number().int(),
        slotsGranted: z.number().int().min(1).max(10000).default(100),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        await adminGrantLicense(input.userId, input.slotsGranted);
        return { success: true };
      }),

    /** Create a new promo code */
    createPromoCode: protectedProcedure
      .input(z.object({
        code: z.string().min(3).max(64).regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric with dashes/underscores"),
        description: z.string().max(256).optional(),
        slotsGranted: z.number().int().min(1).max(10000).default(100),
        maxUses: z.number().int().min(1).optional().nullable(),
        expiresAt: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
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
    listCodes: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      return listPromoCodes();
    }),

    /** Deactivate a promo code */
    deactivateCode: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        await deactivatePromoCode(input.id);
        return { success: true };
      }),

    /** Reactivate a promo code */
    reactivateCode: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        await reactivatePromoCode(input.id);
        return { success: true };
      }),
    /**
     * Regenerate a Stripe Connect onboarding link for a user whose account is
     * stuck in "pending" status (e.g. started KYC but never completed it).
     * Returns the onboarding URL so the admin can share it with the creator.
     */
    regenerateStripeOnboarding: protectedProcedure
      .input(z.object({
        userId: z.number().int(),
        returnUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
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
    getNameHistory: protectedProcedure
      .input(z.object({ userId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        return getNameHistory(input.userId);
      }),

    /**
     * Pre-generate embed videos for all songs that don’t have one yet.
     * Runs in the background — returns immediately with a count of songs queued.
     * Admin only.
     */
    preGenerateEmbedVideos: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
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
    embedVideoStatus: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
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

    // ── Works / WIDs Moderation ───────────────────────────────────────────────
    searchWorks: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        moderationStatus: z.enum(["clear", "flagged", "removed"]).optional(),
        limit: z.number().max(100).default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        return adminSearchWorks(input);
      }),

    flagWork: protectedProcedure
      .input(z.object({ songId: z.number().int(), reason: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        await flagSong(input.songId, input.reason);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "flag_work", targetType: "song", targetId: String(input.songId), details: { reason: input.reason } });
        return { ok: true };
      }),

    unflagWork: protectedProcedure
      .input(z.object({ songId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        await unflagSong(input.songId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "unflag_work", targetType: "song", targetId: String(input.songId) });
        return { ok: true };
      }),

    removeWork: protectedProcedure
      .input(z.object({ songId: z.number().int(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        await adminRemoveSong(input.songId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "remove_work", targetType: "song", targetId: String(input.songId), details: { reason: input.reason } });
        return { ok: true };
      }),

    restoreWork: protectedProcedure
      .input(z.object({ songId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        await adminRestoreSong(input.songId);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "restore_work", targetType: "song", targetId: String(input.songId) });
        return { ok: true };
      }),

    // ── System Config ─────────────────────────────────────────────────────────
    getSystemConfig: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        return getAllSystemConfig();
      }),

    setSystemConfig: protectedProcedure
      .input(z.object({ key: z.string().min(1), value: z.string(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        await setSystemConfigValue(input.key, input.value, input.description, ctx.user.id);
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "set_system_config", targetType: "config", targetId: input.key, details: { value: input.value } });
        return { ok: true };
      }),

    // ── Admin Logs ────────────────────────────────────────────────────────────
    getLogs: protectedProcedure
      .input(z.object({ limit: z.number().max(500).default(200) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        return getAdminLogs(input.limit);
      }),

    // ── Stripe Billing Reset ──────────────────────────────────────────────────
    resetBilling: protectedProcedure
      .input(z.object({ userId: z.number().int(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
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
    getAllUsers: protectedProcedure
      .input(z.object({ limit: z.number().max(200).default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        return getAllUsersAdmin(input.limit, input.offset);
      }),

    // ── Update User Role ──────────────────────────────────────────────────────
    setUserRole: protectedProcedure
      .input(z.object({ userId: z.number().int(), role: z.enum(["admin", "user"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
        const db = await (await import("./db")).getDb();
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");
        await db.update(usersTable).set({ role: input.role }).where(eqFn(usersTable.id, input.userId));
        await logAdminAction({ adminId: ctx.user.id, adminName: ctx.user.name, action: "set_user_role", targetType: "user", targetId: String(input.userId), details: { role: input.role } });
        return { ok: true };
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
  }),  // ── Guilds ───────────────────────────────────────────────────────────────────────────────────
  guilds: router({
    /** List all public guilds */
    list: publicProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { guilds } = await import("../drizzle/schema");
      const { eq: eqOp, desc: descOp } = await import("drizzle-orm");
      const db = await getDb();
      return db.select().from(guilds).where(eqOp(guilds.isPublic, true)).orderBy(descOp(guilds.createdAt)).limit(50);
    }),
    /** Get a single guild by slug */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(64) }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { guilds, guildMembers, users: usersTable } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const db = await getDb();
        const [guild] = await db.select().from(guilds).where(eqOp(guilds.slug, input.slug)).limit(1);
        if (!guild) throw new TRPCError({ code: "NOT_FOUND" });
        const members = await db
          .select({ userId: guildMembers.userId, role: guildMembers.role, joinedAt: guildMembers.joinedAt,
            name: usersTable.name, handle: usersTable.artistHandle, avatar: usersTable.profilePhotoUrl })
          .from(guildMembers)
          .leftJoin(usersTable, eqOp(guildMembers.userId, usersTable.id))
          .where(eqOp(guildMembers.guildId, guild.id));
        return { guild, members };
      }),
    /** Create a guild */
    create: protectedProcedure
      .input(z.object({
        slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
        name: z.string().min(1).max(128),
        description: z.string().max(1000).optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { guilds, guildMembers } = await import("../drizzle/schema");
        const db = await getDb();
        const [existing] = await db.select({ id: guilds.id }).from(guilds).where(
          (await import("drizzle-orm")).eq(guilds.slug, input.slug)
        ).limit(1);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Slug already taken" });
        const [result] = await db.insert(guilds).values({
          ...input,
          isPublic: input.isPublic ?? true,
          createdByUserId: ctx.user.id,
        });
        const guildId = (result as any).insertId as number;
        // Creator becomes owner
        await db.insert(guildMembers).values({ guildId, userId: ctx.user.id, role: "owner" });
        return { guildId };
      }),
    /** Get guild mix tracks */
    getMix: publicProcedure
      .input(z.object({ guildId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { guildPlaylistTracks, songs: songsTable, users: usersTable } = await import("../drizzle/schema");
        const { eq: eqOp, asc } = await import("drizzle-orm");
        const db = await getDb();
        return db
          .select({
            id: guildPlaylistTracks.id,
            songId: guildPlaylistTracks.songId,
            position: guildPlaylistTracks.position,
            addedAt: guildPlaylistTracks.addedAt,
            title: songsTable.title,
            coverArtUrl: songsTable.coverArtUrl,
            witnessId: songsTable.witnessId,
            fileUrl: songsTable.fileUrl,
            addedByName: usersTable.name,
            addedByHandle: usersTable.artistHandle,
            addedByAvatar: usersTable.profilePhotoUrl,
          })
          .from(guildPlaylistTracks)
          .leftJoin(songsTable, eqOp(guildPlaylistTracks.songId, songsTable.id))
          .leftJoin(usersTable, eqOp(guildPlaylistTracks.addedByUserId, usersTable.id))
          .where(eqOp(guildPlaylistTracks.guildId, input.guildId))
          .orderBy(asc(guildPlaylistTracks.position));
      }),
    /** Add a track to the guild mix */
    addToMix: protectedProcedure
      .input(z.object({ guildId: z.number().int().positive(), songId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { guildMembers, guildPlaylistTracks } = await import("../drizzle/schema");
        const { eq: eqOp, and, max } = await import("drizzle-orm");
        const db = await getDb();
        const [membership] = await db.select().from(guildMembers)
          .where(and(eqOp(guildMembers.guildId, input.guildId), eqOp(guildMembers.userId, ctx.user.id)))
          .limit(1);
        if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a guild member" });
        const [{ maxPos }] = await db.select({ maxPos: max(guildPlaylistTracks.position) })
          .from(guildPlaylistTracks).where(eqOp(guildPlaylistTracks.guildId, input.guildId));
        await db.insert(guildPlaylistTracks).values({
          guildId: input.guildId,
          songId: input.songId,
          addedByUserId: ctx.user.id,
          position: (maxPos ?? -1) + 1,
        });
        return { ok: true };
      }),
    /** Join a public guild */
    join: protectedProcedure
      .input(z.object({ guildId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { guilds, guildMembers } = await import("../drizzle/schema");
        const { eq: eqOp, and } = await import("drizzle-orm");
        const db = await getDb();
        const [guild] = await db.select().from(guilds).where(eqOp(guilds.id, input.guildId)).limit(1);
        if (!guild || !guild.isPublic) throw new TRPCError({ code: "FORBIDDEN" });
        const [existing] = await db.select().from(guildMembers)
          .where(and(eqOp(guildMembers.guildId, input.guildId), eqOp(guildMembers.userId, ctx.user.id)))
          .limit(1);
        if (existing) return { ok: true }; // already a member
        await db.insert(guildMembers).values({ guildId: input.guildId, userId: ctx.user.id, role: "member" });
        return { ok: true };
      }),
    /** My guilds */
    mine: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { guilds, guildMembers } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const db = await getDb();
      return db
        .select({ id: guilds.id, slug: guilds.slug, name: guilds.name, avatarUrl: guilds.avatarUrl,
          role: guildMembers.role, joinedAt: guildMembers.joinedAt })
        .from(guildMembers)
        .leftJoin(guilds, eqOp(guildMembers.guildId, guilds.id))
        .where(eqOp(guildMembers.userId, ctx.user.id));
    }),
  }),

  // ── Artwork Normalization (admin) ────────────────────────────────────────────
  normalization: normalizationRouter,
  // ── Founder's Era Supporters ─────────────────────────────────────────────────
  supporters: router({
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
});
export type AppRouter = typeof appRouter;
