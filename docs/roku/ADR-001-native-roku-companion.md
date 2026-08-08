# ADR-001: Native SceneGraph/BrightScript Companion Channel

| Field | Decision |
|---|---|
| Status | Accepted |
| Date | 2026-08-08 |
| Scope | Public, read-only Living Nexus content on Roku devices |
| Decision owner | Living Nexus platform architecture |

## Context

Living Nexus needs a television experience that preserves creator attribution and provenance, without pretending that a modern React website can be rendered reliably in Roku's constrained application environment. The existing platform already exposes public music, creator, and Witness ID information through REST v1.

## Decision

Build a separate **native SceneGraph/BrightScript** application in `roku/`. It will use a persistent `Task` node and HTTPS JSON feed to load a Roku-specific public endpoint at `/api/v1/roku/home`. It will present three intentional surfaces: a cathedral landing scene, a browsable collection of audio manifestations, and a provenance-aware detail/player surface.

The read model will contain only public content and absolute URLs. It will retain four provenance anchors for every eligible work: creator attribution, WID, registration date, and a canonical verification URL. The Roku client will render those values as immutable presentation fields; no edit, upload, or payment mutations will exist in the first release.

## Alternatives Considered

| Alternative | Decision | Rationale |
|---|---|---|
| Wrap the React site | Rejected | Roku does not provide a general-purpose WebView suitable for complex modern websites; the result would not deliver an acceptable remote-first experience |
| Reuse generic `/api/v1/catalog` directly | Rejected | It lacks an intentional home layout, absolute URL contract, and Roku-specific field names required for a stable TV client |
| Build a separate backend or copy data | Rejected | It would fracture the permanent registry and create a second, stale source of truth |
| Native SceneGraph with a server-projected feed | Accepted | It matches Roku's component model and keeps provenance retrieval authoritative, bounded, and cacheable |

## Layer Alignment

| Living Nexus layer | How the decision strengthens it |
|---|---|
| Identity | Creator name and handle remain visible on every work surface |
| Manifestation | Audio works receive a deliberate living-room presentation |
| Relationship | Home rows project creator and genre context without flattening ownership |
| Registry | WID and canonical verification links remain read-only and traceable |
| Stewardship | The first release preserves a clear pathway back to the creator's web profile rather than adding opaque TV commerce |
| Legacy | A native client expands discoverability without duplicating the record itself |

## API Contract

`GET /api/v1/roku/home` returns a compact JSON document with a stable schema version, absolute URLs, a maximum of three rows, and a bounded number of items per row. Each item contains standard SceneGraph content fields together with custom provenance metadata. The endpoint is public, rate limited through the existing REST middleware, and cacheable for a short interval.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Roku device cannot resolve a relative stream or verification URL | Server returns absolute HTTPS URLs based on the request host |
| Complex provenance graph overloads the TV UI | Home feed includes a compact projection; full canonical lookup remains a one-action detail request |
| Network latency blocks remote navigation | Network calls and JSON parsing are isolated in a Task node and the feed stays bounded |
| Audio source is unsupported on a target device | Channel supplies content format metadata and reports an actionable playback error; production media validation remains a release gate |
| Contract drift breaks an installed channel | Include `schemaVersion` and test the projection before every server release |

## Testing and Rollback

The backend contract will receive a Vitest coverage check for its schema and URL-building behavior. TypeScript compilation will validate the server change. The Roku source will be statically inspected, documented for sideloading, and must be tested on a physical developer-mode Roku before Streaming Store submission. The server-side change is independently reversible by removing only the `/api/v1/roku/home` route; no database migration or record mutation is involved.

## References

[1] [Roku Developer: Developing SceneGraph applications](https://developer.roku.com/dev/docs/developing-scenegraph-applications)

[2] [Roku Developer: Task node](https://developer.roku.com/dev/docs/task)

[3] [Roku Developer: Packaging Roku apps](https://developer.roku.com/dev/docs/packaging-channels)

