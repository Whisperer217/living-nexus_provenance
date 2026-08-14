// ─── Creator Domain Block System ─────────────────────────────────────────────
// Shared types for the Creator Domain Engine.
// These types are used by both the server (tRPC procedures) and the client
// (DomainRenderer, DomainEditor, Shelf components).

export const DOMAIN_BLOCK_TYPES = [
  // ── Identity Category ──────────────────────────────────────────────────────
  "hero",              // Banner + avatar + name + origin statement
  "bio",               // Creator bio, philosophy, doctrine
  // ── Shelf Category (one per medium) ───────────────────────────────────────
  "shelf_music",       // Record rack — music tracks
  "shelf_books",       // Bookshelf — novels, short stories, essays
  "shelf_comics",      // Comic rack — comics, graphic novels
  "shelf_manuscripts", // Manuscript cabinet — academic papers, manuscripts
  "shelf_artifacts",   // Artifact collection — relics, objects, visual art
  "shelf_merch",       // Merchandise display — physical products
  "shelf_collections", // Manifested Collections shelf
  "shelf_games",       // Game arcade — playable games
  // ── Featured Category ─────────────────────────────────────────────────────
  "featured_work",     // Pinned/highlighted works (up to 6 IDs)
  "latest_releases",   // Newest public music, ordered by release/registration date
  "genre_paths",       // Music grouped into creator-defined genre paths
  "playlists_shelf",   // Public creator-owned playlists
  // ── Commerce Category ─────────────────────────────────────────────────────
  "distribution_links",// DSP links (Spotify, Apple Music, Bandcamp, etc.)
  "tip_jar",           // Direct support / tip jar
  // ── Provenance Category ───────────────────────────────────────────────────
  "provenance_trail",  // WID timeline / domain version history
  // ── Community Category ────────────────────────────────────────────────────
  "field_notes",       // Creator's field notes feed
  "community",         // Followers, collaborators, community links
  // ── Structural ────────────────────────────────────────────────────────────
  "divider",           // Visual section divider
  "custom_text",       // Free-form text / announcement block
] as const;

export type DomainBlockType = typeof DOMAIN_BLOCK_TYPES[number];

export type DomainBlockSize = "small" | "medium" | "large" | "full";

// ── Per-block config shapes ───────────────────────────────────────────────────

export interface HeroBlockConfig {
  showOriginStatement?: boolean;
  showActiveMediums?: boolean;
  customHeading?: string;
}

export interface BioBlockConfig {
  showPhilosophy?: boolean;
  showDoctrine?: boolean;
  showSigil?: boolean;
  showContinuity?: boolean;
}

export interface ShelfBlockConfig {
  heading?: string;         // Custom section heading
  maxItems?: number;        // Max items to show (default 12)
  viewMode?: "rack" | "grid" | "list" | "spine"; // Display style
  showWid?: boolean;        // Show WID badges
  showPlayButton?: boolean; // Show play buttons (music only)
  collectionId?: number;    // Pin to a specific collection/album
  sortMode?: "latest" | "displayOrder" | "alphabetical";
  groupBy?: "none" | "genre" | "album";
}

export interface FeaturedWorkBlockConfig {
  songIds?: number[];       // Up to 6 song IDs to feature
  heading?: string;
  layout?: "carousel" | "grid" | "spotlight";
}

export interface DistributionLinksBlockConfig {
  heading?: string;
  showSpotify?: boolean;
  showAppleMusic?: boolean;
  showBandcamp?: boolean;
  showSoundCloud?: boolean;
  showTidal?: boolean;
  showYouTube?: boolean;
  customLinks?: Array<{ label: string; url: string }>;
}

export interface ProvenanceTrailBlockConfig {
  showDomainVersions?: boolean;
  showWids?: boolean;
  maxItems?: number;
}

export interface CustomTextBlockConfig {
  content?: string;         // Markdown content
  heading?: string;
  alignment?: "left" | "center" | "right";
}

export interface DividerBlockConfig {
  style?: "line" | "ornament" | "sigil" | "space";
  thickness?: "thin" | "medium" | "thick";
}

// Union config type
export type DomainBlockConfig =
  | HeroBlockConfig
  | BioBlockConfig
  | ShelfBlockConfig
  | FeaturedWorkBlockConfig
  | DistributionLinksBlockConfig
  | ProvenanceTrailBlockConfig
  | CustomTextBlockConfig
  | DividerBlockConfig
  | Record<string, unknown>;

