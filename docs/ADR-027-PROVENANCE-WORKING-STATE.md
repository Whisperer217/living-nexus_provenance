# ADR-027 — Provenance Working State: Hearing, Drawer, and Exchange

**Status:** Accepted for the first Working State slice  
**Date:** 2026-08-15  
**Owner:** Keeper  
**Companion to:** `docs/AUTHORIZED_AGENT_DOCTRINE.md` · `docs/ADR-023-NEXUS-CONTEXT-PANEL.md` · `docs/LOOP_PRODUCT_SPEC.md`  
**Code:** `shared/provenanceWorkingState.ts`

## Decision in one sentence

The GPT-style Loop/PNA shell must treat **provenance, now-playing, drawer mode, and route as Working State** the Authorized Agent may read — never as Domain Continuity, never as invented registry truth, and never as a badge glued on after the chat.

## Why this is architecture, not marketing

Other chat systems read only the typed prompt. Living Nexus can read the page without becoming extractive **if** every field is a fact with a source:

| Surface | What the agent may know | What it may not do |
|---|---|---|
| Global player | Title, artist, playing/paused, WID if present | Start playback, invent a WID, claim legal ownership |
| Provenance state | `idle` / `unsealed` / `sealed` | Narrate remix lineage that is not in the record |
| Drawer / nav mode | Home, Explore, Register, Manage, Archive | Turn nav into a second registry |
| PNA mode | Guide, Compose, Witness, Registry, Archive, Vision, Research | Seal or publish from chat |
| Route | Current path | Treat a URL as a verified work |

Working State is **Exchange context** (Authorized Agent Doctrine: “Context → Working State”). It is not the Chain of Record.

## The seven differentiators, as law

1. **Provenance is first-class UX.** Sealed / unsealed is visible and clickable (Verify when a WID exists). It is not a “trust me” sticker.
2. **The player is a context engine.** PNA hears what is bound. The user bubble does not get rewritten; Vision prompts stay the creator’s words.
3. **Content-aware Exchange.** Chat, player, drawer, and route share one versioned object (`ProvenanceWorkingState` v1).
4. **Moddable later, not fake-open now.** Skins, chat themes, and personas are expansions. A mod marketplace, transferable wallet, or third-party drawer SDK is out of this slice.
5. **OSS-chat feel.** Simple shell, transparent facts, fast. Provenance and hearing are added power, not clutter.
6. **Ethics is structural.** Do not invent provenance. Derivations stay derivations until the creator confirms. Seal/publish remain explicit.
7. **Contributors, not data points.** User messages remain theirs. Working State is labeled display fact. Diary restore stays the only diary path (ADR-023).

## This slice (authorized)

- Shared collector + LLM formatter (`shared/provenanceWorkingState.ts`).
- `keeper.chat` optional `workingState` block with an explicit “do not invent” charter.
- PNA sends Working State on text Exchange only (not Vision, not the visible user message).
- TopBar player strip shows Sealed / Unsealed as a narrative control.
- Loop ContextDrawer shows a read-only **Bound work** strip when something is playing.

## Explicitly not this slice

- Invented remix graphs or “lineage” UI without registry events.
- Agent-authored context cards (ADR-023 still forbids that).
- Pulling Verify / Register / Explore into a paid chat store.
- WID coins, cash-out, or GPT4All.
- Closing draft PRs #22 / #23 by this document alone.

## Failure to avoid

If the model answers “this track’s WID is…” when `provenance` is `unsealed` or `idle`, the architecture has failed. Silence or “this hearing is unsealed” is the correct response.
