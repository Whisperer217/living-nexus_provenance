# ADR — Loop Responsive Review and Queued-Work Transition

**Status:** Accepted  
**Date:** 2026-10-02

## Context

The contained desktop Studio repair intentionally gave the left and right panels independent scrolling. Below the desktop split breakpoint, retaining that same flex/overflow ownership could compress the first panel and force the preview panel to compete for a finite height. The queue arrangement rows also kept every control in one horizontal line, which reduced the title’s readable width on narrow screens. The individual queued Work changed immediately when the parent advanced `queueIndex`, without a visible continuity cue.

The existing bulk-prefill and extraction indicators are truthful: they distinguish creator-proposed shared values from embedded evidence and never claim to modify source bytes, participation disclosure, or the Witness ID boundary. Their compact desktop layout needs a more resilient mobile presentation.

## Decision

1. **Responsive Studio ownership:** below `lg`, the `/manifest` page uses one continuous document flow inside the existing application scroll surface. At `lg` and above, it retains the contained desktop canvas with independently scrollable review and preview panels.
2. **Queue-row geometry:** narrow queue rows use a grid. The reorder handle, sequence number, and title remain in the first row; preview and removal controls move to a dedicated action row. This preserves 44px targets and prevents long review titles from overlapping controls.
3. **Queued Work transition:** the new Work enters with a brief opacity-and-vertical-distance transition. It never implies that data was copied. `prefers-reduced-motion` disables it.
4. **Indicator hierarchy:** bulk-prefill and extracted-data markers remain presentation-only. On narrow panels, badges wrap before values, values break safely rather than overflow, and the visual-source label stays traceable.

## Non-goals

- No database, tRPC, schema, cache, registration, WID, metadata-extraction, participation, or disclosure change.
- No modification of the source file, embedded metadata, attached visual asset, or previously completed queued Work.
- No Explore creator-card patch. The attached creator-card brief is a separate, presentation-only request and requires its own source audit before implementation.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Keep dual inner scroll panels on mobile | Can trap content in a compressed panel and fights mobile document reading. |
| Use a modal transition between queued records | Adds another navigation layer to a process that already has a clear sequential queue. |
| Remove source/provenance badges on mobile | Would conceal the distinction between extracted and creator-proposed values. |

## Validation

- TypeScript and focused Loop contracts.
- Production build and diff integrity.
- Mobile (375px) and tablet (768px) viewport capture of the Manifest entry surface; authenticated per-Work visual review remains unavailable in the sandbox without a user session.
- `prefers-reduced-motion` CSS coverage.
- Full regression boundary, reported separately if unrelated existing failures persist.
