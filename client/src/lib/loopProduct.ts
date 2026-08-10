/**
 * Loop — Music Provenance Product Scope
 * ═══════════════════════════════════════
 * Living Nexus Loop is music provenance powered by the WID engine.
 * All other creative mediums and adjacent product systems are out of scope.
 *
 * Product spine:
 *   Discover → Work → Creator → Register → Manage → Verify
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

/** Systems removed from the Loop spine (Discover → Register → Work → Creator → Manage). */
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
  "avatar-registry",
  "pna",
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

/** Paths that redirect into the Loop spine. */
export const LOOP_REDIRECTS: Record<string, string> = {
  "/sessions": "/manage",
  "/new-manifestation": "/manifest",
  "/projects": "/explore",
  "/my-projects": "/manage",
  "/marketplace": "/explore",
  "/avatar-registry": "/explore",
  "/visual-works": "/explore",
  "/keeper": "/explore",
  "/keeper-compose": "/manifest",
  "/store": "/explore",
  "/dashboard": "/manage",
  "/creator-surface": "/manage",
  "/domain": "/manage",
};

export function isLoopMusicFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    mime.startsWith("audio/") ||
    ["mp3", "flac", "wav", "ogg", "aac", "m4a", "opus", "aiff"].includes(ext)
  );
}
