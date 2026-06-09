# Phase 193.6 — Comment Attribution Audit

**Date:** 2026-06-09  
**Auditor:** Manus  
**Status:** Investigation Complete — Bugs Identified

---

## Executive Summary

Comment attribution is **partially broken** across multiple surfaces. The root cause is not a single bug but a **cascade of three independent deficiencies** that compound each other. Anonymous display is **not intentional** for authenticated users — it is an accidental outcome of incomplete identity resolution at submission time.

---

## 1. Schema Audit

### `comments` table

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | int PK | No | Auto-increment |
| `songId` | int | No | Foreign key to songs |
| `userId` | int | **Yes** | Optional — allows unauthenticated comments |
| `authorName` | varchar(128) | **Yes** | Snapshot of name at write time |
| `content` | text | No | Comment body |
| `parentId` | int | Yes | null = top-level, set = reply |
| `createdAt` | timestamp | No | Write time |

**Missing fields (compared to audit requirements):**

| Required Field | Present? | Notes |
|---|---|---|
| `userId` | ✅ Yes | Stored when authenticated |
| `creatorId` | ❌ No | Not stored — no FK to the song's creator |
| `displayName` | Partial | `authorName` is a snapshot, not a live-resolved field |
| `avatar` / `avatarUrl` | ❌ No | Not stored at all |
| `timestamp` | ✅ Yes | `createdAt` |

**Assessment:** The schema is a **legacy flat snapshot design**. It stores a name at write time but has no mechanism to resolve the current identity of the commenter. If a user changes their `artistHandle` after commenting, their old comments will still show the old name. There is no `avatarUrl` column, so avatar rendering is impossible without a live join.

---

## 2. Server Procedure Audit

### `comments.add` (line 1927, `server/routers.ts`)

```ts
add: publicProcedure
  .input(z.object({
    songId: z.number(),
    content: z.string().min(1).max(1000),
    authorName: z.string().max(128).optional()   // ← client sends this
  }))
  .mutation(async ({ ctx, input }) => {
    const actorName = input.authorName
      || ctx.user?.artistHandle
      || ctx.user?.name
      || "Anonymous";   // ← fallback chain
    ...
  })
```

**Server-side resolution chain:** `input.authorName` → `ctx.user.artistHandle` → `ctx.user.name` → `"Anonymous"`

The server correctly prefers `artistHandle` over `name` and falls back to `"Anonymous"` only when all three are absent. **The server is correct.** The problem is that `ctx.user` is `null` for unauthenticated requests (because `comments.add` uses `publicProcedure`), and several clients send `user?.name` which may be `null` or the wrong field.

### `comments.addReply` (line 1959)

Same resolution chain. Same issues apply.

### `getCommentsBySong` (line 684, `server/db.ts`)

```ts
const allComments = await db
  .select()
  .from(comments)
  .where(eq(comments.songId, songId))
  .orderBy(comments.createdAt)
  .limit(200);
```

**No join to the `users` table.** The query returns only what was stored in `authorName` at write time. There is **no live identity resolution** — if the stored `authorName` is `null` or `"Anonymous"`, the renderer will always show "Anonymous" regardless of whether the `userId` is present.

---

## 3. Client Submission Audit

This is where the primary bug lives. Different surfaces use different (and inconsistent) `authorName` values:

| Surface | `authorName` sent | Correct? |
|---|---|---|
| `SongDetailPage.tsx` (line 1240) | `user?.artistHandle \|\| user?.name \|\| undefined` | ✅ Correct — prefers handle |
| `MobilePlayerLayer.tsx` (line 630) | `user?.name \|\| undefined` | ⚠️ Partial — skips `artistHandle` |
| `PlayerBar.tsx` (line 230) | `user?.name ?? "Anonymous"` | ❌ Wrong — hardcodes "Anonymous" fallback client-side; skips `artistHandle` |
| `MobilePlayerPanel.tsx` (line 201) | `user?.name ?? "Anonymous"` | ❌ Wrong — same as PlayerBar |
| `TheaterPlayer.tsx` (line 215) | `user?.name ?? "Anonymous"` | ❌ Wrong — same as PlayerBar |
| `BookDetailPage.tsx` (line 845) | `user?.name \|\| undefined` | ⚠️ Partial — skips `artistHandle` |

**Root cause:** `user.name` is the **Manus OAuth platform display name** (synced from the OAuth server at login). It is nullable (`text("name")` with no `.notNull()`). Some users may have a `null` `name` if the OAuth provider did not supply one. When `user?.name` is `null`, the expression `user?.name ?? "Anonymous"` resolves to `"Anonymous"` **on the client**, which is then sent to the server as `authorName: "Anonymous"`. The server stores it as-is.

**The `artistHandle` field** — which is the creator's chosen identity on the platform — is **not used** in PlayerBar, MobilePlayerPanel, or TheaterPlayer.

---

## 4. Renderer Audit

All renderers use `c.authorName || "Anonymous"` as the display fallback:

```tsx
// SongDetailPage.tsx line 1272
<span>{c.authorName || "Anonymous"}</span>

// PlayerBar.tsx line 674
{c.authorName ?? "Anonymous"}

// MobilePlayerPanel.tsx line 1084
{c.authorName ?? "Anonymous"}

// TheaterPlayer.tsx line 703
{c.authorName ?? "Anonymous"}

// BookDetailPage.tsx line 868
{c.authorName || "Anonymous"}
```

