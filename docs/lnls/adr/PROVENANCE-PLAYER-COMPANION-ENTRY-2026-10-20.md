# ADR — Provenance Player Companion Entry

**Date:** 2026-10-20  
**Status:** Implemented and validated — development-only, not published  
**Scope:** Global Player expanded action dock, mobile expanded action section, and cinematic controls only

## Context

Living Nexus needs a discoverable entry to the separately hosted Provenance Player at `https://provenanceplayer.netlify.app/#/home`. The first step must remain a companion link, not an integration claim.

## Decision

Add an external anchor labeled **Open Provenance Player** in the existing desktop expanded action dock, mobile expanded action section, and cinematic control surface. Each anchor opens a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

Each surface must identify it as an **experimental companion player** and state that Living Nexus account sync, WID verification, and shared playback are not active.

## Boundaries

- Do not send any account, session, track, WID, creator, or queue data to the external site.
- Do not modify `PlayerContext`, audio instances, queue state, playback state, registry procedures, WID records, or authentication.
- Do not add an embed, popup bridge, manifest, API, credential, database field, schema, or migration.
- Opening the link in a separate tab leaves the active Living Nexus tab—and therefore its canonical audio engine and queue—untouched.

## Alternatives rejected

1. **Embed the external player:** would create conflicting audio, lifecycle, and permission boundaries.
2. **Pass a track/WID in the URL:** would imply an unauthorized manifest or registry relationship.
3. **Account handshake now:** requires a separate security and authorization design.

## Follow-up evaluation

A future proposal may evaluate secure Living Nexus account connection, authorized track manifests, local library access, and synchronized playback. It must establish consent, token boundaries, auditability, registry semantics, and single-audio-authority rules before implementation.

## Validation

- Desktop expanded, mobile expanded, and cinematic controls contain the same external URL and disclosure.
- The link is keyboard accessible, uses visible focus treatment, and remains legible on mobile.
- The companion-link blocks contain no playback, navigation, queue, account, registry, or WID mutation.
- TypeScript, focused contracts, production build, full regression suite, visual desktop/mobile checks, and diff integrity pass before checkpoint.

## Completed validation

- TypeScript: `pnpm check` passed.
- Focused player contracts: 4 files / 17 tests passed.
- Full regression suite: 134 files / 834 tests passed, 1 intentionally skipped.
- Production build passed. Its existing large-chunk advisory remains outside this scoped change.
- Isolated 375×812 mobile validation confirmed a visible 341×44 px companion link with no horizontal overflow; the disclosure stayed within the 17 px page margins.
- `pnpm refine` retained the existing broad 70/100 (C) platform baseline. Its unrelated typography and design-drift debt is not expanded by this companion entry.
- No external companion tab was opened during validation; the control was inspected as a static separate-tab anchor only.
