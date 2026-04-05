/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Discord Webhook Service
   Stores per-user, per-event webhook configs in the DB.
   Fires webhooks asynchronously and non-blocking.
   Rate limit: 30 requests per minute per webhook URL (in-memory bucket).
   Fails silently — webhook errors never affect platform operations.
═══════════════════════════════════════════════════════════════════ */

import { getDb } from "./db";
import { discordWebhooks } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Supported event types ────────────────────────────────────────────────────
export type DiscordEventType =
  | "wid_minted"
  | "track_upload"
  | "jukebox_room"
  | "tip_received"
  | "like_surge";

export const DISCORD_EVENT_LABELS: Record<DiscordEventType, string> = {
  wid_minted:    "WID Minted",
  track_upload:  "New Track Upload",
  jukebox_room:  "Jukebox Room Opened",
  tip_received:  "Tip Received",
  like_surge:    "Like Surge",
};

export const DISCORD_EVENT_DESCRIPTIONS: Record<DiscordEventType, string> = {
  wid_minted:    "Fires when a Witness ID is issued for a track",
  track_upload:  "Fires when a creator completes a track upload",
  jukebox_room:  "Fires when a new Listen Together room is opened",
  tip_received:  "Fires when a fan sends a tip to a creator",
  like_surge:    "Fires when a track gains 10+ likes in under an hour",
};

// ─── In-memory rate limiter (30 req/min per URL) ──────────────────────────────
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

/** Build a stable rate-limit key for a given user+event pair. Exported for testing. */
export function buildRateLimitKey(userId: number, event: string): string {
  return `user:${userId}:${event}`;
}

function checkRateLimit(url: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(url);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(url, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= 30) return false;
  bucket.count++;
  return true;
}

// ─── Message formatters ───────────────────────────────────────────────────────

/**
 * Returns a plain-text summary of the Discord embed for a given event.
 * Used in tests to verify message content without making HTTP calls.
 */
export function formatDiscordMessage(event: DiscordEventType, payload: Record<string, unknown>): string {
  const body = formatMessage(event, payload) as Record<string, unknown>;
  const embeds = body.embeds as Array<Record<string, unknown>> | undefined;
  const embed = embeds?.[0];
  if (!embed) return String(body.content ?? event);
  const fields = ((embed.fields ?? []) as Array<{ name: string; value: string }>)
    .map(f => `${f.name}: ${f.value}`)
    .join(" | ");
  return `${embed.title} | ${fields}`;
}

