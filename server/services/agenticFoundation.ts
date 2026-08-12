/**
 * @domain   The Creator → Domain → Authorized Agent
 * @impl     Server Service — Music-Draft Commission, Capability Authority, and Agent Ledger
 *
 * First-slice boundary: this service never invokes a model, Bridge, publish,
 * seal, register a WID, or touches a work outside its creator-owned audio Draft.
 */
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  agentCapabilityAuthorities,
  agentCommissions,
  agentLedgerEntries,
  agents,
  songs,
} from "../../drizzle/schema";
import { getOrCreateAgent } from "../db/users";
import { getDb } from "../utils/db";
import { canonicalize, sha256hex } from "./provenance";

export const MUSIC_DRAFT_CAPABILITY = "music_draft" as const;
const AGENT_IDENTIFIER_PREFIX = "agent:pna-";

type MusicDraftScope = {
  userId: number;
  contentType: string | null;
  status: string | null;
  isPublic: boolean;
};

type CapabilityAuthorityScope = { enabled: boolean } | undefined | null;

export function assertMusicDraftScope(song: MusicDraftScope | undefined | null, creatorId: number) {
  if (!song || song.userId !== creatorId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Music Draft not found in this Creator Domain." });
  }
  if (song.contentType !== "audio" || song.status !== "Draft" || song.isPublic) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Authorized Agent work is limited to private audio Drafts.",
    });
  }
}

export function assertMusicDraftCapability(authority: CapabilityAuthorityScope) {
  if (!authority?.enabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Music Draft capability is disabled for this Creator Domain.",
    });
  }
}

function agentIdentifier(agentId: number) {
  return `${AGENT_IDENTIFIER_PREFIX}${agentId}`;
}

async function appendAgentLedgerEntry(
  db: any,
  data: {
    creatorId: number;
    agentId: number;
    commissionId?: string | null;
    songId?: number | null;
    action: "capability_enabled" | "capability_disabled" | "commission_issued";
    payload: Record<string, unknown>;
  },
) {
  const occurredAt = new Date();
  const payloadCanonical = canonicalize(JSON.stringify({
    ...data.payload,
    action: data.action,
    capability: MUSIC_DRAFT_CAPABILITY,
    creatorId: data.creatorId,
    agentIdentifier: agentIdentifier(data.agentId),
    occurredAt: occurredAt.toISOString(),
    nonce: randomUUID(),
  }));
  const entryId = sha256hex(payloadCanonical);
  await db.insert(agentLedgerEntries).values({
    entryId,
    creatorId: data.creatorId,
    agentId: data.agentId,
    agentIdentifier: agentIdentifier(data.agentId),
    commissionId: data.commissionId ?? null,
    songId: data.songId ?? null,
    capability: MUSIC_DRAFT_CAPABILITY,
    action: data.action,
    payloadCanonical,
    createdAt: occurredAt,
  });
  return { entryId, payloadCanonical, createdAt: occurredAt };
}

export async function getMusicDraftCapabilityAuthority(creatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const agent = await getOrCreateAgent(creatorId);
  const rows = await db.select().from(agentCapabilityAuthorities).where(and(
    eq(agentCapabilityAuthorities.creatorId, creatorId),
    eq(agentCapabilityAuthorities.agentId, agent.id),
    eq(agentCapabilityAuthorities.capability, MUSIC_DRAFT_CAPABILITY),
  )).limit(1);
  return { agentId: agent.id, agentIdentifier: agentIdentifier(agent.id), enabled: rows[0]?.enabled ?? false };
}

export async function setMusicDraftCapabilityAuthority(creatorId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const agent = await getOrCreateAgent(creatorId);

  return db.transaction(async (tx: any) => {
    const existing = await tx.select().from(agentCapabilityAuthorities).where(and(
      eq(agentCapabilityAuthorities.creatorId, creatorId),
      eq(agentCapabilityAuthorities.agentId, agent.id),
      eq(agentCapabilityAuthorities.capability, MUSIC_DRAFT_CAPABILITY),
    )).limit(1);

    if (existing[0]) {
      await tx.update(agentCapabilityAuthorities).set({ enabled }).where(eq(agentCapabilityAuthorities.id, existing[0].id));
    } else {
      await tx.insert(agentCapabilityAuthorities).values({
        creatorId,
        agentId: agent.id,
        capability: MUSIC_DRAFT_CAPABILITY,
        enabled,
      });
    }

    const ledger = await appendAgentLedgerEntry(tx, {
      creatorId,
      agentId: agent.id,
      action: enabled ? "capability_enabled" : "capability_disabled",
      payload: { authorityEnabled: enabled },
    });

    return { agentId: agent.id, agentIdentifier: agentIdentifier(agent.id), enabled, ledgerEntryId: ledger.entryId };
  });
}

export async function issueMusicDraftCommission(creatorId: number, input: { songId: number; direction: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const agent = await getOrCreateAgent(creatorId);

  return db.transaction(async (tx: any) => {
    const authority = await tx.select().from(agentCapabilityAuthorities).where(and(
      eq(agentCapabilityAuthorities.creatorId, creatorId),
      eq(agentCapabilityAuthorities.agentId, agent.id),
      eq(agentCapabilityAuthorities.capability, MUSIC_DRAFT_CAPABILITY),
    )).limit(1);
    assertMusicDraftCapability(authority[0]);

    const draftRows = await tx.select().from(songs).where(eq(songs.id, input.songId)).limit(1);
    const draft = draftRows[0];
    assertMusicDraftScope(draft, creatorId);

    const issuedAt = new Date();
    const directionHash = sha256hex(canonicalize(input.direction));
    const commissionId = sha256hex(canonicalize(JSON.stringify({
      creatorId,
      agentId: agent.id,
      songId: input.songId,
      directionHash,
      issuedAt: issuedAt.toISOString(),
      nonce: randomUUID(),
    })));

    await tx.insert(agentCommissions).values({
      commissionId,
      creatorId,
      agentId: agent.id,
      songId: input.songId,
      capability: MUSIC_DRAFT_CAPABILITY,
      direction: input.direction,
      status: "active",
      issuedAt,
    });

    const ledger = await appendAgentLedgerEntry(tx, {
      creatorId,
      agentId: agent.id,
      commissionId,
      songId: input.songId,
      action: "commission_issued",
      payload: { commissionId, songId: input.songId, directionHash, commissionStatus: "active" },
    });

    return { commissionId, songId: input.songId, status: "active" as const, ledgerEntryId: ledger.entryId };
  });
}

export async function listMusicDraftCommissions(creatorId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(agentCommissions)
    .where(eq(agentCommissions.creatorId, creatorId))
    .orderBy(desc(agentCommissions.issuedAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function listAgentLedgerEntries(creatorId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(agentLedgerEntries)
    .where(eq(agentLedgerEntries.creatorId, creatorId))
    .orderBy(desc(agentLedgerEntries.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}
