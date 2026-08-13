# I. Competitive Architecture Map

> **Method:** Translate principles; do not clone products or infer legal guarantees. “Source maturity” indicates whether a primary source was reviewed during this pass.

| System | Solves | Architectural principle | Living Nexus translation | Reject / limitation | Source maturity |
|---|---|---|---|---|---|
| Bandcamp | Music discovery and direct fan support | Make direct support legible and economically traceable. | Support flows should expose creator recipient, amount, fee, license context, and completion state. | Do not copy store-first identity or imply its stated payout ratios. | Primary source reviewed.[1] |
| Internet Archive | Broad cultural preservation and access | Preservation is an institutional practice, not a UI label. | Archive needs custody, export, retrieval, and recovery evidence. | Do not claim archival permanence from database storage alone. | Principle source follow-up needed. |
| GitHub | Version history and collaborative change context | Every meaningful mutation should retain an attributable history. | Model supersession, actor, timestamp, and reason on registry events. | A commit graph is not an authorship or rights adjudication. | Primary source follow-up needed. |
| ORCID | Persistent person/contribution identity | Persistent identity gains value through interoperable record control, privacy settings, and export. | Creator identity needs stable identifiers, privacy control, contribution relations, and downloadable records. | Do not equate a Living Nexus profile with identity verification. | Primary source reviewed.[2] |
| DOI Foundation | Persistent object identification and resolution | Identifier, metadata, and resolution are distinct; persistence needs governance. | WID should be opaque/stable, linked to rich context, and governed as an identifier—not a legal assertion. | Do not call a WID a DOI or claim the same institutional guarantees. | Primary source reviewed.[3] |
| Crossref | Metadata linkage across institutions | Contextual metadata—not an identifier alone—makes records useful. | Treat WID as a container for declarations/evidence/relations; use explicit metadata provenance. | Do not infer accuracy or rights from a registered ID. | Primary source reviewed.[4] |
| Library of Congress | Collection, access, and preservation stewardship | Acquisition, organization, access, security, and preservation are different functions. | Separate public display, private custody, export, and preservation controls. | Living Nexus is not an institutional library or statutory registry. | Primary source reviewed.[5] |
| Creative Commons | Standardized public permission choices | A license feature needs terms alignment, clear user communication, and machine-readable context. | Rights UI should distinguish declared permission from verified authority; license text needs explicit version/context. | Do not imply a creator owns all rights merely because they choose a label. | Primary source reviewed.[6] |
| C2PA / Content Credentials | Cryptographically verifiable media-provenance claims | Claims, assertions, content binding, signer identity, validation, and trust model need separate design. | Treat C2PA as a future interoperability/validation track; align evidence classes before adopting it. | Do not claim C2PA compatibility or use C2PA terminology for non-C2PA records. | Primary source reviewed.[7] |
| Spotify / Apple Music / YouTube | Large-scale distribution and discovery | Discovery and distribution are distinct from registry/preservation. | Keep external distribution links as relationships, not proof of ownership/provenance. | Do not emulate opaque recommendation or confuse platform presence with creator authority. | Primary source follow-up needed. |
| Steam | Entitlement and managed distribution | Access entitlement, license grant, purchase state, and delivery are distinct. | Separate purchase/support, access, license, and downloadable artifact records. | Do not present access control as rights enforcement. | Primary source follow-up needed. |
| Patreon / Substack | Recurring patronage and creator relationship | Support is recurring relationship context, not merely payment. | Model supporter consent, benefits, fulfillment, cancellation, and privacy separately. | Do not imply income outcomes or create patronage claims without evidence. | Primary source follow-up needed. |
| Licensing / collection systems | Permissions, repertoire, and rights administration | Rights metadata needs counterparties, territories, terms, status, and evidence. | Build license statements before building legal-rights claims. | No legal-collecting-society function is established by current code. | Counsel and domain-source track required. |

## Differentiation Map

| Question | Evidence-bound answer |
|---|---|
| What exists elsewhere? | Persistent identifiers, creator profiles, public licenses, commerce, archives, version histories, and media provenance standards all exist in mature systems. |
| What is genuinely different in Living Nexus? | The expressed synthesis of creator testimony, declared human/tool participation, work-level provenance, support, and stewardship under one doctrine is distinctive as a product thesis. |
| What is merely a better implementation? | A more integrated Work/Creator/Registry display, source-aware claims, and creator-first support flow would be an implementation distinction, not necessarily a novel category. |
| What is aspirational? | Canonical registry authority, external-verifier trust, platform/distribution independence, full Agent Doctrine, and robust preservation continuity remain partly aspirational. |
| What is defensible now? | Existing route/schema/provenance/agentic-foundation facts and narrow public statements aligned with evidence. |
| What needs adoption? | WID recognition, credible witness practice, creator declaration use, partner/export validation, support/liquidity, and community trust. |
| What needs legal validation? | Ownership, enforceability, copyrightability, licensing/rights, marks, publicity, privacy, regulatory scope, and public claims of protection or permanence. |

## References

[1]: https://bandcamp.com/about "Bandcamp — About"
[2]: https://info.orcid.org/what-is-orcid/ "ORCID — About"
[3]: https://www.doi.org/ "DOI Foundation — DOI System"
[4]: https://www.crossref.org/documentation/member-setup/constructing-your-dois/ "Crossref — Constructing DOIs"
[5]: https://www.loc.gov/about/ "Library of Congress — About"
[6]: https://creativecommons.org/share-your-work/platform/ "Creative Commons — Technology Platforms"
[7]: https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html "C2PA Technical Specification 2.4"

