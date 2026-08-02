# Living Nexus — Reference Architecture v1.0

*"From Steward → Manifestation → Legacy"*

---

## Purpose

Preserve the living record of human creative contribution.

## Mission

> Every creator deserves attribution.  
> Every work deserves provenance.  
> Every contribution deserves preservation.  
> Every steward deserves support.

---

## The Prime Directive

> **Every design decision, database schema, API endpoint, and user interaction must increase the permanence, discoverability, attribution, and supportability of human creative contribution. If a feature optimizes engagement while diminishing those four qualities, it should be redesigned.**

---

## The Four Permanent Platform Pillars

| Pillar | Statement | What it demands |
|---|---|---|
| **PRESERVE** | Every work survives. | Append-only provenance, version history, WID permanence, archive exports |
| **ATTRIBUTE** | Every creator is visible. | Authorship above the fold, HAAI declarations as primary content, creator panels on every work screen |
| **DISCOVER** | Every contribution can be found. | Universal works index, WID search, Explore cathedral, public API, MCP tools |
| **SUPPORT** | Every creator can be sustained. | One-tap Support Creator on every creator-facing screen, full SupportCreatorDrawer, patronage tiers, licensing |

---

## Reference Architecture

```
                        LIVING NEXUS
                Reference Architecture v1.0

          "From Steward → Manifestation → Legacy"

┌──────────────────────────────────────────────────────────────┐
│ LAYER 1 — IDENTITY                                           │
├──────────────────────────────────────────────────────────────┤
│ Steward                                                      │
│                                                              │
│ Creator                                                      │
│ Organizations                                                │
│ Collaborators                                                │
│ AI Agents (declared)                                         │
│                                                              │
│ Profile                                                      │
│ Declaration                                                  │
│ Verification                                                 │
│ Reputation                                                   │
│ Payment Identity                                             │
│                                                              │
│ Nothing exists until someone creates.                        │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 2 — MANIFESTATION                                      │
├──────────────────────────────────────────────────────────────┤
│ Works                                                        │
│                                                              │
│ Music                                                        │
│ Lyrics                                                       │
│ Books                                                        │
│ Research                                                     │
│ Images                                                       │
│ Film                                                         │
│ Games                                                        │
│ 3D Models                                                    │
│ G-Code                                                       │
│                                                              │
│ HAAI Declaration                                             │
│ Origin Story                                                 │
│ Creative Intent                                              │
│ Visual Concept                                               │
│ Emotional Tone                                               │
│                                                              │
│ Every work begins life here.                                 │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 3 — RELATIONSHIP                                       │
├──────────────────────────────────────────────────────────────┤
│ Context                                                      │
│                                                              │
│ Albums                                                       │
│ Collections                                                  │
│ Projects                                                     │
│ Series                                                       │
│ Playlists                                                    │
│ Creator Domains                                              │
│                                                              │
│ Works become part of something larger.                       │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 4 — REGISTRY                                           │
├──────────────────────────────────────────────────────────────┤
│ Truth                                                        │
│                                                              │
│ WID                                                          │
│ Provenance                                                   │
│ Timeline                                                     │
│ Witnesses                                                    │
│ Evidence                                                     │
│ Version History                                              │
│ Declaration Signatures                                       │
│                                                              │
│ Append-only.                                                 │
│ History is accumulated, never rewritten.                     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 5 — STEWARDSHIP                                        │
├──────────────────────────────────────────────────────────────┤
│ Sustain                                                      │
│                                                              │
│ Patronage                                                    │
│ Licensing                                                    │
│ Commerce                                                     │
│ Tips                                                         │
│ Marketplace                                                  │
│ Distribution                                                 │
│                                                              │
│ Creation becomes economically sustainable.                   │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ LAYER 6 — LEGACY                                             │
├──────────────────────────────────────────────────────────────┤
│ Preserve                                                     │
│                                                              │
│ Sovereign Archive                                            │
│ Version Exports                                              │
│ Redundant Storage                                            │
│ Registry Snapshots                                           │
│ Cold Storage                                                 │
│ Future Migration                                             │
│                                                              │
│ The work survives the platform.                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Layer Rules for Agents and Builders

Every person or system building on Living Nexus must understand these rules before writing a single line of code, schema, or API contract.

**Layer 1 — Identity** is the root. A change here propagates to every layer below. When modifying the user schema, the creator profile, or the declaration system, test all downstream screens before checkpoint.

**Layer 2 — Manifestation** is where works are born. The HAAI fields (`haaiOriginStory`, `haaiVisualConcept`, `haaiStyleLanguage`, `haaiInstrumentation`, `haaiVocalConveyance`, `haaiLyricalInspiration`, `haaiEmotionalTone`) are **primary content**, not metadata. They must be surfaced as editorial content — pull quotes, above-fold statements, provenance panels — not buried in settings tabs.

**Layer 3 — Relationship** gives works context. Albums, collections, and projects are how a body of work becomes a legacy. Every relationship must preserve the attribution of every individual work it contains.

**Layer 4 — Registry** is the permanent record. This layer is **append-only**. Provenance events, WID stamps, declaration signatures, and witness testimonies are never updated or deleted. If a record must be corrected, a new event is appended that supersedes the prior one. The chain is never broken.

**Layer 5 — Stewardship** is the economic layer. Every change to payment flows, licensing, or patronage requires Stripe test mode verification before checkpoint. The economic layer exists to sustain creators — not to extract from them.

**Layer 6 — Legacy** is the guarantee. Archive operations are irreversible. Always checkpoint before running export jobs. The purpose of this layer is to ensure that the work survives the platform, the company, and any single point of failure.

**The path is always:** Steward → Manifestation → Legacy.

---

## Schema Domain Map

The following database tables belong to each layer. When designing a new feature, identify its layer first, then its tables, then its API procedures, then its UI components — in that order.

| Layer | Tables |
|---|---|
| 1 — Identity | `users`, `agents`, `apiKeys`, `verificationTokens` |
| 2 — Manifestation | `songs`, `visualWorks`, `audioVersions`, `songVersions` |
| 3 — Relationship | `collections`, `collectionTracks`, `projects`, `projectSongs`, `playlists`, `playlistSongs`, `manifestedCollections` |
| 4 — Registry | `wids`, `provenanceEvents`, `workLineage`, `workWitnesses`, `declarationSignatures`, `witnessTestimonies`, `workEvidence` |
| 5 — Stewardship | `tips`, `licenses`, `witnessSubscriptions`, `paymentTransactions`, `creatorPaymentSettings`, `marketplaceItems`, `slotPurchases` |
| 6 — Legacy | `sovereignArchiveExports`, `dbExports`, `collectionVersions`, `playlistVersions`, `selfImprovementRuns` |

---

## WID Namespace Reference

Every registered work receives a Witness ID (WID) — a tamper-evident, cryptographically-anchored timestamp that proves authorship before the work touches any other platform.

| WID Prefix | Content Type | Description |
|---|---|---|
| `WID-MUS` | Music | Audio track |
| `WID-LYR` | Lyrics | Standalone lyrics |
| `WID-ALB` | Album | Collection of music |
| `WID-TST` | Testimony | Witness testimony |
| `WID-VIS` | Visual | Artwork / image |
| `WID-VWC` | Visual Work Collection | Visual art collection |
| `WID-COM` | Comic | Sequential art |
| `WID-CMX` | Comic Collection | Series of comics |
| `WID-MAN` | Manuscript | Book / written work |
| `WID-MSS` | Manuscript Series | Multi-volume work |
| `WID-IMG` | Image | Standalone image |
| `WID-GAM` | Game | Playable game |
| `WID-VID` | Video | Film / video |
| `WID-GCD` | G-Code | Fabrication file |
| `WID-FDR` | Folder | Work collection |

Verification endpoint: `https://livingnexus.org/verify/{wid}`

