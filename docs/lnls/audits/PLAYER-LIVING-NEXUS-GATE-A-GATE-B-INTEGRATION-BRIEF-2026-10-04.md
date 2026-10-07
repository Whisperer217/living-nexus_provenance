# Provenance Player × Living Nexus — Gate A / Gate B Integration Brief

**Status:** Evidence-only integration assessment. No Player integration, deployment, publication, or cross-origin trust change was performed.

**Decision:** Do **not** pass the existing Player a raw Living Nexus `fileUrl`, and do **not** treat its imported metadata as Registry truth. The safe path is a two-gate adapter: first an explicit, revocable creator authorization and playable-Work eligibility decision; then a short-lived, Work-specific playback grant with a verifiable provenance projection.

## What the standalone Provenance Player accepts today

The Player accepts both local audio files and remote direct-audio manifests. A local file is stored in the browser's library and can be played directly. A remote manifest may be an object, an array, or an object with a `tracks` array. It must contain an HTTPS `audioUrl` for each playable track. A Work page URL alone is deliberately rejected as non-playable. [1]

The exact portable manifest keys the Player understands are:

```json
{
  "schema": "living-nexus-player/1",
  "tracks": [
    {
      "audioUrl": "https://media.example/track.mp3",
      "title": "Optional title",
      "creator": "Optional creator",
      "album": "Optional album",
      "artworkUrl": "https://media.example/cover.webp",
      "sourceUrl": "https://www.livingnexus.org/song/123",
      "workId": "123",
      "wid": "WID-MUS-…",
      "aiDisclosure": "Optional creator statement"
    }
  ]
}
```

The implementation recognizes `schema`, `tracks`, and the fields above. It rejects a non-HTTPS URL, URLs with embedded credentials, local/private network targets, and page URLs incorrectly used as an `audioUrl`. It ignores unknown manifest fields rather than preserving them. The portable export itself retains only `audioUrl`, `title`, `creator`, `album`, `artworkUrl`, `sourceUrl`, `workId`, `wid`, and `aiDisclosure`.

**Code evidence:** `/tmp/ln-player-audit/index.html:2557-2684`.

The Player does retain a supplied creator string, Work ID, WID, source URL, artwork URL, and AI-disclosure text in local browser state. That is not verification. The imported-record origin is explicitly stored as `Supplied manifest · not verified`; editing that metadata logs an unverified local edit. The Player also states that it does not issue or verify WIDs. [1]

**Code evidence:** `/tmp/ln-player-audit/index.html:2056`, `2135-2143`, `2650-2684`, `3159-3175`.

The Player has **no `postMessage` listener, no `postMessage` sender, no source-domain allowlist, no trusted-launch protocol, and no Living Nexus API adapter** in the inspected runtime. It cannot currently receive a trusted Work projection from another page without a human importing a file, link, or JSON manifest.

**Code evidence:** static runtime search of `/tmp/ln-player-audit/index.html` found zero `postMessage`, `message` listener, `MessageChannel`, or `BroadcastChannel` calls.

## What Living Nexus already owns

Living Nexus is the source of Work identity and current media references. The `songs` record holds the current `fileUrl`, `fileKey`, `fileHash`, stored-artifact hash, title, creator relationship, WID, cover, disclosure, duration, optional video, and optional harmonic signature. It also separately preserves a superseded audio version's URL, key, hash, prior WID, note, and replacement time in `audioVersions` whenever a creator replaces audio.

**Code evidence:**

- Canonical Work/media fields: `/home/ubuntu/living-nexus/drizzle/schema.ts:482-570`.
- Historical audio versions: `/home/ubuntu/living-nexus/drizzle/schema.ts:1291-1306` and `/home/ubuntu/living-nexus/server/routers/songs.ts:1418-1447`.
- Current Work page queue projection: `/home/ubuntu/living-nexus/client/src/pages/SongDetailPage.tsx:340-380`.
- Global Player track identity shape: `/home/ubuntu/living-nexus/client/src/contexts/PlayerContext.tsx:41-80`.

