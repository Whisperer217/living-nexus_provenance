# Living Nexus — Queue vs Collection Action Schema
**Version:** 1.0  
**Commit Reference:** `a154a75`  
**Scope:** `GlobalPlayer.tsx`, `PlayerBar.tsx`, `StoreTrackCard.tsx`, `PlayerContext.tsx`, `AddToMyListModal.tsx`

---

## 1. Conceptual Separation

| Concept | Queue | Collection (My List) |
|---|---|---|
| **Purpose** | Control playback order in the current session | Save a track to a named persistent list |
| **Persistence** | Session-only — cleared on page reload | Stored in database per user account |
| **Auth required** | No | Yes (must be signed in) |
| **Storage layer** | In-memory React state (`PlayerContext`) | `playlists` + `playlistItems` tables (DB) |
| **User action label** | **Play Next** | **Add to My List** |
| **Icon** | `SkipForward` (lucide-react) | `ListPlus` (lucide-react) |
| **Trigger function** | `playNext(track: Track)` | Opens `AddToMyListModal` |

---

## 2. Data Contracts

### 2.1 Queue — `playNext(track: Track)`

Defined in `PlayerContext.tsx` line 875. Session-only. No DB write.

```typescript
// PlayerContext.tsx — interface
playNext: (t: Track) => void;

// Implementation behavior:
// Inserts `t` immediately after the currently playing track in state.tracks.
// Does NOT append to end (that is appendToQueue).
// Does NOT persist to localStorage or DB.
// Cleared when the user reloads the page or navigates away.

// Track shape (relevant fields):
interface Track {
  id: string;           // song.id as string
  title: string;
  artist: string;
  audioUrl?: string;
  artUrl?: string;
  witnessId?: string;   // WID — carried with the track through the queue
  creatorHandle?: string;
  creatorId?: number;
  aiDisclosure?: "human" | "ai-assisted" | "ai-generated";
  contentType?: "audio" | "video";
}
```

**Queue action contract:**
```typescript
// Caller pattern — all three components follow this exact pattern:
onClick={() => {
  setShowContextMenu(false);          // close context menu first
  playNext(track);                    // insert after current
  toast.success(`"${track.title}" plays next`, { duration: 2000 });
}}
```

---

### 2.2 Collection — `AddToMyListModal`

Defined in `AddToMyListModal.tsx`. Writes to DB via tRPC.

```typescript
// AddToMyListModal props interface:
interface AddToMyListModalProps {
  open: boolean;
  songId: number;       // integer DB id (not string WID)
  songTitle: string;    // display only — shown in modal header
  onClose: () => void;
}

// Internal tRPC mutations used:
// playlists.create       — creates a new named list
// playlists.addTrack     — adds songId to an existing playlistId
// playlists.getUserLists — fetches user's existing lists for selection

// DB tables written:
// playlists(id, userId, name, createdAt)
// playlistItems(id, playlistId, songId, addedAt)
```

**Multi-list selection behavior:**
- If user has 0 lists → shows "Create New List" form immediately
- If user has 1+ lists → shows list picker; user selects or creates new
- On success → `toast.success("Added to list")` + modal closes after 800ms
- On unauthenticated → modal prompts sign-in

**Collection action contract:**
```typescript
// Caller pattern — open modal via state flag:
const [addToCollectionOpen, setAddToCollectionOpen] = useState(false);

// Trigger (button onClick):
onClick={() => {
  setShowContextMenu(false);
  setAddToCollectionOpen(true);
}}

// Modal mount (at component bottom):
<AddToMyListModal
  open={!!(addToCollectionOpen && currentSongId)}
  songId={currentSongId ?? 0}
  songTitle={visTrack?.title ?? ""}
  onClose={() => setAddToCollectionOpen(false)}
/>
```

---

## 3. Component Responsibility Matrix

