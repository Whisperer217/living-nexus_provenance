# ADR — Creator Identity Disclosure, Cathedral Accent, and Route Refinement

**Status:** Approved by creator direction; implementation in progress

## Decision

Living Nexus will make Home creator identity cards disclose a complete handle on deliberate desktop hover/focus without allowing the compact card grid to expand or overflow. The disclosure is presentation-only and will retain Home's existing route form: `/creator/:handle` when a public handle exists, otherwise `/creator/:id`. The broader application also supports the distinct public-domain route `/:@handle`; the audit corrected its previously non-matching string declaration to a router-supported named-capture expression.

Creative Cathedral will keep its deliberate protected dark work surface across all global themes. Its internal panels will replace repeated hard-coded parchment opacity and amber borders with a small set of Cathedral surface tokens. Those tokens may inherit the selected theme's gold accent, but will not invert the workspace on Parchment Cream. Mobile gutters will remain at least one rem where the workspace is visible, and evidence/body labels will remain at least twelve pixels.

Creator-domain and Arrange-domain review is verification-first. No route, save, or layout-authority code will change unless mechanical checking finds a confirmed broken route or reflected-save defect.

## Authority and Privacy Boundaries

This refinement does not create or promote creators, modify creator profiles, write Works, change collection membership, alter WIDs, append provenance, publish media, or invoke Creative Cathedral review. It exposes only the handle already used by the public creator card and preserves public creator eligibility requirements.

## Alternatives Considered

| Alternative | Decision |
|---|---|
| Always wrap long handles inside the card | Rejected: creates uneven card heights and mobile density drift. |
| Replace all creator routes with a single route family | Deferred: both `/creator/:id-or-handle` and `/:@handle` are registered and serve existing surfaces. This refinement verifies both rather than rewriting established navigation. |
| Make Cathedral inherit light workspace surfaces in Parchment Cream | Rejected: weakens its protected evidence workspace and risks low-contrast context/proposal content. |
| Add a worker to check creator routes | Rejected: mechanical navigation tests and current read-only public queries are sufficient; no background action is warranted. |

## Validation

The release must pass focused contracts, TypeScript, full regression, build, refinement, desktop/mobile checks, all four supported theme checks, and a mechanical route inventory for creator-domain and owner Arrange-domain access.

## Rollback

Revert the presentation component and token changes. The refinement is schema-free and has no data migration or authority-bearing side effect.
