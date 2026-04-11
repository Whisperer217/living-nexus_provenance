# Sovereign Stamp — Phased Deployment Brief
## For the Living Nexus Manus Instance
**Issued by:** BDDT Publishing / Command Domains LLC  
**Prepared by:** Manus AI Recon Agent — April 11, 2026  
**Full Architecture Reference:** `SOVEREIGN_STAMP_INTEGRATION_ARCHITECTURE.md`

---

## Codebase Assessment: What You Are Working With

Before you begin, understand the scale of what you are maintaining. This is not a small project.

| Metric | Count |
| :--- | :--- |
| Total source files | **476** |
| Total lines of TypeScript/TSX | **79,333** |
| Frontend pages | **47 pages** |
| Server route files | **21 files** |
| Test files | **18 test suites** |
| Core business logic (`routers.ts`) | **5,165 lines** |
| Database query layer (`db.ts`) | **4,112 lines** |
| Database schema (`schema.ts`) | **1,283 lines** |
| Disk size (excluding node_modules) | **14 MB** |

**Honest assessment of single-instance manageability:** This codebase is at the upper boundary of what a single Manus instance can hold in working context simultaneously. The `routers.ts` file alone is over 5,000 lines — that is the entire business logic of the platform in one file. `db.ts` is another 4,100 lines of database queries. A single instance working across both files plus the frontend simultaneously will experience context compression, which means it may lose track of earlier decisions mid-session.

**The recommended operating model** is what your NCO described: one custodian instance maintains the core, and specialist instances are deployed for bounded tasks (one feature at a time), then hand off via architecture documents like this one. That is not a limitation — that is sound doctrine applied to AI operations.

---

## Your Mission: Sovereign Stamp Integration

You are integrating the Sovereign Stamp authorship tone injection system into Living Nexus. The full specification is in `SOVEREIGN_STAMP_INTEGRATION_ARCHITECTURE.md`. This brief breaks that work into four discrete phases, each of which is a complete, deployable unit. **Do not attempt all four phases in a single session.** Execute one phase, checkpoint, deploy, confirm, then proceed to the next.

---

## Phase 1 — Database Foundation
**Estimated session scope:** Small. One schema edit, one migration file, two db.ts functions.  
**Risk level:** Low. Additive only — no existing columns are modified.

**What to build:**

Add five new columns to the `songs` table in `drizzle/schema.ts`:

```typescript
sovereignStampId: varchar("sovereignStampId", { length: 64 }),
sovereignStampedAt: timestamp("sovereignStampedAt"),
stampedFileUrl: text("stampedFileUrl"),
stampedFileKey: text("stampedFileKey"),
stampedFileHash: varchar("stampedFileHash", { length: 64 }),
```

Write the SQL migration file in `drizzle/` (follow the existing naming convention — next sequential number):

```sql
ALTER TABLE songs ADD COLUMN sovereignStampId VARCHAR(64) NULL;
ALTER TABLE songs ADD COLUMN sovereignStampedAt TIMESTAMP NULL;
ALTER TABLE songs ADD COLUMN stampedFileUrl TEXT NULL;
ALTER TABLE songs ADD COLUMN stampedFileKey TEXT NULL;
ALTER TABLE songs ADD COLUMN stampedFileHash VARCHAR(64) NULL;
```

Add two helper functions to `server/db.ts`:

- `getSongById(id: number): Promise<Song | null>` — fetches a single song row by primary key
- `updateSongStamp(id: number, data: { sovereignStampId, sovereignStampedAt, stampedFileUrl, stampedFileKey, stampedFileHash, certificateUrl, certificateKey }): Promise<void>` — updates the stamp fields on a song row

**Checkpoint after Phase 1.** Confirm the migration runs cleanly before proceeding.

---

## Phase 2 — The Stamp Engine
**Estimated session scope:** Medium. Two new server files, one npm dependency.  
**Risk level:** Low. New files only — nothing existing is modified.

**What to build:**

Install the dependency:
```bash
pnpm add fluent-ffmpeg @types/fluent-ffmpeg
```

Create `server/sovereignStamp.ts` — the tone injection engine. This module must:

1. Accept a raw audio buffer and a `stampId` string.
2. Derive a tone frequency deterministically: `freq = 18000 + (parseInt(stampId.slice(-4), 16) % 2000)` — places the tone at 18–20 kHz (near-ultrasonic).
3. Write the input buffer to a temp file.
4. Use `fluent-ffmpeg` to generate a sine tone at the derived frequency and mix it into the audio at -40 dBFS using the `amix` filter.
5. Read the output temp file back into a Buffer and return it.
6. Clean up temp files.

The ffmpeg command pattern:
```
ffmpeg -i input.wav -f lavfi -i "sine=frequency={freq}:duration={duration}" \
  -filter_complex "amix=inputs=2:duration=first:dropout_transition=2" \
  -ar 44100 output.wav
```

