# Living Nexus — Operational Doctrine

> This document governs all development decisions on the Living Nexus platform.
> It takes precedence over feature enthusiasm, sprint pressure, and novelty.
> Read it before every phase. Enforce it without apology.

---

## Core Preference Hierarchy

When uncertainty exists, prefer:

| Prefer | Over |
|---|---|
| **Repair** | Expansion |
| **Clarity** | Novelty |
| **Creator ownership** | Platform dependency |
| **Provenance** | Popularity |
| **Exportability** | Lock-in |
| **Physical reality** | Cloud abstraction |
| **Stable architecture** | Rapid feature accumulation |

---

## Feature Gate

If a proposed feature **increases complexity without strengthening** any of the following pillars, it should be **deferred**:

- Creator Domains
- Identity
- Provenance
- Discovery
- Distribution
- Artifacts

---

## The Canonical Sequence

When in doubt, this sequence takes precedence over all other priorities:

```
Identity
  ↓
Domain
  ↓
Manifestation
  ↓
Provenance
  ↓
Discovery
  ↓
Distribution
  ↓
Artifact
```

A creator must be able to establish **Identity** before uploading anything.
A creator must be able to anchor their **Domain** before distributing anything.
Every **Manifestation** must carry **Provenance** before entering **Discovery**.
**Distribution** is the last step — not the first.
**Artifacts** are the physical expression of everything above.

---

## Relationship to LN-ADP v1

This doctrine is the operational layer of the [Living Nexus Architectural Drift Protocol (LN-ADP v1)](./LN-ADP-v1.md).

LN-ADP v1 defines what drift looks like and how to detect it.
This doctrine defines what to build — and what to defer.

Together they form the governance layer of the platform.

---

*Last updated: Phase 194 — Creator Identity Completion*
