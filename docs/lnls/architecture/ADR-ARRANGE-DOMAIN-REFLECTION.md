# ADR — Arrange Domain Persistence and Reflection

**Status:** Approved for diagnosis, reversible owner smoke, and a bounded repair only if direct evidence shows a failed save or reflection path.

## Decision

Treat **Arrange domain** as creator-owned presentation state. The owner entry on `LoopCreatorPage` opens `DomainEditor` for the creator's own ID; the same page renders `DomainRenderer` for that ID. `DomainEditor` reads `domain.getLayout({ userId })`, sends ordered block metadata to protected `domain.saveLayout`, and invalidates the same layout query on success. `DomainRenderer` reads that public layout query, filters hidden/disallowed blocks, and orders the surviving blocks by stored position.

The required proof is a round trip: an owner makes one reversible layout change, saves, refreshes the creator page, sees the reflected state, and restores the original layout. A real failure determines the repair seam. No speculative persistence or model change is authorized.

## Boundaries

| Concern | Decision |
|---|---|
| Authority | `domain.saveLayout` remains protected and always writes the authenticated creator's layout. |
| Reflection | Both immediate rehydration and post-refresh rendering must use `domain.getLayout({ userId })`. |
| Scope | Block order, visibility, and size only. |
| Registry | Work WIDs, Work provenance, signatures, and publication states are not touched. |
| Domain history | Existing domain-layout versions remain the only existing arrangement-history mechanism; no Work provenance write is added. |
| Validation | Use a reversible owner change, then restore it. No test Work/album/asset is created. |

## Repair decision rule

If the save succeeds but the same page remains stale, repair query invalidation/rehydration only. If a refresh loses the change, repair the save/read persistence seam only. If both work, add regression coverage and make no runtime behavior change.

## Rollback

Any repair is confined to the `DomainEditor` / domain router / layout-reader seam. Reverting the checkpoint restores prior presentation behavior and leaves existing creator layout records intact.
