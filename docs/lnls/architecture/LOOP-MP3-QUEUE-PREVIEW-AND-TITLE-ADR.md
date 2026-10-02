# ADR — Loop MP3 Queue Preview and Title Proposal

**Status:** Accepted  
**Date:** 2026-10-02

## Decision

The pre-review MP3 Queue may provide three local controls before a record enters the existing Loop registration environment:

1. **Preview audio** using a browser object URL created from the selected source, with a local scrub control and elapsed/duration feedback.
2. **Set a review title** that pre-fills the canonical Work title field.
3. **Clear all** selected queue records and return to intake.

## Identity and Registry Boundary

- The preview never enters the global player queue, creates a server request, or changes a registration state.
- Preview position and playback state exist only in browser memory. Scrubbing does not edit the source file or become provenance evidence.
- The review title is a creator-controlled proposal for the existing canonical Work title input. It does **not** rename the immutable browser `File`, change source bytes, or alter hash evidence.
- Each record still reaches its own metadata review, participation disclosure, attestation, Witness ID sealing, and draft/publish decision.
- Clearing the queue revokes temporary object URLs and removes only browser-memory selections. It does not delete, unregister, or alter any Work.

## Accessibility and Interaction

- Preview controls expose distinct Play/Pause labels and end/error state.
- With a queue card selected, **Space** plays or pauses its local preview; **←/↑** and **→/↓** move the active queue card. The handler never captures input, textarea, select, button, slider, or contenteditable keystrokes.
- Editable review titles are labeled and preserve the original filename as source evidence.
- Each review title visibly states whether it remains **From source filename** or is **Edited for review**. This label does not assert any change to the source file.
- Clear All uses a clear destructive label and a minimum touch target.
- Pointer and keyboard sorting remain available before review begins.

## Alternatives Rejected

| Alternative | Reason rejected |
|---|---|
| Rename the actual `File` object | Browser file identity is immutable; simulating a file rewrite would blur source evidence and hash integrity. |
| Add previews to the global player | A selected source is not yet a registered Work and must not be treated as part of the public playback surface. |
| Carry the queue title directly into the WID payload | The existing title review must remain creator-verifiable before sealing. |
