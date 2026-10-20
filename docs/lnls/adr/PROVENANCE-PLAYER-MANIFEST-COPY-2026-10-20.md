# ADR — Provenance Player Manifest Copy for Playlists and Albums

**Date:** 2026-10-20  
**Status:** Implemented and validated in development — not published  
**Scope:** Owner-authorized named playlists (`/playlists`) and canonical WID albums (`/album/:collectionWid`).

## Context

The Provenance Player accepts pasted `living-nexus-player/1` JSON but has no secure manifest-URL import. The present-day bridge is deliberately simple: a creator copies an authorized, ordered manifest from Living Nexus and pastes it into **Provenance Player → Add → LN manifest**.

## Decision

Living Nexus provides two protected, read-only tRPC projections:

- `playlists.copyProvenancePlayerManifest({ id })` for the named-playlist owner.
- `songs.copyProvenancePlayerAlbumManifest({ collectionWid })` for the public canonical-album creator.

The owner receives **Copy manifest** and **Download JSON** controls. A clipboard failure downloads the same JSON locally. These handlers never open the companion tab, call `PlayerContext`, alter the current queue, or write registry data.

The adapter preserves server-side playlist position and album `trackOrder` exactly. It outputs only the deployed player’s supported fields: `schema`, ordered `tracks`, `title`, creator, optional album, safe artwork, canonical `/share/:wid` source URL, Work ID, WID, current participation disclosure when present, and a Living Nexus media gateway URL.

## Eligibility and media boundary

The Living Nexus creator community has approved Provenance Player as a product-level companion surface. A complete list therefore exports when every member is a current audio Work that is published, public, unflagged, WID-bearing, attributed to a known Creator, not individually withdrawn from the companion, and has a clean HTTPS stored media reference. An album must itself be public. This is not a download entitlement; the manifest still routes playback through the current Living Nexus gateway rather than exposing stored media URLs.

The export fails atomically with generic **Manifest unavailable** when one member is unsafe; it never silently removes a member or tells a non-owner which Work failed. Lists over 500 tracks or two MiB are rejected. Duplicate WIDs are also rejected so a manifest never claims an ambiguous canonical source.

The copied JSON never contains raw `fileUrl`, signed URLs, tokens, cookies, or account data. Its `audioUrl` is `https://www.livingnexus.org/api/provenance-player/media/:workId`. That public gateway rechecks the same eligibility and WID-ambiguity rules on every fetch, responds with `no-store`, and only then redirects to the current stored media object. A later unpublish, individual withdrawal, or identity ambiguity blocks new companion playback requests.

## Boundaries

- No schema change, migration, automatic handoff, manifest URL, URL parameter transfer, account sync, credential, shared queue, or external-player source change.
- No assertion that the external player independently verifies WIDs or registry records; it treats supplied WID and disclosure fields as metadata.
- No private, unpublished, flagged, individually withdrawn, malformed, or identity-ambiguous Work is delegated.
- Opening the existing companion-link action remains separate-tab and leaves Living Nexus playback untouched.

## Validation

- `pnpm check` passed.
- Focused manifest, router, playlist, and album contracts: **5 files / 27 tests passed** after the community-policy amendment.
- Full regression suite: **137 files / 852 tests passed; 1 intentionally skipped**.
- `pnpm build` passed. Existing large-chunk advisories remain unrelated.
- `git diff --check` passed.
- The adapter unit tests prove ordered output, WID/source binding, participation disclosure mapping, clean URL requirements, no raw media URL in JSON, 500-track handling, and atomic rejection.
- Router tests prove owner authorization, non-owner rejection, private/non-owner album rejection, ambiguity rejection, and preserved server-provided order.
- A read-only canonical-record check produced an ordered 11-track public album manifest with every `audioUrl` pointing to the Living Nexus gateway. A local header-only gateway request returned `302`, `Access-Control-Allow-Origin: *`, and `Cache-Control: no-store`; its redirect location was intentionally not logged.

## Real-data readiness finding

A read-only scan of four saved playlists and the first fifty collections found no immediately exportable list under the now-superseded per-Work consent boundary. Across 483 inspected memberships, the dominant blockers were external-display disabled, rights unconfirmed, and missing authorization (465 each), alongside deleted, private, non-audio, and unsafe-media entries. The approved creator-community product policy removes that initial per-Work gate.

A real owner acceptance test now needs only a public, published audio list with valid WIDs, clean media references, and no individual companion-player withdrawals. It remains required before publication, together with a checked individual-withdrawal gateway denial.
