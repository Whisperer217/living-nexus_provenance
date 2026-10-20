# Living Nexus — Comment Attribution & Playback Continuity Assessment

**Date:** 2026-10-20  
**Status:** Implemented and development-validated; not published  
**Scope:** Global Player comment composer target identity, canonical Work permission checks, and reply-parent integrity.  
**Out of scope:** Queue behavior, audio engine, WIDs, historical comments, a second comment system, schema migration, and dormant player surfaces unless reactivated.

## Confirmed root cause

The live `GlobalPlayer` derives `currentSongId` from `PlayerContext` on every playback transition. It retains `commentText` across transitions, but its comments query, drawer gate, Work header, and submission mutation all read the *new* `currentSongId`. Thus a draft begun for Work A can be submitted against Work B after automatic advance or manual skip. This is a client state-binding defect, not a queue, cache, or WID defect.

## Confirmed server gaps

`comments.add` and `comments.addReply` accept a caller-supplied numeric `songId` before resolving that Work or checking its availability. `add` writes its `COMMENT` event before the Work lookup. `addReply` does not require the parent comment to exist or belong to the submitted Work. The active route uses `server/utils/db.ts`; `server/db/comments.ts` is a stale duplicate and is not an execution path.

## Small aligned repair

1. Capture the numeric canonical Work ID and a title/creator/art snapshot when the Global Player composer opens.
2. Use that captured target for comments query, panel header, submission, cache refresh, and the `Switch to Current Track` action.
3. Preserve drafts by Work ID when switching explicitly; playback advance must not change the bound target.
4. Server resolves the target Work before any event/comment write, enforces public/published/commentable policy for public Voices, and verifies a reply parent belongs to the same Work.
5. Route-bound `WorkVoices` remains independent of PlayerContext; its target is already the page Work ID.

## Architecture alignment

- **Identity / Relationship:** listener intent remains attached to the chosen Work.
- **Registry:** no WID or provenance declaration change; comments remain separate, attributed interaction records.
- **Stewardship:** invalid, unavailable, cross-Work, and orphan-reply targets fail before side effects.
- **Playback:** PlayerContext remains the sole audio/queue authority; the repair only snapshots identity for a panel.

## Validation plan

- Rendered Global Player interaction: draft on A → advance/skip to B → submit must send A.
- Explicit switch preserves A draft and creates/returns to B’s separate draft.
- Canonical Work Voices remains route-bound while playback changes.
- Server tests reject invalid/private/unavailable target and cross-Work parent before any write.
- Browser check uses a non-submitting draft; live mutation tests use mocked router dependencies.

## Implemented repair

- `GlobalPlayer` now captures an immutable composer target snapshot—numeric Work ID, title, creator, and artwork—when the listener opens comments. Its comment list, title, submit mutation, and cache refresh all use that bound ID rather than the moving PlayerContext ID.
- Drafts are retained per Work. If playback changes, the drawer continues to identify the original Work and presents **Switch to Current Track**. The switch is intentional and does not discard the original draft.
- A failed submission announces that the signal was not posted and keeps its bound draft intact. A successful submission clears only the submitted Work draft.
- The canonical comments router now resolves a public, published, non-removed Work before any list, event, or comment write. Numeric IDs must be positive integers. Reply parents must exist and belong to the submitted Work before a reply is persisted.
- The notification-reply writer uses the same Work policy and canonical creator-handle-first attribution rule. Route-bound `WorkVoices` remains independent from playback state.

## Evidence

An authenticated live diagnostic opened the Global Player composer on **PUSH FORWARD** and showed the expected title and creator. The active player then changed to **Anchor In The Dark** using normal existing playback controls, and reopening the existing composer showed the new active Work. No comment was submitted. The one-item Push Forward queue could not exercise automatic advance; direct source tracing confirms that automatic advance and manual skip share the same changing `currentSongId` path that formerly drove the visible header, query, and mutation.

The isolated local browser rendered the shell with no console exception, but its unauthenticated Work data did not resolve to a playable public record. It therefore did not validate the repaired authenticated composer interactively. This is recorded as an environment limitation, not a product pass.

## Validation results

| Check | Result |
| --- | --- |
| TypeScript | `pnpm check` passed |
| Focused behavior and source contracts | 5 files / 22 tests passed |
| Full regression suite | 134 files passed; 1 intentionally skipped; 831 tests passed |
| Production build | passed; existing bundle-size warnings only |
| Diff integrity | `git diff --check` passed |
| Refinement | measured 70/100 (C), unchanged broad typography/design debt; no scope expansion attempted |

## Remaining risks and follow-up

1. The new authenticated Global Player interaction has not been exercised from the local development build because the isolated browser had no authenticated playable Work. The browser acceptance case must be repeated on a review/staging deployment before publication: write on A, auto-advance or skip to B, submit, and confirm the record appears only on A.
2. The active `server/db/comments.ts` duplicate remains unused and behaviorally incomplete. Do not redirect imports to it; separate its consolidation or removal into a future maintenance task.
3. The current schema has no foreign keys or indexes for `comments.songId`, parent-child comments, reports, or mentions. A migration requires a separate legacy-data audit and is not part of this corrective release.
4. No WID, audio queue, media source, creator permission model, historical comment, or existing registry record was changed. No deployment or publication has occurred.
