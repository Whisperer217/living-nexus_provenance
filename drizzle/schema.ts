import {
  int, mysqlEnum, mysqlTable, text, timestamp,
  varchar, float, boolean, json
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

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
  aiDisclosure: mysqlEnum("aiDisclosure", ["original", "ai_assisted", "ai_generated"]).default("original"),
  primaryGenre: varchar("primaryGenre", { length: 64 }),

  // License & slots
  licenseStatus: mysqlEnum("licenseStatus", ["free", "licensed"]).default("free").notNull(),
  songSlotsUsed: int("songSlotsUsed").default(0).notNull(),
  songSlotsTotal: int("songSlotsTotal").default(1).notNull(),

  // Stripe
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  stripeAccountId: varchar("stripeAccountId", { length: 64 }),
  stripeAccountStatus: mysqlEnum("stripeAccountStatus", ["pending", "restricted", "enabled", "disabled"]).default("pending"),

  // Founder's Era supporter tier (denormalized from platformSupporters for fast badge rendering)
  supporterTier: mysqlEnum("supporterTier", ["supporter", "patron", "covenant"]),

  // Onboarding
  hasSeenWelcome: boolean("hasSeenWelcome").default(false).notNull(),

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

  // Download permissions
  // "none"   = downloads disabled (default — auto-off on every upload)
  // "free"   = anyone can download at no cost
  // "tipped" = download unlocked only after tipping >= downloadTipThresholdCents
  downloadPermission: mysqlEnum("downloadPermission", ["none", "free", "tipped"]).default("none").notNull(),
  downloadTipThresholdCents: int("downloadTipThresholdCents").default(179).notNull(), // $1.79 default

  // Collection membership (WID-ALB back-reference)
  collectionId: int("collectionId"),  // FK → collections.id; null = not part of a collection

  // Image position
  coverPositionX: float("coverPositionX").default(50).notNull(),
  coverPositionY: float("coverPositionY").default(50).notNull(),

  // Status
  status: mysqlEnum("status", ["Draft", "Published", "Unlisted", "Deleted"]).default("Published").notNull(),

  // Stats
  isPublic: boolean("isPublic").default(true).notNull(),
  playCount: int("playCount").default(0).notNull(),
  tipCount: int("tipCount").default(0).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
  ]).notNull(),

  // Work reference (WID origin node)
  workId: int("workId").notNull(),   // maps to songs.id

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
    "playlist_invite",   // invited to collaborate on a playlist
    "new_track",         // someone you witness dropped a new track
    "system",            // platform announcement
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
