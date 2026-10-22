# Portable Witness — Canonical Work Implementation

**Date:** 2026-10-22
**Base checkpoint:** `a58c49e4`
**Scope:** Approved Portable Witness manifest action on the canonical individual-Work surface only
**Deployment/publication:** **Not authorized and not performed**

## Result

The owner-authorized individual-Work `living-nexus-player/1` manifest action is now exposed on the active canonical Work route, `/song/:id`, rather than only in the inactive legacy `SongDetailPage` implementation.

On an eligible owner’s Work, **Chain of record** now keeps the WID and **Verify** link intact and adds a subtle **Manifest** group with:

- **Copy manifest**
- **Download .json**
- Short paste guidance: `Provenance Player → Add → LN manifest → Paste`

The action reuses the existing protected `songs.copyProvenancePlayerWorkManifest` procedure and shared serializer. It does not create a new manifest schema, database record, cache, storage location, audio instance, queue, player, or registry authority.

## Files changed

| File | Change |
|---|---|
| `client/src/pages/loop/LoopWorkPage.tsx` | Added the owner-only canonical Work manifest action at Chain of record, using existing copy/download helpers and the existing protected procedure. Pending state, concise generic unavailable feedback, keyboard-focus styling, and mobile-wrapping buttons are included. |
| `client/src/pages/SongDetailPage.tsx` | Removed the unreachable duplicate individual-Work manifest UI and its local export handler. No active route lost functionality. |
| `server/tests/provenancePlayerManifestExport.contract.test.ts` | Moved the UI-route assertion to `LoopWorkPage`, requires the owner/WID gate and Portable Witness instruction, and rejects the legacy duplicate. |
| `server/tests/provenancePlayerManifestClient.test.ts` | Added regression coverage proving clipboard text and downloaded Blob text are byte-for-byte identical canonical JSON. |
| `refinement/lessons/lessons-log.json` | Added the bounded institutional-memory lesson for canonical-surface relocation and copy/download parity. |

## Active route and authorization evidence

`client/src/App.tsx` routes `/song/:id` to `LoopWorkPage`; `SongDetailPage` is not the active canonical Work surface. The new action is deliberately rendered only when both `isOwner` and `wid` are present.

The client calls only:

```ts
utils.songs.copyProvenancePlayerWorkManifest.fetch({ songId: song.id })
```

The established server procedure remains the authority for ownership and eligibility. The implementation does not rely on the UI condition as an authorization decision.

### Real protected-procedure check — read-only

A direct read-only invocation against the configured data produced:

| Check | Result |
|---|---|
| Owner request for Work `60001` | Returned `living-nexus-player/1` with one track |
| Canonical identity | `workId: "60001"`, `wid: "WID-MUS-F61EC526-F2E36FBC"` |
| Audio URL | `https://www.livingnexus.org/api/provenance-player/media/60001` |
| Raw storage host in `audioUrl` | Absent |
| `fileUrl` field in track | Absent |
| Non-owner request | Rejected: `NOT_FOUND: Manifest unavailable` |

A public artwork URL may legitimately use the platform CDN. It is not the audio media field and does not weaken the gateway-only audio boundary.

## Behavior and safeguards

- **Owner-only presentation:** controls render only for an owner with a WID.
- **Server-side authority:** the existing protected procedure rejects a non-owner regardless of UI state.
- **Eligibility:** the adapter remains authoritative for current public/published audio, WID, clean-media, unflagged, withdrawal, attribution, size, and ambiguity checks.
- **No raw audio leakage:** audio uses the existing revocable Living Nexus media gateway, not a storage URL.
- **Copy/Download equivalence:** both use the same canonical serializer; the new regression test compares clipboard text and the download Blob exactly.
- **Error handling:** unavailable manifests retain the existing generic error and do not disclose protected eligibility details.
- **Playback continuity:** the route contract asserts the manifest handler does not call `playQueueAt`; no PlayerContext, Global Player, queue, or audio instance changed.
- **No duplicate individual-Work control:** the legacy page no longer contains the individual Work manifest procedure or handler.

## Validation

| Validation | Result |
|---|---|
| Focused manifest authorization, adapter, active-route, and copy/download parity contracts | **4 files, 26 passed** |
| TypeScript | **`pnpm check` passed** |
| Full regression suite | **148 files passed, 1 skipped; 914 passed, 1 skipped** |
| Production build | **`pnpm build` passed** |
| Diff whitespace | **`git diff --check` passed** |
| Local dev/LSP diagnostics | **No TypeScript errors** |
| Guest canonical Work inspection | WID and Verify render; Copy/Download/Portable Witness actions do not render |
| Mobile guest smoke | Canonical Work page rendered at 375 × 812 without a new manifest-control overflow because no non-owner controls were emitted |
| Refinement measurement | Existing platform baseline remains **70/100, C**; no unrelated debt was addressed in this bounded slice |
| Reusable skill | `living-nexus-portable-witness-manifests` passed `quick_validate.py` |

### Browser limitation, stated precisely

The local preview did not have an authenticated owner session that could be reused without interacting with production OAuth. Therefore this slice does **not** claim a browser click-through as the actual owner. Instead it verifies the real owner exporter read-only, the real non-owner rejection, the actual guest canonical UI, UI/route contracts, and exact copy/download serialization.

A post-publication staging acceptance should still authenticate an eligible owner and exercise both browser buttons end-to-end. That is a release acceptance gate, not a reason to expand this source slice or alter production today.

## Visual evidence

Guest screenshots were captured for the local canonical Work route at desktop and 375 × 812 mobile. The desktop initial capture showed the pre-existing local “What’s New” overlay; the settled guest DOM confirms the expected public state: WID/Verify visible and all owner-only Portable Witness controls absent. This is correct non-owner behavior. No production visual claim is made.

## Non-changes

No changes were made to:

- Database schema, migrations, production data, Draft Releases, collections, or stored media
- Work WIDs, registry records, history, HAAI declarations, or creator permissions
- Manifest schema or media-gateway authorization
- Global Player, PlayerContext, queue, playback session, or audio engine
- WID-ALB2, creator signing keys, edition issuance, Archive, Studio, Registry verification, or PWA behavior
- Deployment, publication, or release status

## Remaining release boundary

This is a source checkpoint candidate only. Production remains under the existing release freeze and is not declared launch-ready. The previously identified PWA activation diagnosis and authenticated creator staging acceptance checklist remain separate release gates.
