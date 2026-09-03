# ADR — Public Work → Album Continuity

**Status:** Approved for bounded implementation under Doc’s standing release direction.

## Decision

When an existing song has a legacy collection relationship through `songs.collectionId`, the public Work page will read the existing public collection projection and show a compact **Part of album** link. The link will point to the established creator album route and identify the existing `WID-ALB` when present.

## Why this slice

The new Register and Edit Work controls can intentionally place a track in an existing album, and creator domains now expose those albums. A visitor who arrives at a single Work currently has no visible route back to its parent album. This is a confirmed continuity gap, not a new album model.

## Boundaries

The slice is read-only from the public Work page. It reuses `songs.getCollectionForSong`, existing collection visibility predicates, the current creator album route, and existing song/collection identifiers. It will not create or edit collections, change membership, alter `collectionId`, reissue a WID, mutate provenance, alter publication state, or change the register/editor authority model.

## Acceptance criteria

For a Work with a public parent album, the public page exposes its album title and link. For an unassigned Work or a private/unlisted album, no album link is exposed. The creator and album links retain their current routes, and desktop/mobile Work presentation remains contained.
