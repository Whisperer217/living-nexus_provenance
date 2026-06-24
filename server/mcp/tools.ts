/**
 * Living Nexus MCP Server — Tool Definitions (Read Tier)
 *
 * Five read-only tools. Every query is a SELECT.
 * No PII (email, auth IDs, IP data) is returned in any response.
 * Input validation via zod on every parameter.
 *
 * Phase 208 — closed tool list:
 *   get_work           — public fields for a single work by WID
 *   list_works         — paginated public work list
 *   get_page_meta      — SSR OG/meta data for an allowlisted route
 *   get_seo_status     — aggregate platform stats
 *   query_verify_chain — public provenance/verification fields for a WID
 */

import { z } from "zod";
import { and, count, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../utils/db";
import { songs, users } from "../../drizzle/schema";
import { generateRef } from "../_core/errorHandler";

// ─── Shared constants ─────────────────────────────────────────────────────────

const CANONICAL_ORIGIN = "https://www.livingnexus.org";

/** WID pattern validator — matches WID-MUS-XXXXXXXX-XXXXXXXX */
const WID_PATTERN = /^WID-[A-Z]{3}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const widSchema = z.string().regex(WID_PATTERN, "Invalid WID format. Expected WID-XXX-XXXXXXXX-XXXXXXXX");

// ─── Tool: get_work ───────────────────────────────────────────────────────────

export const getWorkSchema = z.object({
  wid: widSchema,
});

export async function getWork(input: z.infer<typeof getWorkSchema>) {
  const db = await getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const result = await db
    .select({
      id: songs.id,
      title: songs.title,
      genre: songs.genre,
      witnessId: songs.witnessId,
      isPublic: songs.isPublic,
      status: songs.status,
      playCount: songs.playCount,
      createdAt: songs.createdAt,
      downloadPermission: songs.downloadPermission,
      creatorName: users.name,
      artistHandle: users.artistHandle,
      creatorId: users.id,
    })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(eq(songs.witnessId, input.wid))
    .limit(1);

  if (!result.length) return null;
  const row = result[0];

  if (row.status === "Deleted" || !row.isPublic) return null;

  const creatorName = row.artistHandle || row.creatorName || "Unknown Artist";
  const creatorSlug = row.creatorId ? String(row.creatorId) : null;

  return {
    wid: row.witnessId,
    title: row.title,
    creatorName,
    creatorSlug,
    genre: row.genre || null,
    witnessDate: row.createdAt ? row.createdAt.toISOString() : null,
    isPublic: row.isPublic,
    playCount: row.playCount,
    shareUrl: `${CANONICAL_ORIGIN}/share/${row.witnessId}`,
    songUrl: `${CANONICAL_ORIGIN}/song/${row.id}`,
  };
}

// ─── Tool: list_works ─────────────────────────────────────────────────────────

export const listWorksSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
  creatorSlug: z.string().optional(),
});

