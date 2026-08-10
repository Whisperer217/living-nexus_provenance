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
} as const;

/** Primary navigation for Loop — nothing else belongs in the rail. */
export const LOOP_NAV = [
  { id: "home", label: "Home", path: "/" },
  { id: "explore", label: "Explore", path: "/explore" },
  { id: "register", label: "Register", path: "/manifest", authRequired: true },
  { id: "manage", label: "Manage", path: "/manage", authRequired: true },
  { id: "archive", label: "Archive", path: "/archive", authRequired: true },
] as const;

/** Routes and systems removed from the Loop product surface. */
export const LOOP_REMOVED_SYSTEMS = [
  "comic",
  "manuscript",
  "lyrics-standalone",
  "video",
  "gcode",
  "games",
  "visual-works",
  "projects",
  "guides",
  "sessions",
  "keeper-compose",
  "marketplace",
  "avatar-registry",
  "pna",
] as const;

/** Paths that redirect into the Loop spine. */
export const LOOP_REDIRECTS: Record<string, string> = {
  "/guides": "/explore",
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
