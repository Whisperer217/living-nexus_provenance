import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { getDb, getPool } from "../server/utils/db";
import {
  playerCurationEvents,
  playerEditions,
  playerSubmissions,
  songs,
  users,
} from "../drizzle/schema";

const SYNTHETIC_PREFIX = "LN-STAGING-PLAYER-COLLECTIONS";
const FIXTURE_OPEN_ID = `${SYNTHETIC_PREFIX.toLowerCase()}-creator`;
const FIXTURE_EDITION_TITLE = "Staging Edition · Synthetic Witnesses";
const DISPLAY_TERMS_VERSION = "player-display-v1";
const FIXTURE_WID_NOTE = "Synthetic staging Work; no registry WID is assigned.";

function assertSafeStagingEnvironment(): void {
  if (process.env.NODE_ENV !== "staging") {
    throw new Error("Refusing to seed: NODE_ENV must be staging.");
  }
  if (process.env.LN_STAGING !== "true") {
    throw new Error("Refusing to seed: LN_STAGING=true is required.");
  }
  if (process.env.LN_ALLOW_SYNTHETIC_SEED !== "true") {
    throw new Error(
      "Refusing to seed: LN_ALLOW_SYNTHETIC_SEED=true is required."
    );
  }
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl)
    throw new Error("Refusing to seed: DATABASE_URL is missing.");
  if (/(prod|production|livingnexus\.org)/i.test(databaseUrl)) {
    throw new Error("Refusing to seed: DATABASE_URL looks like production.");
  }
}

const cover = (label: string, accent: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="#0A0806"/><circle cx="400" cy="360" r="240" fill="none" stroke="${accent}" stroke-width="12"/><circle cx="400" cy="360" r="176" fill="none" stroke="${accent}" stroke-opacity=".5" stroke-width="4"/><text x="400" y="690" text-anchor="middle" fill="#E8DFC8" font-family="serif" font-size="42">${label}</text></svg>`)}`;

async function main(): Promise<void> {
  assertSafeStagingEnvironment();
  const db = await getDb();
  if (!db) throw new Error("Unable to initialize the staging database.");

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, FIXTURE_OPEN_ID))
    .limit(1);

  let creatorId = existingUser?.id;
  if (!creatorId) {
    const result = await db.insert(users).values({
      openId: FIXTURE_OPEN_ID,
      name: "Synthetic Staging Creator",
      email: "synthetic-player-collections@staging.invalid",
      loginMethod: "staging-fixture",
      role: "user",
      artistHandle: "@stagingfixture",
      bio: "Synthetic fixture account for isolated Player Collections walkthroughs.",
      hasSeenWelcome: true,
      songSlotsTotal: 20,
      guideSlotsTotal: 20,
    });
    creatorId = Number(result.insertId);
  }

  const [existingEdition] = await db
    .select({ id: playerEditions.id })
    .from(playerEditions)
    .where(eq(playerEditions.title, FIXTURE_EDITION_TITLE))
    .limit(1);

  let editionId = existingEdition?.id;
  if (!editionId) {
    const result = await db.insert(playerEditions).values({
      title: FIXTURE_EDITION_TITLE,
      description:
        "Synthetic staging edition used only to exercise submission, curation, selection, and manifest preview states.",
      targetTracks: 3,
      capacityBytes: 15_000_000,
      status: "open",
      createdBy: creatorId,
    });
    editionId = Number(result.insertId);
  }

  const tracks = [
    {
      title: "Lantern Testimony",
      durationSeconds: 214,
      accent: "#C49A28",
      position: 1,
    },
    {
      title: "The Keeper Returns",
      durationSeconds: 187,
      accent: "#E8B840",
      position: 2,
    },
    {
      title: "A Room for Witnesses",
      durationSeconds: 241,
      accent: "#8B6914",
      position: 3,
    },
  ];

  for (const track of tracks) {
    const sourceHash = `${track.title.toLowerCase().replaceAll(" ", "-")}-synthetic-source-hash`;
    const [existingSong] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(and(eq(songs.userId, creatorId), eq(songs.title, track.title)))
      .limit(1);

    let songId = existingSong?.id;
    if (!songId) {
      const result = await db.insert(songs).values({
        userId: creatorId,
        title: track.title,
        genre: "staging-fixture",
        description: `${FIXTURE_WID_NOTE} ${track.title}`,
        fileUrl: `https://staging.invalid/player-collections/${track.position}.mp3`,
        fileHash: sourceHash,
        storedArtifactHash: sourceHash,
        storageTransformVersion: "staging-fixture-v1",
        coverArtUrl: cover(`TEST ${track.position}`, track.accent),
        durationSeconds: track.durationSeconds,
        status: "Published",
        isPublic: true,
        contentType: "audio",
        visualReady: true,
        visualSource: "none",
        aiDisclosure: "original",
        participationMusic: "Human",
        participationLyrics: "Human",
        participationVoice: "Human",
        downloadPermission: "none",
      });
      songId = Number(result.insertId);
    }

    const [existingSubmission] = await db
      .select({ id: playerSubmissions.id })
      .from(playerSubmissions)
      .where(
        and(
          eq(playerSubmissions.editionId, editionId),
          eq(playerSubmissions.songId, songId)
        )
      )
      .limit(1);

    let submissionId = existingSubmission?.id;
    if (!submissionId) {
      const result = await db.insert(playerSubmissions).values({
        editionId,
        songId,
        creatorId,
        kind: "music",
        audienceNotes:
          "Synthetic public-consent fixture for browser validation.",
        publicConsent: true,
        displayTermsVersion: DISPLAY_TERMS_VERSION,
        status: "selected",
        position: track.position,
        productTerms:
          "Synthetic staging terms: this record is not an offer and is never exported to production.",
        acceptedTerms: "Synthetic staging terms accepted for preview only.",
        acceptedAt: new Date(),
        sourceHash,
      });
      submissionId = Number(result.insertId);
    }

    const [existingEvent] = await db
      .select({ id: playerCurationEvents.id })
      .from(playerCurationEvents)
      .where(
        and(
          eq(playerCurationEvents.submissionId, submissionId),
          eq(playerCurationEvents.action, "selected_for_edition")
        )
      )
      .limit(1);
    if (!existingEvent) {
      await db.insert(playerCurationEvents).values({
        submissionId,
        actorId: creatorId,
        action: "selected_for_edition",
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        synthetic: true,
        creatorId,
        editionId,
        tracks: tracks.length,
      },
      null,
      2
    )
  );
  const pool = await getPool();
  await pool?.end();
}

main().catch(async error => {
  console.error(error instanceof Error ? error.message : error);
  const pool = await getPool();
  await pool?.end();
  process.exitCode = 1;
});
