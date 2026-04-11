# Sovereign Stamp — API Layer Integration Architecture
## Handoff Document for Manus Build Agent
**Issued by:** BDDT Publishing / Command Domains LLC  
**Prepared by:** Manus AI (Recon Session — April 11, 2026)  
**Classification:** Internal Build Specification  
**Repository Target:** `Whisperer217/living-nexus_provenance`

---

## 1. Mission Brief

This document is a complete build specification for integrating the **Sovereign Stamp** authorship tone injection system into the Living Nexus platform. It is written for a Manus AI build agent who has access to the `living-nexus_provenance` GitHub repository and the deployed Living Nexus environment.

The goal is to add a native server-side tone injection pipeline to Living Nexus so that:

1. Any new audio upload can be automatically stamped with a unique cryptographic authorship tone at the moment of registration.
2. All existing registered works (those with a `witnessId`) can be retroactively stamped via a one-time batch script.
3. The stamped audio file replaces the original in storage, and the creation event is permanently logged in the database and as a downloadable certificate.

---

## 2. Codebase Context (What the Recon Session Found)

The build agent must understand the following before writing a single line of code.

### 2.1 Repository Structure

```
living-nexus_provenance/
├── client/src/           ← React frontend (TypeScript, Vite, Tailwind, shadcn/ui)
├── server/               ← Express + tRPC backend (TypeScript)
│   ├── routers.ts        ← All tRPC procedures (primary business logic file)
│   ├── db.ts             ← All database query functions (Drizzle ORM)
│   ├── storage.ts        ← storagePut() / storageGet() helpers (Forge/S3 proxy)
│   ├── uploadRoute.ts    ← POST /api/upload-file (streaming multipart relay)
│   └── index.ts          ← Express app entry point
├── drizzle/
│   ├── schema.ts         ← Full database schema (MySQL via Drizzle ORM)
│   └── migrations/       ← SQL migration files
├── shared/
│   └── types.ts          ← Re-exports schema types
└── scripts/              ← One-off Node.js scripts (.mjs, ES modules)
```

### 2.2 The `songs` Table — Key Fields

The `songs` table in `drizzle/schema.ts` is the central registry. Every registered work has a row here. The fields relevant to this integration are:

| Field | Type | Purpose |
| :--- | :--- | :--- |
| `id` | `int` (PK) | Internal song ID |
| `userId` | `int` | Creator's user ID |
| `fileUrl` | `text` | CDN URL of the audio file (S3 via Forge proxy) |
| `fileKey` | `text` | Storage key of the audio file |
| `fileHash` | `varchar(64)` | SHA-256 hash of the audio file |
| `witnessId` | `varchar(64)` | The WID (e.g., `WID-MUS-XXXXXXXX-XXXXXXXX`) |
| `certificateUrl` | `text` | URL to the stored provenance certificate |
| `certificateKey` | `text` | Storage key of the certificate |
| `harmonicSignature` | `json` | Numeric fingerprint array of the audio |
| `ecdsaPublicKey` | `text` | ECDSA public key for cryptographic signing |
| `ecdsaSignature` | `text` | ECDSA signature of the file hash |
| `aiDisclosure` | `enum` | `"original"` / `"ai_assisted"` / `"ai_generated"` / `"human_authored_ai_instrument"` |
| `haaiVisualConcept` through `haaiEmotionalTone` | `text` | HAAI declaration fields (human authorship intent) |
| `haaiDeclaredAt` | `timestamp` | When HAAI declaration was completed |
| `contentType` | `enum` | `"audio"` / `"lyrics"` / `"manuscript"` / `"comic"` |
| `status` | `enum` | `"Draft"` / `"Published"` / `"Unlisted"` / `"Deleted"` |

### 2.3 Storage Layer

`server/storage.ts` exposes two functions:

```typescript
storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType?: string): Promise<{ key: string; url: string }>
storageGet(relKey: string): Promise<{ key: string; url: string }>
```

Files are stored in a Forge/S3 proxy. Keys follow the pattern:
- Audio: `audio/{userId}/{timestamp}-{filename}`
- Certificates: `certificates/{userId}/{timestamp}-{filename}`
- Stamped audio: `audio/{userId}/stamped-{timestamp}-{filename}` ← **new convention**

### 2.4 WID Format

WIDs follow the pattern `WID-MUS-XXXXXXXX-XXXXXXXX` where the hex segments are derived from the SHA-256 hash of the audio content. The `verifyWid` tRPC procedure in `routers.ts` handles public WID lookups.

### 2.5 Upload Pipeline

`POST /api/upload-file` in `server/uploadRoute.ts` handles streaming multipart uploads from the browser to Forge storage. It returns `{ url: string, key: string }`. The stamp integration does **not** touch this route — it operates server-side after the file is already stored.

---

## 3. What Needs to Be Built

### 3.1 New Database Column: `sovereignStampId`

A new column must be added to the `songs` table to track whether a work has been stamped and store the Stamp ID.

