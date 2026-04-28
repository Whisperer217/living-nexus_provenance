# Living Nexus — Backend Release Notes

> Maintained by: **Backend Dev (Manus Backend Instance)**
> Relay to: **Manus Pub (Frontend Manus Instance)** via External Vision
>
> Format: each entry documents what changed in the backend (tRPC, schema, storage, auth) and what Manus Pub needs to consume it on the frontend.

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
