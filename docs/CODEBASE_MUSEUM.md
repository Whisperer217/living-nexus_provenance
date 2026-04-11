# The Living Nexus Codebase Museum
## Navigation Guide for Custodian and Specialist Instances
**Curated by:** Manus AI Recon Agent — April 11, 2026  
**Authority:** BDDT Publishing / Command Domains LLC

---

## How to Use This Guide

This codebase is **79,333 lines of TypeScript across 476 files**. No single AI instance should attempt to hold all of it in context at once. This document is your map. Before touching any file, find the room it lives in, understand what that room does, and read only what you need for the task at hand.

The museum is organized into **four tiers** — from the deepest foundation to the outermost public face — and **named rooms** within each tier. Every file in the codebase belongs to exactly one room.

---

## Tier 1 — The Foundation Vault
*The bedrock. Touch these files with maximum caution. Changes here ripple through everything above.*

### Room 1A — The Schema Room
**What it is:** The single source of truth for every data structure in the platform.  
**Key files:**
- `drizzle/schema.ts` — **1,283 lines.** Every database table, column, enum, and index. If you want to know what data exists, start here.
- `drizzle/relations.ts` — Foreign key relationships between tables.
- `drizzle/migrations/` — 73 SQL migration files. The history of every schema change ever made. Never edit these — only add new ones.

**Rule:** Never modify an existing column. Only add new columns via a new migration file. The migration history is provenance — it is immutable by doctrine.

---

