# ADR — Loop Detected Record Review

**Status:** Accepted  
**Date:** 2026-10-02

## Decision

Loop reads embedded audio metadata locally and presents it as a **Detected Record** for creator review before WID sealing. Extracted values prefill only blank registration fields; they never overwrite a value the creator has already supplied. When detected record details are present, the creator must acknowledge that they have reviewed or corrected them before proceeding to seal.

## Canonical mapping

| Embedded evidence | Canonical registration field | Persistence boundary |
|---|---|---|
| Title | `title` | Existing Work title / WID-bound title |
| Album artist, falling back to artist | `officialArtistName` | Existing Work industry-facing artist name; never replaces the Living Nexus creator handle |
| Album | `albumName` | Existing Work album metadata; separate from assigning the Work to an existing Living Nexus Collection |
| Publisher / label | `creditsJson` with role `publisher` | Existing structured Work credits |
| ISRC | `isrc` | Existing Work identifier field |
| Embedded release date | `creatorReleaseDate` | Existing creator-declared original-release chronology field; never a system publication timestamp |

## Non-goals

- No value is written back into the source file.
- No embedded artist name changes creator identity, ownership, or attribution.
- Album metadata does not create or join a Living Nexus Collection automatically.
- These evidence fields do not expand the existing WID-MUS payload.

## Risk control

The UI labels every value as extracted evidence, keeps canonical editable fields visible, requires review before sealing when evidence exists, and preserves the existing WID boundary. No database migration is required because every mapped persistence target already exists.

## Implementation verification

The active `songs.upload` procedure writes through `server/utils/db.ts#createSong`. That helper accepts the mapped `officialArtistName`, `albumName`, `creditsJson`, `isrc`, and `creatorReleaseDate` values and spreads them into the existing `songs` schema insert. The helper contract is typed accordingly so this preservation boundary remains visible to future changes.
