# Living Nexus — Backend Release Notes

> Maintained by: **Backend Dev (Manus Backend Instance)**
> Relay to: **Manus Pub (Frontend Manus Instance)** via External Vision
>
> Format: each entry documents what changed in the backend (tRPC, schema, storage, auth) and what Manus Pub needs to consume it on the frontend.

---

## v2.32.5 — April 29, 2026 (Beat-Reactive Glow Pulse)

### What Shipped

**useFrequencyGlow.ts — Full rewrite**

The frequency glow now pulses with the music instead of linearly tracking raw frequency values.

**Beat detection + peak/decay envelope:**
- Each RAF frame, bass energy is compared against a running `peakRef` value
- When current bass exceeds `peak × 1.15` (BEAT_THRESHOLD), a beat is detected — `peak` snaps up to current bass energy
- Between beats, `peak` decays exponentially at `×0.88` per frame (~60fps → full decay in ~0.5s)
- Mid/high contribute to peak at lower weights (0.4× and 0.15×)
- The `peak` envelope drives all glow spread/opacity values — not raw frequency

**Color shifting:**
- Idle/low energy: deep violet `(138, 43, 226)`
- Bass hit: gold/amber `(196, 154, 40)` — Living Nexus brand color
- Mid-heavy passages: cyan/teal `(56, 189, 248)`
- High-freq transients: white shimmer edge `(255, 255, 255)`
- Colors interpolate smoothly based on relative band energy each frame

**Glow layers:**
- Primary upward pulse (above bar) — 0–56px spread driven by peak
- Secondary mid layer
- High-freq white edge flash on transients
- Inset glow on bar itself (always visible)
- Side glow (left + right edges)
- Subtle downward pulse

**No schema changes. No new procedures.**

### Manus Pub Action Required
- None — change is in `useFrequencyGlow.ts` only. Publish to deploy.

---

## v2.32.4 — April 29, 2026 (Frequency Glow Fix + Audio Pipeline Audit)

### What Shipped

**Frequency Glow Visual Fix (PlayerContext + useFrequencyGlow)**
- Root cause: `Audio` element created without `crossOrigin = "anonymous"` — Web Audio API's `createMediaElementSource()` requires this before any S3 URL is loaded. Without it, the browser CORS-taints the stream and blocks the analyser from reading frequency data.
- Fix 1: `PlayerContext.tsx` — `new Audio()` now sets `crossOrigin = "anonymous"` before any `src` is assigned
- Fix 2: `useFrequencyGlow.ts` — `buildGlowShadow` now radiates in all directions: upward (above bar), inset (on the bar itself, always visible), left/right sides, and a subtle downward pulse. Previously only upward, which was hidden behind page content above the bar.

**Audio Playback Pipeline Audit — Confirmed Correct**
- Pipeline: `song.fileUrl` (DB) → `mapToSongData.fileUrl` → `toTrack(s).audioUrl` → `addAndPlay(track)` → `audio.src = safeAudioUrl(url)` → `audio.play()`
- `safeAudioUrl` correctly re-encodes path segments for filenames with spaces
- Tracks with null `fileUrl` silently skip (play button hidden on those cards — by design)
- Audio playback issues reported by users are likely network/internet related (S3 URLs require stable connection)

### Manus Pub Action Required
- None — all changes are in `PlayerContext.tsx` and `useFrequencyGlow.ts`. Publish to deploy.

---

## v2.32.3 — April 29, 2026 (Keeper Notes Drawer + What's New + LSP Flush)

### What Shipped

**Keeper Notes Drawer (KeeperPage.tsx)**
- `NOTES` button added to Keeper screen top bar (gold pill, BookOpen icon, live count badge)
- Clicking opens a right-side `Sheet` drawer listing all notes saved from the Keeper chat
- Each note card shows: title, persona slug, date, optional tag badge, 3-line content preview, optional image thumbnail
- **Reload button** (↺): copies note content to clipboard and navigates to `/keeper-chat` for immediate re-use
- **Delete button**: calls `trpc.keeper.deleteNote` with optimistic cache invalidation
- Empty state shown when no notes exist yet
- Notes are lazy-loaded (query only fires when drawer is open)

