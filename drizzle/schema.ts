import {
  int, mysqlEnum, mysqlTable, text, timestamp,
  varchar, float, boolean, json, uniqueIndex
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "founder", "admin"]).default("user").notNull(),
  // Founder system: null = infinite slots (founders only); max 10 founders enforced in application logic
  slotLimit: int("slotLimit"), // null = ∞ (founders), number = hard cap (regular users)

  // Creator profile fields
  artistHandle: varchar("artistHandle", { length: 64 }),
  bio: text("bio"),
  profilePhotoUrl: text("profilePhotoUrl"),
  bmiMemberNumber: varchar("bmiMemberNumber", { length: 64 }),
  website: text("website"),
  location: varchar("location", { length: 128 }),
  twitterHandle: varchar("twitterHandle", { length: 64 }),
  instagramHandle: varchar("instagramHandle", { length: 64 }),
  youtubeHandle: varchar("youtubeHandle", { length: 64 }),
  bannerUrl: text("bannerUrl"),
  avatarObjectPosition: varchar("avatarObjectPosition", { length: 32 }).default("50% 50%"),
  bannerPositionX: float("bannerPositionX").default(50).notNull(),
  bannerPositionY: float("bannerPositionY").default(50).notNull(),

  // Creator AI & genre defaults
  aiDisclosure: mysqlEnum("aiDisclosure", ["original", "ai_assisted", "ai_generated", "human_authored_ai_instrument"]).default("original"),
  primaryGenre: varchar("primaryGenre", { length: 64 }),

  // License & slots
  licenseStatus: mysqlEnum("licenseStatus", ["free", "licensed"]).default("free").notNull(),
  songSlotsUsed: int("songSlotsUsed").default(0).notNull(),
  songSlotsTotal: int("songSlotsTotal").default(1).notNull(),

  // Stripe
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  stripeAccountId: varchar("stripeAccountId", { length: 64 }),
  stripeAccountStatus: mysqlEnum("stripeAccountStatus", ["pending", "restricted", "enabled", "disabled"]).default("pending"),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),

  // Living Archive subscription
  livingArchivePlan: mysqlEnum("livingArchivePlan", ["none", "quarterly", "annual", "founder_free"]).default("none").notNull(),
  livingArchiveExpiresAt: timestamp("livingArchiveExpiresAt"),
  livingArchiveActive: boolean("livingArchiveActive").default(false).notNull(),

  // Founder's Era supporter tier (denormalized from platformSupporters for fast badge rendering)
  supporterTier: mysqlEnum("supporterTier", ["supporter", "patron", "covenant"]),

  // Expression ID (EID) — auto-generated style identity from profile metadata
  expressionId: varchar("expressionId", { length: 32 }).unique(),
  expressionPrompt: text("expressionPrompt"),
  expressionStyleTags: text("expressionStyleTags"),
  expressionComposerNote: text("expressionComposerNote"),
  expressionGeneratedAt: timestamp("expressionGeneratedAt"),

  // Tone & frequency identity — used by Provenance Prompt Generator
  toneFrequencyNote: varchar("toneFrequencyNote", { length: 128 }), // e.g. "432Hz, Solfeggio Mi (528Hz)"
  dominantKey: varchar("dominantKey", { length: 32 }),              // e.g. "D Minor", "E Major"
  tempoRange: varchar("tempoRange", { length: 64 }),                 // e.g. "80-120 BPM"
  energyProfile: varchar("energyProfile", { length: 128 }),          // e.g. "Epic, Triumphant, Meditative"

  // Onboarding
  hasSeenWelcome: boolean("hasSeenWelcome").default(false).notNull(),

  // TOS acceptance — null = not yet accepted; timestamp = when the creator accepted the current TOS
  // Version tracked via tosVersion field so future TOS updates can re-prompt
  tosAcceptedAt: timestamp("tosAcceptedAt"),
  tosVersion: varchar("tosVersion", { length: 16 }),  // e.g. "2.0" (current TOS with WID legal scope section)
  dataDeletionRequestedAt: timestamp("dataDeletionRequestedAt"),  // Set when creator submits account deletion request

  // Activity delta tracking — used for "new since last visit" badges
  lastVisitedActivityAt: timestamp("lastVisitedActivityAt"),
  lastVisitedDashboardAt: timestamp("lastVisitedDashboardAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Songs ────────────────────────────────────────────────────────────────────
export const songs = mysqlTable("songs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Metadata
  title: varchar("title", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 64 }),
  bpm: int("bpm"),
  keySignature: varchar("keySignature", { length: 16 }),
  moodTags: json("moodTags").$type<string[]>(),
  lyricsText: text("lyricsText"),
  lyricsHash: varchar("lyricsHash", { length: 64 }),
  isLyricsOnly: boolean("isLyricsOnly").default(false).notNull(),
  coWriters: json("coWriters").$type<string[]>(),
  albumName: varchar("albumName", { length: 255 }),
  releaseDate: varchar("releaseDate", { length: 32 }),
  isrc: varchar("isrc", { length: 32 }),
  aiConsent: mysqlEnum("aiConsent", ["prohibited", "permitted_attribution", "permitted"]).default("prohibited").notNull(),

  // Editorial
  caption: text("caption"),
  collectionTag: varchar("collectionTag", { length: 128 }),

  // Files
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  coverArtUrl: text("coverArtUrl"),
  fileHash: varchar("fileHash", { length: 64 }),
  durationSeconds: float("durationSeconds"),
  sampleRate: int("sampleRate"),
  bitDepth: int("bitDepth"),

  // Provenance
  witnessId: varchar("witnessId", { length: 64 }),
  harmonicSignature: json("harmonicSignature").$type<number[]>(),
  ecdsaPublicKey: text("ecdsaPublicKey"),
  ecdsaSignature: text("ecdsaSignature"),
  certificateUrl: text("certificateUrl"),
  certificateKey: text("certificateKey"),

  // Music Video (optional)
  videoUrl: text("videoUrl"),
  videoKey: text("videoKey"),
  videoWitnessId: varchar("videoWitnessId", { length: 64 }),
  // Auto-generated micro video (loop video for works without a manual video upload)
  // Generated on publish or via admin Media Generation panel, stored in S3
  // Separate from embedVideoUrl (which is the og:video embed layer)
  autoVideoUrl: text("autoVideoUrl"),
  autoVideoKey: text("autoVideoKey"),

  // Lyrics provenance — WID-LYR (separate from audio WID-MUS)
  lyricsWid: varchar("lyricsWid", { length: 64 }),
  lyricsFileName: varchar("lyricsFileName", { length: 255 }),
  lyricsFileHash: varchar("lyricsFileHash", { length: 64 }),
  lyricsAddedAt: timestamp("lyricsAddedAt"),

  // Embed video (og:video MP4 for Discord/iMessage/Telegram rich embeds)
  // Generated on-demand by ffmpeg (cover art loop + audio), cached on S3
  embedVideoUrl: text("embedVideoUrl"),

  // Download permissions
  // "none"   = downloads disabled (default — auto-off on every upload)
  // "free"   = anyone can download at no cost
  // "tipped" = download unlocked only after tipping >= downloadTipThresholdCents
  downloadPermission: mysqlEnum("downloadPermission", ["none", "free", "tipped"]).default("none").notNull(),
  downloadTipThresholdCents: int("downloadTipThresholdCents").default(179).notNull(), // $1.79 default

  // Collection membership (WID-ALB back-reference)
  collectionId: int("collectionId"),  // FK → collections.id; null = not part of a collection
  trackOrder: int("trackOrder").default(0).notNull(), // position within collection (0-indexed); preserves batch upload sequence

  // Image position & aspect ratio (MRS — Media Rendering System)
  // coverPositionX/Y = focal point as percentage (0–100), maps to objectPosition
  coverPositionX: float("coverPositionX").default(50).notNull(),
  coverPositionY: float("coverPositionY").default(50).notNull(),
  // artAspectRatio: declared aspect ratio of the cover art; drives card/player/cinematic render decisions
  // null = unknown (treated as 1:1 for safe fallback)
  artAspectRatio: mysqlEnum("artAspectRatio", ["1:1", "4:5", "16:9"]),

  // Content type — determines which Explore tab this work appears in
  // "audio"      = music track (default, covers existing records)
  // "lyrics"     = standalone lyric sheet (WID-LYR only, no audio)
  // "manuscript" = novel, short story, essay, academic paper
  // "comic"      = comic book, graphic novel, illustrated story
  contentType: mysqlEnum("contentType", ["audio", "lyrics", "manuscript", "comic"]).default("audio").notNull(),

  // Visual pipeline readiness
  // true = autoVideoUrl is populated and the work is fully visually ready
  // false (default) = pending visual generation
  visualReady: boolean("visualReady").default(false).notNull(),

  // Status
  status: mysqlEnum("status", ["Draft", "Published", "Unlisted", "Deleted"]).default("Published").notNull(),

  // AI Disclosure — how the creator describes their authorship role
  // "original"                  = entirely human-made, no AI tools
  // "ai_assisted"               = AI used as a production aid; human vision, human direction
  // "ai_generated"              = AI generated the primary content
  // "human_authored_ai_instrument" = human authored intent, AI used as the instrument (HAAI)
  aiDisclosure: mysqlEnum("aiDisclosure", ["original", "ai_assisted", "ai_generated", "human_authored_ai_instrument"]),

  // HAAI Declaration — structured authorship intent record (only populated when aiDisclosure = "human_authored_ai_instrument")
  // Each field documents one dimension of the creator's directorial vision before/during AI instrument use
  haaiVisualConcept: text("haaiVisualConcept"),        // The visual/cinematic image the creator was trying to articulate
  haaiStyleLanguage: text("haaiStyleLanguage"),        // Plain-language description of the desired style
  haaiInstrumentation: text("haaiInstrumentation"),    // Instrumentation choices and sonic palette
  haaiVocalConveyance: text("haaiVocalConveyance"),    // The voice, tone, and delivery the creator was trying to convey
  haaiLyricalInspiration: text("haaiLyricalInspiration"), // Lyrical seed / inspiration snippets that anchored the work
  haaiEmotionalTone: text("haaiEmotionalTone"),        // The emotional tone and MUT-alignment the creator was pursuing
  haaiDeclaredAt: timestamp("haaiDeclaredAt"),         // Timestamp when the HAAI declaration was completed

  // Stats
  isPublic: boolean("isPublic").default(true).notNull(),
  playCount: int("playCount").default(0).notNull(),
  tipCount: int("tipCount").default(0).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),

  // Moderation (admin-controlled; never touches WID/provenance)
  isFlagged: boolean("isFlagged").default(false).notNull(),
  flagReason: varchar("flagReason", { length: 512 }),
  moderationStatus: mysqlEnum("moderationStatus", ["clear", "flagged", "removed"]).default("clear").notNull(),
});

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

