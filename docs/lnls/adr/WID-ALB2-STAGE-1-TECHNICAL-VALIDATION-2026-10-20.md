# ADR — WID-ALB2 and Stage 1 Collections: Technical Validation, Migration, and Rollback Plan

**Date:** 2026-10-20  
**Status:** Technical design validated; implementation, migration, deployment, and publication remain unapproved  
**Decisions incorporated:**

1. Future sealed album editions use **`WID-ALB2`**. Legacy `WID-ALB` semantics remain unchanged.
2. Draft Releases are permanently private and owner-authorized until an explicit publication transition.
3. Named Playlists preserve repeated Work occurrences. WID-ALB2 v1 editions require **unique Work membership within an edition**.
4. Draft editing and edition sealing are owner-controlled in v1. Existing Work attribution and relationships are preserved; playlist collaborators gain no edition authority.
5. Stage 0 collection integrity, current Work WIDs/media/HAAI disclosures, Global Player authority, and approved Provenance Player interoperability remain non-negotiable.

> **Scope:** This document is a design and validation package only. It does not authorize source changes, schema changes, data backfills, migrations, deployment, publication, or WID issuance.

---

## 1. Technical conclusion

Stage 1 is viable only as an **additive release-family / private-draft / immutable-edition domain**. It must not repurpose any of these legacy records:

- `collections`, `collections.collectionWid`, or `collections.collectiveHash`;
- `songs.collectionId` or `songs.trackOrder`;
- `playlists` / `playlistTracks`;
- `userCollections` / `userCollectionTracks`; or
- `manifestedCollections` / `collectionTracks`.

The six-table conceptual model in the prior Stage 1 design is not sufficient for the approved immutability promise. Technical validation adds separate draft-revision, availability, publication-event, and resource-binding layers. The creator sees one simple workspace; the registry receives enough immutable evidence to preserve it honestly.

### What remains unchanged

| Existing object | Preserved meaning |
|---|---|
| Legacy `WID-ALB` | SHA-256 of sorted member Work WIDs joined by `|`; proves historical membership multiset only—not ordering, title, cover, HAAI, media revision, or availability. |
| Legacy WID-ALB collection | Stage 0 prevents membership changes, fails closed at trust-bearing boundaries, and preserves presentation maintenance. It is never auto-converted. |
| Canonical Work (`songs`) | Owns Work identity, media, current HAAI declaration, creator relationship, and Work history. Grouping does not create or modify a Work. |
| Named playlist | Mutable listening path. Duplicate Work appearances remain valid because each `playlistTracks` row has its own membership identity. |
| Global Player | One root `PlayerProvider` and one audio authority. Collections navigation, saves, sealing, copying manifests, and companion launch do not change playback. |
| Provenance Player bridge | Manual owner copy/download only, all-or-nothing eligibility, revocable Living Nexus media gateway, no raw media URLs, no account sync, no shared queue. |

---

## 2. Normative WID-ALB2 v1 identity specification

### 2.1 Scope and lifecycle

A WID-ALB2 is one immutable **audio album edition**. It is not a mutable collection, a playlist, a generic curation object, or a replacement Work WID.

```text
Owner-private Draft Release
        │
        │ explicit review, signature, and Seal command
        ▼
Immutable Sealed Edition — WID-ALB2
        │
        ├── public/unlisted availability may be recorded append-only
        ├── manifest export only when currently eligible
        └── changed membership/order/snapshot → new Draft → new WID-ALB2
```

A Draft has no WID-ALB2, certificate, public route, public manifest, public registry result, or public media authority. A Sealed Edition can never be reopened. Any membership, sequence, bound Work snapshot, or bound presentation correction creates a new Draft and a distinct edition.

### 2.2 Canonical manifest schema

The canonical payload is a **closed schema**. No extra field is permitted at sealing or verification time.

```json
{
  "schema": "living-nexus:wid-alb2-manifest:1",
  "hash_algorithm": "sha-256",
  "canonicalization": "rfc8785-jcs-1",
  "release": {
    "family_id": "arf_<opaque-stable-id>",
    "edition_number": 1,
    "supersedes_edition_wid": null,
    "owner_creator_id": "123",
    "title": "Album title at seal",
    "description": null,
    "cover": null
  },
  "membership": {
    "schema": "living-nexus:wid-alb2-membership:1",
    "member_count": 2,
    "uniqueness": "work-wid-once-v1",
    "membership_sha256": "<64-lowercase-hex>"
  },
  "members": [
    {
      "position": 1,
      "work_wid": "WID-MUS-...",
      "wid_content_sha256": "<64-lowercase-hex>",
      "media": {
        "source_file_sha256": "<64-lowercase-hex>",
        "stored_artifact_sha256": "<64-lowercase-hex>"
      },
      "work": {
        "title": "Work title at seal",
        "creator": {
          "creator_id": "123",
          "display_name": "Creator name at seal",
          "handle": null
        },
        "credits": [
          { "role": "producer", "name": "Name at seal" }
        ],
        "haai": {
          "ai_disclosure": "original",
          "participation": {
            "music": "Human",
            "lyrics": "Human",
            "voice": "Human"
          },
          "declaration": {
            "visual_concept": null,
            "style_language": null,
            "instrumentation": null,
            "vocal_conveyance": null,
            "lyrical_inspiration": null,
            "emotional_tone": null,
            "origin_story": null
          }
        }
      }
    }
  ]
}
```