**tRPC procedures used (already existed, no changes):**
- `trpc.keeper.listNotes` — returns `KeeperNote[]` sorted newest-first
- `trpc.keeper.deleteNote` — deletes by ID, scoped to authed user

**What's New modal** — bumped to v2.32.2, reactions fix entry added

**LSP watcher** — stale conflict markers cleared via `touch drizzle/schema.ts`

### Manus Pub Action Required
- None — all changes are in `KeeperPage.tsx` and `WhatsNewModal.tsx`. Publish to deploy.

---

## v2.32.2 — April 28, 2026 (Bugfix: Emoji Reactions Broken — Slimdoggy Report)

### Root Cause
The live `songReactions` table had a column named `emoji` (varchar 10, utf8mb4) with a composite unique index on `(songId, userId, emoji)`. The Drizzle schema expected a column named `type` (varchar 16). Every reaction toggle silently failed — the optimistic update flashed and rolled back with no error toast shown to the user.

### DB Migration Applied (live, already executed)
1. Dropped composite unique index `songReactions_unique` (covered `emoji`)
2. Dropped `emoji` column
3. Added `type` column: `varchar(32)` utf8mb4 (safe ASCII slugs, no charset issues)
4. Added unique index `songReactions_user_song_type_idx` on `(userId, songId, type)`

### Frontend Changes
- `REACTIONS` array replaced with `REACTION_SLUGS`: `["fire", "love", "wow", "clap", "thumbsup", "thumbsdown", "mindblown", "+"]`
- `REACTION_EMOJI` map converts slugs → emoji for display only (never stored in DB)
- Added `onError` toast to `toggleReactionMutation`: users now see "Reaction failed — please try again" instead of silent rollback

### Schema Updated
`drizzle/schema.ts` — `songReactions.type` is now `varchar(32)`, `createdAt` is `bigint` (matches live DB)

### Manus Pub Action Required
- None — reactions now work. Publish the site to push the fix to `livingnexus.org`.

---

## v2.32.1 — April 2026 (Bugfix: Creator Links, Playlist-Add, Share URL Audit)

### Bug Fixes

**StoreCreatorCard — broken creator profile links fixed**
- Was: `/creator/${artistHandle}` (string handle — route expects numeric ID → 404 on all creator cards)
- Now: `/creator/${creator.id}` (numeric ID — always resolves correctly)
- Impact: all creator cards on Home page showcase rows and Explore page now navigate correctly

