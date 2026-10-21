# Legacy WID-ALB Creator Domain Recovery

**Date:** 2026-10-21  
**Status:** Implemented and validated in development. **Not deployed or published.**

## Reported symptom

`/album/WID-ALB-754AD58F-D6356988` showed **“Album not found,”** while its owner needed a way to continue organizing the current Works from their Creator Domain without replacing or rewriting historical evidence.

## Confirmed cause

The legacy collection record exists, is public, and has seven non-deleted current members. Its current sorted Work-WID membership no longer reproduces its stored WID-ALB collective hash. The canonical replay evaluator returned `collective_hash_mismatch`.

The public album resolver was therefore correct to fail closed: a public WID-ALB page, certificate, verification response, or Provenance Player album manifest must not present current membership as verified by a historical collective seal when it no longer matches.

The separate presentation defect was confirmed in the public Creator Domain projections. They used the broad legacy collection reader and only checked `visibility === "public"`, so they could advertise a public album card whose canonical public WID route rejected. This created a broken public path; it did not mean the historical album was missing.

## Corrective behavior

### Creator recovery

A protected `releaseDrafts.createFromLegacyCollection` mutation now creates a **separate private Draft Release** from an owner’s current legacy-album Work relationships.

It is transactional and fails before writing any new release record unless every source Work is the owner’s published, public, registered audio Work with media and a Work WID. The actual supplied collection passed this read-only readiness check: all seven current Works are eligible.

The new release family records only an observational bridge:

- `sourceKind: "legacy_collection"`;
- the legacy numeric collection ID; and
- a snapshot of the legacy `WID-ALB` string.

The Draft Release copies title, description, cover reference, intended visibility, and current order into the Stage 1 Draft Release relationship tables. It also writes the established append-only draft revision snapshot.

It does **not** update or delete legacy collection membership, collective hash, historical WID-ALB, certificate, Work WIDs, media, HAAI disclosures, creator attribution, or manifest/media permissions. The old certificate remains historical evidence; the private draft is a new editable relationship, not a repair or replacement certificate.

The unified owner workspace at `/creator/collections` now exposes **Create Draft from Current Works** on each preserved legacy-album card. On an unresolved public album page, a signed-in creator receives a **Manage Collections** path to that same owner workspace. Guests continue to receive only the honest public unavailable state.

### Public Creator Domain truthfulness

`getPublicCollectionsByCreator` now replays each public collection’s current member WIDs through the exact legacy composition-seal evaluator before returning a public card. The profile, Creator Domain hub, and `/creator/:handle/albums` projection all use that shared reader.

For the supplied album, the post-change read-only projection returned `publicCreatorShelfIncludesAlbum: false`. Public visitors are no longer directed to a public album URL that cannot truthfully resolve.

## Provenance Player

No companion-player authority changed. The legacy album remains unavailable for manifest export while its collective seal is mismatched. A creator can make an editable private Draft Release from the current Works, but Draft Releases cannot export a Provenance Player manifest until the existing WID-ALB2 signing/security gate is completed and a truthful sealed edition exists.

## Validation

| Check | Result |
|---|---|
| TypeScript | `pnpm check` passed |
| Focused recovery, Creator Domain, Stage 0, composition, Draft, and Studio suites | 7 files / 35 tests passed |
| Actual supplied record, read-only | 7 live members; `collective_hash_mismatch`; all seven draft-eligible; public shelf excludes supplied WID |
| Local public album browser check | Guest route retains truthful `Album not found` state; no private recovery action leaked |
| Local Creator Domain browser check | supplied WID was absent from the public projection |
| Production build | `pnpm build` passed |
| Full regression suite | 143 files / 886 tests passed; 1 intentionally skipped |
| Diff integrity | `git diff --check` passed |
| Refinement | `pnpm refine` measured 70/100 (C), reflecting existing broader platform debt; no score improvement claimed |

## Remaining risk and next permitted action

The source, router contract, actual-record eligibility, and guest browser boundaries are validated. The remaining acceptance check is an **authenticated owner browser canary after a future deployment**: open `/creator/collections`, select the legacy card, create the draft, edit/reorder it, and verify the historic WID-ALB and certificate remain unchanged. No owner draft was created during this repair validation, and no deployment, publication, data conversion, or historical rewrite has occurred.
