# Public Portable Witness Access — Implementation Record

**Date:** 2026-10-22
**Base checkpoint:** `95f68e71`
**Scope:** Community-approved public portability for individually eligible Works only.
**Deployment/publication:** Not authorized and not performed.

## Decision

The individual Work Portable Witness projection is now available to any visitor, not only the Work owner, when the canonical Work remains eligible for companion playback.

This implements the community-approved discovery model: a listener can carry a currently public Work’s attribution and manifest to Provenance Player as a portable witness artifact. Living Nexus remains the canonical registry and playback authority.

Named playlists and canonical albums remain owner-controlled exports. Draft Releases, private, unlisted, flagged, withdrawn, malformed, non-audio, unattributed, and currently WID-ambiguous Works remain unavailable.

## Changed behavior

| Surface | Before | After |
|---|---|---|
| `songs.copyProvenancePlayerWorkManifest` | `protectedProcedure`; current Work owner required | `publicProcedure`; current eligibility required |
| Canonical `/song/:id` Chain of record | Copy/Download visible only to the owner | Copy/Download visible to a visitor when the Work carries a WID |
| Named playlists and canonical albums | Owner-authorized | Unchanged |
| Media gateway | Rechecks eligibility through manifest adapter | Unchanged |

## Safeguards retained

The server adapter and gateway remain the authority. A public caller cannot export or play companion media for a Work unless it is:

- audio, `Published`, public, and unflagged;
- WID-bearing with one current non-Deleted identity;
- joined to a valid Creator with a display label;
- backed by a clean HTTPS media URL; and
- not withdrawn from the companion player.

Copied JSON still holds a gateway URL, not a raw storage URL, signed URL, cookie, or token. Every companion media fetch re-evaluates eligibility, returns `Cache-Control: no-store`, and only then issues a redirect to the current media object. A later unpublish, flag, withdrawal, or WID ambiguity blocks a previously copied manifest from resolving.

No PlayerContext call, queue update, audio instance, automatic handoff, or playback interruption was added.

## Files changed

| File | Change |
|---|---|
| `server/routers/songs.ts` | Individual Work manifest procedure changed from protected owner-only access to public eligibility access; all adapter checks retained. |
| `client/src/pages/loop/LoopWorkPage.tsx` | Existing Chain of record manifest controls now render for any Work with a WID, without adding another surface. |
| `server/tests/provenancePlayerManifestRouter.test.ts` | Replaced the obsolete non-owner denial test with anonymous and other-creator success cases; retained private and WID-ambiguity denial coverage. |
| `server/tests/provenancePlayerManifestExport.contract.test.ts` | Requires a public individual Work procedure and public canonical Work controls while retaining collection owner gates. |
| `docs/lnls/adr/PROVENANCE-PLAYER-MANIFEST-COPY-2026-10-20.md` | Updates the decision record to distinguish public individual Works from owner-controlled collections. |
| `refinement/lessons/lessons-log.json` | Adds LESSON-079. |

The reusable `/home/ubuntu/skills/living-nexus-portable-witness-manifests` skill was also updated and validated to encode this approved policy for future work.

## Validation

| Check | Result |
|---|---|
| Focused manifest/router/client/gateway contracts | 5 files, 33 passed |
| TypeScript | `pnpm check` passed |
| Full regression | 148 files passed, 1 skipped; 916 passed, 1 skipped |
| Production build | `pnpm build` passed |
| Refinement | Existing 70/100 C baseline unchanged |
| Desktop and 375 px guest UI | Canonical public Work rendered; browser inspection confirmed Copy manifest and Download `.json` beside WID/Verify while signed out |
| Real anonymous cross-creator export | Work `30001` returned one `living-nexus-player/1` track with actual WID and `@HlkngMniacNrdWrmngr` attribution |
| Raw media exposure | Absent from manifest; `audioUrl` is the Living Nexus gateway |
| Header-only real gateway check | `302`, CORS enabled, `Cache-Control: no-store`; redirect not followed |
| Playback authority | Source inspection confirms manifest handlers do not call PlayerContext or queue methods |

## Explicit non-changes

No Work, WID, HAAI declaration, Creator permission record, historical evidence, schema, migration, database data, storage object, raw-media entitlement, Global Player, PlayerContext, queue, external Player source, deployment, or publication changed.

## Remaining boundary

Public portability is deliberately limited to individual currently eligible public Works. Playlists and albums remain creator-owned collection exports. Provenance Player still uses paste/download import and does not gain account synchronization, shared playback, independent WID verification, automatic handoff, or access to private/Draft Works.