**StoreTrackCard — context menu added (3-dot button on hover)**
- New `MoreVertical` button appears top-right on card hover
- Menu options: Play Next, Add to List (sub-panel with user's playlists), Go to Song, View Creator, Copy WID Link / Copy Link
- Add to List uses `trpc.playlists.addTrack` — shows all user playlists; creates new list if user has none
- Context menu is a portal (renders in `document.body`) — not clipped by card overflow

**Share URL routing — confirmed working in code**
- `/share/:wid` is handled by Express `shareRouter` before CDN intercept
- Serves full OG/Twitter/Discord meta tags for scrapers
- Browsers are immediately redirected to `/song/:id` via meta refresh + JS redirect
- Root cause of broken share links on deployed site: needs a Publish to pick up latest server changes

**Profile surface — dual-profile clarified (no code change needed)**
- `/profile` = logged-in user's private command center
- `/creator/:id` = canonical public profile for any creator (all tracks, albums, collections, projects)
- `CreatorProfilePage` already shows full track list, albums grouped by collectionTag, and collections
- "Add to My List" context menu option is available to all logged-in users on any creator's profile

### Manus Pub Action Required
- None — all fixes are in shared components. Publish the site to fix the share URL issue on the deployed domain.

---

## v2.32.0 — Phase 69 — April 2026

### What Shipped

**New Components (Frontend — available to Manus Pub)**

| Component | File | Props |
|---|---|---|
| `ShowcaseRow` | `client/src/components/ShowcaseRow.tsx` | `title`, `seeAllHref?`, `children`, `className?` |
| `StoreTrackCard` | `client/src/components/StoreTrackCard.tsx` | `song: SongData`, `size?: 'sm'|'md'|'lg'`, `allSongs?`, `songIndex?` |
| `StoreCreatorCard` | `client/src/components/StoreCreatorCard.tsx` | `creator: CreatorData` |

**SongData shape (StoreTrackCard):**
```ts
{
  id: number, title: string, coverArtUrl: string|null,
  artistName: string, genre: string|null, wid: string|null,
  widShort: string|null, playCount: number|null, fileUrl: string|null,
  duration: number|null, userId: number|null, artistHandle: string|null,
  profilePhotoUrl: string|null, aiDisclosure: string|null,
  contentType: "audio"|"lyrics"|"manuscript"|"comic"
}
```

**CreatorData shape (StoreCreatorCard):**
```ts
{
  id: number, artistHandle: string|null, artistName: string|null,
  profilePhotoUrl: string|null, bannerUrl: string|null,
  bio: string|null, role: string, publishedWorks: number,
  followerCount: number
}
```

**HomePage changes:**
- Hero replaced with `HeroCarousel` (3 slides, 5s auto-rotate, dot pagination, prev/next arrows)
- 4 `ShowcaseRow` sections added below hero: New Arrivals, Trending This Week, Featured Creators, Recently Witnessed
- Data sources: `trpc.songs.newThisWeek`, `trpc.songs.trending`, `trpc.profile.featuredCreators`, `trpc.songs.getWitnessedVoices`

**ExplorePage changes:**
- Hero banner height reduced from 200px → 120px
- Genre icon grid replaced with horizontal pill chips (GENRE_CHIPS constant)
- `viewMode` state added: `"store" | "classic"` (default: `"store"`)
- Store View: `ShowcaseRow + StoreTrackCard` grouped by genre
- Classic View: original creator-grouped pan-rows preserved

**No schema changes. No new tRPC procedures. No DB migration required.**

---

## v2.31.0 — Phase 68 — April 2026

### What Shipped

**Bug Fix: Frequency Glow toggle was silencing audio**

- `useFrequencyGlow` hook rewritten — audio graph stays permanently connected
- Toggle now controls only the RAF visualizer animation loop, not the audio node graph
- `ensureAudioGraph()` is idempotent and handles `InvalidStateError` gracefully

**No schema changes. No new procedures.**

---

## v2.30.0 — Phase 67 — April 2026

### What Shipped

**Schema: 9 new columns on `songs` table**

```sql
ALTER TABLE songs ADD COLUMN headlineCaption VARCHAR(120);
ALTER TABLE songs ADD COLUMN description TEXT;
ALTER TABLE songs ADD COLUMN galleryImagesJson TEXT;       -- JSON array of { url, caption }
ALTER TABLE songs ADD COLUMN playerAssetType VARCHAR(20) DEFAULT 'cover';
ALTER TABLE songs ADD COLUMN aiToolSuno BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN aiToolUdio BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN aiToolSonato BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN aiToolOther BOOLEAN DEFAULT FALSE;
ALTER TABLE songs ADD COLUMN aiToolOtherName VARCHAR(80);
```

**New tRPC inputs on `songs.upload` and `songs.edit`:**
- `headlineCaption: string` (max 120 chars)
- `description: string` (long-form, AI-draftable)
- `galleryImagesJson: string` (JSON array)
- `playerAssetType: "cover" | "visualizer" | "video"`
- `aiToolSuno`, `aiToolUdio`, `aiToolSonato`, `aiToolOther: boolean`
- `aiToolOtherName: string`

**Song detail page:** renders `headlineCaption`, `description`, gallery grid with captions and click-to-expand.

**Manus Pub needs:** Upload form and song detail page to consume these new fields.

---

## v2.29.0 — Phase 66 — April 2026

### What Shipped

**Bug fixes:**
- Artist handle resolution fixed — `artistHandle` field now correctly falls back to `name` across all creator queries
- `profile.getByHandle` now accepts both numeric ID and string handle

**No schema changes.**

---

## v2.28.0 — Phase 65 — April 2026

### What Shipped

**DB Migration: 50 missing tables created in production**

Full schema applied including: `songs`, `users`, `projects`, `playlists`, `playlist_songs`, `creator_follows`, `song_likes`, `song_plays`, `comments`, `tips`, `keeper_skins`, `keeper_chat_history`, `prompt_studio_entries`, `wid_registry`, `featured_creators`, `contributors`

**This was a catch-up migration — all tables now match `drizzle/schema.ts`.**

---

## v2.27.0 — Phase 64 — April 2026

### What Shipped

**UI: Upload page form inputs brightened for mobile legibility**

No backend changes.

---

## v2.26.0 — Phase 63 — April 2026

### What Shipped

**Keeper Archetype Attribute System**

**New schema: `keeper_attributes` table**
```ts
{
  id, userId, archetypeId,
  creativity: int,       // 0-100
  structure: int,
  emotionalDepth: int,
  technicalPrecision: int,
  structuralLogic: int,
  updatedAt: Date
}
```

**New tRPC procedures:**
- `keeper.getAttributes` — returns current attribute scores for the authed user
- `keeper.setAttributes` — sets all 5 attribute scores (protected)

**KeeperAttrsContext** (`client/src/contexts/KeeperAttrsContext.tsx`) — React context that loads attributes and exposes them to all Keeper components.

**Manus Pub needs:** Attribute sliders in the Keeper settings panel consume `trpc.keeper.getAttributes` and `trpc.keeper.setAttributes`.

---

## v2.25.0 — Phase 62 — April 2026

### What Shipped

**Keeper AI — 5 Distinct Personas**

**Updated tRPC procedure: `keeper.chat`**
- Now accepts `persona: "guide" | "conductor" | "witness" | "archivist" | "mirror"` in input
- Each persona has a distinct system prompt injected server-side
- Attribute scores from `keeper_attributes` are injected into the system prompt to modulate behavior

**No schema changes.**

**Manus Pub needs:** Persona selector UI in the Keeper panel. Pass `persona` field in `trpc.keeper.chat.useMutation()` input.

---

## v2.24.0 — Phase 61 — April 2026

### What Shipped

**CreatorSurface page registered at `/creator-surface`**

**New tRPC procedures:**
- `profile.getCreatorSurface` — returns full creator profile + pinned works + projects + recent activity for the authed user's own surface

**No schema changes.**

---

## Stable Data Contracts (Always Current)

### `trpc.songs.discover` input
```ts
{
  genre?: string,
  search?: string,
  limit: number,
  offset: number,
  contentType?: "audio" | "lyrics" | "manuscript" | "comic",
  randomize?: boolean,
  seed?: number,
}
```

### `trpc.songs.trending` input
```ts
{ genre?: string, limit: number, contentType?: string }
```

### `trpc.songs.newThisWeek` input
```ts
{ genre?: string, limit: number, contentType?: string }
```

### `trpc.profile.featuredCreators` input
```ts
{ limit?: number }
```

### `trpc.songs.getWitnessedVoices` input
```ts
{ limit?: number }
```

---

## Known Issues (Not Yet Fixed)

| Issue | Severity | Notes |
|---|---|---|
| `keeper_skins.skinname` DB column mismatch | Low | Schema says `skinName`, DB has `skinname` — causes console errors but does not break core functionality. Pending migration. |

---

*Last updated: April 28, 2026 — v2.32.0*
