# Living Nexus — PWA Update Timeout Follow-up

**Date:** 2026-10-20  
**Status:** Investigation completed; no product-code change retained  
**Scope:** Listener-approved service-worker update completion only.  
**Out of scope:** PlayerContext, audio queue, cache strategy, offline behavior, install flow, comments UI, WIDs, registry records, and publication.

## Confirmed cause

The visible sequence reported by the listener—**Applying the update…** followed by **The update did not finish. You can try again.**—identifies the browser page’s eight-second `activation_timeout` path in `client/src/main.tsx`. The page had found a waiting worker, sent `SKIP_WAITING`, then did not observe the controller change that its existing success path expects.

Source inspection identified cache cleanup ahead of `clients.claim()` as a plausible timing suspect. It was **not** a confirmed cause. An isolated Chromium lifecycle experiment registered an old worker, installed a replacement worker whose activation was held by a real nine-second network response, sent `SKIP_WAITING`, and observed the replacement become the existing page’s controller in about 162 ms. The page’s own eight-second callback never became relevant because the controller changed promptly. Therefore the experiment disproves the inference that a long activation `waitUntil()` alone necessarily delays the controller-change signal for an already-controlled page.

The remaining confirmed fact is only the client timeout. The underlying live condition is still undetermined: the worker message might not have produced activation, the worker may have become redundant, or an activation failure may have occurred before the page changed controller. The current production protocol provides no worker-specific acknowledgement or error detail to distinguish these cases. No cache, player, queue, or reload-path change is justified from this evidence.

## Decision

The proposed slow-progress product change was reverted before checkpoint because its premise was disproven by the isolated lifecycle test. The existing listener-approved update policy remains intact.

If the failure recurs, collect the waiting worker’s state before and after the click and capture worker-console/cache-operation errors in a browser that permits service-worker inspection. Only then should a follow-up add a worker-bound acknowledgement or state-aware failure message. That work must preserve listener approval, initial-claim no-reload behavior, cache strategy, and PlayerContext continuity.

## Evidence and validation

- Existing source contracts from the prior repair remain green: 3 files / 12 tests.
- The isolated real Chromium test verified that an existing controlled page can receive a replacement worker controller change before a nine-second activation hold completes. This is negative evidence against the proposed cache-delay fix, not a test of the live site.
- The connected live browser does not presently expose console-evaluation or service-worker-inspection capability through its browser bridge, so its worker state could not be queried safely.
- No application source changed. The follow-up is documentation-only and does not claim a deployment or publication.

## Remaining risk

Listeners may still encounter the same generic eight-second update failure until a directly observed worker-state trace identifies the actual activation failure. The normal recovery remains a browser refresh, but cache clearing is not a supported routine remedy and has not been proposed.
