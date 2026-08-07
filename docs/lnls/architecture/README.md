# Living Nexus — Architecture
## LNLS v1.0 · Section 11

---

## The Four Arms (Laminin Model)

The platform's architecture is modeled on laminin — the protein that holds biological cells together. Laminin has four structural arms. Living Nexus has four structural arms. This is not decorative architecture. It is doctrine embedded in design.

```
                    ┌─────────────────┐
                    │   THE REGISTRY  │
                    │  Cryptographic  │
                    │  Provenance     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────┴────────┐ ┌────────┴────────┐ ┌────────┴────────┐
│  THE COMMUNITY  │ │  THE COMMERCE   │ │   THE ARCHIVE   │
│  Social Layer   │ │  Economic Layer │ │  Preservation   │
│  Witness Network│ │  Gifts, Splits  │ │  Long-term      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## The Provenance Object Data Flow

```
File Upload
    │
    ▼
Ingestion Engine
    ├── SHA-256 / MD5 hash
    ├── EXIF / IPTC / XMP extraction
    ├── Music tag extraction (ID3, Vorbis, FLAC)
    ├── AI metadata detection (12 platforms)
    └── Provenance Object assembly
         │
         ▼
    Creator Confirmation
         │
         ▼
    WID Generation
    ├── Type prefix (WID-MUS, WID-LYR, etc.)
    ├── Creator hex
    ├── Timestamp
    └── Random suffix
         │
         ▼
    ECDSA Signature
         │
         ▼
    Registry Storage
         │
         ├── Public ledger entry
         ├── Provenance Object stored
         ├── Participation chain stored
         └── Certificate generated
```

---

## The Subdomain Architecture

```
livingnexus.org          → Public discovery (Registry, Explore, Creator profiles)
pna.livingnexus.org      → Creator workspace (PNA operating system)
api.livingnexus.org      → Developer platform (API docs, keys, webhooks)
docs.livingnexus.org     → Documentation (platform guides, WID spec, LNLS)
```

Medium-specific routes are paths, not subdomains:
```
livingnexus.org/explore/music
livingnexus.org/explore/books
livingnexus.org/explore/research
livingnexus.org/explore/visual
livingnexus.org/explore/film
livingnexus.org/explore/doctrine
```

---

## The Dual Ontology Law

Every artifact declares both its domain identity (what it is) and its implementation identity (how it fulfills its purpose). Neither identity may be inferred solely from its filesystem location.

A music file is not a Work because it is an MP3. It is a Work because a Creator registered it and a WID was issued. The implementation is subordinate to the domain identity.

---

*This document is part of the Living Nexus Language Specification (LNLS v1.0).*