#### Required manifest rules

- v1 members are creator-owned, eligible audio Works with non-empty normalized Work WIDs.
- A normalized Work WID appears **once only** in a v1 edition.
- `position` is exactly the contiguous sequence `1..member_count`; track order is identity-bearing in WID-ALB2, unlike legacy WID-ALB.
- Numeric identity values use decimal strings. This avoids cross-runtime JSON number ambiguity.
- `supersedes_edition_wid` is JSON `null` for the first edition and the prior same-family WID-ALB2 for later editions.
- `cover` is either JSON `null` or `{ "sha256": "…", "media_type": "…" }`. Storage URLs, CDN URLs, and focal coordinates are not identity fields.
- Every bound hash is lowercase SHA-256 hex. A Work without a required hash is not seal-ready; the system must show a readiness failure rather than manufacture a weaker claim.
- Credits retain declared order and are normalized into `{role,name}` objects. Raw JSON strings or malformed credit payloads are rejected.
- Current HAAI disclosure, participation axes, and declaration fields are snapshotted at seal. A later Work correction does not modify a historic edition snapshot.

#### Forbidden fields

The canonical manifest must never include database IDs (`draftId`, `editionId`, `songId`), request/idempotency keys, timestamps, mutable URLs/storage keys, signed URLs/tokens, publication status, listener counts, certificates, event IDs, signatures, public keys, cache values, download state, raw `creditsJson`, or unknown fields.

### 2.3 Normalization and byte serialization

Before serialization:

1. Normalize all user text to Unicode NFC.
2. Normalize CRLF/CR to LF; reject NUL and other control characters except tab/LF.
3. Trim outer whitespace for title, handle, role, and name; preserve internal prose whitespace after line-ending normalization.
4. Normalize a handle with no leading `@`, or emit JSON `null`.
5. Validate Work WIDs and edition WIDs as upper-case ASCII against strict known prefixes. Reject malformed values; never silently case-fold arbitrary Unicode.
6. Validate each hash as exactly `[0-9a-f]{64}`.
7. Reject `NaN`, infinities, duplicate keys, non-schema values, unsupported numbers, missing required nullable fields, and unknown fields.

Serialize the closed object with **RFC 8785 JSON Canonicalization Scheme (JCS)**, encode as UTF-8 with no BOM, and persist the exact canonical UTF-8 byte sequence. Reconstructing a JavaScript object later and re-stringifying it is not an acceptable verifier substitute.

### 2.4 Hashes and identifier derivation

The v1 membership commitment is intentionally narrower than the full manifest. It binds the ordered unique Work-WID sequence:

```json
{
  "schema": "living-nexus:wid-alb2-membership:1",
  "members": [
    { "position": 1, "work_wid": "WID-MUS-..." },
    { "position": 2, "work_wid": "WID-MUS-..." }
  ]
}
```

```text
membership_sha256    = SHA-256(UTF8(JCS(membership-preimage)))
full_manifest_sha256 = SHA-256(UTF8(JCS(full-manifest)))
```

The full hash commits the ordered membership, Work-WID snapshots, Work/media hashes, HAAI/credit/creator snapshots, release lineage, and bound presentation. Changing title/HAAI/cover changes the full hash; changing sequence or Work WIDs changes both hashes.

From full hash `H`:

```text
edition_wid = "WID-ALB2-" + upper(H[0:16]) + "-" + upper(H[16:32])
```

The accepted format is:

```text
^WID-ALB2-[0-9A-F]{16}-[0-9A-F]{16}$
```

The displayed identifier contains a 128-bit hash prefix. The complete 256-bit `full_manifest_sha256` remains the authoritative commitment and receives a unique database constraint. A duplicate displayed WID linked to a different full hash fails with `EDITION_IDENTIFIER_COLLISION`; it is never upserted or retargeted.

### 2.5 Edition event, registration, and signature

After canonical manifest construction, create a second closed event payload:

```json
{
  "schema": "living-nexus:wid-alb2-event:1",
  "event_type": "album_edition_sealed",
  "edition_wid": "WID-ALB2-...",
  "full_manifest_sha256": "<H>",
  "membership_sha256": "<M>",
  "release_family_id": "arf_<opaque-stable-id>",
  "edition_number": 1,
  "owner_creator_id": "123",
  "parent_event_id": null
}
```

```text
event_id = SHA-256(UTF8(JCS(event-payload)))
```

