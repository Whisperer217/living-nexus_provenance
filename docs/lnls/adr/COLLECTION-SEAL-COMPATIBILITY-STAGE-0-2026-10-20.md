# ADR — WID-ALB Origin Membership Seal Compatibility (Stage 0)

**Date:** 2026-10-20  
**Status:** Approved for Stage 0 security and registry-integrity implementation only  
**Decision owner:** Living Nexus creator community policy and current task approval

## Context

A legacy WID-ALB collection stores a non-null `collectionWid` and `collectiveHash`. The original registration algorithm forms that hash as SHA-256 of the sorted individual member Work WIDs joined by `|`. Existing code nevertheless permits later add, remove, and replace operations through Collection Studio and Work assignment paths, without replacing the seal or preserving a membership snapshot.

That behavior allows a current membership set to diverge from the historical WID-ALB origin seal. It also permits private/unlisted WID-ALB records to be read publicly and allows named-playlist membership operations to cross container boundaries.

## Decision

### 1. Exact WID-ALB identity semantics

A legacy **WID-ALB is an immutable origin membership seal**. It proves the original multiset of individual Work WIDs used to create the collection.

It does **not** cryptographically bind:

- display name, description, cover art, cover focal point, default view, or visibility;
- the current public availability of every member Work; or
- track order, because the historical hash sorted Work WIDs before hashing.

Therefore, title/artwork/description/visibility/default-view changes and reordering of the same member set remain editorial presentation operations. They do not change an individual Work’s WID, HAAI declaration, media, ownership, creator relationship, or historical certificate.

### 2. Sealed membership rule

For every existing `collections` row carrying a WID-ALB and collective hash:

- **Add, remove, and replace membership operations are rejected.**
- Single-Work registration into a sealed album and Work metadata reassignment into or out of one are preflight-rejected before a partial Work write.
- Reorder remains permitted only because it cannot alter the stored sorted-WID membership seal. It remains an editorial order change and must not be presented as an identity amendment.
- Presentation metadata remains editable through existing owner-authorized paths.

This is a compatibility-safe hold, not a new album lifecycle. The later, separately approved model is **Draft Release → Publish → new sealed WID-ALB edition**. It will provide a mutable pre-seal object and make any changed membership a new edition rather than an overwrite.

### 3. Current-claim containment

Where Living Nexus makes a trust-bearing statement about a WID-ALB’s current membership, it must replay the original hash algorithm and compare the result with the stored seal.

A mismatch, missing member WID, stored WID/hash inconsistency, or otherwise incomplete seal is a **composition-integrity mismatch**. On mismatch:

- public album reads do not disclose the record or current membership;
- collection verification returns no verified result;
- certificate generation does not write a new artifact or replace the latest pointer;
- Provenance Player album manifest export returns the existing non-disclosing unavailable result;
- album ZIP generation must not start a current-membership export.

Existing historical PDFs and prior manifest copies are neither deleted nor rewritten. A later fetch of media through the existing Provenance Player gateway still performs its current Work-level eligibility check; Stage 0 does not add a redundant per-track authorization regime.

### 4. Public availability

A public WID-ALB read requires `collections.visibility === "public"`. The public projection may return only currently public, Published, unflagged member Works. It is an availability-filtered presentation and never authorization to expose private or unpublished Work records. Owner Studio reads remain unchanged.

The public Creator Domain collection list likewise returns only public collections. Owner Archive and Collection Studio continue using their owner-authorized list, so this visibility containment does not hide a creator's own private or unlisted releases from management.

## Playlist integrity decision

Named playlist membership is a distinct mutable relationship and has no collection WID seal. Stage 0 preserves its existing owner/accepted-member authorization model but requires:

- deletion scoped to both playlist membership-row ID and playlist ID;
- reorder using membership-row IDs, not song IDs;
- an exact, unique set equality check against the current playlist membership; and
- one transaction for membership validation and position writes.

No playlist schema migration, WID, HAAI, media, public-sharing policy, or collaboration redesign is part of this repair.

## Compatibility implications for creators

Creators can keep editing how a sealed album is presented: name, description, artwork, focal position, visibility, default view, and the display order of the same Works. Those edits do not rewrite past certificates or change the original WID-ALB origin claim.

Creators cannot currently add, remove, replace, or move a Work into/out of a sealed WID-ALB. The server will state that its composition is sealed and that a new edition is required. This is temporary until the approved Draft → Publish → Sealed Edition lifecycle is separately implemented.

Existing albums whose member set already differs from the stored collective hash remain preserved in owner management but are fail-closed at trust-bearing/public export boundaries. The platform does not auto-rehash, reissue a WID, unlink Works, delete certificates, or alter media/HAAI/provenance evidence.

## Alternatives rejected

- **Recompute and overwrite the stored collective hash/WID:** would silently replace historical evidence.
- **Create a new WID automatically during any edit:** would create a release without explicit creator review/publication.
- **Hide only private tracks but allow a stale WID-ALB current claim:** does not resolve the registry-integrity defect.
- **Add new per-track companion permission gates:** duplicates existing public/approved companion policy and conflicts with the scoped authorization boundary.
- **Treat every private legacy WID-ALB as a mutable draft:** re-labels a sealed identity without evidence.

## Implementation and rollback

No schema migration is needed. The repair adds server-side verification/authorization guards, a visibility-aware public reader, playlist predicate/transaction fixes, and regression coverage.

Rollback of the code is possible as a focused deployment reversal. It must never be performed by rewriting an existing WID/hash, deleting a historical certificate, or silently restoring altered membership. The business rollback for a desired new composition is a later, explicit edition workflow.

## Validation

- Pure hash replay/mismatch tests passed.
- Public/private/unlisted album-read and public-Work-filtering contracts passed.
- Verification, certificate, manifest, and ZIP fail-closed mismatch contracts passed.
- Sealed registration/metadata preflight contracts passed.
- Playlist cross-container removal, exact-set reorder, duplicate, stale, empty, and foreign membership behavior passed.
- `pnpm check` passed; focused Stage 0 suites passed (8 files / 52 tests); `pnpm build` passed; complete `pnpm test` passed (140 files / 871 tests, 1 skipped); and `git diff --check` passed.
- `pnpm refine` measured 70/100 (C), retaining broader pre-existing typography/doctrine/design-drift debt outside this scope.

**Implementation is saved only as a development checkpoint. No deployment or publication is authorized.**