// ─── Comments ─────────────────────────────────────────────────────────────────
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  userId: int("userId"),
  authorName: varchar("authorName", { length: 128 }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// ─── Tips ─────────────────────────────────────────────────────────────────────
export const tips = mysqlTable("tips", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  tipperUserId: int("tipperUserId"),
  amountCents: int("amountCents").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tip = typeof tips.$inferSelect;
export type InsertTip = typeof tips.$inferInsert;

// ─── Downloads ────────────────────────────────────────────────────────────────
export const downloads = mysqlTable("downloads", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  userId: int("userId"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Download = typeof downloads.$inferSelect;
export type InsertDownload = typeof downloads.$inferInsert;

// ─── Licenses ─────────────────────────────────────────────────────────────────
export const licenses = mysqlTable("licenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  amountCents: int("amountCents").default(8998).notNull(),
  slotsGranted: int("slotsGranted").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

// ─── Slot Purchases ───────────────────────────────────────────────────────────
export const slotPurchases = mysqlTable("slotPurchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  slotsPurchased: int("slotsPurchased").notNull(),
  amountCents: int("amountCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SlotPurchase = typeof slotPurchases.$inferSelect;
export type InsertSlotPurchase = typeof slotPurchases.$inferInsert;

// ─── AI Transforms ────────────────────────────────────────────────────────────
export const aiTransforms = mysqlTable("aiTransforms", {
  id: int("id").autoincrement().primaryKey(),
  originalSongId: int("originalSongId").notNull(),
  userId: int("userId").notNull(),

  // Request params
  prompt: text("prompt").notNull(),
  style: varchar("style", { length: 128 }),
  tags: json("tags").$type<string[]>(),

  // Sonauto task tracking
  sonautoTaskId: varchar("sonautoTaskId", { length: 128 }),
  status: mysqlEnum("status", ["pending", "processing", "success", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),

  // Result
  outputUrl: text("outputUrl"),
  outputKey: text("outputKey"),

  // Provenance link back to original
  originalWitnessId: varchar("originalWitnessId", { length: 64 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiTransform = typeof aiTransforms.$inferSelect;
export type InsertAiTransform = typeof aiTransforms.$inferInsert;
// ─── Likes ────────────────────────────────────────────────────────────────────
export const likes = mysqlTable("likes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),   // the user who liked
  songId: int("songId").notNull(),   // the song that was liked
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Like = typeof likes.$inferSelect;
export type InsertLike = typeof likes.$inferInsert;

// ─── Jukebox Queue ────────────────────────────────────────────────────────────
export const jukeboxQueue = mysqlTable("jukeboxQueue", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 16 }).notNull(),
  songId: int("songId").notNull(),
  tipperId: int("tipperId").notNull(),          // user who tipped
  tipperName: varchar("tipperName", { length: 128 }),
  tipAmountCents: int("tipAmountCents").notNull().default(0), // 0 = free queue, >0 = gifted
  stripeSessionId: varchar("stripeSessionId", { length: 128 }),
  position: int("position").notNull().default(0), // ordering within room
  playedAt: timestamp("playedAt"),               // null = not yet played
  skippedAt: timestamp("skippedAt"),             // null = not skipped
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JukeboxQueueItem = typeof jukeboxQueue.$inferSelect;
export type InsertJukeboxQueueItem = typeof jukeboxQueue.$inferInsert;

// ─── Playlist Items ───────────────────────────────────────────────────────────
// Each user has a single personal playlist; rows are ordered by `position` ASC
export const playlistItems = mysqlTable("playlistItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),   // owner of the playlist
  songId: int("songId").notNull(),   // the saved song
  position: int("position").notNull().default(0), // ordering within playlist
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlaylistItem = typeof playlistItems.$inferSelect;
export type InsertPlaylistItem = typeof playlistItems.$inferInsert;

// ─── Events (Unified Interaction Ledger) ─────────────────────────────────────
// Append-only. Every interaction tied to a Work (WID) flows through here.
// Tips and comments remain in their own tables for finance/query purposes,
// but events is the primary write target and the source of truth for the thread.
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),

  // Event classification
  type: mysqlEnum("type", [
    "TIP",
    "COMMENT",
    "LIKE",
    "FOLLOW",
    "WITNESS_REGISTERED",
    "WITNESS_VERIFIED",
    "WORK_REFERENCED",
    "SYSTEM_UPDATE",
    "PRESERVATION_MODE",
    "PROJECT_PUBLISHED",
  ]).notNull(),

  // Work reference (WID origin node)
  workId: int("workId").notNull(),   // maps to songs.id or projects.id

  // Actor (human source)
  actorId: int("actorId"),           // maps to users.id; null = anonymous
  actorName: varchar("actorName", { length: 128 }), // denormalized for display

  // Structured payload (type-specific data)
  payload: json("payload").$type<Record<string, unknown>>(),

  // Soft delete — events are never hard-deleted (audit preserved)
  deletedAt: timestamp("deletedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Field Notes (Doctrine / Creator Log) ─────────────────────────────────────
export const fieldNotes = mysqlTable("field_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  body: text("body").notNull(),
  category: mysqlEnum("category", [
    "doctrine",
    "journal",
    "update",
    "concept",
  ]).default("journal").notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  videoUrl: varchar("videoUrl", { length: 1024 }),
  coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FieldNote = typeof fieldNotes.$inferSelect;
export type InsertFieldNote = typeof fieldNotes.$inferInsert;

// ─── Witness Network ──────────────────────────────────────────────────────────
// witnesses: "I Witness this creator's work" (directional, like follow but with meaning)
export const witnesses = mysqlTable("witnesses", {
  id: int("id").autoincrement().primaryKey(),
  witnesserId: int("witnesserId").notNull(),   // the person doing the witnessing
  witnessedId: int("witnessedId").notNull(),   // the creator being witnessed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Witness = typeof witnesses.$inferSelect;
export type InsertWitness = typeof witnesses.$inferInsert;

// references: "I cite this creator/work in my creation" (documented lineage)
export const creativeReferences = mysqlTable("creative_references", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull(),     // creator making the reference
  toUserId: int("toUserId"),                   // creator being referenced (optional)
  toSongId: int("toSongId"),                   // song/WID being referenced (optional)
  context: text("context"),                    // "This piece builds on ideas from..."
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CreativeReference = typeof creativeReferences.$inferSelect;
export type InsertCreativeReference = typeof creativeReferences.$inferInsert;

// ─── Collaborative Playlists ──────────────────────────────────────────────────
// Named playlists that can be shared/co-edited by multiple users
export const playlists = mysqlTable("playlists", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),           // creator who made the playlist
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  coverArtUrl: text("coverArtUrl"),
  isPublic: boolean("isPublic").default(false).notNull(),
  isCollaborative: boolean("isCollaborative").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = typeof playlists.$inferInsert;

// Tracks inside a named playlist (separate from the personal playlistItems queue)
export const playlistTracks = mysqlTable("playlistTracks", {
  id: int("id").autoincrement().primaryKey(),
  playlistId: int("playlistId").notNull(),
  songId: int("songId").notNull(),
  addedByUserId: int("addedByUserId").notNull(),  // who added this track
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type InsertPlaylistTrack = typeof playlistTracks.$inferInsert;

// Collaborators on a playlist (invited users who can add/remove tracks)
export const playlistCollaborators = mysqlTable("playlistCollaborators", {
  id: int("id").autoincrement().primaryKey(),
  playlistId: int("playlistId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["editor", "viewer"]).default("editor").notNull(),
  invitedByUserId: int("invitedByUserId").notNull(),
  acceptedAt: timestamp("acceptedAt"),          // null = pending invite
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PlaylistCollaborator = typeof playlistCollaborators.$inferSelect;
export type InsertPlaylistCollaborator = typeof playlistCollaborators.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────
// Per-user notification inbox — witness events, comments, playlist invites, etc.
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),              // recipient
  type: mysqlEnum("type", [
    "witness",           // someone witnessed you
    "comment",           // someone commented on your track
    "like",              // someone liked your track
    "tip",               // someone tipped you
    "reaction",          // someone sent an emoji reaction on your track
    "playlist_invite",   // invited to collaborate on a playlist
    "new_track",         // someone you witness dropped a new track
    "system",            // platform announcement
    "project_update",    // creator posted a project update
    "project_donation",  // someone donated to your project
    "project_follow",    // someone followed your project
  ]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  body: text("body"),
  actorId: int("actorId"),                      // user who triggered the notification
  actorName: varchar("actorName", { length: 128 }),
  actorAvatarUrl: text("actorAvatarUrl"),
  refId: int("refId"),                          // related entity id (songId, playlistId, etc.)
  refType: varchar("refType", { length: 32 }),  // "song" | "playlist" | "user"
  isRead: boolean("isRead").default(false).notNull(),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Jukebox Offerings ────────────────────────────────────────────────────────
// A voluntary "offering" left by a listener for a jukebox room.
// The platform distributes proportionally to creators whose songs played in that room.
export const jukeboxOfferings = mysqlTable("jukeboxOfferings", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 32 }).notNull(),
  gifterId: int("gifterId").notNull(),          // user who left the offering
  amountCents: int("amountCents").notNull(),     // e.g. 500 = $5.00
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type JukeboxOffering = typeof jukeboxOfferings.$inferSelect;
export type InsertJukeboxOffering = typeof jukeboxOfferings.$inferInsert;

// ─── Jukebox Play Events ──────────────────────────────────────────────────────
// Records each time a song plays in a jukebox room — used for proportional distribution.
export const jukeboxPlayEvents = mysqlTable("jukeboxPlayEvents", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 32 }).notNull(),
  songId: int("songId").notNull(),
  creatorId: int("creatorId").notNull(),        // song owner (for earnings calculation)
  playedAt: timestamp("playedAt").defaultNow().notNull(),
});
export type JukeboxPlayEvent = typeof jukeboxPlayEvents.$inferSelect;
export type InsertJukeboxPlayEvent = typeof jukeboxPlayEvents.$inferInsert;

// ─── Promo Codes ──────────────────────────────────────────────────────────────
// Admin-created codes that grant a Creator License + slots to any user who redeems them.
export const promoCodes = mysqlTable("promoCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),          // e.g. BDDT-FREE, VETERAN-2026
  description: varchar("description", { length: 256 }),              // internal note
  slotsGranted: int("slotsGranted").default(100).notNull(),          // slots to give on redemption
  maxUses: int("maxUses"),                                            // null = unlimited
  usedCount: int("usedCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),                                  // null = never expires
  createdByUserId: int("createdByUserId").notNull(),                  // admin who created it
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;

// ─── Promo Redemptions ────────────────────────────────────────────────────────
// Tracks which user redeemed which code (prevents double-redemption).
export const promoRedemptions = mysqlTable("promoRedemptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  promoCodeId: int("promoCodeId").notNull(),
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
});
export type PromoRedemption = typeof promoRedemptions.$inferSelect;
export type InsertPromoRedemption = typeof promoRedemptions.$inferInsert;

// ─── Name History (Audit Trail) ───────────────────────────────────────────────
// Immutable log of every display name change. Used by the WID verify page to
// show the original creator name at the time of witnessing for legal provenance.
// "Truth enters through witnesses, survives through return, and collapses when
// systems sever it from its origin." — Sovereign Shutter Doctrine
export const nameHistory = mysqlTable("nameHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  oldName: varchar("oldName", { length: 128 }),          // null = initial registration record
  newName: varchar("newName", { length: 128 }).notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
});
export type NameHistory = typeof nameHistory.$inferSelect;
export type InsertNameHistory = typeof nameHistory.$inferInsert;

// ─── Collections (Album WID) ─────────────────────────────────────────────────
// A Collection groups multiple individually-witnessed tracks under a single
// album-level cryptographic identity: WID-ALB-XXXXXXXX-XXXXXXXX.
// The collectiveHash is SHA-256 of all sorted individual WIDs joined by '|'.
// Once created, a collection record is immutable — it is the origin record.
export const collections = mysqlTable("collections", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),          // album/collection name
  collectionWid: varchar("collectionWid", { length: 64 }).notNull().unique(), // WID-ALB-XXXXXXXX-XXXXXXXX
  collectiveHash: varchar("collectiveHash", { length: 64 }).notNull(),        // SHA-256 of sorted WIDs
  pdfUrl: text("pdfUrl"),                                    // S3 URL of generated PDF certificate
  pdfKey: text("pdfKey"),
  coverArtUrl: text("coverArtUrl"),
  coverPositionX: float("coverPositionX").default(50).notNull(),
  coverPositionY: float("coverPositionY").default(50).notNull(),
  trackCount: int("trackCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Collection = typeof collections.$inferSelect;
export type InsertCollection = typeof collections.$inferInsert;

// ─── Platform Supporters (Founder's Era) ─────────────────────────────────────
// Records every platform-level gift made to Living Nexus itself (not to a creator).
// Tier is computed from totalGifted: supporter=$1+, patron=$25+, covenant=$100+.
// The Supporters Wall on /founders reads from this table.
export const platformSupporters = mysqlTable("platformSupporters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),               // one record per supporter (upserted on each gift)
  totalGifted: float("totalGifted").notNull().default(0), // cumulative USD gifted to platform
  tier: mysqlEnum("tier", ["supporter", "patron", "covenant"]).notNull().default("supporter"),
  firstGiftAt: timestamp("firstGiftAt").defaultNow().notNull(),
  lastGiftAt: timestamp("lastGiftAt").defaultNow().onUpdateNow().notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 64 }), // most recent payment intent
});
export type PlatformSupporter = typeof platformSupporters.$inferSelect;
export type InsertPlatformSupporter = typeof platformSupporters.$inferInsert;

// ─── Playlist Versions (My Lists Manage Mode) ────────────────────────────────
// Every time a user saves a new version of their playlist ordering, a snapshot
// is written here. widArray stores the ordered array of song WIDs at that moment.
// This gives each playlist an immutable version history — the ordering itself
// becomes a provenance artifact.
export const playlistVersions = mysqlTable("playlistVersions", {
  id: int("id").autoincrement().primaryKey(),
  playlistId: int("playlistId").notNull(),         // FK → playlists.id
  versionNum: int("versionNum").notNull(),          // 1, 2, 3 … (auto-incremented per playlist)
  widArray: json("widArray").notNull(),             // string[] — ordered WIDs at this version
  songIdArray: json("songIdArray").notNull(),       // int[] — ordered songIds (for fast joins)
  savedByUserId: int("savedByUserId").notNull(),    // who triggered the save
  note: varchar("note", { length: 256 }),           // optional version note
  savedAt: timestamp("savedAt").defaultNow().notNull(),
});
export type PlaylistVersion = typeof playlistVersions.$inferSelect;
export type InsertPlaylistVersion = typeof playlistVersions.$inferInsert;

// ─── Guilds ───────────────────────────────────────────────────────────────────
// A Guild is a multi-creator collective that shares a channel page, a guild mix
// playlist, and a versioned track ordering. Guilds are the social layer of LN.
export const guilds = mysqlTable("guilds", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),   // URL-safe identifier
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  bannerUrl: text("bannerUrl"),
  avatarUrl: text("avatarUrl"),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Guild = typeof guilds.$inferSelect;
export type InsertGuild = typeof guilds.$inferInsert;

// ─── Guild Members ────────────────────────────────────────────────────────────
export const guildMembers = mysqlTable("guildMembers", {
  id: int("id").autoincrement().primaryKey(),
  guildId: int("guildId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
export type GuildMember = typeof guildMembers.$inferSelect;
export type InsertGuildMember = typeof guildMembers.$inferInsert;

// ─── Guild Playlists ──────────────────────────────────────────────────────────
// The guild mix — a shared, versioned playlist where each entry records who
// added the track. The full version history is stored in playlistVersions
// (linked via playlistId when a guild playlist is backed by a named playlist).
export const guildPlaylistTracks = mysqlTable("guildPlaylistTracks", {
  id: int("id").autoincrement().primaryKey(),
  guildId: int("guildId").notNull(),
  songId: int("songId").notNull(),
  addedByUserId: int("addedByUserId").notNull(),   // "added by" attribution
  position: int("position").notNull().default(0),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});
export type GuildPlaylistTrack = typeof guildPlaylistTracks.$inferSelect;
export type InsertGuildPlaylistTrack = typeof guildPlaylistTracks.$inferInsert;

// ─── External Playlists ───────────────────────────────────────────────────────
// Read-only imported playlists from YouTube, Suno, or other sources.
// Tracks are stored as a JSON snapshot — no sync, no DB rows per track.
export const externalPlaylists = mysqlTable("externalPlaylists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["youtube", "suno", "other"]).notNull().default("other"),
  sourceUrl: text("sourceUrl").notNull(),
  tracksJson: json("tracksJson").notNull(), // array of { title, artist, url, thumbnailUrl, durationSec }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExternalPlaylist = typeof externalPlaylists.$inferSelect;
export type InsertExternalPlaylist = typeof externalPlaylists.$inferInsert;

// ─── Song Reactions ───────────────────────────────────────────────────────────
// Persistent emoji reactions on songs. One reaction per type per user per song.
// Unique constraint on (userId, songId, type) enforces the upsert/toggle model.
export const songReactions = mysqlTable(
  "songReactions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    songId: int("songId").notNull(),
    type: varchar("type", { length: 16 }).notNull(), // emoji string e.g. "🔥"
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("songReactions_user_song_type_idx").on(t.userId, t.songId, t.type),
  })
);
export type SongReaction = typeof songReactions.$inferSelect;
export type InsertSongReaction = typeof songReactions.$inferInsert;

// ─── Admin Logs ──────────────────────────────────────────────────────────────
// Immutable audit trail of every admin action. Never deleted.
export const adminLogs = mysqlTable("adminLogs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),              // user.id of the admin who acted
  adminName: varchar("adminName", { length: 128 }),
  action: varchar("action", { length: 128 }).notNull(), // e.g. "flag_song", "grant_license"
  targetType: varchar("targetType", { length: 64 }),    // "song" | "user" | "code" | "config"
  targetId: varchar("targetId", { length: 128 }),       // string ID of the affected entity
  details: text("details"),                             // JSON string with extra context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

// ─── System Config ────────────────────────────────────────────────────────────
// Key-value store for feature flags and platform configuration.
export const systemConfig = mysqlTable("systemConfig", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: text("value").notNull(),                  // JSON-encoded value
  description: varchar("description", { length: 512 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedByUserId: int("updatedByUserId"),
});
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

// ─── Audio Version History ────────────────────────────────────────────────────
// Every time a creator replaces the audio file on a track, the superseded
// version is archived here permanently. The current WID-MUS lives on songs.witnessId;
// all previous WIDs live in this table. The creative process is fully witnessed.
export const audioVersions = mysqlTable("audioVersions", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  witnessId: varchar("witnessId", { length: 64 }).notNull(),   // WID-MUS of the superseded version
  audioUrl: text("audioUrl").notNull(),                         // S3 URL of the superseded audio file
  fileKey: varchar("fileKey", { length: 512 }),                 // S3 key of the superseded file
  fileHash: varchar("fileHash", { length: 128 }),               // SHA-256 of the superseded file
  versionNote: varchar("versionNote", { length: 255 }),         // e.g. "Rough mix", "Final master"
  replacedAt: timestamp("replacedAt").defaultNow().notNull(),   // when this version was superseded
});
export type AudioVersion = typeof audioVersions.$inferSelect;
export type InsertAudioVersion = typeof audioVersions.$inferInsert;

// ─── Play Audit Events ────────────────────────────────────────────────────────
// Every qualifying play is recorded here for trust-layer analytics.
// A play is "qualified" only when the listener has heard at least MIN_PLAY_SECONDS
// (30 s) of the track. Duplicate sessions are rejected server-side.
// The witnessId column links every play event back to the WID provenance chain.
export const playEvents = mysqlTable("playEvents", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  witnessId: varchar("witnessId", { length: 64 }),         // WID of the track at time of play
  sessionId: varchar("sessionId", { length: 64 }).notNull(), // client-generated UUID per listening session
  userId: int("userId"),                                    // null for anonymous listeners
  durationSeconds: int("durationSeconds").default(0).notNull(), // how long they listened
  completed: boolean("completed").default(false).notNull(), // did they hear >= 80% of the track?
  ipHash: varchar("ipHash", { length: 64 }),               // SHA-256 of IP for dedup (not stored raw)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PlayEvent = typeof playEvents.$inferSelect;
export type InsertPlayEvent = typeof playEvents.$inferInsert;

// ─── Witness Testimonies ──────────────────────────────────────────────────────
// A Testimony is an immutable, WID-linked statement of creator intent.
// Once created it cannot be edited or deleted — it is a permanent record.
// WID prefix: WID-TST (Witness ID — Testimony)
export const witnessTestimonies = mysqlTable("witnessTestimonies", {
  id: int("id").autoincrement().primaryKey(),
  wid: varchar("wid", { length: 64 }).notNull().unique(),          // WID-TST-XXXXXXXX-YYYYYYYY
  creatorId: int("creatorId").notNull(),                            // FK → users.id
  content: text("content").notNull(),                               // The testimony text (immutable)
  linkedWorks: json("linkedWorks").$type<string[]>(),              // Array of WIDs this testimony references (null = none)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WitnessTestimony = typeof witnessTestimonies.$inferSelect;
export type InsertWitnessTestimony = typeof witnessTestimonies.$inferInsert;

// ─── Visual Queue ─────────────────────────────────────────────────────────────
// Background queue for automatic visual (MP4 loop video) generation.
// Every work is enqueued on creation/WID issuance/publish.
// Worker picks up pending jobs, generates the MP4, stores in S3, marks complete.
// Status transitions: pending → processing → complete | failed
export const visualQueue = mysqlTable("visualQueue", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "complete", "failed"]).default("pending").notNull(),
  priority: int("priority").default(0).notNull(), // higher = processed first; founders get priority=10
  attempts: int("attempts").default(0).notNull(), // retry counter
  errorMessage: text("errorMessage"),             // last error if failed
  enqueuedAt: timestamp("enqueuedAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});
export type VisualQueueJob = typeof visualQueue.$inferSelect;
export type InsertVisualQueueJob = typeof visualQueue.$inferInsert;

// ─── Share Artifacts ──────────────────────────────────────────────────────────
// Precomputed static share artifacts for every WID.
// Generated once at publish time, served forever at /share/:wid.
// Contains the full OG HTML snapshot and oEmbed JSON — no runtime rendering.
export const shareArtifacts = mysqlTable("shareArtifacts", {
  wid: varchar("wid", { length: 128 }).primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  creatorName: varchar("creatorName", { length: 256 }).notNull(),
  imageUrl: text("imageUrl").notNull(),
  shareUrl: varchar("shareUrl", { length: 512 }).notNull(),
  trackId: int("trackId").notNull(),
  htmlSnapshot: text("htmlSnapshot").notNull(),
  oembedJson: json("oembedJson").notNull(),
  status: mysqlEnum("status", ["preparing", "ready"]).default("preparing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShareArtifact = typeof shareArtifacts.$inferSelect;
export type InsertShareArtifact = typeof shareArtifacts.$inferInsert;

// ── Feature Attributions ──────────────────────────────────────────────────────
// Formal platform-level records crediting individuals whose ideas, workflows,
// or descriptions directly informed the architecture of a Living Nexus feature.
export const featureAttributions = mysqlTable("featureAttributions", {
  id: int("id").autoincrement().primaryKey(),
  featureName: varchar("featureName", { length: 256 }).notNull(),
  attributedTo: varchar("attributedTo", { length: 256 }).notNull(),
  userId: int("userId"),
  description: text("description").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});
export type FeatureAttribution = typeof featureAttributions.$inferSelect;
export type InsertFeatureAttribution = typeof featureAttributions.$inferInsert;

// ── Expression Lineage ────────────────────────────────────────────────────────
// Permanent archive of every EID ever generated for a creator.
// Tracks spiritual and creative evolution over time — each generation is a
// versioned record of the creator's sonic identity at that moment.
export const expressionLineage = mysqlTable("expressionLineage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eid: varchar("eid", { length: 32 }).notNull(),
  version: int("version").default(1).notNull(),
  prompt: text("prompt").notNull(),
  styleTags: text("styleTags"),
  composerNote: text("composerNote"),
  toneFrequencyNote: varchar("toneFrequencyNote", { length: 128 }),
  dominantKey: varchar("dominantKey", { length: 32 }),
  tempoRange: varchar("tempoRange", { length: 64 }),
  energyProfile: varchar("energyProfile", { length: 128 }),
  lyricsSnapshot: text("lyricsSnapshot"), // first 1000 chars of lyrics used at generation time
  songCount: int("songCount").default(0).notNull(), // how many songs the creator had at generation time
  promptMode: mysqlEnum("promptMode", ["identity_regen", "style_prompt", "import_anchor"]).default("identity_regen").notNull(), // which tab generated this entry
  promptType: varchar("promptType", { length: 32 }), // style_prompt | lyric_brief | composer_blueprint | visual_direction | press_bio
  userInputBlocks: text("userInputBlocks"), // JSON array of user-supplied inspiration blocks [{label, content}]
  sourcePlatform: varchar("sourcePlatform", { length: 64 }), // for import_anchor: Suno | Udio | Udio v2 | Stable Audio | General
  rawExternalPrompt: text("rawExternalPrompt"), // for import_anchor: the original pasted prompt before EID fusion
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});
export type ExpressionLineage = typeof expressionLineage.$inferSelect;
export type InsertExpressionLineage = typeof expressionLineage.$inferInsert;

// ── Prompt Drafts ─────────────────────────────────────────────────────────────
// Named drafts saved from the Provenance Prompt Generator Studio tab.
// Each draft is a standalone saved output tied to the creator's EID lineage.
export const promptDrafts = mysqlTable("promptDrafts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  promptMode: mysqlEnum("promptMode", ["identity_regen", "style_prompt", "import_anchor"]).default("style_prompt").notNull(),
  sourcePlatform: varchar("sourcePlatform", { length: 64 }),
  rawExternalPrompt: text("rawExternalPrompt"),
  promptType: varchar("promptType", { length: 32 }).notNull(),
  targetPlatform: varchar("targetPlatform", { length: 32 }),
  expressionId: varchar("expressionId", { length: 32 }),
  prompt: text("prompt").notNull(),
  styleTags: text("styleTags"),
  composerNote: text("composerNote"),
  userInputBlocks: text("userInputBlocks"),
  shareToken: varchar("shareToken", { length: 64 }),
  shareUrl: varchar("shareUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PromptDraft = typeof promptDrafts.$inferSelect;
export type InsertPromptDraft = typeof promptDrafts.$inferInsert;

// ─── Content Flags (Moderation) ───────────────────────────────────────────────
export const contentFlags = mysqlTable("contentFlags", {
  id: int("id").autoincrement().primaryKey(),
  // What was flagged
  workId: int("workId").notNull(),
  workType: mysqlEnum("workType", ["audio", "lyrics", "manuscript", "comic", "post"]).notNull(),
  workTitle: varchar("workTitle", { length: 256 }),
  // Who flagged it
  reporterId: int("reporterId").notNull(),
  reporterName: varchar("reporterName", { length: 128 }),
  // Why
  reason: mysqlEnum("reason", [
    "dehumanization",
    "csam",
    "facilitates_harm",
    "harassment",
    "spam",
    "other"
  ]).notNull(),
  details: text("details"),
  // Admin resolution
  status: mysqlEnum("status", ["pending", "reviewed_ok", "removed_violation", "escalated"]).default("pending").notNull(),
  adminNote: text("adminNote"),
  resolvedById: int("resolvedById"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContentFlag = typeof contentFlags.$inferSelect;
export type InsertContentFlag = typeof contentFlags.$inferInsert;

// ─── Declaration Signatures ───────────────────────────────────────────────────
export const declarationSignatures = mysqlTable("declarationSignatures", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  declarationVersion: varchar("declarationVersion", { length: 16 }).notNull().default("1.0"),
  signatureName: varchar("signatureName", { length: 128 }).notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  ipHash: varchar("ipHash", { length: 64 }), // anonymized IP hash for audit
});
export type DeclarationSignature = typeof declarationSignatures.$inferSelect;
export type InsertDeclarationSignature = typeof declarationSignatures.$inferInsert;

// ─── Song Versions ────────────────────────────────────────────────────────────
// Tracks the version history of a song. When a creator uploads a new version,
// the old audio/video is preserved here with its original WID and provenance.
// The songs table always holds the CURRENT (latest) version.
export const songVersions = mysqlTable("songVersions", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),              // FK → songs.id
  creatorId: int("creatorId").notNull(),         // FK → users.id
  versionNumber: int("versionNumber").notNull(), // 1, 2, 3 …
  versionLabel: varchar("versionLabel", { length: 128 }), // e.g. "Demo Mix", "Final Master"
  fileUrl: text("fileUrl").notNull(),            // S3 URL of the audio file for this version
  fileKey: varchar("fileKey", { length: 512 }),  // S3 key for cleanup
  witnessId: varchar("witnessId", { length: 64 }), // WID assigned to this version
  changeNote: text("changeNote"),                // Creator's note about what changed
  aiDisclosure: mysqlEnum("aiDisclosure", ["original", "ai_assisted", "ai_generated", "human_authored_ai_instrument"]).default("original"),
  durationSeconds: float("durationSeconds"),
  fileSizeBytes: int("fileSizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SongVersion = typeof songVersions.$inferSelect;
export type InsertSongVersion = typeof songVersions.$inferInsert;

// ─── Discord Webhooks ─────────────────────────────────────────────────────────
// Per-user, per-event Discord webhook configuration.
// Each row stores one webhook URL for one event type for one user.
// Webhook URLs are stored in plaintext (Discord webhooks are not secrets —
// they are scoped to a single channel and can be regenerated at any time).
export const discordWebhooks = mysqlTable("discordWebhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),              // owner (creator or admin)
  event: varchar("event", { length: 64 }).notNull(), // e.g. "wid_minted", "track_upload"
  webhookUrl: text("webhookUrl").notNull(),      // Discord webhook URL
  enabled: boolean("enabled").default(true).notNull(),
  lastFiredAt: timestamp("lastFiredAt"),         // last successful fire
  lastError: text("lastError"),                  // last error message (if any)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type DiscordWebhook = typeof discordWebhooks.$inferSelect;
export type InsertDiscordWebhook = typeof discordWebhooks.$inferInsert;

// ─── Platform Settings ────────────────────────────────────────────────────────
// Key-value store for admin-configurable platform settings.
// Used for sovereign migration status, feature flags, and other runtime config.
export const platformSettings = mysqlTable("platformSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: int("updatedBy"),               // userId of last admin to update
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = typeof platformSettings.$inferInsert;

// ─── Creator Projects (Crowdfunding) ─────────────────────────────────────────
// A creator-built campaign page for funding a work-in-progress.
// Platform takes 10% of all donations (same as tips, via Stripe Connect).
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),                        // FK → users.id (creator)
  slug: varchar("slug", { length: 128 }).notNull(),       // URL slug: /project/:slug
  title: varchar("title", { length: 256 }).notNull(),
  tagline: varchar("tagline", { length: 512 }),           // Short one-liner under title
  description: text("description"),                       // Rich text body (markdown)
  bannerUrl: text("bannerUrl"),                           // S3 URL for banner image
  bannerKey: varchar("bannerKey", { length: 512 }),
  videoUrl: text("videoUrl"),                             // YouTube/Vimeo embed or S3 video URL
  videoType: mysqlEnum("videoType", ["youtube", "vimeo", "s3", "none"]).default("none"),
  goalAmountCents: int("goalAmountCents"),                // Optional funding goal (null = open-ended)
  raisedAmountCents: int("raisedAmountCents").default(0).notNull(),
  donorCount: int("donorCount").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "active", "completed", "archived"]).default("draft").notNull(),
  linkedWitnessId: varchar("linkedWitnessId", { length: 64 }),
  linkedSongId: int("linkedSongId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Project Updates (Creator Progress Log) ───────────────────────────────────
export const projectUpdates = mysqlTable("projectUpdates", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }),
  body: text("body").notNull(),
  imageUrl: text("imageUrl"),
  imageKey: varchar("imageKey", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type InsertProjectUpdate = typeof projectUpdates.$inferInsert;

// ─── Project Donations ────────────────────────────────────────────────────────
export const projectDonations = mysqlTable("projectDonations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  donorUserId: int("donorUserId"),
  donorName: varchar("donorName", { length: 128 }),
  donorEmail: varchar("donorEmail", { length: 256 }),
  amountCents: int("amountCents").notNull(),
  message: text("message"),
  anonymous: boolean("anonymous").default(false).notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 256 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectDonation = typeof projectDonations.$inferSelect;
export type InsertProjectDonation = typeof projectDonations.$inferInsert;

// ─── Project Content Blocks (Inline Canvas Editor) ───────────────────────────
// Each block is one section of the project page: text, image, video, or divider.
// Ordered by `position` (ascending). Creator edits blocks in-place on the page.
export const projectBlocks = mysqlTable("projectBlocks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", ["text", "image", "video", "divider", "quote"]).notNull(),
  position: int("position").default(0).notNull(),
  content: text("content"),           // markdown text for text/quote blocks
  imageUrl: text("imageUrl"),         // S3 CDN url for image blocks
  imageKey: varchar("imageKey", { length: 512 }),
  imageCaption: varchar("imageCaption", { length: 512 }),
  videoUrl: text("videoUrl"),         // YouTube/Vimeo/S3 url for video blocks
  videoType: mysqlEnum("videoType", ["youtube", "vimeo", "s3", "none"]).default("none"),
  videoCaption: varchar("videoCaption", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ProjectBlock = typeof projectBlocks.$inferSelect;
export type InsertProjectBlock = typeof projectBlocks.$inferInsert;

// ─── Project Followers ────────────────────────────────────────────────────────
// Users who follow a project to receive update notifications (without donating).
export const projectFollowers = mysqlTable("projectFollowers", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectFollower = typeof projectFollowers.$inferSelect;
export type InsertProjectFollower = typeof projectFollowers.$inferInsert;
