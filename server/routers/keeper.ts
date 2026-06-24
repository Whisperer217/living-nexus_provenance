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

export const keeperRouter = router({
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