export async function listWorks(input: z.infer<typeof listWorksSchema>) {
  const db = await getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const { limit, offset, creatorSlug } = input;

  // Build conditions
  const conditions = [
    eq(songs.isPublic, true),
    eq(songs.status, "Published"),
    isNotNull(songs.witnessId),
  ];

  // If creatorSlug is provided, it's a numeric userId string
  if (creatorSlug) {
    const userId = parseInt(creatorSlug, 10);
    if (!isNaN(userId)) {
      conditions.push(eq(songs.userId, userId));
    }
  }

  const whereClause = and(...conditions);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        witnessId: songs.witnessId,
        title: songs.title,
        createdAt: songs.createdAt,
        isPublic: songs.isPublic,
        creatorName: users.name,
        artistHandle: users.artistHandle,
      })
      .from(songs)
      .leftJoin(users, eq(songs.userId, users.id))
      .where(whereClause)
      .orderBy(sql`${songs.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(songs)
      .where(whereClause),
  ]);

  return {
    works: rows.map((r: typeof rows[number]) => ({
      wid: r.witnessId,
      title: r.title,
      creatorName: r.artistHandle || r.creatorName || "Unknown Artist",
      witnessDate: r.createdAt ? r.createdAt.toISOString() : null,
      isPublic: r.isPublic,
    })),
    total: totalResult[0]?.total ?? 0,
    limit,
    offset,
  };
}

// ─── Tool: get_page_meta ──────────────────────────────────────────────────────

export const getPageMetaSchema = z.object({
  route: z.string().refine((r: string) => {
    // Allowlist: static routes
    const staticRoutes = ["/", "/manifesto", "/doctrine/wid-spec", "/lexicon", "/pricing", "/explore", "/verify", "/trust"];
    if (staticRoutes.includes(r)) return true;
    // Dynamic: /song/:id (numeric id)
    if (/^\/song\/\d+$/.test(r)) return true;
    // Dynamic: /share/:wid
    if (/^\/share\/WID-[A-Z]{3}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(r)) return true;
    return false;
  }, "Route not in allowlist. Permitted: /, /manifesto, /doctrine/wid-spec, /lexicon, /pricing, /explore, /verify, /trust, /song/:id, /share/:wid"),
});

// Static page meta map
const STATIC_PAGE_META: Record<string, { title: string; description: string; ogTitle: string; ogDescription: string; ogImage: string }> = {
  "/": {
    title: "Living Nexus — Sovereign Music Platform",
    description: "Register your music, lyrics, and creative works with cryptographic provenance. Every track carries a Witness ID — proof of creation that belongs to the artist.",
    ogTitle: "Living Nexus — Sovereign Music Platform",
    ogDescription: "Discover, share, and experience music with cryptographic provenance. Every track carries a Witness ID — proof of creation that belongs to the artist.",
    ogImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png",
  },
  "/manifesto": {
    title: "The Living Nexus Manifesto",
    description: "The Living Nexus Manifesto — Sovereignty, provenance, and the creator's right to be witnessed.",
    ogTitle: "The Living Nexus Manifesto",
    ogDescription: "Sovereignty, provenance, and the creator's right to be witnessed. Read the founding doctrine of Living Nexus.",
    ogImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png",
  },
  "/doctrine/wid-spec": {
    title: "WID Specification — Living Nexus",
    description: "The Work Identity Document (WID) specification — how Living Nexus anchors creative provenance.",
    ogTitle: "WID Specification — Living Nexus",
    ogDescription: "The Work Identity Document (WID) specification — how Living Nexus anchors creative provenance to every registered work.",
    ogImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png",
  },
  "/lexicon": {
    title: "The Living Nexus Lexicon",
    description: "The Living Nexus Lexicon — definitions for the sovereign creator ecosystem.",
    ogTitle: "The Living Nexus Lexicon",
    ogDescription: "Definitions for the sovereign creator ecosystem. The language of Living Nexus.",
    ogImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png",
  },
  "/pricing": {
    title: "Pricing — Living Nexus",
    description: "Living Nexus creator plans — free, licensed, and founder tiers for sovereign music publishing.",
    ogTitle: "Pricing — Living Nexus",
    ogDescription: "Creator plans for sovereign music publishing. Free, licensed, and founder tiers.",
    ogImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png",
  },
  "/explore": {
    title: "Explore — Living Nexus",
    description: "Discover witnessed music, lyrics, manuscripts, and comics from sovereign creators on Living Nexus.",
    ogTitle: "Explore — Living Nexus",
    ogDescription: "Discover witnessed music, lyrics, manuscripts, and comics from sovereign creators.",
    ogImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png",
  },
  "/verify": {
    title: "Verify a Work — Living Nexus",
    description: "Verify the provenance of any work registered on Living Nexus using its Witness ID (WID).",
    ogTitle: "Verify a Work — Living Nexus",
    ogDescription: "Verify the provenance of any work registered on Living Nexus using its Witness ID (WID).",
    ogImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png",
  },
  "/trust": {
    title: "Trust & Safety — Living Nexus",
    description: "Living Nexus trust and safety policy — how we protect creators and their works.",
    ogTitle: "Trust & Safety — Living Nexus",
    ogDescription: "How Living Nexus protects creators and their works through provenance and community standards.",
    ogImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png",
  },
};

export async function getPageMeta(input: z.infer<typeof getPageMetaSchema>) {
  const { route } = input;

  // Static routes
  if (STATIC_PAGE_META[route]) {
    return STATIC_PAGE_META[route];
  }

  const db = await getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  // /song/:id
  const songMatch = route.match(/^\/song\/(\d+)$/);
  if (songMatch) {
    const id = parseInt(songMatch[1], 10);
    const result = await db
      .select({
        title: songs.title,
        genre: songs.genre,
        witnessId: songs.witnessId,
        playCount: songs.playCount,
        coverArtUrl: songs.coverArtUrl,
        isPublic: songs.isPublic,
        status: songs.status,
        creatorName: users.name,
        artistHandle: users.artistHandle,
      })
      .from(songs)
      .leftJoin(users, eq(songs.userId, users.id))
      .where(and(eq(songs.id, id), eq(songs.isPublic, true)))
      .limit(1);

    if (!result.length || result[0].status === "Deleted") return null;
    const row = result[0];
    const creatorName = row.artistHandle || row.creatorName || "Unknown Artist";
    const desc = `🎵 ${row.title} by ${creatorName}${row.genre ? ` · ${row.genre}` : ""}${row.witnessId ? ` · WID: ${row.witnessId}` : ""} · ${row.playCount} plays — Listen on Living Nexus`;
    return {
      title: `${row.title} by ${creatorName} — Living Nexus`,
      description: desc,
      ogTitle: `${row.title} by ${creatorName}`,
      ogDescription: desc,
      ogImage: row.coverArtUrl || STATIC_PAGE_META["/"].ogImage,
    };
  }

  // /share/:wid
  const shareMatch = route.match(/^\/share\/(WID-[A-Z]{3}-[A-F0-9]{8}-[A-F0-9]{8})$/);
  if (shareMatch) {
    const wid = shareMatch[1];
    const result = await db
      .select({
        title: songs.title,
        genre: songs.genre,
        witnessId: songs.witnessId,
        playCount: songs.playCount,
        coverArtUrl: songs.coverArtUrl,
        isPublic: songs.isPublic,
        status: songs.status,
        creatorName: users.name,
        artistHandle: users.artistHandle,
      })
      .from(songs)
      .leftJoin(users, eq(songs.userId, users.id))
      .where(and(eq(songs.witnessId, wid), eq(songs.isPublic, true)))
      .limit(1);

    if (!result.length || result[0].status === "Deleted") return null;
    const row = result[0];
    const creatorName = row.artistHandle || row.creatorName || "Unknown Artist";
    const desc = `🎵 ${row.title} by ${creatorName}${row.genre ? ` · ${row.genre}` : ""}${row.witnessId ? ` · WID: ${row.witnessId}` : ""} · ${row.playCount} plays — Listen on Living Nexus`;
    return {
      title: `${row.title} by ${creatorName} — Living Nexus`,
      description: desc,
      ogTitle: `${row.title} by ${creatorName}`,
      ogDescription: desc,
      ogImage: row.coverArtUrl || STATIC_PAGE_META["/"].ogImage,
    };
  }

  return null;
}

// ─── Tool: get_seo_status ─────────────────────────────────────────────────────

export const getSeoStatusSchema = z.object({});

export async function getSeoStatus(_input: z.infer<typeof getSeoStatusSchema>) {
  const db = await getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const [totalResult, publicResult, lyricsResult, lastWitnessResult] = await Promise.all([
    db.select({ total: count() }).from(songs).where(isNotNull(songs.witnessId)),
    db.select({ total: count() }).from(songs).where(and(isNotNull(songs.witnessId), eq(songs.isPublic, true), eq(songs.status, "Published"))),
    db.select({ total: count() }).from(songs).where(and(isNotNull(songs.witnessId), isNotNull(songs.lyricsText))),
    db.select({ lastDate: sql<Date>`MAX(${songs.createdAt})` }).from(songs).where(isNotNull(songs.witnessId)),
  ]);

  return {
    totalWorks: totalResult[0]?.total ?? 0,
    publicWorks: publicResult[0]?.total ?? 0,
    worksWithLyrics: lyricsResult[0]?.total ?? 0,
    // Sitemap URL count is approximated from public works + static pages
    sitemapUrlCount: (publicResult[0]?.total ?? 0) + 10,
    lastWitnessDate: lastWitnessResult[0]?.lastDate
      ? new Date(lastWitnessResult[0].lastDate).toISOString()
      : null,
  };
}

// ─── Tool: query_verify_chain ─────────────────────────────────────────────────

export const queryVerifyChainSchema = z.object({
  wid: widSchema,
});

export async function queryVerifyChain(input: z.infer<typeof queryVerifyChainSchema>) {
  const db = await getDb();
  if (!db) throw new Error("DB_UNAVAILABLE");

  const result = await db
    .select({
      witnessId: songs.witnessId,
      title: songs.title,
      fileHash: songs.fileHash,
      lyricsHash: songs.lyricsHash,
      ecdsaPublicKey: songs.ecdsaPublicKey,
      ecdsaSignature: songs.ecdsaSignature,
      harmonicSignature: songs.harmonicSignature,
      certificateUrl: songs.certificateUrl,
      createdAt: songs.createdAt,
      isPublic: songs.isPublic,
      status: songs.status,
      creatorName: users.name,
      artistHandle: users.artistHandle,
    })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(eq(songs.witnessId, input.wid))
    .limit(1);

  if (!result.length) return null;
  const row = result[0];

  if (row.status === "Deleted" || !row.isPublic) return null;

  const creatorName = row.artistHandle || row.creatorName || "Unknown Artist";

  return {
    wid: row.witnessId,
    title: row.title,
    creatorName,
    witnessTimestamp: row.createdAt ? row.createdAt.toISOString() : null,
    contentHash: row.fileHash || null,
    lyricsHash: row.lyricsHash || null,
    signatureStatus: row.ecdsaSignature ? "signed" : "unsigned",
    ecdsaPublicKey: row.ecdsaPublicKey || null,
    ecdsaSignature: row.ecdsaSignature || null,
    harmonicSignature: row.harmonicSignature || null,
    certificateUrl: row.certificateUrl || null,
    // Anchor references — Figshare DOI / OpenTimestamps if present
    // Currently stored as certificateUrl; dedicated anchor fields are future work
    anchorReferences: row.certificateUrl ? [{ type: "certificate", url: row.certificateUrl }] : [],
    verifyUrl: `${CANONICAL_ORIGIN}/verify?wid=${row.witnessId}`,
  };
}

// ─── Tool registry ────────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    name: "get_work",
    description: "Retrieve public metadata for a single work by its Witness ID (WID). Returns title, creator, genre, witness date, play count, share URL, and song URL. Does not return private fields (email, internal IDs, file paths).",
    inputSchema: {
      type: "object" as const,
      properties: {
        wid: { type: "string", description: "The Work Identity Document ID, e.g. WID-MUS-XXXXXXXX-XXXXXXXX" },
      },
      required: ["wid"],
    },
  },
  {
    name: "list_works",
    description: "List public works registered on Living Nexus. Supports pagination and optional filtering by creator slug (numeric user ID string).",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max results to return (1–50, default 20)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
        creatorSlug: { type: "string", description: "Optional numeric creator ID to filter by creator" },
      },
      required: [],
    },
  },
  {
    name: "get_page_meta",
    description: "Retrieve the title, meta description, og:title, og:description, and og:image that the Living Nexus server would serve for a given route. Only allowlisted routes are accepted.",
    inputSchema: {
      type: "object" as const,
      properties: {
        route: { type: "string", description: "The route path, e.g. /manifesto, /song/30001, /share/WID-MUS-XXXXXXXX-XXXXXXXX" },
      },
      required: ["route"],
    },
  },
  {
    name: "get_seo_status",
    description: "Retrieve aggregate platform statistics: total works with WIDs, public works, works with lyrics, estimated sitemap URL count, and last witness date.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "query_verify_chain",
    description: "Retrieve the public verification fields for a work: content hash, witness timestamp, signature status, ECDSA public key/signature, harmonic signature, certificate URL, and anchor references. Returns only what the public /verify page would display.",
    inputSchema: {
      type: "object" as const,
      properties: {
        wid: { type: "string", description: "The Work Identity Document ID, e.g. WID-MUS-XXXXXXXX-XXXXXXXX" },
      },
      required: ["wid"],
    },
  },
] as const;

export { generateRef };
