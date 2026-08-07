import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../utils/db";
import { creatorPlatforms } from "../../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── Platform registry ────────────────────────────────────────────────────────
// Defines metadata for every supported platform type.
export const PLATFORM_REGISTRY = {
  youtube:      { label: "YouTube",        color: "#FF0000", icon: "youtube",      rssPattern: "https://www.youtube.com/feeds/videos.xml?channel_id={handle}", embedType: "youtube" },
  substack:     { label: "Substack",       color: "#FF6719", icon: "substack",     rssPattern: "https://{handle}.substack.com/feed", embedType: "rss" },
  spotify:      { label: "Spotify",        color: "#1DB954", icon: "spotify",      embedType: "spotify" },
  soundcloud:   { label: "SoundCloud",     color: "#FF5500", icon: "soundcloud",   embedType: "soundcloud" },
  bandcamp:     { label: "Bandcamp",       color: "#1DA0C3", icon: "bandcamp",     embedType: "bandcamp" },
  distrokid:    { label: "DistroKid",      color: "#00D4FF", icon: "distrokid",    embedType: "link" },
  orcid:        { label: "ORCID",          color: "#A6CE39", icon: "orcid",        embedType: "link" },
  figshare:     { label: "Figshare",       color: "#E5522B", icon: "figshare",     embedType: "link" },
  zenodo:       { label: "Zenodo",         color: "#024D9E", icon: "zenodo",       embedType: "link" },
  researchgate: { label: "ResearchGate",   color: "#00CCBB", icon: "researchgate", embedType: "link" },
  academia:     { label: "Academia.edu",   color: "#41A85F", icon: "academia",     embedType: "link" },
  github:       { label: "GitHub",         color: "#6E40C9", icon: "github",       rssPattern: "https://github.com/{handle}.atom", embedType: "rss" },
  instagram:    { label: "Instagram",      color: "#E1306C", icon: "instagram",    embedType: "link" },
  twitter:      { label: "X / Twitter",    color: "#1DA1F2", icon: "twitter",      embedType: "link" },
  linkedin:     { label: "LinkedIn",       color: "#0A66C2", icon: "linkedin",     embedType: "link" },
  patreon:      { label: "Patreon",        color: "#FF424D", icon: "patreon",      embedType: "link" },
  kofi:         { label: "Ko-fi",          color: "#FF5E5B", icon: "kofi",         embedType: "link" },
  tiktok:       { label: "TikTok",         color: "#69C9D0", icon: "tiktok",       embedType: "link" },
  twitch:       { label: "Twitch",         color: "#9146FF", icon: "twitch",       embedType: "link" },
  discord:      { label: "Discord",        color: "#5865F2", icon: "discord",      embedType: "link" },
  apple_music:  { label: "Apple Music",    color: "#FC3C44", icon: "apple_music",  embedType: "link" },
  website:      { label: "Website",        color: "#D4AF37", icon: "website",      rssPattern: "{url}/feed", embedType: "rss" },
  custom:       { label: "Custom Link",    color: "#888888", icon: "custom",       embedType: "link" },
} as const;

export type PlatformType = keyof typeof PLATFORM_REGISTRY;

// ─── RSS fetch helper ─────────────────────────────────────────────────────────
async function fetchRssPreview(url: string): Promise<Array<{ title: string; link: string; pubDate?: string; description?: string; thumbnail?: string }>> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();
    // Parse <item> or <entry> elements
    const itemRegex = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    const items: Array<{ title: string; link: string; pubDate?: string; description?: string; thumbnail?: string }> = [];
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 6) {
      const block = match[1];
      const title = (/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(block)?.[1] ?? "").trim();
      const link = (/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(block)?.[1] ?? /<link[^>]+href="([^"]+)"/i.exec(block)?.[1] ?? "").trim();
      const pubDate = (/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i.exec(block)?.[1] ?? "").trim();
      const description = (/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]{0,300})(?:\]\]>)?<\/(?:description|summary|content)>/i.exec(block)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
      const thumbnail = (/<media:thumbnail[^>]+url="([^"]+)"/i.exec(block)?.[1] ?? /<itunes:image[^>]+href="([^"]+)"/i.exec(block)?.[1] ?? "").trim();
      if (title && link) items.push({ title, link, pubDate: pubDate || undefined, description: description || undefined, thumbnail: thumbnail || undefined });
    }
    return items;
  } catch {
    return [];
  }
}

