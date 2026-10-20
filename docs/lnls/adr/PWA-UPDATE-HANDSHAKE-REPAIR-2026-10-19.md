# ADR — Listener-Approved PWA Update Handshake Repair

**Date:** 2026-10-19  
**Status:** Implemented and locally validated; not published or deployed  
**Scope:** The global “A new version of Living Nexus is available” update notice and the service-worker activation handoff.

## Decision

Use an explicit, one-shot **listener-accepted update intent** to decide whether a `controllerchange` performs a document reload. The intent is raised only when the update notice's action is selected, and cleared if activation times out or cannot start.

The update notice must immediately enter an `activating` state, disable duplicate action clicks, and announce **Updating…**. If the waiting worker does not take control in a bounded interval, preserve the notice and offer a visible retry state.

## Evidence

`main.tsx` currently captures `hadController` once at startup. On a first uncontrolled page load, the initial worker's `clients.claim()` correctly fires a controller change without reloading. If that same tab later finds another worker, the banner appears, but a listener-selected `SKIP_WAITING` activation can still be evaluated against the original `hadController === false`; the controller-change callback returns without a reload. The banner has no progress, timeout, or failure state, so the user sees an apparently inert Reload button.

## Constraints preserved

- A worker still waits until a listener explicitly selects the update action; no install-time `skipWaiting()`.
- No global caching shutdown or cache-strategy rewrite.
- No PlayerContext, queue, or second audio owner change.
- A listener is informed that updating reloads the page and may interrupt current playback.
- First worker activation continues to avoid an unsolicited reload.

## Alternatives rejected

1. **Always reload on `controllerchange`:** would restore the unwanted reload after first service-worker claim.
2. **Call `skipWaiting()` during install:** would interrupt an active listener without consent.
3. **Blindly call `window.location.reload()` on every banner click:** masks a failed activation and may continue under the old controller/cache.
4. **Disable static caching globally:** treats the symptom by sacrificing offline/performance behavior.

## Validation

- Regression contracts require explicit intent before a controller-change reload, reject the stale `hadController` gate, require pending/retry UI state, and preserve listener-approved `SKIP_WAITING`.
- TypeScript, focused tests, production build, diff integrity, full test suite.
- Browser verification exercises update-notice state presentation and does not claim a complete live service-worker lifecycle where browser tooling cannot inspect worker state.

## Rollback

Revert only the update-handshake module, bootstrap listener, banner UI, and corresponding focused contracts. The service-worker cache and message protocol remain compatible.
