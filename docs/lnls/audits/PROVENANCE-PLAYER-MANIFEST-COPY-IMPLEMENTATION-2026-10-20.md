# Provenance Player Manifest Copy — Implementation Report

**Date:** 2026-10-20  
**Status:** Development implementation complete and validated; not published  
**Scope:** Owner-authorized individual Works, named playlists, and public canonical albums.

## What changed

Living Nexus now has three protected, read-only ways to build a `living-nexus-player/1` JSON manifest for manual import into Provenance Player:

- **Individual Work:** `/song/:id`, for its current creator.
- **Organized playlist:** `/playlists` detail, for its owner.
- **Canonical album:** `/album/:collectionWid`, for its public-album creator.

Each owner surface offers **Copy manifest** plus **Download manifest**. Copy sends no request to Provenance Player. The creator pastes the result there using **Add → LN manifest → Paste → Import**. If browser clipboard access is unavailable, the same manifest downloads as JSON.

The controls do not open a new tab, start, pause, or replace Living Nexus audio, change `PlayerContext`, change queues, write registry data, or change WIDs.

## Manifest and authorization model

The JSON contains the actual ordered track list, title, creator, optional album name, safely available artwork, Work ID, WID, a canonical Living Nexus share URL, and current participation disclosure when present. It is built only on the server, from current canonical records.

A list is exported only if **every** included Work is audio; published; public; unflagged; WID-bearing; creator-attributed; not individually withdrawn from the community-approved companion product; and backed by a clean HTTPS media reference. A canonical album must be public. Duplicate WIDs are rejected. The server fails the entire request generically rather than creating a misleading partial playlist.

The JSON does not expose raw media storage URLs, signed URLs, user sessions, tokens, or private assets. Instead, its audio URL is a new Living Nexus public gateway. The gateway checks current eligibility and WID uniqueness again each time Provenance Player attempts playback. A later unpublish, individual withdrawal, or registry-identity change prevents future gateway requests.

## Affected code paths

- `server/domains/provenancePlayer/manifest.ts` — pure schema, current-declaration mapping, eligibility, limits, and safe field mapping.
- `server/routers/playlists.ts` — `playlists.copyProvenancePlayerManifest` owner procedure.
- `server/routers/songs.ts` — `songs.copyProvenancePlayerWorkManifest` and `songs.copyProvenancePlayerAlbumManifest` owner procedures.
- `server/routes/provenancePlayerMediaRoute.ts` — current-eligibility gateway for copied playback URLs.
- `server/utils/db.ts` — bounded ordered source readers and duplicate-WID check.
- `client/src/pages/SongDetailPage.tsx`, `client/src/pages/PlaylistsPage.tsx`, and `client/src/pages/AlbumDetailPage.tsx` — owner controls.
- `client/src/lib/provenancePlayerManifest.ts` — browser clipboard/download handling only.
- `server/tests/provenancePlayerMediaRoute.test.ts` — direct CORS, revocation, ambiguity, and malformed-ID gateway behavior.

## Validation

| Check | Result |
|---|---|
| TypeScript | `pnpm check` passed |
| Focused manifest tests | 5 files / 32 tests passed |
| Full regression | 145 files / 899 tests passed; 1 intentionally skipped |
| Production build | Passed |
| Diff integrity | Passed |
| Desktop guest playlist route | Rendered normally; owner controls correctly absent |
| Mobile guest playlist route | Rendered normally; unrelated release-note overlay was present |
| Real-record adapter validation | One current public 11-track album produced its canonical 11-item order; every `audioUrl` used the Living Nexus gateway |
| Gateway header validation | One real public Work returned `302`, `Access-Control-Allow-Origin: *`, and `Cache-Control: no-store`; redirect location was not printed |
| Individual Work adapter validation | Canonical Work `60001` produced one safe manifest track with a real WID, canonical share URL, gateway-only audio URL, no raw-media leak, and an owner ID available for server authorization |

The behavioral tests prove server owner checks for an individual Work, non-owner/private rejection, atomic WID-ambiguity rejection, and exact server-provided list order. The direct gateway test proves CORS preflight, `no-store`, eligible redirect, individual-withdrawal denial, identity-ambiguity denial, and malformed-ID rejection. Adapter tests prove no raw `fileUrl` appears in the copied JSON, current disclosure mapping, clean-URL requirements, and strict limits.

## Readiness finding and remaining risk

A read-only scan inspected four saved playlists and fifty collections. Under the now-superseded per-Work consent policy, none could export; the dominant blocker was absent external-display consent. The community-approved product policy removes that initial gate. A subsequent read-only canonical-record validation found a current public 11-track album that now generated an ordered manifest through the revocable gateway. Private, deleted, non-audio, unsafe-media, individually withdrawn, and identity-ambiguous members still block their entire list.

This is expected behavior from the current public-Work and individual-withdrawal boundary, not an implementation failure. Creators do not need to retrofit per-Work external-display declarations or free-download permission solely for this approved companion product.

**Outstanding pre-publication acceptance:** sign in as an owner of a public, published audio list, copy the manifest, paste it into Provenance Player, verify ordered import and gateway playback, then mark a test Work individually withdrawn and verify a new gateway request is denied. No deployment or publication has occurred.
