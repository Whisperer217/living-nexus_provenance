/**
 * Loop — Music Provenance Product Scope
 * ═══════════════════════════════════════
 * Living Nexus Loop is music provenance powered by the WID engine.
 * All other creative mediums and adjacent product systems are out of scope.
 *
 * Product spine:
 *   Discover → Register → Work → Creator → Manage → Verify
 */

export const LOOP_PRODUCT = {
  name: "Loop",
  fullName: "Living Nexus Loop",
  tagline: "Music provenance. Sealed at the source.",
  supporting:
    "Register a track. Receive a Witness ID. Own the chain of record.",
  medium: "music" as const,
  contentType: "audio" as const,
  widPrefix: "WID-MUS",
  /** Authority document */
  specPath: "docs/LOOP_PRODUCT_SPEC.md",
} as const;

/** Primary navigation for Loop — nothing else belongs in the rail. */
export const LOOP_NAV = [
  { id: "home", label: "Home", path: "/" },
  { id: "explore", label: "Explore", path: "/explore" },
  { id: "register", label: "Register", path: "/manifest", authRequired: true },
  { id: "manage", label: "Manage", path: "/manage", authRequired: true },
  { id: "archive", label: "Archive", path: "/archive", authRequired: true },
] as const;

/**
 * Systems removed from the Loop spine (Discover → Register → Work → Creator → Manage).
 * PNA, Creator Guides, Keeper Avatar, and Avatar Registry are stewarded
 * companions — not in this list.
 */
export const LOOP_REMOVED_SYSTEMS = [
  "comic",
  "manuscript",
  "lyrics-standalone",
  "video",
  "gcode",
  "games",
  "visual-works",
  "projects",
  "sessions",
  "keeper-compose",
  "marketplace",
] as const;

/** Stewarded companion surfaces — kept alive off Loop chrome. */
export const GUIDE_STEWARD_ROUTES = [
  "/guides",
  "/guides/upload",
  "/guide",
] as const;

export const GUIDE_PRODUCT = {
  name: "Guides",
  fullName: "Living Nexus Guides",
  tagline: "Creator characters. Three slots. Grown by platform signals.",
  path: "/guides",
  uploadPath: "/guides/upload",
  defaultSlots: 3,
} as const;

/** Stewarded companion surfaces — kept alive off the Loop chrome overlay. */
export const PNA_STEWARD_ROUTES = [
  "/pna",
  "/keeper",
  "/avatar-registry",
] as const;

export const PNA_PRODUCT = {
  name: "PNA",
  fullName: "Provenance Nexus Avatar",
  tagline: "Persistent creator intelligence. Stewarded, not discarded.",
  path: "/pna",
} as const;

/** Paths that redirect into the Loop spine or PNA store. */
export const LOOP_REDIRECTS: Record<string, string> = {
  "/sessions": "/manage",
  "/new-manifestation": "/manifest",
  "/projects": "/explore",
  "/my-projects": "/manage",
  "/marketplace": "/avatar-registry",
  "/visual-works": "/explore",
  "/keeper-compose": "/pna",
  "/store": "/avatar-registry",
  "/dashboard": "/manage",
  "/creator-surface": "/pna",
  "/domain": "/manage",
};

/** Canonical surface map (see docs/LOOP_PRODUCT_SPEC.md §9). */
export const SURFACE_MAP = {
  home: { path: "/", job: "Orientation porch — process, PNA, limited showcase, Discord" },
  explore: { path: "/explore", job: "Find songs & artists only" },
  register: { path: "/manifest", job: "Seal audio into the registry", authRequired: true },
  manage: { path: "/manage", job: "Catalog ops", authRequired: true },
  pna: { path: "/pna", job: "Stewarded creator OS", authRequired: true },
  pnaStore: { path: "/avatar-registry", job: "Skins, slots, personality — PNA commerce (/keeper companion)" },
} as const;

export const DISCORD_COMMUNITY_URL = "https://discord.gg/ADF9dtVA";

export function isLoopMusicFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    mime.startsWith("audio/") ||
    ["mp3", "flac", "wav", "ogg", "aac", "m4a", "opus", "aiff"].includes(ext)
  );
}
