# ADR — Loop MP3 Queue Registration

**Status:** Accepted  
**Date:** 2026-10-02

## Decision

Loop gains an **MP3 Queue** intake mode alongside the existing single-audio registration path. Queue mode is intentionally not a bulk registration operation. It is a bounded browser-memory queue (maximum 20 files) that opens **one Work at a time** in the existing Loop registration environment.

Each selected MP3 must independently pass the same path already used for a single Work:

```text
MP3 source
  → embedded-metadata inspection
  → Detected Record review
  → creator-controlled participation disclosure
  → attestation
  → WID sealing
  → Draft or Publish choice
  → songs.upload
  → next queued MP3
```

No WID, disclosure, consent, Creator Cathedral suggestion, visual identity, publication choice, or attestation is inherited from a previous queued record.

## Scope

Queue mode accepts files with the `.mp3` extension only. The browser provides immediate feedback for rejected files, and the final audio request carries a `loop-mp3-batch` intake marker. The existing upload route verifies that marker and rejects a source that is not an MP3 before storage.

The source filename and browser MIME declaration are insufficient authority by themselves. The server additionally parses the submitted bytes with the existing `music-metadata` dependency and requires an MPEG container.

## Boundaries

- This does **not** replace the private Batch Upload preparation surface. That surface retains its provenance-receipt function and does not create Works, WIDs, or Collections.
- This does **not** change Loop’s single-file audio support. A creator can still register supported non-MP3 audio through the single path.
- The queue is intentionally in memory only. A page refresh, browser close, or cancelled intake does not claim durable recovery. Durable queue recovery requires an authenticated server-side operation with item-level registration receipts and is not introduced here.
- The queue does not automatically create an album or collection. Existing collection assignment remains an explicit per-Work creator decision.

## Arrangement, Progress, and Intake Feedback

- Before the first review begins, the creator may arrange the in-memory MP3 queue by drag and drop (with keyboard-accessible sorting support) or remove a selected source. This only changes the review order; it does not change file bytes, extracted evidence, disclosure, WID, publication state, or a Collection relationship.
- Once a record enters the existing Loop review environment, queue order is frozen. The progress display reports completed Works, the current record, and records remaining after the current review; it does not imply that a current or queued source is registered.
- Non-MP3 selections and selections above the twenty-record limit produce a visible alert and an immediate toast. Accepted records can still be arranged; rejected or excluded sources remain outside the browser-memory queue.

## Rationale

A multi-file picker must not convert a set of tracks into one provenance claim. Keeping the established Creator Cathedral review and disclosure controls per Work protects the distinction between creator input, extracted evidence, and registry authority.

## Verification requirements

- Client rejects non-MP3 queue candidates before review.
- Server rejects a `loop-mp3-batch` source that lacks a valid MP3/MPEG parse result.
- Completion advances only after a successful `songs.upload` response.
- Every successful queue item creates its own WID through the existing sealing path.
- Existing single-file audio intake remains available and unchanged in supported formats.