The existing generic `wids.register` and `insertWid` paths are not eligible for WID-ALB2 issuance: current registration accepts caller-chosen linkage and the existing helper can update an already stored event pointer. The WID-ALB2 path must use a dedicated **insert-only** transaction that binds the edition to its immutable canonical event and resource type.

**Signer gate — blocking technical validation item:** The repository exposes both documented Ed25519 public-key fields and older ECDSA-oriented Work fields. Before sealing implementation, the platform must validate a single creator-key lifecycle: enrollment/proof, client signing mechanism, rotation/revocation, and behavior for a creator with no valid key. The proposed signature contract is Ed25519 over UTF-8 `event_id`, with a public-key snapshot and SHA-256 key ID persisted on the edition. No server private-key custody is permitted.

Recommended safe interaction:

1. Server builds a short-lived seal preview for one locked Draft revision: full-manifest hash, edition WID, event ID, expiration, and draft revision.
2. Creator signs the event ID with their valid registered key.
3. Publish transaction locks/revalidates the Draft and current Works, rebuilds the bytes, requires byte-identical preview commitment, verifies the signature, then persists edition/event/WID binding atomically.

Until that key lifecycle passes technical validation, **private Draft implementation may proceed but WID-ALB2 issuance must remain feature-flagged off**.

### 2.6 Verification algorithm

1. Strictly parse the WID-ALB2 and find one immutable edition/resource binding.
2. For a public request, require current public availability before disclosing snapshots. Private, unlisted, withdrawn, foreign, malformed, or unknown editions return opaque `NOT_FOUND`.
3. Load immutable edition/member snapshots—not mutable Work data—and validate the closed schema.
4. Reconstruct canonical bytes; compare byte-for-byte with persisted bytes; compute and compare the full hash.
5. Rebuild ordered membership preimage and compare membership hash.
6. Derive WID from full hash and compare it to requested/stored WID.
7. Reconstruct/verify the sealed event, canonical event ID, resource binding, key ID, and creator signature.
8. Separately evaluate **current availability** from live Works for public rendering/export. Current withdrawal/unpublish/flagging may make a historically valid edition unavailable, but may not rewrite or invalidate its historic seal.

| Result | Meaning | Public behavior |
|---|---|---|
| `VERIFIED` | Manifest, membership, identifier, event, and signature validate; all current availability conditions pass. | Return public edition projection. |
| `VERIFIED_HISTORICAL_UNAVAILABLE` | Immutable evidence validates but current Work availability fails. | Opaque unavailable; owner may receive a safe actionable reason. |
| `MANIFEST_HASH_MISMATCH`, `MEMBERSHIP_HASH_MISMATCH`, `WID_DERIVATION_MISMATCH` | Immutable record is structurally inconsistent or tampered. | Opaque unavailable and operational diagnostic. |
| `REGISTRY_LINK_MISMATCH`, `SIGNATURE_INVALID` | Canonical event/key/signature linkage fails. | Opaque unavailable and operational diagnostic. |
| `NOT_FOUND` | No public authorized resource. | Non-disclosing not found. |

---

## 3. Exact additive schema plan

### Why ten new tables are necessary

The earlier six-table conceptual model captured lineage, draft state, edition identity, snapshots, and artifacts. Technical validation adds four supporting records so mutation, publication, registry binding, and audit history do not weaken the immutable core.

All are **new** tables. No legacy collection, Work, playlist, personal collection, manifested collection, or Work/WID column is changed by this migration.

