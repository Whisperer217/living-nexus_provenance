# ADR — Home Creator Identity Layer

**Status:** Implemented under Doc’s standing release direction.

## Decision

Home will show a dedicated **Creator identities** layer below Limited Showcase. Each eligible creator receives a larger direct link to their existing creator domain, expressed as a circular public avatar or initial-based sigil above a readable handle plate.

Eligibility remains the established public creator model: a creator must have a real public name or artist handle and at least one Published Work. Authentication alone does not expose a profile. The existing `profile.featuredCreators` projection already supplies this boundary and refreshes from the live database.

## Presentation inputs

| Input | Use | Restriction |
|---|---|---|
| `profilePhotoUrl` | Creator-uploaded circular avatar | Public projection only. |
| `bannerUrl` | Optional card background texture | Public projection only. |
| Creator ID | Stable six-color aura selection | Deterministic; no profiling. |
| `publishedCount` | Aura intensity and public-work label | Verifiable published Work count only. |
| Name / handle | Identity plate and accessible link label | Existing public identity only. |

The Home query refreshes while the visitor is on Home after 60 seconds and on window focus. This keeps newly eligible creators current without adding a background worker, queued job, or artificial activity record.

## Boundaries

This is a read-only Home presentation change. It does not create profiles, fabricate avatars or engagement, change showcase rank, mutate Work or creator records, or alter WID, provenance, support, publication, media storage, or payment behavior.

## Rollback

Revert the Home creator-card projection and its focused regression coverage. No database migration or persistent data rollback is required.
