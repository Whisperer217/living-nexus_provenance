/**
 * Dynamic XML sitemap for livingnexus.org
 *
 * Serves /sitemap.xml with:
 *   - All static public pages
 *   - All published public songs (/song/:id) with title, lastmod, image
 *   - All public creator profiles (/creator/:id) with artist handle alt URLs
 *
 * Google Search Console requires a sitemap to efficiently discover and index
 * pages. This also helps resolve the "Crawled - currently not indexed" issue
 * for pages that Google has seen but not yet prioritised.
 *
 * Enhancement v2:
 *   - Added <image:image> extension for song cover art (Google Image Search)
 *   - WID-tagged songs get priority 0.9 (vs 0.8 for untagged)
 *   - Creator profiles include artist handle in <xhtml:link> alternate
 *   - Cache reduced to 30 min so new songs appear in sitemap faster
 */
import { Router, type Request, type Response } from "express";
import { getPublicSongs, getDb } from "../utils/db";
import { sql } from "drizzle-orm";

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

    // Published public songs — with cover art image extension for Google Image Search
    const songs = await getPublicSongs({ limit: 5000 });
    for (const { song, creator } of songs) {
      const lastmod = toW3CDate((song as any).updatedAt || (song as any).createdAt);
      // WID-tagged songs get higher priority — they have provenance proof
      const priority = (song as any).witnessId ? "0.9" : "0.8";
      const coverArtUrl = (song as any).coverArtUrl?.trim();
      const songTitle = escXml((song as any).title || "");
      const artistName = escXml(
        (creator as any)?.artistHandle?.trim() ||
        (creator as any)?.name?.trim() ||
        "Living Nexus Creator"
      );

      // Build image extension block if cover art exists
      const imageBlock = coverArtUrl
        ? `\n    <image:image>\n      <image:loc>${escXml(coverArtUrl)}</image:loc>\n      <image:title>${songTitle} — ${artistName}</image:title>\n      <image:caption>${songTitle} by ${artistName} on Living Nexus</image:caption>\n    </image:image>`
        : "";

      urls.push(
        `  <url>\n    <loc>${escXml(`${CANONICAL_ORIGIN}/song/${song.id}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>${imageBlock}\n  </url>`
      );
    }

    // Public creator profiles — with artist handle as alternate title
    try {
      const db = await getDb();
      if (db) {
        const creatorRows = await db.execute(
          sql`SELECT DISTINCT u.id, u.artistHandle, u.name, u.updatedAt
              FROM users u
              INNER JOIN songs s ON s.userId = u.id
              WHERE s.isPublic = 1 AND s.status = 'Published'
              LIMIT 2000`
        ) as any;
        const rows = Array.isArray(creatorRows) ? creatorRows : (creatorRows?.rows ?? []);
        for (const row of rows) {
          const lastmod = toW3CDate((row as any).updatedAt || (row as any).updated_at);
          const handle = (row as any).artistHandle?.trim() || (row as any).name?.trim() || "";
          // Include artist handle as a comment for discoverability context
          const handleComment = handle ? `\n    <!-- Creator: ${escXml(handle)} -->` : "";
          urls.push(
            `  <url>\n    <loc>${escXml(`${CANONICAL_ORIGIN}/creator/${(row as any).id}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>${handleComment}\n  </url>`
          );
        }
      }
    } catch (creatorErr) {
      console.warn("[Sitemap] Could not fetch creator list:", creatorErr);
    }

    // XML namespace includes image extension for Google Image Search
    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset`,
      `  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
      `  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`,
      `  xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
      urls.join("\n"),
      `</urlset>`,
    ].join("\n");

    res
      .status(200)
      .set({
        "Content-Type": "application/xml; charset=utf-8",
        // 30 min cache — new songs appear in sitemap faster than the old 1hr
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      })
      .end(xml);
  } catch (err) {
    console.error("[Sitemap] Error generating sitemap:", err);
    res.status(500).end("Sitemap generation failed");
  }
});
