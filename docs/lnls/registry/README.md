# Living Nexus — Registry Specification
## LNLS v1.0 · Section 6

---

## What the Registry Is

The Registry is the first structural arm of Living Nexus. It is the cryptographic provenance layer — the system that issues WIDs, stores provenance records, and provides the public ledger of all registered works. Every work on the platform that has been witnessed has an entry in the Registry.

The Registry is not a database. It is a witness. It records what happened, when it happened, and who was present. Its records are immutable after witnessing.

---

## WID Structure

A Witness ID (WID) is a typed, structured identifier issued at the moment of registration. The structure is:

```
{TYPE}-{CREATOR_HEX}-{TIMESTAMP}-{RANDOM}
```

| Type Prefix | Domain |
|---|---|
| WID-MUS | Music |
| WID-LYR | Lyrics |
| WID-MAN | Manuscript / Book |
| WID-CMX | Comic |
| WID-PRO | Project |
| WID-OUT | Output / General |
| WID-SES | Session |
| WID-ALB | Album |
| WID-TST | Testimony |
| AVT-{id} | Avatar (creator skin) |

---

## Registration Workflow

```
1. Ingest         — File analyzed, metadata extracted, provenance data populated
2. Confirm        — Creator reviews and confirms the Provenance Object
3. Disclose       — Participation chain confirmed (AI detected → Confirm step, not a question)
4. Register       — WID issued, ECDSA signature applied, record stored
5. Witness        — Registry acknowledges the registration, timestamp locked
6. Publish        — Creator decides to make the work public (optional)
```

---

## AI Detection and Disclosure

When a file is ingested, the platform automatically detects AI participation from embedded metadata. The detection result is presented as a confirmation, not a question.

**If AI is detected:**
> AI participation detected.
> Platform: Suno · Model: v4 · Confidence: 100%
> **Confirm?** ✓ Yes · ✗ Change

**If no AI is detected:**
> No AI participation detected.
> Creation chain: Human only.
> **Confirm?** ✓ Yes · ✗ Add AI participant

The platform never asks "Was AI used?" It presents what it found and asks for confirmation.

---

## Verification

Any person can verify a WID against the Registry at `/verify/{wid}`. Verification confirms:
- The WID exists in the Registry
- The registration timestamp
- The Creator's identity
- The cryptographic signature
- The current status of the work

Verification does not require authentication. It is a public act.

---

## Lineage and Revision History

Every Work in the Registry maintains a lineage record — the chain of provenance relationships connecting it to its origins and its derivatives. When a new version of a Work is registered, the previous version is preserved and the lineage is updated.

**Version rule:** Each version of a Work has its own WID. The original WID remains the canonical identifier for the Work. Version WIDs are suffixed: `WID-MUS-{id}-v2`, `WID-MUS-{id}-v3`, etc.

---

*This document is part of the Living Nexus Language Specification (LNLS v1.0).*

