# Collections Stage 1 — Draft Workspace Implementation Record

**Date:** 2026-10-21
**Status:** Implemented and validated as a development checkpoint candidate. **Not deployed or published.**
**Scope:** Private owner-authorized Draft Releases and one Creator Domain → Collections workspace.
**Explicit hold:** WID-ALB2 seal, public edition, verification, and edition manifest export remain unavailable pending the approved creator-key/signature lifecycle security gate.

## What changed

### One creator workspace

`/creator/collections` is the one owner-facing Collections workspace. It has three deliberately distinct relationship surfaces:

1. **Draft Releases** — private, editable arrangements of already registered published audio Works.
2. **Legacy WID-ALB Sealed Albums** — preserved historical collection records, linked only to their existing detail/manifest and presentation Studio paths. Their origin membership is not editable.
3. **Named Playlists** — existing mutable listening paths, routed to their one existing editor. Duplicate Work occurrences remain valid here.

`/studio/release/:id` is a private owner-facing alias into the same workspace for one Draft Release; closing it returns to `/creator/collections`. The Archive Collections tab and the owner section of the Creator Domain now point into this shared workspace rather than maintaining a second editor.

### Private Draft Release domain

The new owner-only `releaseDrafts` tRPC router supports:

- listing the current creator’s private drafts;
- creating an idempotent private Draft Release;
- editing title, notes, intended post-seal visibility, and cover reference;
- selecting only the creator’s already-published, public, registered audio Works;
- replacing or reordering membership using an optimistic `expectedRevision` check;
- archiving a draft without deleting or changing its Works; and
- a read-only `sealReadiness` result that truthfully reports the signing hold.

Draft membership lives in new `albumReleaseDraftTracks` rows. It neither rewrites `songs.collectionId`, legacy collections, media, Work WIDs, HAAI declarations, nor named-playlist membership.

Each successful creation, metadata change, membership replacement, reorder, or archive appends a deterministic snapshot to `albumReleaseDraftRevisions` in the same transaction. Each current member row records its adding creator. A failed revision or transaction does not append an accepted draft snapshot.

### Additive schema applied

Two additive Drizzle migrations were generated and applied after review:

- `0140_outgoing_ink.sql` — private release-family, Draft Release, Draft membership, future edition, edition-member, and edition-artifact tables.
- `0141_shiny_betty_brant.sql` — append-only draft revision, future edition publication/event, and typed registry-binding tables; edition audit fields and unique constraints.

Preflight confirmed `albumEditions` contained **0 rows** before the non-null support fields were added. Postflight confirmed the four support tables exist. A read-only count immediately after migration returned:

```text
Draft Releases: 0
Sealed editions: 0
Edition publication records: 0
```

No legacy collection, Work, playlist, registry, media, HAAI, or historical WID record was migrated, rewritten, or backfilled.

## WID-ALB2 boundary

The approved WID-ALB2 canonical identity remains unchanged: an ordered, unique Work-WID edition with closed RFC 8785/JCS payloads, full/membership hashes, immutable snapshots, typed registry binding, and creator signature over a canonical sealing event.

The UI explains that boundary rather than presenting a nonfunctional Seal or Publish action. The router returns `ready: false` with `RELEASE_SIGNING_HOLD`. This is intentional: the current repository has not yet completed and security-reviewed a unified creator key enrollment, signing, rotation/revocation, and no-private-key-custody lifecycle. Issuing a WID-ALB2 before that gate would weaken the approved edition identity.

Therefore this checkpoint provides the private editing half of the approved Draft → Publish → Sealed Edition lifecycle without fabricating the registry half. A subsequent sealed-edition slice must implement the approved key lifecycle, canonical JCS builder, signature verification, insert-only edition/resource-binding transaction, verifier, current-availability projection, and dedicated privacy/concurrency/rollback tests before it can expose publication.

## Stage 0 and companion interoperability

Stage 0 WID-ALB composition sealing and named-playlist membership integrity remain in force. The workspace contains no PlayerContext, queue reset, audio instance, or playback action. Existing owner-authorized Provenance Player manifest copy flows remain unchanged for legacy albums and named playlists; Draft Releases cannot export a companion manifest until they are honestly sealed and currently eligible.

### Legacy WID-ALB recovery follow-up

The focused recovery repair documented in [`LEGACY-WID-ALB-CREATOR-DOMAIN-RECOVERY-2026-10-21.md`](./LEGACY-WID-ALB-CREATOR-DOMAIN-RECOVERY-2026-10-21.md) preserves the Stage 0 fail-closed rule for a legacy album whose current membership cannot reproduce its historic collective hash. It adds an owner-only **Create Draft from Current Works** action that creates a separate private Draft Release with observational legacy lineage, never a repaired or replaced WID-ALB. Public Creator Domain shelves now omit any collection whose current members cannot truthfully support its public WID-ALB claim.

## Validation evidence

| Check | Result |
|---|---|
| Migration preflight | `albumEditions = 0` before support-field additions |
| Migration application | reviewed additive SQL applied successfully |
| Schema postflight | `albumReleaseDraftRevisions`, `albumEditionPublication`, `albumEditionPublicationEvents`, and `widResourceBindings` present |
| TypeScript | `pnpm check` passed |
| Focused security/relationship suites | 9 files / 51 tests passed |
| Full regression suite | 142 files / 881 tests passed; 1 intentionally skipped |
| Production build | `pnpm build` passed |
| Diff integrity | `git diff --check` passed |
| Guest privacy UI | `/creator/collections` showed sign-in boundary, no private Draft data |
| Mobile guest UI | controlled 375×812 DevTools capture rendered `Your Collections`; `scrollWidth = clientWidth = 375` |
| Refinement | `pnpm refine` measured 70/100 (C), unchanged from the existing baseline; report’s typography/doctrine debt is pre-existing and outside this approved slice |

## Affected files

- `drizzle/schema.ts`
- `drizzle/0140_outgoing_ink.sql`
- `drizzle/0141_shiny_betty_brant.sql`
- `drizzle/meta/_journal.json` and generated snapshots
- `shared/albumReleaseTypes.ts`
- `server/domains/releases/releasePolicy.ts`
- `server/db/albumReleases.ts`
- `server/routers/releaseDrafts.ts`
- `server/routers/index.ts`
- `client/src/pages/CollectionsWorkspacePage.tsx`
- `client/src/App.tsx`
- `client/src/pages/ArchivePage.tsx`
- `client/src/pages/loop/LoopCreatorPage.tsx`
- focused tests under `server/tests/`

## Remaining risks and next permitted work

1. **Sealing/security gate:** Resolve the creator signing-key lifecycle before any WID-ALB2 issuance or public Edition claim.
2. **Draft production acceptance:** Run an authenticated owner browser canary after any future deployment before treating create/edit/reorder/archival as live-accepted; no owner draft was created during this validation.
3. **Edition public hardening:** Implement the approved dedicated verifier, snapshot-only public projection, current availability evaluator, concurrency/rollback injection tests, and browser privacy matrix before enabling the feature flags.
4. **No release action performed:** This record is not deployment approval. No deployment, publication, legacy conversion, or historical rewrite has occurred.
