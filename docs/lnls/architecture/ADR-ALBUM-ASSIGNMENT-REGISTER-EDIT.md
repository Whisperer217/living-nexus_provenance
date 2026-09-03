# ADR — Creator-Controlled Album Assignment at Register and Edit Work

## Status

**Approved by Doc for immediate implementation.**

## Context

Living Nexus has an existing creator-album model: legacy `collections` records are creator-owned, identified by immutable `WID-ALB-*` values, and link an audio Work through `songs.collectionId`. Creator-domain album shelves already project those records. The Music Register and Edit Work surfaces do not currently expose that relationship as an explicit creator choice.

## Decision

Add one optional **Album** selector to Music Register and its two established owner edit surfaces. The selector will use only the creator's existing legacy albums, may be cleared to leave a Work unassigned, and will persist the selected `collectionId` through the existing song upload/metadata authority.

The choice is an editorial organization relationship. It does **not** enter the existing Work-WID payload or signature serialization, create an album, generate/reissue a Work WID or album WID, change publication state, or append a Work provenance event. The existing album's identifier and custody remain unchanged.

## Authority and Visibility

The server must allow only an album where `collections.id` and `collections.creatorId` match the authenticated creator. A missing, foreign, or stale collection ID is rejected. `null` explicitly removes assignment. The client may only request its owner-scoped album list. Cathedral remains a private advisory workspace and receives no collection write authority.

| Boundary | Responsible surface | Rule |
|---|---|---|
| Album choice | Creator in Register or Edit Work | Explicit selection or explicit removal only |
| Ownership validation | `songs` server router | Collection must belong to authenticated creator |
| Persistence | Existing `songs.collectionId` | Reuse current relationship; no new table |
| Registry | Existing Register/Seal procedures | WID payload and signature remain unchanged |
| Provenance | Existing Work event authority | No event from this editorial relationship in this slice |
| Public presentation | Creator-domain album shelf | Existing public visibility filter remains intact |

## Affected Surfaces

`MusicEnvironment`, `PreparedWorkRegistration`, `songs.upload`, `CreativeDrawer`, `EditChapel`, and `songs.updateMetadata` carry the optional field. Existing `collectionStudio.listMine` is reused as the owner-scoped reader. Tests cover ownership rejection, assignment, removal, payload invariance, and untouched WID/provenance behavior.

## Rollback

Revert the scoped source checkpoint. Existing `songs.collectionId` values remain valid. No migration, new album, or new identifier is produced by this change.
