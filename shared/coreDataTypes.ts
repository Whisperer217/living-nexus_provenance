/**
 * @file shared/coreDataTypes.ts
 * @version 1.0.0
 *
 * SINGULAR SOURCE OF TRUTH — Core Data Types
 * ============================================
 * These types define the canonical shapes returned by the Living Nexus tRPC API.
 * All clients (web, mobile, third-party integrations) MUST use these types when
 * consuming the API. Do not duplicate or re-derive these shapes client-side.
 *
 * Versioning policy:
 *   - Minor additions (new optional fields): bump the @version minor.
 *   - Breaking changes (field removal / rename / type change): bump the @version major
 *     and add a @deprecated comment on the old field for one release cycle.
 *
 * Import pattern:
 *   import type { SongRecord, WitnessRecord, CreatorProfile } from "@shared/coreDataTypes";
 */

// ─── AI Disclosure ────────────────────────────────────────────────────────────

/**
 * How the creator describes their authorship role for a given work.
 * Returned on both SongRecord and CreatorProfile.
 */
export type AiDisclosure =
  | "original"                      // Entirely human-made, no AI tools
  | "ai_assisted"                   // AI used as a production aid; human vision and direction
  | "ai_generated"                  // AI generated the primary content
  | "human_authored_ai_instrument"; // Human authored intent, AI used as the instrument (HAAI)

// ─── Content Type ─────────────────────────────────────────────────────────────

/**
 * The medium/format of a registered work.
 * Determines which Explore tab the work appears in and which player is used.
 */
export type ContentType =
  | "audio"       // Music track (default)
  | "lyrics"      // Standalone lyric sheet (WID-LYR only, no audio)
  | "manuscript"  // Novel, short story, essay, academic paper
  | "comic"       // Comic book, graphic novel, illustrated story
  | "game"        // Browser-playable or downloadable game
  | "image";      // Visual artwork

// ─── Song Status ──────────────────────────────────────────────────────────────

/**
 * Publication state of a work. Only "Published" works appear in public feeds.
 */
export type SongStatus = "Draft" | "Published" | "Unlisted" | "Deleted";

// ─── Download Permission ──────────────────────────────────────────────────────

/**
 * Download access policy for a work.
 *   none   = downloads disabled (default)
 *   free   = anyone can download at no cost (requires auth)
 *   tipped = download unlocked only after tipping >= downloadTipThresholdCents
 */
export type DownloadPermission = "none" | "free" | "tipped";

// ─── Creator Profile ──────────────────────────────────────────────────────────

/**
 * @version 1.0.0
 *
 * Canonical shape for a creator as returned by public feed procedures
 * (songs.discover, songs.trending, songs.newThisWeek, profile.featuredCreators).
 *
 * All feed procedures MUST return this exact shape in their `creator` field.
 * Do not add extra fields here without bumping the version.
 */
export interface CreatorSummary {
  /** Internal database ID */
  id: number;
  /** Display name (may differ from artistHandle) */
  name: string | null;
  /** Public-facing artist handle / stage name */
  artistHandle: string | null;
  /** S3 URL of the creator's profile photo */
  profilePhotoUrl: string | null;
  /** Creator's default AI disclosure stance */
  aiDisclosure: AiDisclosure | null;
  /** Creator's primary genre */
  primaryGenre: string | null;
  /** Stripe Connect account status — used to show/hide tip jar */
  stripeAccountStatus: "pending" | "restricted" | "enabled" | "disabled" | null;
  /** Platform role — used for UI badges (founder crown, etc.) */
  role: "user" | "founder" | "admin";
}

/**
 * @version 1.0.0
 *
 * Full creator profile as returned by profile.getCreator and profile.me.
 * Extends CreatorSummary with all public-facing profile fields.
 */
export interface CreatorProfile extends CreatorSummary {
  /** Long-form creator biography */
  bio: string | null;
  /** Creator's website URL */
  website: string | null;
  /** Creator's location (city, country, etc.) */
  location: string | null;
  /** Twitter/X handle (without @) */
  twitterHandle: string | null;
  /** Instagram handle (without @) */
  instagramHandle: string | null;
  /** YouTube handle */
  youtubeHandle: string | null;
  /** S3 URL of the creator's profile banner */
  bannerUrl: string | null;
  /** Number of published works */
  publishedCount?: number;
  /** Whether this creator is pinned to the top of the Featured Creators row */
  isPinned: boolean;
}

// ─── Song Record ──────────────────────────────────────────────────────────────

/**
 * @version 1.0.0
 *
 * Canonical shape for a work as returned by all public feed procedures.
 * This is the nested `song` field in feed responses — NOT the flat DB row.
 *
 * Critical provenance fields (witnessId, fileHash, createdAt) are always
 * present. Optional fields are null when not applicable to the content type.
 */
