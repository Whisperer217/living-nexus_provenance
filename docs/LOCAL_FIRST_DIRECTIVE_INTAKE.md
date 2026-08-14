# Local-First Creative Workspace Directive — Intake Record

**Status:** Active architecture assessment input. **Date received:** 2026-08-14.  
**Implementation status:** No approval to change application code, schema, storage, synchronization, public visibility, or production records.

## Keeper direction captured

Living Nexus is to evolve toward a **local-first, provenance-aware creative workspace** with an optional public Living Nexus network. The immediate public registry focus remains music. The private creator workspace continues to support music, artwork, Quiver assets, Guides, provenance avatars, metadata, WIDs, provenance, playlists, and agent assistance.

> “Local by default. Sync/publication by consent.”

The public network remains the place where a creator deliberately manifests selected music outward for registration, discovery, witnessing, attribution, support, and public playback. It is not the default location of every private creation or working asset.

## Clarifications received after the directive

| Directive element | Keeper clarification | Architecture consequence |
|---|---|---|
| **Explore** | “Can keep explore page.” | Preserve Explore as the public, music-only discovery surface for songs and creators. It is not replaced by the private workspace. |
| **Data flow** | “All local first should call database back an forth.” | Assess a two-database model: local workspace database for private work and public Nexus database for manifested/public records, with explicit, attributable exchange in both directions. |
| **Authority** | Existing doctrine remains active. | No automatic publication, data promotion, or private-asset exposure. Any local-to-public action requires deliberate creator confirmation. |

## Working interpretation for assessment only

The local database should be authoritative for a creator’s private drafts, working assets, local WIDs, local provenance events, and local settings. The public database should be authoritative for public registry records and public-state updates. A future synchronization/publication boundary may exchange selected records in both directions, but it must define ownership, allowable directions, conflicts, retries, identity mapping, and audit events before implementation.

This is an **assessment interpretation**, not an implemented synchronization contract and not a legal conclusion about ownership or rights.

## Non-destructive boundaries

The assessment must retain and inspect existing music registration, Explore, player, Quiver, image generation, Guides, provenance-avatar assets, WID/provenance mechanisms, and current public routes before proposing a replacement. Existing records must not be treated as migration fixtures or recreated without authorization.

## Required deliverable before implementation

The next document must provide an evidence-bound current-state/gap report, an architectural decision record, viable delivery options, a two-database publication/synchronization boundary, risk and rollback analysis, and the smallest safe vertical slice. It must preserve Explore and require Keeper approval before any implementation begins.
