# ADR — Dimensional Surfaces, Voices Identity, and Witnessing Publication Signals

**Status:** Accepted  
**Date:** 2026-10-03

## Context

Three adjacent presentation needs share existing data and should remain bounded:

1. Creator cards and primary navigation actions need a consistent sense of depth without becoming dashboard chrome.
2. **Voices** already reads canonical comments with resolved creator avatar URLs, but the artifact surface currently reduces authors to initials and absolute calendar dates.
3. The Witnessing Circle already reads the canonical `witnessSubscriptions` relationship, while newly published work already enters `creatorPublicationFeed`; the panel does not yet disclose a recent publication signal.

## Decision

### Dimensional grammar

Apply a shared **dimensional card** treatment to creator-card surfaces and a shared **dimensional action** treatment to primary global navigation controls. The treatment is limited to layered borders, restrained inset light, elevation, and keyboard-visible focus. It does **not** introduce new colors, a blanket shadow retrofit, or a new card component system.

### Voices

Render the existing `avatarUrl` returned by `getCommentsBySong()` when available, retaining the initial fallback. Replace absolute dates in the visible conversation stream with a deterministic relative-time label. The database schema, comment persistence, replies, reactions, and moderation semantics remain unchanged.

### Witnessing Circle

Extend the existing authenticated `myWitnessing` projection with the latest **public** `creatorPublicationFeed.publishedAt` value per witnessed creator. The client labels a creator as recently published only when that time is within the last 14 days. This is an informational signal—not a notification, ranking system, or new relationship type.

## Architectural alignment

| Layer | Strengthened by |
|---|---|
| Identity | Creator avatars and clear author presence in Voices |
| Manifestation | Readable, dimensional comment and creator-card surfaces |
| Relationship | Witnessing Circle makes a creator’s recent work visible without inventing a social feed |
| Registry | Signals derive from the canonical publication feed, preserving one source of truth |
| Stewardship | Relative time gives context while preserving original persisted timestamps |
| Legacy | Commentary remains visible around the Work, distinct from immutable testimony |

## Affected surfaces

- `client/src/pages/ExplorePage.tsx`
- `client/src/components/CreatorCard.tsx`
- `client/src/components/StoreCreatorCard.tsx`
- `client/src/pages/ProfilePage.tsx`
- `client/src/components/layout/{TopBar,LeftRail,MainLayout,WitnessingCirclePanel}.tsx`
- `client/src/components/ExperienceColumn.tsx`
- `server/utils/db.ts`
- `client/src/index.css`

## Boundaries and rollback

- **No database migration**: the indicator uses the existing `creatorPublicationFeed` table.
- No comment table change, notification fan-out, or new social graph.
- The UI changes can be removed independently by deleting the shared classes and presentation labels; server projection removal reverts the extra column without affecting stored records.

## Verification

- TypeScript check and focused relationship, creator-card, and Voices contracts.
- Production build and browser inspection of Explore, a Work’s Voices section, and the Witnessing Circle.
- Reduced-motion and focus-visible styling review.
