# Portable Witness — Deleted-History Identity Correction

**Date:** 2026-10-22
**Base checkpoint:** `9cac9a65`
**Scope:** Correct one false-negative manifest eligibility condition.
**Deployment/publication:** Not authorized and not performed.

## Reported symptom

An owner selected **Copy manifest** for the canonical Work `360001`, **Root of All Evil (Special Edition)**, with WID `WID-MUS-E2C8394C-53317C6A`. The canonical Work page displayed the intentionally generic toast:

> Manifest unavailable — This Work must be published public audio with a current WID and no companion-player withdrawal.

That generic feedback remains correct as a non-disclosure behavior. The server had a false-negative eligibility result.

## Confirmed cause

The Work itself meets the existing portable-manifest requirements:

- owner: user `1`
- medium: `audio`
- status: `Published`
- visibility: public
- moderation: unflagged
- WID: present
- media reference: present and HTTPS
- companion withdrawal: absent
- Creator record: present

However, its same WID was also retained on Work `330001`, whose status is `Deleted` and visibility is private. The shared helper `hasAmbiguousProvenancePlayerWids()` counted every historical row carrying the WID, including this Deleted predecessor. It therefore treated one current Work and one preserved Deleted record as a current identity ambiguity.

This contradicted the helper’s documented intent to detect more than one **current** song row. It blocked the owner manifest request and the later revocable media-gateway check.

## Correction

`server/utils/db.ts` now limits duplicate-WID evaluation to rows whose status is not `Deleted`:

```ts
.where(and(
  inArray(songs.witnessId, normalized),
  ne(songs.status, "Deleted"),
));
```

The correction intentionally changes no other rule. A manifest still fails closed when two or more non-Deleted Works share the WID. The same helper remains in both owner export procedures and the public gateway, so a successful manifest cannot later fail merely because its preserved Deleted predecessor exists.

## Impact measured read-only

For owner `1`:

| Measure | Count |
|---|---:|
| Otherwise eligible public/published audio Works | 50 |
| Formerly blocked by any WID duplicate | 7 |
| Correctly exportable under current-record rule | 48 |
| Still blocked by a non-Deleted duplicate WID | 2 |

The reported WID is now not ambiguous under the current-record rule. The two remaining protections are intentional, for example the WID shared by a public Work and an Unlisted non-Deleted Work.

## Validation

| Validation | Result |
|---|---|
| Reported owner Work export, direct protected procedure | Returned `living-nexus-player/1`, exactly one track, Work `360001`, correct WID |
| Manifest audio field | Gateway-only `https://www.livingnexus.org/api/provenance-player/media/360001`; no raw `fileUrl` field |
| Gateway request, no redirect follow | `302`, CORS enabled, `Cache-Control: no-store`; destination not consumed |
| Deleted predecessor ambiguity check | `false` — correctly excluded |
| Non-Deleted duplicate control | `true` — still fail-closed |
| Focused manifest, route, and gateway tests | 5 files, 32 passed |
| Full regression suite | 148 files passed, 1 skipped; 915 passed, 1 skipped |
| TypeScript | `pnpm check` passed |
| Production build | `pnpm build` passed |
| Refinement | Existing 70/100 C baseline unchanged |
| Whitespace | `git diff --check` passed before checkpoint |

## Files changed

| File | Change |
|---|---|
| `server/utils/db.ts` | Excludes only Deleted historical rows from current WID ambiguity detection. |
| `server/tests/provenancePlayerManifestExport.contract.test.ts` | Requires the current-record filter and preserves the `count > 1` ambiguity rule. |
| `refinement/lessons/lessons-log.json` | Adds LESSON-078 documenting deleted-history preservation versus current identity ambiguity. |

## Explicit non-changes

No database record was written. No Work, WID, historical evidence, media object, HAAI declaration, Creator permission, registry policy, manifest schema, PlayerContext, Global Player, queue, migration, deployment, or publication changed.

The legacy Deleted Work remains preserved and cannot produce a manifest. The correction only stops its historical row from suppressing a separate, current canonical Work that has the same WID.

## Remaining limitation

This corrects only the Deleted-history false negative. Works with a second non-Deleted WID occurrence remain unavailable until their identity relationship is separately reviewed. The owner-browser click-through remains an appropriate staging acceptance item after this checkpoint; it is not asserted as performed here.
