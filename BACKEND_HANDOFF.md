# Living Nexus — Backend Handoff Document

> **For:** Manus Pub (Frontend Manus Instance)
> **From:** Backend Dev (Manus Backend Instance)
> **Relay:** External Vision (Project Owner)

---

## Team Structure

| Role | Responsibility |
|---|---|
| **External Vision** | Product direction, final approval, cross-team relay |
| **Backend Dev (me)** | tRPC procedures, Drizzle schema, DB migrations, S3 storage, auth, server logic, GitHub commits, release notes |
| **Manus Pub (you)** | React components, page layouts, UI/UX, Tailwind styling, frontend state, What's New modal |

**Communication chain:** Backend Dev → Release Notes → External Vision → Manus Pub

---

## Repository

- **Primary repo:** `Whisperer217/living-nexus_provenance` (main branch)
- **Engine repo:** `Whisperer217/ln-provenance-engine` (WID protocol, proof envelopes)
- **Project path (sandbox):** `/home/ubuntu/ln-provenance`
- **Dev server:** `https://3000-ilgqvnwgmte2a7y7dst18-a9d3b227.us2.manus.computer`

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind 4 + shadcn/ui |
| API | tRPC 11 (all procedures in `server/routers.ts`) |
| Auth | Manus OAuth — `protectedProcedure` / `adminProcedure` |
| Database | MySQL/TiDB via Drizzle ORM (`drizzle/schema.ts`) |
| Storage | S3 via `server/storage.ts` (`storagePut`, `storageGet`) |
| LLM | `server/_core/llm.ts` → `invokeLLM()` |

---

## Key File Contracts (What Manus Pub Needs to Know)

### tRPC Procedures — `server/routers.ts`

All backend calls go through tRPC. Manus Pub calls them with:
```ts
trpc.<namespace>.<procedure>.useQuery(input)
trpc.<namespace>.<procedure>.useMutation()
```

**Active namespaces:**
- `auth` — `me`, `logout`
- `songs` — `discover`, `trending`, `newThisWeek`, `getWitnessedVoices`, `getBulkLikeStatuses`, `upload`, `edit`, `delete`, `like`, `unlike`, `getById`, `getByCreator`
- `profile` — `getById`, `getByHandle`, `featuredCreators`, `update`, `follow`, `unfollow`
- `projects` — `listPublic`, `getById`, `create`, `update`
- `playlists` — `getMyLists`, `addToList`, `removeFromList`, `create`
- `system` — `notifyOwner`, `getStats`
- `keeper` — `chat`, `getHistory`, `getSkins`, `equipSkin`
- `promptStudio` — `generate`, `share`, `getShared`

### Song Data Shape (`{ song, creator }`)

Most song queries return rows shaped as:
```ts
{
  song: {
    id: number,
    title: string,
    fileUrl: string | null,
    coverArtUrl: string | null,
    genre: string | null,          // comma-separated multi-genre
    witnessId: string | null,      // WID — null if unwitnessed
    contentType: "audio" | "lyrics" | "manuscript" | "comic",
    playCount: number,
    durationSeconds: number | null,
    aiDisclosure: string | null,
    coverPositionX: number,        // 0-100, for object-position
    coverPositionY: number,
    visualReady: boolean,
    autoVideoUrl: string | null,
    headlineCaption: string | null,
    description: string | null,
    galleryImagesJson: string | null,
    createdAt: Date,
  },
  creator: {
    id: number,
    name: string,
    artistHandle: string | null,
    profilePhotoUrl: string | null,
    bannerUrl: string | null,
    role: "founder" | "user" | "admin",
    aiDisclosure: string | null,
  }
}
```

### Creator Data Shape (`profile.featuredCreators`)

```ts
{
  id: number,
  name: string,
  artistHandle: string | null,
  profilePhotoUrl: string | null,
  bannerUrl: string | null,
  bio: string | null,
  role: "founder" | "user" | "admin",
  publishedWorks: number,
  followerCount: number,
  isPinned: boolean,
}
```

---

## Reusable Components I've Built (Available to Manus Pub)

| Component | Path | Purpose |
|---|---|---|
| `ShowcaseRow` | `client/src/components/ShowcaseRow.tsx` | Horizontal scroll shelf with title, See All link, ← → nav arrows, snap scrolling |
| `StoreTrackCard` | `client/src/components/StoreTrackCard.tsx` | Tall MS Store-style track card — cover art, WID badge, play on hover |
| `StoreCreatorCard` | `client/src/components/StoreCreatorCard.tsx` | Creator shelf card — banner, avatar, name, Founder badge |
| `TrackCard` | `client/src/components/TrackCard.tsx` | Classic square track card (pan-row style) |
| `DashboardLayout` | `client/src/components/DashboardLayout.tsx` | Sidebar dashboard wrapper |
| `AIChatBox` | `client/src/components/AIChatBox.tsx` | Full chat UI with streaming |
| `WIDPanel` | `client/src/components/WIDPanel.tsx` | Witness ID display panel |

---

## Data Mapping Helper Pattern

When mapping `{ song, creator }` rows to flat card props, use this pattern (already in `HomePage.tsx` and `ExplorePage.tsx`):

```ts
function mapToSongData(row: { song: any; creator: any }) {
  return {
    id: row.song.id,
    title: row.song.title,
    coverArtUrl: row.song.coverArtUrl ?? null,
    artistName: row.creator?.artistHandle || row.creator?.name || "Unknown",
    genre: row.song.genre ?? null,
    wid: row.song.witnessId ?? null,
    fileUrl: row.song.fileUrl ?? null,
    artistHandle: row.creator?.artistHandle ?? null,
    profilePhotoUrl: row.creator?.profilePhotoUrl ?? null,
    contentType: row.song.contentType ?? "audio",
  };
}
```

---

## Release Notes Protocol

After every backend push, I write a release note entry in `RELEASE_NOTES.md` with:
- Version bump
- What tRPC procedures were added/changed
- What schema columns were added/changed
- What frontend components were added (if any)
- What Manus Pub needs to know to consume the new data

**You (External Vision) relay this to Manus Pub.**

---

## Current Version: v2.32.0

See `RELEASE_NOTES.md` for full history.
