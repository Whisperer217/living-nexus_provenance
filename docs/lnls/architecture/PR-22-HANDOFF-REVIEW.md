# PR #22 Handoff Review — PNA Chat Atmosphere and One-Click Avatars

**Status:** Read-only review complete; adoption is not approved.  
**Reviewed handoff:** `Living-Nexus-PR-22-handoff.zip`  
**PR head:** `9b1dcf8da06ac4049470f35a0f2eae88830fbd2f`  
**Current managed source:** Current managed Living Nexus diverges from the handoff base.  
**Scope:** PNA presentation, local theme selection, avatar/mode selection, and now-playing chat composition.

## Integrity and scope

The supplied archive is internally consistent. Its `changes.patch` SHA-256 is `c6daebc788215432abd17b8b846cb7e1419be6a680ee7897ddf913102ea48c4a`; its `commits.mbox` SHA-256 is `4acc54e63a856112e8c1bfa8d2535693b6a0be97ce241e73993f1f94316d0195`. Those values match the handoff manifest. It contains one draft GitHub PR and five frontend/test files only—no migration, credential, generated asset, or deployment artifact. [S1]

| Handoff element | Intended behavior | Current compatibility |
|---|---|---|
| `PnaChatAtmosphere` | Decorative music-reactive field, vine/ember frame, and stream seal. | The visual wrapper is potentially portable only through a current-source adaptation. The patch fails clean application against `index.css`. |
| `pnaChatAtmosphere.ts` | Browser-local appearance selection plus an avatar capability catalog. | Theme preference is noncanonical presentation state; “paid” and “locked” claims lack a server-side entitlement contract in this handoff. |
| `PNAShellPage` additions | One-click avatar/mode selection, playing appearance, and injected now-playing metadata into PNA chat. | The patch conflicts with the current PNA shell. Its now-playing prompt composition violates the existing playing-versus-AI-context boundary. |
| PNA CSS | Global PNA field/frame/animation styles. | Must be refit to present tokens and must retain reduced-motion behavior. |
| Test | Source-level atmosphere assertions. | Would need replacement with current-source behavioral and custody tests. |

## Blocking authority findings

### 1. PNA is in preservation-first retirement review

The active PNA architecture decision is to preserve its private threads, portraits, assets, sealed records, marketplace/avatar facts, and creator access before any retirement or successor move. PNA is not an open design surface for additive feature work unless Doc separately approves a bounded archive or successor slice. [S2]

Adopting a new PNA atmosphere now would add migration friction without advancing preservation, export, read-only access, or successor authority. It is therefore **held** pending a deliberate PNA decision.

### 2. The handoff makes playback implicit chat context

The proposed helper `bindNowPlayingContext()` prepends the playing title, artist, and WID to the prompt sent through the legacy PNA chat mutation. The source comment says “display only,” but the value enters the provider/chat input. That is not display-only; it violates the platform rule that **playing does not create AI context**.

Any future use of a now-playing card must remain visual unless the creator separately selects an explicit context attachment whose permission state is checked server-side. This is already the direction of the separate Nexus workspace; it must not be weakened by legacy PNA styling.

### 3. Appearance claims must not become entitlement claims

The archive marks the Ember theme as `paid` and several avatars as `locked` in browser-local data. It does not verify marketplace purchase, grant, or entitlement state. Existing PNA avatar equipment has an already identified, separate hardening concern: equipment must not silently replace economic authority. [S2]

No visual preference may claim entitlement, unlock a catalog item, modify `equippedAvatarItemId`, change `profilePhotoUrl`, issue an AVT/WID identifier, or rewrite creator portrait authority.

## Compatibility result

The patch fails `git apply --check` on both `client/src/index.css` and `client/src/pages/PNAShellPage.tsx`. The GitHub PR remains open/draft and reports an unknown merge state. It has not been merged, cherry-picked, manually copied, deployed, or executed.

> **Review conclusion:** PR #22 is authentic art direction, but it is not safe to merge or port as a PNA change while the PNA retirement/successor boundary remains unresolved.

## Safe options

| Option | Result | Recommendation |
|---|---|---|
| **A. Preserve only** | Keep PR #22 as design/archive evidence; do not alter PNA. | **Recommended now.** |
| **B. Extract only non-authoritative visual motifs for Nexus** | Reinterpret the vine/ember/frame language in the separate Nexus workspace, with no PNA state/route/record coupling. | Possible only after Doc explicitly selects a Nexus visual slice. |
| **C. PNA archive-surface adaptation** | Apply a non-writing, read-only archival presentation after the PNA archive plan is approved. | Later, only as part of the preservation sequence. |
| **D. Full PR port into live PNA** | Add PNA theme/avatar/chat changes from diverged source. | Rejected until a specific PNA continuation authorization, entitlement design, explicit-context repair, and current-source test plan exist. |

## Required gates before any later implementation

1. Doc must choose a PNA preservation/retirement path or expressly reopen PNA for a bounded feature slice.
2. Now-playing content must be a visual display only unless an explicit, permitted context attachment separately succeeds.
3. Any avatar/theme catalog state must derive from server-authoritative ownership/entitlement, not local `paid`/`locked` flags.
4. The work must be implemented against current source—not the archived patch—and must preserve private PNA thread, Quiver, portrait, diary, Registry, and marketplace boundaries.
5. New tests must cover no automatic AI context, no automatic economic/portrait mutation, reduced motion, owner scope, and route continuity.

## Evidence

[S1]: [PR #22 handoff manifest and patch — `Living-Nexus-PR-22-handoff.zip`](../../../upload/Living-Nexus-PR-22-handoff.zip)

[S2]: [PNA retirement and avatar successor preservation ADR](ADR-PNA-RETIREMENT-AND-AVATAR-SUCCESSOR.md)