The web client currently reads `song.fileUrl`, normalizes the URL for browser playback, and sends it to the Living Nexus global Player. That is an in-app playback projection, not an external-Player adapter.

**Code evidence:** `/home/ubuntu/living-nexus/client/src/pages/SongDetailPage.tsx:340-380`; `/home/ubuntu/living-nexus/shared/const.ts:10-24`.

The storage helper returns the storage provider's uploaded URL from `storagePut()`. There is a `storageGet()` helper that requests a download URL, but there is no dedicated signed playback URL issuer for the Provenance Player. Only a G-code upload path requests a presigned **PUT** URL; that is unrelated to audio playback.

**Code evidence:** `/home/ubuntu/living-nexus/server/utils/storage.ts:27-42`, `70-102`; `/home/ubuntu/living-nexus/server/routers/songs.ts:1879-1905`.

Living Nexus does expose an existing public stream path, `/api/v1/stream/:id`, but it currently resolves the Work and redirects the browser to `song.fileUrl`. It is not a Player-specific signed grant, does not bind a request to an approved Player origin, and does not record a Player launch receipt.

**Code evidence:** `/home/ubuntu/living-nexus/server/routes/publicApiRoute.ts:183-195`.

## Current public-eligibility behavior is not one uniform rule

The platform has several public projections with different predicates. This matters because an external Player must adopt one explicit policy rather than inherit a loose or inconsistent path.

| Surface | Current predicate | Consequence for Player integration |
|---|---|---|
| Public discovery (`songs.discover`, Explore index) | `status = Published` **and** `isPublic = true` | This is the appropriate base for a public Player eligibility policy. |
| Creator public-works API | `status = Published`, `isPublic = true`, and non-null WID | This is stronger and appropriate when a verified WID is required. |
| Public Work detail lookup | `isPublic = true`; owner has a separate private fallback | This is insufficient by itself because it does not require `Published`. |
| Existing stream endpoint | Calls the public Work-detail lookup and requires a `fileUrl` | This is insufficient by itself for a governed external-player grant. |
| Download mutation | Requires a `downloadPermission`, authenticated user, and, for tipped downloads, sufficient tips | Download policy is distinct from streaming and must remain distinct. |
| Existing external-display fields | Creator-controlled display record, with context and rights confirmation | The schema explicitly says this is **not media-distribution permission**; it must not be reused as Player playback permission. |

**Code evidence:**

- Discovery predicate: `/home/ubuntu/living-nexus/server/utils/db.ts:498-537`.
- Public detail lookup and owner fallback: `/home/ubuntu/living-nexus/server/utils/db.ts:438-496`.
- Creator public-works predicate: `/home/ubuntu/living-nexus/server/routes/publicApiRoute.ts:526-580`.
- Existing stream redirect: `/home/ubuntu/living-nexus/server/routes/publicApiRoute.ts:183-195`.
- Download controls: `/home/ubuntu/living-nexus/server/routers/songs.ts:1341-1357`.
- External-display semantics: `/home/ubuntu/living-nexus/drizzle/schema.ts:501-508` and `/home/ubuntu/living-nexus/server/routers/songs.ts:1204-1243`.

> **Important:** Current `externalDisplayEnabled` is evidence of creator authorization for approved display surfaces. It is expressly not a media-distribution grant. Current public stream behavior does not consult it. A Player integration must add a separate, explicit playback authorization rather than silently repurposing this field.

## Gate A — eligibility and explicit creator authorization

Gate A answers **whether a particular current audio Work may be made available to this particular Player surface**. It must run server-side before a launch record or playback grant is issued.

### Required eligibility checks

A Work is eligible only when every condition is true at the time Gate A runs:

