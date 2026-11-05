import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../_core/trpc";
import { getDb } from "../utils/db";
import {
  playerEditions,
  playerSubmissions,
  playerCurationEvents,
  songs,
  users,
} from "../../drizzle/schema";
import {
  PLAYER_DISPLAY_TERMS_VERSION,
  canExportPlayerSubmission,
} from "../../shared/playerCollections";

async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Player collections are unavailable. Please try again later.",
    });
  return db as MySql2Database;
}
const id = z.number().int().positive();
async function ownedSubmission(submissionId: number, creatorId: number) {
  const db = await database();
  const [row] = await db
    .select()
    .from(playerSubmissions)
    .where(
      and(
        eq(playerSubmissions.id, submissionId),
        eq(playerSubmissions.creatorId, creatorId)
      )
    )
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return { db, row };
}
export const playerCollectionsRouter = router({
  editions: publicProcedure.query(async () => {
    const db = await database();
    return db
      .select()
      .from(playerEditions)
      .orderBy(desc(playerEditions.createdAt))
      .limit(50);
  }),
  createEdition: adminProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().min(1).max(4000),
        targetTracks: z.number().int().min(1).max(50).default(50),
        capacityBytes: z.number().int().positive().nullable().default(null),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db
        .insert(playerEditions)
        .values({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
  list: publicProcedure
    .input(z.object({ editionId: id }))
    .query(async ({ input }) => {
      const db = await database();
      const rows = await db
        .select({
          id: playerSubmissions.id,
          songId: songs.id,
          creatorId: users.id,
          title: songs.title,
          artist: users.artistHandle,
          name: users.name,
          artwork: songs.coverArtUrl,
          audioUrl: songs.fileUrl,
          duration: songs.durationSeconds,
          lyrics: songs.lyricsText,
          witnessId: songs.witnessId,
          kind: playerSubmissions.kind,
          status: playerSubmissions.status,
          position: playerSubmissions.position,
          audienceNotes: playerSubmissions.audienceNotes,
        })
        .from(playerSubmissions)
        .innerJoin(songs, eq(songs.id, playerSubmissions.songId))
        .innerJoin(users, eq(users.id, playerSubmissions.creatorId))
        .where(
          and(
            eq(playerSubmissions.editionId, input.editionId),
            eq(playerSubmissions.publicConsent, true),
            eq(songs.status, "Published")
          )
        )
        .orderBy(
          asc(playerSubmissions.position),
          asc(playerSubmissions.createdAt)
        )
        .limit(500);
      return rows.filter(row => row.status !== "withdrawn");
    }),
  mine: protectedProcedure
    .input(z.object({ editionId: id }))
    .query(async ({ ctx, input }) => {
      const db = await database();
      return db
        .select()
        .from(playerSubmissions)
        .where(
          and(
            eq(playerSubmissions.editionId, input.editionId),
            eq(playerSubmissions.creatorId, ctx.user.id)
          )
        );
    }),
  submit: protectedProcedure
    .input(
      z.object({
        editionId: id,
        songId: id,
        kind: z.enum(["music", "audiobook"]),
        audienceNotes: z.string().trim().min(1).max(1000),
        publicConsent: z.literal(true),
        displayTermsVersion: z.literal(PLAYER_DISPLAY_TERMS_VERSION),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      const [edition] = await db
        .select()
        .from(playerEditions)
        .where(eq(playerEditions.id, input.editionId))
        .limit(1);
      if (!edition || edition.status !== "open")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This edition is not accepting submissions.",
        });
      const [work] = await db
        .select()
        .from(songs)
        .where(and(eq(songs.id, input.songId), eq(songs.userId, ctx.user.id)))
        .limit(1);
      if (
        !work ||
        work.status !== "Published" ||
        !work.fileUrl ||
        work.contentType !== "audio"
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Select your own published audio Work. Upload audiobook audio through the existing upload workflow first.",
        });
      const [existing] = await db
        .select()
        .from(playerSubmissions)
        .where(
          and(
            eq(playerSubmissions.editionId, input.editionId),
            eq(playerSubmissions.songId, input.songId)
          )
        )
        .limit(1);
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "This work has already been submitted to this edition.",
        });
      await db.transaction(async tx => {
        const [result] = await tx
          .insert(playerSubmissions)
          .values({ ...input, creatorId: ctx.user.id });
        await tx
          .insert(playerCurationEvents)
          .values({
            submissionId: Number(result.insertId),
            actorId: ctx.user.id,
            action: "public_submission_consented",
          });
      });
      return { success: true };
    }),
  withdraw: protectedProcedure
    .input(z.object({ submissionId: id }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await ownedSubmission(input.submissionId, ctx.user.id);
      await db.transaction(async tx => {
        await tx
          .update(playerSubmissions)
          .set({
            status: "withdrawn",
            publicConsent: false,
            acceptedTerms: null,
            acceptedAt: null,
          })
          .where(eq(playerSubmissions.id, input.submissionId));
        await tx
          .insert(playerCurationEvents)
          .values({
            submissionId: input.submissionId,
            actorId: ctx.user.id,
            action: "withdrawn_from_future_exports",
          });
      });
      return { success: true };
    }),
  offerTerms: adminProcedure
    .input(
      z.object({
        submissionId: id,
        terms: z.string().trim().min(20).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.transaction(async tx => {
        const [row] = await tx
          .select()
          .from(playerSubmissions)
          .where(eq(playerSubmissions.id, input.submissionId))
          .limit(1)
          .for("update");
        if (!row || !row.publicConsent || row.status === "withdrawn")
          throw new TRPCError({ code: "NOT_FOUND" });
        await tx
          .update(playerSubmissions)
          .set({
            productTerms: input.terms,
            acceptedTerms: null,
            acceptedAt: null,
            status: "shortlisted",
          })
          .where(eq(playerSubmissions.id, row.id));
        await tx
          .insert(playerCurationEvents)
          .values({
            submissionId: row.id,
            actorId: ctx.user.id,
            action: "product_terms_offered",
          });
      });
      return { success: true };
    }),
  acceptTerms: protectedProcedure
    .input(
      z.object({
        submissionId: id,
        terms: z.string().min(20).max(10000),
        rightsConfirmed: z.literal(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = await ownedSubmission(input.submissionId, ctx.user.id);
      await db.transaction(async tx => {
        const [row] = await tx
          .select()
          .from(playerSubmissions)
          .where(eq(playerSubmissions.id, input.submissionId))
          .limit(1)
          .for("update");
        if (
          !row ||
          !row.publicConsent ||
          row.status === "withdrawn" ||
          row.productTerms !== input.terms
        )
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Terms changed or submission withdrawn. Refresh before accepting.",
          });
        const [work] = await tx
          .select()
          .from(songs)
          .where(eq(songs.id, row.songId))
          .limit(1);
        const sourceHash = work?.storedArtifactHash || work?.fileHash;
        if (
          !work ||
          work.userId !== ctx.user.id ||
          work.status !== "Published" ||
          !sourceHash
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "A published audio Work with a recorded source hash is required.",
          });
        await tx
          .update(playerSubmissions)
          .set({
            acceptedTerms: input.terms,
            acceptedAt: new Date(),
            sourceHash,
          })
          .where(eq(playerSubmissions.id, row.id));
        await tx
          .insert(playerCurationEvents)
          .values({
            submissionId: row.id,
            actorId: ctx.user.id,
            action: "product_terms_and_rights_confirmed",
          });
      });
      return { success: true };
    }),
  select: adminProcedure
    .input(
      z.object({ submissionId: id, position: z.number().int().min(1).max(50) })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.transaction(async tx => {
        const [candidate] = await tx
          .select()
          .from(playerSubmissions)
          .where(eq(playerSubmissions.id, input.submissionId))
          .limit(1);
        if (!candidate) throw new TRPCError({ code: "NOT_FOUND" });
        const [edition] = await tx
          .select()
          .from(playerEditions)
          .where(eq(playerEditions.id, candidate.editionId))
          .limit(1)
          .for("update");
        const [row] = await tx
          .select()
          .from(playerSubmissions)
          .where(eq(playerSubmissions.id, input.submissionId))
          .limit(1)
          .for("update");
        const [work] = await tx
          .select()
          .from(songs)
          .where(eq(songs.id, row.songId))
          .limit(1);
        if (
          !edition ||
          edition.status !== "open" ||
          !work ||
          work.status !== "Published" ||
          !canExportPlayerSubmission({
            status: "selected",
            publicConsent: row.publicConsent,
            terms: row.productTerms,
            acceptedTerms: row.acceptedTerms,
            sourceHash: row.sourceHash,
            currentHash: work.storedArtifactHash || work.fileHash,
          })
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Creator must accept current product terms for the current published audio file first.",
          });
        const selected = await tx
          .select()
          .from(playerSubmissions)
          .where(
            and(
              eq(playerSubmissions.editionId, edition.id),
              eq(playerSubmissions.status, "selected")
            )
          );
        if (
          input.position > edition.targetTracks ||
          selected.some(
            r => r.id !== row.id && r.position === input.position
          ) ||
          (row.status !== "selected" && selected.length >= edition.targetTracks)
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "Choose an unused slot within this edition's track limit.",
          });
        await tx
          .update(playerSubmissions)
          .set({ status: "selected", position: input.position })
          .where(eq(playerSubmissions.id, row.id));
        await tx
          .insert(playerCurationEvents)
          .values({
            submissionId: row.id,
            actorId: ctx.user.id,
            action: "selected_for_edition",
          });
      });
      return { success: true };
    }),
  exportManifest: adminProcedure
    .input(z.object({ editionId: id }))
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      const [edition] = await db
        .select()
        .from(playerEditions)
        .where(eq(playerEditions.id, input.editionId))
        .limit(1);
      if (!edition) throw new TRPCError({ code: "NOT_FOUND" });
      const rows = await db
        .select({ submission: playerSubmissions, work: songs, creator: users })
        .from(playerSubmissions)
        .innerJoin(songs, eq(songs.id, playerSubmissions.songId))
        .innerJoin(users, eq(users.id, playerSubmissions.creatorId))
        .where(
          and(
            eq(playerSubmissions.editionId, edition.id),
            eq(playerSubmissions.status, "selected")
          )
        )
        .orderBy(asc(playerSubmissions.position));
      if (!rows.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No approved tracks to export.",
        });
      if (
        rows.some(
          ({ submission: s, work: w }) =>
            w.status !== "Published" ||
            !w.fileUrl ||
            !canExportPlayerSubmission({
              status: s.status,
              publicConsent: s.publicConsent,
              terms: s.productTerms,
              acceptedTerms: s.acceptedTerms,
              sourceHash: s.sourceHash,
              currentHash: w.storedArtifactHash || w.fileHash,
            })
        )
      )
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A selected work changed, became private, or lost consent. Review before exporting.",
        });
      const exportedAt = new Date().toISOString();
      await db
        .insert(playerCurationEvents)
        .values(
          rows.map(({ submission }) => ({
            submissionId: submission.id,
            actorId: ctx.user.id,
            action: "loading_manifest_exported",
          }))
        );
      return {
        schema: "living-nexus-player-edition-v1",
        editionId: edition.id,
        title: edition.title,
        exportedAt,
        capacityBytes: edition.capacityBytes,
        tracks: rows.map(({ submission: s, work: w, creator: c }) => ({
          slot: s.position,
          kind: s.kind,
          workId: w.id,
          title: w.title,
          creatorId: c.id,
          creator: c.artistHandle || c.name || "Creator",
          witnessId: w.witnessId,
          expectedHash: s.sourceHash,
          hashBasis: w.storedArtifactHash ? "storedArtifactHash" : "fileHash",
          audioUrl: w.fileUrl,
          artworkUrl: w.coverArtUrl,
          lyrics: w.lyricsText,
          durationSeconds: w.durationSeconds,
          sourceDisclosure: w.aiDisclosure,
          acceptedTerms: s.acceptedTerms,
        })),
      };
    }),
});
