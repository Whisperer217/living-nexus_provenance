/**
 * lnxCache — Living Nexus TTL-based localStorage utility
 *
 * Design constraints:
 *  • Safari: ~5MB hard limit, aggressive clearing in low storage / private mode
 *  • Brave: may purge storage when Shields are aggressive; no cross-domain tricks
 *  • Mobile: slower I/O, background tab purging, less storage tolerance
 *
 * Rules:
 *  1. All writes are try/catch — never throw on quota exceeded
 *  2. Payloads must be slim — no audio blobs, no full playlists, no large arrays
 *  3. Every item has an expiry — nothing lives forever except UI state
 *  4. clearExpired() is called on module load to keep the bucket clean
 *  5. All keys are namespaced under "lnx:" to avoid collisions
 */

const NS = "lnx:";

interface CacheItem<T> {
  data: T;
  expiry: number | null; // null = no expiry (UI state)
}

/** Write a value with an optional TTL in milliseconds. Pass ttlMs=null for permanent UI state. */
export function setCache<T>(key: string, data: T, ttlMs: number | null = null): void {
  try {
    const item: CacheItem<T> = {
      data,
      expiry: ttlMs !== null ? Date.now() + ttlMs : null,
    };
    localStorage.setItem(NS + key, JSON.stringify(item));
  } catch {
    // Quota exceeded or storage unavailable (Safari private, Brave shields) — fail silently
  }
}

/** Read a value. Returns null if missing, expired, or storage unavailable. */
export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(NS + key);
    if (!raw) return null;
    const item: CacheItem<T> = JSON.parse(raw);
    if (item.expiry !== null && Date.now() > item.expiry) {
      localStorage.removeItem(NS + key);
      return null;
    }
    return item.data;
  } catch {
    return null;
  }
}

/** Remove a single key. */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(NS + key);
  } catch { /* ignore */ }
}

/** Scan all lnx: keys and remove any that have expired. Call on app boot. */
export function clearExpired(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NS)) keys.push(k);
    }
    const now = Date.now();
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const item: CacheItem<unknown> = JSON.parse(raw);
        if (item.expiry !== null && now > item.expiry) {
          localStorage.removeItem(k);
        }
      } catch {
        localStorage.removeItem(k); // corrupt entry — remove it
      }
    }
  } catch { /* storage unavailable */ }
}

// ── TTL constants (milliseconds) ──────────────────────────────────────────
export const TTL = {
  UI_STATE: null,             // permanent — sidebar, theme, volume, last tab
  EXPLORE: 10 * 60 * 1000,   // 10 minutes — explore results
  PROFILE: 60 * 60 * 1000,   // 1 hour — creator profile basic info
  WID: 24 * 60 * 60 * 1000,  // 24 hours — WID witness snapshots
} as const;

// ── Key constants ─────────────────────────────────────────────────────────
export const CACHE_KEYS = {
  VOLUME: "ui.volume",
  SIDEBAR: "ui.sidebar",
  EXPLORE_TAB: "ui.explore.tab",
  EXPLORE_RESULTS: "explore.results",
  WID_SNAPSHOTS: "wid.snapshots",
  PROFILE_PREFIX: "profile.",
} as const;

// ── WID Witness Cache Layer ───────────────────────────────────────────────
export interface WIDSnapshot {
  wid: string;
  title: string;
  creator: string;
  contentType: string;
  timestamp: number; // UTC ms when witnessed
  verified: true;
}

/** Add or update a WID snapshot in the local witness cache. Max 50 entries (Safari safety). */
export function addWIDSnapshot(snapshot: WIDSnapshot): void {
  const existing = getCache<WIDSnapshot[]>(CACHE_KEYS.WID_SNAPSHOTS) ?? [];
  const filtered = existing.filter(s => s.wid !== snapshot.wid); // deduplicate
  const updated = [snapshot, ...filtered].slice(0, 50); // cap at 50
  setCache(CACHE_KEYS.WID_SNAPSHOTS, updated, TTL.WID);
}

/** Get all locally cached WID snapshots. */
export function getWIDSnapshots(): WIDSnapshot[] {
  return getCache<WIDSnapshot[]>(CACHE_KEYS.WID_SNAPSHOTS) ?? [];
}

/** Clear all locally cached WID snapshots. */
export function clearWIDSnapshots(): void {
  removeCache(CACHE_KEYS.WID_SNAPSHOTS);
}

// ── Explore results cache ─────────────────────────────────────────────────
export interface ExploreResultSlim {
  id: number;
  title: string;
  artist: string;
  coverArtUrl: string | null;
  witnessId: string | null;
  contentType: string;
}

/** Cache slim explore results for a given content type tab. */
export function setExploreCache(contentType: string, results: ExploreResultSlim[]): void {
  const slim = results.slice(0, 20); // max 20 items — Safari safety
  setCache(`${CACHE_KEYS.EXPLORE_RESULTS}.${contentType}`, slim, TTL.EXPLORE);
}

/** Get cached explore results for a given content type tab. */
export function getExploreCache(contentType: string): ExploreResultSlim[] | null {
  return getCache<ExploreResultSlim[]>(`${CACHE_KEYS.EXPLORE_RESULTS}.${contentType}`);
}

// Run cleanup on module load
clearExpired();
