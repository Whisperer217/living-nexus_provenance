# Spatial Registry Visual Study Contract

**Status:** Approved implementation boundary — noncanonical visual study only
**Decision:** Doc selected Option B following the PR #24 handoff review.
**Scope:** `/prototype/spatial-registry` only; no data or service integration.

## Purpose

This study translates the valuable **“state determines the verb”** spatial-language principle from PR #24 into a current-source interface experiment. It explores how a creator, a Work, preparation, Registry verification, witness, lineage, and listening may be visually oriented without making a browser mock look like a system of record.[1]

> The study is **not** a Registry, a Work editor, a player, an AI workspace, an image studio, a source of creator identity, or a provenance surface. It creates no record and makes no claim about an existing record.

## Invariants

| Invariant | Required implementation rule |
|---|---|
| Noncanonical state | Use neutral illustrative labels only. Do not display a WID-shaped value, named creator, real Work, numeric witness count, asset filename, or claim such as “registered” or “witnessed.” |
| No consequential action | Node selection may change explanatory copy and visual focus only. It must not register, verify, witness, save, generate, inspect/upload, or alter a record. |
| Canonical player preserved | The study creates no audio element, transport controls, queue, waveform, progress timer, PlayerProvider dependency, or playback state. |
| Separate Nexus retained | The study does not offer My AI, context attachment, a provider call, a Nexus launch, or any browser-local context configuration. |
| Asset custody preserved | The study uses tokenized CSS and procedural DOM/SVG geometry only. It adds no image/video/audio asset under `client/public` or `client/src`. |
| Accessibility and motion | All pathway controls remain keyboard reachable with visible focus. `prefers-reduced-motion` disables nonessential constellation motion, and a readable non-WebGL DOM composition remains the primary presentation. |
| Authority truth | A future real state projection may only be supplied by an approved Core/Registry read model. Playback and discovery remain independent of AI context; PNA is excluded. |

## Interaction model

The single available interaction is **orientation**. Choosing a spatial node centers an explanatory panel and changes the visible pathway treatment. The visual study uses these neutral concepts:

| Spatial node | Illustrative wording | Production authority if later connected |
|---|---|---|
| Creator | “A creator’s distinct domain” | Living Nexus Core identity projection |
| Work | “A creative object awaiting its next deliberate action” | Living Nexus Core Work projection |
| Prepare | “Review and prepare creator-held details” | Creator-controlled Draft workflow |
| Register | “Establish a record only through the governed Register flow” | Canonical registration / Registry |
| Verify | “Read an existing proof through a verification surface” | Registry read projection |
| Lineage | “Trace relationships only when declared records establish them” | Canonical provenance graph |
| Listen | “Use the one canonical player when a real Work is deliberately selected” | Living Nexus global PlayerProvider |

No node contains a primary action, fake ceremony, simulated counter, drop zone, generator, mock AI identity, local file reader, or local persistence. The study may link back to **Home** only.

## Implementation plan

| Affected file | Change |
|---|---|
| `client/src/lib/spatialRegistryMock.ts` | Replace fictional data and behavior helpers with static illustrative node definitions and neutral explanatory copy. |
| `client/src/pages/SpatialRegistryMockPage.tsx` | Replace registration/witness/player/AI/cover-art simulations with a semantic, keyboard-accessible DOM/SVG spatial study. Retain only local selected-node orientation state. |
| `client/src/pages/spatial-registry-mock.css` | Replace mock page styling with tokenized, responsive, reduced-motion-safe constellation geometry. |
| `server/tests/spatialRegistryMock.contract.test.ts` | Assert dedicated prototype routing, absence of production integrations and disallowed mock claims, keyboard controls, noncanonical labeling, and motion safeguards. |
| `docs/lnls/architecture/PR-24-HANDOFF-REVIEW.md` | Retain as the authoritative record of the archived patch’s rejected direct-adoption path. |

There is no schema, migration, router, provider, Registry, PNA, player, persistence, worker, or credential change.

## Acceptance and rollback

Acceptance requires typechecking, the focused isolation contract, production build, full regression, unchanged-or-improved refinement baseline, desktop and mobile route review, keyboard/focus check, and reduced-motion source coverage. The route must remain visibly labeled **Illustrative spatial study · no records are read or created**.

Rollback is limited to restoring the preceding managed checkpoint. The study has no data state, asset upload, record mutation, or external-service state to unwind.

## Separate later gate

If the study proves useful, a later **read-only production-projection design** must define field-level Core/Registry projections, permission rules, player delegation, feature flags, performance budgets, entitlement/identity limits, error/empty states, and its own approval before production code is written.

## References

1. [PR #24 — Spatial Registry: state determines the verb](https://github.com/Whisperer217/living-nexus_provenance/pull/24)
