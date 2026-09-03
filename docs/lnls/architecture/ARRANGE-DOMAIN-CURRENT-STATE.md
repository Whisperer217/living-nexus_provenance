# Arrange Domain — Current State Evidence

**Status:** Read-first diagnostic in progress; no arrangement, Work, WID, provenance, or publication mutation has been performed.

## Observed creator experience

The authenticated creator domain at `/creator/DocSMercer` visibly exposes an **Arrange domain** control. The published creator-album route is independently reachable and renders the creator's existing album projection. The requested behavior is therefore not a new product surface: it is a verification that creator-authorized domain arrangement changes survive save and accurately rehydrate after refresh.

## Candidate flow requiring direct source convergence

The initial blast-radius scan identified two distinct candidate concepts that must not be conflated: (1) legacy song ordering through `songs.reorder`, and (2) creator-domain layout blocks through a dedicated domain editor and layout persistence path. The repair will be limited to the path actually invoked by **Arrange domain** after direct source verification. No speculative transaction, schema, public-visibility, or provenance change is authorized by this diagnostic.

| Boundary | Required invariant |
|---|---|
| Creator authority | Only the authenticated domain owner may save an arrangement. |
| Reflection | The saved arrangement must be returned by the same creator-page projection after refresh. |
| Registry | Arrangement work must not create, alter, or reissue a Work WID. |
| Provenance | Work provenance and publication state must remain untouched. |
| Reversibility | The live validation uses one reversible arrangement and restores the prior order. |

## Next convergence action

Trace the actual component opened by the creator-page control, its concrete tRPC mutation, stored field or table, and the reader used by owner and visitor rendering. Compile/test evidence will decide whether the defect is save, cache invalidation, rehydration, or absent functionality.

## Post-diagnosis observation

After stabilizing the editor's hydration guard, the authenticated local owner flow opened **Domain Editor** successfully from the same **Arrange domain** control that had timed out in three prior browser attempts. The editor visibly loaded its four Loop-managed rows—Distribution Links, Featured Tracks, Albums & Releases, and Provenance Trail—while the existing public `domain.getLayout` response showed their persisted order, sizes, and visibility. The baseline remains version 9 for creator `userId = 1`; no save has yet been issued in this verification sequence.

The authorized reversible smoke then changed only the existing **Provenance Trail** block from hidden to visible and saved it as Domain version 10 with the note `Temporary layout reflection verification — will restore`. The creator page immediately rendered **DOMAIN HISTORY** and, after a fresh local page load, continued to render both the visible block and version 10. No Work, WID, asset, publication, or Work-provenance record was written.

The owner then restored the block to hidden and saved Domain version 11 with the note `Restored original Provenance Trail visibility after verification`. A second fresh page load no longer rendered **DOMAIN HISTORY**. Request evidence recorded only the two successful `domain.saveLayout` calls and `domain.getLayout` rehydration; no `songs.upload`, publication, WID, provenance, or storage write endpoint appeared in the verification window.