**Migration to write** (`drizzle/migrations/XXXX_sovereign_stamp.sql`):
```sql
ALTER TABLE songs ADD COLUMN sovereignStampId VARCHAR(64) NULL;
ALTER TABLE songs ADD COLUMN sovereignStampedAt TIMESTAMP NULL;
ALTER TABLE songs ADD COLUMN stampedFileUrl TEXT NULL;
ALTER TABLE songs ADD COLUMN stampedFileKey TEXT NULL;
ALTER TABLE songs ADD COLUMN stampedFileHash VARCHAR(64) NULL;
```

**Schema addition** (`drizzle/schema.ts`, inside the `songs` table definition):
```typescript
sovereignStampId: varchar("sovereignStampId", { length: 64 }),
sovereignStampedAt: timestamp("sovereignStampedAt"),
stampedFileUrl: text("stampedFileUrl"),
stampedFileKey: text("stampedFileKey"),
stampedFileHash: varchar("stampedFileHash", { length: 64 }),
```

### 3.2 The Tone Injection Engine (Server-Side)

Create a new file: `server/sovereignStamp.ts`

This module is the core engine. It must:

1. **Accept** a raw audio buffer (WAV or MP3) and a `stampId` string.
2. **Generate** a unique tone frequency derived from the `stampId` using a deterministic hash function: `freq = 18000 + (parseInt(stampId.slice(-4), 16) % 2000)` — this places the tone in the 18–20 kHz range (near-ultrasonic, present in the signal but not perceptible to most listeners).
3. **Synthesize** the tone as a pure sine wave at the derived frequency, at -40 dBFS amplitude, for the full duration of the track.
4. **Mix** the tone into the audio buffer by summing the tone samples with the original audio samples.
5. **Return** the stamped audio buffer.

**Implementation note:** Use the `node-web-audio-api` npm package or the `audiobuffer-to-wav` + `web-audio-engine` packages for server-side Web Audio API access. Alternatively, use `ffmpeg` (available on the server) via `fluent-ffmpeg` to generate and mix the tone as a subprocess — this is the most reliable approach.

**Recommended ffmpeg approach:**
```typescript
// Generate tone file, then mix with original using ffmpeg amix filter
// ffmpeg -i original.wav -f lavfi -i "sine=frequency=19432:duration=180" -filter_complex amix=inputs=2:duration=first:dropout_transition=2 -ar 44100 stamped.wav
```

### 3.3 The Stamp ID Generator

The Stamp ID must be deterministic, unique, and traceable. Format: `SS-{songId}-{userId}-{timestamp8hex}-{hash8hex}`

```typescript
function generateStampId(songId: number, userId: number, fileHash: string): string {
  const ts = Date.now().toString(16).slice(-8).toUpperCase();
  const hashSeg = fileHash.slice(0, 8).toUpperCase();
  return `SS-${songId}-${userId}-${ts}-${hashSeg}`;
}
```

### 3.4 The Certificate Generator

Create `server/stampCertificate.ts`. This module generates a plain-text `.txt` certificate (or JSON) that documents the creation event. It must include:

- `STAMP_ID`: The Sovereign Stamp ID
- `WITNESS_ID`: The existing WID from the `songs` row
- `CREATOR_ID`: The `userId`
- `SONG_ID`: The `id` from the `songs` table
- `SONG_TITLE`: The `title` field
- `ORIGINAL_HASH`: SHA-256 of the original audio file
- `STAMPED_HASH`: SHA-256 of the stamped audio file
- `TONE_FREQUENCY_HZ`: The derived tone frequency
- `STAMP_TIMESTAMP`: ISO 8601 UTC timestamp
- `AI_DISCLOSURE`: The `aiDisclosure` field value
- `HAAI_DECLARATION`: All six HAAI fields if `aiDisclosure === "human_authored_ai_instrument"`
- `ISSUER`: `BDDT Publishing / Command Domains LLC`
- `PLATFORM`: `Living Nexus — livingnexus.org`
- `LEGAL_NOTE`: `This certificate documents a deliberate human creative decision made at the timestamp above. The Sovereign Stamp tone embedded in this audio file constitutes a human-authored expressive element under 17 U.S.C. § 102(a).`

Upload the certificate to storage at key: `certificates/{userId}/SS-{stampId}.txt`

### 3.5 The Stamp Route

Add a new Express route in a new file: `server/stampRoute.ts`

**Endpoint:** `POST /api/stamp-song`

**Auth:** Requires valid session (same as `uploadRoute.ts` — use `sdk.authenticateRequest`)

**Request body (JSON):**
```json
{ "songId": 123 }
```

**Process:**
1. Authenticate the request.
2. Fetch the song row from the database by `songId`, verify it belongs to the authenticated user.
3. Check that `fileUrl` is not null and `sovereignStampId` is null (not already stamped).
4. Download the audio file from `fileUrl` using `fetch()` into a Buffer.
5. Compute the original file hash (SHA-256).
6. Generate the `stampId` using `generateStampId()`.
7. Run the tone injection engine to produce the stamped audio buffer.
8. Compute the stamped file hash (SHA-256).
9. Upload the stamped audio to storage: key = `audio/{userId}/stamped-{Date.now()}-{originalFilename}`.
10. Generate and upload the certificate.
11. Update the `songs` row with: `stampedFileUrl`, `stampedFileKey`, `stampedFileHash`, `sovereignStampId`, `sovereignStampedAt`.
12. Return `{ success: true, stampId, stampedFileUrl, certificateUrl }`.

