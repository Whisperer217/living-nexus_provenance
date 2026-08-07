# Living Nexus — Ontology
## LNLS v1.0 · Section 3

The ontology defines the first-class objects of the Living Nexus platform and the relationships between them. This is not a database schema. It is the conceptual model — the vocabulary of things that exist on this platform and how they relate to each other.

---

## First-Class Objects

A first-class object is an entity that has its own identity, its own lifecycle, and its own provenance record. Everything else on the platform is either a property of a first-class object or a relationship between first-class objects.

| Object | Identity | What it represents |
|---|---|---|
| **Person** | User account | A human being who interacts with the platform |
| **Creator** | Creator profile | A Person who has registered at least one Work |
| **Work** | WID | A registered creative artifact |
| **Version** | WID + version number | A specific state of a Work at a point in time |
| **Provenance Object** | PO-{wid} | The canonical identity record of a Work |
| **Participation** | Chain entry | A single contribution to a Work by a participant |
| **Session** | WID-SES | A documented creative working period |
| **Testimony** | WID-TST | A human record of creative experience |
| **Collection** | Collection ID | A curated set of Works |
| **Registry Entry** | WID | The public record of a Work in the Registry |

---

## The Object Hierarchy

```
Person
  └── Creator
        ├── Work (registered)
        │     ├── Version (v1, v2, ...)
        │     ├── Provenance Object
        │     │     ├── Registry (WID, timestamp, status)
        │     │     ├── Metadata (title, genre, BPM, hash, ...)
        │     │     ├── Media (audio, cover art, video, ...)
        │     │     ├── Disclosure (participation chain)
        │     │     └── Relationships (derivatives, forks, lineage)
        │     └── Participation Chain
        │           ├── Human: Creator → Editor → Producer → ...
        │           └── AI: Generator → Assistant → Voice Model → ...
        ├── Session (WID-SES)
        ├── Testimony (WID-TST)
        └── Collection
```

---

## Relationships Between Objects

| Relationship | From | To | Meaning |
|---|---|---|---|
| **registers** | Creator | Work | Creator is the registering party |
| **witnesses** | Person | Creator | Person acknowledges Creator's record |
| **participates in** | Person or AI | Work | Participant contributed to the Work |
| **derives from** | Work | Work | Work is based on another Work |
| **forks** | Work | Work | Work branches from another Work |
| **versions** | Version | Work | Version is a state of a Work |
| **documents** | Session | Work | Session records the creation of a Work |
| **testifies to** | Testimony | Work or Creator | Testimony bears witness to a creative act |
| **contains** | Collection | Work | Collection includes a Work |

---

## The Dual Ontology Law

Every artifact in Living Nexus declares both its **domain identity** (what it is) and its **implementation identity** (how it fulfills its purpose). Neither identity may be inferred solely from its filesystem location or its MIME type.

A music file is not a Work because it is an MP3. It is a Work because a Creator registered it and a WID was issued. The implementation (MP3) is subordinate to the domain identity (registered Work with provenance).

This law governs every data model decision on the platform.

---

*This document is part of the Living Nexus Language Specification (LNLS v1.0).*