### Room 1B — The Query Room
**What it is:** Every database read and write operation. The only place that talks directly to MySQL.  
**Key files:**
- `server/db.ts` — **4,112 lines.** Every `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operation on every table. If you need to read or write data, find the function here first before writing a new one.

**Rule:** Do not write raw SQL in `routers.ts` or anywhere outside this file. All database access goes through `db.ts` functions. If the function you need does not exist, add it here.

---

### Room 1C — The Storage Room
**What it is:** The file storage layer. Audio files, cover art, videos, certificates — everything that is not a database row lives here.  
**Key files:**
- `server/storage.ts` — `storagePut()` and `storageGet()`. Two functions. That is the entire storage interface.

**Storage key conventions:**
| Content Type | Key Pattern |
| :--- | :--- |
| Audio files | `audio/{userId}/{timestamp}-{filename}` |
| Cover art | `covers/{userId}/{timestamp}-{filename}` |
| Videos | `videos/{userId}/{timestamp}-{filename}` |
| Certificates | `certificates/{userId}/{timestamp}-{filename}` |
| Stamped audio | `audio/{userId}/stamped-{timestamp}-{filename}` |

**Rule:** Never hardcode storage URLs. Always use `storagePut` to write and `storageGet` to retrieve. The URL structure may change; the key is permanent.

---

## Tier 2 — The Engine Room
*The business logic. This is where the platform's rules live. Most feature work happens here.*

### Room 2A — The Command Center
**What it is:** The entire tRPC API — every procedure the frontend can call. The largest single file in the codebase.  
**Key files:**
- `server/routers.ts` — **5,165 lines.** Every authenticated and public procedure. Organized internally into logical sections (songs, creators, collections, WID, payments, admin, etc.).

**Navigation tip:** When working in this file, use your editor's search to find the procedure name before reading surrounding code. Do not read this file top-to-bottom — navigate by procedure name.

**Rule:** Every new feature that the frontend needs to call gets a new tRPC procedure added here. Keep procedures focused — one procedure does one thing.

---

### Room 2B — The Provenance Engine
**What it is:** The WID system — the cryptographic heart of the platform. The reason Living Nexus exists.  
**Key files (within `routers.ts`):** Search for `verifyWid`, `createSong`, `witnessId`, `WID-MUS`, `WID-TST`, `WID-LYR`, `PROJ-`  
**Key schema fields:** `witnessId`, `certificateUrl`, `ecdsaPublicKey`, `ecdsaSignature`, `harmonicSignature`, `haai*` fields

**WID format reference:**
| Type | Format | Assigned To |
| :--- | :--- | :--- |
| Music | `WID-MUS-XXXXXXXX-XXXXXXXX` | Audio works |
| Lyrics | `WID-LYR-XXXXXXXX-XXXXXXXX` | Lyric sheets |
| Testimony | `WID-TST-XXXXXXXX-XXXXXXXX` | Written testimonies |
| Project/Album | `PROJ-XXXXXXXX-XXXXXXXX` | Collections |

**Rule:** WIDs are immutable once assigned. Never update or overwrite a `witnessId` on an existing row. If a work is re-stamped or updated, the WID stays the same — only the `stampedFileUrl` and related fields change.

---

### Room 2C — The Worker Room
**What it is:** Background processes that run independently of user requests.  
**Key files:**
- `server/paymentIntegrityWorker.ts` — Monitors and reconciles payment events
- `server/selfImprovementWorker.ts` — Platform self-analysis and improvement queue
- `server/visualQueue.ts` — Queue for generating auto-video loops for published works
- `server/sse.ts` — Server-Sent Events for real-time frontend updates

**Rule:** Workers run on a schedule or event trigger. Do not call worker logic directly from `routers.ts` — use the queue pattern.

---

### Room 2D — The Gateway Room
**What it is:** Express routes that handle raw HTTP requests — things that cannot go through tRPC because they involve file streams, binary data, or external webhook formats.  
**Key files:**
- `server/uploadRoute.ts` — `POST /api/upload-file` — streaming multipart file upload relay to Forge storage
- `server/downloadRoute.ts` — File download with auth
- `server/shareRoute.ts` — Public share link handling
- `server/embedRoute.ts` / `server/oembedRoute.ts` — oEmbed and embed player endpoints
- `server/publicApiRoute.ts` — Public API for external integrations
- `server/workRoute.ts` — Work-related HTTP routes
- `server/ogApiRoutes.ts` / `server/og.ts` / `server/ogImageService.ts` — Open Graph meta tag and image generation

**Incoming: Sovereign Stamp gateway** — `server/stampRoute.ts` will live here once built. See `docs/SOVEREIGN_STAMP_PHASED_BRIEF.md`.

---

### Room 2E — The Integration Room
**What it is:** Third-party service integrations.  
**Key files:**
- `server/discord.ts` — Discord webhook notifications
- `server/livingArchiveProducts.ts` — Living Archive subscription product definitions
- `server/_core/oauth.ts` — Manus OAuth authentication
- `server/_core/llm.ts` — LLM integration (caption generation, self-improvement)
- `server/_core/imageGeneration.ts` — AI image generation
- `server/_core/voiceTranscription.ts` — Whisper speech-to-text

---

## Tier 3 — The Gallery
*The frontend. What creators and visitors see and interact with.*

### Room 3A — The Public Halls
**What it is:** Pages visible to all visitors, logged in or not.  
**Key pages:**
- `HomePage.tsx` — The front door
- `ExplorePage.tsx` — Public music discovery
- `DiscoverPage.tsx` — Alternative discovery view
- `CreatorProfilePage.tsx` — Public creator profile (**2,172 lines** — the most complex page)
- `SongDetailPage.tsx` — Individual track page
- `TrackPage.tsx` — Track player view
- `VerifyPage.tsx` — WID verification (the public proof-of-provenance page)
- `WitnessRegistryPage.tsx` — The public registry of all witnessed works
- `MusicWitnessIDPage.tsx` — WID explainer and spec page
- `ManifestoPage.tsx` — The platform manifesto
- `FounderEraPage.tsx` / `FoundersPage.tsx` — Founder registry
- `TrustPage.tsx` — Trust and transparency page
- `TermsPage.tsx` / `PrivacyPage.tsx` — Legal pages

---

### Room 3B — The Creator Studio
**What it is:** Pages only accessible to logged-in creators.  
**Key pages:**
- `DashboardPage.tsx` — Creator home base (**1,866 lines**)
- `UploadPage.tsx` — The upload and registration flow (**1,416 lines**)
- `ProfilePage.tsx` — Creator profile editor (**1,701 lines**)
- `BatchUploadPage.tsx` — Bulk upload tool
- `WitnessFlowPage.tsx` — Guided WID registration flow
- `ProjectPage.tsx` — Album/project management (**2,024 lines**)
- `MyProjectsPage.tsx` — Creator's project list
- `PlaylistPage.tsx` / `PlaylistsPage.tsx` — Playlist management
- `LikedPage.tsx` — Liked works
- `NotificationsPage.tsx` — Notification center
- `LivingArchiveBillingPage.tsx` — Subscription management
- `RedeemPage.tsx` — Redeem codes

---

### Room 3C — The Admin Wing
**What it is:** Admin-only tools. Restricted access.  
**Key pages:**
- `AdminUsersPage.tsx` — User management (**2,034 lines**)
- `ArtworkNormalizationPage.tsx` — Artwork quality control
- `PaymentIntegrityPage.tsx` — Payment audit tools
- `SelfImprovementPage.tsx` — Platform self-analysis dashboard

---

### Room 3D — The Community Commons
**What it is:** Social and community features.  
**Key pages:**
- `GuildPage.tsx` / `GuildsListPage.tsx` — Creator guilds
- `TogetherPage.tsx` — Community collaboration space
- `ContributorsPage.tsx` — Platform contributors
- `FieldNotesPage.tsx` — Field notes / blog
- `LearnPage.tsx` — Learning resources
- `LexiconPage.tsx` — Platform glossary

---

### Room 3E — The Component Workshop
**What it is:** Reusable UI components. Before building anything new in the frontend, check here first.  
**Key components:**
- `WIDPanel.tsx` — The WID display panel (used across multiple pages)
- `HAAIDeclarationForm.tsx` — The HAAI human authorship declaration form
- `AiDisclosurePill.tsx` — The AI disclosure label badge
- `TrackCard.tsx` — Song/track card (used in all listing views)
- `EditTrackPanel.tsx` — Track metadata editor
- `DeclarationModal.tsx` — Declaration confirmation modal
- `TipModal.tsx` / `TipTicker.tsx` — Tipping system UI
- `QRIdentityCard.tsx` — QR code identity card
- `DashboardLayout.tsx` — The authenticated layout wrapper
- `player/MobilePlayerLayer.tsx` — Mobile audio player (**1,879 lines** — the most complex component)

**Player contexts** (in `client/src/contexts/`):
- `PlayerContext.tsx` — Global audio player state
- `AmbientPlayerContext.tsx` — Ambient/background player state

---

## Tier 4 — The Archives
*Support systems, documentation, and one-time scripts.*

### Room 4A — The Script Vault
**What it is:** One-time migration and maintenance scripts. Run on the server, not in the app.  
**Key files:**
- `scripts/apply-events-migration.mjs` — Apply event schema migrations
- `scripts/backfill-events.mjs` — Backfill historical event data
- `scripts/requeue-failed.mjs` — Re-queue failed background jobs

**Incoming:** `scripts/batch-stamp-registry.mjs` — retroactive Sovereign Stamp batch script. See `docs/SOVEREIGN_STAMP_PHASED_BRIEF.md` Phase 4.

---

### Room 4B — The Test Suite
**What it is:** 18 test files covering critical server-side flows.  
**Key test files:**
- `server/trust.layer.test.ts` — Provenance and trust layer tests
- `server/payment.flow.test.ts` — Payment integrity tests
- `server/media.asset.test.ts` — Media asset handling tests
- `server/songs.updateStatus.test.ts` — Song status transition tests
- `server/admin.users.test.ts` — Admin user management tests

**Rule:** Run tests before pushing any change to `routers.ts`, `db.ts`, or `schema.ts`. Do not delete tests. If a test fails after your change, fix the code — not the test.

---

### Room 4C — The Documentation Wing
**What it is:** Architecture documents, build briefs, and platform specifications.  
**Key files:**
- `docs/LAMININ.md` — Platform philosophy and foundation document
- `docs/SOVEREIGN_STAMP_INTEGRATION_ARCHITECTURE.md` — Full Sovereign Stamp build specification
- `docs/SOVEREIGN_STAMP_PHASED_BRIEF.md` — Phased deployment orders for the custodian instance
- `docs/n8n-workflows/` — Automation workflow definitions

**Rule:** Every significant architectural decision gets documented here. This is the institutional memory of the platform. When you complete a phase of work, add a brief note to the relevant document confirming what was built and when.

---

## The Golden Rules

These apply to every instance, every session, without exception:

1. **Read before you write.** Find the room. Read the relevant file. Understand what exists before adding anything new.
2. **One room per session.** Do not try to work across Tier 1 and Tier 3 in the same session. Pick a room, finish the task, checkpoint.
3. **WIDs are immutable.** Never overwrite a `witnessId`. It is the timestamp on the ledger. It does not change.
4. **The schema is the contract.** Every column in `drizzle/schema.ts` is a promise to the data. Add carefully. Never remove.
5. **The docs are provenance.** When you build something, document it in `docs/`. The next instance needs to know you were here and what you did.
6. **Report to the NCO.** BDDT Publishing / Command Domains LLC is the mission authority. Complete your phase, checkpoint, and report before proceeding.

---

*This guide was written by a Manus AI recon agent with direct read access to the repository on April 11, 2026. It reflects the codebase as it existed on that date. Update this document when new rooms are added.*
