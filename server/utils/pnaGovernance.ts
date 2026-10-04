import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  PNA_STEWARDSHIP_PROFILES,
  type PNAContextSourceKind,
  type PNAProfileId,
} from "../../shared/pnaGovernance";
import {
  keeperChatArchives,
  keeperNotes,
  pnaContextEntries,
  pnaContextEnvelopes,
  pnaContextUseEntries,
  pnaContextUseReceipts,
  pnaProfileSettings,
  pnaThreads,
  quiverImages,
  songs,
  wids,
} from "../../drizzle/schema";
import { getDb } from "./db";

export async function requireOwnedPnaThread(userId: number, threadId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PNA workspace is temporarily unavailable." });
  const [thread] = await db.select().from(pnaThreads)
    .where(and(eq(pnaThreads.id, threadId), eq(pnaThreads.userId, userId))).limit(1);
  if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Private PNA thread not found." });
  return { db, thread };
}

export type ResolvedPnaContextSource = {
  sourceKind: PNAContextSourceKind;
  sourceRef: string;
  title: string;
  wid?: string | null;
  contextText: string;
};

export async function resolveOwnedPnaContextSource(
  userId: number,
  sourceKind: PNAContextSourceKind,
  sourceRef: string,
): Promise<ResolvedPnaContextSource> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PNA context is temporarily unavailable." });

  if (sourceKind === "work") {
    const songId = Number(sourceRef);
    if (!Number.isInteger(songId) || songId <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid Work context." });
    const [work] = await db.select({ id: songs.id, title: songs.title, witnessId: songs.witnessId, description: songs.description, lyricsText: songs.lyricsText })
      .from(songs).where(and(eq(songs.id, songId), eq(songs.userId, userId))).limit(1);
    if (!work) throw new TRPCError({ code: "NOT_FOUND", message: "That Work is not available in your private PNA context." });
    const excerpts = [
      `Selected Work: ${work.title}`,
      work.witnessId ? `Witness ID: ${work.witnessId}` : null,
      work.description ? `Creator description: ${work.description.slice(0, 1_200)}` : null,
      work.lyricsText ? `Creator-provided lyrics excerpt: ${work.lyricsText.slice(0, 2_400)}` : null,
    ].filter(Boolean);
    return { sourceKind, sourceRef: String(work.id), title: work.title, wid: work.witnessId, contextText: excerpts.join("\n") };
  }

  if (sourceKind === "wid") {
    const [wid] = await db.select({ wid: wids.wid, eventId: wids.eventId })
      .from(wids).where(and(eq(wids.wid, sourceRef), eq(wids.creatorId, userId))).limit(1);
    if (!wid) throw new TRPCError({ code: "NOT_FOUND", message: "That Witness ID is not available in your private PNA context." });
    return { sourceKind, sourceRef: wid.wid, title: wid.wid, wid: wid.wid, contextText: `Selected Witness ID: ${wid.wid}\nRegistry event reference: ${wid.eventId}` };
  }

  if (sourceKind === "keeper_note") {
    const noteId = Number(sourceRef);
    const [note] = await db.select({ id: keeperNotes.id, title: keeperNotes.title, content: keeperNotes.content })
      .from(keeperNotes).where(and(eq(keeperNotes.id, noteId), eq(keeperNotes.userId, userId))).limit(1);
    if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "That private note is not available in PNA context." });
    return { sourceKind, sourceRef: String(note.id), title: note.title, contextText: `Creator private note: ${note.title}\n${note.content.slice(0, 2_400)}` };
  }

  if (sourceKind === "diary") {
    const diaryId = Number(sourceRef);
    const [diary] = await db.select({ id: keeperChatArchives.id, title: keeperChatArchives.title, messages: keeperChatArchives.messages, diaryWid: keeperChatArchives.diaryWid })
      .from(keeperChatArchives).where(and(eq(keeperChatArchives.id, diaryId), eq(keeperChatArchives.userId, userId))).limit(1);
    if (!diary) throw new TRPCError({ code: "NOT_FOUND", message: "That private diary is not available in PNA context." });
    return {
      sourceKind,
      sourceRef: String(diary.id),
      title: diary.title ?? "Untitled private diary",
      wid: diary.diaryWid,
      contextText: `Creator private diary: ${diary.title ?? "Untitled"}${diary.diaryWid ? `\nDiary reference: ${diary.diaryWid}` : ""}\n${(diary.messages ?? "").slice(0, 2_400)}`,
    };
  }

  const imageId = Number(sourceRef);
  const [image] = await db.select({ id: quiverImages.id, title: quiverImages.title, prompt: quiverImages.prompt, widId: quiverImages.widId })
    .from(quiverImages).where(and(eq(quiverImages.id, imageId), eq(quiverImages.userId, userId))).limit(1);
  if (!image) throw new TRPCError({ code: "NOT_FOUND", message: "That private Quiver asset is not available in PNA context." });
  return {
    sourceKind,
    sourceRef: String(image.id),
    title: image.title ?? "Private Quiver asset",
    wid: image.widId,
    contextText: `Creator private Quiver asset: ${image.title ?? "Untitled"}${image.widId ? `\nRelated Witness ID: ${image.widId}` : ""}\nCreator prompt: ${image.prompt.slice(0, 1_200)}`,
  };
}

