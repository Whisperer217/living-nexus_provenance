# Living Nexus Roku Channel — Current State Report

## Purpose

This report records the evidence gathered before implementation of the native Roku companion channel. The proposed channel is **not** a browser wrapper. It is a separate SceneGraph/BrightScript application that reads public, immutable presentation data from Living Nexus.

## Existing Platform Capability

Living Nexus already provides the critical backend foundation for a Roku experience. The public REST API exposes a paginated public catalog, individual track details, an audio stream redirect, creator records, WID verification, canonical work records, and registry search. The server attaches this router before the client application is served, so a Roku-specific read model can be added without changing the React application's routes.

| Existing surface | Evidence | Roku value |
|---|---|---|
| Public catalog | `GET /api/v1/catalog` | Initial rows and genre-driven exploration |
| Track record | `GET /api/v1/track/:id` | Detail, playback, and attribution information |
| Stream redirect | `GET /api/v1/stream/:id` | Direct audio playback URL resolution |
| WID record | `GET /api/v1/wid/:wid` | Immutable creator and provenance presentation |
| Verification | `GET /api/v1/verify/:witnessId` | A lightweight validation result for the provenance drawer |
| Registry search | `GET /api/v1/search` | Future in-channel discovery and Roku deep linking |

The data model explicitly treats the Witness ID, provenance, creator attribution, and origin-related content as first-class concepts. The reference architecture also defines a public REST transport for external integrations, so a Roku read model strengthens the platform's **Discover**, **Attribute**, **Preserve**, and **Legacy** pillars rather than creating a second source of truth.

## Blast Radius

| Thread | Classification | Affected surfaces | Decision |
|---|---|---|---|
| T1 — Roku feed contract | Blocking | `server/routes/publicApiRoute.ts`, public API documentation, tests | Add a small read-only Roku projection; reuse existing database helpers and public records |
| T2 — Roku channel source | Blocking | New `roku/` package | Build a separate native SceneGraph/BrightScript application with a Task-driven feed loader |
| T3 — Provenance presentation | Parallel | Roku detail and metadata drawer | Present WID, creator attribution, registration date, and canonical verification link as read-only content |
| T4 — Existing React UI | Already done | Web pages and tRPC procedures | Do not duplicate the Roku UI or modify existing creation and editing flows |
| T5 — Database schema | Already done | Existing `songs`, `users`, WID-related registry records | No migration required; the Roku contract is a read projection |

## Technical Constraints

The Roku application must package a manifest, a `source` directory, a `components` directory, and static images. SceneGraph applications use XML components and BrightScript to create and display a scene.[1] Network activity and content parsing must run in a `Task` node rather than the rendering thread; Roku specifically documents Task nodes as the pattern for server-backed `ContentNode` data.[2]

The channel will be optimized for 16:9 television navigation: one remote focus chain, high-contrast text, a clear selected state, and progressive disclosure of provenance. The first release will focus on audio and structured provenance because that is the mature, public content already exposed by the platform. Video narratives and deeper constellation visualizations can be added without changing the core channel architecture after compatible streaming media are available.

## Current Gaps

No native Roku package, Roku-specific feed, consumer-TV navigation model, device package assets, or Roku deployment guide exists in the repository. The existing general catalog is intentionally client-neutral; the Roku client needs a compact response with absolute URLs, rows suitable for `RowList`, and a deliberate 10-foot presentation model.

## Architecture Conclusion

The appropriate implementation is a **server-projected Roku catalog** plus a **standalone SceneGraph/BrightScript package**. The backend remains the source of truth. The Roku client receives a bounded, cacheable, read-only representation designed for remote navigation and never performs registry mutations or stores provenance as mutable local data.

## References

[1] [Roku Developer: Developing SceneGraph applications](https://developer.roku.com/dev/docs/developing-scenegraph-applications)

[2] [Roku Developer: Task node](https://developer.roku.com/dev/docs/task)
