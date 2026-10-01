# Creator Domain Performance Benchmark

**Date:** 2026-10-01  
**Target:** local managed preview, public Creator Domain `@cRAYz`  
**Purpose:** verify the query-gating change in `CreatorDomainShell` and record browser-visible delivery and memory evidence.

## Scope and limits

The Creator Domain shell defines nine sections:

| Section | Public visitor availability | Benchmark status |
|---|---:|---|
| Home | Yes | Measured |
| Works | Yes | Measured |
| Collections | Yes | Measured |
| Witnesses | Yes | Measured |
| Drafts | Owner-only | Not measured: no owner session in the sandbox browser |
| Provenance | Owner-only | Not measured: no owner session in the sandbox browser |
| Analytics | Owner-only | Not measured: no owner session in the sandbox browser |
| Publishing | Owner-only | Not measured: no owner session in the sandbox browser |
| Settings | Owner-only | Not measured: no owner session in the sandbox browser |

Owner-only figures are intentionally **not invented**. The public shell’s code gates `mySongs` to owner Works/Drafts and `myAnalytics` to owner Analytics; public visitors use a count on Home and the cursor-paginated public Works query only in Works.

## Method

- Opened `/<at>cRAYz` in the managed Chrome preview as a signed-out visitor.
- Recorded browser Performance Resource Timing entries, DOM node counts, `performance.memory` when exposed, and tRPC request counts.
- Switched each public tab in sequence and waited 1.8 seconds after the interaction.
- Cleared Resource Timing entries immediately before each tab transition; therefore transition request counts describe work caused by that section change, not bootstrap assets.

> This is a managed-preview performance benchmark, not a field-device or production CDN test. The preview proxy reports only 320 transfer bytes in Resource Timing, so transfer-byte results should not be treated as real compressed asset sizes.

## Initial public Home load

| Metric | Result |
|---|---:|
| Response start | 53 ms |
| DOM content loaded | 433 ms |
| Load event | 471 ms |
| DOM nodes | 468 |
| Browser resource entries | 151 |
| tRPC requests | 3 |
| JS heap used | 31.85 MB |
| JS heap total | 32.77 MB |
| JS heap limit | 2065.25 MB |

## Public tab-transition results

| View | DOM nodes | New resource entries | New tRPC requests | Resource duration | JS heap used |
|---|---:|---:|---:|---:|---:|
| Home | 468 | 1 | 0 | 20 ms | 31.89 MB |
| Works | 496 | 6 | 1 | 507 ms | 32.39 MB |
| Collections | 448 | 1 | 0 | 13 ms | 32.81 MB |
| Witnesses | 446 | 1 | 0 | 11 ms | 32.57 MB |

## Findings

1. **Query gating behaves as intended for the public domain.** Home, Collections, and Witnesses did not emit an additional tRPC request after their tab switch. Works emitted exactly one request—the cursor-paginated Registry Work query.
2. **The public Works view remains bounded.** The visible code requests `discoverInfinite` with `limit: 24` only when `activeSection === "artifacts"` for a visitor; it is not mounted on Home.
3. **No runaway heap growth was observed across the public navigation sequence.** Used heap varied from 31.89 MB to 32.81 MB (0.92 MB spread) across the four public views. This is a short single-pass observation, not a leak proof.
4. **Works is the expected hot view.** Its 507 ms aggregate resource duration is the only measurable data-fetch cost in the tab transitions. Collections and Witnesses currently render lightweight placeholder/presentation surfaces.
5. **Owner-only coverage remains a limitation.** A real authenticated owner benchmark is still required for Drafts, Provenance, Analytics, Publishing, and Settings—especially Analytics, because it intentionally enables `profile.myAnalytics` only when opened.

## Source-backed architecture evidence

- `client/src/pages/CreatorDomainShell.tsx:166–205` gates owner `mySongs` and analytics queries by section and enables the public infinite Work query only for `artifacts`.
- `client/src/pages/CreatorDomainShell.tsx:342–424` keeps public Home count-only and renders public Works from cursor pages.
- `server/tests/creatorDomainShellPerformance.contract.test.ts` provides source-level regression coverage for the gating boundary.

## Recommended next evidence

Run the same benchmark under an authenticated creator session and record the five owner-only sections. Include a repeated multi-cycle navigation run plus GC/heap snapshots before treating the current short sequence as a memory-stability guarantee.

## Release boundary

This benchmark involved no database mutation, checkpoint, deployment, or publication.