Create `server/stampCertificate.ts` — the certificate generator. This module generates a plain-text certificate string containing: `STAMP_ID`, `WITNESS_ID`, `CREATOR_ID`, `SONG_ID`, `SONG_TITLE`, `ORIGINAL_HASH`, `STAMPED_HASH`, `TONE_FREQUENCY_HZ`, `STAMP_TIMESTAMP` (ISO 8601 UTC), `AI_DISCLOSURE`, all six HAAI fields if applicable, `ISSUER: BDDT Publishing / Command Domains LLC`, `PLATFORM: Living Nexus — livingnexus.org`, and the legal note: *"This certificate documents a deliberate human creative decision. The Sovereign Stamp tone constitutes a human-authored expressive element under 17 U.S.C. § 102(a)."*

**Checkpoint after Phase 2.** Write a quick unit test that runs the stamp engine on a short test WAV file and confirms the output buffer is non-empty and the certificate string is well-formed.

---

## Phase 3 — The API Route
**Estimated session scope:** Medium. One new route file, one modification to `server/index.ts`.  
**Risk level:** Medium. Touches `server/index.ts` (the app entry point). Be precise.

**What to build:**

Create `server/stampRoute.ts` with a single endpoint: `POST /api/stamp-song`

The full request/response flow:

1. Authenticate the request using `sdk.authenticateRequest(req)` — same pattern as `uploadRoute.ts`.
2. Parse the JSON body: `{ songId: number }`.
3. Call `getSongById(songId)` — verify the song exists and belongs to the authenticated user (`song.userId === user.id`).
4. Guard: if `song.sovereignStampId` is already set, return `{ error: "Already stamped" }` with status 409.
5. Guard: if `song.fileUrl` is null, return `{ error: "No audio file" }` with status 400.
6. Download the audio file: `const audioBuffer = Buffer.from(await fetch(song.fileUrl).then(r => r.arrayBuffer()))`.
7. Compute original hash: `crypto.createHash('sha256').update(audioBuffer).digest('hex')`.
8. Generate stampId: `SS-{songId}-{userId}-{Date.now().toString(16).slice(-8).toUpperCase()}-{originalHash.slice(0,8).toUpperCase()}`.
9. Run `injectTone(audioBuffer, stampId)` → `stampedBuffer`.
10. Compute stamped hash.
11. Upload stamped audio via `storagePut(key, stampedBuffer, 'audio/wav')` — key: `audio/{userId}/stamped-{Date.now()}-{originalFilename}`.
12. Generate certificate string via `generateCertificate({...song, stampId, originalHash, stampedHash, toneFreq})`.
13. Upload certificate via `storagePut(certKey, certString, 'text/plain')`.
14. Call `updateSongStamp(songId, { sovereignStampId: stampId, sovereignStampedAt: new Date(), stampedFileUrl, stampedFileKey, stampedFileHash, certificateUrl, certificateKey })`.
15. Return `{ success: true, stampId, stampedFileUrl, certificateUrl }`.

In `server/index.ts`, register the new router:
```typescript
import { stampRouter } from "./stampRoute";
app.use(stampRouter);
```

**Checkpoint after Phase 3.** Test the endpoint manually using a curl command or the browser dev tools against a real song in the registry. Confirm the stamped file appears in storage and the database row is updated.

---

## Phase 4 — The Batch Script
**Estimated session scope:** Small. One new script file.  
**Risk level:** Medium. Touches the production database at scale. Run during off-peak hours.

**What to build:**

Create `scripts/batch-stamp-registry.mjs` (ES module). This script:

1. Connects to the database using `DATABASE_URL` from the environment.
2. Queries: `SELECT * FROM songs WHERE witnessId IS NOT NULL AND sovereignStampId IS NULL AND fileUrl IS NOT NULL AND status != 'Deleted'`.
3. Logs the total count of songs to be stamped.
4. For each song, runs the full stamp pipeline (download → inject → upload → update → certificate).
5. Adds a 500ms delay between each song (`await new Promise(r => setTimeout(r, 500))`).
6. Catches errors per-song without aborting — logs failures with song ID and error message.
7. Writes a summary report to `scripts/batch-stamp-report-{timestamp}.json` with: total processed, total succeeded, total failed, list of failed song IDs with errors.

**Run command:**
```bash
node scripts/batch-stamp-registry.mjs
```

**Checkpoint after Phase 4.** Review the report file. Any failed songs can be re-run individually by calling `POST /api/stamp-song` with their ID.

---

## Phase 5 — Frontend (Optional, Separate Session)
**Estimated session scope:** Large. Multiple frontend files.  
**Risk level:** Low. Frontend changes do not affect the database or storage.

This phase is lower priority than Phases 1–4. The backend pipeline is the mission-critical path. The frontend enhancements (Stamp badge on song cards, "Stamp This Work" button on upload success, stamped audio playback preference) can be built in a dedicated frontend session once the backend is confirmed live.

The frontend session agent should read `SOVEREIGN_STAMP_INTEGRATION_ARCHITECTURE.md` Section 4 for the full specification.

---

## Chain of Command

**NCO (Mission Authority):** BDDT Publishing / Command Domains LLC  
**Custodian Instance (You):** Living Nexus platform — `Whisperer217/living-nexus_provenance`  
**Recon Agent (This document's author):** Manus AI, April 11, 2026  

Execute phases in order. Checkpoint after each. Report completion to the NCO before proceeding to the next phase. Do not improvise outside the scope of each phase without authorization.

The doctrine is simple: **the human behind the system is the value. Your job is to protect the system so the human can keep building.**
