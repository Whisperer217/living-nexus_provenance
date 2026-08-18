# Living Nexus — Design Principles
## LNLS v1.0 · Section 8

---

## The Aesthetic Position

The platform's visual language is not decorative. It is a statement. The aesthetic — cathedral architecture, sacred geometry, gold on black — communicates that the creative record of a human being deserves to be held with reverence, not processed with indifference.

Every design decision is evaluated against this question: *Does this feel like a museum exhibit or an admin panel?* The answer must always be the former.

---

## Design Principles

**People over Content.** The Creator is always more prominent than the work. The work exists because the Creator exists. The Creator's identity — their name, their face, their story — is the first thing a visitor sees on any work page.

**Witness. Contribute. Belong.** These are the three verbs of the platform. Every screen should enable at least one of them. A screen that does none of them does not belong here.

**Provenance over Popularity.** A work with one witness and a verified provenance record is more valuable on this platform than a work with a million plays and no provenance. Metrics that measure engagement are secondary to metrics that measure provenance integrity.

**Creator Ownership over Platform Dependency.** The Creator can export their entire provenance record at any time. The platform does not hold the Creator's data hostage. Exportability is a design requirement, not a feature.

**Repair over Expansion.** When a feature is broken, fix it before adding new features. Clarity over novelty. Stable architecture over rapid feature accumulation.

---

## Law VII — The Intentional Interface Standard

> Nothing exists merely for decoration. Every object, movement, transition, relationship, and control must communicate the state, history, ownership, or experience of a registered work.

This is not a style preference. It is architectural law (`ARCHITECTURAL_LAWS.md` Law VII; full text `docs/INTENTIONAL_INTERFACE_DOCTRINE.md`).

The danger is *beautiful but meaningless*. We do not ship "cool Three.js." We ship recognition: *Oh. I understand what I'm looking at.* Beauty emerges from meaningful structure.

**Keep / cut:**

- Cool animation that communicates nothing → cut.
- Unusual interaction that makes provenance clearer → keep.
- Conventional control more intuitive than a spatial one → use the conventional control.

Intentional does not mean complicated. It means nothing accidental.

### Spatial Grammar

| Interaction | Meaning |
|---|---|
| Drag a work | You are moving an artifact. |
| Drop into Register | You are declaring it. |
| Drop a sealed work into Player | You are experiencing the registered artifact. |
| Player refuses an unregistered work | The record is not yet declared. |
| Register refuses a sealed work | The declaration already exists. |
| A Witness appears | Someone attested to that event. |
| Follow the lineage | You are traversing history. |
| The work revolves | It is active / in playback. |
| Camera moves toward a node | You are entering that record or domain. |
| Camera pulls back | You are seeing the larger lineage. |
| A connection illuminates | A relationship is being revealed. |
| A new version branches | The work changed without erasing its history. |

Profile → Edit → Register → Witness are actions in the life of a work, not arbitrary UI sections. The spatial interface exists to make those actions tangible.

---

## Visual Language

| Element | Canonical treatment |
|---|---|
| Background | Deep void — near-black, not pure black |
| Primary accent | Gold (#D4AF37) — the color of witnessed work |
| Typography (headings) | Cinzel serif — cathedral, sovereign, permanent |
| Typography (body) | DM Sans — readable, modern, human |
| Typography (code/WIDs) | Monospace — precise, technical, immutable |
| Card borders | Gold at 15–30% opacity — present but not aggressive |
| Creator avatars | Gold border — the immutable validation marker |
| Work cards | Dominant artwork, minimal UI, creator name prominent |

---

## The Seven Audit Questions

Before any screen is shipped, it must pass these seven questions:

1. Does this increase trust?
2. Does authorship feel visible?
3. Does provenance feel tangible?
4. Can the creator's story be understood in seconds?
5. Can someone support the creator with one obvious action?
6. Does this screen preserve context instead of hiding it?
7. Is the work treated like a living artifact rather than just a file?

If the answer to any question is "no," redesign the interaction before adding new functionality.

---

*This document is part of the Living Nexus Language Specification (LNLS v1.0).*