1. The Work exists and has an audio-capable current rendition (`fileUrl` and a recognized audio media type/rendition record).
2. The Work is public under the stricter canonical policy: `status = Published`, `isPublic = true`, and a non-null WID.
3. The Work has not been deleted, unpublished, or otherwise removed from public playback.
4. The creator has an active, explicit **Provenance Player playback authorization** for the named Player surface and current policy version.
5. The creator has confirmed the rights required for that specific playback authorization.
6. The audio rendition selected is the current rendition, or a separately authorized historical version. The default must never accidentally expose an archived version.
7. The requested Player client matches the approved application identity and origin policy.
8. Any rate, territory, tier, age, or listener restrictions represented by a future policy are satisfied.

The current platform can satisfy parts 1–3 from existing Work records, but it does **not** yet have an audio rendition classifier, a Player-specific authorization, a Player origin policy, or a playback-grant ledger. Therefore Gate A is not implemented today.

### Minimal additive persistence model

Do not overload `externalDisplayEnabled`. Add a purpose-specific relation so authorization can be scoped, revoked, audited, and evolved without changing provenance fields:

```text
workPlaybackAuthorizations
  id
  songId                         -> songs.id
  surface                        -> "provenance-player"
  surfaceVersion                 -> "1"
  authorized                     -> boolean
  rightsConfirmed                -> boolean
  creatorContext                 -> text
  authorizedAt / revokedAt
  policyVersion
  authorizedByUserId             -> users.id
  createdAt / updatedAt
  unique(songId, surface)

workMediaRenditions
  id
  songId                         -> songs.id
  kind                           -> "source" | "playback" | "archive"
  mediaUrl / storageKey
  mimeType
  byteLength
  contentHash
  isCurrent
  createdAt / retiredAt
  sourceVersionId                -> optional audioVersions.id

playerLaunchReceipts
  id
  songId                         -> songs.id
  renditionId                    -> workMediaRenditions.id
  surface                        -> "provenance-player"
  grantIdHash                    -> never the raw grant
  issuedAt / expiresAt / revokedAt
  creatorAuthorizationSnapshotId -> workPlaybackAuthorizations.id
  policyVersion
  requesterClass                 -> "public" | "signed-in" | future scope
  outcome                        -> "issued" | "denied" | "revoked" | "expired"
```

This keeps the following roles separate:

- `songs` remains the canonical Work and WID owner.
- `audioVersions` remains historical evidence.
- `workMediaRenditions` identifies **what bytes are safe to stream**, rather than assuming every `fileUrl` is a safe playback rendition.
- `workPlaybackAuthorizations` records creator consent for one named Player surface.
- `playerLaunchReceipts` is operational evidence only. It does not alter Work authorship, WID, testimony, or provenance.

### Gate A launch result

A successful Gate A decision should return an internal launch descriptor, not a raw storage URL:

```json
{
  "decision": "allow",
  "launchId": "opaque-server-id",
  "expiresAt": "2026-10-04T17:30:00.000Z",
  "surface": "provenance-player",
  "surfaceVersion": "1",
  "work": {
    "workId": "123",
    "wid": "WID-MUS-…",
    "canonicalUrl": "https://www.livingnexus.org/song/123",
    "verifyUrl": "https://www.livingnexus.org/verify/WID-MUS-…",
    "title": "…",
    "creator": {
      "id": 42,
      "handle": "CreatorHandle",
      "displayName": "Creator name"
    },
    "coverArtUrl": "https://…",
    "aiDisclosure": "creator-declared disclosure",
    "currentRendition": {
      "id": "opaque-rendition-id",
      "contentHash": "sha256…",
      "mimeType": "audio/mpeg",
      "versionWid": "WID-MUS-…"
    }
  },
  "grant": {
    "exchangeUrl": "https://www.livingnexus.org/api/player/v1/exchange",
    "oneTimeToken": "opaque-short-lived-token"
  }
}
```

The launch descriptor is created only after the server has evaluated the current Work state. The token must be one-use, short-lived, hashed at rest, and scoped to one launch, one Work, one rendition, and one approved Player surface.