export interface SongRecord {
  // ── Identity ────────────────────────────────────────────────────────────────
  /** Internal database ID */
  id: number;
  /** Owner's user ID */
  userId: number;

  // ── Metadata ────────────────────────────────────────────────────────────────
  /** Work title */
  title: string;
  /** Genre tag */
  genre: string | null;
  /** Short punchy subtitle shown prominently on the work detail page */
  headlineCaption: string | null;
  /** Long-form description (supports Markdown) */
  description: string | null;
  /** Content medium */
  contentType: ContentType;
  /** Publication state */
  status: SongStatus;

  // ── Files ───────────────────────────────────────────────────────────────────
  /** Primary audio/media file URL (S3) */
  fileUrl: string | null;
  /** Cover art image URL (S3) */
  coverArtUrl: string | null;
  /** Duration in seconds */
  durationSeconds: number | null;
  /** SHA-256 hash of the primary file — core provenance field */
  fileHash: string | null;

  // ── Provenance ──────────────────────────────────────────────────────────────
  /**
   * Witness ID — the cryptographic provenance identifier.
   * Format: WID-MUS-{hash} for audio, WID-LYR-{hash} for lyrics, etc.
   * null = work registered before WID system or not yet witnessed.
   */
  witnessId: string | null;
  /** UTC timestamp of registration (creation) — immutable after first write */
  createdAt: Date;
  /** ECDSA signature over the WID payload */
  ecdsaSignature: string | null;
  /** ECDSA public key used to generate the signature */
  ecdsaPublicKey: string | null;
  /** Harmonic fingerprint array (audio only) */
  harmonicSignature: number[] | null;
  /** PDF certificate URL (S3) */
  certificateUrl: string | null;

  // ── Lyrics Provenance ───────────────────────────────────────────────────────
  /** Separate lyrics WID (WID-LYR-*) when lyrics were witnessed independently */
  lyricsWid: string | null;
  /** SHA-256 hash of the lyrics text */
  lyricsHash: string | null;
  /** Timestamp when lyrics were added/witnessed */
  lyricsAddedAt: Date | null;

  // ── AI Disclosure ───────────────────────────────────────────────────────────
  /** Per-work AI disclosure (overrides creator default) */
  aiDisclosure: AiDisclosure | null;
  /** AI consent policy for this work */
  aiConsent: "prohibited" | "permitted_attribution" | "permitted";

  // ── Download ────────────────────────────────────────────────────────────────
  /** Download access policy */
  downloadPermission: DownloadPermission;
  /** Minimum tip in cents to unlock download (when downloadPermission = "tipped") */
  downloadTipThresholdCents: number;

  // ── Engagement ──────────────────────────────────────────────────────────────
  /** Total qualified play count (incremented by recordPlay, not raw play) */
  playCount: number | null;

  // ── Misc ────────────────────────────────────────────────────────────────────
  /** ISRC code (audio only) */
  isrc: string | null;
  /** Whether this is a lyrics-only work (no audio file) */
  isLyricsOnly: boolean;
  /** Player asset type — "cover" = static art, "video" = music video */
  playerAssetType: "cover" | "video";
}

// ─── Feed Row ─────────────────────────────────────────────────────────────────

/**
 * @version 1.0.0
 *
 * The shape returned by all public discovery feed procedures:
 *   - songs.discover
 *   - songs.trending
 *   - songs.newThisWeek
 *   - songs.getWitnessedVoices (normalized to this shape)
 *
 * This is the ONLY shape mobile and third-party clients should expect
 * from any list/feed endpoint. Do not consume raw DB rows.
 */
export interface FeedRow {
  song: SongRecord;
  creator: CreatorSummary;
}

// ─── Witness Record ───────────────────────────────────────────────────────────

/**
 * @version 1.0.0
 *
 * Canonical shape returned by songs.verifyWid and wids.lookup.
 * This is the authoritative provenance record for any Witness ID.
 *
 * All fields are present for audio WIDs. Fields marked optional are
 * null for non-audio content types (testimony, project, lyrics-only).
 */
export interface WitnessRecord {
  // ── Identity ────────────────────────────────────────────────────────────────
  /** The Witness ID string (e.g. "WID-MUS-abc123") */
  witnessId: string | null;
  /** Work title at time of registration */
  title: string;
  /** Content type of the witnessed work */
  contentType: ContentType | "testimony" | "project";