| New table | Core columns | Constraints and retention rule |
|---|---|---|
| `album_release_families` | `id`, `creator_id`, `source_kind`, optional `legacy_collection_id`, `legacy_collection_wid_snapshot`, timestamps | One creator lineage. Optional legacy link is observational only; unique non-null legacy collection link. Restrictive references; no cascade deletion. |
| `album_release_drafts` | `id`, `family_id`, `creator_id`, `create_request_id`, `title`, `description`, cover hash/reference, `release_date`, `status: ACTIVE|ARCHIVED`, `revision`, archive fields, timestamps | Draft is private by model: **no visibility field**. Unique `(creator_id, create_request_id)` for create idempotency. Index owner/status/update time. |
| `album_release_draft_tracks` | `draft_id`, `song_id`, `position`, `added_by_user_id`, `added_at` | Primary/unique `(draft_id, song_id)` enforces approved v1 uniqueness. Unique `(draft_id, position)` enforces order. Membership rows are scoped by draft. |
| `album_release_draft_revisions` | `draft_id`, `revision`, actor, operation, canonical draft snapshot bytes/hash, timestamp | Immutable draft audit. Unique `(draft_id, revision)` and `(draft_id, snapshot_hash)`. No update/delete through application service. |
| `album_editions` | `id`, `family_id`, `source_draft_id`, source revision, creator, edition number, `edition_wid`, manifest/canonicalization version, canonical manifest bytes/hash, membership hash, event ID, signer key ID/signature, seal request ID, sealed timestamp | Immutable identity. Unique WID/full hash/event ID; `(family_id, edition_number)`; `(creator_id, seal_request_id)`; `(source_draft_id, source_revision)`. Store canonical bytes in a binary/text field exactly, not only parsed JSON. |
| `album_edition_tracks` | `edition_id`, `position`, `song_id`, Work WID/content/media hash snapshots, title/creator/credits/HAAI snapshots | Unique `(edition_id, position)`, `(edition_id, song_id)`, and `(edition_id, work_wid_snapshot)`. These are immutable snapshots, not live Work projections. |
| `album_edition_artifacts` | `id`, edition, kind, object key/reference, SHA-256, media type, producer/schema version, manifest hash, created timestamp | Append-only certificate, manifest, or cover rendition evidence. A new rendition appends; it never overwrites a pointer in the sealed identity. |
| `album_edition_publication` | edition, `status: SEALED|PUBLISHED|WITHDRAWN`, visibility, publication/withdrawal timestamps, projection revision | One mutable current-availability projection. It does not hold identity or membership. State transitions require append-only event creation in the same transaction. |
| `album_edition_publication_events` | edition, sequence, actor, event type, canonical payload/hash, prior hash, timestamp | Append-only state-history chain. Unique `(edition_id, sequence)` and `(edition_id, payload_hash)`. |
| `wid_resource_bindings` | canonical WID, `resource_type`, resource primary key, canonical hash, event ID, immutable flag, timestamps | Typed bridge between the current generic registry and an album-edition resource. It preserves one canonical WID registry while avoiding unsafe generic upsert semantics. Unique WID and `(resource_type, resource_id)`. |

### Constraint strategy

- Use restrictive foreign keys on all **new** parent/child relationships only if the active MySQL/TiDB capability and existing column collation/types pass a staging preflight. Do not add new FKs to legacy `songs.collectionId`, `collections`, playlists, or user collections; current historical orphan data makes that destructive.
- Use database unique indexes for WID, family edition number, source-draft revision, per-edition Work uniqueness, and positions. Router checks alone are insufficient.
- Use database transactions, row locks/optimistic `expectedRevision`, and exact set validation for every multi-row mutation.
- Use application-level immutability enforcement from transaction-only repository code. Optional database triggers/check constraints are defense in depth only after a MySQL/TiDB feature-compatibility test; no trigger is a substitute for server authorization or an atomic transaction.
- Work reuse across **different** editions is allowed; the approved uniqueness rule applies within one v1 edition. A global unique Work-to-edition constraint would incorrectly block reissues, expanded editions, and successors.

---

## 4. Migration, rollout, and rollback plan

### 4.1 Pre-migration gates

Before generating a migration:

1. Rebase/synchronize the implementation branch and recheck the next Drizzle sequence. Current planning assumes `0140`, but the number/slug must be generated from the then-current migration journal—not hand-invented.
2. Run a read-only reconciliation report. It lists, but never repairs, legacy collection orphans, duplicate legacy orders, missing/ambiguous Work WIDs, legacy hash mismatches, unavailable members, and registry/linkage differences.
3. Run a staging `information_schema` preflight for data types/collations between `wids`, `provenanceEvents`, and new references.
4. Complete the creator-key lifecycle decision and prove safe browser/server signing before enabling sealing.
5. Verify a disposable MySQL/TiDB database can apply the migration from a fresh schema and from the current reconciliation baseline.

Known read-only health observations are not migration repair work: legacy `songs.collectionId` includes orphan references and duplicate legacy display-order groups. Stage 1 must report them but must not auto-null, reassign, renumber, rehash, or reissue their historical WIDs.

### 4.2 Forward migration sequence

| Step | Action | Safety boundary |
|---|---|---|
| 1. Expand | Generate one additive Drizzle migration, snapshot, and journal entry for the ten new tables/indexes/approved constraints. | No legacy DDL change and no historical data rewrite. |
| 2. Verify DDL | Run post-migration metadata assertions for every expected table, index, unique constraint, FK/check/trigger that was approved. | The custom migration runner’s duplicate-DDL tolerance is not sufficient evidence for this trust-bearing migration. |
| 3. Deploy dark | Deploy code with all release-edition feature flags off. | Existing legacy album, playlist, Player, and manifest behavior remains the same. |
| 4. Reconcile | Run the read-only legacy report and preserve its evidence. | No automated backfill or remedial write. |
| 5. Owner Draft canary | Enable `release_editions_drafts_v1` only for approved creators. | Private drafts only; no public route, WID, certificate, or manifest. |
| 6. Seal canary | Enable `release_editions_seal_v1` after signature, atomicity, migration, and concurrency gates pass. | WID-ALB2 issuance is insert-only and owner-controlled. |
| 7. Publication canary | Enable `release_editions_publish_v1` after public verifier, availability, and privacy gates pass. | Legacy WID-ALB routes remain unchanged. |
| 8. General availability | Enable owner-private drafts and edition publication broadly. | Retain legacy readers and verifier indefinitely. |

