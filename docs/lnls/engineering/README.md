# Living Nexus — Engineering Guide
## LNLS v1.0 · Section 12

This document translates the platform's design principles into engineering decisions. Every item here is a constraint on the codebase, not a suggestion.

---

## Language Constraints

The canonical vocabulary defined in `/vocabulary` is enforced in the UI. No UI string may use a prohibited term. This is verified by code review, not by automated tooling — it requires human judgment.

**Enforcement rule:** Before any PR is merged that touches UI strings, the author must verify that every user-visible string uses the canonical vocabulary.

---

## The Provenance Object Constraint

Every Work has exactly one Provenance Object. The Provenance Object is assembled at ingestion and confirmed by the Creator. After witnessing, it is immutable.

**Engineering rule:** No feature may split the provenance record across multiple tables without a canonical reference back to the Provenance Object. The Provenance Object is the single source of truth for a Work's identity.

---

## The WID Constraint

WIDs are permanent. A WID that has been issued cannot be revoked, reused, or modified. If a Work is archived, its WID remains in the Registry. If a Work is disputed, its WID remains in the Registry with a disputed status.

**Engineering rule:** No DELETE operation may target a row with a WID. Archive operations set a status flag. They do not remove records.

---

## The Participation Chain Constraint

The binary Human/AI authorship model is prohibited. No UI element, database field, or API response may present authorship as a yes/no question about AI use.

**Engineering rule:** The `aiDisclosure` field in the database is deprecated in favor of the Participation Chain. New features must use the Participation Chain model.

---

## The Export Constraint

Every Creator can export their complete provenance record at any time. The export must include: all WIDs, all Provenance Objects, all Participation Chains, all Testimonies, all Sessions.

**Engineering rule:** Every data model decision must consider exportability. If a data structure cannot be exported in a standard format (JSON, CSV, PDF), it must be redesigned.

---

## The Seven Audit Questions (Engineering Version)

Before any feature is shipped, the engineer must answer these questions:

1. Does this feature increase trust in the Registry?
2. Does authorship remain visible after this change?
3. Does provenance remain tangible after this change?
4. Can the Creator's story still be understood in seconds?
5. Can someone still support the Creator with one obvious action?
6. Does this feature preserve context instead of hiding it?
7. Is the Work still treated like a living artifact, not just a file?

If the answer to any question is "no," the feature must be redesigned before shipping.

---

*This document is part of the Living Nexus Language Specification (LNLS v1.0).*