**Register this router** in `server/index.ts` alongside `uploadRouter`.

### 3.6 The Batch Script

Create `scripts/batch-stamp-registry.mjs` (ES module, runs with `node scripts/batch-stamp-registry.mjs`).

**What it does:**
1. Connects to the production database using the same `DATABASE_URL` env var.
2. Queries all songs where `witnessId IS NOT NULL AND sovereignStampId IS NULL AND fileUrl IS NOT NULL AND status != 'Deleted'`.
3. For each song, runs the full stamp pipeline (download → inject → upload → update row → generate certificate).
4. Logs progress to console and writes a summary report to `scripts/batch-stamp-report-{timestamp}.json`.
5. Handles errors per-song without aborting the batch — failed songs are logged with their error and skipped.

**Rate limiting:** Add a 500ms delay between each song to avoid overwhelming the storage API.

---

## 4. Frontend Integration

### 4.1 Stamp Status on the Upload Flow

After a creator uploads a song and it is registered with a WID, the upload success UI should show a secondary action: **"Stamp This Work"** — a button that calls `POST /api/stamp-song` with the new `songId`.

This can be added to the existing upload success state in the frontend upload component.

### 4.2 Stamp Badge on Song Cards

Songs with a non-null `sovereignStampId` should display a small **"SS"** badge (Sovereign Stamp) alongside the existing WID badge. Clicking it should show the stamp details and a link to download the certificate.

### 4.3 Stamped Audio Playback

When `stampedFileUrl` is populated, the audio player should default to playing the stamped version. The original `fileUrl` remains in the database as a fallback but is not surfaced to the public.

---

## 5. Environment Variables Required

No new environment variables are needed. The integration uses the existing:

- `DATABASE_URL` — MySQL connection string (already used by Drizzle)
- `BUILT_IN_FORGE_API_URL` — Storage proxy base URL (already used by `storage.ts`)
- `BUILT_IN_FORGE_API_KEY` — Storage proxy auth token (already used by `storage.ts`)

The batch script reads these from the `.env` file in the project root.

---

## 6. npm Dependencies to Add

```bash
pnpm add fluent-ffmpeg @types/fluent-ffmpeg
```

`ffmpeg` binary must be available on the server. On the Manus/deployment environment, install via: `apt-get install -y ffmpeg`.

---

## 7. File Creation Checklist

The build agent must create or modify the following files:

| Action | File | Purpose |
| :--- | :--- | :--- |
| **Create** | `server/sovereignStamp.ts` | Tone injection engine |
| **Create** | `server/stampCertificate.ts` | Certificate generator |
| **Create** | `server/stampRoute.ts` | `POST /api/stamp-song` endpoint |
| **Create** | `scripts/batch-stamp-registry.mjs` | Retroactive batch stamp script |
| **Modify** | `drizzle/schema.ts` | Add 5 new columns to `songs` table |
| **Create** | `drizzle/migrations/XXXX_sovereign_stamp.sql` | SQL migration for new columns |
| **Modify** | `server/index.ts` | Register `stampRouter` |
| **Modify** | `server/db.ts` | Add `getSongById()` and `updateSongStamp()` helper functions |
| **Modify** | Frontend upload success component | Add "Stamp This Work" button |
| **Modify** | Frontend song card component | Add SS badge |

---

## 8. Legal and Doctrine Context

This integration is not a feature addition. It is the technical expression of a legal and philosophical doctrine:

> *"The Copyright Office's standard — 'sufficient expressive elements determined by a human author' — is satisfied by the deliberate act of selecting, claiming, and cryptographically marking a work at a specific moment in time."*

The Sovereign Stamp tone is the human creative decision. The certificate is the proof. The WID is the timestamp. Together they form a three-layer provenance chain:

```
WID (timestamp of registration)
  + Sovereign Stamp (timestamp of human authorship action)
    + HAAI Declaration (documented human intent)
      = Full provenance chain for copyright registration
```

Every song that passes through this pipeline becomes defensible under 17 U.S.C. § 102(a). That is the mission.

---

## 9. Contact and Chain of Command

**Project Owner:** BDDT Publishing / Command Domains LLC  
**Platform:** Living Nexus — [livingnexus.org](https://www.livingnexus.org)  
**Repository:** `Whisperer217/living-nexus_provenance` (private)  
**Doctrine Reference:** *The Logos Field: A New Paradigm for Authentic Authority Validation* (Figshare, December 2025)

---

*This document was prepared by a Manus AI recon session that had direct read access to the `living-nexus_provenance` repository. All file paths, field names, and function signatures cited in this document were verified against the live codebase on April 11, 2026. The build agent should re-read the relevant source files before implementing to account for any changes made after this date.*
