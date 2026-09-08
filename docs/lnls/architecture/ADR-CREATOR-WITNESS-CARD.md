# ADR — Creator Witness Card

**Status:** Accepted for bounded implementation  
**Scope:** Public creator-domain surfaces and the existing QR Identity Card artifact only  
**Decision date:** 2026-09-07

## Context

Living Nexus already includes `QRIdentityCard`, a 480 × 760 downloadable canvas artifact, and the QR share router. The existing creator page has public identity, profile imagery, testimony, and canonical handle information. The requested Creator Witness Card should refine those foundations rather than introduce a parallel creator-card or QR system.

## Decision

Every public creator page will expose a **Creator Witness Card** action in its hero. The action opens the existing QR Identity Card modal and preserves its PNG download, copy-link, and native-share affordances. For a creator card, the QR payload must resolve to the canonical creator domain directly. It is a routing artifact, not a new canonical provenance record and not an asserted WID.

The card uses the following public asset order: creator banner, creator avatar, and then the existing neutral artifact fallback. It must never generate, infer, composite, or alter a creator’s face or likeness. The displayed name, handle, and short description derive from existing public profile declarations. Where testimony is unavailable, the card may state only that the creator has a Living Nexus identity page; it must not claim provenance, testimony, WID status, or authorship that the page has not established.

| Concern | Creator Witness Card rule |
|---|---|
| QR target | Canonical `/creator/{handle-or-id}` URL on the current public origin |
| Artifact size | Existing 480 × 760 portrait canvas retained for print and shirt artwork workflows |
| Imagery | Existing public banner → avatar → neutral fallback only |
| Identity copy | Existing display name, handle, and declared profile description only |
| Canonical authority | Creator page remains canonical; QR card is a share/print artifact |
| WID/provenance | No WID is created, copied, or claimed by the card |
| Tracking | Direct canonical creator QR does not require a new QR-share database record |

### Full-vertical composition refinement

The card is an identity artifact, not a banner with decorative copy beneath it. The creator-owned visual therefore occupies the complete vertical canvas as a `cover` field with the declared crop position as its focal point. Identity, testimony, and QR each occupy protected contrast planes over that field. The visible preview may slowly drift the underlying art only; it must respect `prefers-reduced-motion` and never move text or the QR. The downloaded PNG remains a still composition.

The card-rendered testimony is a labelled excerpt for print hierarchy only. The complete creator-declared testimony is retained as selectable, readable text below the card preview within the modal. No card change may truncate, remove, rewrite, infer, or subordinate that statement to visual treatment.

### Showcase art and Origin-summary refinement

Public creator banner and avatar assets may depict a character, symbol, environment, or portrait. The card must therefore label the image as **Creator-provided art** and must never assert that the depicted subject is the creator. Creator identity is established by the declared name and handle, not by the image.

The compact canvas copy defaults to an exact, source-labelled **Creator-declared Origin excerpt**. An optional AI-assisted Origin summary may be introduced only from creator-approved declared Origin/testimony context, must carry the explicit **AI-assisted Origin summary** label, and may never replace, conceal, or revise the complete original declaration presented beneath the card. It remains presentation copy, not a provenance, legal, authorship, or likeness claim.

## Consequences

The QR card becomes available wherever the active public creator page renders, while retaining existing creator-page routing, ownership, domain arrangement, player, and testimony behavior. The visual artifact may be downloaded for creator-controlled print use, including T-shirt preparation, but Living Nexus does not certify commercial rights or manufacture claims through the card.

## Rejected alternatives

Generating a new face/portrait treatment for every card was rejected because it could fabricate or alter creator likeness. Creating a second creator-card or QR subsystem was rejected because it duplicates existing QR/card logic. Treating a QR scan as a proof or WID event was rejected because scans are social routing events, not canonical registry actions.