| Component | Play Next | Add to My List | Notes |
|---|---|---|---|
| `GlobalPlayer.tsx` | Context menu item (SkipForward) | Toolbar button (ListPlus) + context menu item (ListPlus) | Both wired. Modal mounted at component bottom. |
| `PlayerBar.tsx` | Context menu item (SkipForward) | Toolbar button (ListPlus) + context menu item (ListPlus) | Uses `AddToNamedPlaylistPopover` for the toolbar button; `AddToMyListModal` for context menu. |
| `StoreTrackCard.tsx` | Context menu item (SkipForward) | Context menu item (ListPlus) via `CollectionMenuItem` sub-component | `CollectionMenuItem` owns the modal open/close state. |
| `TrackCard.tsx` | Already correct pre-change | Already correct pre-change | Was not modified — already used `playNext` and `AddToMyListModal`. |

---

## 4. Icon Convention

| Action | Icon | Rationale |
|---|---|---|
| Play Next | `SkipForward` | Communicates "insert before the next track" — directional, forward motion |
| Add to My List | `ListPlus` | Communicates "add to a saved list" — additive, collection-oriented |
| View Queue | `List` | Communicates "view current session queue" — no add/remove implied |
| Append to Queue End | `ListPlus` (internal only) | `appendToQueue` is not exposed as a UI action — internal use only |

> **Rule:** `ListPlus` is reserved exclusively for persistent collection actions. `SkipForward` is reserved exclusively for session queue manipulation. These icons must not be swapped or reused for other purposes.

---

## 5. Deprecated Patterns (Do Not Use)

The following patterns existed before commit `a154a75` and are now retired:

```typescript
// ❌ DEPRECATED — "Add to Queue" label
<button>Add to Queue</button>

// ❌ DEPRECATED — appendToQueue as a UI-exposed action
appendToQueue(track);  // still exists in PlayerContext but is NOT a user-facing button

// ❌ DEPRECATED — "Add to Collection" label
<button>Add to Collection</button>

// ❌ DEPRECATED — AddToCollectionModal in player components
import { AddToCollectionModal } from "@/components/AddToCollectionModal";
// Use AddToMyListModal instead in all player and card contexts

// ❌ DEPRECATED — FolderPlus icon on collection buttons
<FolderPlus />  // replaced by ListPlus for all Add to My List actions
```

---

## 6. Verification Checklist

Run this grep after any future changes to confirm no regressions:

```bash
# Should return zero results in player/card components:
grep -rn "Add to Queue\|Add to Collection\|\"Add to List\"" \
  client/src/components/player/ \
  client/src/components/StoreTrackCard.tsx \
  client/src/components/TrackCard.tsx

# Should return zero results (FolderPlus on collection buttons):
grep -n "FolderPlus" \
  client/src/components/player/GlobalPlayer.tsx \
  client/src/components/player/PlayerBar.tsx \
  client/src/components/StoreTrackCard.tsx

# Should return zero results (AddToCollectionModal in player/card files):
grep -rn "AddToCollectionModal" \
  client/src/components/player/ \
  client/src/components/StoreTrackCard.tsx
```

Expected clean state: all three commands return no output.

---

## 7. Future Extension Points

**Adding a new component that needs queue/collection actions:**

1. Import `usePlayer` and destructure `playNext`
2. Import `AddToMyListModal` and add `const [listOpen, setListOpen] = useState(false)`
3. Use `SkipForward` icon + `playNext(track)` for the queue action
4. Use `ListPlus` icon + `setListOpen(true)` for the collection action
5. Mount `<AddToMyListModal open={listOpen} songId={...} songTitle={...} onClose={() => setListOpen(false)} />` at component bottom
6. Never use `appendToQueue` as a direct UI action — it appends to end of queue and is reserved for programmatic use (e.g., loading a full album)

**Adding a new list type (e.g., "Favorites", "Witnessed Works"):**

Extend `AddToMyListModal` to accept a `listType?: string` prop. The modal's `playlists.getUserLists` query can filter by type. No changes needed to caller components.
