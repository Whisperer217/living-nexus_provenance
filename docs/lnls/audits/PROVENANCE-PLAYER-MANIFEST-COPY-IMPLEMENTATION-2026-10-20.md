# Provenance Player Manifest Copy — Implementation Report

**Date:** 2026-10-20  
**Status:** Development implementation complete and validated; not published  
**Scope:** Owner-authorized named playlists and public canonical albums only.

## What changed

Living Nexus now has two protected, read-only ways to build a `living-nexus-player/1` JSON manifest for manual import into Provenance Player:

- **Organized playlist:** `/playlists` detail, for its owner.
- **Canonical album:** `/album/:collectionWid`, for its public-album creator.

Each owner surface offers **Copy manifest** plus **Download JSON**. Copy sends no request to Provenance Player. The creator pastes the result there using **Add → LN manifest → Paste → Import**. If browser clipboard access is unavailable, the same manifest downloads as JSON.

The controls do not open a new tab, start, pause, or replace Living Nexus audio, change `PlayerContext`, change queues, write registry data, or change WIDs.

## Manifest and authorization model

The JSON contains the actual ordered track list, title, creator, optional album name, safely available artwork, Work ID, WID, a canonical Living Nexus share URL, and current participation disclosure when present. It is built only on the server, from current canonical records.

A list is exported only if **every** included Work is audio; published; public; unflagged; WID-bearing; creator-attributed; explicitly approved and rights-confirmed for external display; not later revoked; free-download permitted; and backed by a clean HTTPS media reference. A canonical album must be public. Duplicate WIDs are rejected. The server fails the entire request generically rather than creating a misleading partial playlist.

The JSON does not expose raw media storage URLs, signed URLs, user sessions, tokens, or private assets. Instead, its audio URL is a new Living Nexus public gateway. The gateway checks current eligibility and WID uniqueness again each time Provenance Player attempts playback. A later publish, permission, revocation, or registry-identity change prevents future gateway requests.

## Affected code paths

- `server/domains/provenancePlayer/manifest.ts` — pure schema, current-declaration mapping, eligibility, limits, and safe field mapping.
- `server/routers/playlists.ts` — `playlists.copyProvenancePlayerManifest` owner procedure.
- `server/routers/songs.ts` — `songs.copyProvenancePlayerAlbumManifest` owner procedure.
- `server/routes/provenancePlayerMediaRoute.ts` — current-eligibility gateway for copied playback URLs.
- `server/utils/db.ts` — bounded ordered source readers and duplicate-WID check.
- `client/src/pages/PlaylistsPage.tsx` and `client/src/pages/AlbumDetailPage.tsx` — owner controls.
- `client/src/lib/provenancePlayerManifest.ts` — browser clipboard/download handling only.

## Validation

| Check | Result |
|---|---|
| TypeScript | `pnpm check` passed |
| Focused manifest tests | 5 files / 28 tests passed |
| Full regression | 137 files / 852 tests passed; 1 intentionally skipped |
| Production build | Passed |
| Diff integrity | Passed |
| Desktop guest playlist route | Rendered normally; owner controls correctly absent |
| Mobile guest playlist route | Rendered normally; unrelated release-note overlay was present |
| Real-record adapter scan | No qualifying list found; no data changed |

The behavioral tests prove server owner checks, non-owner/private rejection, atomic WID-ambiguity rejection, and exact server-provided order. Adapter tests prove no raw `fileUrl` appears in the copied JSON, current disclosure mapping, clean-URL requirements, and strict limits.

## Readiness finding and remaining risk

A read-only scan inspected four saved playlists and fifty collections. None could be exported under the approved external-delegation policy. Across 483 track memberships, the largest blocker was absent external-display consent: 465 had external display disabled, rights unconfirmed, and no recorded external-display authorization. The scan also found deleted/private/non-audio/unsafe-media members.

This is expected behavior from the strict permission boundary, not an implementation failure. It means a creator must first ensure that each Work in the intended playlist or album has its existing external-display authorization configured alongside its public/free-media state.

**Outstanding pre-publication acceptance:** sign in as the owner of one list whose members all satisfy those declarations, copy the manifest, paste it into Provenance Player, verify ordered import and gateway playback, then revoke external display on a test Work and verify a new gateway request is denied. No deployment or publication has occurred.