// ── Full block record (as returned by tRPC) ───────────────────────────────────
export interface DomainBlockRecord {
  id: number;
  userId: number;
  blockType: DomainBlockType;
  position: number;
  visible: boolean;
  size: DomainBlockSize;
  config: DomainBlockConfig | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Domain version snapshot ───────────────────────────────────────────────────
export interface DomainVersionSnapshot {
  blockType: string;
  position: number;
  visible: boolean;
  size: string;
  config: Record<string, unknown>;
}

export interface DomainVersionRecord {
  id: number;
  userId: number;
  versionNumber: number;
  layoutSnapshot: DomainVersionSnapshot[];
  changeNote: string | null;
  createdAt: Date;
}

// ── Default domain layout (applied to new creators on first domain load) ──────
export const DEFAULT_DOMAIN_LAYOUT: Array<{
  blockType: DomainBlockType;
  position: number;
  visible: boolean;
  size: DomainBlockSize;
  config: Record<string, unknown>;
}> = [
  // Loop: identity / testimony first, then music — non-music shelves stay in schema but hidden
  { blockType: "hero",              position: 0,  visible: true,  size: "full", config: { showOriginStatement: true, showActiveMediums: false } },
  { blockType: "bio",               position: 1,  visible: true,  size: "full", config: { showPhilosophy: true, showDoctrine: false, showSigil: true } },
  { blockType: "featured_work",     position: 2,  visible: true,  size: "full", config: { heading: "Featured Works", layout: "carousel" } },
  { blockType: "shelf_music",       position: 3,  visible: true,  size: "full", config: { heading: "Works", maxItems: 24, viewMode: "list", showWid: true, showPlayButton: true } },
  { blockType: "shelf_collections", position: 4,  visible: true,  size: "full", config: { heading: "Albums" } },
  { blockType: "distribution_links",position: 5,  visible: true,  size: "full", config: { heading: "Listen", showSpotify: true, showAppleMusic: true, showBandcamp: true } },
  { blockType: "tip_jar",           position: 6,  visible: true,  size: "full", config: {} },
  { blockType: "provenance_trail",  position: 7,  visible: true,  size: "full", config: { showDomainVersions: true, showWids: true, maxItems: 10 } },
  { blockType: "community",         position: 8,  visible: false, size: "full", config: {} },
  { blockType: "field_notes",       position: 9,  visible: false, size: "full", config: {} },
  { blockType: "shelf_books",       position: 10, visible: false, size: "full", config: { heading: "Library", maxItems: 12, viewMode: "spine" } },
  { blockType: "shelf_comics",      position: 11, visible: false, size: "full", config: { heading: "Comics", maxItems: 12, viewMode: "rack" } },
  { blockType: "shelf_manuscripts", position: 12, visible: false, size: "full", config: { heading: "Manuscripts", maxItems: 12, viewMode: "grid" } },
  { blockType: "shelf_games",       position: 13, visible: false, size: "full", config: { heading: "Games" } },
  { blockType: "shelf_artifacts",   position: 14, visible: false, size: "full", config: { heading: "Artifacts" } },
  { blockType: "shelf_merch",       position: 15, visible: false, size: "full", config: { heading: "Merch" } },
];

/** Loop creator sanctuary default: music-native rooms, not mixed-media shelves. */
export const LOOP_DEFAULT_DOMAIN_LAYOUT: typeof DEFAULT_DOMAIN_LAYOUT = [
  { blockType: "featured_work",     position: 0, visible: true,  size: "full", config: { heading: "Featured Tracks", layout: "grid" } },
  { blockType: "latest_releases",   position: 1, visible: true,  size: "full", config: { heading: "Latest Releases", maxItems: 6 } },
  { blockType: "shelf_collections", position: 2, visible: true,  size: "full", config: { heading: "Albums & Releases" } },
  { blockType: "playlists_shelf",   position: 3, visible: true,  size: "full", config: { heading: "Playlists" } },
  { blockType: "genre_paths",       position: 4, visible: true,  size: "full", config: { heading: "Genre Paths", maxItems: 12 } },
  { blockType: "distribution_links",position: 5, visible: true,  size: "full", config: { heading: "Listen Elsewhere", showSpotify: true, showAppleMusic: true, showBandcamp: true, showSoundCloud: true, showYouTube: true } },
  { blockType: "provenance_trail",  position: 6, visible: false, size: "full", config: { showDomainVersions: true, showWids: true, maxItems: 10 } },
  { blockType: "custom_text",       position: 7, visible: false, size: "full", config: {} },
  { blockType: "divider",           position: 8, visible: false, size: "full", config: { style: "ornament" } },
];

/** Non-music shelves — kept in schema for export, delisted from Loop product surface. */
export const LOOP_DELISTED_DOMAIN_BLOCKS: readonly DomainBlockType[] = [
  "shelf_books",
  "shelf_comics",
  "shelf_manuscripts",
  "shelf_artifacts",
  "shelf_merch",
  "shelf_games",
] as const;

/** Blocks creators may arrange on Loop. Identity/testimony/support/library are flagship page fixtures. */
export const LOOP_DOMAIN_ALLOWED_BLOCKS: readonly DomainBlockType[] = [
  "featured_work",
  "latest_releases",
  "shelf_collections",
  "playlists_shelf",
  "genre_paths",
  "distribution_links",
  "provenance_trail",
  "custom_text",
  "divider",
] as const;

export function isLoopAllowedDomainBlock(blockType: DomainBlockType): boolean {
  return LOOP_DOMAIN_ALLOWED_BLOCKS.includes(blockType);
}

export function isLoopMusicContentType(contentType?: string | null): boolean {
  const value = (contentType || "audio").toLowerCase();
  return value === "audio" || value === "music";
}