---

## API Access Layers

Living Nexus exposes three transport layers for external access. The local Nexus Suite and any third-party integration must use these — never direct database access.

| Transport | Auth | Use Case |
|---|---|---|
| tRPC (`/api/trpc`) | Session cookie (Manus OAuth) | Authenticated platform interactions |
| REST v1 (`/api/v1/*`) | API key (`X-API-Key` header) | External integrations, local suite |
| MCP Server | Bearer token (`MCP_READ_TOKEN`) | AI agent read access (5 tools) |

---

## The Seven Doctrine Questions

Before any screen, component, or feature ships, it must answer **yes** to all seven:

1. **Does this increase trust?**
2. **Does authorship feel visible?**
3. **Does provenance feel tangible?**
4. **Can the creator's story be understood in seconds?**
5. **Can someone support the creator with one obvious action?**
6. **Does this screen preserve context instead of hiding it?**
7. **Is the work treated like a living artifact rather than just a file?**

**If the answer to any question is "no," redesign the interaction before adding new functionality.**

---

## Design Language

The platform design language is **Cathedral** — library, museum, archive, illuminated manuscript. Not infinite scroll. Not algorithmic content farm.

| Token | Value | Use |
|---|---|---|
| `--ln-void` | `#0A0806` | Deepest background |
| `--ln-coal` | `#000000` | Card / surface |
| `--ln-iron` | `#1C1A14` | Secondary surface, hover |
| `--ln-parchment` | `#E8DFC8` | Headings, high-contrast text |
| `--ln-bone` | `#C9C0A8` | Primary body text |
| `--ln-gold` | `#C49A28` | Primary CTA, badges, WID seals |
| `--gold-glow` | `#D4A84B` | Hover / active state |
| `--ln-ember` | `#E05A2B` | Destructive actions, warnings |
| `--ln-seal-bright` | `#4ADE80` | Verified / active state |

Typography: **Cinzel** (headers, CTAs) · **Cormorant Garamond** (editorial, origin stories) · **EB Garamond** (body) · **Oswald** (overlines, labels) · **JetBrains Mono** (WID codes, hashes)

---

*Living Nexus is not a feed. It is the living registry of human creative contribution.*  
*Every work is a preserved manifestation.*  
*Every creator is a steward.*  
*The work survives the platform.*
