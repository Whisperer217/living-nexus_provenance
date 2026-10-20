# Provenance Player Manifest Integration — Research, Tested Contract, and Plan

**Date:** 2026-10-20
**Status:** Research and contract validation complete; the owner-authorized manual manifest bridge was implemented separately on 2026-10-20. This record's former per-Work consent recommendation is superseded by the community-approved companion-product policy.
**Decision requested next:** Review the separately implemented manual bridge; any automatic external-player URL import remains a separate enhancement.

## What is confirmed now

The deployed Provenance Player is a separate, local-first browser application. It accepts `living-nexus-player/1` JSON through its visible **LN manifest** import panel or a local JSON-file/drop workflow. It stores imported track records in that browser's IndexedDB and labels all manifest-derived identity as **“Supplied manifest · not verified.”** It does not currently connect to a Living Nexus account, resolve a WID against the registry, synchronize queues, or accept a manifest URL through a query or hash parameter.[1]

Living Nexus already has a safe single-Work public read: `GET /api/work/:wid`. Its public WID resolver rejects rows that are not both `Published` and `isPublic`, and it returns an ambiguity result rather than arbitrarily selecting one duplicate WID. The live record for `WID-MUS-F61EC526-F2E36FBC` resolved to **PUSH FORWARD**, its canonical public URL, creator identity, cover art, audio URL, and registry record.[2]

The existing general-purpose stream and collection helpers must **not** become the adapter without new guards. `/api/v1/stream/:id` currently relies on a helper that gates `isPublic` but not `Published`. `getCollectionByWid()` has no visibility predicate, while `getSongsByCollectionId()` excludes deleted tracks but does not require public, published audio. The manifest adapter needs its own narrowly named eligibility helpers rather than widening those legacy public routes.

## Tested `living-nexus-player/1` contract

### Confirmed compatible shape

```json
{
  "schema": "living-nexus-player/1",
  "tracks": [
    {
      "title": "Example Track",
      "creator": "@creator-handle",
      "album": "Optional Collection Name",
      "artworkUrl": "https://public.example/artwork.jpg",
      "sourceUrl": "https://www.livingnexus.org/share/WID-MUS-EXAMPLE",
      "audioUrl": "https://public.example/audio.mp3",
      "workId": "12345",
      "wid": "WID-MUS-EXAMPLE",
      "aiDisclosure": "Current participation declaration: Music — Both."
    }
  ]
}
```

The external player requires a nonblank, direct HTTPS `audioUrl` for every playable track. It accepts `title`, `creator`, `album`, `artworkUrl`, `sourceUrl`, `workId`, `wid`, and `aiDisclosure` as optional metadata. It accepts 1–500 tracks and a manifest no larger than 2 MiB. The player does not support a separate `trackNumber`, collection WID, registry hash, signature, license, or permission field. Those facts must therefore not be represented as if the player interprets or verifies them.[1]

`workId` must be serialized as a string because the external player cleans it as text. `sourceUrl` should be the immutable public Living Nexus share URL (`/share/:wid`), not an arbitrary mutable song page. `aiDisclosure` is optional and should contain a brief current effective participation summary only when Living Nexus has a public declaration. It must say that it is a current disclosure, not imply that the external player has verified it against the original WID signature.

### Actual sandbox validation

A manifest built from the current public record for **PUSH FORWARD** was pasted through the deployed player’s visible LN manifest UI. It imported successfully with the correct title, `@DocSMercer`, artwork, Work ID `60001`, WID `WID-MUS-F61EC526-F2E36FBC`, and source link. The external player then played the public stream successfully, reporting a 4:43 duration and no playback error. Its own UI continued to state “Supplied manifest · not verified,” which is correct.

A second manual manifest used four public, published audio Works from public collection `WID-ALB-C993F39D-7C785740`, in their canonical `songs.trackOrder` sequence 0–3: **The Daylight Breakthrough**, **Morning Light Routine**, **Waking Prayer**, then **Logging In**. The external player imported and displayed those four entries in that exact array order. This validates current-session array-order preservation. The player has no album-aware sorter and restores persisted tracks by import time, so Living Nexus must generate the complete ordered array in canonical order.

## Proposed adapter boundary

The adapter would be a read-only projection, not a second registry. It would derive each manifest from the canonical Living Nexus Work, Creator, Collection, WID, public artwork, and authorized media records. It would not create or alter a WID, store a copied media object, issue a registry verification assertion, mutate a queue, or synchronize accounts.

### Proposed public routes

```text
GET /api/provenance-player/v1/works/:wid/manifest
GET /api/provenance-player/v1/collections/:collectionWid/manifest
```

Both routes would return `application/json`, allow only `GET` and `OPTIONS`, and use a single pure adapter that produces the tested schema above. No database migration is required.

A Work is eligible only when all of the following are true:

- It is a canonical audio Work with a nonempty WID and usable media URL.
- Its record is `Published` and `isPublic`.
- It is covered by the Living Nexus creator community’s approval of Provenance Player as an approved product and has not been individually withdrawn from that companion surface.

The companion player can preserve remote media in its own browser. The implemented bridge therefore exposes no storage URL: Living Nexus supplies a revocable gateway and rechecks public Work, individual-withdrawal, and canonical-identity conditions on every media request.

A Collection is eligible only when the collection itself is public and every live member is an eligible public audio Work. The adapter will order tracks by `songs.trackOrder ASC, songs.createdAt ASC`. If any live member is private, unpublished, deleted, lacks required permission, lacks a public WID, or lacks usable media, the collection manifest will return the same unavailable response rather than silently producing a partial album. This protects both creator intent and album identity.