### 4.3 Backfill policy

There is **no automatic legacy conversion**.

A legacy WID-ALB cannot truthfully become WID-ALB2 because legacy evidence does not bind track order, Work metadata, HAAI, media hash snapshots, or a full canonical manifest. A creator may later create a new WID-ALB2 Draft from a legacy album only through a deliberate owner action and explicit review. That creates a new edition; it never upgrades, replaces, or validates the old WID.

Do not fabricate a generic registry event or WID binding for a legacy collection that lacks one. Do not copy a mutable legacy PDF pointer into a new immutable artifact claim without evidence of its historic byte hash.

### 4.4 Rollback

Rollback is **forward-only and non-destructive**:

1. Disable creation, seal, publish, and new UI routes through feature flags.
2. Keep new tables, issued WID-ALB2 records, canonical manifest bytes, registry events, and append-only publication history intact.
3. Preserve a read-only verifier for any already issued WID-ALB2, even if creator authoring UI is disabled. Trust records must not disappear because a feature flag changes.
4. If a public edition must stop being available, append a `WITHDRAWN` publication event; do not delete it, alter its canonical bytes, repoint its WID, or invalidate historic evidence.
5. Restore legacy UI/API routing only after a smoke test shows Stage 0 WID-ALB, playlists, Work pages, Player, and Provenance Player manifest behavior are intact.
6. Do not run a destructive down migration after the first real edition exists. A compensating down migration is permissible only before production usage and only when new tables are proven empty.

### 4.5 Required rollback drill

On a disposable database:

1. Restore a reconciliation-baseline fixture containing legacy WID-ALB albums, Stage 0 mismatches, public Works, and named playlists with repeated Work membership.
2. Apply the new migration; create one private Draft and one sealed/published WID-ALB2 edition through test APIs.
3. Snapshot legacy hashes/counts/projections, edition records, WID bindings, manifest output, and player-continuity fixture state.
4. Disable edition flags and run the prior application version plus the read-only edition verifier.
5. Prove legacy routes/read models/manifests and repeated playlists retain their prior behavior, while new authoring routes fail closed without draft disclosure.
6. Re-enable current code; prove edition records/WIDs/hashes/events remain byte-equivalent and idempotent retries do not create a second edition.

---

## 5. Exact implementation impact map

### Existing files that will change after implementation approval

| File | Planned responsibility |
|---|---|
| `drizzle/schema.ts` | Add the ten additive release/edition/registry-binding declarations and exported types. Leave legacy collection/Work/playlist shapes unchanged. |
| `drizzle/relations.ts` | Add relations only for new tables where Drizzle relation queries are needed. |
| `drizzle/meta/_journal.json` | Drizzle-generated journal update only. |
| `client/src/App.tsx` | Add owner route `/studio/release/:draftId` and public route `/album-edition/:editionWid`; retain legacy route semantics. |
| `client/src/pages/ArchivePage.tsx` | Replace duplicate embedded playlist management with a typed Collections workspace entry while keeping the existing authenticated/deep-linkable Collections tab. |
| `client/src/pages/CollectionStudioPage.tsx` | Retain as legacy WID-ALB Studio adapter and extract reusable presentation grammar; do not send new draft writes through its legacy router. |
| `client/src/pages/PlaylistsPage.tsx` | Keep one named-playlist editor; make v1 mutation controls owner-only and invalidate hardened public projection queries. |
| `client/src/components/MyListsTab.tsx` | Replace the duplicate full editor with a routed `Manage playlists` action; preserve no second playlist write path. |
| `client/src/pages/SharedPlaylistPage.tsx` | Consume a hardened public playlist projection; never infer public playability from raw `fileUrl`. |
| `client/src/pages/AlbumDetailPage.tsx` | Preserve legacy WID-ALB page/manifest semantics; share non-authoritative manifest action styling only. |
| `client/src/pages/VerifyPage.tsx` | Branch `WID-ALB2-` before legacy `WID-ALB-`; route to a dedicated edition verifier, never `CollectionVerifyView`. |
| `client/src/contexts/PlayerContext.tsx` | No provider/audio/queue behavior change. At most add a typed testing seam that asserts non-mutating flows. |
| `server/routers/index.ts` | Register the new workspace, draft, and edition routers while retaining legacy routers. |
| `server/routers/playlists.ts` | Require owner predicate for v1 playlist writes; replace raw shared-playlist read with hardened public projection. |
| `server/routers/collectionStudio.ts` | Preserve Stage 0 legacy composition guard and owner/recovery behavior; no modern release mutations. |
| `server/routers/songs.ts` | Preserve legacy WID-ALB verification, certificate, ZIP, public read, and manifest behavior. |
| `server/utils/db.ts` | Add/route hardened public playlist reader only; do not attach modern release writes to legacy helpers. |
| `server/db/songs.ts` | Preserve `assertCollectionCompositionMutable` and legacy Stage 0 helper behavior. |
| `server/domains/provenancePlayer/manifest.ts` | Keep its current all-or-nothing policy. Add an edition-source adapter/caller without weakening media or URL restrictions. |
| `server/routes/provenancePlayerMediaRoute.ts` | Preserve current `no-store` eligibility gateway. Add a snapshot-aware edition media path only after sealed/current media comparison is defined. |
| `server/routes/publicApiRoute.ts` | In publication slice only, add a public edition projection endpoint using the same safe reader; no Draft endpoint or raw media credential. |
| `server/_core/index.ts` | Mount only a discrete public edition route if required; retain current gateway mounting. |
| `server/registry/readService.ts` and `server/routes/registryApiRoute.ts` | Extend only if Registry R1 must publicly resolve WID-ALB2 through a typed resource binding. Existing Work-only registry behavior must not be assumed to resolve an album edition. |

