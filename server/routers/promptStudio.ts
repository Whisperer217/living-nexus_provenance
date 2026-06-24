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

export const promptStudioRouter = router({
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