## Gate B — controlled playback and provenance projection

Gate B begins only after a Player client has a valid launch descriptor. It should give the Player exactly enough information to present and play the Work, while preserving Living Nexus as authority.

### Playback delivery requirements

1. The Player exchanges the one-time launch token over HTTPS for a short-lived playback session.
2. The exchange endpoint rechecks Gate A conditions. It denies a revoked, unpublished, deleted, replaced, or otherwise ineligible Work.
3. The returned `playbackUrl` is an opaque, short-lived Living Nexus stream route that checks grant status on every request and supports byte ranges. It must not be a durable raw S3/Forge URL.
4. The Player must not persist that `playbackUrl` in its browser library. It may persist a non-playable local record containing the Work ID, WID, title, source page, and explicit expiration state.
5. The route must return a denial after revocation even if a stale Player tab remains open. Existing buffered audio may finish; that browser behavior should be stated honestly.
6. Playback URLs must never be embedded in public manifests, shared links, screenshots, or long-lived browser storage.
7. Player launch and denial receipts must be auditable without writing to the Work's immutable identity/provenance fields.

The existing Player currently persists imported `audioUrl` values in browser storage. Passing it a query-signed raw URL would therefore be an avoidable leakage and revocation problem. Gate B requires a Player-side session adapter before remote Living Nexus playback can be called safe.

### Provenance projection for the Player UI

The current `living-nexus-player/1` manifest cannot safely carry a complete Registry projection because unknown fields are discarded. Gate B should introduce a versioned, signed projection rather than pretending current imported fields are verified:

```json
{
  "schema": "living-nexus-player/2",
  "projection": {
    "verification": {
      "state": "verified_by_living_nexus",
      "issuedAt": "2026-10-04T17:00:00.000Z",
      "expiresAt": "2026-10-04T17:15:00.000Z",
      "issuer": "https://www.livingnexus.org"
    },
    "work": {
      "id": "123",
      "wid": "WID-MUS-…",
      "title": "…",
      "canonicalUrl": "https://www.livingnexus.org/song/123",
      "verifyUrl": "https://www.livingnexus.org/verify/WID-MUS-…",
      "creator": {
        "id": "42",
        "handle": "CreatorHandle",
        "displayName": "Creator name",
        "profileUrl": "https://www.livingnexus.org/creator/CreatorHandle"
      },
      "provenance": {
        "workWid": "WID-MUS-…",
        "renditionWid": "WID-MUS-…",
        "contentHash": "sha256…",
        "aiDisclosure": "creator-declared disclosure",
        "harmonicSignature": [0.0, 0.0, 0.0]
      },
      "presentation": {
        "artworkUrl": "https://…",
        "album": "…"
      }
    }
  },
  "session": {
    "playbackExchangeUrl": "https://www.livingnexus.org/api/player/v1/exchange",
    "launchToken": "one-time, short-lived opaque token"
  }
}
```

The Player must visibly distinguish these states:

- **Verified by Living Nexus** — received through Gate B and still within a valid session.
- **Source link available** — a normal direct remote link, without Registry verification.
- **Local file** — user-supplied local audio with no Registry claim unless the user later matches it through a separate verification flow.
- **Verification expired** — metadata may remain visible, but playback requires a fresh Gate A/B session.

A WID badge alone must never be enough to show “verified.” The display state must derive from a valid, currently accepted Gate B session or a separately verified public Registry lookup.

### Cross-origin handoff: current answer and safe future answer

There is no current message bridge. The Player can be reached through manual manifest import, but that is a human-import route, not a trustworthy application handoff.

The later Player adapter should use one of these deliberately chosen models:

1. **Recommended: first-party hosted Player** — serve the audited Player build on `player.livingnexus.org` or a controlled first-party route. Use a launch token exchanged with Living Nexus, strict CORS, short sessions, and no raw storage URL persistence.
2. **Temporary compatibility mode: downloaded manifest** — export a non-playable, provenance-only manifest plus an explicit “Open in Player” instruction. This is safe for metadata transport but does not provide one-click streaming.
3. **Cross-origin `postMessage` mode** — only after the Player implements an exact origin allowlist, nonce-bound handshake, source-window verification, timeout, replay protection, and a minimal launch payload. Never use `*` as `targetOrigin`, and never accept an arbitrary parent-page message as authority.

An iframe is not recommended as a shortcut. The existing Living Nexus embed routes permit framing for social embed use, but that does not establish a secure bidirectional trust contract for the standalone Player.

## Concrete Gate A / Gate B test matrix

| Test | Expected result |
|---|---|
| Published, public, WID-bearing audio Work with active Player authorization | Gate A issues a one-time launch descriptor. |
| Same Work after creator revokes Player authorization | New Gate A request and token exchange both deny. |
| Draft, unlisted, soft-deleted, or unpublished Work | Deny. No descriptor and no stream grant. |
| Work has a WID but no audio rendition | Deny playback; provenance page remains available. |
| Work allows external display but lacks Player playback authorization | Deny. External display is not media distribution. |
| Free download disabled, streaming explicitly authorized | Permit stream only if Gate A authorization says so; do not expose a download URL. |
| Tipped or paid download setting | Do not infer playback rights from download restrictions; apply separate Player policy. |
| Audio replacement after grant issue | Current rendition ID changes. Existing grant either expires or is denied at exchange/recheck; old audio is not selected accidentally. |
| Historical audio version requested | Deny unless that exact archived rendition has an explicit authorization and a visible historic-version label. |
| Player receives altered `wid`, creator, or `workId` fields | Render as unverified supplied metadata; never show Registry-verification state. |
| Token replay, wrong origin, expired token, or wrong Work/rendition | Deny and write an appropriate launch-receipt outcome. |
| Creator revokes while Player tab is open | Subsequent range/refresh request is denied. Document that already-buffered audio may finish. |
| Player persists a grant URL | Automated test fails. Only non-playable identity metadata may persist. |

## Ordered implementation plan — no implementation performed

### Gate A implementation slice

1. Write an ADR defining Player playback as a distinct creator authorization from public display and download permission.
2. Add the authorization, rendition, and launch-receipt records through one additive Drizzle migration.
3. Build a focused server `playerIntegration` domain/router. It must resolve a current public audio Work under the strict predicate, check creator authorization, and create an opaque one-time launch descriptor.
4. Add a server-only policy function so API, UI, and grant exchange cannot diverge on eligibility.
5. Add unit and integration tests for public state, creator authorization, revocation, deleted Works, WID-less Works, version changes, and no download-policy leakage.

### Gate B implementation slice

1. Fork or bring the Player source under an explicitly controlled repository before changing its trust model. Its live static build currently has no API adapter or message bridge.
2. Add a `living-nexus-player/2` session adapter that preserves a signed/provenance projection and never persists a playable raw storage URL.
3. Implement launch-token exchange and an auditable, range-capable controlled streaming route.
4. Add exact-origin cross-window handling only if one-click handoff remains required after first-party hosting is decided.
5. Add UI states for verified, source-only, local, denied, expired, and revoked playback.
6. Add browser tests for launch, refresh, revocation, Player reopen, token replay, and direct navigation to a stale URL.

## Explicit non-claims

This assessment does not claim that:

- the standalone Player is integrated with Living Nexus;
- a Player artifact or external URL is current or deployed;
- current storage URLs are short-lived, signed, origin-bound, or revocable;
- the existing stream route is safe as an external Player grant;
- external-display authorization permits media distribution;
- imported WIDs, creator names, or AI disclosures in the existing Player are Registry verified;
- either Gate A or Gate B exists today.

## References

[1]: https://provenanceplayer.netlify.app/ "Living Nexus Provenance Player public runtime inspected 2026-10-04"