### New files to create after approval

| File | Planned responsibility |
|---|---|
| `drizzle/0140_<generated>_wid_alb2_release_editions.sql` | Additive generated/validated migration. Exact sequence and slug are revalidated immediately before generation. |
| `drizzle/meta/0140_snapshot.json` | Drizzle-generated snapshot. |
| `server/db/albumReleases.ts` | Transaction-only draft/edition persistence, locks, exact membership, insert-only WID registration, publication events, read projections. |
| `server/domains/releases/widAlb2Manifest.ts` | Closed schema, normalization, JCS canonical bytes, membership/full hashes, WID derivation, seal-preview validation. |
| `server/domains/releases/widAlb2Verification.ts` | Pure snapshot/event/signature verification and typed outcomes. |
| `server/domains/releases/releasePolicy.ts` | Owner, private-draft, Work eligibility, unique-membership, revision, and state-transition policy. |
| `server/domains/releases/releaseErrors.ts` | Canonical owner/public-safe error vocabulary. |
| `server/routers/collectionWorkspace.ts` | Owner-only typed card aggregation: Drafts, modern Editions, legacy sealed albums, and named playlists. |
| `server/routers/releaseDrafts.ts` | Owner-only Draft lifecycle. |
| `server/routers/releaseEditions.ts` | Seal preview/publish, owner/public reads, clone-to-draft, verify, and manual manifest export. |
| `server/routes/albumEditionRoute.ts` | Optional read-only public/verification projection; no draft/media URL behavior. |
| `client/src/components/collections/CollectionsWorkspace.tsx` | Single owner entry with distinct Releases and Named Playlists sections. |
| `client/src/components/collections/ReleaseStudioShell.tsx` | Presentation shell reusing Collection Studio grammar but receiving a new adapter/authority. |
| `client/src/pages/ReleaseDraftStudioPage.tsx` | Owner-private Draft Release editor. |
| `client/src/pages/AlbumEditionPage.tsx` | Public immutable WID-ALB2 edition view. |
| `client/src/components/AlbumEditionVerifyView.tsx` | Dedicated WID-ALB2 verification presentation. |
| `shared/albumReleaseTypes.ts` | Safe read-model/contract types only; canonical construction and signature validation stay server-authoritative. |

### Files explicitly not rewritten by Stage 1

- `server/domains/collections/collectionCompositionSeal.ts`
- legacy composition branches in `server/db/songs.ts`, `server/routers/songs.ts`, and `server/routers/collectionStudio.ts`
- existing legacy `collections` / `songs.collectionId` migration history
- Work registration, Work WID generation, Work HAAI correction, media storage, and current PlayerContext playback engine

---

## 6. API, authorization, error, and cache contract

### Owner-only procedures

```text
collectionWorkspace.mine()
releaseDrafts.listMine()
releaseDrafts.get({ draftId })
releaseDrafts.create({ createRequestId, metadata })
releaseDrafts.updateMeta({ draftId, expectedRevision, metadata })
releaseDrafts.replaceMembership({ draftId, expectedRevision, songIdsInOrder })
releaseDrafts.reorderMembership({ draftId, expectedRevision, membershipRowsInOrder })
releaseDrafts.discard({ draftId, expectedRevision })
releaseDrafts.createSealPreview({ draftId, expectedRevision })
releaseDrafts.publish({ draftId, expectedRevision, sealRequestId, previewHash, previewEventId, signature })
releaseEditions.getOwner({ editionWid })
releaseEditions.createDraftFromEdition({ editionWid, createRequestId })
releaseEditions.copyProvenancePlayerManifest({ editionWid })
```

Every mutation proves `creatorId === ctx.user.id` server-side, locks/scopes its container and membership rows, and uses an expected revision or idempotency key. A foreign/not-owned private resource responds as owner-safe `NOT_FOUND`, not an enumerating permission explanation.

### Public procedures

```text
releaseEditions.getPublicByWid({ editionWid })
GET /api/v1/album-editions/:editionWid        // only in publication slice
GET /verify/:editionWid                       // typed edition verification surface
```

