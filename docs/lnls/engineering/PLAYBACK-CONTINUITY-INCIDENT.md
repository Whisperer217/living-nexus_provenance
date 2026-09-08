# Playback Continuity Incident

## Symptom

During active playback, Living Nexus can appear to reset and the music stops. The reported experience is not yet tied to a single reproducible gesture, route, device, or browser.

## Expected contract

Once a listener explicitly starts a Work, the audio engine, selected track, queue snapshot, position, volume, and play state must remain continuous through ordinary React renders, query refreshes, album/list updates, drawer activity, and client-side route changes. A full document unload may stop audio, but it must be distinguishable from an in-app update and must not occur silently as a side effect of ordinary background activity.

## Current evidence

| Boundary | Observed source behavior | Diagnostic meaning |
| --- | --- | --- |
| Audio owner | `PlayerProvider` is mounted above `App`; it uses a module-level `HTMLAudioElement` singleton. | Ordinary page and album component remounts should not replace the audio element. |
| Queue ownership | The active queue is a session snapshot; `QueueLoader` seeds only before a session queue exists. | Feed/query refreshes should not overwrite an active playback queue. |
| Full unload | The audio singleton pauses and clears `src` on `beforeunload` and `pagehide`. | Any full reload, redirect, browser refresh, or document lifecycle teardown will intentionally end playback. |
| Service worker | The worker calls `skipWaiting()` during install and `clients.claim()` on activation. A subsequent controller change calls `window.location.reload()` for an already controlled tab. | A production worker update is a credible full-reset vector. |
| Pull to refresh | MainLayout maps a completed mobile pull gesture to `window.location.reload()`. | An accidental mobile pull gesture is a credible full-reset vector. |
| Session loss | A previously authenticated tab receiving a non-guest-safe 401 redirects through `window.location.href`. | Authentication expiry or an unexpected protected-query 401 is a credible full-reset vector. |
| Chunk recovery | The Error Boundary auto-reloads once after a dynamic chunk-load failure. | A stale deployment/chunk pairing is a credible but secondary full-reset vector. |

## Confirmed treatment

The production service worker had an automatic takeover path: `skipWaiting()` ran on every installation, activation claimed existing clients, and a controller change in an already controlled tab invoked `window.location.reload()`. A deployment could therefore reload an active listener’s tab and trigger the intentional `beforeunload`/`pagehide` audio teardown without the listener choosing an update.

The repair removes automatic `skipWaiting()` from installation. An update now waits until the existing Update Available control explicitly sends `SKIP_WAITING`; the controller-change reload remains correct only in that listener-approved flow. Playback remains streamed from its durable audio URL through the existing app-wide singleton—no audio storage or streaming architecture change is required.

## Boundaries

This investigation must not alter WIDs, provenance, Work/album data, playlists, storage, payments, or audio source custody. No “mount instead of stream” migration is indicated at this stage: the engine is already app-wide and playback still streams from its durable source. The remaining work is to distinguish a true document reload from a player-state failure, then remove only the evidenced interrupting path.

## Required observations

Development diagnostics must record, behind an explicit local flag only: PlayerProvider mount/cleanup identity, audio `play`/`pause`/`ended`/`error`/`emptied` events, source changes, route changes, `pagehide`/`pageshow`/`visibilitychange`, service-worker controller changes, pull-to-refresh completion, and forced redirect/reload reasons. The record must preserve timestamps and the last known successful audio state.

## Listener questions

The decisive reports are: whether the browser visibly reloads; the device/browser and whether the event occurs on mobile; whether it follows a downward pull, navigation, update notice, account/session change, album action, or an error screen; whether the address changes; and whether it occurs when the tab is backgrounded or returns from background.
