import { invokeLLM } from "../_core/llm";

export const DISCOVERY_SORTS = ["relevance", "newest", "title", "creator"] as const;
export type DiscoverySort = typeof DISCOVERY_SORTS[number];

export const DISCOVERY_CONTENT_TYPES = ["audio", "lyrics", "manuscript", "comic"] as const;
export type DiscoveryContentType = typeof DISCOVERY_CONTENT_TYPES[number];

export type DiscoveryQueryInterpretation = {
  query: string;
  creator: string | null;
  genre: string | null;
  contentType: DiscoveryContentType | null;
  sort: DiscoverySort;
  explanation: string;
  source: "model" | "fallback";
};

const MAX_QUERY_LENGTH = 200;

const SEARCH_INTERPRETATION_SCHEMA = {
  name: "living_nexus_discovery_query",
  strict: true,
  schema: {
    type: "object",
    properties: {
      query: { type: "string" },
      creator: { type: ["string", "null"] },
      genre: { type: ["string", "null"] },
      contentType: { type: ["string", "null"], enum: ["audio", "lyrics", "manuscript", "comic", null] },
      sort: { type: "string", enum: ["relevance", "newest", "title", "creator"] },
      explanation: { type: "string" },
    },
    required: ["query", "creator", "genre", "contentType", "sort", "explanation"],
    additionalProperties: false,
  },
} as const;

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  return cleaned || null;
}

function normalizeSort(value: unknown): DiscoverySort {
  return typeof value === "string" && (DISCOVERY_SORTS as readonly string[]).includes(value)
    ? value as DiscoverySort
    : "relevance";
}

function normalizeContentType(value: unknown): DiscoveryContentType | null {
  return typeof value === "string" && (DISCOVERY_CONTENT_TYPES as readonly string[]).includes(value)
    ? value as DiscoveryContentType
    : null;
}

function inferContentType(query: string): DiscoveryContentType | null {
  const lower = query.toLowerCase();
  if (/\b(comic|comics|graphic novel)\b/.test(lower)) return "comic";
  if (/\b(manuscript|manuscripts|book|books|essay|essays|article|articles)\b/.test(lower)) return "manuscript";
  if (/\b(lyric|lyrics|poem|poetry)\b/.test(lower)) return "lyrics";
  if (/\b(song|songs|music|track|tracks|audio)\b/.test(lower)) return "audio";
  return null;
}

function inferSort(query: string): DiscoverySort {
  const lower = query.toLowerCase();
  if (/\b(newest|new|recent|latest)\b/.test(lower)) return "newest";
  if (/\b(alphabetical|a to z|title)\b/.test(lower)) return "title";
  if (/\b(by creator|creator name|artist name)\b/.test(lower)) return "creator";
  return "relevance";
}

/**
 * A deterministic, no-network interpretation for malformed or unavailable model
 * responses. It intentionally extracts only filters that can be shown back to
 * the visitor and never invents Registry facts.
 */
export function parseDiscoveryQueryFallback(rawQuery: string): DiscoveryQueryInterpretation {
  const original = cleanText(rawQuery, MAX_QUERY_LENGTH) ?? "";
  const creatorMatch = original.match(/\bby\s+@?([a-zA-Z0-9_.-]{2,80})\b/i);
  const genreMatch = original.match(/\b(?:genre|in)\s*[:=]?\s*([a-zA-Z][a-zA-Z0-9 -]{1,48}?)(?=\s+(?:by|newest|new|recent|latest|audio|songs?|tracks?|music|lyrics?|manuscripts?|comics?)\b|$)/i);
  const creator = creatorMatch?.[1] ?? null;
  const genre = genreMatch?.[1]?.trim() ?? null;
  const query = original
    .replace(creatorMatch?.[0] ?? "", " ")
    .replace(genreMatch?.[0] ?? "", " ")
    .replace(/\b(find|show|me|works?|work|songs?|tracks?|music|audio|with|the|for|please|newest|new|recent|latest|alphabetical|a to z)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    query: query || creator || genre || original,
    creator,
    genre,
    contentType: inferContentType(original),
    sort: inferSort(original),
    explanation: creator || genre || inferContentType(original) || inferSort(original) !== "relevance"
      ? "Filters were read directly from your request."
      : "Your request is being searched as written.",
    source: "fallback",
  };
}

/** Normalize untrusted model output to the narrow, public discovery contract. */
export function normalizeDiscoveryInterpretation(
  candidate: unknown,
  originalQuery: string,
  source: "model" | "fallback" = "model",
): DiscoveryQueryInterpretation {
  const fallback = parseDiscoveryQueryFallback(originalQuery);
  if (!candidate || typeof candidate !== "object") return fallback;
  const value = candidate as Record<string, unknown>;
  const query = cleanText(value.query, MAX_QUERY_LENGTH) ?? fallback.query;
  const creator = cleanText(value.creator, 80);
  const genre = cleanText(value.genre, 64);
  const explanation = cleanText(value.explanation, 180) ?? fallback.explanation;

  return {
    query,
    creator,
    genre,
    contentType: normalizeContentType(value.contentType),
    sort: normalizeSort(value.sort),
    explanation,
    source,
  };
}

/**
 * Converts a natural-language phrase into visible, bounded search constraints.
 * Only query text is sent to the model; published Registry records are never
 * supplied as model context or model-generated.
 */
export async function interpretDiscoveryQuery(rawQuery: string): Promise<DiscoveryQueryInterpretation> {
  const original = cleanText(rawQuery, MAX_QUERY_LENGTH);
  if (!original) return parseDiscoveryQueryFallback(rawQuery);

  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: [
            "You interpret a visitor's search phrase for the Living Nexus public Registry.",
            "Return only supported filters. Never invent creators, Works, WIDs, provenance, genres, or facts.",
            "A WID is an identifier and must remain in query unchanged.",
            "Use contentType only for audio, lyrics, manuscript, or comic. Use sort only for relevance, newest, title, or creator.",
            "Keep query to the essential terms that can be matched by a Registry search.",
          ].join(" "),
        },
        { role: "user", content: original },
      ],
      response_format: {
        type: "json_schema",
        json_schema: SEARCH_INTERPRETATION_SCHEMA,
      },
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") return parseDiscoveryQueryFallback(original);
    return normalizeDiscoveryInterpretation(JSON.parse(content), original, "model");
  } catch (error) {
    console.warn("[DiscoveryQuery] Falling back to deterministic interpretation", error);
    return parseDiscoveryQueryFallback(original);
  }
}
