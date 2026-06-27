/**
 * server/db/comments.ts
 *
 * Comments domain — extracted from server/utils/db.ts as Pass 3 of the data-layer refactor.
 *
 * Covers:
 *   - getCommentsBySong  — threaded comment fetch with user-join display-name resolution
 *   - addComment         — insert a comment (anonymous or authenticated)
 *   - createCommentReport    — flag a comment for moderation (idempotent per reporter)
 *   - getFlaggedComments     — admin view of pending reports joined with comment data
 *   - moderateCommentReport  — dismiss or hard-delete a reported comment
 *
 * No behaviour changes — this is a pure structural extraction.
 * server/utils/db.ts still exports all the same names; existing imports are unaffected.
 */

import { alias } from "drizzle-orm/mysql-core";
import { and, desc, eq } from "drizzle-orm";
import {
  comments,
  commentReports,
  users,
} from "../../drizzle/schema";
import { getDb } from "../utils/db";

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getCommentsBySong(songId: number) {
  const db = await getDb();
  if (!db) return [];
  // Join users to resolve authorName from userId when stored value is null/empty/Anonymous
  const authorUser = alias(users, 'authorUser');
  const rows = await db
    .select({
      id: comments.id,
      songId: comments.songId,
      userId: comments.userId,
      authorName: comments.authorName,
      content: comments.content,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      resolvedHandle: authorUser.artistHandle,
      resolvedName: authorUser.name,
      resolvedAvatar: authorUser.profilePhotoUrl,
    })
    .from(comments)
    .leftJoin(authorUser, eq(comments.userId, authorUser.id))
    .where(eq(comments.songId, songId))
    .orderBy(comments.createdAt)
    .limit(200);
  // Resolve display name: stored authorName -> user artistHandle -> user name -> 'Anonymous'
  type RawRow = typeof rows[0];
  type CommentRow = {
    id: number; songId: number; userId: number | null; authorName: string | null;
    content: string; parentId: number | null; createdAt: Date; avatarUrl: string | null;
  };
  const resolved: CommentRow[] = rows.map((r: RawRow) => {
    const stored = r.authorName;
    const isBlank = !stored || stored === 'Anonymous';
    const displayName = isBlank
      ? (r.resolvedHandle || r.resolvedName || stored || 'Anonymous')
      : stored;
    return {
      id: r.id,
      songId: r.songId,
      userId: r.userId,
      authorName: displayName,
      content: r.content,
      parentId: r.parentId,
      createdAt: r.createdAt,
      avatarUrl: r.resolvedAvatar ?? null,
    };
  });
  // Build threaded structure: top-level comments with nested replies
  type CommentWithReplies = CommentRow & { replies: CommentRow[] };
  const topLevel: CommentWithReplies[] = [];
  const replyMap = new Map<number, CommentRow[]>();
  for (const c of resolved) {
    if (c.parentId == null) {
      topLevel.push({ ...c, replies: [] });
    } else {
      const arr = replyMap.get(c.parentId) ?? [];
      arr.push(c);
      replyMap.set(c.parentId, arr);
    }
  }
  for (const c of topLevel) {
    c.replies = replyMap.get(c.id) ?? [];
  }
  // Return newest top-level first
  return topLevel.reverse();
}

export async function addComment(data: {
  songId: number;
  userId?: number;
  authorName?: string;
  content: string;
  parentId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(comments).values(data);
}

export async function createCommentReport(data: {
  commentId: number;
  reporterId: number;
  reason: "spam" | "harassment" | "hate_speech" | "misinformation" | "other";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  // Prevent duplicate reports from same user on same comment
  const existing = await db
    .select({ id: commentReports.id })
    .from(commentReports)
    .where(
      and(
        eq(commentReports.commentId, data.commentId),
        eq(commentReports.reporterId, data.reporterId),
      )
    )
    .limit(1);
  if (existing.length > 0) return { alreadyReported: true };
  await db.insert(commentReports).values({ ...data, status: "pending" });
  return { alreadyReported: false };
}

export async function getFlaggedComments() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      reportId: commentReports.id,
      commentId: commentReports.commentId,
      reason: commentReports.reason,
      notes: commentReports.notes,
      status: commentReports.status,
      reportedAt: commentReports.createdAt,
      reporterId: commentReports.reporterId,
      commentContent: comments.content,
      commentCreatedAt: comments.createdAt,
      commentUserId: comments.userId,
      commentAuthorName: comments.authorName,
      songId: comments.songId,
    })
    .from(commentReports)
    .innerJoin(comments, eq(commentReports.commentId, comments.id))
    .where(eq(commentReports.status, "pending"))
    .orderBy(desc(commentReports.createdAt))
    .limit(100);
  return rows;
}

export async function moderateCommentReport(
  reportId: number,
  action: "dismiss" | "delete",
  reviewerId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const report = await db
    .select()
    .from(commentReports)
    .where(eq(commentReports.id, reportId))
    .limit(1);
  if (!report.length) throw new Error("Report not found");
  if (action === "delete") {
    // Hard-delete the comment (and mark report actioned)
    await db.delete(comments).where(eq(comments.id, report[0].commentId));
    await db
      .update(commentReports)
      .set({ status: "actioned", reviewedBy: reviewerId, reviewedAt: new Date() })
      .where(eq(commentReports.id, reportId));
  } else {
    await db
      .update(commentReports)
      .set({ status: "dismissed", reviewedBy: reviewerId, reviewedAt: new Date() })
      .where(eq(commentReports.id, reportId));
  }
  return { success: true };
}
