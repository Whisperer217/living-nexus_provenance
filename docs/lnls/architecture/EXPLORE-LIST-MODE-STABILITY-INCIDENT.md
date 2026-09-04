# Explore List-Mode Stability Incident

**Date:** 2026-09-04  
**Status:** Under diagnosis — no runtime repair has been applied in this incident record.

## Wound Definition

| Field | Evidence |
|---|---|
| Symptom | React reports `Maximum update depth exceeded`; the supplied error points to a `forceStoreRerender` path in React’s external-store machinery. |
| Expected behavior | An authenticated creator can open `/explore?view=list`, switch among tracks/list/creators views, and retain a responsive Explore surface without recursive state updates. |
| Trigger | The user captured the error on authenticated `/explore?view=list` at `2026-09-04T04:55:39.375Z` America/Chicago. |
| Protected boundaries | No creator identity, Work, WID, provenance, publication, storage, or background-worker behavior is in scope for this repair. |

## Initial Evidence

The supplied trace contains two identical `Maximum update depth exceeded` failures and identifies React external-store re-rendering as the immediate failure mechanism. The earlier Browse Creators repair introduced URL-derived `view` state, but the reported route is the separate list mode. Existing historical Explore fixes must be treated as hypotheses, not reused as explanations without direct evidence.

Source isolation found that the list-only `AllWorksListView` mounts a `WorkListRow` for every available Work. Unlike column rows, it did not provide `prefetchedLiked`, so each row invoked `useLike` with its individual authenticated `songs.getLikeStatus` query enabled. The current source allows up to 700 Explore rows. The fresh request window showed a broad Explore feed request followed by individual `songs.getLikeStatus` activity, while the supplied stack identifies TanStack Query’s `useSyncExternalStore` observer path. This is the confirmed state-failure domain: list-mode observer fan-out rather than creator-directory state, WID, or Work data.

## Diagnostic Rule

No speculative UI, discovery, or data-projection change will be made until the current list-mode trigger is reproduced or a specific unstable subscription, query input, effect, or route synchronization cycle is identified. The minimum repair must stabilize the original list-mode trigger and retain both `/explore?view=list` and `/explore?view=creators` behavior.

## Bounded Treatment

The list view reuses the existing page-level bulk like-status mutation and passes explicit boolean `prefetchedLiked` values to each list row. That preserves the existing like button and optimistic mutation but prevents each row from mounting a separate authenticated status observer. Explore-derived feed arrays are memoized from the existing query result so list queues and bulk-like inputs do not churn on unrelated observer notifications. The temporary `explore-list-static=1` diagnostic has been removed. No server contract, like mutation, Work record, creator directory, or authority rule changes are required.