export async function getOrCreateActiveEnvelope(userId: number, threadId: string) {
  const { db } = await requireOwnedPnaThread(userId, threadId);
  const [existing] = await db.select().from(pnaContextEnvelopes)
    .where(and(eq(pnaContextEnvelopes.userId, userId), eq(pnaContextEnvelopes.threadId, threadId))).limit(1);
  if (existing) return { db, envelope: existing };

  const id = nanoid(24);
  try {
    await db.insert(pnaContextEnvelopes).values({ id, userId, threadId });
  } catch {
    // Unique owner/thread constraint resolves concurrent first attachment safely.
  }
  const [created] = await db.select().from(pnaContextEnvelopes)
    .where(and(eq(pnaContextEnvelopes.userId, userId), eq(pnaContextEnvelopes.threadId, threadId))).limit(1);
  if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create a private Context Envelope." });
  return { db, envelope: created };
}

export async function getPnaProfileSetting(userId: number, profileId: PNAProfileId) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PNA stewardship settings are temporarily unavailable." });
  const [setting] = await db.select().from(pnaProfileSettings)
    .where(and(eq(pnaProfileSettings.userId, userId), eq(pnaProfileSettings.profileId, profileId))).limit(1);
  return setting ?? { userId, profileId, isEnabled: true, allowRemoteContext: false };
}

