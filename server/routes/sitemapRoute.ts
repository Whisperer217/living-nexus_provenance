/**
 * Dynamic XML sitemap for livingnexus.org
 *
 * Serves /sitemap.xml with:
 *   - All static public pages
 *   - All published public songs (/song/:id)
 *   - All public creator profiles (/creator/:id)
 *
 * Google Search Console requires a sitemap to efficiently discover and index
 * pages. This also helps resolve the "Crawled - currently not indexed" issue
 * for pages that Google has seen but not yet prioritised.
 */
import { Router, type Request, type Response } from "express";
import { getPublicSongs, getDb } from "../utils/db";
import { eq, and, isNotNull } from "drizzle-orm";

const CANONICAL_ORIGIN = "https://www.livingnexus.org";

/** Static pages that should be indexed */
const STATIC_PAGES = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/explore", priority: "0.9", changefreq: "hourly" },
  { loc: "/verify", priority: "0.7", changefreq: "monthly" },
  { loc: "/field-notes", priority: "0.7", changefreq: "weekly" },
  { loc: "/manifesto", priority: "0.6", changefreq: "monthly" },
  { loc: "/pricing", priority: "0.8", changefreq: "monthly" },
  { loc: "/lexicon", priority: "0.5", changefreq: "monthly" },
  { loc: "/doctrine/wid-spec", priority: "0.6", changefreq: "monthly" },
  { loc: "/trust", priority: "0.5", changefreq: "monthly" },
  { loc: "/terms", priority: "0.4", changefreq: "yearly" },
  { loc: "/privacy", priority: "0.4", changefreq: "yearly" },
  { loc: "/founders", priority: "0.5", changefreq: "monthly" },
  { loc: "/learn", priority: "0.6", changefreq: "monthly" },
];

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;");
}

function toW3CDate(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString().split("T")[0];
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? new Date().toISOString().split("T")[0] : dt.toISOString().split("T")[0];
}

export const sitemapRouter = Router();

sitemapRouter.get("/sitemap.xml", async (_req: Request, res: Response) => {
  try {
    const urls: string[] = [];

    // Static pages
    for (const page of STATIC_PAGES) {
      urls.push(
        `  <url>\n    <loc>${escXml(`${CANONICAL_ORIGIN}${page.loc}`)}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
      );
    }

    // Published public songs
    const songs = await getPublicSongs({ limit: 5000 });
    for (const { song } of songs) {
      const lastmod = toW3CDate((song as any).updatedAt || (song as any).createdAt);
      urls.push(
        `  <url>\n    <loc>${escXml(`${CANONICAL_ORIGIN}/song/${song.id}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }

    // Public creator profiles
    try {
      const db = await getDb();
      if (db) {
        const { users } = await import("../utils/db").then(m => ({ users: (m as any).users }));
        // Use a raw query to get distinct creator IDs from published songs
        const { sql } = await import("drizzle-orm");
        const creatorRows = await db.execute(
          sql`SELECT DISTINCT u.id, u.updated_at FROM users u
              INNER JOIN songs s ON s.user_id = u.id
              WHERE s.is_public = 1 AND s.status = 'Published'
              LIMIT 2000`
        ) as any;
        const rows = Array.isArray(creatorRows) ? creatorRows : (creatorRows?.rows ?? []);
        for (const row of rows) {
          const lastmod = toW3CDate((row as any).updated_at);
          urls.push(
            `  <url>\n    <loc>${escXml(`${CANONICAL_ORIGIN}/creator/${(row as any).id}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
          );
        }
      }
    } catch (creatorErr) {
      console.warn("[Sitemap] Could not fetch creator list:", creatorErr);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

    res
      .status(200)
      .set({
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      })
      .end(xml);
  } catch (err) {
    console.error("[Sitemap] Error generating sitemap:", err);
    res.status(500).end("Sitemap generation failed");
  }
});