**The renderer is not broken.** It correctly displays whatever `authorName` was stored. The problem is upstream — the stored value is wrong.

**Avatar rendering:** No surface attempts to show a profile photo for commenters. The `comments` table has no `avatarUrl` column, and `getCommentsBySong` does not join `users.profilePhotoUrl`. All comment avatars are initials-only.

---

## 5. Database State

From the live database query:

- **Total comments:** 95
- **Comments with null/empty/Anonymous authorName:** 2 (IDs 810001, 810002)
- **Percentage anonymous:** ~2.1%

The two anonymous comments were submitted through a surface that sent `user?.name ?? "Anonymous"` when `user.name` was null. The `userId` column on those rows may still be populated (the user was authenticated), but the `authorName` was written as `"Anonymous"` and cannot be recovered without a join.

---

## 6. Identity Doctrine Alignment

**Platform principle:** *Identity Before Manifestation*

**Current behavior vs. doctrine:**

| Principle | Current State | Verdict |
|---|---|---|
| Creator identity should be primary | `artistHandle` is ignored in 4 of 6 surfaces | ❌ Drifting |
| Anonymous commenting should be opt-in | No opt-in UI exists; anonymity is accidental | ❌ Accidental |
| Comments should reflect creator domain identity | `user.name` (OAuth name) used instead of `artistHandle` | ❌ Wrong field |
| Avatar should reinforce identity | No avatar stored or displayed | ❌ Missing |

---

## 7. Root Cause Summary

**Three independent deficiencies compound to produce "Anonymous" display:**

1. **Wrong field at submission (primary bug):** `PlayerBar`, `MobilePlayerPanel`, and `TheaterPlayer` send `user?.name ?? "Anonymous"` instead of `user?.artistHandle || user?.name || undefined`. When `user.name` is null, "Anonymous" is hardcoded and stored permanently.

2. **No live identity resolution at read time (architectural gap):** `getCommentsBySong` does not join the `users` table. If `authorName` was stored incorrectly, there is no recovery path at render time. The `userId` column exists but is never used to look up the current identity.

3. **Schema missing avatar and creatorId (structural gap):** The `comments` table has no `avatarUrl` or `creatorId` column. Even if the name is correct, no profile photo can be shown without a live join.

---

## 8. Recommended Fixes

### Immediate (no schema change required)

**Fix 1: Standardize `authorName` across all submission surfaces**

Replace `user?.name ?? "Anonymous"` with `user?.artistHandle || user?.name || undefined` in:
- `PlayerBar.tsx` (line 230)
- `MobilePlayerPanel.tsx` (line 201)
- `TheaterPlayer.tsx` (line 215)
- `MobilePlayerLayer.tsx` (line 630)
- `BookDetailPage.tsx` (line 845)

Sending `undefined` (not `"Anonymous"`) lets the server's own resolution chain handle the fallback correctly, including the `ctx.user.artistHandle` path.

**Fix 2: Remove client-side "Anonymous" hardcoding**

The `?? "Anonymous"` pattern on the client should be removed. The server already has a correct fallback chain. The client should send `undefined` when the user has no name, not `"Anonymous"`.

### Medium-term (schema migration required)

**Fix 3: Add `avatarUrl` snapshot to `comments` table**

```ts
avatarUrl: text("avatarUrl"),  // snapshot of profilePhotoUrl at write time
```

Store `user?.profilePhotoUrl || null` at submission time. This allows avatar display without a join.

**Fix 4: Upgrade `getCommentsBySong` to join `users` for live identity**

```ts
.leftJoin(users, eq(comments.userId, users.id))
.select({
  ...comments,
  currentHandle: users.artistHandle,
  currentName: users.name,
  currentAvatarUrl: users.profilePhotoUrl,
})
```

Return `currentHandle || authorName` as the display name. This allows name updates to propagate to old comments.

### Long-term (doctrine alignment)

**Fix 5: Make anonymous commenting an explicit opt-in**

Add an `isAnonymous: boolean` column to `comments`. When `true`, display "Anonymous Listener" or a platform-assigned pseudonym. When `false` (default), always resolve and display creator identity.

**Recommended doctrine position:** Option **B** — *Display creator identity by default*. Anonymous posting should require explicit opt-in and should be logged internally (the `userId` is always stored) for moderation purposes.

---

## 9. Verdict

| Question | Answer |
|---|---|
| Is anonymous commenting intentional? | **No** — it is accidental, caused by wrong field selection |
| Is it the default behavior? | **No** — it only occurs when `user.name` is null and the wrong fallback is used |
| Is user lookup failing? | **Partially** — the server resolves correctly, but 4 clients bypass it |
| Is the fallback "Anonymous" due to missing profile linkage? | **Yes** — `artistHandle` is not used in 4 of 6 surfaces |
| Does this drift from Identity Before Manifestation? | **Yes** — creator identity is not being asserted at comment time |

**Priority:** Fix 1 and Fix 2 are one-line changes per file and should be applied immediately.
