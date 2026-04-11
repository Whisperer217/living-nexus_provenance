/**
 * shared/contentTypes.ts
 * Single source of truth for all content-type constants used across
 * UploadPage, EditTrackPanel, and any future format-aware UI.
 *
 * Rules:
 *  - UPLOAD_GENRES  → coarse combined labels for the upload wizard
 *  - EDIT_GENRES    → granular single-genre labels for the edit panel
 *  - MANUSCRIPT_CATEGORIES / COMIC_CATEGORIES → shared across both
 *  - MOODS / MANUSCRIPT_THEMES → shared across both
 *
 * Do NOT import from here in server-side code — this is a client-only
 * display constant file. Server validation uses its own enum in schema.ts.
 */

/** Coarse genre labels used in the Upload wizard Step 2 */
export const UPLOAD_GENRES = [
  "Ambient / Lo-fi",
  "Electronic / House",
  "Gospel / Worship",
  "Classical / Jazz",
  "Hip-Hop / Trap",
  "Rock / Indie",
  "R&B / Soul",
  "Pop",
  "Other",
] as const;

/** Granular single-genre labels used in the Edit Track panel */
export const EDIT_GENRES = [
  "Gospel",
  "Hip-Hop",
  "R&B",
  "Electronic",
  "Rock",
  "Classical",
  "Jazz",
  "Ambient",
  "Pop",
  "Country",
  "Latin",
  "Metal",
  "Folk",
  "Soul",
  "Funk",
  "Reggae",
  "Blues",
  "Indie",
  "Alternative",
  "Other",
] as const;

/** Categories for Manuscript / Written Work uploads and edits */
export const MANUSCRIPT_CATEGORIES = [
  "Fiction",
  "Non-Fiction",
  "Poetry",
  "Memoir",
  "Theology",
  "Philosophy",
  "Biography",
  "Self-Help",
  "Academic",
  "Devotional",
  "Children's",
  "Young Adult",
  "Short Stories",
  "Essay Collection",
  "Other",
] as const;

/** Categories for Comic / Illustrated Work uploads and edits */
export const COMIC_CATEGORIES = [
  "Graphic Novel",
  "Manga",
  "Webcomic",
  "Comic Strip",
  "Illustrated Story",
  "Children's Illustrated",
  "Faith / Devotional",
  "Sci-Fi / Fantasy",
  "Memoir / Auto-Bio",
  "Other",
] as const;

/** Mood tags for audio/music works */
export const MOODS = [
  "War",
  "Healing",
  "Loss",
  "Triumph",
  "Faith",
  "Love",
  "Protest",
  "Documentary",
  "Joy",
  "Lament",
] as const;

/** Theme tags for manuscript and comic works */
export const MANUSCRIPT_THEMES = [
  "Faith",
  "War",
  "Identity",
  "Healing",
  "Loss",
  "Redemption",
  "Justice",
  "Love",
  "Protest",
  "Legacy",
  "Triumph",
  "Lament",
] as const;

/** Content type discriminator — matches songs.contentType in schema.ts */
export const CONTENT_TYPES = [
  "music",
  "lyrics",
  "manuscript",
  "comic",
  "video",
  "podcast",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

/** Returns true if the content type is a written work (manuscript or comic) */
export function isWrittenWork(contentType: string | null | undefined): boolean {
  return contentType === "manuscript" || contentType === "comic";
}
