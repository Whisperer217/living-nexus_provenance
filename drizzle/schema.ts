import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Ed25519 public key, base64-encoded. Generated on first login. */
  publicKey: text("publicKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Personal Nexus Agent (PNA) ───────────────────────────────────────────────
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** JSON: { tone: string[], structure_patterns: string[], common_transforms: string[] } */
  styleFingerprint: json("styleFingerprint").$type<{
    tone: string[];
    structure_patterns: string[];
    common_transforms: string[];
  }>(),
  /** JSON: { voice_constraints: string[] } */
  frozenTraits: json("frozenTraits").$type<{
    voice_constraints: string[];
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ─── Events (append-only ledger) ─────────────────────────────────────────────
export const events = mysqlTable("events", {
  /** SHA-256 of the canonical payload — serves as the event ID */
  eventId: varchar("eventId", { length: 64 }).primaryKey(),
  creatorId: int("creatorId").notNull(),
  agentId: int("agentId"),
  actionType: mysqlEnum("actionType", ["draft", "checkpoint", "anchor", "fork"]).notNull(),
  /** SHA-256 of the input content, or null */
  inputRef: varchar("inputRef", { length: 64 }),
  /** SHA-256 of the output content, or null */
  outputRef: varchar("outputRef", { length: 64 }),
  /** SHA-256 of the parent event, or null (first event in chain) */
  parentEventId: varchar("parentEventId", { length: 64 }),
  /** JSON: { origin_type, source_refs, transformation_type } */
  origin: json("origin").$type<{
    origin_type: "original" | "derived" | "assisted";
    source_refs: string[];
    transformation_type: "rewrite" | "remix" | "extension" | null;
  }>(),
  /** Canonicalized payload string (UTF-8, normalized) */
  payloadCanonical: text("payloadCanonical").notNull(),
  /** Ed25519 signature over eventId, base64-encoded */
  signature: text("signature"),
  /** Session/thread label for Satchel grouping */
  sessionLabel: varchar("sessionLabel", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── WIDs (Work Identity Documents) ──────────────────────────────────────────
export const wids = mysqlTable("wids", {
  /** SHA-256 content hash — the WID itself */
  wid: varchar("wid", { length: 64 }).primaryKey(),
  eventId: varchar("eventId", { length: 64 }).notNull(),
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  creatorId: int("creatorId").notNull(),
  /** Ed25519 signature over contentHash, base64-encoded */
  signature: text("signature"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Wid = typeof wids.$inferSelect;
export type InsertWid = typeof wids.$inferInsert;

// ─── Keeper Skins ─────────────────────────────────────────────────────────────
export const keeperSkins = mysqlTable("keeper_skins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Skin identifier: 'hooded-scholar' | 'conductor' | 'witness' | 'archivist' | 'cipher' | 'custom' */
  skinId: varchar("skinId", { length: 64 }).notNull(),
  /** For custom upload: S3 URL of the uploaded portrait */
  customImageUrl: text("customImageUrl"),
  /** Whether this skin is currently active */
  isActive: int("isActive").default(0).notNull(),
  /** Credits paid (0 for default) */
  creditsPaid: int("creditsPaid").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KeeperSkin = typeof keeperSkins.$inferSelect;
export type InsertKeeperSkin = typeof keeperSkins.$inferInsert;
