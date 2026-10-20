# ADR — Bound Work Target for Player Comment Drafts

**Date:** 2026-10-20  
**Status:** Implemented and development-validated; authenticated pre-publication browser acceptance remains  
**Scope:** The Global Player comment panel and the canonical comment mutation boundary.

## Decision

A comment composer captures a canonical numeric Work ID at open time. It is not re-derived from moving playback state at submission. The panel displays that bound Work, keeps independent drafts by Work ID, and offers an explicit **Switch to Current Track** action. Playback remains free to advance without modifying a listener’s declared intent.

The existing comments router remains the only comment system. It resolves and authorizes a target Work before writing any interaction event or comment, and it verifies reply-parent/Work coherence.

## Rejected alternatives

- **Clear every draft on track change:** safe but discards listener intent and contradicts the required preservation behavior.
- **Derive target from now playing at submit:** current defect; unsafe.
- **Tie the target to cinematic preview:** preview is presentation state, not listener intent.
- **Add a second player/comment subsystem:** duplicates authority and increases drift.

## Consequences

No WID, queue, audio source, historical comment, or media relationship changes. The target snapshot can become unavailable before submit; in that case server authorization rejects the mutation and the draft remains available for the listener to revise or discard.

## Validation record

Focused player-draft, target-policy, router-integrity, and route-bound Voices tests passed (22 assertions). TypeScript, production build, full regression (831 passing, 1 intentionally skipped), and diff integrity passed. The local anonymous browser had no runtime console error but did not provide an authenticated playable Work; reproduce the explicit A → B → submit acceptance on a review/staging deployment before publication.