  // ── Creator ─────────────────────────────────────────────────────────────────
  /** Current artist name / handle */
  artistName: string;
  /** Current artist handle */
  artistHandle: string | null | undefined;
  /** Creator profile photo URL */
  profilePhotoUrl: string | null | undefined;
  /** Internal creator user ID */
  creatorId: number | null | undefined;
  /** Internal song owner user ID */
  creatorUserId: number | null | undefined;
  /** Internal song ID */
  songId: number | null;
  /**
   * Artist name as it was at the moment of witnessing.
   * May differ from artistName if the creator changed their handle.
   */
  nameAtWitnessing: string;
  /** Full name change history for this creator */
  nameHistory: Array<{ oldName: string | null; newName: string; changedAt: Date }>;

  // ── Timestamps ──────────────────────────────────────────────────────────────
  /** UTC timestamp when the WID was issued — immutable provenance anchor */
  registeredAt: Date | null;

  // ── Cryptographic Provenance ────────────────────────────────────────────────
  /** SHA-256 hash of the primary file */
  fileHash: string | null;
  /** SHA-256 hash of the lyrics text */
  lyricsHash: string | null;
  /** ECDSA signature over the WID payload */
  ecdsaSignature: string | null;
  /** ECDSA public key used to generate the signature */
  ecdsaPublicKey: string | null;
  /** Harmonic fingerprint array (audio only) */
  harmonicSignature: number[] | null;

  // ── Media ───────────────────────────────────────────────────────────────────
  /** Cover art URL */
  coverArtUrl: string | null;

  // ── Metadata ────────────────────────────────────────────────────────────────
  /** Genre tag */
  genre: string | null;
  /** ISRC code (audio only) */
  isrc: string | null;
  /** AI consent policy */
  aiConsent: "prohibited" | "permitted_attribution" | "permitted" | boolean | null;
  /** Per-work AI disclosure */
  aiDisclosure: AiDisclosure | null;
  /** Whether this is a lyrics-only work */
  isLyricsOnly: boolean;

  // ── Lyrics Provenance ───────────────────────────────────────────────────────
  /** Separate lyrics WID */
  lyricsWid: string | null;
  /** Original lyrics filename */
  lyricsFileName: string | null;
  /** Timestamp when lyrics were added */
  lyricsAddedAt: Date | null;

  // ── Testimony / Project (non-audio WID types) ────────────────────────────────
  /** For WID-TST: the testimony text content */
  testimonyContent?: string | null;
  /** For WID-TST: linked work WIDs */
  testimonyLinkedWorks?: string[];
}

// ─── License Record ───────────────────────────────────────────────────────────

/**
 * @version 1.0.0
 *
 * Canonical shape for a creator's license status.
 * Returned by licenses.getStatus and embedded in profile.me.
 */
export interface LicenseRecord {
  /** License tier */
  licenseStatus: "free" | "licensed";
  /** Number of song slots currently used */
  songSlotsUsed: number;
  /** Total song slots available */
  songSlotsTotal: number;
  /**
   * Remaining slots. Null means unlimited (founder tier).
   * Computed as: songSlotsTotal - songSlotsUsed, capped at 0.
   */
  slotsRemaining: number | null;
}

// ─── Download Grant ───────────────────────────────────────────────────────────

/**
 * @version 1.0.0
 *
 * Canonical shape returned by songs.download when a download is authorized.
 * Clients should use this URL directly — it is a time-limited presigned S3 URL.
 */
export interface DownloadGrant {
  /** Presigned S3 download URL (expires in ~15 minutes) */
  url: string;
  /** Original filename for the download */
  filename: string;
  /** MIME type of the file */
  mimeType: string | null;
  /** Whether the download was free or tip-gated */
  grantType: "free" | "tipped";
}

// ─── Provenance Event ─────────────────────────────────────────────────────────

/**
 * @version 1.0.0
 *
 * A single entry in the provenance timeline for a work.
 * Returned by provenance.getTimeline.
 */
export interface ProvenanceEvent {
  /** Internal event ID */
  id: number;
  /** The work this event belongs to */
  songId: number;
  /** Event type — describes what happened */
  eventType: string;
  /** Human-readable description of the event */
  description: string | null;
  /** UTC timestamp of the event */
  createdAt: Date;
  /** User who triggered the event (null for system events) */
  actorId: number | null;
  /** Additional structured metadata (JSON) */
  metadata: Record<string, unknown> | null;
}

// ─── API Contract Version ─────────────────────────────────────────────────────

/**
 * Current API contract version.
 * Increment this when making breaking changes to any type in this file.
 * Mobile clients should check this against their expected version on startup.
 */
export const CORE_API_VERSION = "1.0.0" as const;

/**
 * Minimum supported API version for mobile clients.
 * Clients older than this version should prompt for an app update.
 */
export const MIN_SUPPORTED_CLIENT_VERSION = "1.0.0" as const;
