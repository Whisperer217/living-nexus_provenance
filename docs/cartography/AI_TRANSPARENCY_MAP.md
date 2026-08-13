# F. AI Transparency Map

> **Rule:** AI disclosure, WID, provenance, timestamp, and creator declaration are distinct records. None alone is a copyright, ownership, or compliance determination.

## Current Data / Disclosure Surface

| Topic | Current evidence located | Classification | Boundary |
|---|---|---|---|
| AI assistance / generation declaration | User and Song `aiDisclosure`; AI-tool flags; participation axes; HAAI fields. | **EXISTS** | Stored disclosure is a creator/platform record, not an authorship ruling. |
| Human participation | `participationMusic`, `participationLyrics`, `participationVoice` allow Human / AI / Both. | **EXISTS** | Needs display and revision-path verification. |
| Creator intent | HAAI visual, style, instrumentation, voice, lyrical inspiration, emotional tone, and origin fields. | **EXISTS** | This records human statements of intent; it does not adjudicate legal human authorship. |
| AI visual provenance | `visualSource`, `visualPrompt`, `visualLineageJson`. | **EXISTS** | Must trace prompt custody, edit history, display, and export behavior. |
| AI consent | `aiConsent` and public policy text. | **PARTIAL** | Must trace enforcement across storage, providers, bridges, models, exports, and access controls. |
| Machine-readable synthetic-content marking | No C2PA or equivalent integration located in reviewed material. | **UNKNOWN / REFERENCED BUT NOT IMPLEMENTED** | Requires a standards and product decision; do not claim machine-readable external interoperability yet. |
| Agentic derivation accountability | Music-draft authority / commission / ledger beachhead exists. | **PARTIAL** | The complete doctrine requires broader source, engine, bridge, result, and witness fields. |

## Required Transparency Distinctions

| Statement class | Example | Display treatment |
|---|---|---|
| Creator declaration | “Creator states AI was used for vocal processing.” | Label as **Creator Declaration** with time/version. |
| System observation | “System generated this waveform from the attached audio file.” | Label as **System Record** and identify mechanism/version. |
| Agent derivation | “Authorized Agent derived a draft description using these inputs.” | Label as **Machine Derivation** with Commission, capability, engine, and confirmation state. |
| External claim | “Provider declares this model supports a provenance mark.” | Label source, provider, and verification date. |
| Legal position | “The work is copyrightable” or “the platform is Article 50 compliant.” | **UNRESOLVED — QUALIFIED COUNSEL REQUIRED**. |

## External Regulatory and Standards Context

The U.S. Copyright Office describes a case-specific human-authorship inquiry. It states that human-authored material, creative selection/arrangement, or modification can support a copyright claim in the relevant human-authored aspects, while prompts alone generally do not determine the expressive elements under its stated analysis.[1] [2]

The European Commission states that Article 50 transparency obligations apply from August 2, 2026 to specified providers and deployers, including direct AI interaction disclosure and certain machine-readable synthetic-content marking. Whether these obligations apply to a specific Living Nexus feature remains **UNRESOLVED — QUALIFIED COUNSEL REQUIRED**.[3] [4]

C2PA is an external, opt-in technical provenance standard that uses claims, assertions, content binding, signatures, and a trust model. Its own materials state that provenance assertions are not value judgments about whether the data is “good” or “bad.”[5] This is a useful architecture comparison, not evidence of Living Nexus adoption, legal ownership, or truth of a creator declaration.

## Minimum Future Transparency Contract

1. State whether content is human-authored, AI-assisted, AI-generated, edited, transformed, or unknown **as a declaration and/or system record**.
2. Preserve the declared human role and source of the declaration.
3. Preserve machine derivation provenance separately from human confirmation.
4. Include public, private, and machine-readable representations with appropriate access controls.
5. Avoid unverified legal labels such as “copyright protected,” “fully human,” or “legally compliant.”
6. Evaluate machine-readable marking, C2PA interoperability, and Article 50 scope through an approved standards/counsel track—not a UI-only change.

## References

[1]: https://www.copyright.gov/newsnet/2025/1060.html "U.S. Copyright Office — Copyrightability of Generative AI Outputs"
[2]: https://www.govinfo.gov/content/pkg/FR-2023-03-16/pdf/2023-05321.pdf "88 FR 16190 — Copyright Registration Guidance"
[3]: https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations "European Commission — Article 50 Transparency Guidance"
[4]: https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50 "European Commission AI Act Service Desk — Article 50"
[5]: https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html "C2PA Technical Specification 2.4"