There is no public Draft route, REST endpoint, manifest endpoint, certificate endpoint, or external media path.

### Named playlist hardening required in the same workspace program

Current shared-playlist reads do not apply the same public/published/unflagged projection used by hardened legacy albums. This is a blocking public-promotion defect, not a reason to add redundant individual permissions.

Before Creator Domain advertises public named playlists:

- split `playlists.getBySlug` onto a small `getPublicPlaylistProjectionBySlug` reader;
- expose only public, Published, unflagged eligible Works;
- fail closed for a public shared playlist when its ordered path cannot be truthfully rendered under the agreed projection policy;
- remove raw `fileUrl` as a playability signal from `SharedPlaylistPage`; and
- in v1 authorize playlist membership/editor operations by **owner**, not accepted collaborator role.

### Error vocabulary

| Domain state | Transport / message |
|---|---|
| Foreign/missing Draft | `NOT_FOUND` — `Draft release unavailable.` |
| Public unavailable Edition | `NOT_FOUND` — `Edition unavailable.` |
| Stale Draft revision | `CONFLICT` — `This draft changed. Reload, review, or retry.` |
| Seal/readiness failure | `BAD_REQUEST` — actionable owner-safe categories only; no foreign Work disclosure. |
| Immutable Edition mutation | `CONFLICT` — `This edition is sealed. Create a new draft to change membership or sequence.` |
| WID/hash/event/signature conflict | `CONFLICT` — generic safe message plus internal correlation ID. |
| Companion manifest/media unavailable | Preserve opaque `NOT_FOUND` — `Manifest unavailable` / `Media unavailable`. |

### Cache and playback rules

Draft/edition/playlist mutations invalidate only their data projections: workspace cards, owner draft/edition queries, selector availability, public projections when relevant, and public REST cache/ETag when it exists. They never invalidate or mutate PlayerContext.

Only explicit Play controls may call `usePlayer().playQueueAt`. Workspace entry, filtering, save/retry, sealing, clone-to-draft, manifest copy/download, and external-companion launch must not create audio, pause, call `setQueue`, replace a queue, or reseed a track.

---

## 7. Test strategy and publish gates

### Existing regression suites that must remain green

- `server/tests/collectionCompositionSeal.test.ts`
- `server/tests/collectionStage0Integrity.contract.test.ts`
- `server/tests/albumAssignment.contract.test.ts`
- `server/tests/playlistMembershipIntegrity.test.ts`
- `server/tests/provenancePlayerManifest.test.ts`
- `server/tests/provenancePlayerManifestRouter.test.ts`
- `server/tests/provenancePlayerManifestExport.contract.test.ts`
- `server/tests/collectionStudioRecovery.contract.test.ts`
- `server/tests/playerProviderComposition.test.ts`
- `server/tests/globalPlayerAccessRoutes.contract.test.ts`

### New/extended test files

| Test file | Required proof |
|---|---|
| `server/tests/widAlb2Manifest.test.ts` | Closed schema, normalization, JCS bytes, ordered membership/full hashes, WID derivation, malformed/collision rejection, no legacy algorithm mutation. |
| `server/tests/widAlb2Verification.test.ts` | Snapshot-only verification, event/resource binding, signature outcomes, current availability distinct from historical validity. |
| `server/tests/releaseDraftPolicy.test.ts` | Private drafts, owner-only access, unique Work rule, exact membership/order, stale revisions, no collaborator authority. |
| `server/tests/releaseDrafts.integration.test.ts` | Real disposable DB transactions, rollback injection after each write boundary, zero partial Draft/revision/member changes. |
| `server/tests/releaseEditions.integration.test.ts` | Atomic seal: edition/members/event/WID binding/draft transition all commit or none do; Work/legacy rows unchanged. |
| `server/tests/releaseEditionConcurrency.integration.test.ts` | Concurrent same-key seal returns one receipt; different-key conflict; no duplicate WID/event; optimistic revision conflict; mixed ordering never seals. |
| `server/tests/releaseEditionPublicProjection.test.ts` | Draft invisibility; public/unlisted/withdrawn behaviors; JSON-LD/OG/public REST no private snapshot leak. |
| `server/tests/releaseEditionManifest.test.ts` | Edition order preserved, all-or-nothing failure, no raw media URLs, gateway rechecks current availability and edition snapshot match. |
| `server/tests/releaseEditionMigration.integration.test.ts` | Fresh migration and upgrade from current baseline; information-schema constraints/indexes/defaults; byte-equivalent legacy rows/projections. |
| `server/tests/releaseEditionRollback.integration.test.ts` | Forward-only flag rollback drill; old legacy behavior stays intact; issued edition evidence remains verifiable/read-only. |
| `server/tests/publicPlaylistProjection.test.ts` | No private/draft/flagged Work disclosure/playback through public playlist share route; duplicate playlist membership remains legal. |
| `server/tests/collectionWorkspace.contract.test.ts` | One workspace vocabulary/routes; no personal/WID-COL/release conflation; no duplicate playlist editor. |
| `server/tests/collectionsWorkspacePlayerContinuity.contract.test.ts` | No new PlayerProvider/audio/reset/queue calls in workspace mutation/export flows. |

