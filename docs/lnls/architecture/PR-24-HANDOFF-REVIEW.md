# PR #24 Handoff Review — Spatial Registry Prototype

**Review status:** Read-only reconciliation complete
**Archive reviewed:** `Living-Nexus-PR-24-handoff.zip`
**GitHub pull request:** [PR #24 — Spatial Registry: state determines the verb](https://github.com/Whisperer217/living-nexus_provenance/pull/24)
**Archived head:** `ab7ae8bd0ccbad70b3f756fc0ef1fcfa11bfca90`
**Archived merge base:** `2dc1dd43f858100dea890068ff75607eb536fd80`
**Decision required:** Do not merge, apply, deploy, or expose this prototype as a production Registry surface without a separate adoption approval.

## 1. Executive conclusion

PR #24 is an authentic, ambitious **Spatial Registry prototype**. Its archive manifest matches the supplied patch and mail-bundle SHA-256 values, and its patch applies mechanically to the current managed source. Mechanical applicability, however, is not production compatibility.

The handoff delivers a substantial visual and interaction study: a raw Three.js spatial scene, seven pathway illustrations, a visual vocabulary, a mock work graph, and a prototype page. It explicitly self-identifies as fictional and avoids tRPC, authentication, and the canonical player. That isolation is a virtue for a prototype, but the page also simulates registration, WID creation, attestation, playback, cover-art generation, and a creator AI configuration. Those simulations cannot be represented as Living Nexus production actions or records.

> **Recommendation:** Preserve PR #24 as a verified prototype and design evidence. If Doc wants to advance it, take a narrowly authorized **current-source Spatial Registry visual-study** slice first. That slice must remove all simulated custody events, move visual binaries to durable project storage, and remain visibly noncanonical. Do not merge the archival patch wholesale.

## 2. Integrity and scope inventory

| Item | Observed result |
|---|---|
| Archive contents | `changes.patch`, `commits.mbox`, `HANDOFF.md`, and `manifest.json` |
| Patch SHA-256 | Matches manifest: `55ca3770a542f2e79a181f782100f47f2289cb6c8cce57708db4da7d327c6364` |
| Mail-bundle SHA-256 | Matches manifest: `366a49bd4d8d1ee3570dbd14bfe262e9031d1688cacf331a61a6f171be6f7b38` |
| GitHub state at review | Open draft PR, 26 files, 3,605 additions, 288 deletions |
| Server/database/credential deployment code | None included |
| Primary runtime scope | `SpatialRegistryMockPage`, spatial fixture data, a raw Three.js scene, CSS, mock contract tests, and documentation |
| Added binary scope | Twelve prototype PNGs totaling approximately **15.4 MiB** in `client/public/prototype/spatial-registry/` |
| Current-source mechanical applicability | `git apply --check` passes; this does **not** prove semantic or custody compatibility |

The new `SpatialRegistryScene.tsx` is 1,359 lines and uses the already-installed `three` dependency directly. The page and fixture are already present in the managed source as a small prototype; the PR replaces that lightweight mock with a larger interactive scene and extensive new fixture behavior.

## 3. What the prototype contributes

The architectural contribution is a useful one: it makes the relationship among creator, Work, editing, registration, witness, lineage, and listening spatially legible. The phrase **“state determines the verb”** has product value when translated faithfully: an unregistered Draft should offer preparation/registration pathways, while a published registered Work may offer listening, verification, or explicitly authorized Witness pathways.

| Prototype contribution | Value worth preserving | Required Living Nexus translation |
|---|---|---|
| Spatial constellation | Makes major product pathways easier to understand | Use a derived, noncanonical visual projection of actual state or neutral illustrative data |
| Distinct pathway visuals | Gives creator/work/registration/lineage/player concepts recognizable form | Store source artwork durably outside application source and provide attribution/rights review |
| Intentional-representation vocabulary | Encourages UI actions to match record state | Treat this as a design principle; do not let a client fixture define Registry authority |
| Keyboard/motion handling and scene controls | Offers useful interaction and accessibility patterns | Retain only after direct reduced-motion, keyboard, mobile, and performance tests on current source |
| Mock isolation assertions | Correctly recognizes that a visual prototype should not own production domains | Strengthen them to prohibit simulated WIDs, fake record changes, fake player state, and local AI context claims |

## 4. Compatibility and custody findings

The project currently exposes its existing page at `/prototype/spatial-registry`; its source also labels the route as a mock and has no direct tRPC/auth/player dependency. PR #24 retains that deliberate isolation, but enlarges its local simulation substantially. The following concerns block direct adoption as a production-facing experience.

| Concern | Evidence in archived prototype | Why direct adoption is unsafe | Required correction before any implementation |
|---|---|---|---|
| Simulated WID issuance | Local `nextRegistrationWid()` produces values such as `LN-00018`; display data includes `LN-00017` | A browser state change is not a Registry-issued immutable WID and must not look like one | Remove simulated issuance; use an illustrative label with no WID syntax, or read a verified WID only from a governed Core projection |
| Simulated registration and witness | Buttons and ceremonies present “Registration Created” and “Witness recorded”; local counters and artifact state mutate | Registration, attestation, and provenance are durable authority actions—not local visual events | Replace with non-mutating pathway explanation, or route to the existing governed registration/verification process only after separate design approval |
| Simulated player | `isPlaying`, elapsed time, progress controls, and animated waveform are local | Living Nexus has one global player owner; a mock player can falsely imply playback/continuity and create a second authority | Remove transport simulation; either display an inactive illustrative instrument or invoke the existing canonical PlayerProvider through a separately reviewed integration |
| Local cover-art generation | Canvas-generated “cover art,” local file inspection, and selection flow occur in the browser | A local visual result is not an AI asset, creator-owned stored asset, or Work artwork; it bypasses custody/receipt rules | Preserve it only as non-persistent visual exploration, or wait for the separately approved Core private-asset intake and Gemini image workflow |
| Local “My AI” configuration | Browser-local editable creator/context fields use fictional creator and Work/WID material | This resembles an AI-context claim without signed session, permission, receipt, or server boundary | Do not port. The separate Nexus service is the only approved AI workspace and has explicit context controls |
| Fixture claims | Named fictional people, tracks, WID-shaped labels, registered/witnessed states, and fixed counts appear as interface truth | Fictional claims can be mistaken for real creator, Work, entitlement, or provenance facts | Keep clearly contained in a prototype-only environment with prominent illustrative labeling, or replace with a governed read-only projection |
| Repository binary assets | Twelve PNGs are committed under `client/public/` | Managed deployment policy requires static media outside the repository and referenced through durable project storage; embedded source assets increase deployment risk | Perform rights/attribution review; stage approved assets under `/home/ubuntu/webdev-static-assets/`; upload through durable project storage; reference returned URLs only |
| Large raw scene | A 1,359-line imperative Three.js component is introduced beside a 761-line page and 826-line CSS file | The implementation needs performance, cleanup, mobile GPU, reduced-motion, and WebGL fallback review before it becomes part of a public route | Isolate scene lifecycle; define a low-motion/static fallback; validate resource disposal and low-end mobile behavior |

## 5. Authority model to retain

The Spatial Registry must be a **representation layer**, not an alternate Registry, player, workflow engine, or AI container. Every visible state must remain attributable to its real authority.

| Visible concept | Canonical authority | Spatial Registry may do | Spatial Registry must not do |
|---|---|---|---|
| Creator identity | Living Nexus Core | Display a server-provided public creator projection | Invent profile state, entitlement, or avatar ownership |
| Work status | Living Nexus Core + Registry | Render a read-only state label supplied by Core | Infer registration from a filename, WID-shaped string, or client state |
| WID/provenance | Registry | Link to an existing verification surface | Issue, alter, imitate, or seal a WID in the browser |
| Playback | Canonical Living Nexus player | Request the established player to load an explicitly selected public Work | Create another audio element, queue, progress model, waveform, or auto-AI context |
| Witness context | Separate Nexus + Registry permission boundary | Offer a deliberate link/action that begins explicit attachment flow | Treat viewing, selecting, or playing a Work as AI permission/context |
| Image/asset workflow | Core private asset custody, then separately approved Nexus image capability | Explain the later pathway | Upload, retain, generate, or choose a creator asset without the approved custody workflow |
| PNA/avatars/private threads | PNA preservation boundary | None without a successor-specific approval | Surface, infer, transfer, or prompt with PNA records |

## 6. Safe adoption choices

| Option | Scope | Safety posture | Recommendation |
|---|---|---|---|
| **A. Preserve-only** | Retain the archive, review, and visual ideas as evidence | No code or route change | Safest if the current priority is Nexus, ingestion, or PNA preservation |
| **B. Current-source visual study** | Create a bounded, clearly illustrative spatial scene with no real data, no WID-shaped fixture values, no simulated player/registration/witness/AI, and durable assets only | Visual exploration only; no authority claims | **Recommended next step** if Doc wants to keep developing the spatial idea now |
| **C. Read-only production projection design** | Design a real server-governed projection of public creators/registered Works/verified WIDs plus canonical-player handoff | Requires a separate ADR, API/read-model decision, performance plan, and acceptance gates before code | Recommended after Option B proves the interaction language |
| **D. Directly apply/merge PR #24** | Merge archive patch as written | Would import local simulations and repository binaries | Not recommended |

## 7. Preconditions for a future production projection

Before any Spatial Registry moves beyond an explicitly illustrative study, the implementation must satisfy the following gates:

1. A Core-owned, read-only projection contract specifies exactly which public creator and Work fields can be drawn; it must not expose private drafts, purchase history, PNA data, private Quiver assets, testimony, libraries, or raw storage URLs.
2. Registry state must be returned by a governed server boundary. A WID is rendered only if a verified record supplies it, and the scene must link to existing verification instead of deriving a seal from formatting.
3. Player interaction must delegate to the existing global player. The scene owns no audio element, queue, analyser, synthetic progress, or persistence.
4. Any Nexus/Witness action must open the existing separate Nexus attachment flow. Selection, discovery, and playback remain non-contextual until the user explicitly attaches a permitted Work.
5. Every image must have custody/rights review and use durable external project storage. No large visual media may be committed under `client/public` or `client/src`.
6. The scene needs keyboard navigation, clear focus state, reduced-motion/static fallback, WebGL-unavailable fallback, GPU/resource disposal, and desktop/mobile performance acceptance testing.
7. The design must state whether it is a private creator workspace, a public exploration surface, or a non-production study. Those are different routes, data projections, and risk profiles.

## 8. No changes made during this review

This review did not extract PR assets into project source, apply the patch, merge the GitHub branch, alter a route, touch Core/Nexus credentials, create a database record, activate a worker, create a WID, alter provenance, change PNA, or publish a deployment.

## References

1. [PR #24 — Spatial Registry: state determines the verb](https://github.com/Whisperer217/living-nexus_provenance/pull/24)
2. [Living Nexus managed contributor guidance](../../AGENTS.md)
