# ADR — Work Metadata Boundaries

**Status:** Accepted for bounded implementation  
**Scope:** Music Register, existing Work editing surfaces, and public Loop Work presentation  
**Decision date:** 2026-09-08

## Context

The Music Register currently applies a creator profile’s `primaryGenre` directly to a fresh Work whenever its genre state is empty. This makes profile classification appear to be inherited Work metadata and can cause the Work genre selector to begin with an unchosen value. Separately, the public Loop Work surface treats generic description and caption fields as fallback Origin testimony, which permits editorial metadata to appear as a provenance declaration.

## Decision

Work classification, participation, and Origin are distinct data planes. A Work genre selector initializes only from its own persisted/prefilled Work genre value. A creator profile’s primary genre may be shown as a non-binding suggestion, but it is never selected or serialized for the Work unless the creator explicitly selects it.

Where a Work has selected genres, Register and the two existing Work-edit surfaces expose a local **Clear All** control. It clears only in-memory selection state. It does not mutate profile preferences, Origin, WID, provenance, or any persisted Work data until the creator performs the existing save or publish action.

| Data plane | Source of authority | Presentation rule | WID / provenance effect |
|---|---|---|---|
| Work classification | Work `genre` metadata | Selected Work tags and explicit suggestion controls | Editorial; existing semantics retained |
| Creator profile preference | Creator `primaryGenre` | Suggestion only; never a preselected Work tag | None until creator explicitly selects it for the Work |
| Participation / authorship | Work participation declarations | Dedicated participation display | Existing registration semantics retained |
| Origin / testimony | Work `haaiOriginStory` | Dedicated Origin/Testimony field only | Existing declaration and record semantics retained |
| Caption / description | Work editorial fields | Editorial display only; never presented as Origin | Existing semantics retained |

The public Work Origin section displays only `haaiOriginStory`. If it is absent, the surface truthfully states that no origin testimony has been recorded; it does not substitute description or caption.

## Consequences

Fresh registration no longer silently inherits creator-profile classification. Creators can choose a suggested genre deliberately, and existing audio metadata suggestion behavior remains unchanged. Public visitors can distinguish a Work’s classification and participation data from its creator-declared Origin.

No schema migration, WID reissue, provenance repair, publication transition, storage change, or mutation of existing Work/profile data is part of this repair.

## Rejected alternatives

Automatically copying profile genres was rejected because it obscures creator choice and blurs profile preference with Work-specific classification. Continuing to fall back from Origin to description or caption was rejected because editorial copy is not a substitute for creator testimony. Generating an AI Origin summary was rejected for this repair because the issue is data separation, not missing content.