function formatMessage(event: DiscordEventType, payload: Record<string, unknown>): object {
  const base = { username: "Living Nexus", avatar_url: "https://livingnexus-7khkqvmb.manus.space/favicon.ico" };

  switch (event) {
    case "wid_minted":
      return {
        ...base,
        embeds: [{
          title: "🛡️ Witness ID Minted",
          color: 0xD4AF37,
          description: `A new Witness ID has been issued, establishing cryptographic provenance.`,
          fields: [
            { name: "Track", value: String(payload.title ?? "Unknown"), inline: true },
            { name: "Creator", value: String(payload.creatorName ?? "Unknown"), inline: true },
            { name: "WID", value: `\`${String(payload.witnessId ?? "—")}\``, inline: false },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Living Nexus · Audio Provenance Platform" },
        }],
      };

    case "track_upload":
      return {
        ...base,
        embeds: [{
          title: "🎵 New Track Registered",
          color: 0xE8A830,
          description: `A creator just registered a new work on Living Nexus.`,
          fields: [
            { name: "Title", value: String(payload.title ?? "Unknown"), inline: true },
            { name: "Creator", value: String(payload.creatorName ?? "Unknown"), inline: true },
            { name: "Type", value: String(payload.contentType ?? "audio"), inline: true },
            ...(payload.genre ? [{ name: "Genre", value: String(payload.genre), inline: true }] : []),
            ...(payload.witnessId ? [{ name: "WID", value: `\`${payload.witnessId}\``, inline: false }] : []),
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Living Nexus · Audio Provenance Platform" },
        }],
      };

    case "jukebox_room":
      return {
        ...base,
        embeds: [{
          title: "📻 Jukebox Room Opened",
          color: 0x65C897,
          description: `A new Listen Together session is live.`,
          fields: [
            { name: "Room Code", value: `\`${String(payload.roomCode ?? "—")}\``, inline: true },
            { name: "Host", value: String(payload.hostName ?? "Unknown"), inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Living Nexus · Audio Provenance Platform" },
        }],
      };

    case "tip_received":
      return {
        ...base,
        embeds: [{
          title: "💛 Tip Received",
          color: 0xF5C451,
          description: `A fan just supported a creator.`,
          fields: [
            { name: "Creator", value: String(payload.creatorName ?? "Unknown"), inline: true },
            { name: "Amount", value: `$${((Number(payload.amountCents) || 0) / 100).toFixed(2)}`, inline: true },
            { name: "Track", value: String(payload.songTitle ?? "—"), inline: true },
            { name: "From", value: String(payload.fanName ?? "Anonymous"), inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Living Nexus · Audio Provenance Platform" },
        }],
      };

    case "like_surge":
      return {
        ...base,
        embeds: [{
          title: "🔥 Like Surge Detected",
          color: 0xFF6B35,
          description: `A track is gaining rapid momentum.`,
          fields: [
            { name: "Track", value: String(payload.title ?? "Unknown"), inline: true },
            { name: "Creator", value: String(payload.creatorName ?? "Unknown"), inline: true },
            { name: "New Likes", value: `+${String(payload.newLikes ?? "10")} in the last hour`, inline: false },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Living Nexus · Audio Provenance Platform" },
        }],
      };

    default:
      return { ...base, content: `Living Nexus event: ${event}` };
  }
}

// ─── Core fire function ───────────────────────────────────────────────────────
async function sendToDiscord(webhookUrl: string, body: object): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
export async function getWebhooksForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordWebhooks).where(eq(discordWebhooks.userId, userId));
}

export async function upsertWebhook(
  userId: number,
  event: DiscordEventType,
  webhookUrl: string,
  enabled: boolean,
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Try update first, then insert
  const existing = await db
    .select({ id: discordWebhooks.id })
    .from(discordWebhooks)
    .where(and(eq(discordWebhooks.userId, userId), eq(discordWebhooks.event, event)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(discordWebhooks)
      .set({ webhookUrl, enabled, updatedAt: new Date() })
      .where(and(eq(discordWebhooks.userId, userId), eq(discordWebhooks.event, event)));
  } else {
    await db.insert(discordWebhooks).values({ userId, event, webhookUrl, enabled });
  }
}

// ─── Public fire API ──────────────────────────────────────────────────────────
/**
 * Fire a webhook for a specific user and event.
 * Non-blocking — errors are swallowed and logged to DB.
 */
export async function fireUserWebhook(
  userId: number,
  event: DiscordEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  // Run async, never await from callers
  void (async () => {
    try {
      const db = await getDb();
      if (!db) return;
      const [row] = await db
        .select()
        .from(discordWebhooks)
        .where(and(eq(discordWebhooks.userId, userId), eq(discordWebhooks.event, event)))
        .limit(1);
      if (!row || !row.enabled || !row.webhookUrl) return;
      if (!checkRateLimit(row.webhookUrl)) {
        console.warn(`[Discord] Rate limit hit for userId=${userId} event=${event}`);
        return;
      }
      const body = formatMessage(event, payload);
      const result = await sendToDiscord(row.webhookUrl, body);
      if (result.ok) {
        await db
          .update(discordWebhooks)
          .set({ lastFiredAt: new Date(), lastError: null, updatedAt: new Date() })
          .where(and(eq(discordWebhooks.userId, userId), eq(discordWebhooks.event, event)));
      } else {
        await db
          .update(discordWebhooks)
          .set({ lastError: result.error ?? "unknown", updatedAt: new Date() })
          .where(and(eq(discordWebhooks.userId, userId), eq(discordWebhooks.event, event)));
      }
    } catch (err) {
      console.error(`[Discord] Unhandled error for userId=${userId} event=${event}:`, err);
    }
  })();
}

/**
 * Fire a webhook for ALL users who have a given event configured.
 * Used for platform-wide events (e.g., like surges) where we want to
 * notify every creator who owns the affected track.
 */
export async function fireWebhookForOwner(
  ownerUserId: number,
  event: DiscordEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  return fireUserWebhook(ownerUserId, event, payload);
}

/**
 * Test a webhook URL directly (not from DB) — used by the settings UI.
 * Returns { ok, error } synchronously.
 */
export async function testWebhookUrl(
  event: DiscordEventType,
  webhookUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!checkRateLimit(webhookUrl)) {
    return { ok: false, error: "Rate limit: too many test requests. Wait 1 minute." };
  }
  const body = formatMessage(event, {
    title: "Test Track — Living Nexus",
    creatorName: "Test Creator",
    witnessId: "WID-TEST-0000",
    contentType: "audio",
    genre: "Test Genre",
    roomCode: "TEST01",
    hostName: "Test Host",
    amountCents: 500,
    songTitle: "Test Track",
    fanName: "Test Fan",
    newLikes: 12,
  });
  return sendToDiscord(webhookUrl, body);
}
