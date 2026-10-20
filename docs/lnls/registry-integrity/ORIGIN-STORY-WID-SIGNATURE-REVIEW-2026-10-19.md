# Registry Integrity Review — Origin Story / WID Signature Classification

**Status:** Open review required. No production behavior, WID, signature, migration, or historical record was changed by this note.

## Confirmed discrepancy

`shared/preparedWorkRegistration.ts` classifies `originStory` as `widBound`, while the actual `serializePreparedWorkWidPayload` function serializes only:

- `fileHash`
- `title`
- `participation`
- `toneLabel`
- `timestamp`

The current signature payload does **not** include Origin Story testimony.

## Integrity implication

The platform must not represent the current Origin Story text—or a future Creator reference within it—as cryptographically sealed by the original WID. Origin Story is persisted Work testimony, but its relationship to signature binding must be reconciled explicitly before any registry-language or signature-contract change.

## Required review questions

1. Is the field-classification list wrong, or is the serializer incomplete relative to the intended registry contract?
2. If the serializer changes in a future registry version, how will WID versioning and historical verification remain truthful without resealing/replacing legacy WIDs?
3. Which public and owner-facing phrases currently imply signature binding and need correction?
4. What append-only migration/attestation approach preserves existing historical evidence?

## Boundary

This review is deliberately separate from the approved participation-declaration correction. Correcting a current Music/Lyrics/Voice disclosure writes an append-only event and preserves the existing WID; it does not change the original signature payload.
