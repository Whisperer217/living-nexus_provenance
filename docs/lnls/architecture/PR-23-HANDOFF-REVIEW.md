# PR #23 Handoff Review — Context Drawer Visibility and Provenance Working State

**Status:** Read-only review complete; adoption is not approved.  
**Reviewed handoff:** `Living-Nexus-PR-23-handoff.zip`  
**PR head:** `d3eadf90ec0a19e5269af701ffeafc4f347dd2f4`  
**Current GitHub state:** Draft / open; merge state unknown.  
**Scope:** Context-drawer presentation, proposed working-state object, Keeper/PNA chat prompt injection, PNA shell, global layout/rails, and doctrine copy.

## Integrity and scope

The supplied archive is internally consistent. Its `changes.patch` SHA-256 is `7f96b6e1e7c6528e4ccecab21950517d68e36b0d5b7a841feb0edb31fd635ad3`; its `commits.mbox` SHA-256 is `30539dc32ca2ebd2405b9788ee1fcbc7a49cadd2dc5a42f6a9dc4b611374cb30`. Both match the manifest. The draft contains six commits and touches fourteen files: layout/rail/drawer surfaces, PNA, Keeper chat, a shared provenance-working-state module, documentation, and tests. [S1]

| Handoff area | Proposed behavior | Current compatibility |
|---|---|---|
| Context drawer | Make the desktop drawer open by default and use CSS state classes instead of inline transforms. | Potentially useful as a **separate current-source UI slice**; archived patch conflicts with the current drawer, main layout, left rail, top bar, and CSS. |
| Shared working state | Construct a player/Work/provenance state from title, artist, WID, and playback state. | Unsafe as written: it promotes playback facts into provider/legacy PNA chat input. |
| Keeper chat | Append a formatted `workingState` block to the Keeper system prompt. | Violates the approved requirement that playback is not AI context unless separately attached and permitted. |
| PNA shell | Send working state into PNA Exchange and display it in the player strip/drawer. | PNA is preservation-first; this is out of scope without a specific reauthorization. |
| Provenance state | Infer `sealed` from a WID-shaped value and describe it in UI/prompt content. | A WID string alone is not an authorization or independent Registry verification result. |
| Doctrine/charter text | Strengthen witness/no-extraction language. | Could be reviewed as prose separately; it must not be coupled to unsafe runtime context behavior. |

## Blocking authority findings

### 1. “Hearing context” is still AI context

The proposed `formatWorkingStateForAgent()` ends with language allowing the model to “speak to what is playing as hearing context.” Its value is appended to the server-side Keeper system prompt whenever the client provides `input.workingState`. The preceding display-only label does not change the effect: the provider receives Work/playback metadata as input. This violates the standing platform rule:

> **Playing a Work does not attach it to AI context.**

The correct boundary is already established in the separate Nexus service: a Work must be explicitly selected, evaluated server-side through governed permission, and attached as a minimal permitted projection. A general chat, legacy PNA exchange, player strip, or context drawer cannot create that attachment merely because it is visible or playing. [S2]

### 2. WID presence is not a sealed-provenance determination

The handoff derives `sealed`/`unsealed` presentation from whether a WID field exists. A format-looking WID is not a Registry verification result and does not establish current provenance, permission, authenticity, or publication state. Any later verification badge must come from an authorized Registry/Core projection, not a browser-provided field or inferred playback state.

### 3. PNA remains preservation-first

PR #23 makes material PNA shell and Keeper chat changes. Current PNA direction is preservation, archive/export readiness, and future successor separation—not additive interaction work. The draft therefore cannot be merged as a convenient drawer or player improvement; it must remain held until a future PNA-specific authorization exists. [S3]

## Compatibility result

`git apply --check` fails on all current presentation/runtime seams touched by the patch: `ContextDrawer.tsx`, `LeftRail.tsx`, `MainLayout.tsx`, `TopBar.tsx`, `index.css`, and `PNAShellPage.tsx`. The archive has not been merged, cherry-picked, copied, executed, or deployed.

> **Review conclusion:** The visibility intent is separately reusable; the working-state-to-chat implementation is not compatible with current custody doctrine.

## Safe adoption options

| Option | Result | Recommendation |
|---|---|---|
| **A. Preserve-only** | Retain the review and handoff as design/audit evidence; apply nothing. | Safest until a clear drawer/UI need is selected. |
| **B. Current-source Context Drawer UX slice** | Rebuild only responsive drawer visibility/open-state behavior in current layout code. Exclude working state, Keeper/PNA prompt changes, WID inference, and doctrine edits. | **Recommended if the usability objective is drawer visibility.** |
| **C. Nexus explicit-context card refinement** | Improve the separate Nexus factual Context/Witness panel using server-verified attachment state only. | Possible after a dedicated Nexus UI approval; no PNA work. |
| **D. Coupled PR port** | Port all layout, PNA, Keeper, working-state, doctrine, and tests. | Rejected. |

## Requirements for any later slice

1. Keep the scope to one application surface: either current Living Nexus layout **or** separate Nexus context UI—not PNA plus chat plus global rails in one patch.
2. Treat player metadata as display-only unless an existing explicit attach flow successfully returns server-governed permission.
3. Do not calculate sealed/permission state from a WID string; show only verified state from the applicable authority.
4. Do not add `workingState` to PNA/keeper provider prompts, history, execution records, or browser persistence without explicit creator attachment and policy evaluation.
5. Keep PNA untouched unless the preservation/retirement plan is explicitly reopened.
6. Preserve reduced-motion, mobile drawer behavior, keyboard focus management, and global-player ownership in any current-source drawer refinement.

## Evidence

[S1]: [PR #23 handoff manifest and patch — `Living-Nexus-PR-23-handoff.zip`](../../../upload/Living-Nexus-PR-23-handoff.zip)

[S2]: [Nexus Gemini-first convergence ADR](ADR-NEXUS-GEMINI-FIRST-CONVERGENCE.md)

[S3]: [PNA retirement and avatar successor preservation ADR](ADR-PNA-RETIREMENT-AND-AVATAR-SUCCESSOR.md)
