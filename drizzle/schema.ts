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
  twitterHandle: varchar("twitterHandle", { length: 64 }),
  instagramHandle: varchar("instagramHandle", { length: 64 }),
  youtubeHandle: varchar("youtubeHandle", { length: 64 }),
  bannerUrl: text("bannerUrl"),

  // License & slots
  licenseStatus: mysqlEnum("licenseStatus", ["free", "licensed"]).default("free").notNull(),
  songSlotsUsed: int("songSlotsUsed").default(0).notNull(),
  songSlotsTotal: int("songSlotsTotal").default(1).notNull(),

  // Stripe
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  stripeAccountId: varchar("stripeAccountId", { length: 64 }),
  stripeAccountStatus: mysqlEnum("stripeAccountStatus", ["pending", "restricted", "enabled", "disabled"]).default("pending"),

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
  coWriters: json("coWriters").$type<string[]>(),
  albumName: varchar("albumName", { length: 255 }),
  releaseDate: varchar("releaseDate", { length: 32 }),
  isrc: varchar("isrc", { length: 32 }),
  aiConsent: mysqlEnum("aiConsent", ["prohibited", "permitted_attribution", "permitted"]).default("prohibited").notNull(),

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