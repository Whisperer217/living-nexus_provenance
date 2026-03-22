import Stripe from "stripe";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
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
  updateSongLyrics, updateSongStatus, getRelatedSongs,
  updateUserProfile, updateUserStripeAccount,
  createAiTransform, updateAiTransform, getAiTransformById,
  getAiTransformsBySong, getAiTransformsByUser,
  getLikedSongs, toggleLike, getLikeStatus, getLikeCount,
  getJukeboxQueue, addToJukeboxQueue, markJukeboxItemPlayed, markJukeboxItemSkipped,
  getSongByWitnessId, updateSongMetadata, getRecentTips,
  getPlaylist, addToPlaylist, removeFromPlaylist, isInPlaylist,
  getUserTipTotalForSong, updateSongDownloadPermission,
} from "./db";

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
          await recordTip({
            songId: parseInt(meta.songId),
            tipperUserId,
            amountCents,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          });
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
    })).mutation(async ({ ctx, input }) => { await updateUserProfile(ctx.user.id, input); return { success: true }; }),
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
      return { url };
    }),
    allCreators: publicProcedure.query(async () => getAllCreators()),
    getCreator: publicProcedure.input(z.object({ creatorId: z.number() })).query(async ({ input }) => {
      const creator = await getUserById(input.creatorId);
      if (!creator) return null;
      const songs = await getSongsByUser(input.creatorId);
      const publicSongs = songs.filter((s: any) => s.isPublic);
      return { creator, songs: publicSongs };
    }),
  }),

  songs: router({
    discover: publicProcedure.input(z.object({ genre: z.string().optional(), search: z.string().optional(), limit: z.number().max(100).optional() }).optional()).query(async ({ input }) => getPublicSongs(input ?? {})),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getSongWithCreator(input.id)),
    verifyWid: publicProcedure.input(z.object({ witnessId: z.string().min(1) })).query(async ({ input }) => {
      const result = await getSongByWitnessId(input.witnessId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "No record found for this Witness ID" });
      const { song, creator } = result;
      return {
        witnessId: song.witnessId,
        title: song.title,
        artistName: creator?.artistHandle || creator?.name || "Unknown Artist",
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
      };
    }),
    mySongs: protectedProcedure.query(async ({ ctx }) => getSongsByUser(ctx.user.id)),
    bySelf: protectedProcedure.query(async ({ ctx }) => getSongsByUser(ctx.user.id)),
    upload: protectedProcedure.input(z.object({
      audioBase64: z.string().optional(), audioMimeType: z.string().optional(), audioFileName: z.string().optional(),
      coverBase64: z.string().optional(), coverMimeType: z.string().optional(),
      title: z.string().min(1).max(255), genre: z.string().optional(), bpm: z.number().optional(),
      keySignature: z.string().optional(), moodTags: z.array(z.string()).optional(),
      coWriters: z.array(z.string()).optional(), albumName: z.string().optional(),
      releaseDate: z.string().optional(), isrc: z.string().optional(),
      aiConsent: z.enum(["prohibited", "permitted_attribution", "permitted"]),
      lyricsText: z.string().max(20000).optional(),
      lyricsHash: z.string().optional(),
      isLyricsOnly: z.boolean().optional(),
      fileHash: z.string().optional(), witnessId: z.string().optional(),
      harmonicSignature: z.array(z.number()).optional(), ecdsaPublicKey: z.string().optional(), ecdsaSignature: z.string().optional(),
      caption: z.string().max(2000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      if (user.songSlotsUsed >= user.songSlotsTotal) throw new Error("No song slots available. Please purchase more slots.");
      let fileUrl: string | undefined;
      let audioKey: string | undefined;
      if (!input.isLyricsOnly && input.audioBase64 && input.audioMimeType && input.audioFileName) {
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        // Sanitize filename: replace spaces, emojis, and special chars with underscores
        const safeFileName = input.audioFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        audioKey = `audio/${ctx.user.id}/${Date.now()}-${safeFileName}`;
        const { url } = await storagePut(audioKey, audioBuffer, input.audioMimeType);
        fileUrl = url;
      }
      let coverArtUrl: string | undefined;
      if (input.coverBase64 && input.coverMimeType) {
        const coverBuffer = Buffer.from(input.coverBase64, "base64");
        const { url } = await storagePut(`covers/${ctx.user.id}/${Date.now()}.jpg`, coverBuffer, input.coverMimeType);
        coverArtUrl = url;
      }
      await createSong({ userId: ctx.user.id, title: input.title, genre: input.genre, bpm: input.bpm, keySignature: input.keySignature, moodTags: input.moodTags, coWriters: input.coWriters, albumName: input.albumName, releaseDate: input.releaseDate, isrc: input.isrc, aiConsent: input.aiConsent, lyricsText: input.lyricsText, lyricsHash: input.lyricsHash, isLyricsOnly: input.isLyricsOnly ?? false, fileUrl, fileKey: audioKey, coverArtUrl, fileHash: input.fileHash, witnessId: input.witnessId, harmonicSignature: input.harmonicSignature, ecdsaPublicKey: input.ecdsaPublicKey, ecdsaSignature: input.ecdsaSignature, caption: input.caption });
      return { success: true, fileUrl, coverArtUrl };
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
      coverBase64: z.string().optional(),
      coverMimeType: z.string().optional(),
      tracks: z.array(z.object({
        audioBase64: z.string(),
        audioMimeType: z.string(),
        audioFileName: z.string(),
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
      // Upload shared cover art once
      let coverArtUrl: string | undefined;
      if (input.coverBase64 && input.coverMimeType) {
        const coverBuffer = Buffer.from(input.coverBase64, "base64");
        const { url } = await storagePut(`covers/${ctx.user.id}/${Date.now()}-album.jpg`, coverBuffer, input.coverMimeType);
        coverArtUrl = url;
      }
      // Upload each track and create song records
      const results: { title: string; witnessId?: string; fileUrl: string }[] = [];
      for (const track of input.tracks) {
        const audioBuffer = Buffer.from(track.audioBase64, "base64");
        const safeFileName = track.audioFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const audioKey = `audio/${ctx.user.id}/${Date.now()}-${safeFileName}`;
        const { url: fileUrl } = await storagePut(audioKey, audioBuffer, track.audioMimeType);
        await createSong({
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
        results.push({ title: track.title, witnessId: track.witnessId, fileUrl });
      }
      return { success: true, trackCount: results.length, coverArtUrl, results };
    }),

    delete: protectedProcedure.input(z.object({ songId: z.number() })).mutation(async ({ ctx, input }) => { await deleteSong(input.songId, ctx.user.id); return { success: true }; }),
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
    })).mutation(async ({ ctx, input }) => {
      const { songId, ...fields } = input;
      await updateSongMetadata(songId, ctx.user.id, fields);
      return { success: true };
    }),

    play: publicProcedure.input(z.object({ songId: z.number() })).mutation(async ({ input }) => { await incrementPlayCount(input.songId); return { success: true }; }),
    download: publicProcedure.input(z.object({ songId: z.number() })).mutation(async ({ ctx, input }) => {
      const song = await getSongById(input.songId);
      if (!song?.fileUrl) throw new Error("Song file not found");
      await recordDownload({ songId: input.songId, userId: ctx.user?.id });
      return { url: song.fileUrl };
    }),
    updateLyrics: protectedProcedure.input(z.object({ songId: z.number(), lyricsText: z.string().max(10000) })).mutation(async ({ ctx, input }) => {
      await updateSongLyrics(input.songId, ctx.user.id, input.lyricsText);
      return { success: true };
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
  }),
  comments: router({
    list: publicProcedure.input(z.object({ songId: z.number() })).query(async ({ input }) => getCommentsBySong(input.songId)),
    add: publicProcedure.input(z.object({ songId: z.number(), content: z.string().min(1).max(1000), authorName: z.string().max(128).optional() })).mutation(async ({ ctx, input }) => {
      await addComment({ songId: input.songId, userId: ctx.user?.id, authorName: input.authorName || ctx.user?.name || "Anonymous", content: input.content });
      return { success: true };
    }),
  }),

  tips: router({
    list: publicProcedure.input(z.object({ songId: z.number() })).query(async ({ input }) => getTipsBySong(input.songId)),
    connectOnboarding: protectedProcedure.input(z.object({ returnUrl: z.string().url() })).mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      let accountId = user.stripeAccountId;
      if (!accountId) {
        const account = await stripe.accounts.create({ type: "express", email: user.email || undefined, metadata: { userId: ctx.user.id.toString() } });
        accountId = account.id;
        await updateUserStripeAccount(ctx.user.id, { stripeAccountId: accountId, stripeAccountStatus: "pending" });
      }
      const accountLink = await stripe.accountLinks.create({ account: accountId, refresh_url: input.returnUrl, return_url: input.returnUrl, type: "account_onboarding" });
      return { url: accountLink.url };
    }),
    connectStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user?.stripeAccountId) return { status: "not_connected", accountId: null };
      try {
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        const status = account.charges_enabled ? "enabled" : account.details_submitted ? "restricted" : "pending";
        await updateUserStripeAccount(ctx.user.id, { stripeAccountStatus: status as any });
        return { status, accountId: user.stripeAccountId, chargesEnabled: account.charges_enabled };
      } catch { return { status: "error", accountId: user.stripeAccountId }; }
    }),
    recentTips: publicProcedure.query(async () => {
      const rows = await getRecentTips(20);
      return rows.map(r => ({
        id: r.id,
        amountCents: r.amountCents,
        songTitle: r.songTitle,
        fanName: r.fanName || "A fan",
        creatorName: r.creatorHandle || r.creatorName || "a creator",
        createdAt: r.createdAt,
      }));
    }),
    createTipCheckout: publicProcedure.input(z.object({ songId: z.number(), amountCents: z.number().min(100).max(50000), origin: z.string().url() })).mutation(async ({ ctx, input }) => {
      const songData = await getSongWithCreator(input.songId);
      if (!songData) throw new Error("Song not found");
      const { song, creator } = songData;
      if (!creator?.stripeAccountId) throw new Error("This creator has not enabled tips yet.");
      const feeAmount = Math.round(input.amountCents * PLATFORM_FEE_PERCENT / 100);
      const session = await stripe.checkout.sessions.create({
        mode: "payment", payment_method_types: ["card"],
        line_items: [{ price_data: { currency: "usd", product_data: { name: `Tip for "${song.title}"`, description: `Supporting ${creator.artistHandle || creator.name || "this creator"} on Living Nexus` }, unit_amount: input.amountCents }, quantity: 1 }],
        payment_intent_data: { application_fee_amount: feeAmount, transfer_data: { destination: creator.stripeAccountId }, metadata: { type: "tip", songId: input.songId.toString(), userId: ctx.user?.id?.toString() || "" } },
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
      const amountCents = input.slots * 99;
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

  // ── Jukebox ──────────────────────────────────────────────────────────────────
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
});

export type AppRouter = typeof appRouter;