### Browser and accessibility validation gap

Current Vitest configuration is server-only and current browser/mobile coverage is largely contract/source based. Before a WID-ALB2 publish, add a real browser runner (Playwright or equivalent) with a separate configuration.

Required end-to-end suites:

| Suite | Required flow |
|---|---|
| `e2e/album-edition-owner.spec.ts` | Owner creates private Draft, adds eligible Works, duplicate Work fails accessibly, reorders, resolves conflict, seals/publishes when key gate is configured; active Player survives. |
| `e2e/album-edition-privacy.spec.ts` | Guest/non-owner cannot disclose Draft by route, WID, search, HTML, JSON-LD, cache/retry response, cover request, manifest, or media endpoint. |
| `e2e/album-edition-mobile.spec.ts` | 320×568, 375×667, 390×844, 768×1024, desktop; no horizontal overflow, no player-safe-area obstruction, dialogs return focus, touch flow has non-drag alternative. |
| `e2e/album-edition-a11y.spec.ts` | Keyboard picker/reorder/save/seal, live status, error focus, Escape, visible focus, semantic headings, reduced motion, contrast. |
| `e2e/player-provenance-continuity.spec.ts` | One Living Nexus audio authority; track/time/queue survive browse/save/retry/seal/export; external companion opens `noopener` tab and does not invoke queue APIs. |

### Minimum publish gate

No publication may occur unless all are true:

1. Creator-key/signature lifecycle is resolved and passes its dedicated security review.
2. All current and new unit/router/contract tests pass.
3. Disposable MySQL/TiDB migration tests prove fresh install, baseline upgrade, schema constraints, and legacy preservation.
4. Failure injection and concurrency suites prove atomicity/idempotency.
5. Privacy matrix passes for guest, non-owner, owner, playlist collaborator, direct ID/WID/slug, tRPC, REST, search, OG/JSON-LD, media, manifest, and errors.
6. Stage 0 WID-ALB and repeated playlist membership tests remain green.
7. Real-browser desktop/mobile/accessibility/player-continuity suites pass.
8. Staging forward-only rollback drill passes with retained evidence.
9. `pnpm check`, focused suites, `pnpm build`, complete `pnpm test`, `git diff --check`, and measured `pnpm refine` all pass; score does not decrease.

---

## 8. Remaining technical gates before an implementation request

These are implementation blockers, not requests to weaken the approved architecture:

1. **Creator key lifecycle:** certify Ed25519 enrollment/proof, browser signing, rotation/revocation, and no-key behavior. Do not fall back silently to server signing or an unverifiable ECDSA field.
2. **Hash readiness:** inventory how many candidate audio Works have valid Work WIDs, content hashes, source/stored artifact hashes, and normalized credit/HAAI fields. Missing evidence produces a readiness result, never a URL-based substitute.
3. **Edition availability policy:** determine whether a sealed Edition may be private/unlisted before later publishing and whether withdrawn editions are permanently unavailable or can receive a defined append-only republish event. The migration supports these transitions; the public product policy must lock them.
4. **Legacy-to-modern creator action:** decide whether an owner may manually create a WID-ALB2 Draft from a selected legacy album. Recommendation: yes, only through explicit owner review; never automatic backfill.
5. **Registry binding preflight:** verify `wids`/`provenanceEvents` types and collations can safely carry typed insert-only WID-ALB2 resource bindings. If they cannot, create compatible logical references first without altering historic generic WID rows.

---

## 9. Six-layer alignment

| Layer | Effect of this plan |
|---|---|
| Identity | Keeps individual Work WIDs intact and gives a release edition its own explicit versioned identity. |
| Manifestation | One comprehensible creator Collections journey, without pretending a playlist or legacy collection is an edition. |
| Relationship | Uses ordered relations to existing Works; never duplicates media or creator ownership. |
| Registry | Separates legacy sorted-membership truth from full-manifest WID-ALB2 evidence, with insert-only identity and verification. |
| Stewardship | Private drafts, owner control, safe withdrawal, readable recovery, and no accidental historical rewrite. |
| Legacy | Keeps Stage 0 legacy records, certificates, and WID-ALB semantics auditable and intact forever. |

## Source basis

This plan is based on the approved Stage 1 design, Stage 0 seal decision, current Drizzle/MySQL migration conventions, `collectionCompositionSeal`, existing playlist/Collection Studio/manifest/Player routes, and read-only technical audits completed on 2026-10-20. The current refinement baseline remains **70/100 (C)** with broader unrelated typography, doctrine, and design-drift debt; this plan does not claim to resolve it.

**No implementation, migration, data change, deployment, publication, or WID issuance occurred while creating this technical validation record.**