// ─── YouTube channel ID helper ────────────────────────────────────────────────
// Accepts either a channel ID (UCxxx) or a handle (@handle) and normalises to RSS URL.
function buildYouTubeRssUrl(handle: string): string {
  if (handle.startsWith("UC") && handle.length > 10) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${handle}`;
  }
  const clean = handle.replace(/^@/, "");
  return `https://www.youtube.com/feeds/videos.xml?user=${clean}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const platformHubRouter = router({

  /** Get all platform links for a creator (public) */
  getByCreator: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db
        .select()
        .from(creatorPlatforms)
        .where(and(eq(creatorPlatforms.userId, input.userId), eq(creatorPlatforms.isVisible, true)))
        .orderBy(asc(creatorPlatforms.displayOrder), asc(creatorPlatforms.createdAt));
      return rows;
    }),

  /** Get all platform links for the current user (private, includes hidden) */
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    return db
      .select()
      .from(creatorPlatforms)
      .where(eq(creatorPlatforms.userId, ctx.user.id))
      .orderBy(asc(creatorPlatforms.displayOrder), asc(creatorPlatforms.createdAt));
  }),

  /** Add a new platform link */
  add: protectedProcedure
    .input(z.object({
      platformType: z.string().min(1).max(64),
      handle: z.string().max(256).optional(),
      url: z.string().url("Must be a valid URL"),
      displayName: z.string().max(128).optional(),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      // Get current max displayOrder
      const existing = await db
        .select({ displayOrder: creatorPlatforms.displayOrder })
        .from(creatorPlatforms)
        .where(eq(creatorPlatforms.userId, ctx.user.id))
        .orderBy(asc(creatorPlatforms.displayOrder));
      const maxOrder = existing.length > 0 ? Math.max(...existing.map((r: { displayOrder: number }) => r.displayOrder)) : -1;

      const [result] = await db.insert(creatorPlatforms).values({
        userId: ctx.user.id,
        platformType: input.platformType,
        handle: input.handle,
        url: input.url,
        displayName: input.displayName,
        description: input.description,
        displayOrder: maxOrder + 1,
        isVisible: true,
        isVerified: false,
      });
      return { id: (result as any).insertId };
    }),

  /** Update a platform link */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      handle: z.string().max(256).optional(),
      url: z.string().url().optional(),
      displayName: z.string().max(128).optional(),
      description: z.string().max(500).optional(),
      isVisible: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { id, ...fields } = input;
      // Verify ownership
      const [row] = await db.select({ userId: creatorPlatforms.userId }).from(creatorPlatforms).where(eq(creatorPlatforms.id, id));
      if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await db.update(creatorPlatforms).set(fields).where(eq(creatorPlatforms.id, id));
      return { ok: true };
    }),

  /** Remove a platform link */
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [row] = await db.select({ userId: creatorPlatforms.userId }).from(creatorPlatforms).where(eq(creatorPlatforms.id, input.id));
      if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await db.delete(creatorPlatforms).where(eq(creatorPlatforms.id, input.id));
      return { ok: true };
    }),

  /** Reorder platform links */
  reorder: protectedProcedure
    .input(z.object({ orderedIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      for (let i = 0; i < input.orderedIds.length; i++) {
        const id = input.orderedIds[i];
        const [row] = await db.select({ userId: creatorPlatforms.userId }).from(creatorPlatforms).where(eq(creatorPlatforms.id, id));
        if (row?.userId === ctx.user.id) {
          await db.update(creatorPlatforms).set({ displayOrder: i }).where(eq(creatorPlatforms.id, id));
        }
      }
      return { ok: true };
    }),

  /** Fetch and cache RSS/API preview for a platform link */
  refreshPreview: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [row] = await db.select().from(creatorPlatforms).where(eq(creatorPlatforms.id, input.id));
      if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const meta = PLATFORM_REGISTRY[row.platformType as PlatformType];
      if (!meta) return { ok: false, reason: "unknown platform" };

      let items: any[] = [];

      if (row.platformType === "youtube") {
        const rssUrl = buildYouTubeRssUrl(row.handle ?? row.url);
        items = await fetchRssPreview(rssUrl);
      } else if (row.platformType === "substack") {
        const handle = row.handle ?? "";
        const rssUrl = `https://${handle.replace(/^@/, "")}.substack.com/feed`;
        items = await fetchRssPreview(rssUrl);
      } else if (row.platformType === "github") {
        const handle = row.handle ?? "";
        const rssUrl = `https://github.com/${handle.replace(/^@/, "")}.atom`;
        items = await fetchRssPreview(rssUrl);
      } else if (row.platformType === "website") {
        const rssUrl = row.url.replace(/\/$/, "") + "/feed";
        items = await fetchRssPreview(rssUrl);
      }

      const preview = { items, fetchedAt: new Date().toISOString() };
      await db.update(creatorPlatforms)
        .set({ cachedPreviewJson: JSON.stringify(preview), cacheUpdatedAt: new Date() })
        .where(eq(creatorPlatforms.id, input.id));

      return { ok: true, preview };
    }),

  /** Get platform registry metadata (for the frontend picker) */
  getRegistry: publicProcedure.query(() => {
    return PLATFORM_REGISTRY;
  }),
});
