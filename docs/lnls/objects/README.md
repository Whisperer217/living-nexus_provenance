# Living Nexus — Object Model
## LNLS v1.0 · Section 4

This document describes the properties and lifecycle of each first-class object defined in the ontology.

---

## Work

A Work is the central object of the platform. Everything else exists in relation to a Work.

**Properties:** WID, title, type (Music, Lyrics, Manuscript, Comic, Project, Visual, Film, Doctrine), creator, registration date, version, status (registered, witnessed, archived, disputed), provenance object reference, participation chain.

**Lifecycle:**
```
Idea → Ingest → Register → Witness → Publish → Version → Archive
```

**Rules:**
- A Work does not exist on Living Nexus until it has a WID.
- A Work's WID is permanent and cannot be revoked.
- A Work's provenance record is immutable after witnessing.
- A Work can be versioned. Each version has its own WID.

---

## Provenance Object

The Provenance Object is the canonical identity record of a Work. It is not a sidebar, a form, or a disclosure step. It is the Work's identity. Everything else — the registry entry, the AI disclosure, the metadata, the media files, the relationships — references it.

**Properties:** PO-{wid}, work reference, registry section, metadata section, media section, disclosure section, relationships section, publication section.

**The six sections of a Provenance Object:**

| Section | Contains |
|---|---|
| **Registry** | WID, registration timestamp, status, version, ECDSA signature |
| **Metadata** | Title, genre, BPM, key, ISRC, duration, SHA-256 hash, MD5 |
| **Media** | Audio URL, cover art URL, video URL, attachments |
| **Disclosure** | Participation chain (ordered list of human and AI participants) |
| **Relationships** | Parent works, derivatives, forks, co-creators |
| **Publication** | Platforms, release date, license type |

**Rule:** The Provenance Object is assembled once from ingested metadata and confirmed by the Creator. After witnessing, it is immutable.

---

## Participation Chain

The Participation Chain is the ordered record of every participant in the creation of a Work. It replaces the binary Human/AI authorship model entirely.

**Human roles:**

| Role | Meaning |
|---|---|
| Creator | The originating human intelligence — the person whose idea, intent, and direction defined the Work |
| Editor | A human who modified, refined, or curated the Work after initial creation |
| Producer | A human who oversaw the production process |
| Witness | A human who formally acknowledged the Work's existence |
| Curator | A human who selected, organized, or contextualized the Work |
| Publisher | The human responsible for releasing the Work to the public |

**AI roles:**

| Role | Meaning |
|---|---|
| Generator | An AI system that produced the primary creative output (audio, image, text) |
| Assistant | An AI system that supported the creative process without being the primary generator |
| Upscaler | An AI system that enhanced resolution or quality |
| Translator | An AI system that converted the Work between languages or formats |
| Voice Model | An AI system that generated or synthesized voice |
| Composer | An AI system that generated musical composition |
| Image Model | An AI system that generated visual content |
| Reasoner | An AI system that provided analysis, critique, or structural reasoning |

**The Creation Chain** is the ordered sequence of participants, showing the flow of creative responsibility:

```
Creator (Human) → Generator (AI) → Editor (Human) → Witness (Human) → Publisher (Human)
```

This is not a binary. It is a graph. A Work can have any combination of human and AI participants, in any order, with any number of iterations.

---

## Creator

A Creator is a Person who has registered at least one Work. The Creator object extends the Person object with creative identity properties.

**Properties:** Creator profile, WID list, session list, testimony list, collection list, witness relationships, platform hub links, creative mission, bio, organizations.

**Lifecycle:** Person → Creator (first registration) → Active Creator (ongoing registrations) → Steward (maintaining legacy works)

---

## Session

A Session (WID-SES) is a documented creative working period. It is the living record of the creative process — not just the finished work, but the decisions, iterations, prompts, rejections, and human interventions that led to it.

**Properties:** WID-SES, creator, title, start date, end date, works produced, AI sessions log, notes, status.

---

## Testimony

A Testimony (WID-TST) is a human record of creative experience. It is the Creator's account of what it meant to make something — the lived, witnessed record that no AI can replicate.

**Properties:** WID-TST, creator, work reference, content, date, visibility.

---

*This document is part of the Living Nexus Language Specification (LNLS v1.0).*