The adapter should emit a generic `404` unavailable result for ineligible public/private objects and should never disclose which private Work blocked a collection export. Community approval does not make private, unpublished, flagged, individually withdrawn, or identity-ambiguous records public; those remain non-delegable.

### Field mapping

`title` comes from `songs.title`, not a substituted filename. `creator` comes from the canonical public `users.artistHandle` and otherwise `users.name`. `album` comes from `collections.name` and is omitted for a single Work without a Collection.

`artworkUrl` comes from `songs.coverArtUrl`, with public collection cover art considered only as a fallback. It is omitted if no public artwork exists because the external player already has a fallback. `sourceUrl` is the canonical `/share/:wid` URL, so the listener can return to the public Living Nexus record.

`audioUrl` is a new eligibility-gated public manifest-stream route; the adapter never exposes a private object URL or access token. `workId` is `String(songs.id)`, an identity reference that is not a WID. `wid` comes from `songs.witnessId` and remains supplied attribution until future independent external verification exists.

`aiDisclosure` is a concise current public participation declaration only when one is available. It is never a fabricated provenance assertion.

## Automatic handoff is not yet implementable safely

The deployed external player has no URL, hash, query, `postMessage`, or server endpoint that imports a manifest automatically. A probe of `?manifest=https://example.invalid/test.json#/player` opened the ordinary empty Player route and did not fetch or import anything. Therefore an LN button cannot currently open the external player with an automatic manifest without changing the external player itself.[1]

The correct later handoff is public-only and retains community approval plus individual-withdrawal safeguards:

1. Living Nexus serves an eligibility-gated manifest at an HTTPS URL with the same community-policy and individual-withdrawal safeguards.
2. The external player adds a query-based manifest loader that accepts only an HTTPS URL, fetches it, shows the Work or Collection title, creator, WID, track count, and a visible **Import** confirmation.
3. The external player validates `schema === "living-nexus-player/1"` with the same field limits it already uses. It continues to label the imported metadata as supplied unless and until it performs an independent Living Nexus WID verification request.
4. The Living Nexus action opens a separate tab. It does not pause or modify `PlayerContext`, the canonical Living Nexus queue, or the active audio element.

The manifest URL must contain no account token, cookie, signed personal URL, or private Work identifier. Private, unpublished, flagged, individually withdrawn, malformed, or identity-ambiguous Works remain unavailable to this handoff. Secure account connection, listener library import, and synchronized playback are separate future projects that require explicit OAuth/consent, short-lived scoped grants, withdrawal behavior, audit trails, and a single-audio-authority design.

## Historical implementation plan and remaining external-player work

### Phase 1A — Read-only manifest adapter (implemented separately)

1. Implemented: a pure manifest builder and its tests map only fields the player consumes and serialize stable ordered arrays.
2. Implemented: a dedicated public-eligibility resolver applies publication, visibility, individual withdrawal, media, WID, and complete-album checks in one place.
3. Implemented as owner-authorized tRPC projections for named playlists and canonical albums, rather than the originally proposed public manifest URLs.
4. Implemented: a dedicated public companion-media gateway rechecks eligibility on each request; it does not reuse `/api/v1/stream/:id`.
5. Implemented: owner-only **Copy manifest** and **Download JSON** controls on the named-playlist and canonical-album pages.

Expected affected files are new manifest domain/route modules, `server/_core/index.ts`, narrowly scoped database helpers, existing Work/Collection presentation surfaces, and focused test files. No schema or migration is planned.

### Phase 1B — External player import enhancement

This is a separate change in the Provenance Player source, not Living Nexus. It must add a manifest-URL import path with explicit confirmation, strict HTTPS validation, size limits, friendly failure states, and a visible non-verification statement. Its UI must not claim registry verification merely because a `wid` field was supplied.

Only after both applications are independently validated should Living Nexus replace the current experimental companion link with an **Open in Provenance Player** action for eligible Works and Collections.

## Required validation after implementation

- One public eligible Work produces a manifest that imports and plays in the external player.
- The returned WID, Work ID, creator identity, title, public share URL, and artwork match Living Nexus’s canonical public Work read.
- A complete public Collection preserves `trackOrder` through import and external next-track playback.
- Missing artwork produces a valid manifest and external fallback artwork.
- A missing optional disclosure does not break import; a present disclosure is displayed only as supplied metadata.
- Draft, private, unlisted, deleted, malformed, individually withdrawn, and identity-ambiguous Works are unavailable.
- A Collection containing any ineligible live member does not yield a partial manifest.
- No manifest or handoff URL contains cookies, credentials, private object URLs, or listener/account identifiers.
- Opening the external player preserves the existing Living Nexus player queue and playback unchanged.
- The new controls are keyboard accessible, have Cathedral visual parity, and remain readable at narrow mobile widths.

## Remaining risks

The current external player can save remote media locally. That makes any delegated direct audio URL effectively distributable. The initial authorization gate must therefore be conservative, and it does not solve all future revocation concerns after an authorized listener has already preserved a copy.

The external player currently imports only from a pasted/file/dropped manifest. Automatic handoff is blocked by that missing capability, not by a missing Living Nexus UI button. The player also treats WID and disclosure as supplied text; it does not yet independently verify them. Those boundaries must remain visible until the external player itself adds verified registry reads.

**References**

[1]: https://provenanceplayer.netlify.app/ "Provenance Player deployed local-first manifest importer"
[2]: https://www.livingnexus.org/api/work/WID-MUS-F61EC526-F2E36FBC "Living Nexus canonical public Work record for PUSH FORWARD"
