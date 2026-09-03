# ADR — Global Player Access and Action Coherence

**Status:** Approved for bounded repair under Doc’s standing release direction.

## Observed defect

At normal 100% desktop zoom, the expanded global-player view makes its lower material feel cut short. The audit found stale desktop layout allowances from the former bottom-player era: `MainLayout` retains 130px of desktop bottom padding and the floating steward offset retains a 140px desktop base, even though desktop playback is now centered in the TopBar.

## Decision

This repair removes only the stale desktop allowances and preserves the player’s existing bounded expanded scroll region, portal, playback state, queue, and overlay layer.

The same release will correct only confirmed action mismatches:

| Action | Correct behavior |
|---|---|
| TopBar shuffle/repeat | Delegate to the authoritative PlayerContext callbacks rather than visual-only local state. |
| Player **View Queue** | Open the already-embedded expanded queue instead of routing to Archive. |
| Public Work **Part of album** | Route directly to the existing specific album surface (`/album/:collectionWid`), rather than only the creator-wide album shelf. |

## Explicitly excluded

No redesign, player state model replacement, queue behavior change, WID/provenance mutation, collection membership change, payment change, or route-schema change is authorized. Any action that requires authentication or creates data retains its current authority and feedback.