export async function preparePnaContextUse(userId: number, threadId: string, profileId: PNAProfileId) {
  const { db } = await requireOwnedPnaThread(userId, threadId);
  const profile = PNA_STEWARDSHIP_PROFILES[profileId];
  const setting = await getPnaProfileSetting(userId, profileId);
  if (!setting.isEnabled) throw new TRPCError({ code: "FORBIDDEN", message: `${profile.label} is disabled in your Stewardship settings.` });

  const [envelope] = await db.select().from(pnaContextEnvelopes)
    .where(and(eq(pnaContextEnvelopes.userId, userId), eq(pnaContextEnvelopes.threadId, threadId), eq(pnaContextEnvelopes.state, "active"))).limit(1);
  if (!envelope) return { receiptId: null, sourceCount: 0 };

  const entries = await db.select().from(pnaContextEntries)
    .where(and(eq(pnaContextEntries.envelopeId, envelope.id), eq(pnaContextEntries.userId, userId), eq(pnaContextEntries.state, "attached")));
  if (entries.length === 0) return { receiptId: null, sourceCount: 0 };
  if (!setting.allowRemoteContext) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Remote selected-context use for ${profile.label} requires your Stewardship settings confirmation.` });
  }
  if (entries.length > 8) throw new TRPCError({ code: "BAD_REQUEST", message: "PNA can use up to eight selected sources in one request." });

  for (const entry of entries) {
    if (!profile.permittedContextKinds.includes(entry.sourceKind as PNAContextSourceKind)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `${profile.label} cannot use one of the selected context sources. Detach it or select a compatible profile.` });
    }
    await resolveOwnedPnaContextSource(userId, entry.sourceKind as PNAContextSourceKind, entry.sourceRef);
  }

  const receiptId = nanoid(24);
  await db.insert(pnaContextUseReceipts).values({
    id: receiptId,
    userId,
    threadId,
    envelopeId: envelope.id,
    envelopeRevision: envelope.revision,
    profileId,
    disclosureSnapshot: `Remote PNA route authorized for ${entries.length} selected source${entries.length === 1 ? "" : "s"}.`,
    outcome: "prepared",
  });
  await db.insert(pnaContextUseEntries).values(entries.map((entry: {
    id: string;
    sourceKind: string;
    sourceRef: string;
    titleSnapshot: string;
  }) => ({
    id: nanoid(24),
    receiptId,
    contextEntryId: entry.id,
    sourceKind: entry.sourceKind,
    sourceRefSnapshot: entry.sourceRef,
    titleSnapshot: entry.titleSnapshot,
  })));
  return { receiptId, sourceCount: entries.length };
}

export async function resolvePnaContextUseForModel(userId: number, threadId: string, profileId: PNAProfileId, receiptId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PNA context is temporarily unavailable." });
  const [receipt] = await db.select().from(pnaContextUseReceipts).where(and(
    eq(pnaContextUseReceipts.id, receiptId),
    eq(pnaContextUseReceipts.userId, userId),
    eq(pnaContextUseReceipts.threadId, threadId),
    eq(pnaContextUseReceipts.profileId, profileId),
    eq(pnaContextUseReceipts.outcome, "prepared"),
  )).limit(1);
  if (!receipt) throw new TRPCError({ code: "FORBIDDEN", message: "This Context Envelope approval is no longer available. Review it again before sending." });

  const profile = PNA_STEWARDSHIP_PROFILES[profileId];
  const setting = await getPnaProfileSetting(userId, profileId);
  if (!setting.isEnabled || !setting.allowRemoteContext) {
    await db.update(pnaContextUseReceipts).set({ outcome: "blocked", resolvedAt: new Date() }).where(eq(pnaContextUseReceipts.id, receipt.id));
    throw new TRPCError({ code: "FORBIDDEN", message: "Your Stewardship settings no longer permit remote selected-context use for this profile." });
  }

  const [envelope] = await db.select().from(pnaContextEnvelopes).where(and(
    eq(pnaContextEnvelopes.id, receipt.envelopeId),
    eq(pnaContextEnvelopes.userId, userId),
    eq(pnaContextEnvelopes.threadId, threadId),
    eq(pnaContextEnvelopes.state, "active"),
  )).limit(1);
  if (!envelope || envelope.revision !== receipt.envelopeRevision) {
    await db.update(pnaContextUseReceipts).set({ outcome: "blocked", resolvedAt: new Date() }).where(eq(pnaContextUseReceipts.id, receipt.id));
    throw new TRPCError({ code: "FORBIDDEN", message: "Your selected Context Envelope changed. Review its current sources before sending." });
  }

  const receiptEntries = await db.select().from(pnaContextUseEntries)
    .where(eq(pnaContextUseEntries.receiptId, receipt.id));
  if (receiptEntries.length === 0) {
    await db.update(pnaContextUseReceipts).set({ outcome: "blocked", resolvedAt: new Date() }).where(eq(pnaContextUseReceipts.id, receipt.id));
    throw new TRPCError({ code: "FORBIDDEN", message: "This Context Envelope receipt has no selected source record. Review it again before sending." });
  }
  const sources = await Promise.all(receiptEntries.map(async (entry: { sourceKind: string; sourceRefSnapshot: string }) => {
    const kind = entry.sourceKind as PNAContextSourceKind;
    if (!profile.permittedContextKinds.includes(kind)) throw new TRPCError({ code: "FORBIDDEN", message: `${profile.label} cannot use the current selected source set.` });
    return resolveOwnedPnaContextSource(userId, kind, entry.sourceRefSnapshot);
  }));

  return {
    receiptId: receipt.id,
    sourceCount: sources.length,
    contextBlock: `\n--- CREATOR-SELECTED PRIVATE CONTEXT ---\n${sources.map((source, index) => `[${index + 1}] ${source.contextText}`).join("\n\n")}\n--- END CREATOR-SELECTED PRIVATE CONTEXT ---`,
  };
}

export async function settlePnaContextReceipt(receiptId: string, outcome: "sent" | "failed") {
  const db = await getDb();
  if (!db) return;
  await db.update(pnaContextUseReceipts).set({ outcome, resolvedAt: new Date() })
    .where(and(eq(pnaContextUseReceipts.id, receiptId), eq(pnaContextUseReceipts.outcome, "prepared")));
}
