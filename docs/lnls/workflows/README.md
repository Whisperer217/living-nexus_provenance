# Living Nexus — Creator Lifecycle & Workflows
## LNLS v1.0 · Section 7

---

## The Creator Lifecycle

```
Create → Ingest → Verify → Witness → Register → Publish → Remix → Archive
```

| Stage | What happens | Platform action |
|---|---|---|
| **Create** | The Creator produces a work — idea, draft, iteration, completion | None — this happens outside the platform |
| **Ingest** | The Creator brings the file to the platform. The engine reads it, extracts all available metadata, and populates the Provenance Object | Automatic metadata extraction, AI detection, hash generation |
| **Verify** | The Creator reviews the extracted provenance data and confirms or corrects it | Confirmation step — AI detected → Confirm, not a question |
| **Witness** | The Registry formally acknowledges the work and locks the provenance record | WID issued, ECDSA signature applied, timestamp locked |
| **Register** | The work enters the public Registry with its WID | Public record created, searchable, verifiable |
| **Publish** | The Creator decides to make the work publicly discoverable | Optional — a work can be registered without being published |
| **Remix** | The Creator or another Creator produces a Derivative or Fork, referencing the original WID | Provenance link created, lineage updated |
| **Archive** | The work is preserved in its registered state | Immutable preservation, no deletion |

---

## The Registration Workflow (Detailed)

```
Step 1: Ingest
  ├── Drop file (any type)
  ├── Engine extracts: SHA-256, MD5, EXIF, IPTC, XMP, music tags, AI metadata
  ├── AI detection: platform, model, prompt, seed, CFG, LoRA, voice model
  └── Provenance Object populated with all discovered data

Step 2: Confirm Provenance
  ├── Creator reviews Provenance Object
  ├── If AI detected: "AI participation detected. Platform: X. Confirm?"
  ├── Creator confirms or modifies the participation chain
  └── Provenance Object locked for witnessing

Step 3: Register
  ├── WID generated: {TYPE}-{CREATOR_HEX}-{TIMESTAMP}-{RANDOM}
  ├── ECDSA signature applied
  ├── Record stored in Registry
  └── WID returned to Creator

Step 4: Publish (optional)
  ├── Creator sets visibility (public / private / unlisted)
  ├── Work appears in Explore and search
  └── Witness relationships can be formed
```

---

## The Witness Workflow

When a Person witnesses a Creator, they are formally acknowledging the Creator's creative record — not subscribing to their content.

```
Person discovers Creator → Views Creator profile → Clicks "Witness" →
Witness relationship recorded → Creator's witness count updated →
Person receives updates when Creator registers new works
```

---

## The Verification Workflow

Any person can verify a WID at any time, without authentication.

```
Person has a WID → Navigates to /verify/{wid} →
Registry confirms: WID exists, timestamp, Creator identity, signature →
Verification result displayed publicly
```

---

*This document is part of the Living Nexus Language Specification (LNLS v1.0).*
